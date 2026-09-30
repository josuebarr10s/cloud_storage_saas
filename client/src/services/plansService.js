import supabase from '../lib/supabase.js';

const DEFAULT_PLANS = [
  {
    id_plan: '11111111-1111-1111-1111-111111111111',
    nombre: 'Básico',
    descripcion: 'Para uso personal y organización',
    precio: 5,
    precioAnual: 4.0,
    popular: false,
    storageQuota: '10 GB',
    features: [
      '10 GB de almacenamiento',
      'Acceso desde 2 dispositivos',
      'Compartir por enlace',
      'Soporte por email',
      'Historial de versiones (7 días)'
    ],
    buttonText: 'Elegir Básico'
  },
  {
    id_plan: '22222222-2222-2222-2222-222222222222',
    nombre: 'Pro',
    descripcion: 'Para profesionales y pequeños equipos',
    precio: 12,
    precioAnual: 9.6,
    popular: true,
    badge: 'Recomendado',
    storageQuota: '500 GB',
    features: [
      '500 GB de almacenamiento',
      'Dispositivos ilimitados',
      'Compartir con permisos avanzados',
      'Soporte prioritario 24/7',
      'Historial de versiones 30 días',
      'Colaboración en equipo',
      'Integraciones con terceros'
    ],
    buttonText: 'Elegir Pro'
  },
  {
    id_plan: '33333333-3333-3333-3333-333333333333',
    nombre: 'Empresarial',
    descripcion: 'Para organizaciones exigentes',
    precio: 49,
    precioAnual: 39.2,
    popular: false,
    storageQuota: 'Ilimitado',
    features: [
      'Almacenamiento Ilimitado',
      'SSO y control de acceso',
      'SLA garantizado 99.99%',
      'Soporte dedicado',
      'Historial de versiones ilimitado',
      'Auditoría y cumplimiento',
      'API privada y webhooks',
      'Facturación personalizada'
    ],
    buttonText: 'Contactar ventas'
  }
];

export const plansService = {
  /**
   * Obtener planes desde la tabla public.plan
   */
  async getPlans() {
    try {
      const { data, error } = await supabase
        .from('plan')
        .select('*')
        .eq('activo', true)
        .order('precio', { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_PLANS.slice().sort((a, b) => a.precio - b.precio);
      }

      return data.map(p => {
        const isPro = p.nombre.toLowerCase().includes('pro');
        const isEmp = p.nombre.toLowerCase().includes('empresa');
        const bytes = p.limite_almacenamiento_bytes || 0;
        const storageQuotaFormatted = bytes > 0 
          ? (bytes >= 1099511627776 ? `${(bytes / 1099511627776).toFixed(0)} TB` : `${(bytes / 1073741824).toFixed(0)} GB`)
          : 'Ilimitado';

        return {
          id_plan: p.id_plan,
          nombre: p.nombre,
          descripcion: p.descripcion,
          precio: parseFloat(p.precio),
          precioAnual: parseFloat(p.precio) * 0.8,
          popular: isPro,
          badge: isPro ? 'Recomendado' : null,
          storageQuota: storageQuotaFormatted,
          features: isPro ? DEFAULT_PLANS[1].features : isEmp ? DEFAULT_PLANS[2].features : DEFAULT_PLANS[0].features,
          buttonText: isPro ? 'Elegir Pro' : isEmp ? 'Contactar ventas' : 'Elegir Básico'
        };
      }).sort((a, b) => a.precio - b.precio);
    } catch (err) {
      console.warn('Uso de planes por defecto (error Supabase):', err);
      return DEFAULT_PLANS.slice().sort((a, b) => a.precio - b.precio);
    }
  },

  /**
   * Registrar una transacción en las tablas public.suscripcion y public.pago
   */
  async createSubscription({ userId, planId, planName, billingCycle, amountPaid, transactionId }) {
    if (!userId) return { subscription: null, error: new Error('userId es requerido') };

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(userId)) {
      console.error('userId no es un UUID válido:', userId);
      return { subscription: null, error: new Error('ID de usuario no es un UUID válido') };
    }

    try {
      let planUuid = planId;

      if (!uuidRegex.test(planUuid)) {
        const cleanName = (planName || 'Pro').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const { data: dbPlans } = await supabase.from('plan').select('id_plan, limite_almacenamiento_bytes, nombre');
        
        if (dbPlans && dbPlans.length > 0) {
          const matched = dbPlans.find(p => p.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(cleanName.toLowerCase()));
          if (matched) {
            planUuid = matched.id_plan;
          } else {
            planUuid = dbPlans[0].id_plan;
          }
        } else {
          if (cleanName.toLowerCase().includes('basico')) planUuid = '11111111-1111-1111-1111-111111111111';
          else if (cleanName.toLowerCase().includes('empresa')) planUuid = '33333333-3333-3333-3333-333333333333';
          else planUuid = '22222222-2222-2222-2222-222222222222';
        }
      }

      let limitBytes = 536870912000;
      const { data: planInfo } = await supabase.from('plan').select('limite_almacenamiento_bytes').eq('id_plan', planUuid).single();
      if (planInfo?.limite_almacenamiento_bytes) {
        limitBytes = planInfo.limite_almacenamiento_bytes;
      }

      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + (billingCycle === 'annual' ? 365 : 30));

      // 2. Insertar en public.suscripcion
      const { data: subData, error: subErr } = await supabase
        .from('suscripcion')
        .insert([{
          id_usuario: userId,
          id_plan: planUuid,
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: fechaFin.toISOString(),
          estado: 'activa',
          precio_contratado: parseFloat(amountPaid || 12),
          limite_bytes_contratado: limitBytes
        }])
        .select();

      if (subErr) {
        console.error('Error al insertar en public.suscripcion:', subErr.message);
      }

      const subRecord = subData?.[0];
      if (subRecord) {
        // 3. Insertar en public.pago
        await supabase.from('pago').insert([{
          id_suscripcion: subRecord.id_suscripcion,
          monto: parseFloat(amountPaid || 12),
          metodo_pago: 'tarjeta_simulada',
          referencia_transaccion: transactionId || `NMB-${Date.now()}`,
          estado: 'completado'
        }]);
      }

      return { subscription: subRecord, error: subErr };
    } catch (err) {
      console.error('Error al registrar suscripcion en Supabase:', err);
      return { subscription: null, error: err };
    }
  }
};

export default plansService;
