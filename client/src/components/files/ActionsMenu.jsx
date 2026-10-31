import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

const MENU_WIDTH = 210;
const ITEM_HEIGHT = 36;
const GAP = 4;

/**
 * Botón de tres puntos con un menú de acciones.
 * El menú se dibuja en el body con posición fija, así no lo recorta el contenedor de la lista
 * y se abre hacia arriba si no cabe abajo.
 * items: [{ label, icon, onClick, danger?, separatorBefore? }]
 */
export const ActionsMenu = ({ items, label = 'Más opciones', buttonStyle, iconSize = 16 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const close = () => setIsOpen(false);

  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const separators = items.filter(i => i.separatorBefore).length;
    const height = items.length * ITEM_HEIGHT + separators * 9 + 8;
    const openUp = window.innerHeight - rect.bottom < height + GAP && rect.top > height + GAP;
    setPosition({
      top: openUp ? rect.top - height - GAP : rect.bottom + GAP,
      left: Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8)
    });
  }, [isOpen]);

  // Cerrar al hacer clic fuera, con Escape o si la página se mueve
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (e) => {
      if (menuRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      close();
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(open => !open); }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={label}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '2px',
          display: 'inline-flex',
          alignItems: 'center',
          ...buttonStyle
        }}
      >
        <MoreVertical size={iconSize} />
      </button>

      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          role="menu"
          // Los eventos de un portal suben por el árbol de React: no deben llegar a la tarjeta o fila
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: MENU_WIDTH,
            zIndex: 9000,
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-modal)',
            border: '1px solid var(--border-color)',
            padding: '4px 0',
            animation: 'fadeIn 0.12s ease-out'
          }}
        >
          {items.map(({ label: itemLabel, icon: Icon, onClick, danger, separatorBefore }) => (
            <React.Fragment key={itemLabel}>
              {separatorBefore && <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />}
              <button
                type="button"
                role="menuitem"
                onClick={() => { close(); onClick(); }}
                style={{
                  width: '100%',
                  height: ITEM_HEIGHT,
                  textAlign: 'left',
                  padding: '0 12px',
                  fontSize: '0.84rem',
                  color: danger ? 'var(--danger)' : 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                {Icon && <Icon size={15} />}
                {itemLabel}
              </button>
            </React.Fragment>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

export default ActionsMenu;
