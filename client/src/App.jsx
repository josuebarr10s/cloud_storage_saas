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
import { ConfirmHost } from './components/ConfirmDialog.jsx';

import { authService } from './services/authService.js';
import { mapAuthErrorMessage } from './utils/authErrorHandler.js';
import { takeShareTokenFromUrl, clearPendingShareToken } from './services/sharingService.js';
import { USER_ROLES } from './constants/roles.js';
import { PLAN_NAMES } from './constants/plans.js';

// El administrador siempre entra a su panel; un cliente entra al dashboard solo si ya tiene plan
const esAdmin = (user) => user?.rol === USER_ROLES.ADMIN_NAME;
// Si no se sabe el plan (undefined), se trata como "sin plan": nunca se entra al dashboard por defecto
const tienePlan = (user) => Boolean(user?.plan) && user.plan !== PLAN_NAMES.NONE;
const vistaPara = (user) => (esAdmin(user) || tienePlan(user)) ? 'dashboard' : 'landing';

export default function App() {
  // Detectar primero si la URL trae un error de recuperación o un enlace de recuperación válido
  const initialRawHash = (window.location.hash || '').replace(/^#/, '');
  const initialRawSearch = (window.location.search || '').replace(/^\?/, '');
  const initialHashParams = new URLSearchParams(initialRawHash);
  const initialSearchParams = new URLSearchParams(initialRawSearch);
  const hasUrlError = Boolean(initialHashParams.get('error') || initialSearchParams.get('error') || initialHashParams.get('error_description') || initialSearchParams.get('error_description'));

  // Si la URL trae un error (ej. otp_expired), limpiar cualquier bandera previa de recuperación
  if (hasUrlError) {
    sessionStorage.removeItem('nimbox_is_recovering');
  }

  // Bandera persistente para asegurar que NUNCA se entre al dashboard durante la recuperación
  const isRecoveringRef = useRef(
    !hasUrlError && (
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery') ||
      sessionStorage.getItem('nimbox_is_recovering') === 'true'
    )
  );

  if (isRecoveringRef.current) {
    sessionStorage.setItem('nimbox_is_recovering', 'true');
  }

  // Hidratación instantánea desde caché local para evitar parpadeo y espera al recargar
  const initialCachedUser = isRecoveringRef.current ? null : authService.getCachedUser();

  const [currentUser, setCurrentUser] = useState(initialCachedUser);
  const [currentView, setCurrentView] = useState(() => (initialCachedUser ? vistaPara(initialCachedUser) : 'landing')); 
  
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  // Sube con cada pago para que el historial de pagos se recargue aunque el plan no cambie
  const [billingVersion, setBillingVersion] = useState(0);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(isRecoveringRef.current);
  // Enlace compartido pendiente (?share=TOKEN). Tiene prioridad sobre landing y dashboard mientras haya sesión.
  const [shareToken, setShareToken] = useState(() => takeShareTokenFromUrl());
  // Pestaña con la que se abre el dashboard (al volver de "Compartidos conmigo" se regresa a ella)
  const [dashboardTab, setDashboardTab] = useState('all');
  const [toast, setToast] = useState(null);

  const showNotification = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    // Detectar si Supabase envió algún error en la URL (ej: enlace expirado o ya utilizado)
    const rawHash = (window.location.hash || '').replace(/^#/, '');
    const rawSearch = (window.location.search || '').replace(/^\?/, '');
    const hashParams = new URLSearchParams(rawHash);
    const searchParams = new URLSearchParams(rawSearch);
    const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
    const errorCode = hashParams.get('error_code') || searchParams.get('error_code');

    if (errorDescription || errorCode) {
      const rawMsg = errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : errorCode;
      const friendlyMsg = mapAuthErrorMessage({ message: rawMsg });
      isRecoveringRef.current = false;
      sessionStorage.removeItem('nimbox_is_recovering');
      setIsResetPasswordOpen(false);
      setIsForgotPasswordOpen(true);
      window.history.replaceState(null, '', window.location.pathname);
      showNotification(friendlyMsg, 'error');
    } else if (isRecoveringRef.current) {
      // Si viene desde un enlace de recuperación válido, verificar token_hash/code si aplica y abrir modal
      setIsResetPasswordOpen(true);
      setIsLoginOpen(false);
      setIsForgotPasswordOpen(false);
      setIsRegisterOpen(false);
      setCurrentView('landing');
      setCurrentUser(null);

      authService.verifyRecoveryFromUrl().then(({ ok, error }) => {
        if (!ok && error) {
          isRecoveringRef.current = false;
          sessionStorage.removeItem('nimbox_is_recovering');
          setIsResetPasswordOpen(false);
          setIsForgotPasswordOpen(true);
          window.history.replaceState(null, '', window.location.pathname);
          showNotification(mapAuthErrorMessage(error), 'error');
        }
      });
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
      } else {
        setCurrentUser(null);
        setCurrentView('landing');
        if (shareToken) {
          // Para abrir un enlace compartido se necesita cuenta
          setIsLoginOpen(true);
          showNotification('Inicia sesión o crea una cuenta para ver el archivo que te compartieron.', 'info');
        }
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
    const updatedUser = { ...currentUser, plan: planData.plan, storageQuota: planData.storageQuota, storageQuotaBytes: null };
    setCurrentUser(updatedUser);
    // Recarga el perfil para tener el plan y el espacio exactos que quedaron en la base de datos
    authService.getCurrentUser().then((user) => { if (user) setCurrentUser(user); });
    setBillingVersion((v) => v + 1);
    setCurrentView('dashboard'); 
    showNotification(`¡Pago exitoso! Plan ${planData.plan} activado.`, 'success');
  };

  // Abrir algo de "Compartidos conmigo": misma vista que el enlace, sin guardarlo como pendiente
  const handleOpenShared = (token) => {
    setDashboardTab('shared');
    setShareToken(token);
  };

  const handleExitShared = () => {
    clearPendingShareToken();
    setShareToken(null);
    setCurrentView(vistaPara(currentUser));
  };

  const handleLogout = async () => {
    clearPendingShareToken();
    setShareToken(null);
    setDashboardTab('all');
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
          <DashboardView currentUser={currentUser} onLogout={handleLogout} onNotification={showNotification} onChangePlan={handleOpenCheckout} onOpenShared={handleOpenShared} initialTab={dashboardTab} billingVersion={billingVersion} />
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
      <ConfirmHost />
    </div>
  );
}