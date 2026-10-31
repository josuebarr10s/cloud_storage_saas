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
      'Carpetas, vista previa y búsqueda',
      'Historial de versiones',
      'Papelera de 7 días',
      'Compartir por enlace (solo lectura)'
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
      'Todo lo del plan Básico',
      'Papelera de 30 días',
      'Enlaces de editor para colaborar',
      'Enlaces con contraseña y vencimiento'
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
    storageQuota: '2 TB',
    features: [
      '2 TB de almacenamiento',
      'Todo lo del plan Pro',
      'Papelera sin límite de tiempo',
      'Enlaces solo para correos invitados',
      'Ver quién abrió cada enlace'
    ],
    buttonText: 'Elegir Empresarial'
  }
]);
