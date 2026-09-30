import React, { useState, useEffect } from 'react';
import { 
  X, Check, ShieldCheck, CreditCard, Lock, ArrowRight, ArrowLeft, 
  Sparkles, CheckCircle2, Copy, Download, RefreshCw, Eye, EyeOff, AlertCircle, Calendar, Hash, User, Mail, Zap, Layers
} from 'lucide-react';
import { authService } from '../../services/authService.js';
import { plansService } from '../../services/plansService.js';

const DEFAULT_PLANS = [
  {
    id_plan: '11111111-1111-1111-1111-111111111111',
    nombre: 'Básico',
    descripcion: 'Para uso personal y organización esencial',
    precio: 5,
    precioAnual: 4.0,
    storageQuota: '10 GB',
    popular: false,
    badge: 'Económico',
    features: [
      '10 GB de almacenamiento seguro',
      'Acceso desde 2 dispositivos',
      'Compartir por enlace',
      'Soporte por email',
      'Historial de versiones (7 días)'
    ]
  },
  {
    id_plan: '22222222-2222-2222-2222-222222222222',
    nombre: 'Pro',
    descripcion: 'Para profesionales y pequeños equipos',
    precio: 12,
    precioAnual: 9.6,
    storageQuota: '500 GB',
    popular: true,
    badge: 'Recomendado',
    features: [
      '500 GB de almacenamiento en la nube',
      'Dispositivos ilimitados',
      'Compartir con permisos avanzados',
      'Soporte prioritario 24/7',
      'Historial de versiones 30 días'
    ]
  },
  {
    id_plan: '33333333-3333-3333-3333-333333333333',
    nombre: 'Empresarial',
    descripcion: 'Para organizaciones con máxima exigencia',
    precio: 49,
    precioAnual: 39.2,
    storageQuota: 'Ilimitado',
    popular: false,
    badge: 'Máximo poder',
    features: [
      'Almacenamiento Ilimitado',
      'SSO y control de acceso',
      'SLA garantizado 99.99%',
      'Soporte dedicado 24/7',
      'Historial de versiones ilimitado'
    ]
  }
];

export const PaymentModal = ({ isOpen, onClose, selectedPlan, billingCycle = 'monthly', onPaymentSuccess }) => {
  // Steps: 1 = Account Credentials, 2 = Payment Details, 3 = Processing, 4 = Success Receipt
  const [currentStep, setCurrentStep] = useState(1);
  
  // Plans & Billing State (Left Column)
  const [availablePlans, setAvailablePlans] = useState(DEFAULT_PLANS);
  const [activePlan, setActivePlan] = useState(selectedPlan || DEFAULT_PLANS[1]);
  const [activeBillingCycle, setActiveBillingCycle] = useState(billingCycle || 'monthly');

  // Account Form State (Step 1 - Right Column)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Payment Form State (Step 2 - Right Column)
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'paypal'

  // Errors & Validation State
  const [errors, setErrors] = useState({});

  // Processing Animation State
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatusText, setProcessingStatusText] = useState('Iniciando conexión segura...');
  
  // Transaction Result Details
  const [transactionId, setTransactionId] = useState('');
  const [transactionDate, setTransactionDate] = useState('');

  // Load plans from Supabase if available
  useEffect(() => {
    async function loadPlans() {
      try {
        const dbPlans = await plansService.getPlans();
        if (dbPlans && dbPlans.length > 0) {
          setAvailablePlans(dbPlans);
        }
      } catch (e) {
        console.warn('Usando planes locales en PaymentModal');
      }
    }
    loadPlans();
  }, []);

  // Update selected plan and cycle when props change
  useEffect(() => {
    if (selectedPlan) {
      setActivePlan(selectedPlan);
    } else {
      setActivePlan(availablePlans[1] || availablePlans[0] || DEFAULT_PLANS[1]);
    }
    if (billingCycle) {
      setActiveBillingCycle(billingCycle);
    }
  }, [selectedPlan, billingCycle, availablePlans]);

  // Reset form when modal is reopened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrors({});
      setProcessingProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const plan = activePlan || DEFAULT_PLANS[1];
  const isAnnual = activeBillingCycle === 'annual';
  const monthlyPrice = isAnnual ? (plan.precioAnual || plan.precio * 0.8) : plan.precio;
  const billedTotal = isAnnual ? (monthlyPrice * 12).toFixed(2) : monthlyPrice.toFixed(2);
  const quotaDisplay = plan.storageQuota || (plan.nombre?.toLowerCase().includes('básico') ? '10 GB' : plan.nombre?.toLowerCase().includes('pro') ? '500 GB' : 'Ilimitado');

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
    const defaultName = 'Carlos Mendoza';
    setFullName(defaultName);
    setEmail('carlos.mendoza@nimbox.com');
    setPassword('Nimbox2026!');
    setConfirmPassword('Nimbox2026!');
    setCardName(defaultName);
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('12/28');
    setCardCvc('884');
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

  // Validate Step 1 (Account Details: Name, Email, Password)
  const validateStep1 = () => {
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

  // Validate Step 2 (Payment Method & Card)
  const validateStep2 = () => {
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

  // Proceed to Step 2 (Payment)
  const handleProceedToPayment = () => {
    if (validateStep1()) {
      if (!cardName && fullName) {
        setCardName(fullName);
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
      const { user: registeredUser, error: signUpError } = await authService.signUp({
        email: email,
        password: password,
        name: fullName,
        plan: plan.nombre,
        planId: plan.id_plan,
        billingCycle: activeBillingCycle,
        amountPaid: billedTotal,
        transactionId: tId,
        cardLast4: cardLast4
      });

      if (signUpError || !registeredUser) {
        setCurrentStep(1); // Volver al paso 1 si el correo ya existe o hay error de credenciales
        setErrors({ email: signUpError?.message || 'Error al registrar el usuario en Supabase.' });
        return;
      }

      // 2. Registrar la suscripción en Supabase BD
      await plansService.createSubscription({
        userId: registeredUser.id,
        planId: plan.id_plan,
        planName: plan.nombre,
        billingCycle: activeBillingCycle,
        amountPaid: billedTotal,
        transactionId: tId,
        cardLast4: cardLast4
      });

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
      storageQuota: quotaDisplay,
      billingCycle: activeBillingCycle,
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
          maxWidth: '960px',
          maxHeight: '94vh',
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
                  REGISTRO Y PAGO
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Cifrado SSL de 256 bits y aprovisionamiento seguro
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
              transition: 'all 0.2s',
              cursor: 'pointer'
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
            {/* Step 1: Account */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: currentStep === 1 ? 1 : 0.85 }}>
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
                1. Crear Cuenta (Login)
              </span>
            </div>

            {/* Progress line */}
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

            {/* Step 2: Payment */}
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
                2. Datos de Pago
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
            minHeight: '460px'
          }}
        >
          {/* LEFT COLUMN: SELECCIÓN DEL PLAN Y RESUMEN (Únicamente del lado izquierdo) */}
          {currentStep <= 2 && (
            <div
              style={{
                background: 'var(--bg-subtle)',
                padding: '1.75rem',
                borderRight: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div>
                {/* 1. PLAN SELECTOR BUTTONS */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Layers size={14} color="var(--primary)" /> Selecciona tu Plan:
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                      {quotaDisplay}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '6px',
                      background: 'var(--bg-card)',
                      padding: '4px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    {availablePlans.map((p) => {
                      const isSelected = (plan.id_plan === p.id_plan) || (plan.nombre?.toLowerCase() === p.nombre?.toLowerCase());
                      const priceVal = isAnnual ? (p.precioAnual || p.precio * 0.8) : p.precio;
                      return (
                        <button
                          key={p.id_plan || p.nombre}
                          type="button"
                          onClick={() => setActivePlan(p)}
                          style={{
                            padding: '10px 4px',
                            borderRadius: 'var(--radius-sm)',
                            border: isSelected ? '1.5px solid var(--primary)' : '1px solid transparent',
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            color: isSelected ? 'var(--text-white)' : 'var(--text-main)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                        >
                          <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 800 : 600 }}>
                            {p.nombre}
                          </span>
                          <span style={{ fontSize: '0.72rem', opacity: isSelected ? 0.95 : 0.75, fontWeight: 500 }}>
                            ${priceVal % 1 === 0 ? priceVal : priceVal.toFixed(1)}/m
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. BILLING CYCLE SWITCH (Monthly / Annual) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-card)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '1.25rem'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Ciclo de facturación:
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveBillingCycle('monthly')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-xs)',
                        border: 'none',
                        cursor: 'pointer',
                        background: activeBillingCycle === 'monthly' ? 'var(--primary-light)' : 'transparent',
                        color: activeBillingCycle === 'monthly' ? 'var(--primary)' : 'var(--text-muted)',
                        transition: 'all 0.15s'
                      }}
                    >
                      Mensual
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveBillingCycle('annual')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-xs)',
                        border: 'none',
                        cursor: 'pointer',
                        background: activeBillingCycle === 'annual' ? 'var(--primary-light)' : 'transparent',
                        color: activeBillingCycle === 'annual' ? 'var(--primary)' : 'var(--text-muted)',
                        transition: 'all 0.15s'
                      }}
                    >
                      Anual (-20%)
                    </button>
                  </div>
                </div>

                {/* 3. PLAN DETAILS & HIGHLIGHTS */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      Plan {plan.nombre} ({quotaDisplay})
                    </h4>
                    {plan.badge && (
                      <span
                        style={{
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)'
                        }}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    {plan.descripcion || 'Almacenamiento seguro en la nube con sincronización instantánea.'}
                  </p>
                </div>

                {/* Plan Features */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Beneficios incluidos:
                  </span>
                  <ul style={{ listStyle: 'none', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {plan.features?.slice(0, 4).map((feat, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-strong)' }}>
                        <div
                          style={{
                            width: '15px',
                            height: '15px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--success-bg)',
                            color: 'var(--success-hover)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Check size={10} />
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
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    <span>Subtotal {isAnnual ? '(12 meses)' : '(1 mes)'}</span>
                    <span>${(plan.precio * (isAnnual ? 12 : 1)).toFixed(2)} USD</span>
                  </div>

                  {isAnnual && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: 'var(--success-hover)', fontWeight: 600 }}>
                      <span>Descuento anual (20%)</span>
                      <span>-${((plan.precio * 12) - parseFloat(billedTotal)).toFixed(2)} USD</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    <span>Impuestos estimados</span>
                    <span>$0.00 USD</span>
                  </div>

                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Total a pagar</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                        ${billedTotal}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>USD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust footer in left column */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                <Lock size={13} color="var(--success)" />
                <span>Garantía de reembolso de 14 días sin preguntas.</span>
              </div>
            </div>
          )}

          {/* RIGHT COLUMN: STEP 1 - CORREO Y CONTRASEÑA (Lado derecho) */}
          {currentStep === 1 && (
            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                    Paso 1: Crea tu cuenta de acceso
                  </h4>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0 }}>
                    Ingresa tu correo y contraseña para registrar tu cuenta en Nimbox.
                  </p>
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
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                  >
                    <Sparkles size={15} /> Autocompletar datos de prueba
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
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
                          background: 'none',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer'
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
                      <span>Acepto los términos de servicio, política de privacidad y autorizo el proceso de suscripción.</span>
                    </label>
                    {errors.agreeTerms && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '2px', display: 'block' }}>{errors.agreeTerms}</span>}
                  </div>
                </div>
              </div>

              {/* Bottom Action Button for Step 1 */}
              <div style={{ marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', cursor: 'pointer' }}
                >
                  Continuar a Información de Pago <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* RIGHT COLUMN: STEP 2 - PAYMENT DETAILS & INTERACTIVE CARD (SECOND STEP) */}
          {currentStep === 2 && (
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
                      border: paymentMethod === 'card' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
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
                      border: paymentMethod === 'paypal' ? '1.5px solid var(--warning)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    🅿️ PayPal (Simulado)
                  </button>
                </div>

                {/* Quick Autofill Card Data Button */}
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
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
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
                        {cardName || fullName || 'NOMBRE APELLIDO'}
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
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={16} /> Volver
                </button>
                <button
                  type="button"
                  onClick={handleStartProcessing}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.85rem', fontSize: '0.95rem', cursor: 'pointer' }}
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
                      {quotaDisplay} en la nube
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
                  style={{ flex: 1, padding: '0.9rem', fontSize: '1rem', justifyContent: 'center', cursor: 'pointer' }}
                >
                   Ir a mi Almacenamiento en la Nube
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
