import supabase from '../lib/supabase.js';

// Roles definidos en la tabla public.rol
const ROLES = { 1: 'Administrador', 2: 'Cliente' };
const getRolNombre = (idRol) => ROLES[idRol] || 'Cliente';

// Mensaje que se muestra cuando un administrador suspendió la cuenta
const MENSAJE_SUSPENDIDO = 'Tu cuenta está suspendida. Contacta al administrador de Nimbox.';
const estaSuspendido = (dbUser) => dbUser?.estado === 'suspendido';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const GB = 1024 ** 3;
const TB = 1024 ** 4;

const normalizar = (texto = '') => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Límite aproximado según el nombre del plan.
 * Solo se usa como respaldo si no se pudo leer el límite real de la tabla public.plan.
 */
function cuotaPorNombre(planName) {
  const p = normalizar(planName);
  if (p.includes('basico')) return 10 * GB;
  if (p.includes('empresa')) return 2 * TB;
  return 500 * GB;
}

/**
 * Convierte bytes a texto legible: 10 GB, 500 GB, 2 TB...
 */
function formatCuota(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return 'Ilimitado';
  if (n >= TB) return `${parseFloat((n / TB).toFixed(1))} TB`;
  return `${Math.round(n / GB)} GB`;
}

/**
 * Cierra la sesión de Supabase y limpia el usuario guardado localmente
 */
async function cerrarSesionLocal() {
  try {
    await supabase.auth.signOut();
  } catch (e) {}
  localStorage.removeItem('nimbox_current_user');
}

/**
 * Arma el perfil completo del usuario (nombre, rol, estado y plan real) desde la BD.
 * Devuelve { suspendido: true } si un administrador suspendió la cuenta.
 */
async function obtenerPerfil(authUser) {
  let dbUser = null;
  try {
    const { data } = await supabase
      .from('usuario')
      .select('nombre, apellido, id_rol, estado, suscripcion(estado, fecha_inicio, id_plan, limite_bytes_contratado, plan(nombre, limite_almacenamiento_bytes))')
      .eq('id_usuario', authUser.id)
      .maybeSingle();
    dbUser = data;
  } catch (e) {}

  if (estaSuspendido(dbUser)) {
    return { suspendido: true };
  }

  // Suscripción vigente: la activa más reciente (o la más reciente si ninguna está activa)
  const suscripciones = [...(dbUser?.suscripcion || [])].sort(
    (a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio)
  );
  const activeSub = suscripciones.find(s => s.estado === 'activa') || suscripciones[0];

  const planName = activeSub?.plan?.nombre || 'Pro';
  const quotaBytes =
    Number(activeSub?.plan?.limite_almacenamiento_bytes || activeSub?.limite_bytes_contratado || 0) ||
    cuotaPorNombre(planName);

  const fullName = dbUser
    ? [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ')
    : '';

  return {
    suspendido: false,
    perfil: {
      id: authUser.id,
      name: fullName || authUser.user_metadata?.full_name || authUser.email.split('@')[0],
      email: authUser.email,
      rol: getRolNombre(dbUser?.id_rol),
      estado: dbUser?.estado || 'activo',
      plan: planName,
      planId: activeSub?.id_plan || null,
      storageQuota: formatCuota(quotaBytes),
      storageQuotaBytes: quotaBytes
    }
  };
}

export const authService = {
  /**
   * Registrar nuevo usuario en Supabase Auth y en las tablas usuario / almacenamiento.
   * La suscripción y el pago los registra PaymentModal con plansService.createSubscription.
   */
  async signUp({ email, password, name, plan, planId, billingCycle, amountPaid, transactionId, cardLast4 }) {
    const formattedEmail = email.toLowerCase().trim();
    const nameParts = (name || '').trim().split(' ');
    const nombre = nameParts[0] || 'Usuario';
    const apellido = nameParts.slice(1).join(' ') || '';

    // Límite real del plan elegido, leído de la tabla public.plan
    let quotaBytes = cuotaPorNombre(plan);
    try {
      let consulta = supabase.from('plan').select('limite_almacenamiento_bytes');
      consulta = UUID_REGEX.test(planId || '')
        ? consulta.eq('id_plan', planId)
        : consulta.ilike('nombre', `%${plan || 'Pro'}%`);
      const { data: planDb } = await consulta.limit(1);
      if (planDb?.[0]?.limite_almacenamiento_bytes) {
        quotaBytes = Number(planDb[0].limite_almacenamiento_bytes);
      }
    } catch (e) {}

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
      estado: 'activo',
      plan: plan || 'Pro',
      planId: planId || null,
      storageQuota: formatCuota(quotaBytes),
      storageQuotaBytes: quotaBytes,
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

    // 3. Guardar la capacidad del plan en public.almacenamiento
    //    (onConflict: el trigger de registro ya pudo haber creado la fila con 500 GB)
    try {
      await supabase.from('almacenamiento').upsert({
        id_usuario: userId,
        capacidad_total_bytes: quotaBytes,
        espacio_usado_bytes: 0
      }, { onConflict: 'id_usuario' });
    } catch (err) {
      console.error('Error al insertar en public.almacenamiento:', err);
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
   * Iniciar sesión en Supabase Auth y consultar el perfil real en la BD
   */
  async signIn({ email, password }) {
    const formattedEmail = email.toLowerCase().trim();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: password
    });

    if (!authError && authData?.user) {
      const { suspendido, perfil } = await obtenerPerfil(authData.user);

      // Bloquear cuentas suspendidas por un administrador
      if (suspendido) {
        await cerrarSesionLocal();
        return { user: null, error: new Error(MENSAJE_SUSPENDIDO) };
      }

      localStorage.setItem('nimbox_current_user', JSON.stringify(perfil));
      return { user: perfil, error: null };
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
   * Obtener usuario actual (se usa al recargar la página)
   */
  async getCurrentUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { suspendido, perfil } = await obtenerPerfil(session.user);

        // Si la cuenta fue suspendida mientras tenía la sesión abierta, se cierra
        if (suspendido) {
          await cerrarSesionLocal();
          return null;
        }

        localStorage.setItem('nimbox_current_user', JSON.stringify(perfil));
        return perfil;
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
