import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, Loader2, Link2, Link2Off, Eye, Edit2, Shield, Lock } from 'lucide-react';
import { sharingService, buildShareUrl, canUseAdvancedSharing, SHARE_PERMISSIONS } from '../../services/sharingService.js';

const MIN_PASSWORD_LENGTH = 4;

// El input de fecha trabaja en hora local con formato YYYY-MM-DD
const toDateInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// El enlace vence al terminar el día elegido
const endOfDayIso = (dateInput) => (dateInput ? new Date(`${dateInput}T23:59:59`).toISOString() : null);

const formatLongDate = (iso) =>
  new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Crear, copiar, cambiar de permiso y desactivar el enlace de un archivo o una carpeta.
 * item: archivo o carpeta ya mapeados (id, name, isFolder)
 */
export const ShareLinkModal = ({ item, isOpen, onClose, currentUser, onNotification, onShareChange }) => {
  const [link, setLink] = useState(null); // { token, permission, expiresAt, hasPassword } | null
  const [permission, setPermission] = useState(SHARE_PERMISSIONS.VIEWER);
  const [expiryDate, setExpiryDate] = useState(''); // YYYY-MM-DD, vacío = no vence
  const [password, setPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Permisos avanzados: editor, expiración y contraseña (Pro y Empresarial)
  const advancedAllowed = canUseAdvancedSharing(currentUser?.plan);

  // Consultar si ya tiene un enlace activo cada vez que se abre el modal
  useEffect(() => {
    async function loadLink() {
      if (!isOpen || !item) return;
      setIsLoading(true);
      setCopied(false);
      try {
        const active = await sharingService.getActiveLink(item);
        setLink(active);
        setPermission(active?.permission || SHARE_PERMISSIONS.VIEWER);
        setExpiryDate(toDateInput(active?.expiresAt));
        setPassword('');
        setIsChangingPassword(false);
      } catch (err) {
        onNotification && onNotification(err.message, 'error');
      } finally {
        setIsLoading(false);
      }
    }
    loadLink();
  }, [isOpen, item?.id]);

  if (!isOpen || !item) return null;

  const shareUrl = link ? buildShareUrl(link.token) : '';
  const kind = item.isFolder ? 'carpeta' : 'archivo';
  const isExpired = Boolean(link?.expiresAt) && new Date(link.expiresAt) <= new Date();
  const securityDirty = Boolean(link) && (expiryDate !== toDateInput(link.expiresAt) || password !== '');

  const passwordTooShort = () => {
    if (password && password.length < MIN_PASSWORD_LENGTH) {
      onNotification && onNotification(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`, 'error');
      return true;
    }
    return false;
  };

  const handleCreateLink = async () => {
    if (passwordTooShort()) return;
    setIsBusy(true);
    try {
      let created = await sharingService.getOrCreateLink(currentUser?.id, item, permission);
      // La expiración y la contraseña elegidas antes de crear el enlace se aplican enseguida
      if (advancedAllowed && (expiryDate || password)) {
        await sharingService.configureLink(created.token, { expiresAt: endOfDayIso(expiryDate), password: password || null });
        created = { ...created, expiresAt: endOfDayIso(expiryDate), hasPassword: Boolean(password) };
        setPassword('');
      }
      setLink(created);
      onShareChange && onShareChange(item, true);
      onNotification && onNotification('Enlace creado. Cópialo y compártelo.', 'success');
    } catch (err) {
      onNotification && onNotification(err.message, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  // Con un enlace activo, cambiar el permiso lo actualiza al momento (mismo enlace)
  const handleChangePermission = async (newPermission) => {
    if (newPermission === permission || isBusy) return;
    if (!link) {
      setPermission(newPermission);
      return;
    }
    setIsBusy(true);
    try {
      await sharingService.updatePermission(item, newPermission);
      setPermission(newPermission);
      setLink({ ...link, permission: newPermission });
      onNotification && onNotification(
        newPermission === SHARE_PERMISSIONS.EDITOR ? 'Ahora el enlace permite editar.' : 'Ahora el enlace es de solo lectura.',
        'success'
      );
    } catch (err) {
      onNotification && onNotification(err.message, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveSecurity = async () => {
    if (passwordTooShort()) return;
    setIsBusy(true);
    try {
      await sharingService.configureLink(link.token, { expiresAt: endOfDayIso(expiryDate), password: password || null });
      setLink({ ...link, expiresAt: endOfDayIso(expiryDate), hasPassword: link.hasPassword || Boolean(password) });
      onNotification && onNotification(
        password
          ? 'Se guardó la contraseña. Quien ya había abierto el enlace tendrá que escribirla.'
          : 'Se guardó la fecha de vencimiento.',
        'success'
      );
      setPassword('');
      setIsChangingPassword(false);
    } catch (err) {
      onNotification && onNotification(err.message, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!window.confirm('¿Quitar la contraseña? Cualquiera con el enlace podrá abrirlo.')) return;
    setIsBusy(true);
    try {
      await sharingService.configureLink(link.token, { expiresAt: link.expiresAt, removePassword: true });
      setLink({ ...link, hasPassword: false });
      onNotification && onNotification('El enlace ya no pide contraseña.', 'info');
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
    if (!window.confirm(`¿Desactivar el enlace? Quien lo tenga ya no podrá abrir esta ${kind}.`)) return;
    setIsBusy(true);
    try {
      await sharingService.deactivateLink(item);
      setLink(null);
      onShareChange && onShareChange(item, false);
      onNotification && onNotification(`"${item.name}" vuelve a ser privad${item.isFolder ? 'a' : 'o'}.`, 'info');
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

  const permissionOptions = [
    {
      value: SHARE_PERMISSIONS.VIEWER,
      icon: Eye,
      title: 'Solo lectura',
      description: item.isFolder ? 'Ver y descargar todo lo que hay en la carpeta.' : 'Ver y descargar el archivo.',
      disabled: false
    },
    {
      value: SHARE_PERMISSIONS.EDITOR,
      icon: Edit2,
      title: 'Editor',
      description: item.isFolder
        ? 'También subir archivos y versiones nuevas, crear subcarpetas y mandar archivos a tu papelera.'
        : 'También subir versiones nuevas del archivo.',
      disabled: !advancedAllowed
    }
  ];

  const securityRowStyle = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' };
  const securityLabelStyle = { fontSize: '0.8rem', color: 'var(--text-muted)', width: '86px', flexShrink: 0 };
  const securityInputStyle = {
    flex: '1 1 160px',
    minWidth: 0,
    padding: '7px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-body)',
    color: 'var(--text-main)',
    fontSize: '0.82rem'
  };
  const textButtonStyle = {
    background: 'none',
    border: 'none',
    padding: '2px 4px',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--primary)',
    cursor: 'pointer'
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
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
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)'
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
                Compartir {kind} por enlace
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
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
          ) : (
            <>
              {/* Permiso */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Quien abra el enlace podrá:
                </span>
                {permissionOptions.map(({ value, icon: Icon, title, description, disabled }) => {
                  const selected = permission === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => !disabled && handleChangePermission(value)}
                      disabled={disabled || isBusy}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${selected ? 'var(--primary)' : 'var(--border-color)'}`,
                        background: selected ? 'var(--primary-light)' : 'var(--bg-card)',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.6 : 1,
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start'
                      }}
                    >
                      <Icon size={16} color={selected ? 'var(--primary)' : 'var(--text-muted)'} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {title}
                          {disabled && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '1px 7px', borderRadius: 'var(--radius-full)' }}>
                              Pro y Empresarial
                            </span>
                          )}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Seguridad: vencimiento y contraseña */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  opacity: advancedAllowed ? 1 : 0.6
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={14} color="var(--primary)" /> Seguridad del enlace
                  {!advancedAllowed && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '1px 7px', borderRadius: 'var(--radius-full)' }}>
                      Pro y Empresarial
                    </span>
                  )}
                </span>

                <div style={securityRowStyle}>
                  <span style={securityLabelStyle}>Vence el</span>
                  <input
                    type="date"
                    value={expiryDate}
                    min={toDateInput(new Date().toISOString())}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    disabled={!advancedAllowed || isBusy}
                    style={securityInputStyle}
                    aria-label="Fecha en que vence el enlace"
                  />
                  {expiryDate ? (
                    <button type="button" onClick={() => setExpiryDate('')} disabled={!advancedAllowed || isBusy} style={textButtonStyle}>
                      Que no venza
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Sin fecha: no vence</span>
                  )}
                </div>
                {isExpired && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--danger)', margin: 0 }}>
                    Este enlace venció el {formatLongDate(link.expiresAt)}. Elige otra fecha y guarda para reactivarlo.
                  </p>
                )}

                <div style={securityRowStyle}>
                  <span style={securityLabelStyle}>Contraseña</span>
                  {link?.hasPassword && !isChangingPassword ? (
                    <>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Lock size={13} color="var(--primary)" /> Protegido
                      </span>
                      <button type="button" onClick={() => setIsChangingPassword(true)} disabled={isBusy} style={textButtonStyle}>
                        Cambiar
                      </button>
                      <button type="button" onClick={handleRemovePassword} disabled={isBusy} style={{ ...textButtonStyle, color: 'var(--danger)' }}>
                        Quitar
                      </button>
                    </>
                  ) : (
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={advancedAllowed ? `Opcional, mínimo ${MIN_PASSWORD_LENGTH} caracteres` : 'Sin contraseña'}
                      disabled={!advancedAllowed || isBusy}
                      autoComplete="new-password"
                      style={securityInputStyle}
                      aria-label="Contraseña del enlace"
                    />
                  )}
                </div>

                {securityDirty && (
                  <button type="button" onClick={handleSaveSecurity} disabled={isBusy} className="btn-primary" style={{ ...buttonBase, alignSelf: 'flex-start', padding: '7px 12px' }}>
                    {isBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                    Guardar seguridad
                  </button>
                )}
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Quien abra el enlace debe iniciar sesión en Nimbox. Lo que suba un editor ocupa tu espacio.
              </p>

              {link ? (
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareLinkModal;
