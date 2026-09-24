import React, { useState, useEffect } from 'react';
import { 
  X, Check, ShieldCheck, CreditCard, Lock, ArrowRight, ArrowLeft, 
  Sparkles, CheckCircle2, Copy, Download, RefreshCw, Eye, EyeOff, AlertCircle, Calendar, Hash
} from 'lucide-react';
import { authService } from '../../services/authService.js';
import { plansService } from '../../services/plansService.js';

export const PaymentModal = ({ isOpen, onClose, selectedPlan, billingCycle = 'monthly', onPaymentSuccess }) => {
  // Steps: 1 = Payment Details, 2 = Account Credentials, 3 = Processing, 4 = Success Receipt
  const [currentStep, setCurrentStep] = useState(1);
  
  // Payment Form State
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'paypal'
  
  // Account Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Errors & Validation State
  const [errors, setErrors] = useState({});

  // Processing Animation State
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatusText, setProcessingStatusText] = useState('Iniciando conexión segura...');
  
  // Transaction Result Details
  const [transactionId, setTransactionId] = useState('');
  const [transactionDate, setTransactionDate] = useState('');

  // Default fallback plan if none passed
  const plan = selectedPlan || {
    id_plan: 2,
    nombre: 'Pro',
    descripcion: 'Para profesionales y pequeños equipos',
    precio: 12,
    precioAnual: 9.6,
    features: ['500 GB de almacenamiento', 'Dispositivos ilimitados', 'Soporte prioritario 24/7']
  };

  const isAnnual = billingCycle === 'annual';
  const monthlyPrice = isAnnual ? (plan.precioAnual || plan.precio * 0.8) : plan.precio;
  const billedTotal = isAnnual ? (monthlyPrice * 12).toFixed(2) : monthlyPrice.toFixed(2);

  // Reset form when modal is reopened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrors({});
      setProcessingProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format Card Number (with spaces every 4 digits)
  const handleCardNumberChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = rawVal.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
    if (errors.cardNumber) setErrors(prev => ({ ...prev, cardNumber: null }));
  };

  // Format Expiry Date (MM/YY)
  const handleExpiryChange = (e) => {
    let rawVal = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (rawVal.length >= 3) {
      rawVal = `${rawVal.slice(0, 2)}/${rawVal.slice(2)}`;
    }
    setCardExpiry(rawVal);
    if (errors.cardExpiry) setErrors(prev => ({ ...prev, cardExpiry: null }));
  };

  // Format CVC
  const handleCvcChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvc(rawVal);
    if (errors.cardCvc) setErrors(prev => ({ ...prev, cardCvc: null }));
  };

  // Quick Autofill Test Data
  const handleAutofillTestData = () => {
    setCardName('Carlos Mendoza');
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('12/28');
    setCardCvc('884');
    setFullName('Carlos Mendoza');
    if (!email) setEmail('carlos.mendoza@nimbox.com');
    if (!password) setPassword('Nimbox2026!');
    if (!confirmPassword) setConfirmPassword('Nimbox2026!');
    setErrors({});
  };

  // Calculate Password Strength
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Vacía', color: 'var(--border-color)' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Débil', color: 'var(--danger)' };
    if (score === 2) return { score: 2, label: 'Aceptable', color: 'var(--warning)' };
    if (score === 3) return { score: 3, label: 'Fuerte', color: 'var(--accent-cyan)' };
    return { score: 4, label: 'Muy Segura', color: 'var(--success)' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Validate Step 1 (Payment)
  const validateStep1 = () => {
    const errs = {};
    if (paymentMethod === 'card') {
      if (!cardName.trim()) errs.cardName = 'Ingresa el nombre del titular';
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 15) errs.cardNumber = 'Ingresa un número de tarjeta válido (16 dígitos)';
      if (!cardExpiry || cardExpiry.length < 5) errs.cardExpiry = 'Fecha MM/AA inválida';
      if (!cardCvc || cardCvc.length < 3) errs.cardCvc = 'CVC requerido (3 dígitos)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Validate Step 2 (Account Details)
  const validateStep2 = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = 'Ingresa tu nombre completo';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      errs.email = 'Ingresa un correo electrónico válido';
    }

    if (!password || password.length < 6) {
      errs.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (!agreeTerms) {
      errs.agreeTerms = 'Debes aceptar los términos y condiciones';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Proceed to Step 2
  const handleProceedToAccount = () => {
    if (validateStep1()) {
      if (!fullName && cardName) {
        setFullName(cardName);
      }
      setCurrentStep(2);
    }
  };

  // Execute Simulated Payment & Processing
  const handleStartProcessing = () => {
    if (!validateStep2()) return;

    setCurrentStep(3);
    setProcessingProgress(15);
    setProcessingStatusText('Estableciendo conexión cifrada con el banco...');

    const tId = `NMB-${Math.floor(100000 + Math.random() * 900000)}`;
    const tDate = new Date().toLocaleDateString('es-ES', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    setTransactionId(tId);
    setTransactionDate(tDate);

    // Stage 1
    setTimeout(() => {
      setProcessingProgress(45);
      setProcessingStatusText('Validando fondos y autorización bancaria 3D-Secure...');
    }, 900);

    // Stage 2
    setTimeout(() => {
      setProcessingProgress(75);
      setProcessingStatusText('Cifrando credenciales y creando cuenta de usuario...');
    }, 1800);

    // Stage 3
    setTimeout(() => {
      setProcessingProgress(100);
      setProcessingStatusText('¡Aprovisionamiento de almacenamiento completado!');
    }, 2600);

    // Stage 4: Finish & Register User in Supabase & State / LocalStorage
    setTimeout(async () => {
      const cardLast4 = cardNumber.replace(/\s/g, '').slice(-4) || '4242';

      // 1. Registrar usuario en Supabase Auth y base de datos
      const { user: registeredUser } = await authService.signUp({
        email: email,
        password: password,
        name: fullName,
        plan: plan.nombre,
        planId: plan.id_plan,
        billingCycle: billingCycle,
        amountPaid: billedTotal,
        transactionId: tId,
        cardLast4: cardLast4
      });

      // 2. Registrar la suscripción en Supabase BD
      if (registeredUser) {
        await plansService.createSubscription({
          userId: registeredUser.id,
          planId: plan.id_plan,
          planName: plan.nombre,
          billingCycle: billingCycle,
          amountPaid: billedTotal,
          transactionId: tId,
          cardLast4: cardLast4
        });
      }

      setCurrentStep(4);
    }, 3200);
  };

  const handleFinishAndGoToDashboard = () => {
    const user = {
      name: fullName,
      email: email.toLowerCase().trim(),
      password: password,
      plan: plan.nombre,
      planId: plan.id_plan,
      storageQuota: plan.nombre.toLowerCase().includes('básico') ? '10 GB' : plan.nombre.toLowerCase().includes('pro') ? '500 GB' : 'Ilimitado',
      billingCycle: billingCycle,
      transactionId: transactionId
    };
    onPaymentSuccess && onPaymentSuccess(user);
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
      {/* Modal Container */}
      <div
        style={{
          background: 'var(--bg-card)',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-white)',
                boxShadow: 'var(--shadow-glow-primary)'
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Checkout Seguro Nimbox
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    background: 'var(--primary-light)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    letterSpacing: '0.02em'
                  }}
                >
                  SIMULACIÓN EN VIVO
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Cifrado SSL de 256 bits y protección contra fraude
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              background: 'var(--bg-body)',
              border: '1px solid var(--border-color)',
              transition: 'all 0.2s'
            }}
            aria-label="Cerrar ventana de pago"
          >
            <X size={18} />
          </button>
        </div>

        {/* Multi-step progress bar */}
        {currentStep <= 2 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 2rem',
              background: 'var(--bg-body)',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: currentStep === 1 ? 1 : 0.6 }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: 'var(--radius-full)',
                  background: currentStep >= 1 ? 'var(--primary)' : 'var(--border-color)',
                  color: 'var(--text-white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                1
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: currentStep === 1 ? 'var(--primary)' : 'var(--text-main)' }}>
                Datos de Pago
              </span>
            </div>

            <div style={{ flex: 1, height: '2px', background: 'var(--border-color)', margin: '0 12px' }}>
              <div
                style={{
                  width: currentStep === 2 ? '100%' : '0%',
                  height: '100%',
                  background: 'var(--primary)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: currentStep === 2 ? 1 : 0.6 }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: 'var(--radius-full)',
                  background: currentStep === 2 ? 'var(--primary)' : 'var(--border-color)',
                  color: currentStep === 2 ? 'var(--text-white)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                2
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: currentStep === 2 ? 'var(--primary)' : 'var(--text-muted)' }}>
                Crear Cuenta (Login)
              </span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: currentStep <= 2 ? 'grid' : 'flex',
            gridTemplateColumns: currentStep <= 2 ? '1fr 1.15fr' : '1fr',
            minHeight: '440px'
          }}
        >
          {/* LEFT COLUMN: Order Summary (Steps 1 & 2) */}
          {currentStep <= 2 && (
            <div
              style={{
                background: 'var(--bg-subtle)',
                padding: '1.75rem',
                borderRight: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                      Suscripción elegida
                    </span>
                    <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                      Plan {plan.nombre}
                    </h4>
                  </div>
                  <span
                    style={{
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    {isAnnual ? 'Facturación Anual' : 'Facturación Mensual'}
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.4 }}>
                  {plan.descripcion || 'Almacenamiento seguro en la nube con sincronización instantánea.'}
                </p>

                {/* Plan Highlights */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Beneficios incluidos:
                  </span>
                  <ul style={{ listStyle: 'none', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {plan.features?.slice(0, 4).map((feat, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', color: 'var(--text-strong)' }}>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--success-bg)',
                            color: 'var(--success-hover)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Check size={11} />
                        </div>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Price Breakdown */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>Subtotal {isAnnual ? '(12 meses)' : '(1 mes)'}</span>
                    <span>${(plan.precio * (isAnnual ? 12 : 1)).toFixed(2)} USD</span>
                  </div>

                  {isAnnual && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--success-hover)', fontWeight: 600 }}>
                      <span>Descuento anual (20%)</span>
                      <span>-${((plan.precio * 12) - parseFloat(billedTotal)).toFixed(2)} USD</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>Impuestos estimados</span>
                    <span>$0.00 USD</span>
                  </div>

                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Total a pagar</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)' }}>
                        ${billedTotal}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>USD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust footer in left column */}
              <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <Lock size={14} color="var(--success)" />
                <span>Garantía de reembolso de 14 días sin preguntas.</span>
              </div>
            </div>
          )}

          {/* RIGHT COLUMN: STEP 1 - PAYMENT DETAILS & INTERACTIVE CARD */}
          {currentStep === 1 && (
            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Method Selector */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: paymentMethod === 'card' ? 'var(--primary-light)' : 'var(--bg-body)',
                      color: paymentMethod === 'card' ? 'var(--primary)' : 'var(--text-muted)',
                      border: paymentMethod === 'card' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)'
                    }}
                  >
                    <CreditCard size={16} /> Tarjeta Débito/Crédito
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paypal')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: paymentMethod === 'paypal' ? 'var(--warning-bg)' : 'var(--bg-body)',
                      color: paymentMethod === 'paypal' ? 'var(--warning-strong)' : 'var(--text-muted)',
                      border: paymentMethod === 'paypal' ? '1.5px solid var(--warning)' : '1px solid var(--border-color)'
                    }}
                  >
                    🅿️ PayPal (Simulado)
                  </button>
                </div>

                {/* Quick Autofill Test Data Button */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={handleAutofillTestData}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--primary-light)',
                      border: '1px dashed var(--primary)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--primary)',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Sparkles size={15} /> Autocompletar datos de tarjeta para pruebas
                  </button>
                </div>

                {/* Virtual Credit Card Preview */}
                <div
                  style={{
                    background: 'var(--bg-card-dark)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    color: 'var(--text-white)',
                    boxShadow: 'var(--shadow-lg)',
                    marginBottom: '1.25rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: '-20px',
                      top: '-20px',
                      width: '120px',
                      height: '120px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--white-alpha-10)',
                      pointerEvents: 'none'
                    }}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '28px', height: '20px', borderRadius: 'var(--radius-xs)', background: 'var(--gold-gradient)' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', opacity: 0.8 }}>NIMBOX PAY</span>
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, fontStyle: 'italic', letterSpacing: '1px' }}>
                      VISA
                    </span>
                  </div>

                  <div style={{ fontSize: '1.15rem', fontWeight: 600, letterSpacing: '2px', fontFamily: 'monospace', marginBottom: '1rem' }}>
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.75rem' }}>
                    <div>
                      <div style={{ opacity: 0.7, textTransform: 'uppercase', fontSize: '0.65rem' }}>Titular</div>
                      <div style={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cardName || 'NOMBRE APELLIDO'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ opacity: 0.7, textTransform: 'uppercase', fontSize: '0.65rem' }}>Expira</div>
                      <div style={{ fontWeight: 600, letterSpacing: '1px' }}>
                        {cardExpiry || 'MM/AA'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Cardholder Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '4px' }}>
                      Nombre en la tarjeta
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Carlos Mendoza"
                      value={cardName}
                      onChange={(e) => {
                        setCardName(e.target.value);
                        if (errors.cardName) setErrors(prev => ({ ...prev, cardName: null }));
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: errors.cardName ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                    {errors.cardName && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '2px', display: 'block' }}>{errors.cardName}</span>}
                  </div>

                  {/* Card Number */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '4px' }}>
                      Número de tarjeta
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        style={{
                          width: '100%',
                          padding: '9px 12px 9px 36px',
                          borderRadius: 'var(--radius-sm)',
                          border: errors.cardNumber ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                          fontSize: '0.875rem',
                          fontFamily: 'monospace',
                          outline: 'none'
                        }}
                      />
                      <CreditCard size={16} color="var(--text-light)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    {errors.cardNumber && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '2px', display: 'block' }}>{errors.cardNumber}</span>}
                  </div>

                  {/* Expiry & CVC Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '4px' }}>
                        Fecha de expiración
                      </label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: errors.cardExpiry ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                          fontSize: '0.875rem',
                          textAlign: 'center',
                          outline: 'none'
                        }}
                      />
                      {errors.cardExpiry && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '2px', display: 'block' }}>{errors.cardExpiry}</span>}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '4px' }}>
                        Código CVC
                      </label>
                      <input
                        type="password"
                        placeholder="123"
                        value={cardCvc}
                        onChange={handleCvcChange}
                        maxLength={4}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: errors.cardCvc ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                          fontSize: '0.875rem',
                          textAlign: 'center',
                          outline: 'none'
                        }}
                      />
                      {errors.cardCvc && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '2px', display: 'block' }}>{errors.cardCvc}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Button */}
              <div style={{ marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={handleProceedToAccount}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
                >
                  Continuar al Registro de Cuenta <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* RIGHT COLUMN: STEP 2 - ACCOUNT CREDENTIALS FOR LOGIN */}
          {currentStep === 2 && (
            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Crea tu cuenta de acceso
                  </h4>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Con este correo y contraseña podrás iniciar sesión en tu panel de almacenamiento Nimbox.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Full Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '4px' }}>
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Carlos Mendoza"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errors.fullName) setErrors(prev => ({ ...prev, fullName: null }));
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: errors.fullName ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                    {errors.fullName && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '2px', display: 'block' }}>{errors.fullName}</span>}
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '4px' }}>
                      Correo Electrónico (para Login)
                    </label>
                    <input
                      type="email"
                      placeholder="tunombre@empresa.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors(prev => ({ ...prev, email: null }));
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: errors.email ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                    {errors.email && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '2px', display: 'block' }}>{errors.email}</span>}
                  </div>

                  {/* Password with Eye toggle */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                        Crear Contraseña
                      </label>
                      {password && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: passwordStrength.color }}>
                          Seguridad: {passwordStrength.label}
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors(prev => ({ ...prev, password: null }));
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 38px 9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: errors.password ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                          fontSize: '0.875rem',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
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

                    {/* Strength Bar */}
                    {password && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            style={{
                              flex: 1,
                              height: '4px',
                              borderRadius: '2px',
                              background: passwordStrength.score >= step ? passwordStrength.color : 'var(--border-color)',
                              transition: 'all 0.2s'
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {errors.password && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '2px', display: 'block' }}>{errors.password}</span>}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '4px' }}>
                      Confirmar Contraseña
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repite tu contraseña"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: null }));
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: errors.confirmPassword ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                    {errors.confirmPassword && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '2px', display: 'block' }}>{errors.confirmPassword}</span>}
                  </div>

                  {/* Terms Checkbox */}
                  <div style={{ marginTop: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        style={{ marginTop: '3px' }}
                      />
                      <span>Acepto los términos de servicio, política de privacidad y autorizo el cobro simulado.</span>
                    </label>
                    {errors.agreeTerms && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '2px', display: 'block' }}>{errors.agreeTerms}</span>}
                  </div>
                </div>
              </div>

              {/* Bottom Buttons for Step 2 */}
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-body)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ArrowLeft size={16} /> Volver
                </button>
                <button
                  type="button"
                  onClick={handleStartProcessing}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.85rem', fontSize: '0.95rem' }}
                >
                  Confirmar y Pagar ${billedTotal} <Lock size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 - PROCESSING SIMULATION SCREEN */}
          {currentStep === 3 && (
            <div
              style={{
                width: '100%',
                padding: '4rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}
            >
              {/* Spinner & Shield */}
              <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '2rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'var(--radius-full)',
                    border: '4px solid var(--primary-light)',
                    borderTopColor: 'var(--primary)',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: '12px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-white)'
                  }}
                >
                  <Lock size={28} />
                </div>
              </div>

              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                Procesando Pago Seguro
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '2rem' }}>
                {processingStatusText}
              </p>

              {/* Progress Bar */}
              <div style={{ width: '100%', maxWidth: '380px', height: '8px', background: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${processingProgress}%`,
                    height: '100%',
                    background: 'var(--primary-gradient)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

              <span style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-light)' }}>
                {processingProgress}% completado
              </span>
            </div>
          )}

          {/* STEP 4 - SUCCESS & DIGITAL RECEIPT */}
          {currentStep === 4 && (
            <div
              style={{
                width: '100%',
                padding: '2.5rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--success-bg)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                  boxShadow: 'var(--shadow-glow-success)'
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                ¡Pago Exitoso y Cuenta Creada!
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '460px', marginBottom: '1.75rem' }}>
                Tu suscripción al <strong>Plan {plan.nombre}</strong> ha sido activada y tus credenciales de acceso fueron registradas correctamente.
              </p>

              {/* Digital Invoice Ticket */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '520px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  textAlign: 'left',
                  marginBottom: '2rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ID Transacción</span>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                      {transactionId}
                    </div>
                  </div>
                  <span style={{ background: 'var(--success-bg)', color: 'var(--success-hover)', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                    PAGADO
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Titular & Cuenta</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{email}</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Plan & Almacenamiento</span>
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>Plan {plan.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {plan.nombre.toLowerCase().includes('básico') ? '10 GB' : plan.nombre.toLowerCase().includes('pro') ? '500 GB' : 'Ilimitado'} en la nube
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Método de Pago</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      Visa •••• {cardNumber.replace(/\s/g, '').slice(-4) || '4242'}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Monto Cobrado</span>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                      ${billedTotal} USD <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>({isAnnual ? 'Anual' : 'Mensual'})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '520px' }}>
                <button
                  type="button"
                  onClick={handleFinishAndGoToDashboard}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.9rem', fontSize: '1rem', justifyContent: 'center' }}
                >
                  🚀 Ir a mi Almacenamiento en la Nube
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
