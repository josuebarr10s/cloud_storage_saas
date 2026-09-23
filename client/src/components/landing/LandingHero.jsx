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
  Download
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
    <section
      style={{
        paddingTop: '7.5rem',
        paddingBottom: '4.5rem',
        background: 'linear-gradient(180deg, #ffffff 0%, var(--bg-subtle) 100%)',
        textAlign: 'center',
      }}
    >
      <div className="landing-container">
        {/* Pill Badge */}
        <div style={{ display: 'inline-flex', marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <Zap size={15} /> Nuevo: Comparte con fecha de vencimiento y contraseña
          </div>
        </div>

        {/* Hero Title */}
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.8rem)',
            fontWeight: 800,
            color: 'var(--text-main)',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            maxWidth: '900px',
            margin: '0 auto 1.25rem auto',
          }}
        >
          Tu almacenamiento,<br />
          <span
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-violet) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            sin límites reales.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '1.15rem',
            color: 'var(--text-muted)',
            maxWidth: '680px',
            margin: '0 auto 2.5rem auto',
            lineHeight: 1.6,
          }}
        >
          Nimbox guarda, sincroniza y organiza tus archivos en la nube con la máxima seguridad y velocidad. Accede desde cualquier dispositivo, en cualquier momento.
        </p>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '3.5rem',
          }}
        >
          <button
            onClick={onGetStartedClick}
            className="btn-primary"
            style={{ padding: '0.85rem 2rem', fontSize: '1rem', borderRadius: '12px' }}
          >
            Comenzar ahora <ArrowRight size={18} />
          </button>
          <button
            onClick={onLoginClick}
            className="btn-secondary"
            style={{ padding: '0.85rem 1.75rem', fontSize: '1rem', borderRadius: '12px' }}
          >
            Iniciar sesión
          </button>
        </div>

        {/* Trust Badges Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: '3.5rem',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} color="var(--success)" /> 10 GB en Plan Básico
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} color="var(--success)" /> Cifrado en reposo AES-256
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} color="var(--success)" /> SLA garantizado 99.99%
          </span>
        </div>

        {/* ==========================================================
            INTERACTIVE MOCKUP: Cloud Storage Preview (Figma Style)
            ========================================================== */}
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(79, 70, 229, 0.15), 0 0 0 1px var(--border-color)',
            overflow: 'hidden',
            textAlign: 'left',
          }}
        >
          {/* Mockup Titlebar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              background: 'var(--bg-subtle)',
              borderBottom: '1px solid var(--bg-hover)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--danger)' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--warning)' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginLeft: '10px', fontFamily: 'monospace' }}>
                app.nimbox.com/dashboard
              </span>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--success)',
                background: 'var(--success-bg)',
                padding: '2px 8px',
                borderRadius: '9999px',
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
              borderBottom: '1px solid var(--bg-hover)',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-hover)', padding: '4px', borderRadius: '10px' }}>
              <button
                onClick={() => setActiveTab('files')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  background: activeTab === 'files' ? '#ffffff' : 'transparent',
                  color: activeTab === 'files' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'files' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
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
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  background: activeTab === 'upload' ? '#ffffff' : 'transparent',
                  color: activeTab === 'upload' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
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
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  background: activeTab === 'links' ? '#ffffff' : 'transparent',
                  color: activeTab === 'links' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'links' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
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
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.825rem', borderRadius: '8px' }}
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
              <div style={{ width: '100%', height: '5px', background: 'var(--accent-indigo-border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s ease' }} />
              </div>
            </div>
          )}

          {/* Tab 1: Files Grid */}
          {activeTab === 'files' && (
            <div style={{ padding: '20px', minHeight: '260px', background: '#ffffff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '14px' }}>
                {simulatedFiles.map((file) => {
                  const IconComp = file.icon;
                  return (
                    <div
                      key={file.id}
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
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

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--bg-hover)' }}>
                        <span style={{ fontSize: '0.72rem', color: file.shared ? 'var(--accent-sky)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                          {file.shared ? <Share2 size={11} /> : <Lock size={11} />}
                          {file.shared ? 'Compartido' : 'Privado'}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            title="Copiar enlace"
                            onClick={handleCopyDemoLink}
                            style={{ padding: '4px', borderRadius: '4px', color: 'var(--text-muted)' }}
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            title="Descargar"
                            style={{ padding: '4px', borderRadius: '4px', color: 'var(--text-muted)' }}
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
                <div style={{ marginTop: '12px', padding: '8px 12px', background: 'var(--success-bg)', border: '1px solid var(--success-light)', borderRadius: '8px', color: 'var(--success-dark)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} color="var(--success)" /> ¡Enlace copiado al portapapeles!
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Upload Dropzone */}
          {activeTab === 'upload' && (
            <div style={{ padding: '24px', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                onClick={handleSimulateUpload}
                style={{
                  width: '100%',
                  maxWidth: '480px',
                  border: '2px dashed var(--border-hover)',
                  borderRadius: '16px',
                  padding: '28px 20px',
                  background: 'var(--bg-subtle)',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
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
            <div style={{ padding: '20px', minHeight: '260px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '6px', borderRadius: '6px', background: 'var(--accent-sky-bg)', color: 'var(--accent-sky)' }}>
                      <Share2 size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Presentacion_Ejecutiva_2026.pdf</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>https://nimbox.com/s/x98a21f • 24 descargas</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px' }}>
                      Con Contraseña
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--warning-strong)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={12} /> Expira en 24h
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '6px', borderRadius: '6px', background: 'var(--accent-violet-bg)', color: 'var(--accent-violet)' }}>
                      <Share2 size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Render_Comercial_3D.zip</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>https://nimbox.com/s/k39c09d • 108 descargas</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'var(--success-bg)', color: 'var(--success-hover)', padding: '2px 8px', borderRadius: '6px' }}>
                    Público Activo
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};