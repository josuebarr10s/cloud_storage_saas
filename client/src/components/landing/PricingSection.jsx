import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { plansService } from '../../services/plansService.js';
import { Reveal } from './Reveal.jsx';

export const PricingSection = ({ onChoosePlan }) => {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [plans, setPlans] = useState([]);
  const monthlyRef = useRef(null);
  const annualRef = useRef(null);
  const [indicator, setIndicator] = useState({ x: 0, width: 0 });

  // Posiciona la "píldora" del selector sobre el botón activo
  useLayoutEffect(() => {
    const updateIndicator = () => {
      const btn = billingCycle === 'annual' ? annualRef.current : monthlyRef.current;
      if (btn) setIndicator({ x: btn.offsetLeft, width: btn.offsetWidth });
    };
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [billingCycle]);

  useEffect(() => {
    async function loadPlans() {
      const dbPlans = await plansService.getPlans();
      if (dbPlans && dbPlans.length > 0) {
        setPlans(dbPlans.slice().sort((a, b) => a.precio - b.precio));
      }
    }
    loadPlans();
  }, []);

  return (
    <section id="pricing" className="landing-section" style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--border-color)' }}>
      <div className="landing-container">
        {/* Header */}
        <Reveal style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 3.5rem auto' }}>
          <h2 className="section-title">Un plan para cada etapa</h2>
          <p className="section-subtitle" style={{ marginBottom: '2rem' }}>
            Elige el espacio que necesitas y cambia de plan cuando quieras.
          </p>

          {/* Billing Switch */}
          <div className="billing-toggle" role="group" aria-label="Ciclo de facturación">
            <span
              className="billing-indicator"
              aria-hidden="true"
              style={{ width: `${indicator.width}px`, transform: `translateX(${indicator.x}px)` }}
            />
            <button
              ref={monthlyRef}
              onClick={() => setBillingCycle('monthly')}
              aria-pressed={billingCycle === 'monthly'}
              style={{
                color: billingCycle === 'monthly' ? 'var(--text-white)' : 'var(--text-muted)',
              }}
            >
              Mensual
            </button>
            <button
              ref={annualRef}
              onClick={() => setBillingCycle('annual')}
              aria-pressed={billingCycle === 'annual'}
              style={{
                color: billingCycle === 'annual' ? 'var(--text-white)' : 'var(--text-muted)',
              }}
            >
              <span>Anual</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: billingCycle === 'annual' ? 'var(--white-alpha-25)' : 'var(--success-bg)',
                  color: billingCycle === 'annual' ? 'var(--text-white)' : 'var(--success-hover)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-full)',
                  transition: 'all 0.3s ease',
                }}
              >
                -20%
              </span>
            </button>
          </div>
        </Reveal>

        {/* Pricing Cards */}
        <div className="pricing-grid">
          {plans.map((plan, index) => {
            const currentPrice = billingCycle === 'annual' ? plan.precioAnual : plan.precio;

            return (
              <Reveal key={plan.id_plan} delay={index * 130} style={{ display: 'flex' }}>
              <div
                className={`pricing-card ${plan.popular ? 'is-popular' : ''}`}
                style={{
                  flex: 1,
                  background: plan.popular
                    ? 'linear-gradient(180deg, var(--primary) 0%, var(--primary-hover) 100%)'
                    : 'var(--bg-card)',
                  color: plan.popular ? 'var(--text-white)' : 'var(--text-main)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '2.5rem 2rem',
                  border: plan.popular ? 'none' : '1px solid var(--border-color)',
                  boxShadow: plan.popular
                    ? 'var(--shadow-card-primary)'
                    : 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  zIndex: plan.popular ? 2 : 1,
                }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-14px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--success)',
                      color: 'var(--text-white)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 14px',
                      borderRadius: 'var(--radius-full)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      boxShadow: 'var(--shadow-glow-success)',
                    }}
                  >
                    {plan.badge}
                  </span>
                )}

                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>
                    {plan.nombre}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: plan.popular ? 'var(--accent-indigo-border)' : 'var(--text-muted)',
                      minHeight: '38px',
                      marginBottom: '1.5rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {plan.descripcion}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '1.75rem' }}>
                    <span key={billingCycle} className="price-swap stat-value" style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                      ${currentPrice % 1 === 0 ? currentPrice : currentPrice.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: plan.popular ? 'var(--accent-indigo-border)' : 'var(--text-muted)' }}>
                      /mes
                    </span>
                  </div>

                  <ul
                    style={{
                      listStyle: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      textAlign: 'left',
                      marginBottom: '2.5rem',
                    }}
                  >
                    {plan.features.map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.88rem' }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: 'var(--radius-full)',
                            background: plan.popular ? 'var(--white-alpha-20)' : 'var(--primary-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          <Check size={12} color={plan.popular ? 'var(--text-white)' : 'var(--primary)'} />
                        </div>
                        <span style={{ color: plan.popular ? 'var(--bg-hover)' : 'var(--text-strong)' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onChoosePlan && onChoosePlan(plan, billingCycle)}
                  className={`btn-shine ${plan.popular ? 'white-btn' : ''}`}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    background: plan.popular ? 'var(--bg-card)' : 'var(--primary)',
                    color: plan.popular ? 'var(--primary)' : 'var(--text-white)',
                    boxShadow: plan.popular ? 'var(--shadow-md)' : 'var(--shadow-button-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {plan.buttonText} <ArrowRight size={16} />
                </button>
              </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;