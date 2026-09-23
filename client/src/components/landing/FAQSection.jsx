import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';

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
    <section id="faq" style={{ padding: '5.5rem 0', background: '#ffffff', borderTop: '1px solid var(--border-color)' }}>
      <div className="landing-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem auto' }}>
          <div className="pill-badge" style={{ marginBottom: '1rem' }}>
            <HelpCircle size={14} /> Respuestas Claras
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.6rem)',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.03em',
              marginBottom: '0.75rem',
            }}
          >
            Preguntas Frecuentes
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
            Todo lo que necesitas saber sobre el funcionamiento, la seguridad y los planes de Nimbox.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div style={{ maxWidth: '800px', margin: '0 auto 5rem auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                style={{
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: isOpen ? '1px solid var(--accent-indigo-border)' : '1px solid var(--border-color)',
                  background: isOpen ? 'var(--bg-tint)' : '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s',
                }}
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  style={{
                    width: '100%',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '1rem',
                    gap: '16px',
                  }}
                >
                  <span>{faq.q}</span>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isOpen ? 'var(--primary-light)' : 'var(--bg-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isOpen ? 'var(--primary)' : 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: '0 1.5rem 1.25rem 1.5rem',
                      color: 'var(--text-secondary)',
                      fontSize: '0.925rem',
                      lineHeight: 1.6,
                      borderTop: '1px solid var(--primary-light)',
                      paddingTop: '0.75rem',
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Final CTA Banner (Figma Banner style) */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)',
            borderRadius: '24px',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: '#ffffff',
            boxShadow: '0 20px 25px -5px rgba(79, 70, 229, 0.25)',
          }}
        >
          <div style={{ maxWidth: '650px', margin: '0 auto' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '4px 14px',
                borderRadius: '9999px',
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
              }}
            >
              ¿Listo para almacenar y compartir tus archivos sin fricción?
            </h3>

            <p style={{ color: 'var(--accent-indigo-bg)', fontSize: '1.05rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
              Comienza hoy mismo con 10 GB de almacenamiento seguro en Nimbox.
            </p>

            <button
              onClick={onGetStartedClick}
              style={{
                padding: '0.9rem 2.25rem',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '12px',
                background: '#ffffff',
                color: 'var(--primary)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Crear cuenta ahora <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};