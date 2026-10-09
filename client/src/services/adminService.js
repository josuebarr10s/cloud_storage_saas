import supabase from '../lib/supabase.js';

export const adminService = {
  async getUsers() {
    const { data, error } = await supabase.from('usuario')
      .select('*, almacenamiento(*), suscripcion(*, plan(nombre))')
      .order('fecha_registro', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getStats() {
    const [{ count: totalUsuarios }, { data: alm }, { data: pagos }] = await Promise.all([
      supabase.from('usuario').select('*', { count: 'exact', head: true }),
      supabase.from('almacenamiento').select('espacio_usado_bytes'),
      supabase.from('pago').select('monto'),
    ]);
    return {
      totalUsuarios,
      espacioTotal: (alm || []).reduce((a, r) => a + Number(r.espacio_usado_bytes), 0),
      ingresos: (pagos || []).reduce((a, p) => a + Number(p.monto), 0),
    };
  },
  async setUserStatus(id, estado) {   // 'activo' | 'suspendido'
    return supabase.from('usuario').update({ estado }).eq('id_usuario', id);
  },
  async setUserRole(id, idRol) {      // 1 = Admin, 2 = Cliente
    return supabase.from('usuario').update({ id_rol: idRol }).eq('id_usuario', id);
  },
};