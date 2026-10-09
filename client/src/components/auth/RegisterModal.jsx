import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Eye, EyeOff, Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService.js';

export const RegisterModal = ({ isOpen, onClose, onRegisterSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  
  const [errors, setErrors] = useState({});
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setSecurityQuestion('');
      setSecurityAnswer('');
      setAgreeTerms(true);
      setErrors({});
      setIsRegistering(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAutofillTestData = () => {
    setFullName('Carlos Mendoza');
    setEmail('carlos.mendoza@nimbox.com');
    setPassword('Nimbox2026!');
    setConfirmPassword('Nimbox2026!');
    setSecurityQuestion('mascota');
    setSecurityAnswer('Firulais');
    setErrors({});
  };

  // Función para evaluar la fortaleza de la contraseña
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Vacía', color: 'var(--border-color)' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Débil', color: '#ef4444' };
    if (score === 2) return { score: 2, label: 'Aceptable', color: '#f59e0b' };
    if (score === 3) return { score: 3, label: 'Fuerte', color: '#3b82f6' };
    return { score: 4, label: 'Muy Segura', color: '#10b981' };
  };

  const passwordStrength = getPasswordStrength(password);

  const validateForm = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = 'Ingresa tu nombre completo';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) errs.email = 'Ingresa un correo válido';
    if (!password || password.length < 6) errs.password = 'Mínimo 6 caracteres';
    if (password !== confirmPassword) errs.confirmPassword = 'Las contraseñas no coinciden';
    if (!securityQuestion) errs.securityQuestion = 'Selecciona una pregunta de seguridad';
    if (!securityAnswer.trim()) errs.securityAnswer = 'Ingresa una respuesta';
    if (!agreeTerms) errs.agreeTerms = 'Debes aceptar los términos y condiciones';
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsRegistering(true);
    setErrors({});

    try {
      const { user, error } = await authService.signUpBasic({
        email, 
        password, 
        name: fullName, 
        securityQuestion, 
        securityAnswer
      });

      if (error || !user) {
        setErrors({ general: error?.message || 'Error al registrar usuario.' });
        setIsRegistering(false);
        return;
      }
      
      if (onRegisterSuccess) {
        onRegisterSuccess(user);
      }
      onClose();
    } catch (err) {
      setErrors({ general: 'Error inesperado durante el registro.' });
      setIsRegistering(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '500px', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-modal)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Crear Cuenta</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Únete a Nimbox hoy</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.75rem', overflowY: 'auto', maxHeight: '75vh' }}>
          
          <button type="button" onClick={handleAutofillTestData} style={{ width: '100%', padding: '8px', marginBottom: '15px', background: 'var(--primary-light)', border: '1px dashed var(--primary)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <Sparkles size={15} /> Autocompletar datos de prueba
          </button>

          {errors.general && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <AlertCircle size={16} /> <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px' }}>Nombre completo</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej. Juan Pérez" style={{ width: '100%', padding: '10px 12px', border: errors.fullName ? '1px solid var(--danger)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', outline: 'none' }} />
              {errors.fullName && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.fullName}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px' }}>Correo Electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" style={{ width: '100%', padding: '10px 12px', border: errors.email ? '1px solid var(--danger)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', outline: 'none' }} />
              {errors.email && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.email}</span>}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 600 }}>Contraseña</label>
                {password && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: passwordStrength.color }}>
                    Seguridad: {passwordStrength.label}
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '10px 35px 10px 12px', border: errors.password ? '1px solid var(--danger)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', outline: 'none' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Barra indicadora visual de contraseña */}
              {password && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  {[1, 2, 3, 4].map((level) => (
                    <div 
                      key={level} 
                      style={{ 
                        flex: 1, 
                        height: '4px', 
                        borderRadius: '2px', 
                        backgroundColor: passwordStrength.score >= level ? passwordStrength.color : 'var(--border-color)',
                        transition: 'background-color 0.2s ease'
                      }} 
                    />
                  ))}
                </div>
              )}
              {errors.password && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.password}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px' }}>Confirmar Contraseña</label>
              <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: errors.confirmPassword ? '1px solid var(--danger)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', outline: 'none' }} />
              {errors.confirmPassword && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.confirmPassword}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px' }}>Pregunta de Seguridad</label>
              <select value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: errors.securityQuestion ? '1px solid var(--danger)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--bg-main)' }}>
                <option value="" disabled>Selecciona una opción...</option>
                <option value="mascota">¿Cuál fue el nombre de tu primera mascota?</option>
                <option value="ciudad">¿En qué ciudad naciste?</option>
                <option value="madre">¿Cuál es el segundo nombre de tu madre?</option>
                <option value="colegio">¿Cómo se llamaba tu primer colegio?</option>
              </select>
              {errors.securityQuestion && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.securityQuestion}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px' }}>Respuesta de Seguridad</label>
              <input type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="Tu respuesta secreta" style={{ width: '100%', padding: '10px 12px', border: errors.securityAnswer ? '1px solid var(--danger)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', outline: 'none' }} />
              {errors.securityAnswer && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.securityAnswer}</span>}
            </div>

            <div style={{ marginTop: '5px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                Acepto los términos de servicio y políticas de privacidad.
              </label>
              {errors.agreeTerms && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.agreeTerms}</span>}
            </div>

            <button type="submit" disabled={isRegistering} className="btn-primary" style={{ marginTop: '10px', width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 'bold', cursor: isRegistering ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              {isRegistering ? <><Loader2 size={18} className="spin" /> Creando cuenta...</> : <>Registrarme <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};