import supabase from '../lib/supabase.js';
import { buildTransactions, describeActiveSubscription, pickPrimaryMethod } from '../utils/billing.js';

/**
 * Patrón Facade: lee el historial de facturación del usuario desde
 * public.suscripcion -> public.pago y lo entrega listo para la interfaz.
 */
export const billingService = {
  async getBillingData(userId) {
    if (!userId) throw new Error('No hay un usuario autenticado.');

    const { data, error } = await supabase
      .from('suscripcion')
      .select('id_suscripcion, id_plan, fecha_inicio, fecha_fin, estado, precio_contratado, plan(nombre), pago(id_pago, monto, metodo_pago, referencia_transaccion, estado, fecha_pago)')
      .eq('id_usuario', userId)
      .order('fecha_inicio', { ascending: false });

    if (error) throw new Error(error.message || 'No se pudo consultar el historial de pagos.');

    const subscriptions = data || [];
    const transactions = buildTransactions(subscriptions);

    return {
      transactions,
      subscription: describeActiveSubscription(subscriptions),
      paymentMethod: pickPrimaryMethod(transactions),
    };
  },
};

export default billingService;
