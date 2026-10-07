import React, { useState } from 'react';
import { Folder, MoreVertical, Edit2, Trash2, ArrowRight, FolderOpen } from 'lucide-react';

const COLOR_MAP = {
  purple: { color: '#4f46e5', bg: '#eef2ff', border: 'rgba(79, 70, 229, 0.25)' },
  indigo: { color: '#6366f1', bg: '#e0e7ff', border: 'rgba(99, 102, 241, 0.25)' },
  cyan: { color: '#06b6d4', bg: '#ecfeff', border: 'rgba(6, 182, 212, 0.25)' },
  emerald: { color: '#10b981', bg: '#ecfdf5', border: 'rgba(16, 185, 129, 0.25)' },
  amber: { color: '#f59e0b', bg: '#fffbeb', border: 'rgba(245, 158, 11, 0.25)' },
  rose: { color: '#f43f5e', bg: '#fff1f2', border: 'rgba(244, 63, 94, 0.25)' },
  slate: { color: '#64748b', bg: '#f8fafc', border: 'rgba(100, 116, 139, 0.25)' }
};

export const FolderCard = ({
  folder,
  viewMode = 'grid',
  onOpen,
  onEdit,
  onMove,
  onDelete,
  itemCount = 0,
  onDropFile
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const colorScheme = COLOR_MAP[folder.color] || COLOR_MAP.purple;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const data = e.dataTransfer.getData('text/plain');
    if (data && onDropFile) {
      try {
        const itemData = JSON.parse(data);
        onDropFile(itemData, folder.id);
      } catch (err) {}
    }
  };

  if (viewMode === 'list') {
    return (
      <tr
        style={{
          borderBottom: '1px solid var(--border-color)',
          transition: 'background 0.15s',
          cursor: 'pointer',
          background: isDragOver ? colorScheme.bg : 'var(--bg-card)'
        }}
        onClick={() => onOpen(folder)}
        onMouseEnter={(e) => (e.currentTarget.style.background = isDragOver ? colorScheme.bg : 'var(--bg-subtle)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = isDragOver ? colorScheme.bg : 'var(--bg-card)')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <td style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              background: colorScheme.bg,
              color: colorScheme.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Folder size={20} fill={colorScheme.color} fillOpacity={0.25} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {folder.name}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Carpeta · {itemCount} {itemCount === 1 ? 'elemento' : 'elementos'}
            </span>
          </div>
        </td>

        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          —
        </td>

        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {folder.updated}
        </td>

        <td style={{ padding: '12px 16px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: colorScheme.color,
              background: colorScheme.bg,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Carpeta Personal
          </span>
        </td>

        <td style={{ padding: '12px 20px', textAlign: 'right' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onOpen(folder)}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                color: colorScheme.color,
                background: colorScheme.bg,
                border: `1px solid ${colorScheme.border}`,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}
              title="Abrir carpeta"
            >
              <FolderOpen size={15} />
              <span>Abrir</span>
            </button>

            <button
              type="button"
              onClick={() => onEdit(folder)}
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }}
              title="Editar carpeta"
            >
              <Edit2 size={15} />
            </button>

            <button
              type="button"
              onClick={() => onMove(folder)}
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }}
              title="Mover carpeta"
            >
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              onClick={() => onDelete(folder)}
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                cursor: 'pointer'
              }}
              title="Eliminar carpeta"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // GRID VIEW CARD
  return (
    <div
      onClick={() => onOpen(folder)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        background: isDragOver ? colorScheme.bg : 'var(--bg-card)',
        border: `1px solid ${isDragOver ? colorScheme.color : colorScheme.border}`,
        borderRadius: 'var(--radius-md)',
        padding: '1.15rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isDragOver ? `0 0 0 2px ${colorScheme.color}` : 'var(--shadow-sm)',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (!isDragOver) {
          e.currentTarget.style.borderColor = colorScheme.color;
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragOver) {
          e.currentTarget.style.borderColor = colorScheme.border;
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: colorScheme.bg,
            color: colorScheme.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <Folder size={24} fill={colorScheme.color} fillOpacity={0.3} />
        </div>

        {/* Dropdown Menu Toggle */}
        <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              padding: '4px',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <MoreVertical size={16} />
          </button>

          {isMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-modal)',
                border: '1px solid var(--border-color)',
                zIndex: 50,
                minWidth: '150px',
                padding: '4px 0',
                marginTop: '4px'
              }}
            >
              <button
                type="button"
                onClick={() => { setIsMenuOpen(false); onOpen(folder); }}
                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FolderOpen size={14} color={colorScheme.color} /> Abrir carpeta
              </button>
              <button
                type="button"
                onClick={() => { setIsMenuOpen(false); onEdit(folder); }}
                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Edit2 size={14} /> Personalizar
              </button>
              <button
                type="button"
                onClick={() => { setIsMenuOpen(false); onMove(folder); }}
                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <ArrowRight size={14} /> Mover carpeta
              </button>
              <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
              <button
                type="button"
                onClick={() => { setIsMenuOpen(false); onDelete(folder); }}
                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '0.82rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4
          style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            margin: '0 0 4px 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={folder.name}
        >
          {folder.name}
        </h4>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
          {itemCount} {itemCount === 1 ? 'elemento' : 'elementos'} · {folder.updated}
        </p>
      </div>

      <div
        style={{
          marginTop: '1rem',
          paddingTop: '0.6rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem'
        }}
      >
        <span style={{ color: colorScheme.color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <FolderOpen size={12} /> Clic para abrir
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
          {folder.color}
        </span>
      </div>
    </div>
  );
};

export default FolderCard;
