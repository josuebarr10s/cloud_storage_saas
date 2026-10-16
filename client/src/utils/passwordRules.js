// Reglas de contraseña compartidas por el registro y el restablecimiento de contraseña.
// Si se cambian aquí, se aplican en los dos formularios.

// Símbolo = cualquier carácter que no sea letra (incluidas ñ y acentos) ni número
const SYMBOL_REGEX = /[^A-Za-z0-9ñÑáéíóúÁÉÍÓÚüÜ]/;

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Requisitos obligatorios.
 */
export function getPasswordRequirements(password = '', confirmPassword = '') {
  return {
    length: password.length >= MIN_PASSWORD_LENGTH,
    number: /[0-9]/.test(password),
    special: SYMBOL_REGEX.test(password),
    match: password !== '' && password === confirmPassword
  };
}

export const PASSWORD_REQUIREMENT_LABELS = {
  length: `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`,
  number: 'Al menos un número',
  special: 'Al menos un símbolo (por ejemplo ! @ # - _)',
  match: 'Las contraseñas coinciden'
};

/**
 * Nivel de seguridad para la barra de colores (1 a 4).
 * Cumplir los 3 requisitos da "Fuerte"; además mayúsculas y minúsculas (o 12+ caracteres) da "Muy Segura".
 * Mientras falte un requisito, no pasa de "Aceptable".
 */
export function getPasswordStrength(password = '') {
  if (!password) return { score: 0, label: 'Vacía', color: 'var(--border-color)' };
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (SYMBOL_REGEX.test(password)) score += 1;
  if ((/[A-Z]/.test(password) && /[a-z]/.test(password)) || password.length >= 12) score += 1;

  // Si falta un requisito obligatorio, la barra no pasa de "Aceptable"
  const { length, number, special } = getPasswordRequirements(password, password);
  if (!(length && number && special)) score = Math.min(score, 2);

  if (score <= 1) return { score: 1, label: 'Débil', color: '#ef4444' };
  if (score === 2) return { score: 2, label: 'Aceptable', color: '#f59e0b' };
  if (score === 3) return { score: 3, label: 'Fuerte', color: '#3b82f6' };
  return { score: 4, label: 'Muy Segura', color: '#10b981' };
}
