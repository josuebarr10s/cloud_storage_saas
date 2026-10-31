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
import { Reveal, trackSpotlight } from './Reveal.jsx';

const IconTile = ({ icon: IconComp, color, bg }) => (
  <div
    className="icon-tile"
    style={{
      width: '46px',
      height: '46px',
      borderRadius: 'var(--radius-md)',
      background: bg,
      color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '1.25rem',
    }}
  >
    <IconComp size={24} />
  </div>
);

const cardTitle = { fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' };
const cardText = { color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.55 };

export const BentoFeatures = () => {
  const [demoProtectedLink, setDemoProtectedLink] = useState(true);
  const [demoExpiry, setDemoExpiry] = useState('7 días');
  const [demoSearchTag, setDemoSearchTag] = useState('todos');

  return (
    <section id="features" className="landing-section" style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--border-color)' }}>
      <div className="landing-container">
        {/* Section Header */}
        <Reveal style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 3.5rem auto' }}>
          <div className="pill-badge" style={{ marginBottom: '1rem' }}>
            <Zap size={14} /> Características del Sistema
          </div>
          <h2 className="section-title">Gestión inteligente de archivos en la nube</h2>
          <p className="section-subtitle">
            Organiza, previsualiza y comparte tus archivos desde el navegador, con tu espacio separado del de los demás.
          </p>
        </Reveal>

        {/* Bento Grid */}
        <div className="bento-grid">
          {/* Card 1: Large Featured Card */}
          <Reveal className="card-white spotlight bento-card bento-span-8" onMouseMove={trackSpotlight}>
            <div>
              <IconTile icon={HardDrive} color="var(--primary)" bg="var(--primary-light)" />
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Arquitectura STaaS de Almacenamiento
              </h3>
              <p style={{ ...cardText, fontSize: '0.95rem', maxWidth: '580px', lineHeight: 1.6 }}>
                La información de cada archivo (nombre, tamaño, carpeta) vive en PostgreSQL y el contenido en Supabase Storage. Así la base de datos no se satura y cada usuario solo puede ver lo suyo.
              </p>
            </div>

            {/* Visual stats */}
            <div
              style={{
                marginTop: '1.25rem',
                padding: '1.25rem',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))',
                gap: '14px',
                textAlign: 'center',
              }}
            >
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Metadatos</p>
                <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--success)', marginTop: '2px' }}>PostgreSQL</p>
              </div>
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Archivos</p>
                <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>Supabase Storage</p>
              </div>
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Acceso</p>
                <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-sky)', marginTop: '2px' }}>Solo el dueño</p>
              </div>
            </div>
          </Reveal>

          {/* Card 2: Interactive Links & PIN */}
          <Reveal className="card-white spotlight bento-card bento-span-4" delay={120} onMouseMove={trackSpotlight}>
            <div>
              <IconTile icon={Share2} color="var(--accent-sky)" bg="var(--accent-sky-bg)" />
              <h3 style={cardTitle}>Compartir por enlace</h3>
              <p style={{ ...cardText, marginBottom: '1.25rem' }}>
                Comparte archivos y carpetas con otras cuentas de Nimbox. En Pro y Empresarial, ponles contraseña y fecha de vencimiento.
              </p>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                  <Lock size={13} color="var(--accent-sky)" /> Proteger con contraseña
                </span>
                <button
                  onClick={() => setDemoProtectedLink(!demoProtectedLink)}
                  role="switch"
                  aria-checked={demoProtectedLink}
                  aria-label="Proteger con contraseña"
                  style={{
                    width: '36px',
                    height: '20px',
                    borderRadius: 'var(--radius-full)',
                    background: demoProtectedLink ? 'var(--accent-sky)' : 'var(--border-hover)',
                    position: 'relative',
                    transition: 'background 0.25s ease',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--text-white)',
                      position: 'absolute',
                      top: '2px',
                      left: '2px',
                      transform: demoProtectedLink ? 'translateX(16px)' : 'translateX(0)',
                      transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  />
                </button>
              </div>

              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Vence:</p>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['1 día', '7 días', '30 días', 'Nunca'].map((time) => (
                    <button
                      key={time}
                      onClick={() => setDemoExpiry(time)}
                      style={{
                        flex: 1,
                        padding: '5px 0',
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
          </Reveal>

          {/* Card 3: Version Control */}
          <Reveal className="card-white spotlight bento-card bento-span-4" onMouseMove={trackSpotlight}>
            <div>
              <IconTile icon={RefreshCw} color="var(--accent-violet)" bg="var(--accent-violet-bg)" />
              <h3 style={cardTitle}>Historial de Versiones</h3>
              <p style={cardText}>
                Restaura versiones anteriores de tus documentos y recupera archivos de la papelera: 7 días en Básico, 30 en Pro y sin límite en Empresarial.
              </p>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { v: 'v3', label: 'Versión actual', time: 'Hace 5 min', current: true },
                { v: 'v2', label: 'Editado por Ana', time: 'Ayer' },
                { v: 'v1', label: 'Versión original', time: 'Hace 6 días' },
              ].map((item) => (
                <div
                  key={item.v}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: item.current ? 'var(--accent-violet-bg)' : 'var(--bg-subtle)',
                    border: `1px solid ${item.current ? 'var(--accent-indigo-border)' : 'var(--border-color)'}`,
                    fontSize: '0.75rem',
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--accent-violet)', minWidth: '20px' }}>{item.v}</span>
                  <span style={{ color: 'var(--text-strong)', fontWeight: 500, flex: 1 }}>{item.label}</span>
                  <span style={{ color: 'var(--text-light)' }}>{item.time}</span>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Card 4: Search & Filters */}
          <Reveal className="card-white spotlight bento-card bento-span-4" delay={120} onMouseMove={trackSpotlight}>
            <div>
              <IconTile icon={Search} color="var(--primary)" bg="var(--primary-light)" />
              <h3 style={cardTitle}>Búsqueda Instantánea</h3>
              <p style={cardText}>
                Encuentra archivos por nombre, fíltralos por tipo y ordénalos por fecha, tamaño o nombre.
              </p>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-subtle)',
                  fontSize: '0.8rem',
                  color: 'var(--text-strong)',
                  marginBottom: '10px',
                }}
              >
                <Search size={14} color="var(--text-light)" />
                <span>{demoSearchTag === 'todos' ? 'reporte' : `reporte · ${demoSearchTag}`}</span>
                <span className="typing-caret" aria-hidden="true" />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['todos', 'PDFs', 'Imágenes', 'Videos', 'ZIPs'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setDemoSearchTag(tag)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
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
          </Reveal>

          {/* Card 5: Preview */}
          <Reveal className="card-white spotlight bento-card bento-span-4" delay={240} onMouseMove={trackSpotlight}>
            <div>
              <IconTile icon={Eye} color="var(--warning-hover)" bg="var(--warning-bg)" />
              <h3 style={cardTitle}>Visor Multimedia</h3>
              <p style={cardText}>
                Visualiza documentos PDF, fotos en alta resolución y reproduce videos sin descargarlos previamente.
              </p>
            </div>

            <div style={{ marginTop: '1.25rem', padding: '10px 12px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--warning-bg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={15} color="var(--warning-hover)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--warning-text)', fontWeight: 500 }}>Imágenes, PDF, video, audio y texto en el navegador</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default BentoFeatures;
