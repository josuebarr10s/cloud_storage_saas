import supabase from '../lib/supabase.js';
import { STORAGE_CONSTANTS } from '../constants/storage.js';
import { normalizeText } from '../utils/formatters.js';
import {
  MS_PER_DAY,
  DAYS_MONTHLY,
  DAYS_ANNUAL,
  PAYMENT_STATUS,
  normalizeStatus,
  billingCycleOf,
  buildTransactions,
  describeActiveSubscription,
  pickPrimaryMethod,
} from '../utils/billing.js';

const SUBSCRIPTION_SELECT =
  'id_suscripcion, id_usuario, id_plan, fecha_inicio, fecha_fin, estado, precio_contratado, limite_bytes_contratado, plan(nombre, precio, limite_almacenamiento_bytes), pago(id_pago, monto, metodo_pago, referencia_transaccion, estado, fecha_pago)';

const MAX_AUTO_RENEWAL_CYCLES = 36;
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

async function runAutoRenewals(userId, initialSubscriptions = null) {
  let subscriptions = initialSubscriptions || (await fetchUserSubscriptions(userId));
  if (!subscriptions.length) return { renewed: 0, subscriptions };

  const preferredMethodRaw = pickRawPaymentMethod(subscriptions);
  let changed = false;
  let renewedCount = 0;

  // 1. Asegurar que cada suscripción existente tenga al menos su recibo inicial en public.pago
  for (const sub of subscriptions) {
    if (!Array.isArray(sub.pago) || sub.pago.length === 0) {
      const amount = Number(sub.precio_contratado) || Number(sub.plan?.precio) || 12;
      const { error: missingPagoErr } = await supabase.from('pago').insert([{
        id_suscripcion: sub.id_suscripcion,
        monto: amount,
        metodo_pago: preferredMethodRaw,
        referencia_transaccion: buildRenewalReference(sub.id_suscripcion, sub.fecha_inicio),
        estado: 'completado',
        fecha_pago: sub.fecha_inicio,
      }]);
      if (!missingPagoErr) changed = true;
    }
  }

  // 2. Identificar la suscripción activa del usuario
  const activeSubs = subscriptions
    .filter((s) => normalizeText(s.estado) === 'activa')
    .sort((a, b) => new Date(b.fecha_fin) - new Date(a.fecha_fin));

  const active = activeSubs[0];
  if (!active) {
    if (changed) subscriptions = await fetchUserSubscriptions(userId);
    return { renewed: 0, subscriptions };
  }

  // Si habían quedado varias suscripciones marcadas como activas, dejar solo la más reciente
  if (activeSubs.length > 1) {
    const staleIds = activeSubs.slice(1).map((s) => s.id_suscripcion);
    await supabase
      .from('suscripcion')
      .update({ estado: 'reemplazada' })
      .in('id_suscripcion', staleIds);
    changed = true;
  }

  // 3. Verificar si ya cumplió uno o más ciclos (mensuales o anuales) para realizar el cobro automático
  const now = new Date();
  const cycle = billingCycleOf(active);
  const durationDays = cycle === 'annual' ? DAYS_ANNUAL : DAYS_MONTHLY;
  const start = new Date(active.fecha_inicio);
  const rawEnd = new Date(active.fecha_fin);

  if (!Number.isNaN(start.getTime()) && !Number.isNaN(rawEnd.getTime())) {
    const expectedFirstEnd = new Date(start.getTime());
    expectedFirstEnd.setDate(expectedFirstEnd.getDate() + durationDays);

    // Si es mensual pero fecha_fin quedó muy lejana (p. ej. al retroceder fecha_inicio para pruebas),
    // acotar el primer periodo a sus 30 días correspondientes.
    const firstCycleEnd =
      cycle === 'monthly' && rawEnd.getTime() > expectedFirstEnd.getTime() + 5 * MS_PER_DAY
        ? expectedFirstEnd
        : rawEnd;

    if (firstCycleEnd.getTime() <= now.getTime()) {
      if (firstCycleEnd.getTime() !== rawEnd.getTime()) {
        await supabase
          .from('suscripcion')
          .update({ fecha_fin: firstCycleEnd.toISOString() })
          .eq('id_suscripcion', active.id_suscripcion);
        changed = true;
      }

      const existingStartTimes = subscriptions
        .map((s) => new Date(s.fecha_inicio).getTime())
        .filter((t) => !Number.isNaN(t));

      const amount = Number(active.precio_contratado) || Number(active.plan?.precio) || 12;
      const limitBytes =
        Number(active.limite_bytes_contratado) ||
        Number(active.plan?.limite_almacenamiento_bytes) ||
        STORAGE_CONSTANTS.DEFAULT_STORAGE_LIMIT_BYTES;

      let periodStart = new Date(firstCycleEnd.getTime());
      let safety = 0;
      let latestCreatedId = null;

      while (periodStart.getTime() <= now.getTime() && safety < MAX_AUTO_RENEWAL_CYCLES) {
        safety += 1;
        const periodEnd = new Date(periodStart.getTime());
        periodEnd.setDate(periodEnd.getDate() + durationDays);

        const isCurrentCycle = periodEnd.getTime() > now.getTime() || safety === MAX_AUTO_RENEWAL_CYCLES;
        const estado = isCurrentCycle ? 'activa' : 'reemplazada';

        const alreadyExists = existingStartTimes.some(
          (t) => Math.abs(t - periodStart.getTime()) < 60 * 1000
        );

        if (!alreadyExists) {
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

          if (!subErr && newSub?.id_suscripcion) {
            latestCreatedId = newSub.id_suscripcion;
            existingStartTimes.push(periodStart.getTime());

            const { error: pagoErr } = await supabase.from('pago').insert([{
              id_suscripcion: newSub.id_suscripcion,
              monto: amount,
              metodo_pago: preferredMethodRaw,
              referencia_transaccion: buildRenewalReference(newSub.id_suscripcion, periodStart.toISOString()),
              estado: 'completado',
              fecha_pago: periodStart.toISOString(),
            }]);

            if (pagoErr) {
              console.error('Error al registrar el cobro automático en public.pago:', pagoErr.message);
            }

            renewedCount += 1;
            changed = true;
          } else if (subErr) {
            console.error('Error al renovar suscripción automáticamente:', subErr.message);
            break;
          }
        }

        periodStart = periodEnd;
      }

      if (latestCreatedId) {
        // Marcar la suscripción vencida anterior como reemplazada por la nueva renovación activa
        await supabase
          .from('suscripcion')
          .update({ estado: 'reemplazada' })
          .eq('id_usuario', userId)
          .eq('estado', 'activa')
          .neq('id_suscripcion', latestCreatedId);

        // Mantener sincronizada la capacidad de almacenamiento del plan activo
        await supabase
          .from('almacenamiento')
          .upsert({ id_usuario: userId, capacidad_total_bytes: limitBytes }, { onConflict: 'id_usuario' });
      }
    }
  }

  if (changed) {
    subscriptions = await fetchUserSubscriptions(userId);
  }

  return { renewed: renewedCount, subscriptions };
}

/**
 * Patrón Facade: gestiona los cobros automáticos mes a mes (o anuales) y lee el
 * historial de facturación del usuario desde public.suscripcion -> public.pago.
 */
export const billingService = {
  /**
   * Procesa los cobros automáticos pendientes de la suscripción activa del usuario
   * si ya transcurrió uno o más periodos de facturación.
   */
  async processAutoRenewals(userId, initialSubscriptions = null) {
    if (!userId) return { renewed: 0, subscriptions: initialSubscriptions || [] };

    if (renewalLocks.has(userId)) {
      return renewalLocks.get(userId);
    }

    const promise = runAutoRenewals(userId, initialSubscriptions).finally(() => {
      renewalLocks.delete(userId);
    });

    renewalLocks.set(userId, promise);
    return promise;
  },

  async getBillingData(userId) {
    if (!userId) throw new Error('No hay un usuario autenticado.');

    const initial = await fetchUserSubscriptions(userId);
    const { subscriptions } = await this.processAutoRenewals(userId, initial);
    const transactions = buildTransactions(subscriptions);

    return {
      transactions,
      subscription: describeActiveSubscription(subscriptions),
      paymentMethod: pickPrimaryMethod(transactions),
    };
  },
};

export default billingService;
