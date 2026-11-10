import React, { useEffect, useState } from 'react';
import { setConfirmListener } from '../utils/confirm.js';

// Diálogo de confirmación de Nimbox. Se monta una sola vez en App.jsx.
export const ConfirmHost = () => {
  const [request, setRequest] = useState(null);

  useEffect(() => {
    setConfirmListener((next) => {
      setRequest((prev) => {
        if (prev) prev.resolve(false); // si llega otra pregunta, la anterior se cancela
        return next;
      });
    });
    return () => setConfirmListener(null);
  }, []);

  const close = (accepted) => {
    if (!request) return;
    request.resolve(accepted);
    setRequest(null);
  };

  useEffect(() => {
    if (!request) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        request.resolve(false);
        setRequest(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [request]);

  if (!request) return null;

  const danger = !!request.danger;
  const accent = danger ? 'var(--danger)' : 'var(--primary)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nimbox-confirm-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)', color: 'var(--text-main)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
          borderTop: `4px solid ${accent}`,
          maxWidth: '420px', width: '100%', padding: '24px'
        }}
      >
        <h3 id="nimbox-confirm-title" style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700 }}>
          {request.title || (danger ? 'Confirma esta acción' : 'Confirmar')}
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '0.92rem', lineHeight: 1.5, color: 'var(--text-light)' }}>
          {request.message}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            autoFocus
            onClick={() => close(false)}
            style={{
              padding: '9px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              border: '1px solid var(--border-color)', background: 'transparent',
              color: 'var(--text-main)', fontWeight: 600
            }}
          >
            {request.cancelText || 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            style={{
              padding: '9px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              border: 'none', background: accent, color: '#fff', fontWeight: 600
            }}
          >
            {request.confirmText || 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmHost;
