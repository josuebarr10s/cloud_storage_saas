import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowRight, LogOut } from 'lucide-react';

// En el mismo orden en que aparecen las secciones en la página
const navLinks = [
  { label: 'Características', href: '#features' },
  { label: 'Calculadora', href: '#calculator' },
  { label: 'Planes y Precios', href: '#pricing' },
  { label: 'Preguntas Frecuentes', href: '#faq' },
];

// Una sección cuenta como "activa" cuando su inicio pasa este punto de la pantalla
const ACTIVE_SECTION_OFFSET = 0.4;

// Devuelve el href de la última sección que ya alcanzó el punto de referencia,
// o '' si todavía estamos en el hero
const getActiveSection = () => {
  const marker = window.innerHeight * ACTIVE_SECTION_OFFSET;
  let active = '';
  navLinks.forEach((link) => {
    const section = document.querySelector(link.href);
    if (section && section.getBoundingClientRect().top <= marker) active = link.href;
  });
  return active;
};

export const LandingNavbar = ({ onLoginClick, onRegisterClick, onLogoutClick, currentUser }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const progressRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // La barra de progreso se actualiza directo en el DOM para no re-renderizar en cada scroll
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
      }

      setActiveSection(getActiveSection());
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const primerNombre = currentUser ? (currentUser.name || currentUser.email || '').split(' ')[0] : '';

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: scrolled ? '0.7rem 0' : '1.1rem 0',
        transition: 'padding 0.3s ease, background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        background: scrolled ? 'var(--bg-overlay-light)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(160%)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-color)' : '1px solid transparent',
        boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
      }}
    >
      <div
        className="landing-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Brand Logo */}
        <a href="#" className="brand-link" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
          <img
            src="/logo.png"
            alt="Nimbox Logo"
            className="brand-logo"
            style={{
              width: '38px',
              height: '38px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 8px rgba(99, 102, 241, 0.25))'
            }}
          />
          <span
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-main)',
            }}
          >
            Nimbox
          </span>
        </a>

        <nav
          style={{
            alignItems: 'center',
            gap: '28px',
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`nav-link ${activeSection === link.href ? 'is-active' : ''}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div
          style={{
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
          }}
          className="desktop-actions"
        >
          {currentUser ? (
            <>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>
                Hola, {primerNombre}
              </span>
              <button
                onClick={onLogoutClick}
                className="btn-ghost"
                style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', marginRight: '8px' }}
                title="Cerrar sesión"
              >
                <LogOut size={15} /> Salir
              </button>
            </>
          ) : (
            <button
              onClick={onLoginClick}
              className="btn-ghost"
              style={{ fontSize: '0.9rem', color: 'var(--text-strong)', fontWeight: 600 }}
            >
              Iniciar Sesión
            </button>
          )}

          <button
            onClick={() => onRegisterClick(null)}
            className="btn-primary btn-shine"
            style={{ padding: '0.65rem 1.35rem', fontSize: '0.9rem', borderRadius: 'var(--radius-sm)' }}
          >
            {currentUser ? 'Elegir Plan' : 'Comenzar ahora'} <ArrowRight size={16} />
          </button>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-toggle"
          style={{
            color: 'var(--text-main)',
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={mobileMenuOpen ? 'Cerrar Menú' : 'Abrir Menú'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="landing-container">
          <div
            className="mobile-menu"
            style={{
              marginTop: '1rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '0.95rem',
                  color: activeSection === link.href ? 'var(--primary)' : 'var(--text-strong)',
                  fontWeight: 500,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--bg-hover)',
                }}
              >
                {link.label}
              </a>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {currentUser ? (
                <>
                  <div style={{ padding: '8px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', textAlign: 'center' }}>
                    Hola, {primerNombre}
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogoutClick && onLogoutClick();
                    }}
                    className="btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                  >
                    <LogOut size={15} /> Cerrar sesión
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLoginClick();
                  }}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Iniciar Sesión
                </button>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onRegisterClick(null);
                }}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {currentUser ? 'Elegir Plan' : 'Comenzar ahora'} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={progressRef} className="scroll-progress" />
    </header>
  );
};

export default LandingNavbar;
