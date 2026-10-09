import React, { useState } from 'react';
import { X, Mail, ArrowRight, AlertCircle, CheckCircle2, ChevronLeft, Lock, Eye, EyeOff, ShieldQuestion, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService.js';

export const ForgotPasswordModal = ({ isOpen, onClose, onBackToLogin }) => {
  // Steps: 1 = Email, 2 = Security Question, 3 = New Password, 4 = Success
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim()) return setErrorMessage('Ingresa tu correo electrónico.');

    setIsLoading(true);
    try {
      const { data, error } = await authService.findUserSecurityQuestion(email);
      if (error || !data) {
        setErrorMessage('No encontramos ninguna cuenta con este correo.');
      } else {
        setSecurityQuestion(data.pregunta_usuario || '¿Cuál fue el nombre de tu primera mascota?');
        setCorrectAnswer(data.respuesta_usuario || '');
        setStep(2);
      }
    } catch (err) {
      setErrorMessage('Ocurrió un error al buscar tu cuenta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAnswer = (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    // Normalizar para comparar (ignorando mayúsculas/minúsculas y espacios extras)
    const normalizedUser = userAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();

    if (normalizedUser === normalizedCorrect) {
      setStep(3);
    } else {
      setErrorMessage('La respuesta de seguridad es incorrecta.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 6) {
      return setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
    }
    if (newPassword !== confirmPassword) {
      return setErrorMessage('Las contraseñas no coinciden.');
    }

    setIsLoading(true);
    try {
      const { success, error } = await authService.resetPasswordWithSecurityAnswer(email, newPassword);
      if (success) {
        setStep(4);
      } else {
        setErrorMessage(error || 'No se pudo restablecer la contraseña.');
      }
    } catch (err) {
      setErrorMessage('Ocurrió un error al actualizar la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setEmail('');
    setUserAnswer('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
  };

  const renderContent = () => {
    switch (step) {
      case 1: // Email Verification
        return (
          <>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Ingresa tu correo para buscar tu pregunta de seguridad y restablecer tu contraseña.
            </p>
            {errorMessage && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                <AlertCircle size={16} /> <span>{errorMessage}</span>
              </div>
            )}
            <form onSubmit={handleVerifyEmail} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '6px' }}>Correo Electrónico</label>
                <div style={{ position: 'relative' }}>
                  <input type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none' }} required disabled={isLoading} />
                  <Mail size={16} color="var(--text-light)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isLoading ? <Loader2 size={16} className="spin" /> : 'Siguiente'} {!isLoading && <ArrowRight size={16} />}
              </button>
            </form>
          </>
        );

      case 2: // Security Question
        const questionText = {
          'mascota': '¿Cuál fue el nombre de tu primera mascota?',
          'ciudad': '¿En qué ciudad naciste?',
          'madre': '¿Cuál es el segundo nombre de tu madre?',
          'colegio': '¿Cómo se llamaba tu primer colegio?'
        }[securityQuestion] || securityQuestion;

        return (
          <>
            <div style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--primary-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '6px' }}>
                <ShieldQuestion size={18} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Pregunta de Seguridad</span>
              </div>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{questionText}</p>
            </div>
            {errorMessage && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                <AlertCircle size={16} /> <span>{errorMessage}</span>
              </div>
            )}
            <form onSubmit={handleVerifyAnswer} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '6px' }}>Tu Respuesta</label>
                <input type="text" placeholder="Escribe tu respuesta aquí" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none' }} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}>Verificar Respuesta</button>
              <button type="button" onClick={() => setStep(1)} style={{ fontSize: '0.825rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Usar otro correo</button>
            </form>
          </>
        );

      case 3: // New Password
        return (
          <>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Establecer nueva contraseña</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>La respuesta es correcta. Ahora puedes elegir una nueva contraseña.</p>
            {errorMessage && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                <AlertCircle size={16} /> <span>{errorMessage}</span>
              </div>
            )}
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '6px' }}>Nueva Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', padding: '10px 38px 10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none' }} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '6px' }}>Confirmar Contraseña</label>
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none' }} required />
              </div>
              <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}>
                {isLoading ? 'Actualizando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          </>
        );

      case 4: // Success
        return (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>¡Contraseña Actualizada!</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '2rem' }}>Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión con tus nuevas credenciales.</p>
            <button onClick={() => { onBackToLogin(); resetModal(); }} className="btn-primary" style={{ width: '100%', padding: '0.85rem' }}>Iniciar Sesión</button>
          </div>
        );
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '460px', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-modal)', border: '1px solid var(--border-color)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ padding: '1.5rem 1.75rem 1rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {step < 4 && (
              <button onClick={step === 1 ? onBackToLogin : () => setStep(step - 1)} style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', marginRight: '4px' }}>
                <ChevronLeft size={18} />
              </button>
            )}
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Recuperar Acceso</h3>
          </div>
          <button onClick={() => { onClose(); resetModal(); }} style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '1.75rem' }}>{renderContent()}</div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;

