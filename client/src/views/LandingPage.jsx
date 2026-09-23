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

export const LandingPage = ({ onOpenCheckout, onOpenLogin }) => {
  const [toast, setToast] = useState(null);

  const showNotification = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLoginClick = () => {
    if (onOpenLogin) {
      onOpenLogin();
    } else {
      showNotification('Iniciando sesión...', 'info');
    }
  };

  const handleRegisterClick = () => {
    // Default to popular Pro plan when clicking generic "Comenzar"
    if (onOpenCheckout) {
      onOpenCheckout({
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
    }
  };

  const handleSelectPlan = (plan, cycle = 'monthly') => {
    if (onOpenCheckout) {
      onOpenCheckout(plan, cycle);
    } else {
      showNotification(`Has seleccionado el Plan ${plan.nombre || plan.name} (${cycle === 'annual' ? 'Facturación Anual -20%' : 'Mensual'}).`, 'success');
    }
  };

  return (
    <div style={{ background: 'var(--bg-body)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Header / Navigation */}
      <LandingNavbar
        onLoginClick={handleLoginClick}
        onRegisterClick={handleRegisterClick}
      />

      {/* 2. Hero Section with Interactive Mockup */}
      <LandingHero
        onGetStartedClick={handleRegisterClick}
        onLoginClick={handleLoginClick}
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
