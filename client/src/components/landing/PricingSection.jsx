import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';

export const PricingSection = ({ onChoosePlan }) => {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'

  const plans = [
    {
      id_plan: 1,
      nombre: 'Básico',
      descripcion: 'Para uso personal y organización',
      precio: 5,
      precioAnual: 4.0, // 20% off
      popular: false,
      features: [
        '10 GB de almacenamiento',
        'Acceso desde 2 dispositivos',
        'Compartir por enlace',
        'Soporte por email',
        'Historial de versiones (7 días)'
      ],
      buttonText: 'Elegir Básico'
    },
    {
      id_plan: 2,
      nombre: 'Pro',
      descripcion: 'Para profesionales y pequeños equipos',
      precio: 12,
      precioAnual: 9.6, // 20% off
      popular: true,
      badge: 'Recomendado',
      features: [
        '500 GB de almacenamiento',
        'Dispositivos ilimitados',
        'Compartir con permisos avanzados',
        'Soporte prioritario 24/7',
        'Historial de versiones 30 días',
        'Colaboración en equipo',
        'Integraciones con terceros'
      ],
      buttonText: 'Elegir Pro'
    },
    {
      id_plan: 3,
      nombre: 'Empresarial',
      descripcion: 'Para organizaciones exigentes',
      precio: 49,
      precioAnual: 39.2, // 20% off
      popular: false,
      features: [
        'Almacenamiento Ilimitado',
        'SSO y control de acceso',
        'SLA garantizado 99.99%',
        'Soporte dedicado',
        'Historial de versiones ilimitado',
        'Auditoría y cumplimiento',
        'API privada y webhooks',
        'Facturación personalizada'
      ],
      buttonText: 'Contactar ventas'
    }
  ];

  return (
    <section id="pricing" style={{ padding: '5.5rem 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
      <div className="landing-container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 3rem auto' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.6rem)',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.03em',
              marginBottom: '0.75rem',
            }}
          >
            Un plan para cada etapa
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.05rem', marginBottom: '2rem' }}>
            Empieza sin tarjeta de crédito. Escala cuando lo necesites.
          </p>

          {/* Billing Switch */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '4px',
              borderRadius: '9999px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              gap: '4px',
            }}
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '6px 18px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: billingCycle === 'monthly' ? '#4f46e5' : 'transparent',
                color: billingCycle === 'monthly' ? '#ffffff' : '#64748b',
                transition: 'all 0.2s',
              }}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              style={{
                padding: '6px 18px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: billingCycle === 'annual' ? '#4f46e5' : 'transparent',
                color: billingCycle === 'annual' ? '#ffffff' : '#64748b',
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
                  background: billingCycle === 'annual' ? 'rgba(255,255,255,0.25)' : '#ecfdf5',
                  color: billingCycle === 'annual' ? '#ffffff' : '#059669',
                  padding: '2px 6px',
                  borderRadius: '9999px',
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
                    ? 'linear-gradient(180deg, #4f46e5 0%, #4338ca 100%)'
                    : '#ffffff',
                  color: plan.popular ? '#ffffff' : '#0f172a',
                  borderRadius: '20px',
                  padding: '2.5rem 2rem',
                  border: plan.popular ? 'none' : '1px solid #e2e8f0',
                  boxShadow: plan.popular
                    ? '0 20px 25px -5px rgba(79, 70, 229, 0.3)'
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
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
                      background: '#10b981',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 14px',
                      borderRadius: '9999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)',
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
                      color: plan.popular ? '#c7d2fe' : '#64748b',
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
                    <span style={{ fontSize: '0.9rem', color: plan.popular ? '#c7d2fe' : '#64748b' }}>
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
                            borderRadius: '50%',
                            background: plan.popular ? 'rgba(255,255,255,0.2)' : '#eef2ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          <Check size={12} color={plan.popular ? '#ffffff' : '#4f46e5'} />
                        </div>
                        <span style={{ color: plan.popular ? '#f1f5f9' : '#334155' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onChoosePlan && onChoosePlan(plan, billingCycle)}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    background: plan.popular ? '#ffffff' : '#4f46e5',
                    color: plan.popular ? '#4f46e5' : '#ffffff',
                    boxShadow: plan.popular ? '0 4px 6px rgba(0,0,0,0.1)' : '0 2px 4px rgba(79, 70, 229, 0.25)',
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
