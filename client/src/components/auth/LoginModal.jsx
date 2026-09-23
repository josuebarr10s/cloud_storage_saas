import React, { useState } from 'react';
import { X, Lock, Mail, Eye, EyeOff, ArrowRight, Sparkles, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService.js';

export const LoginModal = ({ isOpen, onClose, onLoginSuccess, onOpenRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor completa todos los campos.');
      return;
    }

    setIsLoading(true);
    try {
      const { user, error } = await authService.signIn({ email, password });

      if (user) {
        onLoginSuccess && onLoginSuccess(user);
        onClose();
      } else {
        setErrorMessage(error?.message || 'No se pudo iniciar sesión. Verifica tus credenciales.');
      }
    } catch (err) {
      setErrorMessage('Ocurrió un error al verificar tus credenciales en Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseDemoAccount = () => {
    const demoUser = {
      name: 'Usuario Demo',
      email: 'demo@nimbox.com',
      password: 'Password123!',
      plan: 'Pro',
      planId: 2,
      storageQuota: '500 GB',
      billingCycle: 'monthly',
      transactionId: 'NMB-DEMO99'
    };

    setEmail(demoUser.email);
    setPassword(demoUser.password);
    setErrorMessage('');

    // Ensure demo user is in storage
    try {
      const registeredUsers = JSON.parse(localStorage.getItem('nimbox_registered_users') || '[]');
      if (!registeredUsers.some(u => u.email === demoUser.email)) {
        registeredUsers.push(demoUser);
        localStorage.setItem('nimbox_registered_users', JSON.stringify(registeredUsers));
      }
    } catch (e) {}
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
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
          background: '#ffffff',
          width: '100%',
          maxWidth: '460px',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <LogIn size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Iniciar Sesión
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Accede a tu almacenamiento Nimbox
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
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
          {/* Quick Demo Credentials Autofill */}
          <button
            type="button"
            onClick={handleUseDemoAccount}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--primary-light)',
              border: '1px dashed var(--primary)',
              borderRadius: '10px',
              color: 'var(--primary)',
              fontSize: '0.825rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '1.25rem'
            }}
          >
            <Sparkles size={15} /> Probar con cuenta de demostración
          </button>

          {errorMessage && (
            <div
              style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                padding: '10px 12px',
                borderRadius: '10px',
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

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Email */}
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
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  required
                />
                <Mail size={16} color="var(--text-light)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                  Contraseña
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>
                  ¿Olvidaste tu contraseña?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tu contraseña registrada"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 36px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  required
                />
                <Lock size={16} color="var(--text-light)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-light)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe" style={{ fontSize: '0.825rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                Recordar mi sesión en este dispositivo
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                marginTop: '6px',
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> Validando...
                </>
              ) : (
                <>
                  Entrar a mi Cuenta <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            ¿No tienes una cuenta aún?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRegister && onOpenRegister();
              }}
              style={{ color: 'var(--primary)', fontWeight: 700 }}
            >
              Simula tu pago y regístrate aquí
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
