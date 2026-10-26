/**
 * Catálogo y configuración por defecto de planes de suscripción
 */
export const PLAN_NAMES = Object.freeze({
  BASIC: 'Básico',
  PRO: 'Pro',
  ENTERPRISE: 'Empresarial',
  NONE: 'Ninguno',
});

export const DEFAULT_PLANS = Object.freeze([
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
]);
