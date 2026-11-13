import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { RefreshCw, Loader2, BarChart3, Table2 } from 'lucide-react';
import { adminService } from '../../services/adminService.js';
import { PERIODOS, calcularEstadisticas } from '../../utils/adminStats.js';

/**
 * Estadísticas de ventas para el administrador: qué planes se contratan más,
 * contrataciones e ingresos por semana o por mes.
 */

const GRID = '#e8e7e1';       // líneas de guía (tenues)
const BASE = '#c3c2b7';       // línea base

const dinero = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dineroEje = (n) => (n >= 1000 ? `$${+(n / 1000).toFixed(1)}K` : `$${Math.round(n)}`);
const entero = (n) => Number(n || 0).toLocaleString('es');

// Máximo "redondo" del eje y sus marcas (0, 2, 4, 6...)
function escala(max, marcas = 4) {
  if (max <= 0) return { tope: marcas, paso: 1 };
  const bruto = max / marcas;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto);
  const pasoFinal = max < marcas ? 1 : paso;
  return { tope: Math.ceil(max / pasoFinal) * pasoFinal, paso: pasoFinal };
}

// Barra con la punta redondeada (4px) y la base recta
function barraVertical(x, y, w, h, r = 4) {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

function useAncho() {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setAncho(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho];
}

const tarjeta = { background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', padding: '1.25rem 1.25rem 1rem', minWidth: 0 };
const tituloTarjeta = { margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' };
const subtitulo = { margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' };

function Tooltip({ datos }) {
  if (!datos) return null;
  return (
    <div
      role="status"
      style={{
        position: 'absolute', left: datos.x, top: datos.y, transform: datos.alinear === 'der' ? 'translate(-100%, -100%)' : 'translate(-50%, -100%)',
        marginTop: '-10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px',
        boxShadow: 'var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.12))', padding: '8px 10px', pointerEvents: 'none', zIndex: 5, minWidth: '150px',
      }}
    >
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{datos.titulo}</div>
      {datos.filas.map((f) => (
        <div key={f.nombre} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', lineHeight: 1.6 }}>
          {f.color && <span style={{ width: '12px', height: '2px', borderRadius: '1px', background: f.color, flexShrink: 0 }} />}
          <strong style={{ color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>{f.valor}</strong>
          <span style={{ color: 'var(--text-muted)' }}>{f.nombre}</span>
        </div>
      ))}
    </div>
  );
}

function Indicador({ etiqueta, valor, detalle }) {
  return (
    <div style={{ ...tarjeta, padding: '1rem 1.15rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{etiqueta}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{valor}</div>
      {detalle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{detalle}</div>}
    </div>
  );
}

/** Planes ordenados de más a menos contratados (barras horizontales, un solo tono) */
function RankingPlanes({ filas }) {
  const [tip, setTip] = useState(null);
  const max = Math.max(1, ...filas.map((f) => f.contrataciones));
  const mostrar = (f, e) => {
    const caja = e.currentTarget.closest('[data-ranking]').getBoundingClientRect();
    const fila = e.currentTarget.getBoundingClientRect();
    setTip({
      x: Math.min(fila.left - caja.left + 110 + ((fila.width - 110) * f.contrataciones) / max, caja.width - 8), y: fila.top - caja.top,
      alinear: 'der', titulo: f.nombre,
      filas: [
        { nombre: 'contrataciones', valor: entero(f.contrataciones) },
        { nombre: 'renovaciones', valor: entero(f.renovaciones) },
        { nombre: 'activas hoy', valor: entero(f.activas) },
      ],
    });
  };
  return (
    <div data-ranking style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }} onPointerLeave={() => setTip(null)}>
      {filas.map((f) => (
        <div
          key={f.id}
          tabIndex={0}
          aria-label={`${f.nombre}: ${f.contrataciones} contrataciones, ${f.renovaciones} renovaciones, ${f.activas} activas hoy`}
          onPointerMove={(e) => mostrar(f, e)}
          onFocus={(e) => mostrar(f, e)}
          onBlur={() => setTip(null)}
          style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center', gap: '10px', minHeight: '28px', outline: 'none', cursor: 'default' }}
        >
          <span style={{ fontSize: '0.84rem', color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.nombre}>
            {f.nombre}{!f.activo && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · inactivo</span>}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            {f.contrataciones > 0 && (
              <div style={{ height: '16px', width: `calc((100% - 48px) * ${f.contrataciones / max})`, minWidth: '4px', background: f.color, borderRadius: '0 4px 4px 0', opacity: tip?.titulo === f.nombre ? 0.85 : 1 }} />
            )}
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{entero(f.contrataciones)}</span>
          </div>
        </div>
      ))}
      <Tooltip datos={tip} />
    </div>
  );
}

/**
 * Columnas por semana o mes, apiladas por plan (cada plan con su color fijo).
 * partes(s) devuelve { id_plan: valor } de cada intervalo.
 */
function Columnas({ serie, planes, valor, partes, formato, formatoEje, etiqueta, alto = 220 }) {
  const [ref, ancho] = useAncho();
  const [activo, setActivo] = useState(null);
  const izq = 44, der = 8, arriba = 18, abajo = 26;
  const anchoUtil = Math.max(0, ancho - izq - der);
  const banda = serie.length ? anchoUtil / serie.length : 0;
  const grosor = Math.max(4, Math.min(24, banda * 0.6));
  const max = Math.max(0, ...serie.map(valor));
  const { tope, paso } = escala(max);
  const y = (v) => arriba + (alto - arriba - abajo) * (1 - v / tope);
  const marcas = [];
  for (let v = 0; v <= tope + 1e-9; v += paso) marcas.push(v);
  const cadaCuanto = Math.max(1, Math.ceil(42 / Math.max(banda, 1)));
  const iMax = serie.findIndex((s) => valor(s) === max && max > 0);

  const tip = activo == null ? null : (() => {
    const s = serie[activo];
    const filas = planes.filter((p) => partes(s)[p.id]).map((p) => ({ nombre: p.nombre, color: p.color, valor: formato(partes(s)[p.id]) }));
    filas.push({ nombre: 'en total', valor: formato(valor(s)) });
    const x = izq + banda * activo + banda / 2;
    return { x: Math.max(80, Math.min(x, ancho - 80)), y: y(valor(s)), titulo: s.titulo, filas };
  })();

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }} onPointerLeave={() => setActivo(null)}>
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label={etiqueta} style={{ display: 'block', overflow: 'visible' }}>
          {marcas.map((v) => (
            <g key={v}>
              <line x1={izq} x2={ancho - der} y1={y(v)} y2={y(v)} stroke={v === 0 ? BASE : GRID} strokeWidth="1" />
              <text x={izq - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--text-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatoEje(v)}</text>
            </g>
          ))}
          {serie.map((s, i) => {
            const cx = izq + banda * i + banda / 2;
            const x = cx - grosor / 2;
            const total = valor(s);
            let acumulado = 0;
            const segmentos = planes.filter((p) => partes(s)[p.id]).map((p) => ({ color: p.color, v: partes(s)[p.id] }));
            return (
              <g
                key={i}
                tabIndex={0}
                aria-label={`${s.titulo}: ${formato(total)}`}
                onPointerMove={() => setActivo(i)}
                onFocus={() => setActivo(i)}
                onBlur={() => setActivo(null)}
                style={{ outline: 'none' }}
              >
                <rect x={izq + banda * i} y={arriba} width={banda} height={alto - arriba - abajo} fill="transparent" />
                {activo === i && <rect x={izq + banda * i + 1} y={arriba} width={Math.max(0, banda - 2)} height={alto - arriba - abajo} fill="var(--bg-subtle)" />}
                {segmentos.map((seg, k) => {
                  const y0 = y(acumulado);
                  acumulado += seg.v;
                  const y1 = y(acumulado);
                  const ultimo = k === segmentos.length - 1;
                  const h = Math.max(0, y0 - y1 - (ultimo ? 0 : 2)); // 2px de separación entre segmentos
                  return ultimo
                    ? <path key={k} d={barraVertical(x, y1, grosor, h)} fill={seg.color} />
                    : <rect key={k} x={x} y={y1 + 2} width={grosor} height={h} fill={seg.color} />;
                })}
                {i === iMax && (
                  <text x={cx} y={y(total) - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-main)">{formato(total)}</text>
                )}
                {i % cadaCuanto === 0 && (
                  <text x={cx} y={alto - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{s.label}</text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip datos={tip} />
    </div>
  );
}

function Leyenda({ planes }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: '10px' }}>
      {planes.map((p) => (
        <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: p.color }} />
          {p.nombre}
        </span>
      ))}
    </div>
  );
}

const th = { padding: '8px 10px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: '0.84rem', color: 'var(--text-main)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderTop: '1px solid var(--border-color)' };

export const StatsPanel = ({ onNotification }) => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState('90d');
  const [verTabla, setVerTabla] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      setDatos(await adminService.getSalesData());
    } catch (err) {
      if (onNotification) onNotification(err.message, 'error');
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const p = PERIODOS.find((x) => x.id === periodo);
  const st = useMemo(() => (datos ? calcularEstadisticas(datos, p) : null), [datos, p]);

  if (!st) {
    return (
      <div style={{ ...tarjeta, padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        {cargando
          ? <><Loader2 size={36} style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} /><p style={{ fontWeight: 600 }}>Cargando estadísticas...</p></>
          : <p style={{ fontWeight: 600 }}>No se pudieron cargar las estadísticas.</p>}
      </div>
    );
  }

  const { totales, filas, serie, unidad } = st;
  // Planes en orden fijo (por precio, como sus colores); en cada gráfica solo los que tienen datos
  const planesOrdenados = [...datos.planes]
    .sort((a, b) => Number(a.precio) - Number(b.precio) || String(a.nombre).localeCompare(String(b.nombre)))
    .map((pl) => filas.find((f) => f.id === pl.id_plan))
    .filter(Boolean);
  const ordenLeyenda = planesOrdenados.filter((f) => serie.some((s) => s.porPlan[f.id]));
  const planesIngresos = planesOrdenados.filter((f) => serie.some((s) => s.ingresosPorPlan[f.id]));
  const porUnidad = unidad === 'semana' ? 'por semana' : 'por mes';
  const masVendido = filas[0]?.contrataciones > 0 ? filas[0] : null;

  return (
    <div style={{ opacity: cargando ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      {/* Filtros: una fila arriba, aplican a todo lo de abajo */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '1.25rem' }}>
        <div role="group" aria-label="Periodo" style={{ display: 'inline-flex', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '3px', flexWrap: 'wrap' }}>
          {PERIODOS.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={periodo === x.id}
              onClick={() => setPeriodo(x.id)}
              style={{
                border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                background: periodo === x.id ? 'var(--bg-card)' : 'transparent',
                color: periodo === x.id ? 'var(--text-main)' : 'var(--text-muted)',
                boxShadow: periodo === x.id ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {x.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={cargar} disabled={cargando} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', gap: '6px' }} title="Recargar estadísticas">
          <RefreshCw size={15} style={cargando ? { animation: 'spin 1s linear infinite' } : undefined} />
          <span className="nb-dash-hide-sm">Actualizar</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '12px' }}>
        <Indicador etiqueta="Suscripciones activas" valor={entero(totales.activas)} detalle="Hoy, en todos los planes" />
        <Indicador etiqueta="Contrataciones" valor={entero(totales.contrataciones)} detalle={`${entero(totales.nuevas)} nuevas · ${entero(totales.cambios)} cambios de plan`} />
        <Indicador etiqueta="Renovaciones" valor={entero(totales.renovaciones)} detalle="Del mismo plan" />
        <Indicador etiqueta="Ingresos" valor={dinero(totales.ingresos)} detalle="Pagos simulados del periodo" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '12px', marginBottom: '12px' }}>
        <div style={tarjeta}>
          <h4 style={tituloTarjeta}>Planes más contratados</h4>
          <p style={subtitulo}>
            {masVendido ? `${masVendido.nombre} es el más contratado del periodo.` : 'Sin contrataciones en este periodo.'} Sin contar renovaciones.
          </p>
          <RankingPlanes filas={filas} />
        </div>

        <div style={tarjeta}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div>
              <h4 style={tituloTarjeta}>Contrataciones {porUnidad}</h4>
              <p style={subtitulo}>Nuevas y cambios de plan, por plan.</p>
            </div>
            <button
              type="button"
              onClick={() => setVerTabla((v) => !v)}
              className="btn-secondary"
              style={{ padding: '5px 9px', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)', gap: '5px', flexShrink: 0 }}
              aria-pressed={verTabla}
            >
              {verTabla ? <BarChart3 size={14} /> : <Table2 size={14} />}
              {verTabla ? 'Gráfica' : 'Tabla'}
            </button>
          </div>
          {verTabla ? (
            <div style={{ overflowX: 'auto', marginTop: '10px', maxHeight: '260px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: 'left' }}>{unidad === 'semana' ? 'Semana' : 'Mes'}</th>
                    {ordenLeyenda.map((pl) => <th key={pl.id} style={th}>{pl.nombre}</th>)}
                    <th style={th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {serie.map((s) => (
                    <tr key={s.titulo}>
                      <td style={{ ...td, textAlign: 'left' }}>{s.titulo}</td>
                      {ordenLeyenda.map((pl) => <td key={pl.id} style={td}>{entero(s.porPlan[pl.id] || 0)}</td>)}
                      <td style={{ ...td, fontWeight: 700 }}>{entero(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              {ordenLeyenda.length > 0 && <Leyenda planes={ordenLeyenda} />}
              <div style={{ marginTop: '8px' }}>
                <Columnas serie={serie} planes={ordenLeyenda} valor={(s) => s.total} partes={(s) => s.porPlan} formato={entero} formatoEje={(v) => entero(v)} etiqueta="Contrataciones por periodo" />
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ ...tarjeta, marginBottom: '12px' }}>
        <h4 style={tituloTarjeta}>Ingresos {porUnidad}</h4>
        <p style={subtitulo}>Suma de los pagos simulados (contrataciones y renovaciones), por plan.</p>
        {planesIngresos.length > 0 && <Leyenda planes={planesIngresos} />}
        <div style={{ marginTop: '8px' }}>
          <Columnas serie={serie} planes={planesIngresos} valor={(s) => s.ingresos} partes={(s) => s.ingresosPorPlan} formato={dinero} formatoEje={dineroEje} etiqueta="Ingresos por periodo" alto={200} />
        </div>
      </div>

      <div style={{ ...tarjeta, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
          <h4 style={tituloTarjeta}>Resumen por plan</h4>
          <p style={subtitulo}>Activas: hoy. Lo demás: dentro del periodo elegido.</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left', paddingLeft: '1.25rem' }}>Plan</th>
                <th style={th}>Activas</th>
                <th style={th}>Contrataciones</th>
                <th style={th}>Renovaciones</th>
                <th style={{ ...th, paddingRight: '1.25rem' }}>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  <td style={{ ...td, textAlign: 'left', paddingLeft: '1.25rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: f.color, flexShrink: 0 }} />
                      {f.nombre}
                      {!f.activo && <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>inactivo</span>}
                    </span>
                  </td>
                  <td style={td}>{entero(f.activas)}</td>
                  <td style={td}>{entero(f.contrataciones)}</td>
                  <td style={td}>{entero(f.renovaciones)}</td>
                  <td style={{ ...td, paddingRight: '1.25rem' }}>{dinero(f.ingresos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
