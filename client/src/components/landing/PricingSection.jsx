import React, { useState, useEffect } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { plansService } from '../../services/plansService.js';

export const PricingSection = ({ onChoosePlan }) => {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    async function loadPlans() {
      const dbPlans = await plansService.getPlans();
      setPlans(dbPlans);
    }
    loadPlans();
  }, []);

  return (
    <section id="pricing" style={{ padding: '5.5rem 0', background: 'var(--bg-subtle)', borderTop: '1px solid var(--border-color)' }}>
      <div className="landing-container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 3rem auto' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.6rem)',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.03em',
              marginBottom: '0.75rem',
            }}
          >
            Un plan para cada etapa
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '2rem' }}>
            Empieza sin tarjeta de crédito. Escala cuando lo necesites.
          </p>

          {/* Billing Switch */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              padding: '4px',
              borderRadius: 'var(--radius-full)',
              boxShadow: 'var(--shadow-sm)',
              gap: '4px',
            }}
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '6px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: billingCycle === 'monthly' ? 'var(--primary)' : 'transparent',
                color: billingCycle === 'monthly' ? 'var(--text-white)' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              style={{
                padding: '6px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: billingCycle === 'annual' ? 'var(--primary)' : 'transparent',
                color: billingCycle === 'annual' ? 'var(--text-white)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
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
                }}
              >
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          {plans.map((plan) => {
            const currentPrice = billingCycle === 'annual' ? plan.precioAnual : plan.precio;

            return (
              <div
                key={plan.id_plan}
                style={{
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
                  transform: plan.popular ? 'scale(1.03)' : 'none',
                  zIndex: plan.popular ? 2 : 1,
                  transition: 'transform 0.2s ease',
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
                    <span style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
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
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;