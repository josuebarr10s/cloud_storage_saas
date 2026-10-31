import React, { useState } from 'react';
import { Check, Minus, ChevronDown, Layers } from 'lucide-react';
import { Reveal } from './Reveal.jsx';

export const FeatureComparison = () => {
  const [expanded, setExpanded] = useState(false);

  const comparisonRows = [
    {
      category: 'Almacenamiento y Archivos',
      items: [
        { feature: 'Capacidad de almacenamiento', basic: '10 GB', pro: '500 GB', enterprise: '2 TB' },
        { feature: 'Carpetas, vista previa y búsqueda', basic: true, pro: true, enterprise: true },
        { feature: 'Subir arrastrando archivos', basic: true, pro: true, enterprise: true },
        { feature: 'Historial de versiones', basic: true, pro: true, enterprise: true },
        { feature: 'Papelera para recuperar archivos', basic: '7 días', pro: '30 días', enterprise: 'Sin límite' },
      ]
    },
    {
      category: 'Compartir',
      items: [
        { feature: 'Compartir archivos y carpetas por enlace', basic: true, pro: true, enterprise: true },
        { feature: 'Enlaces de editor (colaborar)', basic: false, pro: true, enterprise: true },
        { feature: 'Enlaces con contraseña', basic: false, pro: true, enterprise: true },
        { feature: 'Enlaces con fecha de vencimiento', basic: false, pro: true, enterprise: true },
        { feature: 'Enlaces solo para correos invitados', basic: false, pro: false, enterprise: true },
        { feature: 'Ver quién abrió cada enlace', basic: false, pro: false, enterprise: true },
      ]
    }
  ];

  const renderCell = (val) => {
    if (val === true) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: 'var(--radius-full)', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={13} color="var(--success-hover)" />
          </div>
        </div>
      );
    }
    if (val === false) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Minus size={16} color="var(--text-light)" />
        </div>
      );
    }
    return <span style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>{val}</span>;
  };

  return (
    <section style={{ padding: '0 0 clamp(4rem, 8vw, 6rem) 0', background: 'var(--bg-subtle)' }}>
      <div className="landing-container">
        {/* Toggle Button */}
        <Reveal style={{ textAlign: 'center', marginBottom: expanded ? '2rem' : 0, transition: 'margin 0.3s ease' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="white-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.75rem 1.75rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-hover)',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              fontWeight: 600,
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            <Layers size={18} color="var(--primary)" />
            <span>{expanded ? 'Ocultar comparativa detallada' : 'Ver comparativa completa de funciones'}</span>
            <ChevronDown size={18} className={`chevron-rotate ${expanded ? 'is-open' : ''}`} />
          </button>
        </Reveal>

        {/* Expandable Table */}
        <div className={`collapse ${expanded ? 'is-open' : ''}`} aria-hidden={!expanded}>
          <div>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--bg-hover)' }}>
                    <th style={{ padding: '14px 18px', fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700, width: '40%' }}>
                      Función / Característica
                    </th>
                    <th style={{ padding: '14px 18px', fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', width: '20%' }}>
                      Básico ($5/mes)
                    </th>
                    <th style={{ padding: '14px 18px', fontSize: '0.9rem', color: 'var(--primary)', textAlign: 'center', width: '20%', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0' }}>
                      Pro ($12/mes)
                    </th>
                    <th style={{ padding: '14px 18px', fontSize: '0.9rem', color: 'var(--text-main)', textAlign: 'center', width: '20%' }}>
                      Empresarial ($49/mes)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((cat, catIdx) => (
                    <React.Fragment key={catIdx}>
                      <tr style={{ background: 'var(--bg-subtle)' }}>
                        <td
                          colSpan={4}
                          style={{
                            padding: '12px 18px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderTop: '1px solid var(--border-color)',
                          }}
                        >
                          {cat.category}
                        </td>
                      </tr>
                      {cat.items.map((item, itemIdx) => (
                        <tr
                          key={itemIdx}
                          style={{ borderBottom: '1px solid var(--bg-hover)' }}
                        >
                          <td style={{ padding: '12px 18px', fontSize: '0.85rem', color: 'var(--text-strong)' }}>
                            {item.feature}
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                            {renderCell(item.basic)}
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center', background: 'var(--bg-tint)' }}>
                            {renderCell(item.pro)}
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                            {renderCell(item.enterprise)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureComparison;