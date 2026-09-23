import React, { useState } from 'react';
import { 
  Cloud, HardDrive, Upload, FolderPlus, Share2, LogOut, Search, 
  FileText, Image as ImageIcon, Video, FileCode, Archive, Trash2, Download, 
  CheckCircle, Shield, MoreVertical, Plus, Clock, ExternalLink
} from 'lucide-react';

export const DashboardView = ({ currentUser, onLogout, onNotification }) => {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'docs' | 'images' | 'media'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Initial Mock Files
  const [files, setFiles] = useState([
    {
      id: 1,
      name: 'Presentacion_Proyecto_Nimbox.pdf',
      type: 'pdf',
      size: '4.2 MB',
      updated: 'Hace 10 minutos',
      category: 'docs',
      shared: true
    },
    {
      id: 2,
      name: 'Arquitectura_Seguridad_SSL.docx',
      type: 'doc',
      size: '1.8 MB',
      updated: 'Hace 2 horas',
      category: 'docs',
      shared: false
    },
    {
      id: 3,
      name: 'Mockup_Diseño_UI_Figma.png',
      type: 'image',
      size: '12.4 MB',
      updated: 'Ayer',
      category: 'images',
      shared: true
    },
    {
      id: 4,
      name: 'Video_Demostracion_SaaS.mp4',
      type: 'video',
      size: '84.5 MB',
      updated: 'Hace 3 días',
      category: 'media',
      shared: false
    },
    {
      id: 5,
      name: 'Respaldo_Base_Datos_SQL.zip',
      type: 'zip',
      size: '142.0 MB',
      updated: 'Hace 5 días',
      category: 'docs',
      shared: false
    }
  ]);

  const planName = currentUser?.plan || 'Pro';
  const storageQuota = currentUser?.storageQuota || '500 GB';
  const usedStorage = '244.9 MB';
  const percentUsed = 1.2;

  // Simulate file upload
  const handleSimulateUpload = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const newFile = {
      id: Date.now(),
      name: uploadedFile.name,
      type: uploadedFile.name.endsWith('.png') || uploadedFile.name.endsWith('.jpg') ? 'image' : 'doc',
      size: `${(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB`,
      updated: 'Ahora mismo',
      category: 'docs',
      shared: false
    };

    setFiles([newFile, ...files]);
    onNotification && onNotification(`Archivo "${uploadedFile.name}" subido y cifrado exitosamente en la nube.`, 'success');
  };

  const handleDeleteFile = (id, name) => {
    setFiles(files.filter(f => f.id !== id));
    onNotification && onNotification(`Archivo "${name}" eliminado.`, 'info');
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={20} color="var(--accent-cyan)" />;
      case 'video':
        return <Video size={20} color="var(--accent-purple)" />;
      case 'zip':
        return <Archive size={20} color="var(--warning)" />;
      default:
        return <FileText size={20} color="var(--primary)" />;
    }
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' ? true : f.category === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header
        style={{
          background: 'var(--bg-body)',
          borderBottom: '1px solid var(--border-color)',
          padding: '0.85rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-white)',
                boxShadow: 'var(--shadow-glow-primary)'
              }}
            >
              <Cloud size={20} />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              Nimbox<span style={{ color: 'var(--primary)' }}>.</span>
            </span>
          </div>

          <span
            style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)'
            }}
          >
            Plan {planName} ({storageQuota})
          </span>
        </div>

        {/* User Info & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'right' }}>
            <div style={{ display: 'none', flexDirection: 'column', mdDisplay: 'flex' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {currentUser?.name || 'Usuario Nimbox'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {currentUser?.email || 'usuario@nimbox.com'}
              </span>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                border: '2px solid var(--text-white)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {(currentUser?.name || currentUser?.email || 'U')[0].toUpperCase()}
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="btn-secondary"
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              gap: '6px'
            }}
          >
            <LogOut size={15} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Workspace */}
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Welcome Banner */}
        <div
          style={{
            background: 'var(--bg-hero-banner)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            color: 'var(--text-white)',
            marginBottom: '2rem',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ background: 'var(--white-alpha-20)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', fontSize: '0.75rem', fontWeight: 600 }}>
                ESPACIO ACTIVO
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--success-light)' }}>
                <Shield size={14} /> Cifrado Zero-Knowledge Activado
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>
              ¡Bienvenido a tu nube, {currentUser?.name || 'Cliente'}!
            </h2>
            <p style={{ opacity: 0.85, fontSize: '0.9rem', maxWidth: '520px' }}>
              Tu cuenta está suscrita al <strong>Plan {planName}</strong> con <strong>{storageQuota}</strong> de capacidad disponible para almacenar, sincronizar y compartir.
            </p>
          </div>

          {/* Storage Quota Card inside banner */}
          <div
            style={{
              background: 'var(--white-alpha-15)',
              backdropFilter: 'blur(10px)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              border: '1px solid var(--white-alpha-20)',
              minWidth: '240px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
              <span>Almacenamiento en uso</span>
              <span style={{ fontWeight: 700 }}>{usedStorage} / {storageQuota}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--white-alpha-25)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ width: `${percentUsed}%`, height: '100%', background: 'var(--success)', borderRadius: 'var(--radius-full)' }} />
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.725rem', opacity: 0.8, textAlign: 'right' }}>
              {(100 - percentUsed).toFixed(1)}% disponible
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '1.5rem'
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-card)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              gap: '4px'
            }}
          >
            {[
              { id: 'all', label: 'Todos los archivos' },
              { id: 'docs', label: 'Documentos' },
              { id: 'images', label: 'Imágenes' },
              { id: 'media', label: 'Multimedia' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--text-white)' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar archivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 34px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-body)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '200px'
                }}
              />
              <Search size={16} color="var(--text-light)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Hidden File Input for Simulated Upload */}
            <label
              className="btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                margin: 0
              }}
            >
              <Upload size={16} /> Subir Archivo
              <input
                type="file"
                onChange={handleSimulateUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* Files Table / List */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {filteredFiles.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Cloud size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>No se encontraron archivos</p>
              <p style={{ fontSize: '0.825rem' }}>Sube tu primer archivo para comenzar a respaldar en la nube.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Nombre del archivo</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tamaño</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Última modificación</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Estado</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file) => (
                  <tr
                    key={file.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
                  >
                    <td style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-hover)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {getFileIcon(file.type)}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {file.name}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {file.size}
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {file.updated}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      {file.shared ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Share2 size={11} /> Compartido
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Shield size={11} /> Privado
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => onNotification && onNotification(`Descargando copia cifrada de "${file.name}"...`, 'info')}
                          style={{
                            padding: '6px',
                            borderRadius: 'var(--radius-xs)',
                            color: 'var(--text-muted)',
                            background: 'transparent'
                          }}
                          title="Descargar archivo"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id, file.name)}
                          style={{
                            padding: '6px',
                            borderRadius: 'var(--radius-xs)',
                            color: 'var(--danger)',
                            background: 'transparent'
                          }}
                          title="Eliminar archivo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardView;
