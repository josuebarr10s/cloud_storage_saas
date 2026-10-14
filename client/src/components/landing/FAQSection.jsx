import React, { useState } from 'react';
import { ChevronDown, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Reveal } from './Reveal.jsx';

export const FAQSection = ({ onGetStartedClick }) => {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: '¿Cómo garantiza Nimbox la seguridad y privacidad de mis archivos?',
      a: 'Implementamos un esquema de seguridad multicapa: todos los archivos se cifran en reposo utilizando el algoritmo AES-256 y en tránsito mediante TLS 1.3. Además, nuestra arquitectura Zero-Knowledge garantiza que nadie, ni siquiera el equipo técnico de Nimbox, pueda acceder a tus archivos sin tu autorización.'
    },
    {
      q: '¿Puedo cambiar de plan o cancelar mi suscripción en cualquier momento?',
      a: 'Sí, totalmente. No tienes contratos de permanencia obligatoria. Puedes mejorar a un plan superior (como Pro o Empresarial) o cancelarlo cuando quieras directamente desde tu panel de usuario.'
    },
    {
      q: '¿Cómo funcionan los enlaces protegidos con contraseña y fecha de vencimiento?',
      a: 'Al generar un enlace público o privado para cualquier archivo o carpeta, puedes asignar un PIN o contraseña de acceso y fijar una fecha de expiración (por ejemplo, 1 hora, 24 horas o 7 días). Tras dicho plazo o sin el PIN correcto, el acceso queda revocado de forma automática.'
    },
    {
      q: '¿Qué ocurre si alcanzo el límite de almacenamiento de mi plan?',
      a: 'Si te acercas al límite de espacio de tu plan, el sistema te alertará. Tus archivos existentes seguirán disponibles y protegidos; únicamente deberás liberar espacio o cambiar a un plan con mayor capacidad (por ejemplo, Plan Pro de 500 GB o Empresarial) para subir nuevos elementos.'
    },
    {
      q: '¿Puedo recuperar versiones anteriores de archivos o elementos eliminados?',
      a: 'Sí. El Plan Pro incluye hasta 30 días de retención en papelera de reciclaje e historial de versiones, permitiéndote restaurar documentos con un solo clic.'
    },
    {
      q: '¿Tienen opciones para empresas o instituciones educativas?',
      a: 'Sí. Disponemos del Plan Empresarial con almacenamiento ilimitado, SSO, auditoría de seguridad y soporte dedicado 1 a 1.'
    }
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section id="faq" className="landing-section" style={{ background: 'var(--bg-body)', borderTop: '1px solid var(--border-color)' }}>
      <div className="landing-container">
        {/* Section Header */}
        <Reveal style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem auto' }}>
          <div className="pill-badge" style={{ marginBottom: '1rem' }}>
            <HelpCircle size={14} /> Respuestas Claras
          </div>
          <h2 className="section-title">Preguntas Frecuentes</h2>
          <p className="section-subtitle">
            Todo lo que necesitas saber sobre el funcionamiento, la seguridad y los planes de Nimbox.
          </p>
        </Reveal>

        {/* FAQ Accordion List */}
        <div style={{ maxWidth: '820px', margin: '0 auto clamp(3.5rem, 8vw, 5.5rem) auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <Reveal
                key={idx}
                delay={idx * 70}
                className="faq-item"
                style={{
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: isOpen ? '1px solid var(--accent-indigo-border)' : '1px solid var(--border-color)',
                  background: isOpen ? 'var(--bg-tint)' : 'var(--bg-card)',
                  boxShadow: isOpen ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                }}
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: 'clamp(0.95rem, 1.6vw, 1rem)',
                    gap: '16px',
                  }}
                >
                  <span>{faq.q}</span>
                  <div
                    className={`chevron-rotate ${isOpen ? 'is-open' : ''}`}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-full)',
                      background: isOpen ? 'var(--primary-light)' : 'var(--bg-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isOpen ? 'var(--primary)' : 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    <ChevronDown size={16} />
                  </div>
                </button>

                <div className={`collapse ${isOpen ? 'is-open' : ''}`}>
                  <div>
                    <div
                      style={{
                        padding: '0.75rem 1.5rem 1.25rem 1.5rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.925rem',
                        lineHeight: 1.65,
                        borderTop: '1px solid var(--primary-light)',
                      }}
                    >
                      {faq.a}
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Final CTA Banner */}
        <Reveal variant="zoom" className="cta-banner">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-orb" aria-hidden="true" style={{ width: '360px', height: '360px', background: '#8b5cf6', top: '-160px', left: '-80px' }} />
          <div className="hero-orb" aria-hidden="true" style={{ width: '320px', height: '320px', background: '#06b6d4', bottom: '-180px', right: '-60px', animationDelay: '-9s' }} />

          <div style={{ maxWidth: '650px', margin: '0 auto' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--white-alpha-20)',
                color: 'var(--text-white)',
                padding: '4px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
              }}
            >
              <Sparkles size={14} /> Tu cuenta lista en segundos
            </span>

            <h3
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.6rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                marginBottom: '1rem',
                textWrap: 'balance',
              }}
            >
              ¿Listo para almacenar y compartir tus archivos sin fricción?
            </h3>

            <p style={{ color: 'var(--accent-indigo-bg)', fontSize: '1.05rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
              Comienza hoy mismo con 10 GB de almacenamiento seguro en Nimbox.
            </p>

            <button
              onClick={onGetStartedClick}
              className="white-btn btn-shine"
              style={{
                padding: '0.9rem 2.25rem',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                color: 'var(--primary)',
                boxShadow: 'var(--shadow-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Crear cuenta ahora <ArrowRight size={18} />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default FAQSection;