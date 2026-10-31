import React, { useState } from 'react';
import {
  ArrowRight,
  Zap,
  HardDrive,
  FileText,
  Image as ImageIcon,
  Video,
  UploadCloud,
  CheckCircle2,
  Copy,
  Clock,
  Lock,
  Share2,
  Download,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const LandingHero = ({ onGetStartedClick, onLoginClick }) => {
  const [activeTab, setActiveTab] = useState('files');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [simulatedFiles, setSimulatedFiles] = useState([
    { id: 1, name: 'Reporte_Financiero_Q3.pdf', type: 'pdf', size: '4.2 MB', updated: 'Hace 10 min', shared: true, icon: FileText, color: 'var(--danger)', bg: 'var(--danger-bg)' },
    { id: 2, name: 'Brand_Assets_2026.zip', type: 'zip', size: '148.5 MB', updated: 'Hace 2 horas', shared: true, icon: HardDrive, color: 'var(--warning)', bg: 'var(--warning-bg)' },
    { id: 3, name: 'Video_Demo_Producto.mp4', type: 'video', size: '520.0 MB', updated: 'Ayer', shared: false, icon: Video, color: 'var(--accent-purple)', bg: 'var(--accent-violet-bg)' },
    { id: 4, name: 'Nimbox_Architecture_v2.png', type: 'image', size: '8.1 MB', updated: 'Hace 3 días', shared: true, icon: ImageIcon, color: 'var(--accent-cyan)', bg: 'var(--accent-sky-subtle)' }
  ]);

  const handleSimulateUpload = () => {
    if (uploading) return;
    setUploading(true);
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          const newFile = {
            id: Date.now(),
            name: `Documento_Nimbox_${Math.floor(Math.random() * 100)}.pdf`,
            type: 'pdf',
            size: `${(Math.random() * 8 + 1).toFixed(1)} MB`,
            updated: 'Justo ahora',
            shared: false,
            icon: FileText,
            color: 'var(--success)',
            bg: 'var(--success-bg)'
          };
          setSimulatedFiles((f) => [newFile, ...f]);
          return 0;
        }
        return prev + 25;
      });
    }, 250);
  };

  const handleCopyDemoLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <section className="hero-section">
      {/* Fondo animado: cuadrícula + orbes de color */}
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-grid" />
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
      </div>

      <div className="landing-container hero-content">
        {/* Pill Badge */}
        <div className="hero-enter" style={{ '--d': '0ms' }}>
          <div className="hero-badge">
            <span className="hero-badge-tag"><Zap size={12} /> Nuevo</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Comparte con fecha de vencimiento y contraseña
            </span>
          </div>
        </div>

        {/* Hero Title */}
        <h1 className="hero-title hero-enter" style={{ '--d': '100ms' }}>
          Tu almacenamiento,<br />
          <span className="text-gradient-animated">siempre a la mano.</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle hero-enter" style={{ '--d': '220ms' }}>
          Nimbox guarda y organiza tus archivos en la nube: carpetas, vista previa, historial de versiones y enlaces para compartir. Entra desde el navegador, en cualquier dispositivo.
        </p>

        {/* CTA Buttons */}
        <div className="hero-ctas hero-enter" style={{ '--d': '340ms' }}>
          <button onClick={onGetStartedClick} className="btn-primary btn-shine btn-lg">
            Comenzar ahora <ArrowRight size={18} />
          </button>
          <button onClick={onLoginClick} className="btn-secondary btn-lg">
            Iniciar sesión
          </button>
        </div>

        {/* Trust Badges Bar */}
        <div className="hero-checks hero-enter" style={{ '--d': '460ms' }}>
          <span>
            <CheckCircle2 size={16} color="var(--success)" /> 10 GB desde $5 al mes
          </span>
          <span>
            <CheckCircle2 size={16} color="var(--success)" /> Historial de versiones
          </span>
          <span>
            <CheckCircle2 size={16} color="var(--success)" /> Papelera para recuperar archivos
          </span>
        </div>

        {/* ==========================================================
            INTERACTIVE MOCKUP: Cloud Storage Preview (Figma Style)
            ========================================================== */}
        <div className="hero-stage">
          <div className="hero-stage-glow" aria-hidden="true" />

          {/* Tarjetas flotantes (solo escritorio) */}
          <div className="float-card float-card-1" aria-hidden="true">
            <div className="float-card-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="float-card-title">Subida completada</div>
              <div className="float-card-sub">Reporte_Q3.pdf · 4.2 MB</div>
            </div>
          </div>
          <div className="float-card float-card-2" aria-hidden="true">
            <div className="float-card-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="float-card-title">Solo tú ves tus archivos</div>
              <div className="float-card-sub">Acceso privado por cuenta</div>
            </div>
          </div>
          <div className="float-card float-card-3" aria-hidden="true">
            <div className="float-card-icon" style={{ background: 'var(--accent-violet-bg)', color: 'var(--accent-violet)' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div className="float-card-title">Enlace compartido</div>
              <div className="float-card-sub">Vence en 7 días · con contraseña</div>
            </div>
          </div>

        <div className="hero-mockup">
          {/* Mockup Titlebar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              background: 'var(--bg-subtle)',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: 'var(--radius-full)', background: 'var(--danger)' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: 'var(--radius-full)', background: 'var(--warning)' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: 'var(--radius-full)', background: 'var(--success)' }} />
              <span className="mockup-url" style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginLeft: '10px', fontFamily: 'monospace' }}>
                app.nimbox.com/dashboard
              </span>
            </div>
            <span
              className="mockup-status"
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--success)',
                background: 'var(--success-bg)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Zap size={11} /> Plataforma STaaS Conectada
            </span>
          </div>

          {/* Mockup Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              borderBottom: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div className="mockup-tabs">
              <button
                onClick={() => setActiveTab('files')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  background: activeTab === 'files' ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === 'files' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'files' ? 'var(--shadow-sm)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <HardDrive size={14} /> Archivos ({simulatedFiles.length})
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  background: activeTab === 'upload' ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === 'upload' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'upload' ? 'var(--shadow-sm)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <UploadCloud size={14} /> Subir
              </button>
              <button
                onClick={() => setActiveTab('links')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  background: activeTab === 'links' ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === 'links' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'links' ? 'var(--shadow-sm)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Share2 size={14} /> Compartidos
              </button>
            </div>

            <button
              onClick={handleSimulateUpload}
              disabled={uploading}
              className="btn-primary btn-shine"
              style={{ padding: '6px 14px', fontSize: '0.825rem', borderRadius: 'var(--radius-sm)' }}
            >
              <UploadCloud size={14} /> {uploading ? 'Subiendo...' : '+ Subir Archivo'}
            </button>
          </div>

          {/* Progress bar if simulating upload */}
          {uploading && (
            <div style={{ padding: '10px 20px', background: 'var(--primary-light)', borderBottom: '1px solid var(--accent-indigo-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px' }}>
                <span>Subiendo objeto al almacenamiento en la nube...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'var(--accent-indigo-border)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
                <div className="progress-stripes" style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.25s ease' }} />
              </div>
            </div>
          )}

          {/* Tab 1: Files Grid */}
          {activeTab === 'files' && (
            <div className="mock-tab-panel" style={{ padding: '20px', minHeight: '260px', background: 'var(--bg-card)' }}>
              <div className="mockup-files-grid">
                {simulatedFiles.map((file, index) => {
                  const IconComp = file.icon;
                  return (
                    <div
                      key={file.id}
                      className="mock-file"
                      style={{
                        '--d': `${Math.min(index, 6) * 90 + 1300}ms`,
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-sm)',
                            background: file.bg,
                            color: file.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <IconComp size={20} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {file.name}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{file.size} • {file.updated}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.72rem', color: file.shared ? 'var(--accent-sky)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                          {file.shared ? <Share2 size={11} /> : <Lock size={11} />}
                          {file.shared ? 'Compartido' : 'Privado'}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            title="Copiar enlace"
                            onClick={handleCopyDemoLink}
                            style={{ padding: '4px', borderRadius: 'var(--radius-xs)', color: 'var(--text-muted)' }}
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            title="Descargar"
                            style={{ padding: '4px', borderRadius: 'var(--radius-xs)', color: 'var(--text-muted)' }}
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {copiedLink && (
                <div style={{ marginTop: '12px', padding: '8px 12px', background: 'var(--success-bg)', border: '1px solid var(--success-light)', borderRadius: 'var(--radius-sm)', color: 'var(--success-dark)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} color="var(--success)" /> ¡Enlace copiado al portapapeles!
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Upload Dropzone */}
          {activeTab === 'upload' && (
            <div className="mock-tab-panel" style={{ padding: '24px', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                onClick={handleSimulateUpload}
                className="dropzone"
                style={{
                  width: '100%',
                  maxWidth: '480px',
                  border: '2px dashed var(--border-hover)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '28px 20px',
                  background: 'var(--bg-subtle)',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <div className="dropzone-icon" style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
                  <UploadCloud size={24} />
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Arrastra tus archivos aquí o haz clic para subir
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Soporta documentos, fotos, videos y archivos comprimidos
                </p>
                <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.825rem' }}>
                  {uploading ? 'Subiendo...' : 'Simular subida rápida'}
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Shared Links */}
          {activeTab === 'links' && (
            <div className="mock-tab-panel" style={{ padding: '20px', minHeight: '260px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="mock-link-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ padding: '6px', borderRadius: 'var(--radius-xs)', background: 'var(--accent-sky-bg)', color: 'var(--accent-sky)' }}>
                      <Share2 size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Presentacion_Ejecutiva_2026.pdf</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Solo lectura • abierto 24 veces</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 'var(--radius-xs)' }}>
                      Con Contraseña
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--warning-strong)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={12} /> Expira en 24h
                    </span>
                  </div>
                </div>

                <div className="mock-link-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ padding: '6px', borderRadius: 'var(--radius-xs)', background: 'var(--accent-violet-bg)', color: 'var(--accent-violet)' }}>
                      <Share2 size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Render_Comercial_3D.zip</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Editor • con contraseña</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'var(--success-bg)', color: 'var(--success-hover)', padding: '2px 8px', borderRadius: 'var(--radius-xs)' }}>
                    Público Activo
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;