import React, { useState } from 'react';
import { X, Mail, ArrowRight, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react';

export const ForgotPasswordModal = ({ isOpen, onClose, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!email.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }

    setIsLoading(true);

    // Simulamos una llamada al backend
    setTimeout(() => {
      setIsLoading(false);
      // En un entorno real, no confirmaríamos si el correo existe por seguridad.
      // Pero para este demo, validaremos contra localStorage para dar feedback.
      try {
        const registeredUsers = JSON.parse(localStorage.getItem('nimbox_registered_users') || '[]');
        const userExists = registeredUsers.some(u => u.email.toLowerCase() === email.toLowerCase().trim());
        
        // Siempre mostramos éxito para evitar enumeración de correos (Best Practice),
        // pero podemos guardar el email en un estado temporal para la simulación del siguiente paso.
        setIsSubmitted(true);
        if (userExists) {
            // Guardamos el email que solicitó el reset para la simulación del siguiente paso
            sessionStorage.setItem('nimbox_reset_email', email.trim());
        }
      } catch (err) {
        setErrorMessage('Ocurrió un error al procesar tu solicitud.');
      }
    }, 1500);
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
          maxWidth: '460px',
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
            padding: '1.5rem 1.75rem 1rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={onBackToLogin}
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
                marginRight: '4px'
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Recuperar Contraseña
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.75rem' }}>
          {!isSubmitted ? (
            <>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.
              </p>

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

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '6px' }}>
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
                        padding: '10px 12px 10px 36px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                      required
                      disabled={isLoading}
                    />
                    <Mail size={16} color="var(--text-light)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isLoading ? 0.7 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? 'Enviando...' : 'Enviar Instrucciones'} {!isLoading && <ArrowRight size={16} />}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                background: 'var(--success-bg)', 
                color: 'var(--success)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 1.5rem auto'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
                ¡Correo Enviado!
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '2rem' }}>
                Si el correo <strong>{email}</strong> está registrado en Nimbox, recibirás un enlace para restablecer tu contraseña en unos minutos.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={onBackToLogin}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.85rem' }}
                >
                  Volver al Inicio de Sesión
                </button>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ¿No recibiste el correo? Revisa tu carpeta de spam o{' '}
                  <button 
                    onClick={() => setIsSubmitted(false)} 
                    style={{ color: 'var(--primary)', fontWeight: 600 }}
                  >
                    intenta de nuevo
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
