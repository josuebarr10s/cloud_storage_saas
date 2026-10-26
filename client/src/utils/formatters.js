import { STORAGE_CONSTANTS } from '../constants/storage.js';

/**
 * Formatea un tamaño en bytes a una representación legible (Bytes, KB, MB, GB, TB).
 * Clean Code: función pura con nombres expresivos y sin efectos secundarios.
 * 
 * @param {number|string} bytes 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 1) {
  const numericBytes = Number(bytes);
  if (!numericBytes || numericBytes <= 0) return '0 Bytes';

  const k = STORAGE_CONSTANTS.BYTES_PER_KB;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(numericBytes) / Math.log(k));
  const safeIndex = Math.min(i, sizes.length - 1);
  const value = parseFloat((numericBytes / Math.pow(k, safeIndex)).toFixed(dm));

  return `${value} ${sizes[safeIndex]}`;
}

/**
 * Formatea una fecha ISO o timestamp a formato legible en español.
 * 
 * @param {string|Date} fecha 
 * @returns {string}
 */
export function formatDate(fecha) {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Normaliza una cadena removiendo acentos y convirtiendo a minúsculas para comparaciones seguras.
 * 
 * @param {string} text 
 * @returns {string}
 */
export function normalizeText(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}
