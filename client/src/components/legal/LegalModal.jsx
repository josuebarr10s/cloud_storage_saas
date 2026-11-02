import React, { useState, useEffect } from 'react';
import { X, FileText, Shield } from 'lucide-react';

const UPDATED = 'octubre de 2026';

// Textos cortos y fieles a lo que Nimbox hace de verdad (proyecto académico, pagos simulados)
const TERMS = [
  {
    title: 'Qué es Nimbox',
    body: 'Nimbox es un proyecto académico del curso Ingeniería de Software I de la Universidad Rafael Landívar. No es un servicio comercial: puede cambiar, detenerse o borrarse al terminar el curso, así que no guardes aquí archivos importantes sin tener otra copia.'
  },
  {
    title: 'Tu cuenta',
    body: 'Debes registrarte con un correo válido y eres responsable de cuidar tu contraseña. El administrador puede suspender cuentas que hagan mal uso de la plataforma.'
  },
  {
    title: 'Planes y pagos',
    body: 'Los pagos son simulados: no se cobra ninguna tarjeta real. Cada plan tiene un límite de espacio; al alcanzarlo no podrás subir más archivos hasta liberar espacio o cambiar de plan. Las suscripciones se renuevan automáticamente cada periodo (también de forma simulada).'
  },
  {
    title: 'Tus archivos',
    body: 'Lo que subes es tuyo. No subas contenido ilegal, malicioso o de otras personas sin su permiso. Lo que mandas a la papelera se borra definitivamente después del tiempo de tu plan (7 días en Básico, 30 en Pro, sin límite en Empresarial).'
  },
  {
    title: 'Compartir',
    body: 'Cuando creas un enlace, tú decides a quién se lo das y qué permiso tiene. Lo que suba un editor por tu enlace queda a tu nombre y ocupa tu espacio. Puedes desactivar un enlace en cualquier momento.'
  }
];

const PRIVACY = [
  {
    title: 'Qué datos guardamos',
    body: 'Tu nombre, correo y contraseña (cifrada por Supabase Auth, nadie puede leerla); tu plan y tus pagos simulados (solo la marca y los últimos 4 dígitos de la tarjeta, nunca el número completo ni el CVC); tus archivos y su información (nombre, tamaño, carpeta y fechas); y los enlaces que creas o abres.'
  },
  {
    title: 'Dónde se guardan',
    body: 'En Supabase: la información en una base de datos PostgreSQL y el contenido de los archivos en Supabase Storage. La conexión entre tu navegador y Supabase va cifrada (HTTPS).'
  },
  {
    title: 'Quién puede verlos',
    body: 'Tus archivos solo los ves tú y las personas a las que les compartas un enlace. El administrador de Nimbox ve tu nombre, correo, plan, espacio usado y pagos, pero no tus archivos. Si abres un enlace de alguien con plan Empresarial, esa persona puede ver tu nombre, tu correo y cuántas veces lo abriste.'
  },
  {
    title: 'Lo que no hacemos',
    body: 'No vendemos ni compartimos tus datos con nadie y no mostramos publicidad.'
  },
  {
    title: 'Borrar tu cuenta',
    body: 'Puedes pedirle al administrador del proyecto que elimine tu cuenta junto con tus archivos.'
  }
];

const TABS = {
  terms: { label: 'Términos de servicio', icon: FileText, sections: TERMS },
  privacy: { label: 'Política de privacidad', icon: Shield, sections: PRIVACY }
};

/**
 * Términos de servicio y política de privacidad.
 * initialTab: 'terms' | 'privacy'
 */
export const LegalModal = ({ isOpen, onClose, initialTab = 'terms' }) => {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const current = TABS[tab] || TABS.terms;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={current.label}
        style={{
          background: 'var(--bg-card)',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '85vh',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con pestañas */}
        <div style={{ padding: '1rem 1.25rem 0', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Nimbox</h3>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {Object.entries(TABS).map(([key, { label, icon: Icon }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderBottom: `2px solid ${tab === key ? 'var(--primary)' : 'transparent'}`,
                  background: 'none',
                  color: tab === key ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {current.sections.map(section => (
            <div key={section.title}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px 0' }}>{section.title}</h4>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-muted)', margin: 0 }}>{section.body}</p>
            </div>
          ))}
          <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', margin: '6px 0 0 0' }}>Última actualización: {UPDATED}.</p>
        </div>

        <div style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-primary" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
