import React, { useState } from 'react';
import { LandingNavbar } from '../components/landing/LandingNavbar.jsx';
import { LandingHero } from '../components/landing/LandingHero.jsx';
import { TrustBadges } from '../components/landing/TrustBadges.jsx';
import { BentoFeatures } from '../components/landing/BentoFeatures.jsx';
import { StorageCalculator } from '../components/landing/StorageCalculator.jsx';
import { PricingSection } from '../components/landing/PricingSection.jsx';
import { FeatureComparison } from '../components/landing/FeatureComparison.jsx';
import { TestimonialsSection } from '../components/landing/TestimonialsSection.jsx';
import { FAQSection } from '../components/landing/FAQSection.jsx';
import { LandingFooter } from '../components/landing/LandingFooter.jsx';
import { Toast } from '../components/Toast.jsx';

export const LandingPage = ({ onNavigateLogin, onNavigateRegister }) => {
  const [toast, setToast] = useState(null);

  const showNotification = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLoginClick = () => {
    if (onNavigateLogin) {
      onNavigateLogin();
    } else {
      showNotification('Módulo de autenticación: Listo para la Fase 2 (Login/Registro)', 'info');
    }
  };

  const handleRegisterClick = () => {
    if (onNavigateRegister) {
      onNavigateRegister();
    } else {
      showNotification('Creación de cuenta: Listo para la Fase 2 (Registro de Usuario)', 'success');
    }
  };

  const handleSelectPlan = (plan, cycle = 'monthly') => {
    showNotification(`Has seleccionado el Plan ${plan.nombre || plan.name} (${cycle === 'annual' ? 'Facturación Anual -20%' : 'Mensual'}). ¡Fase de pago lista para el siguiente paso!`, 'success');
  };

  const scrollToPricing = () => {
    const elem = document.getElementById('pricing');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Header / Navigation */}
      <LandingNavbar
        onLoginClick={handleLoginClick}
        onRegisterClick={handleRegisterClick}
      />

      {/* 2. Hero Section with Interactive Mockup */}
      <LandingHero
        onGetStartedClick={handleRegisterClick}
      />

      {/* 3. Security & Trust Badges */}
      <TrustBadges />

      {/* 4. Bento Grid Features */}
      <BentoFeatures />

      {/* 5. Interactive Storage & ROI Calculator */}
      <StorageCalculator
        onSelectPlan={handleSelectPlan}
      />

      {/* 6. Pricing Section (Monthly / Annual) */}
      <PricingSection
        onChoosePlan={handleSelectPlan}
      />

      {/* 7. Detailed Feature Comparison Matrix */}
      <FeatureComparison />

      {/* 8. Testimonials & Platform Live Stats */}
      <TestimonialsSection />

      {/* 9. FAQ Accordion & Final CTA */}
      <FAQSection
        onGetStartedClick={handleRegisterClick}
      />

      {/* 10. Footer */}
      <LandingFooter />

      {/* Global Interactive Notification Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default LandingPage;
