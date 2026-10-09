import supabase from '../lib/supabase.js';

const ROLES = { 1: 'Administrador', 2: 'Cliente' };
const getRolNombre = (idRol) => ROLES[idRol] || 'Cliente';

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
        if (dbUser) {
          const fullName = [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ') || formattedEmail.split('@')[0];
          const activeSub = dbUser.suscripcion?.find?.(s => s.estado === 'activa') || dbUser.suscripcion?.[0];
          const planName = activeSub?.plan?.nombre || 'Ninguno';

          userProfile = {
            id: authData.user.id, name: fullName, email: formattedEmail, rol: getRolNombre(dbUser.id_rol),
            plan: planName, planId: activeSub?.id_plan || null,
            storageQuota: activeSub ? (planName.toLowerCase().includes('básico') ? '10 GB' : '500 GB') : '0 GB'
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
        const { data: dbUser } = await supabase.from('usuario').select('nombre, apellido, id_rol').eq('id_usuario', session.user.id).single();
        const fullName = dbUser ? [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ') : (session.user.user_metadata?.full_name || session.user.email.split('@')[0]);
        return {
          id: session.user.id, name: fullName, email: session.user.email, rol: getRolNombre(dbUser?.id_rol),
          plan: session.user.user_metadata?.plan_name || 'Ninguno', storageQuota: '0 GB'
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
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
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