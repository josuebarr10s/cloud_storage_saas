import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Reveal, CountUp, trackSpotlight } from './Reveal.jsx';

// Si la foto no carga, muestra las iniciales del autor
const Avatar = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const initials = name.split(' ').map((part) => part[0]).slice(0, 2).join('');
  const size = { width: '44px', height: '44px', borderRadius: 'var(--radius-full)', border: '2px solid var(--primary-light)', flexShrink: 0 };

  if (failed) {
    return (
      <div style={{ ...size, background: 'var(--primary-gradient)', color: 'var(--text-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
        {initials}
      </div>
    );
  }

  return <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} style={{ ...size, objectFit: 'cover' }} />;
};

export const TestimonialsSection = () => {
  const testimonials = [
    {
      quote: 'Nimbox simplificó radicalmente la forma en que compartimos proyectos con nuestros clientes. La posibilidad de establecer contraseñas y expiración en los enlaces es excelente.',
      author: 'Sofía Valenzuela',
      role: 'Directora Creativa en Studio Pixel',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      stars: 5,
    },
    {
      quote: 'La separación de metadatos y almacenamiento de objetos garantiza una velocidad de carga y sincronización notable. Una plataforma STaaS sólida y bien diseñada.',
      author: 'Carlos Mendoza',
      role: 'Tech Lead en CloudNova Systems',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      stars: 5,
    },
    {
      quote: 'El plan Pro cubre todo lo que necesitamos para nuestro equipo. Seguridad de datos, restauración en papelera y soporte rápido cuando lo requerimos.',
      author: 'Elena Morales',
      role: 'CFO en FinTech Horizon',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      stars: 5,
    },
  ];

  const stats = [
    { label: 'Archivos Almacenados', value: '+12.4M', count: { prefix: '+', end: 12.4, decimals: 1, suffix: 'M' }, subtext: 'En más de 40 países' },
    { label: 'Tiempo de Actividad', value: '99.99%', count: { end: 99.99, decimals: 2, suffix: '%' }, subtext: 'SLA verificado' },
    { label: 'Latencia Promedio', value: '< 180ms', count: { prefix: '< ', end: 180, suffix: 'ms' }, subtext: 'Alta velocidad STaaS' },
    { label: 'Cifrado de Datos', value: 'AES-256', subtext: 'En reposo y tránsito' },
  ];

  return (
    <section
      className="landing-section"
      style={{
        background: 'var(--bg-body)',
        borderTop: '1px solid var(--border-color)',
      }}
    >
      <div className="landing-container">
        {/* Header */}
        <Reveal style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem auto' }}>
          <div className="pill-badge" style={{ marginBottom: '1rem' }}>
            <Star size={14} fill="var(--primary)" /> Testimonios Reales
          </div>
          <h2 className="section-title">La confianza de creadores y equipos</h2>
          <p className="section-subtitle">
            Descubre cómo Nimbox ayuda a optimizar el almacenamiento de archivos diario.
          </p>
        </Reveal>

        {/* Testimonials Grid */}
        <div className="testimonials-grid" style={{ marginBottom: 'clamp(3rem, 7vw, 4.5rem)' }}>
          {testimonials.map((t, idx) => (
            <Reveal
              key={idx}
              delay={idx * 120}
              className="card-white spotlight"
              onMouseMove={trackSpotlight}
              style={{
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: 'var(--radius-xl)',
              }}
            >
              <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem' }}>
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} size={16} fill="var(--warning)" color="var(--warning)" />
                  ))}
                </div>
                <p style={{ color: 'var(--text-strong)', fontSize: '0.95rem', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '1.5rem' }}>
                  "{t.quote}"
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '1rem', borderTop: '1px solid var(--bg-hover)' }}>
                <Avatar src={t.avatar} name={t.author} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {t.author}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {t.role}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Stats Banner */}
        <Reveal
          variant="zoom"
          className="stats-grid"
          style={{
            background: 'linear-gradient(135deg, var(--bg-tint) 0%, var(--bg-subtle) 100%)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: 'clamp(1.75rem, 4vw, 2.5rem) clamp(1rem, 3vw, 2rem)',
            textAlign: 'center',
          }}
        >
          {stats.map((s, index) => (
            <div key={index} style={{ padding: '0.5rem' }}>
              <p
                style={{
                  fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  background: 'var(--primary-gradient)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '2px',
                }}
              >
                {s.count ? <CountUp {...s.count} /> : s.value}
              </p>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>
                {s.label}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {s.subtext}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
};

export default TestimonialsSection;