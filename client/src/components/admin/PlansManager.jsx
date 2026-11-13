import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Power, Loader2, Layers, RefreshCw } from 'lucide-react';
import { adminService } from '../../services/adminService.js';
import { askConfirm } from '../../utils/confirm.js';
import { STORAGE_CONSTANTS } from '../../constants/storage.js';
import { PlanFormModal } from './PlanFormModal.jsx';

function formatEspacio(bytes) {
  if (bytes >= STORAGE_CONSTANTS.BYTES_PER_TB) return `${+(bytes / STORAGE_CONSTANTS.BYTES_PER_TB).toFixed(2)} TB`;
  return `${+(bytes / STORAGE_CONSTANTS.BYTES_PER_GB).toFixed(2)} GB`;
}

const money = (n) => `$${Number(n).toFixed(2)}`;

/**
 * RF-16: el administrador crea, edita, activa y desactiva los planes del catálogo.
 */
export const PlansManager = ({ onNotification }) => {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(undefined); // undefined: cerrado · null: nuevo · plan: editar

  const notify = (msg, type) => onNotification && onNotification(msg, type);

  const load = async () => {
    setIsLoading(true);
    try {
      setPlans(await adminService.getPlans());
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (plan) => {
    try {
      await adminService.savePlan(plan);
      notify(plan.id ? `Plan ${plan.nombre} actualizado.` : `Plan ${plan.nombre} creado.`, 'success');
      setEditing(undefined);
      load();
      return true;
    } catch (err) {
      notify(err.message, 'error');
      return false;
    }
  };

  const handleToggle = async (plan) => {
    const activar = !plan.activo;
    const mensaje = activar
      ? `¿Activar el plan ${plan.nombre}? Volverá a mostrarse en la página de precios.`
      : `¿Desactivar el plan ${plan.nombre}? Dejará de mostrarse y de poder contratarse.` +
        (plan.suscriptores ? ` Sus ${plan.suscriptores} suscriptor(es) activo(s) lo conservan y pueden renovarlo.` : '');
    if (!(await askConfirm(mensaje, { confirmText: activar ? 'Activar' : 'Desactivar', danger: !activar }))) return;

    setBusyId(plan.id);
    try {
      await adminService.setPlanActive(plan.id, activar);
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, activo: activar } : p)));
      notify(`Plan ${plan.nombre} ${activar ? 'activado' : 'desactivado'}.`, 'success');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const th = { padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };
  const td = { padding: '14px 16px', fontSize: '0.88rem', color: 'var(--text-main)', verticalAlign: 'middle' };
  const actionBtn = { padding: '6px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 700 };

  return (
    <>
      <div className="nb-admin-controls" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '1.25rem' }}>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '640px' }}>
          Los planes activos se muestran en la página de precios. Desactivar un plan no afecta a quien ya lo tiene.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={load} disabled={isLoading} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', gap: '6px' }} title="Recargar planes">
            <RefreshCw size={15} style={isLoading ? { animation: 'spin 1s linear infinite' } : undefined} />
            <span className="nb-dash-hide-sm">Actualizar</span>
          </button>
          <button type="button" onClick={() => setEditing(null)} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Nuevo plan
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        {isLoading ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={36} style={{ margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cargando planes...</p>
          </div>
        ) : plans.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Layers size={44} style={{ margin: '0 auto 12px auto', opacity: 0.35 }} />
            <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>No hay planes</h4>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Crea el primero con “Nuevo plan”.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="nb-admin-table nb-plans-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '820px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={th}>Plan</th>
                  <th style={th}>Precio mensual</th>
                  <th style={th}>Espacio</th>
                  <th style={th}>Duración</th>
                  <th style={th}>Suscriptores activos</th>
                  <th style={th}>Estado</th>
                  <th style={{ ...th, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const isBusy = busyId === plan.id;
                  return (
                    <tr key={plan.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: plan.activo ? 1 : 0.65 }}>
                      <td style={td}>
                        <div style={{ fontWeight: 700 }}>{plan.nombre}</div>
                        {plan.descripcion && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{plan.descripcion}</div>}
                      </td>
                      {/* nb-cell-label: título del dato, solo visible en celular (sin encabezados de tabla) */}
                      <td style={td}><span className="nb-cell-label">Precio</span>{money(plan.precio)}</td>
                      <td style={td}><span className="nb-cell-label">Espacio</span>{formatEspacio(plan.limiteBytes)}</td>
                      <td style={td}><span className="nb-cell-label">Duración</span>{plan.duracionDias} días</td>
                      <td style={td}><span className="nb-cell-label">Suscriptores</span>{plan.suscriptores}</td>
                      <td style={td}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: plan.activo ? 'var(--success-bg, rgba(16,185,129,0.12))' : 'var(--bg-hover)', color: plan.activo ? 'var(--success)' : 'var(--text-muted)' }}>
                          {plan.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button type="button" disabled={isBusy} onClick={() => setEditing(plan)} style={{ ...actionBtn, color: 'var(--primary)', background: 'var(--primary-light)', border: '1px solid rgba(99, 102, 241, 0.3)', opacity: isBusy ? 0.5 : 1 }} title="Editar plan">
                            <Edit2 size={14} /> <span>Editar</span>
                          </button>
                          <button type="button" disabled={isBusy} onClick={() => handleToggle(plan)} style={{ ...actionBtn, color: plan.activo ? 'var(--danger)' : 'var(--success)', background: plan.activo ? 'var(--danger-bg)' : 'var(--success-bg, rgba(16,185,129,0.12))', border: `1px solid ${plan.activo ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`, opacity: isBusy ? 0.5 : 1 }} title={plan.activo ? 'Desactivar plan' : 'Activar plan'}>
                            {isBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Power size={14} />}
                            <span>{plan.activo ? 'Desactivar' : 'Activar'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PlanFormModal
        isOpen={editing !== undefined}
        plan={editing}
        onClose={() => setEditing(undefined)}
        onSave={handleSave}
      />
    </>
  );
};

export default PlansManager;
