import React, { useState, useEffect } from 'react';
import { X, Layers, Loader2 } from 'lucide-react';
import { STORAGE_CONSTANTS } from '../../constants/storage.js';

const GB = STORAGE_CONSTANTS.BYTES_PER_GB;
const TB = STORAGE_CONSTANTS.BYTES_PER_TB;

const EMPTY = { nombre: '', descripcion: '', precio: '', espacio: '', unidad: 'GB', duracionDias: '30', activo: true };

// El espacio se edita en GB o TB; en la base de datos se guarda en bytes
function toForm(plan) {
  if (!plan) return EMPTY;
  const enTB = plan.limiteBytes >= TB && plan.limiteBytes % TB === 0;
  return {
    nombre: plan.nombre,
    descripcion: plan.descripcion || '',
    precio: String(plan.precio),
    espacio: String(enTB ? plan.limiteBytes / TB : Math.round((plan.limiteBytes / GB) * 100) / 100),
    unidad: enTB ? 'TB' : 'GB',
    duracionDias: String(plan.duracionDias),
    activo: plan.activo,
  };
}

// Las funciones de cada plan se reconocen por el nombre (igual que en la base de datos)
function nivelPorNombre(nombre) {
  const n = (nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n.includes('empresa')) return 'Empresarial';
  if (n.includes('pro')) return 'Pro';
  return 'Básico';
}

/**
 * RF-16: formulario para crear o editar un plan del catálogo.
 * plan: el plan a editar, o null para crear uno nuevo.
 */
export const PlanFormModal = ({ isOpen, plan, onClose, onSave }) => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = Boolean(plan?.id);

  useEffect(() => {
    if (isOpen) {
      setForm(toForm(plan));
      setErrors({});
      setIsSaving(false);
    }
  }, [isOpen, plan]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !isSaving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const set = (campo) => (e) => {
    const valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrors((er) => ({ ...er, [campo]: null }));
  };

  const validar = () => {
    const er = {};
    const nombre = form.nombre.trim();
    const precio = Number(form.precio);
    const espacio = Number(form.espacio);
    const dias = Number(form.duracionDias);
    if (nombre.length < 2 || nombre.length > 40) er.nombre = 'Entre 2 y 40 caracteres.';
    if (form.precio === '' || !Number.isFinite(precio) || precio < 0) er.precio = 'Un precio de 0 o más.';
    if (!Number.isFinite(espacio) || espacio <= 0) er.espacio = 'Un espacio mayor a 0.';
    if (!Number.isInteger(dias) || dias <= 0) er.duracionDias = 'Días enteros, mayor a 0.';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setIsSaving(true);
    const ok = await onSave({
      id: plan?.id,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      precio: Math.round(Number(form.precio) * 100) / 100,
      limiteBytes: Math.round(Number(form.espacio) * (form.unidad === 'TB' ? TB : GB)),
      duracionDias: Number(form.duracionDias),
      activo: form.activo,
    });
    if (!ok) setIsSaving(false);
  };

  const label = { fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px', display: 'block' };
  const input = (err) => ({
    width: '100%',
    padding: '9px 11px',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${err ? 'var(--danger)' : 'var(--border-color)'}`,
    background: 'var(--bg-body)',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  });
  const errorText = (msg) => msg && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '3px', display: 'block' }}>{msg}</span>;
  const nivel = nivelPorNombre(form.nombre);

  return (
    <div
      className="nb-modal-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}
      onClick={() => !isSaving && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        className="nb-modal-card"
        style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '520px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-modal)', border: '1px solid var(--border-color)', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
        noValidate
      >
        <div className="nb-modal-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={16} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              {isEdit ? `Editar plan ${plan.nombre}` : 'Nuevo plan'}
            </h3>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="nb-modal-body" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
          <div>
            <label style={label} htmlFor="plan-nombre">Nombre</label>
            <input id="plan-nombre" type="text" value={form.nombre} onChange={set('nombre')} maxLength={40} style={input(errors.nombre)} placeholder="Ej. Estudiante" autoFocus />
            {errors.nombre ? errorText(errors.nombre) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
                Funciones del plan <strong>{nivel}</strong>. Las funciones se reconocen por el nombre: si incluye “Pro” son las del plan Pro; si incluye “Empresa”, las del Empresarial; con otro nombre, las del Básico.
              </span>
            )}
          </div>

          <div>
            <label style={label} htmlFor="plan-descripcion">Descripción</label>
            <input id="plan-descripcion" type="text" value={form.descripcion} onChange={set('descripcion')} maxLength={120} style={input(false)} placeholder="Ej. Para estudiantes y proyectos personales" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div>
              <label style={label} htmlFor="plan-precio">Precio mensual (USD)</label>
              <input id="plan-precio" type="number" min="0" step="0.01" value={form.precio} onChange={set('precio')} style={input(errors.precio)} placeholder="0.00" />
              {errorText(errors.precio)}
            </div>
            <div>
              <label style={label} htmlFor="plan-espacio">Espacio</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input id="plan-espacio" type="number" min="0" step="any" value={form.espacio} onChange={set('espacio')} style={{ ...input(errors.espacio), minWidth: 0 }} placeholder="50" />
                <select value={form.unidad} onChange={set('unidad')} style={{ ...input(false), width: 'auto' }} aria-label="Unidad de espacio">
                  <option value="GB">GB</option>
                  <option value="TB">TB</option>
                </select>
              </div>
              {errorText(errors.espacio)}
            </div>
            <div>
              <label style={label} htmlFor="plan-dias">Duración (días)</label>
              <input id="plan-dias" type="number" min="1" step="1" value={form.duracionDias} onChange={set('duracionDias')} style={input(errors.duracionDias)} />
              {errorText(errors.duracionDias)}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-main)', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.activo} onChange={set('activo')} />
            Activo: se muestra en la página de precios y se puede contratar
          </label>

          {isEdit && (
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
              Los cambios de precio y espacio aplican a las contrataciones nuevas. Las suscripciones vigentes conservan el precio y el espacio con que se contrataron.
            </p>
          )}
        </div>

        <div className="nb-modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving} style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={isSaving} style={{ padding: '8px 16px', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {isSaving && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
            {isEdit ? 'Guardar cambios' : 'Crear plan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlanFormModal;
