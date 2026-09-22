import React from 'react';
import { Star } from 'lucide-react';

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
    { label: 'Archivos Almacenados', value: '+12.4M', subtext: 'En más de 40 países' },
    { label: 'Tiempo de Actividad', value: '99.99%', subtext: 'SLA verificado' },
    { label: 'Latencia Promedio', value: '< 180ms', subtext: 'Alta velocidad STaaS' },
    { label: 'Cifrado de Datos', value: 'AES-256', subtext: 'En reposo y tránsito' },
  ];

  return (
    <section
      style={{
        padding: '5.5rem 0',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
      }}
    >
      <div className="landing-container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem auto' }}>
          <div className="pill-badge" style={{ marginBottom: '1rem' }}>
            <Star size={14} fill="#4f46e5" /> Testimonios Reales
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.6rem)',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.03em',
              marginBottom: '0.75rem',
            }}
          >
            La confianza de creadores y equipos
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.05rem' }}>
            Descubre cómo Nimbox ayuda a optimizar el almacenamiento de archivos diario.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            marginBottom: '4.5rem',
          }}
        >
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="card-white"
              style={{
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: '20px',
              }}
            >
              <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem' }}>
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
                  ))}
                </div>
                <p style={{ color: '#334155', fontSize: '0.95rem', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '1.5rem' }}>
                  "{t.quote}"
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <img
                  src={t.avatar}
                  alt={t.author}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #eef2ff' }}
                />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                    {t.author}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {t.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Banner */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '2.5rem 2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '24px',
            textAlign: 'center',
          }}
        >
          {stats.map((s, index) => (
            <div key={index} style={{ padding: '0.5rem' }}>
              <p
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: '#4f46e5',
                  marginBottom: '2px',
                }}
              >
                {s.value}
              </p>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                {s.label}
              </p>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {s.subtext}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
