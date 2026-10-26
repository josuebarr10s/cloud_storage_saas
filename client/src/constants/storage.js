/**
 * Constantes de almacenamiento y unidades de medida
 * Clean Code: Elimina números mágicos de conversión de bytes y tiempo.
 */
export const STORAGE_CONSTANTS = Object.freeze({
  STORAGE_BUCKET: 'nimbox-files',
  MS_PER_DAY: 24 * 60 * 60 * 1000,
  BYTES_PER_KB: 1024,
  BYTES_PER_MB: 1024 * 1024,
  BYTES_PER_GB: 1024 * 1024 * 1024,
  BYTES_PER_TB: 1024 * 1024 * 1024 * 1024,
  DEFAULT_STORAGE_LIMIT_BYTES: 536870912000, // 500 GB por defecto
});
