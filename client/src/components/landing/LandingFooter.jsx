import React from 'react';
import { Globe, Shield, Heart } from 'lucide-react';

export const LandingFooter = () => {
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
              Plataforma de almacenamiento en la nube segura, rápida y escalable (STaaS). Diseñada para la protección y distribución de archivos digitales.
            </p>

            {/* System Status Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--success-bg)',
                border: '1px solid var(--success-light)',
                fontSize: '0.75rem',
                color: 'var(--success-hover)',
                fontWeight: 600,
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: 'var(--radius-full)', background: 'var(--success)', boxShadow: '0 0 6px var(--success)', animation: 'pulseGlow 2s ease-in-out infinite' }} />
              Sistemas: 100% Operacional
            </div>
          </div>

          {/* Col 2: Producto */}
          <div>
            <h4 style={{ color: 'var(--text-white)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Producto
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <li><a href="#security" className="footer-link">Seguridad y Cifrado</a></li>
              <li><a href="#features" className="footer-link">Características</a></li>
              <li><a href="#calculator" className="footer-link">Calculadora de Espacio</a></li>
              <li><a href="#pricing" className="footer-link">Planes y Precios</a></li>
              <li><a href="#faq" className="footer-link">Preguntas Frecuentes</a></li>
            </ul>
          </div>

          {/* Col 3: Recursos */}
          <div>
            <h4 style={{ color: 'var(--text-white)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Recursos
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <li><a href="#" className="footer-link">Documentación Técnica</a></li>
              <li><a href="#" className="footer-link">Guía de Uso</a></li>
              <li><a href="#" className="footer-link">Políticas de Archivo</a></li>
              <li><a href="#" className="footer-link">Centro de Asistencia</a></li>
            </ul>
          </div>

          {/* Col 4: Legal & Proyecto */}
          <div>
            <h4 style={{ color: 'var(--text-white)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Legal y Proyecto
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <li><a href="#" className="footer-link">Privacidad y Términos</a></li>
              <li><a href="#" className="footer-link">Acuerdo de Servicio (SLA)</a></li>
              <li><a href="#" className="footer-link">Seguridad de Datos</a></li>
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