import React, { useState } from 'react';
import {
  Zap,
  Lock,
  Search,
  RefreshCw,
  Eye,
  Share2,
  HardDrive
} from 'lucide-react';

export const BentoFeatures = () => {
  const [demoProtectedLink, setDemoProtectedLink] = useState(true);
  const [demoExpiry, setDemoExpiry] = useState('24h');
  const [demoSearchTag, setDemoSearchTag] = useState('todos');

  return (
    <section id="features" style={{ padding: '5.5rem 0', background: 'var(--bg-subtle)', borderTop: '1px solid var(--border-color)' }}>
      <div className="landing-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 3.5rem auto' }}>
          <div className="pill-badge" style={{ marginBottom: '1rem' }}>
            <Zap size={14} /> Características del Sistema
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
            Gestión inteligente de archivos en la nube
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
            Diseñado bajo estándares de ingeniería de software para brindar alta disponibilidad, velocidad y privacidad total.
          </p>
        </div>

        {/* Bento Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '24px',
          }}
        >
          {/* Card 1: Large Featured Card (8 cols) */}
          <div
            className="card-white"
            style={{
              gridColumn: 'span 8',
              padding: '2.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <HardDrive size={24} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Arquitectura STaaS de Almacenamiento
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '580px', lineHeight: 1.6 }}>
                Separamos eficientemente los metadatos relacionales (PostgreSQL) del almacenamiento de objetos de alta velocidad para lograr descargas y subidas instantáneas con cero bloqueos.
              </p>
            </div>

            {/* Visual stats */}
            <div
              style={{
                marginTop: '2rem',
                padding: '1.25rem',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '14px',
                textAlign: 'center',
              }}
            >
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Carga Paralela</p>
                <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--success)', marginTop: '2px' }}>Multi-Chunk</p>
              </div>
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Cifrado de Objetos</p>
                <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>AES-256</p>
              </div>
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Disponibilidad SLA</p>
                <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-sky)', marginTop: '2px' }}>99.99%</p>
              </div>
            </div>
          </div>

          {/* Card 2: Interactive Links & PIN (4 cols) */}
          <div
            className="card-white"
            style={{
              gridColumn: 'span 4',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-sky-bg)',
                  color: 'var(--accent-sky)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <Share2 size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Enlaces con PIN y Caducidad
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Comparte enlaces públicos o protégelos con contraseña y fecha de expiración para máxima seguridad.
              </p>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                  <Lock size={13} color="var(--accent-sky)" /> Proteger con PIN
                </span>
                <button
                  onClick={() => setDemoProtectedLink(!demoProtectedLink)}
                  style={{
                    width: '34px',
                    height: '18px',
                    borderRadius: 'var(--radius-md)',
                    background: demoProtectedLink ? 'var(--accent-sky)' : 'var(--border-hover)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--text-white)',
                      position: 'absolute',
                      top: '2px',
                      left: demoProtectedLink ? '18px' : '2px',
                      transition: 'all 0.2s',
                    }}
                  />
                </button>
              </div>

              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Caducidad:</p>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['1h', '24h', '7 días', 'Nunca'].map((time) => (
                    <button
                      key={time}
                      onClick={() => setDemoExpiry(time)}
                      style={{
                        flex: 1,
                        padding: '4px 0',
                        fontSize: '0.7rem',
                        borderRadius: 'var(--radius-xs)',
                        fontWeight: 600,
                        background: demoExpiry === time ? 'var(--accent-sky-bg)' : 'var(--bg-card)',
                        color: demoExpiry === time ? 'var(--accent-sky)' : 'var(--text-muted)',
                        border: demoExpiry === time ? '1px solid var(--accent-sky)' : '1px solid var(--border-color)',
                      }}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Version Control (4 cols) */}
          <div
            className="card-white"
            style={{
              gridColumn: 'span 4',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-violet-bg)',
                  color: 'var(--accent-violet)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <RefreshCw size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Historial de Versiones
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Restaura versiones anteriores de tus documentos y recupera archivos eliminados de la papelera hasta por 30 días.
              </p>
            </div>

            <div style={{ marginTop: '1.25rem', padding: '10px 12px', background: 'var(--accent-violet-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-indigo-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={15} color="var(--accent-violet)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-violet)', fontWeight: 600 }}>Papelera con retención automática de 30 días</span>
            </div>
          </div>

          {/* Card 4: Search & Filters (4 cols) */}
          <div
            className="card-white"
            style={{
              gridColumn: 'span 4',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <Search size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Búsqueda Instantánea
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Localiza archivos en milisegundos con filtros por extensión, fecha o carpetas específicas.
              </p>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['todos', 'PDFs', 'Imágenes', 'Videos', 'ZIPs'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setDemoSearchTag(tag)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    background: demoSearchTag === tag ? 'var(--primary)' : 'var(--bg-hover)',
                    color: demoSearchTag === tag ? 'var(--text-white)' : 'var(--text-muted)',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Card 5: Preview (4 cols) */}
          <div
            className="card-white"
            style={{
              gridColumn: 'span 4',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--warning-bg)',
                  color: 'var(--warning-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <Eye size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Visor Multimedia
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Visualiza documentos PDF, fotos en alta resolución y reproduce videos sin descargarlos previamente.
              </p>
            </div>

            <div style={{ marginTop: '1.25rem', padding: '10px 12px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--warning-bg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={15} color="var(--warning-hover)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--warning-text)', fontWeight: 500 }}>Streaming directo con soporte H.264</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .card-white { grid-column: span 12 !important; }
        }
      `}</style>
    </section>
  );
};

export default BentoFeatures;