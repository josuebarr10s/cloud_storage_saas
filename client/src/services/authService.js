import supabase from '../lib/supabase.js';

// Roles definidos en la tabla public.rol
const ROLES = { 1: 'Administrador', 2: 'Cliente' };
const getRolNombre = (idRol) => ROLES[idRol] || 'Cliente';

// Mensaje que se muestra cuando un administrador suspendió la cuenta
const MENSAJE_SUSPENDIDO = 'Tu cuenta está suspendida. Contacta al administrador de Nimbox.';
const estaSuspendido = (dbUser) => dbUser?.estado === 'suspendido';

/**
 * Cierra la sesión de Supabase y limpia el usuario guardado localmente
 */
async function cerrarSesionLocal() {
  try {
    await supabase.auth.signOut();
  } catch (e) {}
  localStorage.removeItem('nimbox_current_user');
}

export const authService = {
  /**
   * Registrar nuevo usuario en Supabase Auth y en las tablas del esquema usuario / almacenamiento / suscripcion / pago
   */
  async signUp({ email, password, name, plan, planId, billingCycle, amountPaid, transactionId, cardLast4 }) {
    const formattedEmail = email.toLowerCase().trim();
    const nameParts = (name || '').trim().split(' ');
    const nombre = nameParts[0] || 'Usuario';
    const apellido = nameParts.slice(1).join(' ') || '';
    
    // Determinar límite en bytes según plan
    let quotaBytes = 536870912000; // 500 GB por defecto (Pro)
    const cleanPlan = (plan || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (cleanPlan.includes('basico')) {
      quotaBytes = 10737418240; // 10 GB
    } else if (cleanPlan.includes('empresa')) {
      quotaBytes = 10995116277760; // 10 TB
    }

    // 1. Registrar en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formattedEmail,
      password: password,
      options: {
        data: {
          full_name: name,
          nombre: nombre,
          apellido: apellido
        }
      }
    });

    if (authError) {
      console.error('Error en Supabase Auth signUp:', authError.message);
      return { user: null, error: authError };
    }

    const userId = authData?.user?.id;
    if (!userId) {
      return { user: null, error: new Error('No se pudo obtener el ID del usuario creado en Supabase Auth.') };
    }

    const userObj = {
      id: userId,
      name: name,
      email: formattedEmail,
      rol: 'Cliente',
      plan: plan || 'Pro',
      planId: planId || '22222222-2222-2222-2222-222222222222',
      storageQuota: cleanPlan.includes('basico') ? '10 GB' : '500 GB',
      billingCycle: billingCycle || 'monthly',
      amountPaid: amountPaid,
      transactionId: transactionId || `NMB-${Math.floor(100000 + Math.random() * 900000)}`,
      cardLast4: cardLast4 || '4242'
    };

    // 2. Insertar en tabla public.usuario
    try {
      await supabase.from('usuario').upsert({
        id_usuario: userId,
        id_rol: 2, // Rol por defecto (cliente)
        nombre: nombre,
        apellido: apellido,
        estado: 'activo'
      });
    } catch (err) {
      console.error('Error al insertar en public.usuario:', err);
    }

    // 3. Insertar registro de almacenamiento en public.almacenamiento
    try {
      await supabase.from('almacenamiento').upsert({
        id_usuario: userId,
        capacidad_total_bytes: quotaBytes,
        espacio_usado_bytes: 0
      });
    } catch (err) {
      console.error('Error al insertar en public.almacenamiento:', err);
    }

    // 4. Intentar vincular plan y suscripción en public.suscripcion
    try {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      let planUuid = planId;
      
      if (!uuidRegex.test(planUuid)) {
        const { data: dbPlans } = await supabase.from('plan').select('id_plan, nombre');
        if (dbPlans && dbPlans.length > 0) {
          const matched = dbPlans.find(p => p.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(cleanPlan));
          planUuid = matched ? matched.id_plan : dbPlans[0].id_plan;
        } else {
          planUuid = cleanPlan.includes('basico') ? '11111111-1111-1111-1111-111111111111' : '22222222-2222-2222-2222-222222222222';
        }
      }

      if (planUuid && uuidRegex.test(planUuid)) {
        const fechaInicio = new Date();
        const fechaFin = new Date();
        fechaFin.setDate(fechaFin.getDate() + (billingCycle === 'annual' ? 365 : 30));

        const { data: subData } = await supabase.from('suscripcion').insert({
          id_usuario: userId,
          id_plan: planUuid,
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: fechaFin.toISOString(),
          estado: 'activa',
          precio_contratado: parseFloat(amountPaid || 12),
          limite_bytes_contratado: quotaBytes
        }).select();

        if (subData && subData.length > 0) {
          await supabase.from('pago').insert({
            id_suscripcion: subData[0].id_suscripcion,
            monto: parseFloat(amountPaid || 12),
            metodo_pago: 'tarjeta_simulada',
            referencia_transaccion: transactionId,
            estado: 'completado'
          });
        }
      }
    } catch (err) {
      console.error('Error al registrar suscripcion/pago:', err);
    }

    // Persistencia local para respaldo
    try {
      const existingUsers = JSON.parse(localStorage.getItem('nimbox_registered_users') || '[]');
      const filtered = existingUsers.filter(u => u.email !== formattedEmail);
      filtered.push({ ...userObj, password });
      localStorage.setItem('nimbox_registered_users', JSON.stringify(filtered));
      localStorage.setItem('nimbox_current_user', JSON.stringify(userObj));
    } catch (e) {}

    return { user: userObj, error: null };
  },

  /**
   * Iniciar sesión en Supabase Auth y consultar la tabla public.usuario
   */
  async signIn({ email, password }) {
    const formattedEmail = email.toLowerCase().trim();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: password
    });

    if (!authError && authData?.user) {
      let userProfile = null;
      let dbUser = null;

      try {
        const { data } = await supabase
          .from('usuario')
          .select('*, suscripcion(*, plan(*))')
          .eq('id_usuario', authData.user.id)
          .single();
        dbUser = data;
      } catch (err) {}

      // Bloquear cuentas suspendidas por un administrador
      if (estaSuspendido(dbUser)) {
        await cerrarSesionLocal();
        return { user: null, error: new Error(MENSAJE_SUSPENDIDO) };
      }

      if (dbUser) {
        const fullName = [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ') || formattedEmail.split('@')[0];
        const activeSub = dbUser.suscripcion?.find?.(s => s.estado === 'activa') || dbUser.suscripcion?.[0];
        const planName = activeSub?.plan?.nombre || 'Pro';

        userProfile = {
          id: authData.user.id,
          name: fullName,
          email: formattedEmail,
          rol: getRolNombre(dbUser.id_rol),
          estado: dbUser.estado,
          plan: planName,
          planId: activeSub?.id_plan || 2,
          storageQuota: planName.toLowerCase().includes('básico') ? '10 GB' : '500 GB'
        };
      }

      if (!userProfile) {
        userProfile = {
          id: authData.user.id,
          name: authData.user.user_metadata?.full_name || formattedEmail.split('@')[0],
          email: formattedEmail,
          rol: 'Cliente',
          plan: 'Pro',
          storageQuota: '500 GB'
        };
      }

      localStorage.setItem('nimbox_current_user', JSON.stringify(userProfile));
      return { user: userProfile, error: null };
    }

    // Fallback LocalStorage
    try {
      const registeredUsers = JSON.parse(localStorage.getItem('nimbox_registered_users') || '[]');
      const localUser = registeredUsers.find(
        u => u.email.toLowerCase() === formattedEmail && u.password === password
      );

      if (localUser) {
        const cleanUser = { ...localUser, rol: 'Cliente' };
        delete cleanUser.password;
        localStorage.setItem('nimbox_current_user', JSON.stringify(cleanUser));
        return { user: cleanUser, error: null };
      }
    } catch (e) {}

    return { user: null, error: authError || new Error('Credenciales inválidas') };
  },

  /**
   * Cerrar sesión
   */
  async signOut() {
    await cerrarSesionLocal();
  },

  /**
   * Obtener usuario actual
   */
  async getCurrentUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: dbUser } = await supabase
          .from('usuario')
          .select('nombre, apellido, id_rol, estado')
          .eq('id_usuario', session.user.id)
          .single();

        // Si la cuenta fue suspendida mientras tenía la sesión abierta, se cierra
        if (estaSuspendido(dbUser)) {
          await cerrarSesionLocal();
          return null;
        }

        const fullName = dbUser ? [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ') : (session.user.user_metadata?.full_name || session.user.email.split('@')[0]);

        return {
          id: session.user.id,
          name: fullName,
          email: session.user.email,
          rol: getRolNombre(dbUser?.id_rol),
          estado: dbUser?.estado || 'activo',
          plan: session.user.user_metadata?.plan_name || 'Pro',
          storageQuota: '500 GB'
        };
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem('nimbox_current_user');
      if (saved) return { ...JSON.parse(saved), rol: 'Cliente' };
    } catch (e) {}

    return null;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Se consulta la BD fuera del listener (setTimeout) para no bloquear a Supabase
        setTimeout(async () => {
          const user = await authService.getCurrentUser();
          callback(user);
        }, 0);
      } else {
        callback(null);
      }
    });
  }
};

export default authService;