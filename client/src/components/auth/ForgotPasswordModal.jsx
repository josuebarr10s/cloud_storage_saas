import React, { useState } from 'react';
import { X, Mail, AlertCircle, CheckCircle2, ChevronLeft, Loader2, Send } from 'lucide-react';
import { authService } from '../../services/authService.js';

export const ForgotPasswordModal = ({ isOpen, onClose, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const formattedEmail = email.trim().toLowerCase();
    if (!formattedEmail) {
      return setErrorMessage('Por favor ingresa tu correo electrónico.');
    }

    setIsLoading(true);
    try {
      const { success, error } = await authService.sendPasswordResetEmail(formattedEmail);
      if (success) {
        setIsSent(true);
      } else {
        setErrorMessage(error || 'No se pudo enviar el correo de recuperación. Verifica la dirección ingresada.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error inesperado al solicitar recuperación.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setEmail('');
    setIsSent(false);
    setErrorMessage('');
    setIsLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          width: '100%',
          maxWidth: '440px',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => {
                resetModal();
                onBackToLogin();
              }}
              title="Volver a iniciar sesión"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Recuperar Contraseña
            </h3>
          </div>
          <button
            onClick={handleClose}
            title="Cerrar"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.75rem' }}>
          {!isSent ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '16px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem auto'
                  }}
                >
                  <Mail size={26} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  ¿Olvidaste tu contraseña?
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                  Ingresa tu correo y te enviaremos un enlace a tu Gmail para que puedas restablecerla.
                </p>
              </div>

              {errorMessage && (
                <div
                  style={{
                    background: 'var(--danger-bg)',
                    border: '1px solid var(--danger)',
                    color: 'var(--danger)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.825rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '1.25rem'
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--text-strong)',
                      marginBottom: '6px'
                    }}
                  >
                    Correo Electrónico
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        background: 'var(--bg-input, transparent)',
                        color: 'var(--text-main)'
                      }}
                      required
                      disabled={isLoading}
                      autoFocus
                    />
                    <Mail
                      size={16}
                      color="var(--text-light)"
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading || !email.trim()}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: (isLoading || !email.trim()) ? 0.7 : 1,
                    cursor: (isLoading || !email.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Enviando enlace...</span>
                    </>
                  ) : (
                    <>
                      <span>Enviar enlace de recuperación</span>
                      <Send size={15} />
                    </>
                  )}
                </button>

                <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      resetModal();
                      onBackToLogin();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ← Volver a iniciar sesión
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--success-bg)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto'
                }}
              >
                <CheckCircle2 size={34} />
              </div>

              <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                ¡Enlace Enviado a tu Correo!
              </h4>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.55', marginBottom: '1.25rem' }}>
                Hemos enviado un enlace de recuperación a <strong style={{ color: 'var(--text-main)' }}>{email}</strong>.
                Abre tu correo y haz clic en el enlace para restablecer tu contraseña.
              </p>

              <div
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginBottom: '1.5rem',
                  textAlign: 'left'
                }}
              >
                💡 <strong>Nota:</strong> Si no lo ves de inmediato en tu bandeja principal, revisa la carpeta de <em>Spam</em> o <em>Promociones</em>.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onBackToLogin();
                  }}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.8rem', fontSize: '0.9rem' }}
                >
                  Entendido, volver al inicio
                </button>
                <button
                  type="button"
                  onClick={() => setIsSent(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  ¿No era tu correo? Probar con otro
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
