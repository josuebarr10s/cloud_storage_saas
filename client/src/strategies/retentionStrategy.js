import { normalizeText } from '../utils/formatters.js';

/**
 * Patrón Strategy (Estrategia): Define una familia de algoritmos para calcular
 * los días de retención de archivos en la papelera según el plan de suscripción.
 */

class BasicRetentionStrategy {
  getDays() {
    return 7;
  }
}

class ProRetentionStrategy {
  getDays() {
    return 30;
  }
}

class EnterpriseRetentionStrategy {
  getDays() {
    return null; // Retención ilimitada
  }
}

class DefaultRetentionStrategy {
  getDays() {
    return 30;
  }
}

/**
 * Contexto / Factoría de selección de estrategia de retención
 * @param {string} planName 
 * @returns {{ getDays: () => number | null }}
 */
export function getRetentionStrategy(planName = '') {
  const normalized = normalizeText(planName);

  if (normalized.includes('basico')) {
    return new BasicRetentionStrategy();
  }
  if (normalized.includes('empresa')) {
    return new EnterpriseRetentionStrategy();
  }
  if (normalized.includes('pro')) {
    return new ProRetentionStrategy();
  }
  return new DefaultRetentionStrategy();
}

/**
 * Función de compatibilidad directa para filesService
 * @param {string} planName 
 * @returns {number|null}
 */
export function calculateRetentionDays(planName = '') {
  return getRetentionStrategy(planName).getDays();
}
