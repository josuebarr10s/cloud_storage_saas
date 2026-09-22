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
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        borderLeft: `5px solid ${isSuccess ? '#10b981' : isError ? '#ef4444' : '#3b82f6'}`,
        color: '#0f172a',
        fontSize: '0.9rem',
        fontWeight: 500,
        maxWidth: '420px',
        animation: 'slideUp 0.25s ease-out'
      }}
    >
      {isSuccess && <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0 }} />}
      {isError && <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0 }} />}
      {!isSuccess && !isError && <Info size={20} color="#3b82f6" style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button onClick={onClose} style={{ color: '#94a3b8', padding: '2px', display: 'flex' }}>
        <X size={16} />
      </button>
    </div>
  );
};
