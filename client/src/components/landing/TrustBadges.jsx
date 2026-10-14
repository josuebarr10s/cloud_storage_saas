import React from 'react';
import { ShieldCheck, Lock, Activity, Award, Database, Globe, KeyRound, Server, Cloud, Zap } from 'lucide-react';
import { Reveal, trackSpotlight } from './Reveal.jsx';

const techStack = [
  { icon: Lock, label: 'AES-256' },
  { icon: ShieldCheck, label: 'TLS 1.3' },
  { icon: Database, label: 'PostgreSQL' },
  { icon: Server, label: 'Object Storage' },
  { icon: KeyRound, label: 'SSO / SAML' },
  { icon: Globe, label: 'CDN Global' },
  { icon: Award, label: 'SOC-2 Type II' },
  { icon: Cloud, label: 'Arquitectura STaaS' },
  { icon: Activity, label: 'Monitoreo 24/7' },
  { icon: Zap, label: 'Carga Multi-Chunk' },
];

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
        padding: 'clamp(3rem, 6vw, 4.5rem) 0 clamp(3.5rem, 7vw, 5.5rem) 0',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-body)',
      }}
    >
      <div className="landing-container">
        <Reveal
          as="p"
          style={{
            textAlign: 'center',
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            fontWeight: 700,
            marginBottom: '1.75rem',
          }}
        >
          Infraestructura confiable bajo los más altos estándares de ingeniería y seguridad
        </Reveal>

        {/* Cinta infinita de tecnologías */}
        <Reveal className="marquee" style={{ marginBottom: '3rem' }} delay={100}>
          <div className="marquee-track">
            {[...techStack, ...techStack].map((tech, i) => {
              const TechIcon = tech.icon;
              return (
                <span key={i} className="marquee-item" aria-hidden={i >= techStack.length}>
                  <TechIcon size={15} color="var(--primary)" /> {tech.label}
                </span>
              );
            })}
          </div>
        </Reveal>

        <div className="trust-grid">
          {securityFeatures.map((feat, index) => {
            const IconComp = feat.icon;
            return (
              <Reveal
                key={index}
                delay={index * 110}
                className="card-white spotlight"
                onMouseMove={trackSpotlight}
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 'var(--radius-lg)',
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
                      className="icon-tile"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-sm)',
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
                        borderRadius: 'var(--radius-xs)',
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
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;