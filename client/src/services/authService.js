import supabase from '../lib/supabase.js';

const ROLES = { 1: 'Administrador', 2: 'Cliente' };
const getRolNombre = (idRol) => ROLES[idRol] || 'Cliente';

const MENSAJE_SUSPENDIDO = 'Tu cuenta está suspendida. Contacta al administrador de Nimbox.';

// Capacidad mostrada según el plan (sin plan = 0 GB)
const cuotaDePlan = (planName) => {
  const p = (planName || '').toLowerCase();
  if (!planName || planName === 'Ninguno') return '0 GB';
  if (p.includes('básico') || p.includes('basico')) return '10 GB';
  if (p.includes('empresa')) return '2 TB';
  return '500 GB';
};

// Traduce los errores más comunes de Supabase Auth a mensajes claros
const mensajeDeError = (error) => {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('email not confirmed')) return 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.';
  if (msg.includes('already registered')) return 'Ya existe una cuenta con este correo.';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  return error?.message || 'Ocurrió un error inesperado.';
};

export const authService = {
  /**
   * Registro: crea la cuenta en Supabase Auth.
   * El trigger de la BD crea la fila en public.usuario; aquí solo se completa el nombre.
   * (El correo y la contraseña los guarda Supabase en auth.users)
   */
  async signUpBasic({ email, password, name }) {
    const formattedEmail = email.toLowerCase().trim();
    const nameParts = (name || '').trim().split(' ');
    const nombre = nameParts[0] || 'Usuario';
    const apellido = nameParts.slice(1).join(' ') || '';

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formattedEmail,
      password: password,
      options: { data: { full_name: name, nombre: nombre, apellido: apellido } }
    });

    if (authError) return { user: null, error: new Error(mensajeDeError(authError)) };
    const userId = authData?.user?.id;
    if (!userId) return { user: null, error: new Error('No se pudo crear la cuenta.') };

    const userObj = {
      id: userId, name: name, email: formattedEmail, rol: 'Cliente', plan: 'Ninguno', storageQuota: '0 GB'
    };

    try {
      // Perfil en public.usuario (si el trigger ya lo creó, solo se actualiza)
      const { error: perfilError } = await supabase
        .from('usuario')
        .upsert({
          id_usuario: userId,
          id_rol: 2,
          nombre: nombre,
          apellido: apellido,
          estado: 'activo'
        }, { onConflict: 'id_usuario' });
      if (perfilError) console.error('Error al guardar el perfil:', perfilError.message);

      // Sin plan no hay espacio; al pagar se actualiza al límite del plan
      const { error: almError } = await supabase
        .from('almacenamiento')
        .upsert({ id_usuario: userId, capacidad_total_bytes: 0, espacio_usado_bytes: 0 }, { onConflict: 'id_usuario' });
      if (almError) console.error('Error al crear el almacenamiento:', almError.message);
    } catch (err) {
      console.error('Error al guardar en BD:', err);
    }

    localStorage.setItem('nimbox_current_user', JSON.stringify(userObj));
    return { user: userObj, error: null };
  },

  async signIn({ email, password }) {
    const formattedEmail = email.toLowerCase().trim();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: formattedEmail, password });

    if (authError || !authData?.user) {
      return { user: null, error: new Error(mensajeDeError(authError)) };
    }

    let userProfile = null;
    try {
      const { data: dbUser } = await supabase.from('usuario').select('*, suscripcion(*, plan(*))').eq('id_usuario', authData.user.id).single();
      // Cuenta suspendida por un administrador: no se permite el acceso
      if (dbUser?.estado === 'suspendido') {
        await supabase.auth.signOut();
        localStorage.removeItem('nimbox_current_user');
        return { user: null, error: new Error(MENSAJE_SUSPENDIDO) };
      }

      if (dbUser) {
        const fullName = [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ') || formattedEmail.split('@')[0];
        const activeSub = dbUser.suscripcion?.find?.(s => s.estado === 'activa');
        const planName = activeSub?.plan?.nombre || 'Ninguno';

        userProfile = {
          id: authData.user.id, name: fullName, email: formattedEmail, rol: getRolNombre(dbUser.id_rol),
          plan: planName, planId: activeSub?.id_plan || null,
          storageQuota: cuotaDePlan(activeSub ? planName : null)
        };
      }
    } catch (err) {}

    if (!userProfile) {
      userProfile = { id: authData.user.id, name: authData.user.user_metadata?.full_name || formattedEmail.split('@')[0], email: formattedEmail, rol: 'Cliente', plan: 'Ninguno', storageQuota: '0 GB' };
    }
    localStorage.setItem('nimbox_current_user', JSON.stringify(userProfile));
    return { user: userProfile, error: null };
  },

  async signOut() {
    try { await supabase.auth.signOut(); } catch (e) {}
    localStorage.removeItem('nimbox_current_user');
    // Limpieza de datos viejos: antes se guardaban contraseñas en el navegador
    localStorage.removeItem('nimbox_registered_users');
  },

  async getCurrentUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: dbUser } = await supabase
          .from('usuario')
          .select('nombre, apellido, id_rol, estado, suscripcion(estado, id_plan, plan(nombre))')
          .eq('id_usuario', session.user.id)
          .maybeSingle();

        // Si la cuenta fue suspendida mientras tenía la sesión abierta, se cierra
        if (dbUser?.estado === 'suspendido') {
          await supabase.auth.signOut();
          localStorage.removeItem('nimbox_current_user');
          return null;
        }

        const fullName = dbUser ? [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ') : (session.user.user_metadata?.full_name || session.user.email.split('@')[0]);

        // Plan real desde la suscripción activa
        const activeSub = dbUser?.suscripcion?.find?.(s => s.estado === 'activa');
        const planName = activeSub?.plan?.nombre || 'Ninguno';

        return {
          id: session.user.id, name: fullName, email: session.user.email, rol: getRolNombre(dbUser?.id_rol),
          plan: planName, planId: activeSub?.id_plan || null, storageQuota: cuotaDePlan(activeSub ? planName : null)
        };
      }
    } catch (e) {}

    // Sin sesión de Supabase no hay usuario
    return null;
  },

  async sendPasswordResetEmail(email) {
    const formattedEmail = email.toLowerCase().trim();
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(formattedEmail, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) {
        return { success: false, error: mensajeDeError(error) };
      }
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message || 'Error al enviar correo de recuperación.' };
    }
  },

  async updateUserPassword(newPassword) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) {
        return { success: false, error: mensajeDeError(error) };
      }

      // Cerrar la sesión de recuperación para que el usuario deba iniciar sesión con su nueva contraseña
      try {
        await supabase.auth.signOut();
      } catch (e) {}
      localStorage.removeItem('nimbox_current_user');

      return { success: true, user: data?.user };
    } catch (err) {
      return { success: false, error: err.message || 'Error al actualizar la contraseña.' };
    }
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        callback(session?.user || null, event);
        return;
      }
      if (session?.user) {
        // Se consulta la BD fuera del listener (setTimeout): llamar a Supabase dentro
        // de onAuthStateChange puede bloquear la sesión y dejar la app cargando
        setTimeout(async () => {
          const user = await authService.getCurrentUser();
          callback(user, event);
        }, 0);
      } else {
        callback(null, event);
      }
    });
  }
};

export default authService;
