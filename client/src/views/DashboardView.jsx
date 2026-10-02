import React, { useState, useEffect } from 'react';
import { 
  Cloud, HardDrive, Upload, FolderPlus, Share2, LogOut, Search, 
  FileText, Image as ImageIcon, Video, FileCode, Archive, Trash2, Download, 
  CheckCircle, Shield, MoreVertical, Plus, Clock, ExternalLink, Loader2,
  Eye, LayoutGrid, List, Music, Sparkles, RotateCcw
} from 'lucide-react';
import { filesService, getRetentionDays } from '../services/filesService.js';
import { FilePreviewModal } from '../components/files/FilePreviewModal.jsx';
import { VersionHistoryModal } from '../components/files/VersionHistoryModal.jsx';

export const DashboardView = ({ currentUser, onLogout, onNotification }) => {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'docs' | 'images' | 'media' | 'trash'
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // Papelera
  const [trashFiles, setTrashFiles] = useState([]);
  const [isLoadingTrash, setIsLoadingTrash] = useState(false);

  // Modal de vista previa
  const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Modal de historial de versiones
  const [selectedVersionFile, setSelectedVersionFile] = useState(null);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);

  const planName = currentUser?.plan || 'Pro';
  const storageQuota = currentUser?.storageQuota || '500 GB';
  const retentionDays = getRetentionDays(planName);
  const isTrash = activeTab === 'trash';

  // Cargar archivos del usuario desde Supabase (y purgar la papelera vencida)
  useEffect(() => {
    async function loadFiles() {
      setIsLoadingFiles(true);
      try {
        await filesService.purgeExpiredTrash(currentUser?.id, retentionDays);
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

  // Cargar la papelera cuando se abre la pestaña
  useEffect(() => {
    if (!isTrash) return;
    async function loadTrash() {
      setIsLoadingTrash(true);
      try {
        const data = await filesService.getTrashFiles(currentUser?.id, retentionDays);
        setTrashFiles(data);
      } catch (err) {
        console.error('Error al cargar la papelera:', err);
      } finally {
        setIsLoadingTrash(false);
      }
    }
    loadTrash();
  }, [isTrash, currentUser?.id]);

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

      if (newFile.isNewVersion) {
        // Ya existía: se reemplaza en la lista y se sube al inicio
        setFiles(prev => [newFile, ...prev.filter(f => f.id !== newFile.id)]);
        onNotification && onNotification(`Se guardó una nueva versión de "${uploadedFile.name}". La anterior está en el historial.`, 'success');
      } else {
        setFiles(prev => [newFile, ...prev]);
        onNotification && onNotification(`Archivo "${uploadedFile.name}" subido y guardado exitosamente en la nube.`, 'success');
      }

      // Abrir vista previa automáticamente tras subir el archivo
      setSelectedPreviewFile(newFile);
      setIsPreviewOpen(true);
    } catch (err) {
      onNotification && onNotification(`Error al subir el archivo: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Abrir vista previa
  const handleOpenPreview = (file) => {
    setSelectedPreviewFile(file);
    setIsPreviewOpen(true);
  };

  // Abrir historial de versiones
  const handleOpenVersions = (file, e) => {
    e && e.stopPropagation();
    setSelectedVersionFile(file);
    setIsVersionsOpen(true);
  };

  // Cuando se restaura una versión, actualizar el archivo en la lista
  const handleVersionRestored = (updatedFile) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    if (selectedPreviewFile?.id === updatedFile.id) {
      setSelectedPreviewFile(updatedFile);
    }
  };

  // Descargar archivo real
  const handleDownloadFile = async (file) => {
    try {
      onNotification && onNotification(`Descargando copia de "${file.name}"...`, 'info');
      await filesService.downloadFile(file.file_path, file.name);
      onNotification && onNotification(`Archivo "${file.name}" descargado con éxito.`, 'success');
    } catch (err) {
      onNotification && onNotification(`Error al descargar: ${err.message}`, 'error');
    }
  };

  // Mover archivo a la papelera
  const handleDeleteFile = async (id, name, filePath, e) => {
    e && e.stopPropagation();
    try {
      await filesService.moveToTrash(id);
      setFiles(prev => prev.filter(f => f.id !== id));
      if (selectedPreviewFile?.id === id) {
        setIsPreviewOpen(false);
      }
      const aviso = retentionDays
        ? `Podrás restaurarlo durante ${retentionDays} días.`
        : 'Podrás restaurarlo cuando quieras.';
      onNotification && onNotification(`"${name}" se movió a la papelera. ${aviso}`, 'info');
    } catch (err) {
      onNotification && onNotification(`Error al mover a la papelera: ${err.message}`, 'error');
    }
  };

  // Restaurar archivo desde la papelera
  const handleRestoreFromTrash = async (file) => {
    try {
      await filesService.restoreFromTrash(file.id);
      setTrashFiles(prev => prev.filter(f => f.id !== file.id));
      const { deleted, daysLeft, ...restoredFile } = file;
      setFiles(prev => [{ ...restoredFile, deleted_at: null }, ...prev]);
      onNotification && onNotification(`"${file.name}" fue restaurado.`, 'success');
    } catch (err) {
      onNotification && onNotification(`Error al restaurar: ${err.message}`, 'error');
    }
  };

  // Eliminar definitivamente desde la papelera
  const handlePermanentDelete = async (file) => {
    if (!window.confirm(`¿Eliminar "${file.name}" definitivamente? Esta acción no se puede deshacer y también se borrarán sus versiones anteriores.`)) return;
    try {
      await filesService.deletePermanently(currentUser?.id, file.id, file.file_path);
      setTrashFiles(prev => prev.filter(f => f.id !== file.id));
      onNotification && onNotification(`"${file.name}" se eliminó definitivamente.`, 'info');
    } catch (err) {
      onNotification && onNotification(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  // Cambiar compartir
  const handleToggleShare = async (id, currentShared, e) => {
    e && e.stopPropagation();
    setFiles(prev => prev.map(f => f.id === id ? { ...f, shared: !currentShared } : f));
    await filesService.toggleShareFile(id, currentShared);
    onNotification && onNotification(`Permisos de compartido actualizados.`, 'success');
  };

  const getFileIcon = (type, ext) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={20} color="var(--accent-cyan)" />;
      case 'video':
        return <Video size={20} color="var(--accent-purple)" />;
      case 'audio':
        return <Music size={20} color="var(--primary)" />;
      case 'zip':
      case 'archive':
        return <Archive size={20} color="var(--warning)" />;
      case 'code':
        return <FileCode size={20} color="var(--success-hover)" />;
      default:
        return <FileText size={20} color="var(--primary)" />;
    }
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' ? true : f.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const filteredTrash = trashFiles.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              Tu cuenta está suscrita al <strong>Plan {planName}</strong> con <strong>{storageQuota}</strong> de capacidad disponible para almacenar, sincronizar, previsualizar y compartir.
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
              { id: 'media', label: 'Multimedia' },
              { id: 'trash', label: 'Papelera', icon: <Trash2 size={14} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === tab.id
                    ? (tab.id === 'trash' ? 'var(--danger)' : 'var(--primary)')
                    : 'transparent',
                  color: activeTab === tab.id ? 'var(--text-white)' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search, View Mode & Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View Mode Toggle (la papelera siempre se muestra en lista) */}
            {!isTrash && (
              <div
                style={{
                  display: 'flex',
                  background: 'var(--bg-card)',
                  padding: '3px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  gap: '2px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '6px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'list' ? 'var(--primary-light)' : 'transparent',
                    color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-muted)',
                    display: 'flex'
                  }}
                  title="Vista de lista"
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: '6px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'grid' ? 'var(--primary-light)' : 'transparent',
                    color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)',
                    display: 'flex'
                  }}
                  title="Vista de cuadrícula"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            )}

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={isTrash ? 'Buscar en la papelera...' : 'Buscar archivos...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 34px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-body)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '180px'
                }}
              />
              <Search size={16} color="var(--text-light)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Real File Input for Supabase Storage Upload */}
            {!isTrash && (
              <label
                className="btn-primary"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
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
            )}
          </div>
        </div>

        {/* Aviso de retención de la papelera */}
        {isTrash && (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--text-main)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1.25rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <Clock size={18} color="var(--danger)" />
            <span>
              {retentionDays
                ? <>Los archivos en la papelera se eliminan definitivamente después de <strong>{retentionDays} días</strong> (Plan {planName}).</>
                : <>Tu Plan {planName} conserva los archivos de la papelera <strong>sin límite de tiempo</strong>.</>}
            </span>
          </div>
        )}

        {/* Files Container (Table / Grid) */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {isTrash ? (
            /* TRASH VIEW */
            isLoadingTrash ? (
              <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={36} style={{ margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cargando papelera...</p>
              </div>
            ) : filteredTrash.length === 0 ? (
              <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Trash2 size={44} style={{ margin: '0 auto 12px auto', opacity: 0.35 }} />
                <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>La papelera está vacía</h4>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>Los archivos que elimines aparecerán aquí y podrás restaurarlos.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Nombre del archivo</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tamaño</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Eliminado</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Se borra en</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrash.map((file) => (
                    <tr key={file.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-hover)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            opacity: 0.6
                          }}
                        >
                          {getFileIcon(file.type, file.ext)}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {file.size}
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {file.deleted}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            color: file.daysLeft !== null && file.daysLeft <= 3 ? 'var(--danger)' : 'var(--text-muted)',
                            background: file.daysLeft !== null && file.daysLeft <= 3 ? 'var(--danger-bg)' : 'var(--bg-hover)'
                          }}
                        >
                          {file.daysLeft === null
                            ? 'Sin límite'
                            : file.daysLeft === 0
                              ? 'Hoy'
                              : `${file.daysLeft} ${file.daysLeft === 1 ? 'día' : 'días'}`}
                        </span>
                      </td>

                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          {/* Botón Restaurar */}
                          <button
                            type="button"
                            onClick={() => handleRestoreFromTrash(file)}
                            style={{
                              padding: '7px 10px',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--primary)',
                              background: 'var(--primary-light)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.8rem',
                              fontWeight: 700
                            }}
                            title="Restaurar archivo"
                          >
                            <RotateCcw size={16} />
                            <span>Restaurar</span>
                          </button>

                          {/* Botón Eliminar definitivamente */}
                          <button
                            type="button"
                            onClick={() => handlePermanentDelete(file)}
                            style={{
                              padding: '7px 10px',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--danger)',
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.8rem',
                              fontWeight: 700
                            }}
                            title="Eliminar definitivamente"
                          >
                            <Trash2 size={16} />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : isLoadingFiles ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={36} style={{ margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cargando archivos desde Supabase...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Cloud size={44} style={{ margin: '0 auto 12px auto', opacity: 0.35 }} />
              <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>No se encontraron archivos</h4>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>Sube tu primer archivo o ajusta tus filtros para comenzar.</p>
            </div>
          ) : viewMode === 'list' ? (
            /* LIST VIEW TABLE */
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
                      transition: 'background 0.15s',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleOpenPreview(file)}
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
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {getFileIcon(file.type, file.ext)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Eye size={11} /> Clic para vista previa
                        </span>
                      </div>
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
                        onClick={(e) => handleToggleShare(file.id, file.shared, e)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      >
                        {file.shared ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Share2 size={11} /> Compartido
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Shield size={11} /> Privado
                          </span>
                        )}
                      </button>
                    </td>

                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        {/* Botón Vista Previa con Ojo */}
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(file)}
                          style={{
                            padding: '7px 10px',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--primary)',
                            background: 'var(--primary-light)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--primary)';
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--primary-light)';
                            e.currentTarget.style.color = 'var(--primary)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title="Vista previa del archivo"
                          aria-label="Vista previa"
                        >
                          <Eye size={16} />
                          <span>Ver</span>
                        </button>

                        {/* Botón Historial de versiones */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenVersions(file, e)}
                          style={{
                            padding: '7px 9px',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-muted)',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--primary)';
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title="Historial de versiones"
                          aria-label="Historial de versiones"
                        >
                          <Clock size={16} />
                        </button>

                        {/* Botón Descargar */}
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(file)}
                          style={{
                            padding: '7px 9px',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-muted)',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--primary)';
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title="Descargar archivo"
                          aria-label="Descargar"
                        >
                          <Download size={16} />
                        </button>

                        {/* Botón Eliminar (mover a papelera) */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFile(file.id, file.name, file.file_path, e)}
                          style={{
                            padding: '7px 9px',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--danger)',
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--danger)';
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                            e.currentTarget.style.color = 'var(--danger)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title="Mover a la papelera"
                          aria-label="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* GRID VIEW CARDS */
            <div
              style={{
                padding: '1.5rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '16px'
              }}
            >
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleOpenPreview(file)}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {getFileIcon(file.type, file.ext)}
                      </div>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-xs)'
                        }}
                      >
                        {file.ext || file.type}
                      </span>
                    </div>

                    <h4
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        margin: '0 0 4px 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={file.name}
                    >
                      {file.name}
                    </h4>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      {file.size} · {file.updated}
                    </p>
                  </div>

                  <div
                    style={{
                      marginTop: '1.25rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(file)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0
                      }}
                    >
                      <Eye size={13} /> Vista previa
                    </button>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={(e) => handleOpenVersions(file, e)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                        title="Historial de versiones"
                      >
                        <Clock size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(file)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                        title="Descargar"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteFile(file.id, file.name, file.file_path, e)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px' }}
                        title="Mover a la papelera"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL DE VISTA PREVIA INTERACTIVA */}
      <FilePreviewModal
        file={selectedPreviewFile}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onNotification={onNotification}
      />

      {/* MODAL DE HISTORIAL DE VERSIONES */}
      <VersionHistoryModal
        file={selectedVersionFile}
        isOpen={isVersionsOpen}
        onClose={() => setIsVersionsOpen(false)}
        currentUser={currentUser}
        onNotification={onNotification}
        onRestored={handleVersionRestored}
      />
    </div>
  );
};

export default DashboardView;