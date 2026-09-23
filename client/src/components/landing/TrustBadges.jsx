import React from 'react';
import { ShieldCheck, Lock, Activity, Award } from 'lucide-react';

export const TrustBadges = () => {
  const securityFeatures = [
    {
      icon: Lock,
      title: 'Cifrado AES-256',
      description: 'Encriptación de grado militar en reposo y en tránsito SSL/TLS.',
      badge: 'Estándar Global',
      color: 'var(--primary)',
      bg: 'var(--primary-light)'
    },
    {
      icon: Activity,
      title: 'SLA 99.99% Uptime',
      description: 'Alta disponibilidad garantizada con redundancia y almacenamiento distribuido.',
      badge: 'Resiliencia',
      color: 'var(--success-hover)',
      bg: 'var(--success-bg)'
    },
    {
      icon: ShieldCheck,
      title: 'Zero-Knowledge',
      description: 'Arquitectura privada donde solo tú tienes acceso a tus archivos.',
      badge: '100% Privado',
      color: 'var(--accent-sky)',
      bg: 'var(--accent-sky-bg)'
    },
    {
      icon: Award,
      title: 'SOC-2 & GDPR',
      description: 'Cumplimiento estricto con normativas internacionales de protección de datos.',
      badge: 'Certificado',
      color: 'var(--accent-violet)',
      bg: 'var(--accent-violet-bg)'
    },
  ];

  return (
    <section
      id="security"
      style={{
        padding: '3.5rem 0 4.5rem 0',
        borderTop: '1px solid var(--border-color)',
        borderBottom: '1px solid var(--border-color)',
        background: '#ffffff',
      }}
    >
      <div className="landing-container">
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            fontWeight: 700,
            marginBottom: '2.5rem',
          }}
        >
          Infraestructura confiable bajo los más altos estándares de ingeniería y seguridad
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
          }}
        >
          {securityFeatures.map((feat, index) => {
            const IconComp = feat.icon;
            return (
              <div
                key={index}
                className="card-white"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '16px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1rem',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: feat.bg,
                        color: feat.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconComp size={20} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: feat.color,
                        background: feat.bg,
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {feat.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    {feat.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {feat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};