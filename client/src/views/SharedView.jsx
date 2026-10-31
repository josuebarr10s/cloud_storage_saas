import React, { useState, useEffect, useRef } from 'react';
import {
  Eye, Download, Upload, ArrowLeft, Loader2, AlertCircle, LogOut, Lock, User, Info, Edit2, Folder, Clock, KeyRound
} from 'lucide-react';
import { sharingService, SHARE_PERMISSIONS, SHARE_ERRORS } from '../services/sharingService.js';
import { filesService } from '../services/filesService.js';
import { FilePreviewModal } from '../components/files/FilePreviewModal.jsx';
import { SharedFolderBrowser, getFileIconByType } from '../components/files/SharedFolderBrowser.jsx';
import { RenameModal } from '../components/files/RenameModal.jsx';

const badgeStyle = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  background: 'var(--bg-hover)',
  padding: '3px 10px',
  borderRadius: 'var(--radius-full)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px'
};

/**
 * Vista de un archivo o una carpeta que otro usuario compartió por enlace.
 * Se muestra a cualquier usuario con sesión, tenga plan o no.
 * hasPlan: si es false, el usuario no tiene espacio propio y al salir va a la landing.
 */
export const SharedView = ({ token, currentUser, hasPlan, onExit, onLogout, onNotification }) => {
  const [shared, setShared] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  // Enlace con contraseña: se pide antes de mostrar nada
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);
  const versionInputRef = useRef(null);

  const openLink = async (pass = null) => {
    try {
      const result = await sharingService.openSharedLink(token, pass);
      if (result.isOwner) {
        onNotification && onNotification('Este enlace es de algo que tú compartiste.', 'info');
        onExit();
        return;
      }
      setNeedsPassword(false);
      setShared(result);
    } catch (err) {
      if (err.code === SHARE_ERRORS.PASSWORD_REQUIRED || err.code === SHARE_ERRORS.PASSWORD_INCORRECT) {
        setNeedsPassword(true);
        setPasswordError(err.code === SHARE_ERRORS.PASSWORD_INCORRECT ? err.message : null);
      } else {
        setNeedsPassword(false);
        setError(err.message);
      }
    }
  };

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      await openLink();
      setIsLoading(false);
    }
    load();
  }, [token]);

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    if (!password) return;
    setIsCheckingPassword(true);
    await openLink(password);
    setIsCheckingPassword(false);
  };

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

  const handleUploadVersion = async (e) => {
    const newFile = e.target.files?.[0];
    e.target.value = '';
    if (!newFile) return;
    setIsUploadingVersion(true);
    try {
      const updated = await filesService.uploadNewVersion(shared.file, newFile, shared.ownerId);
      setShared({ ...shared, file: updated });
      onNotification && onNotification(`Se subió una versión nueva de "${shared.file.name}".`, 'success');
    } catch (err) {
      onNotification && onNotification(err.message, 'error');
    } finally {
      setIsUploadingVersion(false);
    }
  };

  const handleRename = async (newName) => {
    const updated = await filesService.renameFile(shared.file, newName);
    setShared({ ...shared, file: updated });
    onNotification && onNotification(`Ahora se llama "${updated.name}".`, 'success');
  };

  // Sin plan no hay dashboard: al salir, lo compartido solo se recupera con el enlace
  const handleLeave = () => {
    if (!hasPlan && !window.confirm('Si sales, para volver a ver esto tendrás que abrir el enlace otra vez. ¿Quieres salir?')) return;
    onExit();
  };

  const isFolder = shared?.type === 'folder';
  const isEditor = shared?.permission === SHARE_PERMISSIONS.EDITOR;
  const ItemIcon = isFolder ? Folder : getFileIconByType(shared?.file?.type);

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
      <main style={{ flex: 1, display: 'flex', alignItems: isFolder ? 'flex-start' : 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div
          style={{
            width: '100%',
            maxWidth: isFolder ? '820px' : '460px',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {isLoading ? (
            <div style={{ color: 'var(--text-muted)' }}>
              <Loader2 size={34} style={{ margin: '0 auto 10px auto', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Abriendo enlace compartido...</p>
            </div>
          ) : needsPassword ? (
            <form onSubmit={handleSubmitPassword}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px auto'
                }}
              >
                <KeyRound size={26} />
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                Este enlace tiene contraseña
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0' }}>
                Pídesela a quien te lo compartió. Solo tendrás que escribirla una vez.
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
                placeholder="Contraseña"
                autoFocus
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${passwordError ? 'var(--danger)' : 'var(--border-color)'}`,
                  background: 'var(--bg-body)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  marginBottom: '8px'
                }}
                aria-label="Contraseña del enlace"
              />
              {passwordError && (
                <p style={{ fontSize: '0.8rem', color: 'var(--danger)', margin: '0 0 8px 0', textAlign: 'left' }}>{passwordError}</p>
              )}
              <button type="submit" className="btn-primary" disabled={!password || isCheckingPassword} style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px' }}>
                {isCheckingPassword && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                Abrir
              </button>
              <button type="button" className="btn-ghost" onClick={onExit} style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={16} /> Volver al inicio
              </button>
            </form>
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
                <ItemIcon size={30} />
              </div>

              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px 0', wordBreak: 'break-word' }}>
                {isFolder ? shared.folder.name : shared.file.name}
              </h2>
              {!isFolder && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                  {shared.file.size} · {shared.file.updated}
                </p>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', margin: '8px 0 1.5rem 0' }}>
                <span style={badgeStyle}>
                  <User size={12} /> Compartido por {shared.ownerName}
                </span>
                <span style={badgeStyle}>
                  {isEditor ? <><Edit2 size={12} /> Puedes editar</> : <><Lock size={12} /> Solo lectura</>}
                </span>
                {shared.expiresAt && (
                  <span style={badgeStyle}>
                    <Clock size={12} /> Disponible hasta el {new Date(shared.expiresAt).toLocaleDateString('es', { day: 'numeric', month: 'long' })}
                  </span>
                )}
              </div>

              {isFolder ? (
                <SharedFolderBrowser
                  rootFolder={shared.folder}
                  ownerId={shared.ownerId}
                  permission={shared.permission}
                  onNotification={onNotification}
                />
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
                  <button type="button" className="btn-primary" onClick={() => setIsPreviewOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Eye size={16} /> Ver archivo
                  </button>
                  <button type="button" className="btn-secondary" onClick={handleDownload} disabled={isDownloading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {isDownloading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />}
                    Descargar
                  </button>
                  {isEditor && (
                    <>
                      <button type="button" className="btn-secondary" onClick={() => versionInputRef.current?.click()} disabled={isUploadingVersion} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {isUploadingVersion ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
                        Subir versión nueva
                      </button>
                      <input ref={versionInputRef} type="file" hidden onChange={handleUploadVersion} />
                      <button type="button" className="btn-secondary" onClick={() => setIsRenameOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Edit2 size={16} /> Cambiar nombre
                      </button>
                    </>
                  )}
                </div>
              )}

              {!hasPlan && (
                <div
                  style={{
                    marginTop: '1.5rem',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-light)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    display: 'flex',
                    gap: '8px'
                  }}
                >
                  <Info size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>
                    <strong>Acceso limitado:</strong> como aún no tienes un plan, no tienes tu propio espacio en Nimbox
                    y solo puedes usar lo que te compartan. Si sales de esta página, necesitarás el enlace para volver a
                    abrir {isFolder ? 'esta carpeta' : 'este archivo'}.
                  </span>
                </div>
              )}

              <button type="button" className="btn-ghost" onClick={handleLeave} style={{ marginTop: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={16} /> {hasPlan ? 'Ir a mi Nimbox' : 'Ir a Nimbox'}
              </button>
            </>
          )}
        </div>
      </main>

      {!isFolder && (
        <RenameModal
          item={shared?.file}
          isOpen={isRenameOpen}
          onClose={() => setIsRenameOpen(false)}
          onRename={handleRename}
        />
      )}

      {!isFolder && (
        <FilePreviewModal
          file={shared?.file}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onNotification={onNotification}
        />
      )}
    </div>
  );
};

export default SharedView;
