import React, { useState, useEffect } from 'react';
import { LandingPage } from './views/LandingPage.jsx';
import { DashboardView } from './views/DashboardView.jsx';
import { PaymentModal } from './components/payment/PaymentModal.jsx';
import { LoginModal } from './components/auth/LoginModal.jsx';
import { Toast } from './components/Toast.jsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'dashboard'
  
  // Payment Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Login Modal State
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Global Toast Notification
  const [toast, setToast] = useState(null);

  const showNotification = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Check existing session in localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('nimbox_current_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        // Optional: you can start on dashboard or keep on landing
        // setCurrentView('dashboard');
      }
    } catch (e) {
      console.error('Error loading session', e);
    }
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
  };

  // Handle successful payment & registration
  const handlePaymentSuccess = (user) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
    showNotification(`¡Bienvenido a Nimbox, ${user.name}! Tu Plan ${user.plan} está activado.`, 'success');
  };

  // Handle successful login
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
    showNotification(`¡Hola de nuevo, ${user.name}! Sesión iniciada correctamente.`, 'success');
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('nimbox_current_user');
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

      {/* Global Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
