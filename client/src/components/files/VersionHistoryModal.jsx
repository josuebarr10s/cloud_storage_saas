import React, { useState, useEffect } from 'react';
import { X, Clock, Download, RotateCcw, Loader2, FileText, CheckCircle } from 'lucide-react';
import { filesService } from '../../services/filesService.js';

export const VersionHistoryModal = ({ file, isOpen, onClose, currentUser, onNotification, onRestored }) => {
  const [currentFile, setCurrentFile] = useState(file);
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  // Cargar versiones cada vez que se abre el modal
  useEffect(() => {
    async function loadVersions() {
      if (!isOpen || !file) return;
      setCurrentFile(file);
      setIsLoading(true);
      try {
        const data = await filesService.getVersions(file.id);
        setVersions(data);
      } catch (err) {
        onNotification && onNotification('No se pudo cargar el historial de versiones.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    loadVersions();
  }, [isOpen, file?.id]);

  if (!isOpen || !file || !currentFile) return null;

  const handleDownloadVersion = async (version) => {
    try {
      onNotification && onNotification(`Descargando versión del ${version.date}...`, 'info');
      await filesService.downloadFile(version.file_path, currentFile.name);
    } catch (err) {
      onNotification && onNotification(`Error al descargar: ${err.message}`, 'error');
    }
  };

  const handleRestoreVersion = async (version) => {
    if (!window.confirm(`¿Restaurar la versión del ${version.date}? La versión actual se guardará en el historial.`)) return;

    setRestoringId(version.id);
    try {
      const updatedFile = await filesService.restoreVersion(currentUser?.id, currentFile, version);
      setCurrentFile(updatedFile);
      setVersions(await filesService.getVersions(currentFile.id));
      onRestored && onRestored(updatedFile);
      onNotification && onNotification(`Versión del ${version.date} restaurada correctamente.`, 'success');
    } catch (err) {
      onNotification && onNotification(`Error al restaurar: ${err.message}`, 'error');
    } finally {
      setRestoringId(null);
    }
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)'
  };

  const iconButtonStyle = {
    padding: '7px 9px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.8rem',
    fontWeight: 600
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Clock size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Historial de versiones
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentFile.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Versión actual */}
          <div style={{ ...rowStyle, background: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={18} color="var(--primary)" />
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', display: 'block' }}>
                  Versión actual
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {currentFile.size} · {currentFile.updated}
                </span>
              </div>
            </div>
          </div>

          {/* Versiones anteriores */}
          {isLoading ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={28} style={{ margin: '0 auto 8px auto', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '0.85rem', margin: 0 }}>Cargando versiones...</p>
            </div>
          ) : versions.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={32} style={{ margin: '0 auto 8px auto', opacity: 0.35 }} />
              <p style={{ fontSize: '0.85rem', margin: 0 }}>
                Este archivo aún no tiene versiones anteriores.<br />
                Sube un archivo con el mismo nombre para crear una nueva versión.
              </p>
            </div>
          ) : (
            versions.map((version, index) => (
              <div key={version.id} style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={18} color="var(--text-muted)" />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)', display: 'block' }}>
                      Versión {versions.length - index}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {version.size} · {version.date}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleDownloadVersion(version)}
                    style={iconButtonStyle}
                    title="Descargar esta versión"
                  >
                    <Download size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRestoreVersion(version)}
                    disabled={restoringId !== null}
                    style={{
                      ...iconButtonStyle,
                      color: 'var(--primary)',
                      background: 'var(--primary-light)',
                      borderColor: 'var(--primary)',
                      opacity: restoringId !== null && restoringId !== version.id ? 0.5 : 1,
                      cursor: restoringId !== null ? 'not-allowed' : 'pointer'
                    }}
                    title="Restaurar esta versión"
                  >
                    {restoringId === version.id
                      ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      : <RotateCcw size={15} />}
                    <span>Restaurar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;