import supabase from '../lib/supabase.js';
import { mapAuthErrorMessage, AUTH_MESSAGES } from '../utils/authErrorHandler.js';
import { UserFactory } from '../factories/entityFactory.js';
import { billingService } from './billingService.js';

const STORAGE_KEYS = Object.freeze({
  CURRENT_USER: 'nimbox_current_user',
  LEGACY_REGISTERED_USERS: 'nimbox_registered_users',
});

/**
 * Patrón Facade: Proporciona una interfaz unificada y de alto nivel
 * para gestionar el ciclo de vida de autenticación y sesiones de usuario.
 */
export const authService = {
  /**
   * Registro: crea la cuenta en Supabase Auth.
   * El trigger handle_new_user de la BD crea public.usuario (con nombre y apellido de los metadatos)
   * y public.almacenamiento en 0; la RLS no permite insertarlos desde el cliente.
   */
  async signUpBasic({ email, password, name }) {
    const formattedEmail = String(email || '').toLowerCase().trim();
    const nameParts = (name || '').trim().split(' ');
    const nombre = nameParts[0] || 'Usuario';
    const apellido = nameParts.slice(1).join(' ') || '';

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formattedEmail,
      password: password,
      options: { data: { full_name: name, nombre: nombre, apellido: apellido } }
    });

    if (authError) {
      return { user: null, error: new Error(mapAuthErrorMessage(authError)) };
    }

    const userId = authData?.user?.id;
    if (!userId) {
      return { user: null, error: new Error(AUTH_MESSAGES.CREATE_ACCOUNT_FAILED) };
    }

    const userObj = UserFactory.createProfile({
      authUser: authData.user,
      emailFallback: formattedEmail,
    });
    userObj.name = name; // Asegura mantener el nombre completo ingresado

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userObj));
    return { user: userObj, error: null };
  },

  /**
   * Iniciar sesión con email y contraseña
   */
  async signIn({ email, password }) {
    const formattedEmail = String(email || '').toLowerCase().trim();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: password
    });

    if (authError || !authData?.user) {
      return { user: null, error: new Error(mapAuthErrorMessage(authError)) };
    }

    let userProfile = null;
    try {
      await billingService.processAutoRenewals(authData.user.id).catch((err) =>
        console.warn('No se pudo verificar renovación automática al iniciar sesión:', err)
      );

      const { data: dbUser } = await supabase
        .from('usuario')
        .select('*, suscripcion(*, plan(*))')
        .eq('id_usuario', authData.user.id)
        .single();

      // Cuenta suspendida por un administrador: no se permite el acceso
      if (dbUser?.estado === 'suspendido') {
        await supabase.auth.signOut();
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        return { user: null, error: new Error(AUTH_MESSAGES.ACCOUNT_SUSPENDED) };
      }

      if (dbUser) {
        userProfile = UserFactory.createProfile({
          authUser: authData.user,
          dbUser: dbUser,
          emailFallback: formattedEmail,
        });
      }
    } catch (err) {
      console.warn('Advertencia al consultar perfil extendido:', err);
    }

    if (!userProfile) {
      userProfile = UserFactory.createProfile({
        authUser: authData.user,
        emailFallback: formattedEmail,
      });
    }

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userProfile));
    return { user: userProfile, error: null };
  },

  /**
   * Cierra la sesión activa y limpia el almacenamiento local
   */
  async signOut() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Error al cerrar sesión en Supabase:', e);
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_REGISTERED_USERS);
  },

  /**
   * Obtiene el usuario autenticado actual y su estado en base de datos
   */
  async getCurrentUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      await billingService.processAutoRenewals(session.user.id).catch((err) =>
        console.warn('No se pudo verificar renovación automática en sesión activa:', err)
      );

      const { data: dbUser } = await supabase
        .from('usuario')
        .select('nombre, apellido, id_rol, estado, suscripcion(estado, id_plan, plan(nombre))')
        .eq('id_usuario', session.user.id)
        .maybeSingle();

      // Si la cuenta fue suspendida mientras tenía la sesión abierta, se expulsa
      if (dbUser?.estado === 'suspendido') {
        await supabase.auth.signOut();
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        return null;
      }

      return UserFactory.createProfile({
        authUser: session.user,
        dbUser: dbUser,
        emailFallback: session.user.email,
      });
    } catch (e) {
      console.warn('Error al verificar sesión actual:', e);
      return null;
    }
  },

  /**
   * Envía correo de recuperación de contraseña
   */
  async sendPasswordResetEmail(email) {
    const formattedEmail = String(email || '').toLowerCase().trim();
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(formattedEmail, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) {
        return { success: false, error: mapAuthErrorMessage(error) };
      }
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message || 'Error al enviar correo de recuperación.' };
    }
  },

  /**
   * Actualiza la contraseña del usuario en proceso de recuperación
   */
  async updateUserPassword(newPassword) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) {
        return { success: false, error: mapAuthErrorMessage(error) };
      }

      // Cerrar la sesión de recuperación para forzar inicio de sesión manual
      try {
        await supabase.auth.signOut();
      } catch (e) {}
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);

      return { success: true, user: data?.user };
    } catch (err) {
      return { success: false, error: err.message || 'Error al actualizar la contraseña.' };
    }
  },

  /**
   * Escucha cambios en el estado de autenticación (Login, Logout, Recuperación)
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        callback(session?.user || null, event);
        return;
      }
      if (session?.user) {
        // Se consulta la BD fuera del listener para evitar bloqueos del handshake
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
