import React, { useState, useEffect } from 'react';
import { Folder, FileText, Users, Loader2, Lock, Edit2, ArrowRight } from 'lucide-react';
import { sharingService, SHARE_PERMISSIONS } from '../../services/sharingService.js';

/**
 * Pestaña "Compartidos conmigo": lo que el usuario ya abrió por enlace y sigue disponible.
 * Al abrir un elemento se usa la misma vista que el enlace (onOpen(token)), con el permiso del dueño.
 */
export const SharedWithMeList = ({ searchQuery = '', onOpen, onNotification }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        setItems(await sharingService.getSharedWithMe());
      } catch (err) {
        onNotification && onNotification(err.message, 'error');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const visible = query
    ? items.filter(i => i.name.toLowerCase().includes(query) || i.ownerName.toLowerCase().includes(query))
    : items;

  if (isLoading) {
    return (
      <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={36} style={{ margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cargando compartidos...</p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Users size={40} style={{ margin: '0 auto 12px auto', opacity: 0.35 }} />
        <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 4px 0' }}>
          {query ? 'Nada coincide con tu búsqueda.' : 'Todavía nadie te ha compartido nada.'}
        </p>
        {!query && (
          <p style={{ fontSize: '0.85rem', margin: 0 }}>
            Cuando abras un enlace que te compartan, aparecerá aquí mientras su dueño lo mantenga activo.
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {visible.map(item => {
        const Icon = item.type === 'folder' ? Folder : FileText;
        const isEditor = item.permission === SHARE_PERMISSIONS.EDITOR;
        return (
          <button
            key={item.token}
            type="button"
            onClick={() => onOpen(item.token)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 20px',
              border: 'none',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              textAlign: 'left',
              cursor: 'pointer',
              width: '100%'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Icon size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {item.ownerName}{item.size ? ` · ${item.size}` : ''} · {item.updated}
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: isEditor ? 'var(--primary)' : 'var(--text-muted)',
                background: isEditor ? 'var(--primary-light)' : 'var(--bg-hover)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0
              }}
            >
              {isEditor ? <><Edit2 size={11} /> Puedes editar</> : <><Lock size={11} /> Solo lectura</>}
            </span>
            <ArrowRight size={16} color="var(--text-light)" style={{ flexShrink: 0 }} />
          </button>
        );
      })}
    </div>
  );
};

export default SharedWithMeList;
