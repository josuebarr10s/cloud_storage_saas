import React, { useState, useEffect } from 'react';
import { LandingPage } from './views/LandingPage.jsx';
import { DashboardView } from './views/DashboardView.jsx';

import { RegisterModal } from './components/auth/RegisterModal.jsx';
import { PaymentModal } from './components/payment/PaymentModal.jsx';
import { LoginModal } from './components/auth/LoginModal.jsx';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal.jsx';
import { Toast } from './components/Toast.jsx';

import { authService } from './services/authService.js';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('landing'); 
  
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showNotification = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function loadSession() {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        // Regla de oro: Si el plan es 'Ninguno', se queda en la Landing
        setCurrentView(user.plan === 'Ninguno' ? 'landing' : 'dashboard');
      }
    }
    loadSession();

    const { data: listener } = authService.onAuthStateChange(async (user) => {
      if (user) {
        setCurrentUser(user);
        setCurrentView(user.plan === 'Ninguno' ? 'landing' : 'dashboard');
      } else {
        setCurrentUser(null);
        setCurrentView('landing');
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleOpenLogin = () => { setIsRegisterOpen(false); setIsForgotPasswordOpen(false); setIsLoginOpen(true); };
  const handleOpenRegister = () => { setIsLoginOpen(false); setIsPaymentOpen(false); setIsRegisterOpen(true); };
  const handleOpenForgotPassword = () => { setIsLoginOpen(false); setIsForgotPasswordOpen(true); };

  const handleOpenCheckout = (plan, cycle = 'monthly') => {
    if (!currentUser) {
      showNotification('Primero debes crear una cuenta para contratar un plan.', 'info');
      handleOpenRegister();
      return;
    }
    setSelectedPlan(plan);
    setBillingCycle(cycle);
    setIsPaymentOpen(true);
  };

  const handleRegisterSuccess = (user) => {
    setCurrentUser(user);
    setCurrentView('landing'); // Te deja clavado en la Landing
    setIsRegisterOpen(false); // Cierra el modal de registro automáticamente
    showNotification(`¡Cuenta creada! Elige un plan abajo para continuar.`, 'success');
  };

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    setIsLoginOpen(false);
    setCurrentView(user.plan === 'Ninguno' ? 'landing' : 'dashboard');
    
    if (user.plan !== 'Ninguno') showNotification(`¡Hola de nuevo, ${user.name}!`, 'success');
    else showNotification(`Bienvenido. Selecciona un plan para continuar.`, 'info');
  };

  const handlePaymentSuccess = (planData) => {
    const updatedUser = { ...currentUser, plan: planData.plan, storageQuota: planData.storageQuota };
    setCurrentUser(updatedUser);
    setCurrentView('dashboard'); // Entras al fin al dashboard
    showNotification(`¡Pago exitoso! Plan ${planData.plan} activado.`, 'success');
  };

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setCurrentView('landing');
    showNotification('Has cerrado sesión.', 'info');
  };

  return (
    <div>
      {/* Muestra Dashboard SOLO si la vista está en 'dashboard' */}
      {currentView === 'dashboard' && currentUser ? (
        <DashboardView currentUser={currentUser} onLogout={handleLogout} onNotification={showNotification} />
      ) : (
        <LandingPage onOpenCheckout={handleOpenCheckout} onOpenLogin={handleOpenLogin} currentUser={currentUser} />
      )}

      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} onRegisterSuccess={handleRegisterSuccess} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLoginSuccess={handleLoginSuccess} onForgotPassword={handleOpenForgotPassword} onOpenRegister={handleOpenRegister} />
      <ForgotPasswordModal isOpen={isForgotPasswordOpen} onClose={() => setIsForgotPasswordOpen(false)} onBackToLogin={handleOpenLogin} />
      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} user={currentUser} selectedPlan={selectedPlan} billingCycle={billingCycle} onPaymentSuccess={handlePaymentSuccess} />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}