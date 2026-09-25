import React, { useState, useEffect } from 'react';
import { LandingPage } from './views/LandingPage.jsx';
import { DashboardView } from './views/DashboardView.jsx';
import { PaymentModal } from './components/payment/PaymentModal.jsx';
import { LoginModal } from './components/auth/LoginModal.jsx';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal.jsx';
import { Toast } from './components/Toast.jsx';

import { authService } from './services/authService.js';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'dashboard'
  
  // Payment Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

    // Login Modal State
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Global Toast Notification

  const [toast, setToast] = useState(null);

  const showNotification = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Check existing session in Supabase & localStorage on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch (e) {
        console.error('Error al cargar sesión de Supabase', e);
      }
    }
    loadSession();

    // Escuchar cambios de estado en Supabase Auth
    const { data: listener } = authService.onAuthStateChange((user) => {
      if (user) {
        setCurrentUser(user);
      }
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // Open Checkout Flow
  const handleOpenCheckout = (plan, cycle = 'monthly') => {
    setSelectedPlan(plan);
    setBillingCycle(cycle);
    setIsPaymentOpen(true);
  };

    // Open Login Flow
  const handleOpenLogin = () => {
    setIsLoginOpen(true);
    setIsForgotPasswordOpen(false);
  };

  const handleOpenForgotPassword = () => {
    setIsLoginOpen(false);
    setIsForgotPasswordOpen(true);
  };


  // Handle successful payment & registration
  const handlePaymentSuccess = (user) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
    showNotification(`¡Bienvenido a Nimbox, ${user.name}! Tu Plan ${user.plan} está activado en Supabase.`, 'success');
  };

  // Handle successful login
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
    showNotification(`¡Hola de nuevo, ${user.name}! Sesión iniciada correctamente.`, 'success');
    console.log('Usuario logueado:', user); // solo para observar en consola
  };

  // Handle logout
  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setCurrentView('landing');
    showNotification('Has cerrado sesión exitosamente.', 'info');
  };

  return (
    <div>
      {/* Active View: Landing or Dashboard */}
      {currentView === 'dashboard' && currentUser ? (
        <DashboardView
          currentUser={currentUser}
          onLogout={handleLogout}
          onNotification={showNotification}
        />
      ) : (
        <LandingPage
          onOpenCheckout={handleOpenCheckout}
          onOpenLogin={handleOpenLogin}
        />
      )}

      {/* Payment & Simulation Checkout Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        selectedPlan={selectedPlan}
        billingCycle={billingCycle}
        onPaymentSuccess={handlePaymentSuccess}
      />

            {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onForgotPassword={handleOpenForgotPassword}
        onOpenRegister={() => {
          setIsLoginOpen(false);
          handleOpenCheckout({
            id_plan: 2,
            nombre: 'Pro',
            descripcion: 'Para profesionales y pequeños equipos',
            precio: 12,
            precioAnual: 9.6,
            features: [
              '500 GB de almacenamiento',
              'Dispositivos ilimitados',
              'Compartir con permisos avanzados',
              'Soporte prioritario 24/7'
            ]
          }, 'monthly');
        }}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onBackToLogin={handleOpenLogin}
      />


      {/* Global Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
