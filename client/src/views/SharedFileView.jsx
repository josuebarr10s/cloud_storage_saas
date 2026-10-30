import React, { useState, useEffect } from 'react';
import {
  FileText, Image as ImageIcon, Video, Music, Archive, FileCode,
  Eye, Download, ArrowLeft, Loader2, AlertCircle, LogOut, Lock, User
} from 'lucide-react';
import { sharingService } from '../services/sharingService.js';
import { filesService } from '../services/filesService.js';
import { FilePreviewModal } from '../components/files/FilePreviewModal.jsx';

const ICONS_BY_TYPE = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  zip: Archive,
  code: FileCode,
};

/**
 * Vista de un archivo que otro usuario compartió por enlace (solo lectura).
 * Se muestra a cualquier usuario con sesión, tenga plan o no.
 */
export const SharedFileView = ({ token, currentUser, onExit, onLogout, onNotification }) => {
  const [shared, setShared] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    async function openLink() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await sharingService.openSharedLink(token);
        if (result.isOwner) {
          onNotification && onNotification('Este enlace es de uno de tus archivos.', 'info');
          onExit();
          return;
        }
        setShared(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    openLink();
  }, [token]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await filesService.downloadFile(shared.file.file_path, shared.file.name);
    } catch (err) {
      onNotification && onNotification(`Error al descargar: ${err.message}`, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const FileIcon = ICONS_BY_TYPE[shared?.file?.type] || FileText;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '0.9rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-card)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.png" alt="Nimbox Logo" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
          <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Nimbox<span style={{ color: 'var(--primary)' }}>.</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser?.name}
          </span>
          <button type="button" className="btn-ghost" onClick={onLogout} title="Cerrar sesión" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div
          className="card-white"
          style={{ width: '100%', maxWidth: '460px', padding: '2rem 1.5rem', textAlign: 'center' }}
        >
          {isLoading ? (
            <div style={{ color: 'var(--text-muted)' }}>
              <Loader2 size={34} style={{ margin: '0 auto 10px auto', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Abriendo enlace compartido...</p>
            </div>
          ) : error ? (
            <>
              <AlertCircle size={42} color="var(--warning)" style={{ margin: '0 auto 12px auto' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                No se pudo abrir el enlace
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 1.5rem 0' }}>{error}</p>
              <button type="button" className="btn-secondary" onClick={onExit} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={16} /> Volver al inicio
              </button>
            </>
          ) : shared && (
            <>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px auto'
                }}
              >
                <FileIcon size={30} />
              </div>

              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px 0', wordBreak: 'break-word' }}>
                {shared.file.name}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                {shared.file.size} · {shared.file.updated}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '3px 10px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <User size={12} /> Compartido por {shared.ownerName}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '3px 10px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={12} /> Solo lectura
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
                <button type="button" className="btn-primary" onClick={() => setIsPreviewOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={16} /> Ver archivo
                </button>
                <button type="button" className="btn-secondary" onClick={handleDownload} disabled={isDownloading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {isDownloading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />}
                  Descargar
                </button>
              </div>

              <button type="button" className="btn-ghost" onClick={onExit} style={{ marginTop: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={16} /> Ir a Nimbox
              </button>
            </>
          )}
        </div>
      </main>

      <FilePreviewModal
        file={shared?.file}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onNotification={onNotification}
      />
    </div>
  );
};

export default SharedFileView;
