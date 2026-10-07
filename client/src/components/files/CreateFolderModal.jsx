import React, { useState, useEffect } from 'react';
import { FolderPlus, X, Check, Folder } from 'lucide-react';

const FOLDER_COLORS = [
  { id: 'purple', label: 'Púrpura Nimbox', color: '#4f46e5', bg: '#eef2ff' },
  { id: 'indigo', label: 'Índigo Soft', color: '#6366f1', bg: '#e0e7ff' },
  { id: 'cyan', label: 'Cian Fresco', color: '#06b6d4', bg: '#ecfeff' },
  { id: 'emerald', label: 'Esmeralda', color: '#10b981', bg: '#ecfdf5' },
  { id: 'amber', label: 'Ámbar Cálido', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'rose', label: 'Rosa Vital', color: '#f43f5e', bg: '#fff1f2' },
  { id: 'slate', label: 'Gris Grafito', color: '#64748b', bg: '#f8fafc' }
];

export const CreateFolderModal = ({ isOpen, onClose, onCreateFolder, initialData = null }) => {
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('purple');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFolderName(initialData.name || '');
      setSelectedColor(initialData.color || 'purple');
    } else {
      setFolderName('');
      setSelectedColor('purple');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateFolder({ name: folderName.trim(), color: selectedColor });
      onClose();
    } catch (err) {
      console.error('Error al guardar la carpeta:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeColorObj = FOLDER_COLORS.find(c => c.id === selectedColor) || FOLDER_COLORS[0];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--bg-overlay)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: '460px',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
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
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: activeColorObj.bg,
                color: activeColorObj.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FolderPlus size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {initialData ? 'Editar Carpeta' : 'Nueva Carpeta'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                {initialData ? 'Personaliza el nombre y color' : 'Organiza tus archivos a tu gusto'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Visual Preview */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: activeColorObj.bg,
              border: `1px solid ${activeColorObj.color}30`,
              marginBottom: '1.25rem'
            }}
          >
            <Folder size={32} color={activeColorObj.color} fill={activeColorObj.color} fillOpacity={0.25} />
            <div style={{ overflow: 'hidden' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: activeColorObj.color }}>
                Vista Previa
              </span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {folderName.trim() || 'Nombre de la carpeta'}
              </div>
            </div>
          </div>

          {/* Folder Name Input */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              Nombre de la carpeta
            </label>
            <input
              type="text"
              placeholder="Ej. Documentos de Trabajo, Fotos 2026..."
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              autoFocus
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '0.9rem',
                outline: 'none',
                background: 'var(--bg-body)'
              }}
            />
          </div>

          {/* Color Selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              Color del icono
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {FOLDER_COLORS.map((c) => {
                const isSelected = selectedColor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id)}
                    title={c.label}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-full)',
                      background: c.color,
                      border: isSelected ? '3px solid var(--text-white)' : 'none',
                      boxShadow: isSelected ? `0 0 0 2px ${c.color}` : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSelected && <Check size={18} color="#ffffff" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !folderName.trim()}
              className="btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.85rem', opacity: (!folderName.trim() || isSubmitting) ? 0.6 : 1 }}
            >
              {isSubmitting ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Crear Carpeta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFolderModal;
