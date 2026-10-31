import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  Camera,
  Film,
  FileText,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { plansService } from '../../services/plansService.js';
import { DEFAULT_PLANS } from '../../constants/plans.js';
import { Reveal } from './Reveal.jsx';


export const StorageCalculator = ({ onSelectPlan }) => {
  const [storageGB, setStorageGB] = useState(250);
  const [plans, setPlans] = useState(DEFAULT_PLANS);

  useEffect(() => {
    async function load() {
      try {
        const dbPlans = await plansService.getPlans();
        if (dbPlans && dbPlans.length > 0) {
          const sorted = dbPlans.slice().sort((a, b) => a.precio - b.precio);
          setPlans(sorted);
        }
      } catch (e) {
        console.warn('Usando planes fallback en calculadora');
      }
    }
    load();
  }, []);

  // Estimaciones basadas en peso promedio
  const photosCount = Math.round(storageGB * 200); // 5MB por foto
  const videoHours = Math.round(storageGB * 0.25); // 4GB por hora 4K
  const docsCount = Math.round(storageGB * 500); // 2MB por documento

  // Determinación de plan recomendado
  let recommendedPlan = plans[0] || DEFAULT_PLANS[0];

  if (storageGB > 10 && storageGB <= 500) {
    recommendedPlan = plans[1] || DEFAULT_PLANS[1];
  } else if (storageGB > 500) {
    recommendedPlan = plans[2] || DEFAULT_PLANS[2];
  }

  const presets = [
    { label: 'Básico (10 GB)', value: 10 },
    { label: 'Freelancer (150 GB)', value: 150 },
    { label: 'Pro Team (500 GB)', value: 500 },
    { label: 'Empresas (2 TB)', value: 2000 },
  ];

  const handleChoosePlan = () => {
    if (onSelectPlan) {
      onSelectPlan(recommendedPlan, 'monthly');
    }
  };

  return (
    <section
      id="calculator"
      className="landing-section"
      style={{
        background: 'var(--bg-body)',
        borderTop: '1px solid var(--border-color)',
      }}
    >
      <div className="landing-container">
        {/* Header */}
        <Reveal style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem auto' }}>
          <div className="pill-badge" style={{ marginBottom: '1rem' }}>
            <Sliders size={14} /> Simulador de Almacenamiento
          </div>
          <h2 className="section-title">Calcula el espacio que tu equipo necesita</h2>
          <p className="section-subtitle">
            Ajusta la capacidad deseada para conocer la equivalencia en archivos y seleccionar el plan ideal de Nimbox.
          </p>
        </Reveal>

        {/* Main Grid */}
        <div className="calc-grid">
          {/* Left Panel: Slider & File Equivalencies */}
          <Reveal
            variant="left"
            className="calc-panel"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)',
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
                    className="preset-btn"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: storageGB === p.value ? 'var(--primary)' : 'var(--bg-card)',
                      color: storageGB === p.value ? 'var(--text-white)' : 'var(--text-secondary)',
                      border: storageGB === p.value ? '1px solid var(--primary)' : '1px solid var(--border-hover)',
                      cursor: 'pointer',
                      boxShadow: storageGB === p.value ? 'var(--shadow-button-primary)' : 'none',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider */}
            <div style={{ margin: '2rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px 12px', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Capacidad seleccionada:</span>
                <span className="stat-value" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.5rem)', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  {storageGB >= 1000 ? `${(storageGB / 1000).toFixed(1)} TB` : `${storageGB} GB`}
                </span>
              </div>

              <input
                type="range"
                min="10"
                max="2000"
                step="10"
                value={storageGB}
                onChange={(e) => setStorageGB(Number(e.target.value))}
                className="nimbox-range"
                aria-label="Capacidad de almacenamiento en GB"
                style={{
                  background: `linear-gradient(to right, var(--primary) 0%, var(--accent-violet) ${(storageGB / 2000) * 100}%, var(--border-color) ${(storageGB / 2000) * 100}%, var(--border-color) 100%)`,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '10px' }}>
                <span>10 GB (Básico - $5)</span>
                <span>500 GB (Pro - $12)</span>
                <span>2 TB (Empresarial - $49)</span>
              </div>
            </div>

            {/* File breakdown */}
            <div
              className="calc-breakdown"
              style={{
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
          </Reveal>

          {/* Right Panel: Recommended Plan Banner */}
          <Reveal
            variant="right"
            delay={120}
            className="gradient-card"
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
              color: 'var(--text-white)',
              borderRadius: 'var(--radius-xl)',
              padding: 'clamp(1.75rem, 4vw, 2.5rem)',
              boxShadow: 'var(--shadow-card-primary)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div key={recommendedPlan.nombre || recommendedPlan.name} className="pop-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
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
                  {recommendedPlan.badge || (recommendedPlan.nombre === 'Pro' ? 'Recomendado' : recommendedPlan.nombre === 'Básico' ? 'Económico' : 'Máximo Poder')}
                </span>
              </div>

              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                Plan {recommendedPlan.nombre || recommendedPlan.name}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--accent-indigo-bg)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
                {recommendedPlan.descripcion || recommendedPlan.desc || 'Almacenamiento en la nube para tus archivos.'}
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2rem' }}>
                <span style={{ fontSize: 'clamp(2.6rem, 6vw, 3.4rem)', fontWeight: 800, letterSpacing: '-0.03em' }}>
                  ${recommendedPlan.precio || recommendedPlan.price}
                </span>
                <span style={{ fontSize: '0.95rem', color: 'var(--accent-indigo-border)' }}>
                  USD / mes
                </span>
              </div>
            </div>

            <button
              onClick={handleChoosePlan}
              className="white-btn btn-shine"
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
                cursor: 'pointer',
                border: 'none',
              }}
            >
              Registrarme con Plan {recommendedPlan.nombre || recommendedPlan.name} <ArrowRight size={16} />
            </button>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default StorageCalculator;