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

export const authService = {
  async signUpBasic({ email, password, name, securityQuestion, securityAnswer }) {
    const formattedEmail = email.toLowerCase().trim();
    const nameParts = (name || '').trim().split(' ');
    const nombre = nameParts[0] || 'Usuario';
    const apellido = nameParts.slice(1).join(' ') || '';
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formattedEmail,
      password: password,
      options: { data: { full_name: name, nombre: nombre, apellido: apellido } }
    });

    if (authError) return { user: null, error: authError };
    const userId = authData?.user?.id;
    if (!userId) return { user: null, error: new Error('No se pudo obtener el ID') };

    const userObj = {
      id: userId, name: name, email: formattedEmail, rol: 'Cliente', plan: 'Ninguno', storageQuota: '0 GB'
    };

    try {
      const { error: updateError } = await supabase
        .from('usuario')
        .update({ 
          pregunta_usuario: securityQuestion, 
          respuesta_usuario: securityAnswer,
          nombre: nombre,
          apellido: apellido
        })
        .eq('id_usuario', userId);

      if (updateError || updateError === null) {
         await supabase.from('usuario').insert({ 
           id_usuario: userId, 
           id_rol: 2, 
           nombre: nombre, 
           apellido: apellido, 
           estado: 'activo', 
           pregunta_usuario: securityQuestion, 
           respuesta_usuario: securityAnswer, 
           email: formattedEmail 
         });
      }
      
      await supabase.from('almacenamiento').upsert({ id_usuario: userId, capacidad_total_bytes: 0, espacio_usado_bytes: 0 });
    } catch (err) {
      console.error("Error al forzar guardado en BD:", err);
    }

    localStorage.setItem('nimbox_current_user', JSON.stringify(userObj));
    try {
      const existingUsers = JSON.parse(localStorage.getItem('nimbox_registered_users') || '[]');
      existingUsers.push({ ...userObj, password, securityQuestion, securityAnswer });
      localStorage.setItem('nimbox_registered_users', JSON.stringify(existingUsers));
    } catch (e) {}

    return { user: userObj, error: null };
  },

  async checkUserSubscription(userId) {
    try {
      const { data } = await supabase.from('suscripcion').select('*').eq('id_usuario', userId).eq('estado', 'activa').maybeSingle();
      return data ? true : false;
    } catch (e) { return false; }
  },

  async signIn({ email, password }) {
    const formattedEmail = email.toLowerCase().trim();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: formattedEmail, password });

    if (!authError && authData?.user) {
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
          const activeSub = dbUser.suscripcion?.find?.(s => s.estado === 'activa') || dbUser.suscripcion?.[0];
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
    }

    try {
      const registeredUsers = JSON.parse(localStorage.getItem('nimbox_registered_users') || '[]');
      const localUser = registeredUsers.find(u => u.email.toLowerCase() === formattedEmail && u.password === password);
      if (localUser) {
        const cleanUser = { ...localUser, rol: 'Cliente', plan: 'Ninguno', storageQuota: '0 GB' };
        delete cleanUser.password;
        localStorage.setItem('nimbox_current_user', JSON.stringify(cleanUser));
        return { user: cleanUser, error: null };
      }
    } catch (e) {}

    return { user: null, error: authError || new Error('Credenciales inválidas') };
  },

  async signOut() {
    try { await supabase.auth.signOut(); } catch (e) {}
    localStorage.removeItem('nimbox_current_user');
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

        // Plan real desde la suscripción activa (antes se leía de user_metadata, que nunca se llena)
        const activeSub = dbUser?.suscripcion?.find?.(s => s.estado === 'activa');
        const planName = activeSub?.plan?.nombre || 'Ninguno';

        return {
          id: session.user.id, name: fullName, email: session.user.email, rol: getRolNombre(dbUser?.id_rol),
          plan: planName, planId: activeSub?.id_plan || null, storageQuota: cuotaDePlan(activeSub ? planName : null)
        };
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem('nimbox_current_user');
      if (saved) return { ...JSON.parse(saved), rol: 'Cliente' };
    } catch (e) {}
    return null;
  },

  async findUserSecurityQuestion(email) {
    const formattedEmail = email.toLowerCase().trim();
    try {
      const { data, error } = await supabase.from('usuario').select('pregunta_usuario, respuesta_usuario, id_usuario').eq('email', formattedEmail).maybeSingle();
      if (data) return { data, error: null };
    } catch (e) {}

    try {
      const registeredUsers = JSON.parse(localStorage.getItem('nimbox_registered_users') || '[]');
      const localUser = registeredUsers.find(u => u.email.toLowerCase() === formattedEmail);
      if (localUser) {
        return { data: { pregunta_usuario: localUser.securityQuestion, respuesta_usuario: localUser.securityAnswer, id_usuario: localUser.id }, error: null };
      }
    } catch (e) {}
    return { data: null, error: new Error('Usuario no encontrado.') };
  },

  async sendPasswordResetEmail(email) {
    const formattedEmail = email.toLowerCase().trim();
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(formattedEmail, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message || 'Error al enviar correo de recuperación.' };
    }
  },

  async verifyOtpAndResetPassword({ email, token, newPassword }) {
    const formattedEmail = email.toLowerCase().trim();
    const cleanToken = (token || '').trim();

    try {
      // 1. Verificar el código OTP de recuperación de 6 dígitos con Supabase
      const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
        email: formattedEmail,
        token: cleanToken,
        type: 'recovery'
      });

      if (otpError) {
        return { 
          success: false, 
          error: otpError.message.includes('expired') 
            ? 'El código de 6 dígitos ha expirado. Por favor solicita uno nuevo.' 
            : 'Código de verificación incorrecto. Revisa el correo enviado a tu Gmail.' 
        };
      }

      // 2. Con la sesión autenticada por OTP, actualizar la contraseña en Supabase
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        return { success: false, error: updateError.message || 'Error al actualizar la contraseña.' };
      }

      // 3. Sincronizar en almacenamiento local si existe
      try {
        const registeredUsers = JSON.parse(localStorage.getItem('nimbox_registered_users') || '[]');
        const userIdx = registeredUsers.findIndex(u => u.email.toLowerCase() === formattedEmail);
        if (userIdx !== -1) {
          registeredUsers[userIdx].password = newPassword;
          localStorage.setItem('nimbox_registered_users', JSON.stringify(registeredUsers));
        }
      } catch (e) {}

      return { success: true, user: updateData?.user };
    } catch (err) {
      return { success: false, error: err.message || 'Error al procesar la verificación.' };
    }
  },

  async updateUserPassword(newPassword) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) {
        return { success: false, error: error.message };
      }

      // Sincronizar en almacenamiento local si existe
      try {
        const currentUser = JSON.parse(localStorage.getItem('nimbox_current_user') || '{}');
        const userEmail = data?.user?.email || currentUser?.email;
        if (userEmail) {
          const registeredUsers = JSON.parse(localStorage.getItem('nimbox_registered_users') || '[]');
          const userIdx = registeredUsers.findIndex(u => u.email.toLowerCase() === userEmail.toLowerCase());
          if (userIdx !== -1) {
            registeredUsers[userIdx].password = newPassword;
            localStorage.setItem('nimbox_registered_users', JSON.stringify(registeredUsers));
          }
        }
      } catch (e) {}

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

  async resetPasswordWithSecurityAnswer(email, newPassword) {
    try {
      const registeredUsers = JSON.parse(localStorage.getItem('nimbox_registered_users') || '[]');
      const userIndex = registeredUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (userIndex !== -1) {
        registeredUsers[userIndex].password = newPassword;
        localStorage.setItem('nimbox_registered_users', JSON.stringify(registeredUsers));
        return { success: true };
      }
    } catch (e) {}
    return { success: false, error: 'No se pudo actualizar localmente.' };
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        callback(session?.user || null, event);
        return;
      }
      if (session?.user) {
        const user = await authService.getCurrentUser();
        callback(user, event);
      } else {
        callback(null, event);
      }
    });
  }
};

export default authService;