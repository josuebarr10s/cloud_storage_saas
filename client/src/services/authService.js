import supabase from '../lib/supabase.js';

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
    if (plan?.toLowerCase().includes('básico')) {
      quotaBytes = 10737418240; // 10 GB
    } else if (plan?.toLowerCase().includes('empresa')) {
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
    }

    const userId = authData?.user?.id;
    const userObj = {
      id: userId || `usr-${Date.now()}`,
      name: name,
      email: formattedEmail,
      plan: plan || 'Pro',
      planId: planId || 2,
      storageQuota: plan?.toLowerCase().includes('básico') ? '10 GB' : '500 GB',
      billingCycle: billingCycle || 'monthly',
      amountPaid: amountPaid,
      transactionId: transactionId || `NMB-${Math.floor(100000 + Math.random() * 900000)}`,
      cardLast4: cardLast4 || '4242'
    };

    if (userId) {
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
        let planUuid = planId;
        // Buscar el id_plan de la tabla public.plan
        const { data: dbPlans } = await supabase.from('plan').select('id_plan, nombre').ilike('nombre', `%${plan || 'Pro'}%`).limit(1);
        if (dbPlans && dbPlans.length > 0) {
          planUuid = dbPlans[0].id_plan;
        }

        if (planUuid) {
          const fechaInicio = new Date();
          const fechaFin = new Date();
          fechaFin.setDate(fechaFin.getDate() + (billingCycle === 'annual' ? 365 : 30));

          const { data: subData, error: subErr } = await supabase.from('suscripcion').insert({
            id_usuario: userId,
            id_plan: planUuid,
            fecha_inicio: fechaInicio.toISOString(),
            fecha_fin: fechaFin.toISOString(),
            estado: 'activa',
            precio_contratado: parseFloat(amountPaid || 12),
            limite_bytes_contratado: quotaBytes
          }).select();

          if (subData && subData.length > 0) {
            // Registrar el pago en public.pago
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
    }

    // Persistencia local para respaldo
    try {
      const existingUsers = JSON.parse(localStorage.getItem('nimbox_registered_users') || '[]');
      const filtered = existingUsers.filter(u => u.email !== formattedEmail);
      filtered.push({ ...userObj, password });
      localStorage.setItem('nimbox_registered_users', JSON.stringify(filtered));
      localStorage.setItem('nimbox_current_user', JSON.stringify(userObj));
    } catch (e) {}

    return { user: userObj, error: authError };
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
      try {
        const { data: dbUser } = await supabase
          .from('usuario')
          .select('*, suscripcion(*, plan(*))')
          .eq('id_usuario', authData.user.id)
          .single();

        if (dbUser) {
          const fullName = [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ') || formattedEmail.split('@')[0];
          const activeSub = dbUser.suscripcion?.find?.(s => s.estado === 'activa') || dbUser.suscripcion?.[0];
          const planName = activeSub?.plan?.nombre || 'Pro';

          userProfile = {
            id: authData.user.id,
            name: fullName,
            email: formattedEmail,
            plan: planName,
            planId: activeSub?.id_plan || 2,
            storageQuota: planName.toLowerCase().includes('básico') ? '10 GB' : '500 GB'
          };
        }
      } catch (err) {}

      if (!userProfile) {
        userProfile = {
          id: authData.user.id,
          name: authData.user.user_metadata?.full_name || formattedEmail.split('@')[0],
          email: formattedEmail,
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
        const cleanUser = { ...localUser };
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
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    localStorage.removeItem('nimbox_current_user');
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
          .select('nombre, apellido')
          .eq('id_usuario', session.user.id)
          .single();

        const fullName = dbUser ? [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ') : (session.user.user_metadata?.full_name || session.user.email.split('@')[0]);

        return {
          id: session.user.id,
          name: fullName,
          email: session.user.email,
          plan: session.user.user_metadata?.plan_name || 'Pro',
          storageQuota: '500 GB'
        };
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem('nimbox_current_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return null;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
          email: session.user.email,
          plan: session.user.user_metadata?.plan_name || 'Pro',
          storageQuota: '500 GB'
        });
      } else {
        callback(null);
      }
    });
  }
};

export default authService;
