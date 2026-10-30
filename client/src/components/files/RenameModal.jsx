import React, { useState, useEffect, useRef } from 'react';
import { X, Edit2, Loader2 } from 'lucide-react';

/**
 * Cambiar el nombre de un archivo. Al abrir selecciona el nombre sin la extensión
 * para que sea fácil reemplazarlo sin borrarla por accidente.
 * onRename(newName) debe lanzar un error si no se pudo; el modal lo muestra.
 */
export const RenameModal = ({ item, isOpen, onClose, onRename }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef(null);
  const selectOnOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !item) return;
    setName(item.name);
    setError(null);
    selectOnOpenRef.current = true;
  }, [isOpen, item?.id]);

  // Seleccionar el nombre sin la extensión cuando el input ya muestra el nombre actual
  // (si se selecciona antes, el cambio de valor borra la selección)
  useEffect(() => {
    const input = inputRef.current;
    if (!selectOnOpenRef.current || !input || name !== item?.name) return;
    selectOnOpenRef.current = false;
    const dot = name.lastIndexOf('.');
    input.focus();
    input.setSelectionRange(0, dot > 0 ? dot : name.length);
  }, [name, isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre no puede quedar vacío.');
      return;
    }
    if (trimmed === item.name) {
      onClose();
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onRename(trimmed);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
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
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--bg-card)',
          width: '100%',
          maxWidth: '440px',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Edit2 size={16} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Cambiar nombre
            </h3>
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

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${error ? 'var(--danger)' : 'var(--border-color)'}`,
              background: 'var(--bg-body)',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
          {error && <p style={{ fontSize: '0.8rem', color: 'var(--danger)', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {isSaving && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
              Guardar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RenameModal;
