import React, { useState, useEffect, useRef } from 'react';
import { LandingPage } from './views/LandingPage.jsx';
import { DashboardView } from './views/DashboardView.jsx';
import { AdminDashboardView } from './views/AdminDashboardView.jsx';
import { SharedView } from './views/SharedView.jsx';

import { RegisterModal } from './components/auth/RegisterModal.jsx';
import { PaymentModal } from './components/payment/PaymentModal.jsx';
import { LoginModal } from './components/auth/LoginModal.jsx';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal.jsx';
import { ResetPasswordModal } from './components/auth/ResetPasswordModal.jsx';
import { Toast } from './components/Toast.jsx';

import { authService } from './services/authService.js';
import { takeShareTokenFromUrl, clearPendingShareToken } from './services/sharingService.js';
import { USER_ROLES } from './constants/roles.js';
import { PLAN_NAMES } from './constants/plans.js';

// El administrador siempre entra a su panel; un cliente entra al dashboard solo si ya tiene plan
const esAdmin = (user) => user?.rol === USER_ROLES.ADMIN_NAME;
// Si no se sabe el plan (undefined), se trata como "sin plan": nunca se entra al dashboard por defecto
const tienePlan = (user) => Boolean(user?.plan) && user.plan !== PLAN_NAMES.NONE;
const vistaPara = (user) => (esAdmin(user) || tienePlan(user)) ? 'dashboard' : 'landing';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('landing'); 
  
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  // Sube con cada pago para que el historial de pagos se recargue aunque el plan no cambie
  const [billingVersion, setBillingVersion] = useState(0);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Bandera persistente para asegurar que NUNCA se entre al dashboard durante la recuperación
  const isRecoveringRef = useRef(
    window.location.hash.includes('type=recovery') ||
    window.location.search.includes('type=recovery') ||
    sessionStorage.getItem('nimbox_is_recovering') === 'true'
  );

  if (isRecoveringRef.current) {
    sessionStorage.setItem('nimbox_is_recovering', 'true');
  }

  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(isRecoveringRef.current);
  // Enlace compartido pendiente (?share=TOKEN). Tiene prioridad sobre landing y dashboard mientras haya sesión.
  const [shareToken, setShareToken] = useState(() => takeShareTokenFromUrl());
  const [toast, setToast] = useState(null);

  const showNotification = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    // Si viene desde el enlace de recuperación, forzar vista landing y abrir modal
    if (isRecoveringRef.current) {
      setIsResetPasswordOpen(true);
      setIsLoginOpen(false);
      setIsForgotPasswordOpen(false);
      setIsRegisterOpen(false);
      setCurrentView('landing');
      setCurrentUser(null);
    }

    // Detectar si Supabase envió algún error en la URL (ej: enlace expirado o URL no permitida)
    const rawHash = (window.location.hash || '').replace(/^#/, '');
    const rawSearch = (window.location.search || '').replace(/^\?/, '');
    const params = new URLSearchParams(rawHash || rawSearch);
    const errorDescription = params.get('error_description');
    if (errorDescription) {
      const cleanMsg = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
      showNotification(`Error de recuperación: ${cleanMsg}`, 'error');
    }

    async function loadSession() {
      // Si está recuperando contraseña, BLOQUEAR la entrada al dashboard
      if (isRecoveringRef.current || sessionStorage.getItem('nimbox_is_recovering') === 'true') {
        setCurrentView('landing');
        setCurrentUser(null);
        return;
      }

      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setCurrentView(vistaPara(user));
      } else if (shareToken) {
        // Para abrir un enlace compartido se necesita cuenta
        setIsLoginOpen(true);
        showNotification('Inicia sesión o crea una cuenta para ver el archivo que te compartieron.', 'info');
      }
    }
    loadSession();

    const { data: listener } = authService.onAuthStateChange(async (user, event) => {
      if (event === 'PASSWORD_RECOVERY') {
        isRecoveringRef.current = true;
        sessionStorage.setItem('nimbox_is_recovering', 'true');
      }

      // Si estamos en proceso de recuperación, NUNCA entrar al dashboard ni setear usuario
      if (isRecoveringRef.current || sessionStorage.getItem('nimbox_is_recovering') === 'true') {
        setIsForgotPasswordOpen(false);
        setIsLoginOpen(false);
        setIsRegisterOpen(false);
        setIsResetPasswordOpen(true);
        setCurrentView('landing');
        setCurrentUser(null);
        return;
      }

      if (user) {
        setCurrentUser(user);
        setCurrentView(vistaPara(user));
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
    setCurrentView('landing'); 
    setIsRegisterOpen(false); 
    if (shareToken) return;
    showNotification(`¡Cuenta creada! Elige un plan abajo para continuar.`, 'success');
  };

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    setIsLoginOpen(false);
    setCurrentView(vistaPara(user));
    if (shareToken) return;
    
    if (esAdmin(user)) showNotification(`¡Hola, ${user.name}! Entraste al panel de administración.`, 'success');
    else if (user.plan !== 'Ninguno') showNotification(`¡Hola de nuevo, ${user.name}!`, 'success');
    else showNotification(`Bienvenido. Selecciona un plan para continuar.`, 'info');
  };

  const handlePaymentSuccess = (planData) => {
    const updatedUser = { ...currentUser, plan: planData.plan, storageQuota: planData.storageQuota };
    setCurrentUser(updatedUser);
    setBillingVersion((v) => v + 1);
    setCurrentView('dashboard'); 
    showNotification(`¡Pago exitoso! Plan ${planData.plan} activado.`, 'success');
  };

  const handleExitShared = () => {
    clearPendingShareToken();
    setShareToken(null);
    setCurrentView(vistaPara(currentUser));
  };

  const handleLogout = async () => {
    clearPendingShareToken();
    setShareToken(null);
    await authService.signOut();
    setCurrentUser(null);
    setCurrentView('landing');
    showNotification('Has cerrado sesión.', 'info');
  };

  return (
    <div>
      {currentUser && shareToken ? (
        <SharedView token={shareToken} currentUser={currentUser} hasPlan={vistaPara(currentUser) === 'dashboard'} onExit={handleExitShared} onLogout={handleLogout} onNotification={showNotification} />
      ) : currentView === 'dashboard' && currentUser ? (
        esAdmin(currentUser) ? (
          <AdminDashboardView currentUser={currentUser} onLogout={handleLogout} onNotification={showNotification} />
        ) : (
          <DashboardView currentUser={currentUser} onLogout={handleLogout} onNotification={showNotification} onChangePlan={handleOpenCheckout} billingVersion={billingVersion} />
        )
      ) : (
        <LandingPage onOpenCheckout={handleOpenCheckout} onOpenLogin={handleOpenLogin} onLogout={handleLogout} currentUser={currentUser} />
      )}

      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} onRegisterSuccess={handleRegisterSuccess} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLoginSuccess={handleLoginSuccess} onForgotPassword={handleOpenForgotPassword} onOpenRegister={handleOpenRegister} />
      <ForgotPasswordModal isOpen={isForgotPasswordOpen} onClose={() => setIsForgotPasswordOpen(false)} onBackToLogin={handleOpenLogin} />
      <ResetPasswordModal 
        isOpen={isResetPasswordOpen} 
        onClose={async () => {
          // Si cierra sin cambiar la contraseña, se cierra también la sesión temporal
          // que Supabase abre con el enlace del correo (si no, entraría a la cuenta sin contraseña)
          await authService.signOut();
          isRecoveringRef.current = false;
          sessionStorage.removeItem('nimbox_is_recovering');
          setIsResetPasswordOpen(false);
          setCurrentUser(null);
          setCurrentView('landing');
          window.history.replaceState(null, '', window.location.pathname);
          showNotification('No se cambió la contraseña. Si la necesitas, solicita un nuevo enlace de recuperación.', 'info');
        }} 
        onResetSuccess={async () => {
          isRecoveringRef.current = false;
          sessionStorage.removeItem('nimbox_is_recovering');
          setIsResetPasswordOpen(false);
          await authService.signOut();
          setCurrentUser(null);
          setCurrentView('landing');
          window.history.replaceState(null, '', window.location.pathname);
          showNotification('¡Contraseña actualizada con éxito! Inicia sesión con tu nueva contraseña.', 'success');
          handleOpenLogin();
        }} 
      />
      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} user={currentUser} selectedPlan={selectedPlan} billingCycle={billingCycle} onPaymentSuccess={handlePaymentSuccess} />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}