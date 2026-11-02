import React from 'react';

// onOpenLegal(tab): abre los términos ('terms') o la privacidad ('privacy')
export const LandingFooter = ({ onOpenLegal }) => {
  return (
    <footer
      style={{
        background: 'var(--text-main)',
        color: 'var(--text-light)',
        padding: 'clamp(3.5rem, 8vw, 5rem) 0 2.5rem 0',
      }}
    >
      <div className="landing-container">
        {/* Main Footer Grid */}
        <div className="footer-grid" style={{ marginBottom: 'clamp(2.5rem, 6vw, 4rem)' }}>
          {/* Col 1: Brand Info */}
          <div className="footer-brand" style={{ maxWidth: '340px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <img
                src="/logo.png"
                alt="Nimbox Logo"
                style={{
                  width: '36px',
                  height: '36px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 8px rgba(99, 102, 241, 0.3))'
                }}
              />
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-white)', letterSpacing: '-0.02em' }}>
                Nimbox
              </span>
            </div>

            <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-light)', marginBottom: '1.5rem' }}>
              Plataforma de almacenamiento en la nube (STaaS) para guardar, organizar y compartir archivos. Proyecto académico de Ingeniería de Software I.
            </p>
          </div>

          {/* Col 2: Producto */}
          <div>
            <h4 style={{ color: 'var(--text-white)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Producto
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <li><a href="#features" className="footer-link">Características</a></li>
              <li><a href="#calculator" className="footer-link">Calculadora de Espacio</a></li>
              <li><a href="#pricing" className="footer-link">Planes y Precios</a></li>
              <li><a href="#faq" className="footer-link">Preguntas Frecuentes</a></li>
            </ul>
          </div>

          {/* Col 3: Legal & Proyecto */}
          <div>
            <h4 style={{ color: 'var(--text-white)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Legal y Proyecto
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <li>
                <button type="button" onClick={() => onOpenLegal && onOpenLegal('terms')} className="footer-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
                  Términos de servicio
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onOpenLegal && onOpenLegal('privacy')} className="footer-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
                  Política de privacidad
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            paddingTop: '2rem',
            borderTop: '1px solid var(--bg-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            © 2026 Nimbox Cloud Storage. Universidad Rafael Landívar — Ingeniería de Software I.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Arquitectura Cloud STaaS</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;