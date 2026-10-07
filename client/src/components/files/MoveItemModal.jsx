import React, { useState, useEffect } from 'react';
import { Folder, FolderPlus, ArrowRight, X, Check, Home, CornerDownRight } from 'lucide-react';
import { filesService } from '../../services/filesService.js';

export const MoveItemModal = ({ isOpen, onClose, item, currentUser, onMoveSuccess, onNotification }) => {
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null); // null means root
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) return;

    async function fetchFolders() {
      setIsLoading(true);
      try {
        const allFolders = await filesService.getAllUserFolders(currentUser?.id);
        // Exclude the item itself if it's a folder (cannot move inside itself)
        const validFolders = item.isFolder 
          ? allFolders.filter(f => f.id !== item.id) 
          : allFolders;
        setFolders(validFolders);
        // Set initial selected folder to item's current parent folder or null
        setSelectedFolderId(item.isFolder ? item.parentId : item.folder_id);
      } catch (err) {
        console.error('Error al cargar carpetas para mover:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFolders();
  }, [isOpen, item, currentUser?.id]);

  if (!isOpen || !item) return null;

  const handleMove = async () => {
    setIsSubmitting(true);
    try {
      if (item.isFolder) {
        await filesService.moveFolderToFolder(item.id, selectedFolderId);
      } else {
        await filesService.moveFileToFolder(item.id, selectedFolderId);
      }

      const targetFolderObj = folders.find(f => f.id === selectedFolderId);
      const destinationName = targetFolderObj ? `"${targetFolderObj.name}"` : 'el Espacio Principal (Raíz)';

      onNotification && onNotification(`"${item.name}" se movió con éxito a ${destinationName}.`, 'success');
      onMoveSuccess && onMoveSuccess();
      onClose();
    } catch (err) {
      onNotification && onNotification(`Error al mover: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          maxWidth: '480px',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ArrowRight size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Mover {item.isFolder ? 'Carpeta' : 'Archivo'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                Selecciona la carpeta de destino para <strong>"{item.name}"</strong>
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

        {/* Directory Selection List */}
        <div style={{ padding: '1.25rem 1.5rem', maxHeight: '320px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Destino:
          </div>

          {/* Root Choice */}
          <div
            onClick={() => setSelectedFolderId(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: selectedFolderId === null ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              background: selectedFolderId === null ? 'var(--primary-light)' : 'var(--bg-body)',
              cursor: 'pointer',
              marginBottom: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Home size={18} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Espacio Principal (Raíz)
              </span>
            </div>
            {selectedFolderId === null && <Check size={18} color="var(--primary)" />}
          </div>

          {/* User Folders */}
          {isLoading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Cargando carpetas disponibles...
            </div>
          ) : folders.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No tienes otras carpetas creadas aún. Puedes moverlo a la raíz.
            </div>
          ) : (
            folders.map((f) => {
              const isSelected = selectedFolderId === f.id;
              const isCurrentLocation = item.isFolder ? item.parentId === f.id : item.folder_id === f.id;

              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: isSelected ? 'var(--primary-light)' : 'var(--bg-body)',
                    cursor: 'pointer',
                    marginBottom: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Folder size={18} color={f.color ? `var(--${f.color}, #4f46e5)` : 'var(--primary)'} />
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                      {f.name}
                    </span>
                    {isCurrentLocation && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 'var(--radius-xs)' }}>
                        Ubicación actual
                      </span>
                    )}
                  </div>
                  {isSelected && <Check size={18} color="var(--primary)" />}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'var(--bg-subtle)'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={isSubmitting}
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: '0.85rem', opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? 'Moviendo...' : 'Mover Aquí'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveItemModal;
