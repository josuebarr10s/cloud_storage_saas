import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ toast, onClose }) => {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        borderLeft: `5px solid ${isSuccess ? 'var(--success)' : isError ? 'var(--danger)' : 'var(--info)'}`,
        color: 'var(--text-main)',
        fontSize: '0.9rem',
        fontWeight: 500,
        maxWidth: '420px',
        animation: 'slideUp 0.25s ease-out'
      }}
    >
      {isSuccess && <CheckCircle2 size={20} color="var(--success)" style={{ flexShrink: 0 }} />}
      {isError && <AlertCircle size={20} color="var(--danger)" style={{ flexShrink: 0 }} />}
      {!isSuccess && !isError && <Info size={20} color="var(--info)" style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button onClick={onClose} style={{ color: 'var(--text-light)', padding: '2px', display: 'flex' }}>
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;