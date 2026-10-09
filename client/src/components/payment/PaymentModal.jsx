import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, CreditCard, Lock, Sparkles, CheckCircle2, Layers, Loader2 } from 'lucide-react';
import { plansService } from '../../services/plansService.js';

const DEFAULT_PLANS = [
  { id_plan: '1', nombre: 'Básico', precio: 5, precioAnual: 4.0, storageQuota: '10 GB' },
  { id_plan: '2', nombre: 'Pro', precio: 12, precioAnual: 9.6, storageQuota: '500 GB' },
  { id_plan: '3', nombre: 'Empresarial', precio: 49, precioAnual: 39.2, storageQuota: 'Ilimitado' }
];

export const PaymentModal = ({ isOpen, onClose, user, selectedPlan, billingCycle = 'monthly', onPaymentSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1 = Tarjeta, 2 = Procesando, 3 = Éxito
  
  const [activePlan, setActivePlan] = useState(selectedPlan || DEFAULT_PLANS[1]);
  const [activeBillingCycle, setActiveBillingCycle] = useState(billingCycle || 'monthly');

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const handleExpiryChange = (e) => {
    let text = e.target.value.replace(/\D/g, '');
    if (text.length >= 3) {
      text = text.slice(0, 2) + '/' + text.slice(2, 4);
    }
    setCardExpiry(text);
  };
  const [errors, setErrors] = useState({});
  const [processingStatus, setProcessingStatus] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrors({});
      if (selectedPlan) setActivePlan(selectedPlan);
      if (billingCycle) setActiveBillingCycle(billingCycle);
      if (user?.name) setCardName(user.name); // Auto-llena el nombre del usuario logueado
    }
  }, [isOpen, selectedPlan, billingCycle, user]);

  if (!isOpen) return null;

  const isAnnual = activeBillingCycle === 'annual';
  const monthlyPrice = isAnnual ? activePlan.precioAnual : activePlan.precio;
  const billedTotal = isAnnual ? (monthlyPrice * 12).toFixed(2) : monthlyPrice.toFixed(2);

  const handleAutofill = () => {
    setCardName(user?.name || 'Carlos Mendoza');
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('12/28');
    setCardCvc('884');
    setErrors({});
  };

  const validatePayment = () => {
    const errs = {};
    if (!cardName.trim()) errs.cardName = 'Ingresa el titular';
    if (cardNumber.replace(/\s/g, '').length < 15) errs.cardNumber = 'Tarjeta inválida';
    if (!cardExpiry || cardExpiry.length < 5) errs.cardExpiry = 'Fecha inválida';
    if (!cardCvc || cardCvc.length < 3) errs.cardCvc = 'CVC requerido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProcessPayment = () => {
    if (!validatePayment()) return;
    
    if (!user) {
      alert("Error: No hay usuario autenticado.");
      return;
    }

    setCurrentStep(2);
    setProcessingStatus('Conectando con el banco...');

    // Simulamos el proceso de pago
    setTimeout(() => setProcessingStatus('Autorizando tarjeta...'), 1000);
    setTimeout(() => setProcessingStatus('¡Pago aprobado!'), 2000);

    setTimeout(async () => {
      try {
        const cardLast4 = cardNumber.replace(/\s/g, '').slice(-4) || '4242';
        // Aquí llamas a tu servicio real si lo tienes
        await plansService.createSubscription({
          userId: user.id,
          planId: activePlan.id_plan,
          planName: activePlan.nombre,
          billingCycle: activeBillingCycle,
          amountPaid: billedTotal,
          cardLast4: cardLast4
        });
        setCurrentStep(3);
      } catch (err) {
        setCurrentStep(3); // Para la demo, forzamos el éxito
      }
    }, 2500);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '550px', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-modal)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Checkout Seguro</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Estás contratando el Plan {activePlan.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {currentStep === 1 && (
          <div style={{ padding: '1.75rem' }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block' }}>Plan {activePlan.nombre} ({isAnnual ? 'Anual' : 'Mensual'})</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{activePlan.storageQuota} de almacenamiento</span>
              </div>
              <h2 style={{ margin: 0 }}>${billedTotal}</h2>
            </div>

            <button type="button" onClick={handleAutofill} style={{ width: '100%', padding: '8px', marginBottom: '15px', background: 'var(--primary-light)', border: '1px dashed var(--primary)', color: 'var(--primary)', cursor: 'pointer', borderRadius: '4px' }}><Sparkles size={15}/> Autocompletar Tarjeta de Prueba</button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Titular de la tarjeta</label>
                <input type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}/>
                {errors.cardName && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.cardName}</span>}
              </div>
              
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Número de tarjeta</label>
                <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '))} maxLength={19} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}/>
                {errors.cardNumber && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.cardNumber}</span>}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>MM/AA</label>
                  <input type="text" value={cardExpiry} onChange={handleExpiryChange} placeholder="MM/AAAA" maxLength={5} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}/>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>CVC</label>
                  <input type="text" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} placeholder="123" maxLength={4} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}/>
                </div>
              </div>

              <button onClick={handleProcessPayment} style={{ padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', marginTop: '10px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                Pagar ${billedTotal} <Lock size={15}/>
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 15px' }} />
            <h3 style={{ margin: 0 }}>Procesando Pago</h3>
            <p style={{ color: 'var(--text-muted)' }}>{processingStatus}</p>
          </div>
        )}

        {currentStep === 3 && (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <CheckCircle2 size={50} color="var(--success, green)" style={{ margin: '0 auto 15px' }} />
            <h2 style={{ margin: 0 }}>¡Pago Exitoso!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Tu cuenta ha sido actualizada al Plan {activePlan.nombre}.</p>
            <button onClick={() => { onClose(); onPaymentSuccess({ plan: activePlan.nombre, storageQuota: activePlan.storageQuota }); }} style={{ padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Ir a mi Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};