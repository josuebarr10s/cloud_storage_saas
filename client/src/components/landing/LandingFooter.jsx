import React from 'react';
import { Cloud, Globe, Shield, Heart } from 'lucide-react';

export const LandingFooter = () => {
  return (
    <footer
      style={{
        background: 'var(--text-main)',
        color: 'var(--text-light)',
        padding: '5rem 0 2.5rem 0',
      }}
    >
      <div className="landing-container">
        {/* Main Footer Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            marginBottom: '4rem',
          }}
        >
          {/* Col 1: Brand Info */}
          <div style={{ maxWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-white)',
                }}
              >
                <Cloud size={20} />
              </div>
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
              <span style={{ width: '6px', height: '6px', borderRadius: 'var(--radius-full)', background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }} />
              Sistemas: 100% Operacional
            </div>
          </div>

          {/* Col 2: Producto */}
          <div>
            <h4 style={{ color: 'var(--text-white)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Producto
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <li><a href="#features" style={{ color: 'var(--text-light)' }}>Características</a></li>
              <li><a href="#calculator" style={{ color: 'var(--text-light)' }}>Calculadora de Espacio</a></li>
              <li><a href="#pricing" style={{ color: 'var(--text-light)' }}>Planes y Precios</a></li>
              <li><a href="#security" style={{ color: 'var(--text-light)' }}>Seguridad y Cifrado</a></li>
              <li><a href="#faq" style={{ color: 'var(--text-light)' }}>Preguntas Frecuentes</a></li>
            </ul>
          </div>

          {/* Col 3: Recursos */}
          <div>
            <h4 style={{ color: 'var(--text-white)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Recursos
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <li><a href="#" style={{ color: 'var(--text-light)' }}>Documentación Técnica</a></li>
              <li><a href="#" style={{ color: 'var(--text-light)' }}>Guía de Uso</a></li>
              <li><a href="#" style={{ color: 'var(--text-light)' }}>Políticas de Archivo</a></li>
              <li><a href="#" style={{ color: 'var(--text-light)' }}>Centro de Asistencia</a></li>
            </ul>
          </div>

          {/* Col 4: Legal & Proyecto */}
          <div>
            <h4 style={{ color: 'var(--text-white)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Legal y Proyecto
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <li><a href="#" style={{ color: 'var(--text-light)' }}>Privacidad y Términos</a></li>
              <li><a href="#" style={{ color: 'var(--text-light)' }}>Acuerdo de Servicio (SLA)</a></li>
              <li><a href="#" style={{ color: 'var(--text-light)' }}>Seguridad de Datos</a></li>
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