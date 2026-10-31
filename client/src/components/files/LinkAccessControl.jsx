import React, { useState, useEffect } from 'react';
import { Users, X, Plus, Loader2, Check, Eye } from 'lucide-react';
import { sharingService } from '../../services/sharingService.js';

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const sameList = (a = [], b = []) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Control de acceso del plan Empresarial dentro del modal de compartir:
 * limitar el enlace a ciertos correos y ver quién lo abrió.
 * link: enlace activo ({ token, allowedEmails }) o null si todavía no se crea.
 */
export const LinkAccessControl = ({ link, enabled, onNotification, onEmailsChange }) => {
  const [emails, setEmails] = useState(link?.allowedEmails || []);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [accesses, setAccesses] = useState([]);
  const [isLoadingAccesses, setIsLoadingAccesses] = useState(false);

  const loadAccesses = async () => {
    setIsLoadingAccesses(true);
    try {
      setAccesses(await sharingService.getLinkAccesses(link.token));
    } catch (err) {
      onNotification && onNotification(err.message, 'error');
    } finally {
      setIsLoadingAccesses(false);
    }
  };

  useEffect(() => {
    setEmails(link?.allowedEmails || []);
    setDraft('');
    setAccesses([]);
    if (enabled && link) loadAccesses();
  }, [link?.token, enabled]);

  const isDirty = Boolean(link) && !sameList(emails, link.allowedEmails);

  // Acepta uno o varios correos separados por comas, punto y coma o espacios
  const handleAdd = () => {
    const candidates = draft.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
    if (candidates.length === 0) return;
    const invalid = candidates.filter(e => !EMAIL_REGEX.test(e));
    if (invalid.length) {
      onNotification && onNotification(`"${invalid[0]}" no parece un correo válido.`, 'error');
      return;
    }
    setEmails(prev => [...prev, ...candidates.filter(e => !prev.includes(e))]);
    setDraft('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await sharingService.setAllowedEmails(link.token, emails);
      onEmailsChange && onEmailsChange(emails);
      onNotification && onNotification(
        emails.length ? 'Listo: solo las personas invitadas podrán abrir el enlace.' : 'Listo: cualquiera con el enlace podrá abrirlo.',
        'success'
      );
      loadAccesses();
    } catch (err) {
      onNotification && onNotification(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const labelStyle = { fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' };
  const mutedStyle = { fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        opacity: enabled ? 1 : 0.6
      }}
    >
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <Users size={14} color="var(--primary)" /> Control de acceso
        {!enabled && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '1px 7px', borderRadius: 'var(--radius-full)' }}>
            Empresarial
          </span>
        )}
      </span>

      {!enabled ? (
        <p style={mutedStyle}>Invita solo a ciertos correos y mira quién abrió el enlace y cuántas veces.</p>
      ) : !link ? (
        <p style={mutedStyle}>Crea el enlace para invitar personas por correo y ver quién lo abre.</p>
      ) : (
        <>
          {/* Invitados */}
          <span style={labelStyle}>Quién puede abrirlo</span>
          <p style={mutedStyle}>
            {emails.length
              ? 'Solo estas personas, con la cuenta de Nimbox de ese correo:'
              : 'Cualquiera que tenga el enlace y una cuenta en Nimbox. Agrega correos para limitarlo.'}
          </p>

          {emails.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {emails.map(email => (
                <span
                  key={email}
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-main)',
                    background: 'var(--bg-hover)',
                    padding: '3px 4px 3px 10px',
                    borderRadius: 'var(--radius-full)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    maxWidth: '100%'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                  <button
                    type="button"
                    onClick={() => setEmails(prev => prev.filter(e => e !== email))}
                    disabled={isSaving}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '2px' }}
                    aria-label={`Quitar ${email}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              placeholder="correo@ejemplo.com"
              disabled={isSaving}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-body)',
                color: 'var(--text-main)',
                fontSize: '0.82rem'
              }}
              aria-label="Correo a invitar"
            />
            <button type="button" className="btn-secondary" onClick={handleAdd} disabled={!draft.trim() || isSaving} style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={14} /> Agregar
            </button>
          </div>

          {isDirty && (
            <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving} style={{ alignSelf: 'flex-start', padding: '7px 12px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {isSaving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
              Guardar invitados
            </button>
          )}

          {/* Auditoría */}
          <span style={{ ...labelStyle, marginTop: '4px' }}>Quién lo abrió</span>
          {isLoadingAccesses ? (
            <p style={{ ...mutedStyle, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Cargando...
            </p>
          ) : accesses.length === 0 ? (
            <p style={mutedStyle}>Nadie lo ha abierto todavía.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {accesses.map(access => (
                <div
                  key={access.email}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {access.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {access.email} · última vez {access.lastAccess}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }} title="Veces que lo abrió">
                    <Eye size={12} /> {access.times}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LinkAccessControl;
