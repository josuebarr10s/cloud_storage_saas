import supabase from '../lib/supabase.js';
import { STORAGE_CONSTANTS } from '../constants/storage.js';
import { normalizeText } from '../utils/formatters.js';
import {
  MS_PER_DAY,
  DAYS_MONTHLY,
  DAYS_ANNUAL,
  MIN_DAYS_BETWEEN_MONTHLY_CHARGES,
  PAYMENT_STATUS,
  normalizeStatus,
  billingCycleOf,
  deduplicateSubscriptions,
  buildTransactions,
  describeActiveSubscription,
  pickPrimaryMethod,
} from '../utils/billing.js';

const SUBSCRIPTION_SELECT =
  'id_suscripcion, id_usuario, id_plan, fecha_inicio, fecha_fin, estado, precio_contratado, limite_bytes_contratado, plan(nombre, precio, limite_almacenamiento_bytes), pago(id_pago, monto, metodo_pago, referencia_transaccion, estado, fecha_pago)';

const renewalLocks = new Map();

/**
 * Construye una referencia de transacción única y determinista para un cobro.
 */
function buildRenewalReference(subId, dateIso) {
  const ts = new Date(dateIso).getTime();
  const suffix = String(subId || '').replace(/-/g, '').slice(0, 4).toUpperCase();
  return `NMB-${Number.isNaN(ts) ? Date.now() : ts}${suffix ? `-${suffix}` : ''}`;
}

/**
 * Obtiene el método de pago codificado más reciente del historial del usuario
 * (p. ej. "tarjeta_simulada:visa:4242") para reutilizarlo en los cobros automáticos.
 */
function pickRawPaymentMethod(subscriptions = []) {
  const payments = [];
  subscriptions.forEach((sub) => {
    const startTs = new Date(sub.fecha_inicio).getTime() || 0;
    (sub.pago || []).forEach((p) => {
      const pTs = new Date(p.fecha_pago).getTime();
      payments.push({
        raw: p.metodo_pago || 'tarjeta_simulada',
        statusKey: normalizeStatus(p.estado),
        ts: Number.isNaN(pTs) ? startTs : pTs,
      });
    });
  });
  payments.sort((a, b) => b.ts - a.ts);

  const paidWithCard = payments.find((p) => p.statusKey === PAYMENT_STATUS.PAID && p.raw.includes(':'));
  if (paidWithCard) return paidWithCard.raw;

  const anyWithCard = payments.find((p) => p.raw.includes(':'));
  if (anyWithCard) return anyWithCard.raw;

  return payments[0]?.raw || 'tarjeta_simulada';
}

async function fetchUserSubscriptions(userId) {
  const { data, error } = await supabase
    .from('suscripcion')
    .select(SUBSCRIPTION_SELECT)
    .eq('id_usuario', userId)
    .order('fecha_inicio', { ascending: false });

  if (error) throw new Error(error.message || 'No se pudo consultar el historial de pagos.');
  return data || [];
}

/**
 * Limpia en la base de datos cualquier suscripción duplicada en el mismo mes
 * (marcándola como 'cancelada') y asegura que solo exista una 'activa'.
 */
async function cleanupDuplicateSubscriptionsInDb(rawSubscriptions = []) {
  const valid = rawSubscriptions.filter((s) => normalizeText(s?.estado) !== 'cancelada');
  if (valid.length <= 1) return false;

  const deduplicated = deduplicateSubscriptions(valid);
  const keptIds = new Set(deduplicated.map((s) => s.id_suscripcion));
  const duplicateIds = valid
    .filter((s) => !keptIds.has(s.id_suscripcion))
    .map((s) => s.id_suscripcion);

  let updated = false;

  if (duplicateIds.length > 0) {
    const { error } = await supabase
      .from('suscripcion')
      .update({ estado: 'cancelada' })
      .in('id_suscripcion', duplicateIds);
    if (!error) updated = true;
  }

  // Asegurar que entre las suscripciones válidas quede únicamente una marcada como 'activa'
  const activeKept = deduplicated
    .filter((s) => normalizeText(s.estado) === 'activa')
    .sort((a, b) => new Date(b.fecha_fin) - new Date(a.fecha_fin));

  if (activeKept.length > 1) {
    const staleActiveIds = activeKept.slice(1).map((s) => s.id_suscripcion);
    const { error } = await supabase
      .from('suscripcion')
      .update({ estado: 'reemplazada' })
      .in('id_suscripcion', staleActiveIds);
    if (!error) updated = true;
  } else if (activeKept.length === 0 && deduplicated.length > 0 && duplicateIds.length > 0) {
    // Si la suscripción duplicada cancelada era la que tenía estado 'activa', reactivar la válida del mes
    const latestValid = deduplicated[0];
    const { error } = await supabase
      .from('suscripcion')
      .update({ estado: 'activa' })
      .eq('id_suscripcion', latestValid.id_suscripcion);
    if (!error) updated = true;
  }

  return updated;
}

async function runAutoRenewals(userId) {
  let subscriptions = await fetchUserSubscriptions(userId);
  if (!subscriptions.length) return { renewed: 0, subscriptions };

  // 1. Si existían cobros duplicados previos en el mismo mes, anularlos en la BD
  const cleaned = await cleanupDuplicateSubscriptionsInDb(subscriptions);
  if (cleaned) {
    subscriptions = await fetchUserSubscriptions(userId);
  }

  let cleanSubs = deduplicateSubscriptions(subscriptions);
  let active = cleanSubs
    .filter((s) => normalizeText(s.estado) === 'activa')
    .sort((a, b) => new Date(b.fecha_fin) - new Date(a.fecha_fin))[0];

  if (!active) return { renewed: 0, subscriptions: cleanSubs };

  const now = new Date();
  const activeStart = new Date(active.fecha_inicio);
  const activeEnd = new Date(active.fecha_fin);

  if (Number.isNaN(activeStart.getTime()) || Number.isNaN(activeEnd.getTime())) {
    return { renewed: 0, subscriptions: cleanSubs };
  }

  // Fast-path: si la suscripción activa sigue vigente, devolver en 1 sola consulta sin invocar RPC
  if (activeEnd.getTime() > now.getTime()) {
    return { renewed: 0, subscriptions: cleanSubs };
  }

  // 2. Si ya venció, intentar primero la renovación atómica en la base de datos
  try {
    await supabase.rpc('procesar_renovaciones_suscripcion', {
      p_usuario: userId,
      p_ahora: now.toISOString(),
    });
    subscriptions = await fetchUserSubscriptions(userId);
    cleanSubs = deduplicateSubscriptions(subscriptions);
    active = cleanSubs
      .filter((s) => normalizeText(s.estado) === 'activa')
      .sort((a, b) => new Date(b.fecha_fin) - new Date(a.fecha_fin))[0];
    if (!active || new Date(active.fecha_fin).getTime() > now.getTime()) {
      return { renewed: 1, subscriptions: cleanSubs };
    }
  } catch {
    // Si la función RPC aún no está instalada en Supabase, continúa con la verificación segura.
  }

  // 3. Respaldo seguro: solo cobrar si ya venció el periodo actual Y han pasado al menos
  // 25 días (mensual) o 300 días (anual) desde el último cobro de este mismo plan.
  const cycle = billingCycleOf(active);
  const durationDays = cycle === 'annual' ? DAYS_ANNUAL : DAYS_MONTHLY;
  const minGapMs = (cycle === 'annual' ? 300 : MIN_DAYS_BETWEEN_MONTHLY_CHARGES) * MS_PER_DAY;

  // Verificar que realmente venció y que no se haya cobrado ya este mes en ningún otro dispositivo
  const elapsedSinceStart = now.getTime() - activeStart.getTime();
  if (activeEnd.getTime() > now.getTime() || elapsedSinceStart < minGapMs) {
    return { renewed: 0, subscriptions: cleanSubs };
  }

  const hasRecentSamePlanCharge = cleanSubs.some((s) => {
    if (s.id_suscripcion === active.id_suscripcion) return false;
    const samePlan =
      (s.id_plan && active.id_plan && s.id_plan === active.id_plan) ||
      normalizeText(s.plan?.nombre) === normalizeText(active.plan?.nombre);
    if (!samePlan) return false;
    const sStart = new Date(s.fecha_inicio).getTime();
    return !Number.isNaN(sStart) && now.getTime() - sStart < minGapMs;
  });

  if (hasRecentSamePlanCharge) {
    return { renewed: 0, subscriptions: cleanSubs };
  }

  // Reclamo atómico en BD: cambiar la suscripción vencida de 'activa' a 'reemplazada' ANTES de insertar.
  // Si otro dispositivo ya hizo el cambio, claimed vendrá vacío y no se insertará ningún cobro duplicado.
  const { data: claimed, error: claimErr } = await supabase
    .from('suscripcion')
    .update({ estado: 'reemplazada' })
    .eq('id_suscripcion', active.id_suscripcion)
    .eq('estado', 'activa')
    .select('id_suscripcion');

  if (claimErr || !claimed || claimed.length === 0) {
    const refreshed = await fetchUserSubscriptions(userId);
    return { renewed: 0, subscriptions: deduplicateSubscriptions(refreshed) };
  }

  // Avanzar hasta el ciclo vigente cobrando como máximo una vez por cada mes cumplido
  const preferredMethodRaw = pickRawPaymentMethod(cleanSubs);
  const amount = Number(active.precio_contratado) || Number(active.plan?.precio) || 12;
  const limitBytes =
    Number(active.limite_bytes_contratado) ||
    Number(active.plan?.limite_almacenamiento_bytes) ||
    STORAGE_CONSTANTS.DEFAULT_STORAGE_LIMIT_BYTES;

  let periodStart = new Date(activeEnd.getTime());
  let renewedCount = 0;
  const MAX_CYCLES = 12;

  while (periodStart.getTime() <= now.getTime() && renewedCount < MAX_CYCLES) {
    const periodEnd = new Date(periodStart.getTime());
    periodEnd.setDate(periodEnd.getDate() + durationDays);
    const isCurrentCycle = periodEnd.getTime() > now.getTime() || renewedCount + 1 === MAX_CYCLES;
    const estado = isCurrentCycle ? 'activa' : 'reemplazada';

    const { data: newSub, error: subErr } = await supabase
      .from('suscripcion')
      .insert([{
        id_usuario: userId,
        id_plan: active.id_plan,
        fecha_inicio: periodStart.toISOString(),
        fecha_fin: periodEnd.toISOString(),
        estado,
        precio_contratado: amount,
        limite_bytes_contratado: limitBytes,
      }])
      .select('id_suscripcion')
      .single();

    if (subErr || !newSub?.id_suscripcion) {
      console.error('Error al renovar suscripción automáticamente:', subErr?.message);
      break;
    }

    // Verificar si un trigger de la BD ya creó el registro en public.pago para esta suscripción
    const { data: existingPagos } = await supabase
      .from('pago')
      .select('id_pago')
      .eq('id_suscripcion', newSub.id_suscripcion);

    if (!existingPagos || existingPagos.length === 0) {
      await supabase.from('pago').insert([{
        id_suscripcion: newSub.id_suscripcion,
        monto: amount,
        metodo_pago: preferredMethodRaw,
        referencia_transaccion: buildRenewalReference(newSub.id_suscripcion, periodStart.toISOString()),
        estado: 'completado',
        fecha_pago: periodStart.toISOString(),
      }]);
    }

    renewedCount += 1;
    periodStart = periodEnd;
  }

  const updated = await fetchUserSubscriptions(userId);
  return { renewed: renewedCount, subscriptions: deduplicateSubscriptions(updated) };
}

/**
 * Patrón Facade: gestiona el historial de facturación del usuario garantizando
 * un único cobro automático por ciclo mensual/anual sin importar el dispositivo.
 */
export const billingService = {
  async processAutoRenewals(userId) {
    if (!userId) return { renewed: 0, subscriptions: [] };

    if (renewalLocks.has(userId)) {
      return renewalLocks.get(userId);
    }

    const promise = runAutoRenewals(userId).finally(() => {
      renewalLocks.delete(userId);
    });

    renewalLocks.set(userId, promise);
    return promise;
  },

  async getBillingData(userId) {
    if (!userId) throw new Error('No hay un usuario autenticado.');

    const { subscriptions } = await this.processAutoRenewals(userId);
    const transactions = buildTransactions(subscriptions);

    return {
      transactions,
      subscription: describeActiveSubscription(subscriptions),
      paymentMethod: pickPrimaryMethod(transactions),
    };
  },
};

export default billingService;
