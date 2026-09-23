import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Camera,
  Film,
  FileText,
  TrendingDown,
  ArrowRight
} from 'lucide-react';

export const StorageCalculator = ({ onSelectPlan }) => {
  const [storageGB, setStorageGB] = useState(250);

  // Estimaciones basadas en peso promedio
  const photosCount = Math.round(storageGB * 200); // 5MB por foto
  const videoHours = Math.round(storageGB * 0.25); // 4GB por hora 4K
  const docsCount = Math.round(storageGB * 500); // 2MB por documento

  // Determinación de plan recomendado
  let recommendedPlan = {
    name: 'Básico',
    price: 5,
    period: 'USD / mes',
    badge: 'Uso Personal',
    desc: 'Para uso personal y organización esencial. 10 GB de almacenamiento y acceso desde 2 dispositivos.',
    planId: 1
  };

  if (storageGB > 10 && storageGB <= 500) {
    recommendedPlan = {
      name: 'Pro',
      price: 12,
      period: 'USD / mes',
      badge: 'Recomendado',
      desc: 'Para profesionales y pequeños equipos. 500 GB de almacenamiento, dispositivos ilimitados y soporte 24/7.',
      planId: 2
    };
  } else if (storageGB > 500) {
    recommendedPlan = {
      name: 'Empresarial',
      price: 49,
      period: 'USD / mes',
      badge: 'Ilimitado / 2 TB',
      desc: 'Para organizaciones exigentes. Almacenamiento masivo, SSO, SLA 99.99% y soporte dedicado.',
      planId: 3
    };
  }

  const presets = [
    { label: 'Básico (10 GB)', value: 10 },
    { label: 'Freelancer (150 GB)', value: 150 },
    { label: 'Pro Team (500 GB)', value: 500 },
    { label: 'Empresas (2 TB)', value: 2000 },
  ];

  return (
    <section
      id="calculator"
      style={{
        padding: '5.5rem 0',
        background: 'var(--bg-body)',
        borderTop: '1px solid var(--border-color)',
      }}
    >
      <div className="landing-container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem auto' }}>
          <div className="pill-badge" style={{ marginBottom: '1rem' }}>
            <Sliders size={14} /> Simulador de Almacenamiento
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.6rem)',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.03em',
              marginBottom: '0.75rem',
            }}
          >
            Calcula el espacio que tu equipo necesita
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
            Ajusta la capacidad deseada para conocer la equivalencia en archivos y el plan recomendado de Nimbox.
          </p>
        </div>

        {/* Main Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '28px',
            alignItems: 'center',
          }}
        >
          {/* Left Panel: Slider & File Equivalencies */}
          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)',
              padding: '2.25rem',
            }}
          >
            {/* Presets */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>
                Casos de uso comunes:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setStorageGB(p.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: storageGB === p.value ? 'var(--primary)' : 'var(--bg-card)',
                      color: storageGB === p.value ? 'var(--text-white)' : 'var(--text-secondary)',
                      border: storageGB === p.value ? '1px solid var(--primary)' : '1px solid var(--border-hover)',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider */}
            <div style={{ margin: '2rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Capacidad seleccionada:</span>
                <span style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  {storageGB >= 1000 ? `${(storageGB / 1000).toFixed(1)} TB` : `${storageGB} GB`}
                </span>
              </div>

              <input
                type="range"
                min="10"
                max="2500"
                step="10"
                value={storageGB}
                onChange={(e) => setStorageGB(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: 'var(--radius-xs)',
                  background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(storageGB / 2500) * 100}%, var(--border-color) ${(storageGB / 2500) * 100}%, var(--border-color) 100%)`,
                  appearance: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '6px' }}>
                <span>10 GB (Básico - $5)</span>
                <span>500 GB (Pro - $12)</span>
                <span>2 TB+ (Empresarial - $49)</span>
              </div>
            </div>

            {/* File breakdown */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: '12px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <Camera size={18} color="var(--accent-sky)" style={{ margin: '0 auto 4px auto' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>~{photosCount.toLocaleString()}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fotos HD</p>
              </div>

              <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: '12px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <Film size={18} color="var(--accent-violet)" style={{ margin: '0 auto 4px auto' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>~{videoHours.toLocaleString()} hrs</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Video 4K</p>
              </div>

              <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: '12px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <FileText size={18} color="var(--success-hover)" style={{ margin: '0 auto 4px auto' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>~{docsCount.toLocaleString()}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Documentos</p>
              </div>
            </div>
          </div>

          {/* Right Panel: Recommended Plan Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
              color: 'var(--text-white)',
              borderRadius: 'var(--radius-xl)',
              padding: '2.5rem',
              boxShadow: 'var(--shadow-card-primary)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: 'var(--white-alpha-20)',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    letterSpacing: '0.05em',
                  }}
                >
                  Plan Recomendado
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-white)',
                    background: 'var(--success)',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {recommendedPlan.badge}
                </span>
              </div>

              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                Plan {recommendedPlan.name}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--accent-indigo-bg)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
                {recommendedPlan.desc}
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2rem' }}>
                <span style={{ fontSize: '3.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                  ${recommendedPlan.price}
                </span>
                <span style={{ fontSize: '0.95rem', color: 'var(--accent-indigo-border)' }}>
                  {recommendedPlan.period}
                </span>
              </div>
            </div>

            <button
              onClick={() => onSelectPlan && onSelectPlan(recommendedPlan)}
              style={{
                width: '100%',
                padding: '0.9rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '0.95rem',
                background: 'var(--bg-card)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              Elegir Plan {recommendedPlan.name} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StorageCalculator;