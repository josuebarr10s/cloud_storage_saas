import React, { useState, useEffect } from 'react';
import { 
  Cloud, HardDrive, Upload, FolderPlus, Share2, LogOut, Search, 
  FileText, Image as ImageIcon, Video, FileCode, Archive, Trash2, Download, 
  CheckCircle, Shield, MoreVertical, Plus, Clock, ExternalLink, Loader2
} from 'lucide-react';
import { filesService } from '../services/filesService.js';

export const DashboardView = ({ currentUser, onLogout, onNotification }) => {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'docs' | 'images' | 'media'
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Cargar archivos del usuario desde Supabase
  useEffect(() => {
    async function loadFiles() {
      setIsLoadingFiles(true);
      try {
        const userFiles = await filesService.getUserFiles(currentUser?.id);
        setFiles(userFiles);
      } catch (err) {
        console.error('Error al cargar archivos de Supabase:', err);
      } finally {
        setIsLoadingFiles(false);
      }
    }
    loadFiles();
  }, [currentUser?.id]);

  const planName = currentUser?.plan || 'Pro';
  const storageQuota = currentUser?.storageQuota || '500 GB';

  // Calcular almacenamiento usado dinámicamente
  const totalBytes = files.reduce((acc, file) => acc + (file.size_bytes || 0), 0);
  const usedStorage = totalBytes > 0 
    ? (totalBytes > 1024 * 1024 * 1024 
        ? `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB` 
        : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`)
    : '0 MB';

  // Quota percentage calculation (assuming 500GB default or 10GB for Basic)
  const quotaBytes = planName.toLowerCase().includes('básico') 
    ? 10 * 1024 * 1024 * 1024 
    : 500 * 1024 * 1024 * 1024;
  const percentUsed = Math.min(100, Math.max(0.1, ((totalBytes / quotaBytes) * 100).toFixed(1)));

  // Subida real de archivos a Supabase Storage y BD
  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setIsUploading(true);
    onNotification && onNotification(`Subiendo "${uploadedFile.name}" a Supabase Storage...`, 'info');

    try {
      const newFile = await filesService.uploadFile(currentUser?.id, uploadedFile);
      setFiles(prev => [newFile, ...prev]);
      onNotification && onNotification(`Archivo "${uploadedFile.name}" subido y guardado exitosamente en la nube.`, 'success');
    } catch (err) {
      onNotification && onNotification(`Error al subir el archivo: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Eliminación de archivo en Supabase BD y Storage
  const handleDeleteFile = async (id, name, filePath) => {
    try {
      setFiles(prev => prev.filter(f => f.id !== id));
      await filesService.deleteFile(currentUser?.id, id, filePath);
      onNotification && onNotification(`Archivo "${name}" eliminado.`, 'info');
    } catch (err) {
      onNotification && onNotification(`Error al eliminar archivo`, 'error');
    }
  };

  // Cambiar compartir
  const handleToggleShare = async (id, currentShared) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, shared: !currentShared } : f));
    await filesService.toggleShareFile(id, currentShared);
    onNotification && onNotification(`Permisos de compartido actualizados.`, 'success');
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={20} color="#06b6d4" />;
      case 'video':
        return <Video size={20} color="#8b5cf6" />;
      case 'zip':
        return <Archive size={20} color="#f59e0b" />;
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
          background: '#ffffff',
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
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-violet) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
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
              borderRadius: '9999px'
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
                borderRadius: '50%',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                border: '2px solid #ffffff',
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
              borderRadius: '8px',
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
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
            borderRadius: '20px',
            padding: '2rem',
            color: '#ffffff',
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
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                ESPACIO ACTIVO
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#a7f3d0' }}>
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
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              borderRadius: '14px',
              padding: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              minWidth: '240px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
              <span>Almacenamiento en uso</span>
              <span style={{ fontWeight: 700 }}>{usedStorage} / {storageQuota}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.25)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: `${percentUsed}%`, height: '100%', background: '#10b981', borderRadius: '9999px' }} />
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
              background: '#ffffff',
              padding: '4px',
              borderRadius: '12px',
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
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
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
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '200px'
                }}
              />
              <Search size={16} color="var(--text-light)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Real File Input for Supabase Storage Upload */}
            <label
              className="btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                borderRadius: '10px',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                opacity: isUploading ? 0.7 : 1,
                margin: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isUploading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
              {isUploading ? 'Subiendo...' : 'Subir Archivo'}
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={isUploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* Files Table / List */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {isLoadingFiles ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={36} style={{ margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cargando archivos desde Supabase...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
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
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                  >
                    <td style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
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
                      <button
                        type="button"
                        onClick={() => handleToggleShare(file.id, file.shared)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      >
                        {file.shared ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Share2 size={11} /> Compartido
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Shield size={11} /> Privado
                          </span>
                        )}
                      </button>
                    </td>

                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => onNotification && onNotification(`Descargando copia cifrada de "${file.name}"...`, 'info')}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            color: 'var(--text-muted)',
                            background: 'transparent',
                            cursor: 'pointer'
                          }}
                          title="Descargar archivo"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id, file.name, file.file_path)}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            color: 'var(--danger)',
                            background: 'transparent',
                            cursor: 'pointer'
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
