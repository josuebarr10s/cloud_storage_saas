/**
 * Constantes y catálogos de roles de usuario
 * Evita el uso de cadenas y números mágicos en el sistema.
 */
export const USER_ROLES = Object.freeze({
  ADMIN_ID: 1,
  CLIENT_ID: 2,
  ADMIN_NAME: 'Administrador',
  CLIENT_NAME: 'Cliente',
});

export const ROLE_MAP = Object.freeze({
  [USER_ROLES.ADMIN_ID]: USER_ROLES.ADMIN_NAME,
  [USER_ROLES.CLIENT_ID]: USER_ROLES.CLIENT_NAME,
});

/**
 * Obtiene el nombre legible de un rol a partir de su ID
 * @param {number|string} idRol 
 * @returns {string}
 */
export function getRoleName(idRol) {
  return ROLE_MAP[idRol] || USER_ROLES.CLIENT_NAME;
}
