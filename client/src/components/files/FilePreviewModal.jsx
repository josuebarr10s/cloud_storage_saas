import React, { useState, useEffect } from 'react';
import {
  X, Download, Share2, ZoomIn, ZoomOut, Maximize2, RotateCw,
  FileText, Image as ImageIcon, Video, Music, Archive, FileCode,
  Check, Copy, ExternalLink, Loader2, AlertCircle, Info, Calendar, HardDrive
} from 'lucide-react';
import { filesService } from '../../services/filesService.js';

export const FilePreviewModal = ({ file, isOpen, onClose, onNotification }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let currentBlobUrl = null;

    async function loadPreview() {
      if (!isOpen || !file) {
        setPreviewUrl(null);
        setTextContent(null);
        setLoadError(null);
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      setZoomLevel(1);

      try {
        const result = await filesService.getFilePreviewUrl(file.file_path);
        if (!result || !result.url) {
          throw new Error('No se pudo generar la URL de vista previa.');
        }

        setPreviewUrl(result.url);
        if (result.isBlob) {
          currentBlobUrl = result.url;
        }

        // Si es archivo de texto o código, leer el contenido en texto
        if (file.mimeCategory === 'text' || ['txt', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'md', 'csv', 'sql', 'py', 'xml', 'yml', 'yaml'].includes(file.ext)) {
          if (result.blob) {
            const text = await result.blob.text();
            setTextContent(text);
          } else {
            const res = await fetch(result.url);
            const text = await res.text();
            setTextContent(text);
          }
        }
      } catch (err) {
        console.error('Error al cargar vista previa:', err);
        setLoadError('No se pudo cargar la vista previa directa. Puedes descargar el archivo para verlo.');
      } finally {
        setIsLoading(false);
      }
    }

    loadPreview();

    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [isOpen, file]);

  // Listener para cerrar con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      onNotification && onNotification(`Descargando "${file.name}"...`, 'info');
      await filesService.downloadFile(file.file_path, file.name);
      onNotification && onNotification(`Archivo "${file.name}" descargado con éxito.`, 'success');
    } catch (err) {
      onNotification && onNotification(`Error al descargar: ${err.message}`, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    if (previewUrl) {
      navigator.clipboard.writeText(previewUrl);
      setCopiedLink(true);
      onNotification && onNotification('Enlace copiado al portapapeles.', 'success');
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const renderFileViewer = () => {
    if (isLoading) {
      return (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
          <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cargando vista previa de {file.name}...</p>
        </div>
      );
    }

    if (loadError) {
      return (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '420px', margin: '0 auto' }}>
          <AlertCircle size={44} color="var(--warning)" style={{ margin: '0 auto 12px auto' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
            Vista previa no disponible
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {loadError}
          </p>
          <button
            type="button"
            onClick={handleDownload}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.9rem', margin: '0 auto' }}
          >
            <Download size={16} /> Descargar archivo
          </button>
        </div>
      );
    }

    // 1. IMÁGENES
    if (file.mimeCategory === 'image' || ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'bmp'].includes(file.ext)) {
      return (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            maxHeight: '65vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem'
          }}
        >
          <img
            src={previewUrl}
            alt={file.name}
            style={{
              maxWidth: '100%',
              maxHeight: '60vh',
              objectFit: 'contain',
              transform: `scale(${zoomLevel})`,
              transition: 'transform 0.2s ease',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-md)'
            }}
          />

          {/* Zoom Controls Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-overlay-card)',
              backdropFilter: 'blur(8px)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', padding: '2px' }}
              title="Reducir zoom"
            >
              <ZoomOut size={16} />
            </button>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', minWidth: '38px', textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', padding: '2px' }}
              title="Aumentar zoom"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '2px', marginLeft: '4px' }}
              title="Restablecer zoom"
            >
              <RotateCw size={14} />
            </button>
          </div>
        </div>
      );
    }

    // 2. DOCUMENTOS PDF
    if (file.mimeCategory === 'pdf' || file.ext === 'pdf') {
      return (
        <div style={{ width: '100%', height: '65vh', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <iframe
            src={previewUrl}
            title={file.name}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      );
    }

    // 3. VIDEOS
    if (file.mimeCategory === 'video' || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(file.ext)) {
      return (
        <div style={{ width: '100%', maxHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <video
            controls
            autoPlay={false}
            src={previewUrl}
            style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
          >
            Tu navegador no soporta reproducción de este video.
          </video>
        </div>
      );
    }

    // 4. AUDIO
    if (file.mimeCategory === 'audio' || ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(file.ext)) {
      return (
        <div
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Music size={32} />
          </div>
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px 0' }}>{file.name}</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{file.size} · Archivo de Audio</p>
          </div>
          <audio controls src={previewUrl} style={{ width: '100%', maxWidth: '460px', marginTop: '8px' }}>
            Tu navegador no soporta reproducción de este audio.
          </audio>
        </div>
      );
    }

    // 5. CÓDIGO / TEXTO
    if (textContent !== null) {
      return (
        <div
          style={{
            background: 'var(--bg-code-block)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            maxHeight: '65vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              padding: '8px 16px',
              background: 'var(--bg-hover)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}
          >
            <span>{file.ext?.toUpperCase() || 'TEXTO'} · {textContent.split('\n').length} líneas</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(textContent);
                onNotification && onNotification('Código copiado al portapapeles', 'success');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Copy size={13} /> Copiar contenido
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              padding: '1.25rem',
              overflow: 'auto',
              fontSize: '0.85rem',
              fontFamily: 'Consolas, Monaco, monospace',
              lineHeight: 1.5,
              color: 'var(--text-main)',
              whiteSpace: 'pre-wrap'
            }}
          >
            {textContent}
          </pre>
        </div>
      );
    }

    // 6. ARCHIVO GENÉRICO (ZIP, RAR, etc.)
    return (
      <div
        style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Archive size={32} />
        </div>
        <div>
          <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
            {file.name}
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Tamaño: <strong>{file.size}</strong> · Tipo: <strong>{file.ext?.toUpperCase() || 'Archivo'}</strong>
          </p>
        </div>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
          Este formato de archivo comprimido o binario se almacena de forma cifrada en la nube y puede ser descargado en cualquier momento.
        </p>
        <button
          type="button"
          onClick={handleDownload}
          className="btn-primary"
          style={{ padding: '9px 20px', fontSize: '0.9rem', gap: '8px' }}
        >
          <Download size={16} /> Descargar archivo completo
        </button>
      </div>
    );
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
          maxWidth: '860px',
          maxHeight: '92vh',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
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
              {file.mimeCategory === 'image' ? <ImageIcon size={18} /> :
               file.mimeCategory === 'video' ? <Video size={18} /> :
               file.mimeCategory === 'audio' ? <Music size={18} /> :
               file.mimeCategory === 'archive' ? <Archive size={18} /> :
               file.mimeCategory === 'text' ? <FileCode size={18} /> :
               <FileText size={18} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '380px'
                  }}
                  title={file.name}
                >
                  {file.name}
                </h3>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    background: 'var(--primary-light)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    textTransform: 'uppercase'
                  }}
                >
                  {file.ext || file.type}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {file.size} · Subido el {file.updated}
              </span>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn-ghost"
              style={{
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                color: copiedLink ? 'var(--success)' : 'var(--text-muted)'
              }}
              title="Copiar enlace de vista previa"
            >
              {copiedLink ? <Check size={16} /> : <Copy size={16} />}
              <span style={{ display: 'none', mdDisplay: 'inline' }}>{copiedLink ? 'Copiado' : 'Enlace'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="btn-secondary"
              disabled={isDownloading}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                gap: '6px'
              }}
            >
              {isDownloading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />}
              <span>Descargar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                background: 'var(--bg-body)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              aria-label="Cerrar vista previa"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div
          style={{
            padding: '1.25rem',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '320px'
          }}
        >
          {renderFileViewer()}
        </div>

        {/* Modal Footer Metadata */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HardDrive size={13} color="var(--primary)" /> {file.size}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} /> {file.updated}
            </span>
          </div>
          <span style={{ color: 'var(--success)', fontWeight: 600 }}>
            ✓ Almacenado y cifrado en Supabase Cloud
          </span>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
