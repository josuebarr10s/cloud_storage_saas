import supabase from '../lib/supabase.js';
import { DEFAULT_PLANS } from '../constants/plans.js';
import { STORAGE_CONSTANTS } from '../constants/storage.js';
import { normalizeText } from '../utils/formatters.js';
import { encodePaymentMethod, DAYS_MONTHLY, DAYS_ANNUAL } from '../utils/billing.js';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const ANNUAL_DISCOUNT_FACTOR = 0.8;

/**
 * Formatea la cuota de almacenamiento a partir de bytes
 * @param {number} bytes 
 * @returns {string}
 */
function formatPlanStorageQuota(bytes = 0) {
  if (!bytes || bytes <= 0) return 'Ilimitado';
  if (bytes >= STORAGE_CONSTANTS.BYTES_PER_TB) {
    return `${(bytes / STORAGE_CONSTANTS.BYTES_PER_TB).toFixed(0)} TB`;
  }
  return `${(bytes / STORAGE_CONSTANTS.BYTES_PER_GB).toFixed(0)} GB`;
}

/**
 * Adapta el registro crudo de la tabla plan al modelo de visualización
 * @param {Object} p 
 * @returns {Object}
 */
function mapPlanRecord(p) {
  const normName = normalizeText(p.nombre);
  const isPro = normName.includes('pro');
  const isEmp = normName.includes('empresa');
  const bytes = p.limite_almacenamiento_bytes || 0;
  const price = parseFloat(p.precio) || 0;

  return {
    id_plan: p.id_plan,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio: price,
    precioAnual: parseFloat((price * ANNUAL_DISCOUNT_FACTOR).toFixed(2)),
    popular: isPro,
    badge: isPro ? 'Recomendado' : null,
    storageQuota: formatPlanStorageQuota(bytes),
    features: isPro ? DEFAULT_PLANS[1].features : isEmp ? DEFAULT_PLANS[2].features : DEFAULT_PLANS[0].features,
    buttonText: isPro ? 'Elegir Pro' : isEmp ? 'Elegir Empresarial' : 'Elegir Básico'
  };
}

/**
 * Patrón Facade: Gestiona planes, suscripciones y facturación simulada.
 */
export const plansService = {
  /**
   * Obtiene los planes activos desde public.plan con fallback a planes por defecto
   */
  async getPlans() {
    try {
      const { data, error } = await supabase
        .from('plan')
        .select('*')
        .eq('activo', true)
        .order('precio', { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_PLANS.slice().sort((a, b) => a.precio - b.precio);
      }

      return data.map(mapPlanRecord).sort((a, b) => a.precio - b.precio);
    } catch (err) {
      console.warn('Uso de planes por defecto (error Supabase):', err);
      return DEFAULT_PLANS.slice().sort((a, b) => a.precio - b.precio);
    }
  },

  /**
   * Registra una transacción en public.suscripcion y public.pago
   */
  async createSubscription({ userId, planId, planName, billingCycle, amountPaid, transactionId, cardLast4, cardBrand }) {
    if (!userId) return { subscription: null, error: new Error('userId es requerido') };

    if (!UUID_REGEX.test(userId)) {
      console.error('userId no es un UUID válido:', userId);
      return { subscription: null, error: new Error('ID de usuario no es un UUID válido') };
    }

    try {
      let planUuid = planId;

      if (!UUID_REGEX.test(planUuid)) {
        const cleanName = normalizeText(planName || 'Pro');
        const { data: dbPlans } = await supabase.from('plan').select('id_plan, limite_almacenamiento_bytes, nombre');
        
        if (dbPlans && dbPlans.length > 0) {
          const matched = dbPlans.find(p => normalizeText(p.nombre).includes(cleanName));
          planUuid = matched ? matched.id_plan : dbPlans[0].id_plan;
        } else {
          if (cleanName.includes('basico')) planUuid = DEFAULT_PLANS[0].id_plan;
          else if (cleanName.includes('empresa')) planUuid = DEFAULT_PLANS[2].id_plan;
          else planUuid = DEFAULT_PLANS[1].id_plan;
        }
      }

      let limitBytes = STORAGE_CONSTANTS.DEFAULT_STORAGE_LIMIT_BYTES;
      const { data: planInfo } = await supabase.from('plan').select('limite_almacenamiento_bytes').eq('id_plan', planUuid).single();
      if (planInfo?.limite_almacenamiento_bytes) {
        limitBytes = planInfo.limite_almacenamiento_bytes;
      }

      const fechaInicio = new Date();
      const fechaFin = new Date(fechaInicio.getTime());
      const durationDays = billingCycle === 'annual' ? DAYS_ANNUAL : DAYS_MONTHLY;
      fechaFin.setDate(fechaFin.getDate() + durationDays);

      // Insertar en public.suscripcion
      const { data: subData, error: subErr } = await supabase
        .from('suscripcion')
        .insert([{
          id_usuario: userId,
          id_plan: planUuid,
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: fechaFin.toISOString(),
          estado: 'activa',
          precio_contratado: parseFloat(amountPaid || 12),
          limite_bytes_contratado: limitBytes
        }])
        .select();

      if (subErr) {
        console.error('Error al insertar en public.suscripcion:', subErr.message);
      }

      const subRecord = subData?.[0];
      if (subRecord) {
        // Reemplazar suscripciones anteriores para mantener únicamente una activa
        await supabase
          .from('suscripcion')
          .update({ estado: 'reemplazada' })
          .eq('id_usuario', userId)
          .eq('estado', 'activa')
          .neq('id_suscripcion', subRecord.id_suscripcion);

        // Actualizar capacidad de almacenamiento del usuario
        await supabase
          .from('almacenamiento')
          .upsert({ id_usuario: userId, capacidad_total_bytes: limitBytes }, { onConflict: 'id_usuario' });

        // Registrar recibo en public.pago
        // Solo se guarda la marca y los últimos 4 dígitos, nunca el número completo ni el CVC
        const { error: pagoErr } = await supabase.from('pago').insert([{
          id_suscripcion: subRecord.id_suscripcion,
          monto: parseFloat(amountPaid || 12),
          metodo_pago: encodePaymentMethod(cardBrand, cardLast4),
          referencia_transaccion: transactionId || `NMB-${fechaInicio.getTime()}`,
          estado: 'completado',
          fecha_pago: fechaInicio.toISOString()
        }]);

        if (pagoErr) {
          // La suscripción ya quedó activa: se registra el fallo sin cancelar el pago al usuario
          console.error('Error al insertar en public.pago:', pagoErr.message);
        }
      }

      return { subscription: subRecord, error: subErr };
    } catch (err) {
      console.error('Error al registrar suscripcion en Supabase:', err);
      return { subscription: null, error: err };
    }
  }
};

export default plansService;
