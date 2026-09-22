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
    { id: 1, name: 'Reporte_Financiero_Q3.pdf', type: 'pdf', size: '4.2 MB', updated: 'Hace 10 min', shared: true, icon: FileText, color: '#ef4444', bg: '#fef2f2' },
    { id: 2, name: 'Brand_Assets_2026.zip', type: 'zip', size: '148.5 MB', updated: 'Hace 2 horas', shared: true, icon: HardDrive, color: '#f59e0b', bg: '#fffbeb' },
    { id: 3, name: 'Video_Demo_Producto.mp4', type: 'video', size: '520.0 MB', updated: 'Ayer', shared: false, icon: Video, color: '#8b5cf6', bg: '#f5f3ff' },
    { id: 4, name: 'Nimbox_Architecture_v2.png', type: 'image', size: '8.1 MB', updated: 'Hace 3 días', shared: true, icon: ImageIcon, color: '#06b6d4', bg: '#ecfeff' }
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
            color: '#10b981',
            bg: '#ecfdf5'
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
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
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
              background: '#eef2ff',
              color: '#4f46e5',
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
            color: '#0f172a',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            maxWidth: '900px',
            margin: '0 auto 1.25rem auto',
          }}
        >
          Tu almacenamiento,<br />
          <span
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
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
            color: '#64748b',
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
            color: '#64748b',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: '3.5rem',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} color="#10b981" /> 10 GB en Plan Básico
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} color="#10b981" /> Cifrado en reposo AES-256
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} color="#10b981" /> SLA garantizado 99.99%
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
            boxShadow: '0 25px 50px -12px rgba(79, 70, 229, 0.15), 0 0 0 1px #e2e8f0',
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
              background: '#f8fafc',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '10px', fontFamily: 'monospace' }}>
                app.nimbox.com/dashboard
              </span>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#10b981',
                background: '#ecfdf5',
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
              borderBottom: '1px solid #f1f5f9',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
              <button
                onClick={() => setActiveTab('files')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  background: activeTab === 'files' ? '#ffffff' : 'transparent',
                  color: activeTab === 'files' ? '#4f46e5' : '#64748b',
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
                  color: activeTab === 'upload' ? '#4f46e5' : '#64748b',
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
                  color: activeTab === 'links' ? '#4f46e5' : '#64748b',
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
            <div style={{ padding: '10px 20px', background: '#eef2ff', borderBottom: '1px solid #e0e7ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600, marginBottom: '4px' }}>
                <span>Subiendo objeto al almacenamiento en la nube...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: '#c7d2fe', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#4f46e5', transition: 'width 0.2s ease' }} />
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
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
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
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {file.name}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{file.size} • {file.updated}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.72rem', color: file.shared ? '#0284c7' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                          {file.shared ? <Share2 size={11} /> : <Lock size={11} />}
                          {file.shared ? 'Compartido' : 'Privado'}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            title="Copiar enlace"
                            onClick={handleCopyDemoLink}
                            style={{ padding: '4px', borderRadius: '4px', color: '#64748b' }}
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            title="Descargar"
                            style={{ padding: '4px', borderRadius: '4px', color: '#64748b' }}
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
                <div style={{ marginTop: '12px', padding: '8px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} color="#10b981" /> ¡Enlace copiado al portapapeles!
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
                  border: '2px dashed #cbd5e1',
                  borderRadius: '16px',
                  padding: '28px 20px',
                  background: '#f8fafc',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
                  <UploadCloud size={24} />
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  Arrastra tus archivos aquí o haz clic para subir
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '6px', borderRadius: '6px', background: '#e0f2fe', color: '#0284c7' }}>
                      <Share2 size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Presentacion_Ejecutiva_2026.pdf</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>https://nimbox.com/s/x98a21f • 24 descargas</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '6px' }}>
                      Con Contraseña
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={12} /> Expira en 24h
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '6px', borderRadius: '6px', background: '#f5f3ff', color: '#7c3aed' }}>
                      <Share2 size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Render_Comercial_3D.zip</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>https://nimbox.com/s/k39c09d • 108 descargas</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '6px' }}>
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
