import supabase from '../lib/supabase.js';
import { USER_ROLES } from '../constants/roles.js';

/**
 * Patrón Facade: Proporciona operaciones administrativas sobre usuarios,
 * métricas de almacenamiento y facturación de la plataforma Nimbox.
 */
export const adminService = {
  /**
   * Obtiene la lista completa de usuarios con su almacenamiento y suscripción activa
   * @returns {Promise<Array>}
   */
  async getUsers() {
    const { data, error } = await supabase
      .from('usuario')
      .select('*, almacenamiento(*), suscripcion(*, plan(nombre))')
      .order('fecha_registro', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Calcula estadísticas globales del sistema (usuarios, espacio total utilizado e ingresos)
   * @returns {Promise<{ totalUsuarios: number, espacioTotal: number, ingresos: number }>}
   */
  async getStats() {
    const [{ count: totalUsuarios }, { data: alm }, { data: pagos }] = await Promise.all([
      supabase.from('usuario').select('*', { count: 'exact', head: true }),
      supabase.from('almacenamiento').select('espacio_usado_bytes'),
      supabase.from('pago').select('monto'),
    ]);

    const espacioTotal = (alm || []).reduce((acum, reg) => acum + Number(reg.espacio_usado_bytes || 0), 0);
    const ingresos = (pagos || []).reduce((acum, pago) => acum + Number(pago.monto || 0), 0);

    return {
      totalUsuarios: totalUsuarios || 0,
      espacioTotal,
      ingresos,
    };
  },

  /**
   * Actualiza el estado de una cuenta de usuario ('activo' | 'suspendido')
   * @param {string} id 
   * @param {'activo'|'suspendido'} estado 
   */
  async setUserStatus(id, estado) {
    return supabase.from('usuario').update({ estado }).eq('id_usuario', id);
  },

  /**
   * Asigna el rol a un usuario (USER_ROLES.ADMIN_ID o USER_ROLES.CLIENT_ID)
   * @param {string} id 
   * @param {number} idRol 
   */
  async setUserRole(id, idRol) {
    return supabase.from('usuario').update({ id_rol: idRol }).eq('id_usuario', id);
  },
};

export default adminService;