import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, Loader2, Link2, Link2Off, Lock } from 'lucide-react';
import { sharingService, buildShareUrl } from '../../services/sharingService.js';

export const ShareLinkModal = ({ file, isOpen, onClose, currentUser, onNotification, onShareChange }) => {
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Consultar si el archivo ya tiene un enlace activo cada vez que se abre el modal
  useEffect(() => {
    async function loadLink() {
      if (!isOpen || !file) return;
      setIsLoading(true);
      setCopied(false);
      try {
        setToken(await sharingService.getActiveLink(file.id));
      } catch (err) {
        onNotification && onNotification(err.message, 'error');
      } finally {
        setIsLoading(false);
      }
    }
    loadLink();
  }, [isOpen, file?.id]);

  if (!isOpen || !file) return null;

  const shareUrl = token ? buildShareUrl(token) : '';

  const handleCreateLink = async () => {
    setIsBusy(true);
    try {
      const newToken = await sharingService.getOrCreateLink(currentUser?.id, file.id);
      setToken(newToken);
      onShareChange && onShareChange(file.id, true);
      onNotification && onNotification('Enlace creado. Cópialo y compártelo.', 'success');
    } catch (err) {
      onNotification && onNotification(err.message, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      onNotification && onNotification('No se pudo copiar. Selecciona el enlace y cópialo manualmente.', 'error');
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('¿Desactivar el enlace? Quien lo tenga ya no podrá abrir el archivo.')) return;
    setIsBusy(true);
    try {
      await sharingService.deactivateLink(file.id);
      setToken(null);
      onShareChange && onShareChange(file.id, false);
      onNotification && onNotification(`"${file.name}" vuelve a ser privado.`, 'info');
    } catch (err) {
      onNotification && onNotification(err.message, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const buttonBase = {
    padding: '9px 14px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: isBusy ? 'wait' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    opacity: isBusy ? 0.7 : 1
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
          maxWidth: '500px',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
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
              <Share2 size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Compartir por enlace
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
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
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isLoading ? (
            <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={26} style={{ margin: '0 auto 8px auto', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '0.85rem', margin: 0 }}>Consultando enlace...</p>
            </div>
          ) : token ? (
            <>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem'
                  }}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-primary"
                  style={{ ...buttonBase, cursor: 'pointer', opacity: 1 }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <Lock size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                Solo lectura: quien abra el enlace debe iniciar sesión en Nimbox y podrá ver y descargar el archivo, pero no modificarlo.
              </p>

              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isBusy}
                style={{
                  ...buttonBase,
                  alignSelf: 'flex-start',
                  color: 'var(--danger)',
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger)'
                }}
              >
                {isBusy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Link2Off size={15} />}
                Desactivar enlace
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', margin: 0 }}>
                Este archivo es <strong>privado</strong>. Crea un enlace para compartirlo con otras personas que tengan cuenta en Nimbox.
              </p>
              <button
                type="button"
                onClick={handleCreateLink}
                disabled={isBusy}
                className="btn-primary"
                style={{ ...buttonBase, alignSelf: 'flex-start' }}
              >
                {isBusy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Link2 size={15} />}
                Crear enlace
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareLinkModal;
