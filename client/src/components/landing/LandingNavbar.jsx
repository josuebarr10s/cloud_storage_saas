import React, { useState, useEffect } from 'react';
import { Cloud, Menu, X, ArrowRight } from 'lucide-react';

export const LandingNavbar = ({ onLoginClick, onRegisterClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Características', href: '#features' },
    { label: 'Calculadora', href: '#calculator' },
    { label: 'Planes y Precios', href: '#pricing' },
    { label: 'Seguridad', href: '#security' },
    { label: 'Preguntas Frecuentes', href: '#faq' },
  ];

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: scrolled ? '0.75rem 1.5rem' : '1.15rem 1.5rem',
        transition: 'all 0.25s ease',
        background: scrolled ? 'var(--bg-overlay-light)' : 'var(--bg-overlay-glass)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
      }}
    >
      <div
        className="landing-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 0,
        }}
      >
        {/* Brand Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
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
              boxShadow: 'var(--shadow-glow-primary)',
            }}
          >
            <Cloud size={22} />
          </div>
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

        {/* Desktop Navigation Links */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '28px',
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500, transition: 'color 0.2s ease' }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '12px',
          }}
          className="desktop-actions"
        >
          <button
            onClick={onLoginClick}
            className="btn-ghost"
            style={{ fontSize: '0.9rem', color: 'var(--text-strong)', fontWeight: 600 }}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={onRegisterClick}
            className="btn-primary"
            style={{ padding: '0.65rem 1.35rem', fontSize: '0.9rem', borderRadius: 'var(--radius-sm)' }}
          >
            Comenzar ahora <ArrowRight size={16} />
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-toggle"
          style={{
            color: 'var(--text-main)',
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Abrir Menú"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          style={{
            marginTop: '1rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '0.95rem', color: 'var(--text-strong)', fontWeight: 500, padding: '8px 0', borderBottom: '1px solid var(--bg-hover)' }}>
              {link.label}
            </a>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
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
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onRegisterClick();
              }}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Comenzar ahora <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 860px) {
          .desktop-nav { display: flex !important; }
          .desktop-actions { display: flex !important; }
          .mobile-toggle { display: none !important; }
        }
      `}</style>
    </header>
  );
};

export default LandingNavbar;