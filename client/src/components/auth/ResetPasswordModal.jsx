import React, { useState, useEffect } from 'react';
import { X, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export const ResetPasswordModal = ({ isOpen, onClose, onResetSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password requirements state
  const [requirements, setRequirements] = useState({
    length: false,
    number: false,
    special: false,
    match: false
  });

  useEffect(() => {
    setRequirements({
      length: newPassword.length >= 8,
      number: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
      match: newPassword === confirmPassword && confirmPassword !== ''
    });
  }, [newPassword, confirmPassword]);

  if (!isOpen) return null;

  const isFormValid = Object.values(requirements).every(Boolean);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setErrorMessage('');

    // Simulamos la actualización en el backend
    setTimeout(() => {
      try {
        const resetEmail = sessionStorage.getItem('nimbox_reset_email');
        if (!resetEmail) {
            setErrorMessage('La sesión de recuperación ha expirado. Por favor solicita un nuevo enlace.');
            setIsLoading(false);
            return;
        }

        const registeredUsers = JSON.parse(localStorage.getItem('nimbox_registered_users') || '[]');
        const userIndex = registeredUsers.findIndex(u => u.email.toLowerCase() === resetEmail.toLowerCase());

        if (userIndex !== -1) {
          registeredUsers[userIndex].password = newPassword;
          localStorage.setItem('nimbox_registered_users', JSON.stringify(registeredUsers));
          sessionStorage.removeItem('nimbox_reset_email');
          setIsSuccess(true);
          setTimeout(() => {
            onResetSuccess();
          }, 2000);
        } else {
          setErrorMessage('No se pudo encontrar la cuenta asociada.');
        }
      } catch (err) {
        setErrorMessage('Error al restablecer la contraseña.');
      }
      setIsLoading(false);
    }, 1500);
  };

  const RequirementItem = ({ met, text }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: met ? 'var(--success)' : 'var(--text-muted)' }}>
      <CheckCircle2 size={14} style={{ opacity: met ? 1 : 0.3 }} />
      <span>{text}</span>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
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
          overflow: 'hidden'
        }}
      >
        {!isSuccess ? (
          <>
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Nueva Contraseña</h3>
              </div>
              <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '1.75rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Crea una contraseña segura para proteger tu cuenta de Nimbox.
              </p>

              {errorMessage && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8rem', display: 'flex', gap: '8px' }}>
                  <AlertCircle size={16} /> {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px' }}>Nueva Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px' }}>Confirmar Contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    required
                  />
                </div>

                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <RequirementItem met={requirements.length} text="Mínimo 8 caracteres" />
                  <RequirementItem met={requirements.number} text="Al menos un número" />
                  <RequirementItem met={requirements.special} text="Al menos un carácter especial (!@#$)" />
                  <RequirementItem met={requirements.match} text="Las contraseñas coinciden" />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!isFormValid || isLoading}
                  style={{ width: '100%', padding: '0.85rem', opacity: (!isFormValid || isLoading) ? 0.6 : 1 }}
                >
                  {isLoading ? 'Actualizando...' : 'Restablecer Contraseña'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>¡Contraseña Actualizada!</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tu contraseña ha sido cambiada exitosamente. Serás redirigido para iniciar sesión.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordModal;
