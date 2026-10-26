/**
 * Manejador centralizado de errores de autenticación
 * Clean Code: Desacopla la lógica de mensajes de error de la lógica de negocio de los servicios.
 */
export const AUTH_MESSAGES = Object.freeze({
  ACCOUNT_SUSPENDED: 'Tu cuenta está suspendida. Contacta al administrador de Nimbox.',
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  EMAIL_NOT_CONFIRMED: 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.',
  ALREADY_REGISTERED: 'Ya existe una cuenta con este correo.',
  RATE_LIMIT: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  GENERIC_ERROR: 'Ocurrió un error inesperado.',
  CREATE_ACCOUNT_FAILED: 'No se pudo crear la cuenta.',
});

/**
 * Traduce un error de Supabase Auth a un mensaje amigable para el usuario.
 * @param {Error|{message: string}} error 
 * @returns {string}
 */
export function mapAuthErrorMessage(error) {
  const msg = (error?.message || '').toLowerCase();

  if (msg.includes('invalid login credentials')) return AUTH_MESSAGES.INVALID_CREDENTIALS;
  if (msg.includes('email not confirmed')) return AUTH_MESSAGES.EMAIL_NOT_CONFIRMED;
  if (msg.includes('already registered')) return AUTH_MESSAGES.ALREADY_REGISTERED;
  if (msg.includes('rate limit') || msg.includes('too many')) return AUTH_MESSAGES.RATE_LIMIT;

  return error?.message || AUTH_MESSAGES.GENERIC_ERROR;
}
