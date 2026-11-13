import supabase from '../lib/supabase.js';
import { mapAuthErrorMessage, AUTH_MESSAGES } from '../utils/authErrorHandler.js';
import { UserFactory } from '../factories/entityFactory.js';

const STORAGE_KEYS = Object.freeze({
  CURRENT_USER: 'nimbox_current_user',
  LEGACY_REGISTERED_USERS: 'nimbox_registered_users',
});

let inFlightUserPromise = null;

/**
 * Patrón Facade: Proporciona una interfaz unificada y de alto nivel
 * para gestionar el ciclo de vida de autenticación y sesiones de usuario.
 */
// RF-02: el enlace de confirmación regresa a la app con ?confirmacion=1 para mostrar el aviso
export const CONFIRMATION_PARAM = 'confirmacion';
const confirmationRedirectUrl = () => `${window.location.origin}/?${CONFIRMATION_PARAM}=1`;

export const authService = {
  /**
   * Obtiene de forma síncrona el perfil en caché local para hidratación instantánea
   */
  getCachedUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
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
      options: {
        data: { full_name: name, nombre: nombre, apellido: apellido },
        // RF-02: a dónde vuelve el usuario al hacer clic en el enlace de confirmación
        emailRedirectTo: confirmationRedirectUrl(),
      }
    });

    if (authError) {
      return { user: null, error: new Error(mapAuthErrorMessage(authError)) };
    }

    const userId = authData?.user?.id;
    if (!userId) {
      return { user: null, error: new Error(AUTH_MESSAGES.CREATE_ACCOUNT_FAILED) };
    }

    // RF-02: con "Confirm email" activo en Supabase no hay sesión hasta que el usuario
    // confirme su correo. Si el correo ya tenía cuenta, Supabase devuelve un usuario sin
    // identidades y no envía nada.
    if (!authData.session) {
      if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        return { user: null, error: new Error(AUTH_MESSAGES.ALREADY_REGISTERED) };
      }
      return { user: null, needsConfirmation: true, email: formattedEmail, error: null };
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
   * RF-02: vuelve a enviar el correo de confirmación de la cuenta
   */
  async resendConfirmation(email) {
    const formattedEmail = String(email || '').toLowerCase().trim();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: formattedEmail,
      options: { emailRedirectTo: confirmationRedirectUrl() },
    });
    if (error) return { success: false, error: mapAuthErrorMessage(error) };
    return { success: true };
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
   * Deduplica llamadas simultáneas y actualiza la caché local.
   */
  async getCurrentUser(sessionUser = null) {
    if (inFlightUserPromise) return inFlightUserPromise;

    inFlightUserPromise = (async () => {
      try {
        let activeUser = sessionUser;
        if (!activeUser) {
          const { data: { session } } = await supabase.auth.getSession();
          activeUser = session?.user || null;
        }
        if (!activeUser) {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          return null;
        }

        const { data: dbUser } = await supabase
          .from('usuario')
          .select('nombre, apellido, id_rol, estado, suscripcion(estado, id_plan, limite_bytes_contratado, plan(nombre))')
          .eq('id_usuario', activeUser.id)
          .maybeSingle();

        // Si la cuenta fue suspendida mientras tenía la sesión abierta, se expulsa
        if (dbUser?.estado === 'suspendido') {
          await supabase.auth.signOut();
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          return null;
        }

        const profile = UserFactory.createProfile({
          authUser: activeUser,
          dbUser: dbUser,
          emailFallback: activeUser.email,
        });

        try {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(profile));
        } catch {}

        return profile;
      } catch (e) {
        console.warn('Error al verificar sesión actual:', e);
        return null;
      } finally {
        inFlightUserPromise = null;
      }
    })();

    return inFlightUserPromise;
  },

  /**
   * Envía correo de recuperación de contraseña
   */
  async sendPasswordResetEmail(email) {
    const formattedEmail = String(email || '').toLowerCase().trim();
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(formattedEmail, {
        redirectTo: window.location.origin,
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
   * Verifica enlaces de recuperación que llegan con token_hash o code (PKCE) en la URL
   */
  async verifyRecoveryFromUrl() {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const code = searchParams.get('code');

      if (tokenHash && type === 'recovery') {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (error) return { ok: false, error };
        return { ok: true, user: data?.user || null };
      }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return { ok: false, error };
        return { ok: true, user: data?.user || null };
      }

      return { ok: true, user: null };
    } catch (error) {
      return { ok: false, error };
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
      // INITIAL_SESSION ya es manejado por loadSession() al montar App
      if (event === 'INITIAL_SESSION') return;

      if (session?.user) {
        // Se consulta la BD fuera del listener para evitar bloqueos del handshake
        setTimeout(async () => {
          const user = await authService.getCurrentUser(session.user);
          callback(user, event);
        }, 0);
      } else {
        callback(null, event);
      }
    });
  }
};

export default authService;
