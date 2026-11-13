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

  /**
   * RF-16: todos los planes (activos e inactivos) con cuántos suscriptores activos tiene cada uno
   * @returns {Promise<Array<{ id: string, nombre: string, descripcion: string, precio: number,
   *   limiteBytes: number, duracionDias: number, activo: boolean, suscriptores: number }>>}
   */
  async getPlans() {
    const [{ data: planes, error }, { data: activas, error: subError }] = await Promise.all([
      supabase.from('plan').select('*').order('precio', { ascending: true }),
      supabase.from('suscripcion').select('id_plan').eq('estado', 'activa'),
    ]);
    if (error) throw new Error(`No se pudieron cargar los planes: ${error.message}`);
    if (subError) throw new Error(`No se pudieron contar los suscriptores: ${subError.message}`);

    const porPlan = (activas || []).reduce((acc, s) => ({ ...acc, [s.id_plan]: (acc[s.id_plan] || 0) + 1 }), {});
    return (planes || []).map((p) => ({
      id: p.id_plan,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: Number(p.precio) || 0,
      limiteBytes: Number(p.limite_almacenamiento_bytes) || 0,
      duracionDias: Number(p.duracion_dias) || 30,
      activo: Boolean(p.activo),
      suscriptores: porPlan[p.id_plan] || 0,
    }));
  },

  /**
   * RF-16: crea un plan (sin id) o edita uno existente (con id)
   * @param {{ id?: string, nombre: string, descripcion: string, precio: number,
   *   limiteBytes: number, duracionDias: number, activo: boolean }} plan
   */
  async savePlan(plan) {
    const fila = {
      nombre: plan.nombre.trim(),
      descripcion: plan.descripcion.trim() || null,
      precio: plan.precio,
      limite_almacenamiento_bytes: plan.limiteBytes,
      duracion_dias: plan.duracionDias,
      activo: plan.activo,
    };
    const consulta = plan.id
      ? supabase.from('plan').update(fila).eq('id_plan', plan.id).select().single()
      : supabase.from('plan').insert([fila]).select().single();
    const { error } = await consulta;
    if (error) {
      if (error.code === '23505') throw new Error(`Ya existe un plan llamado "${fila.nombre}".`);
      if (error.code === '23514') throw new Error('Revisa los datos: nombre de 2 a 40 caracteres, precio de 0 o más, espacio y duración mayores a 0.');
      if (error.code === '42501' || error.code === 'PGRST116') throw new Error('Solo un administrador puede modificar los planes.');
      throw new Error(`No se pudo guardar el plan: ${error.message}`);
    }
  },

  /**
   * Estadísticas de ventas: todos los planes, suscripciones y pagos (solo el administrador
   * puede leer los de todos los usuarios). Se piden por páginas de 1000 filas.
   * @returns {Promise<{ planes: Array, suscripciones: Array, pagos: Array }>}
   */
  async getSalesData() {
    const todo = async (tabla, columnas, orden) => {
      const filas = [];
      for (let desde = 0; ; desde += 1000) {
        const { data, error } = await supabase.from(tabla).select(columnas).order(orden, { ascending: true }).range(desde, desde + 999);
        if (error) throw new Error(`No se pudieron cargar las estadísticas: ${error.message}`);
        filas.push(...(data || []));
        if (!data || data.length < 1000) return filas;
      }
    };
    const [planes, suscripciones, pagos] = await Promise.all([
      todo('plan', 'id_plan, nombre, precio, activo', 'precio'),
      todo('suscripcion', 'id_suscripcion, id_usuario, id_plan, fecha_inicio, estado', 'fecha_inicio'),
      todo('pago', 'id_pago, id_suscripcion, monto, estado, fecha_pago', 'fecha_pago'),
    ]);
    return { planes, suscripciones, pagos };
  },

  /**
   * RF-16: activa o desactiva un plan. Un plan desactivado deja de ofrecerse, pero quien
   * ya lo tiene lo conserva y puede renovarlo.
   */
  async setPlanActive(id, activo) {
    const { error } = await supabase.from('plan').update({ activo }).eq('id_plan', id).select().single();
    if (error) {
      if (error.code === '42501' || error.code === 'PGRST116') throw new Error('Solo un administrador puede modificar los planes.');
      throw new Error(`No se pudo ${activo ? 'activar' : 'desactivar'} el plan: ${error.message}`);
    }
  },
};

export default adminService;