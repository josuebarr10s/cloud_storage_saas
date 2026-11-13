/**
 * Manejador centralizado de errores de autenticación
 * Clean Code: Desacopla la lógica de mensajes de error de la lógica de negocio de los servicios.
 */
export const AUTH_MESSAGES = Object.freeze({
  ACCOUNT_SUSPENDED: 'Tu cuenta está suspendida. Contacta al administrador de Nimbox.',
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  EMAIL_NOT_CONFIRMED: 'Confirma tu correo para entrar: te enviamos un enlace cuando creaste la cuenta.',
  CONFIRMATION_LINK_EXPIRED: 'El enlace de confirmación expiró o ya se usó. Inicia sesión y, si tu correo aún no está confirmado, pide uno nuevo.',
  ALREADY_REGISTERED: 'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.',
  RATE_LIMIT: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  EXPIRED_RECOVERY_LINK: 'El enlace de recuperación expiró o ya fue utilizado. Solicita uno nuevo.',
  SAME_PASSWORD: 'La nueva contraseña debe ser diferente a la anterior.',
  WAIT_BEFORE_RESEND: 'Espera un minuto antes de pedir otro correo.',
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
  if (msg.includes('for security purposes')) return AUTH_MESSAGES.WAIT_BEFORE_RESEND;
  if (msg.includes('invalid or has expired') || msg.includes('otp_expired') || msg.includes('auth session missing')) {
    return AUTH_MESSAGES.EXPIRED_RECOVERY_LINK;
  }
  if (msg.includes('different from the old password')) return AUTH_MESSAGES.SAME_PASSWORD;

  return error?.message || AUTH_MESSAGES.GENERIC_ERROR;
}
