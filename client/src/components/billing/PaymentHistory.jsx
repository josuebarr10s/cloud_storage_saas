import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  CreditCard, Download, Search, RefreshCw, Receipt, CalendarClock, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Copy, Check, AlertCircle, Loader2, Sparkles, FileDown, X
} from 'lucide-react';
import { billingService } from '../../services/billingService.js';
import { plansService } from '../../services/plansService.js';
import {
  PAYMENT_STATUS, STATUS_META, PERIOD_OPTIONS, PAGE_SIZE,
  filterTransactions, sortTransactions, paginate, availableYears, yearSummary, monthlyTotals,
  monthShortName, formatMoney, formatShortDate, formatLongDate, cycleLabel,
  transactionsToCsv, localDateKey, buildInvoiceHtml, downloadTextFile, openPrintableWindow
} from '../../utils/billing.js';

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)'
};

const labelStyle = {
  fontSize: '0.72rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)'
};

const CHIP_LABELS = {
  all: 'Todos',
  [PAYMENT_STATUS.PAID]: 'Pagados',
  [PAYMENT_STATUS.PENDING]: 'Pendientes',
  [PAYMENT_STATUS.FAILED]: 'Fallidos',
  [PAYMENT_STATUS.REFUNDED]: 'Reembolsados'
};

const StatusPill = ({ statusKey }) => {
  const meta = STATUS_META[statusKey];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: 'var(--radius-full)', background: meta.bg, color: meta.color, fontSize: '0.78rem', fontWeight: 700 }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.color }} />
      {meta.label}
    </span>
  );
};

const SortHeader = ({ label, field, sortKey, sortDir, onSort }) => {
  const active = sortKey === field;
  return (
    <th style={{ padding: '12px 16px', fontWeight: 600, paddingLeft: field === 'date' ? '24px' : '16px' }}>
      <button
        type="button"
        onClick={() => onSort(field)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', color: active ? 'var(--primary)' : 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}
        title={`Ordenar por ${label.toLowerCase()}`}
      >
        {label}
        {active && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );
};

export const PaymentHistory = ({ currentUser, onChangePlan, onNotification, refreshKey }) => {
  const userId = currentUser?.id;
  const mounted = useRef(true);

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState('all');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [isPlanPanelOpen, setIsPlanPanelOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [planCycle, setPlanCycle] = useState('monthly');
  const [copiedId, setCopiedId] = useState(null);
  const [spinTurns, setSpinTurns] = useState(0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Cada carga lleva un número; si llega una respuesta vieja (clics rápidos en Actualizar) se descarta
  const requestId = useRef(0);
  const hasData = useRef(false);

  const load = useCallback(async () => {
    const current = ++requestId.current;
    setIsLoading(true);
    setError('');
    try {
      const result = await billingService.getBillingData(userId);
      if (!mounted.current || current !== requestId.current) return;
      setData(result);
      hasData.current = true;
    } catch (err) {
      console.error('Error al cargar el historial de pagos:', err);
      if (!mounted.current || current !== requestId.current) return;
      const message = err.message || 'No se pudo cargar el historial de pagos.';
      setError(message);
      // Si ya había datos en pantalla se conservan y solo se avisa del fallo
      if (hasData.current && onNotification) onNotification(`No se pudo actualizar el historial: ${message}`, 'error');
    } finally {
      if (mounted.current && current === requestId.current) setIsLoading(false);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carga inicial y recarga cuando cambia el plan (p. ej. tras un pago nuevo)
  useEffect(() => { load(); }, [load, refreshKey]);

  // Los planes solo se piden la primera vez que se abre el selector
  useEffect(() => {
    if (!isPlanPanelOpen || plans.length > 0) return;
    plansService.getPlans().then((list) => { if (mounted.current) setPlans(list); });
  }, [isPlanPanelOpen, plans.length]);

  const transactions = useMemo(() => data?.transactions || [], [data]);

  const filtered = useMemo(
    () => sortTransactions(filterTransactions(transactions, { status: statusFilter, query, period }), sortKey, sortDir),
    [transactions, statusFilter, query, period, sortKey, sortDir]
  );
  const pageData = useMemo(() => paginate(filtered, page, PAGE_SIZE), [filtered, page]);

  // Al cambiar cualquier filtro se vuelve a la primera página
  useEffect(() => { setPage(1); }, [statusFilter, query, period, sortKey, sortDir]);

  const years = useMemo(() => availableYears(transactions), [transactions]);
  const summary = useMemo(() => yearSummary(transactions, year), [transactions, year]);
  const months = useMemo(() => monthlyTotals(transactions, year), [transactions, year]);
  const maxMonth = Math.max(...months, 1);
  const currentMonth = year === new Date().getFullYear() ? new Date().getMonth() : -1;

  const counts = useMemo(() => {
    const base = { all: transactions.length };
    Object.values(PAYMENT_STATUS).forEach((s) => { base[s] = transactions.filter((t) => t.statusKey === s).length; });
    return base;
  }, [transactions]);

  const hasFilters = statusFilter !== 'all' || query.trim() !== '' || period !== 'all';
  const filteredTotal = filtered.filter((t) => t.statusKey === PAYMENT_STATUS.PAID).reduce((acc, t) => acc + t.amount, 0);
  const notify = (msg, type = 'info') => onNotification && onNotification(msg, type);

  const clearFilters = () => { setStatusFilter('all'); setQuery(''); setPeriod('all'); };

  const handleSort = (field) => {
    if (sortKey === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(field); setSortDir('desc'); }
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    // BOM para que Excel respete los acentos
    downloadTextFile(`nimbox-pagos-${localDateKey(new Date())}.csv`, `﻿${transactionsToCsv(filtered)}`, 'text/csv;charset=utf-8');
    notify(`Se exportaron ${filtered.length} ${filtered.length === 1 ? 'transacción' : 'transacciones'} a CSV.`, 'success');
  };

  const handleInvoice = (tx) => {
    const html = buildInvoiceHtml({ tx, user: currentUser });
    if (openPrintableWindow(html)) {
      notify(`Factura ${tx.reference} lista. Elige "Guardar como PDF" para descargarla.`, 'success');
    } else {
      // El navegador bloqueó la ventana emergente: se descarga como archivo
      downloadTextFile(`factura-${tx.reference}.html`, html, 'text/html;charset=utf-8');
      notify(`Tu navegador bloqueó la ventana emergente; se descargó la factura ${tx.reference}.`, 'info');
    }
  };

  const handleCopy = async (tx) => {
    try {
      await navigator.clipboard.writeText(tx.reference);
      setCopiedId(tx.id);
      setTimeout(() => setCopiedId((id) => (id === tx.id ? null : id)), 1500);
    } catch {
      notify('No se pudo copiar la referencia.', 'error');
    }
  };

  // Una vuelta completa por clic: la animación nunca se queda a medias
  const handleRefresh = () => {
    setSpinTurns((t) => t + 1);
    load();
  };

  const handleChoosePlan = (plan) => {
    setIsPlanPanelOpen(false);
    onChangePlan && onChangePlan(plan, planCycle);
  };

  /* ---------------- Estados de carga / error ---------------- */

  if (isLoading && !data) {
    return (
      <div style={{ ...cardStyle, padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={36} style={{ margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>Cargando tu historial de pagos...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ ...cardStyle, padding: '3rem 1rem', textAlign: 'center' }}>
        <AlertCircle size={42} color="var(--danger)" style={{ margin: '0 auto 10px auto' }} />
        <h4 style={{ fontWeight: 700, margin: '0 0 4px 0' }}>No pudimos cargar tus pagos</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 16px 0' }}>{error}</p>
        <button type="button" className="btn-primary" onClick={load} style={{ padding: '8px 18px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', gap: '6px' }}>
          <RefreshCw size={15} /> Reintentar
        </button>
      </div>
    );
  }

  const sub = data?.subscription;
  const method = data?.paymentMethod;
  const periodBarColor = sub?.expired ? 'var(--danger)' : sub && sub.daysLeft <= 5 ? 'var(--warning)' : 'var(--primary)';
  const chips = ['all', ...Object.values(PAYMENT_STATUS).filter((s) => counts[s] > 0)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Método de pago + cambio de plan */}
      <div style={{ ...cardStyle, padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
            <div style={{ width: '52px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-dark)', color: 'var(--text-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CreditCard size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '1rem' }}>{method ? method.label : 'Sin método de pago registrado'}</strong>
                {method && (
                  <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 'var(--radius-full)' }}>Principal</span>
                )}
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {currentUser?.name || 'Cliente Nimbox'}{currentUser?.email ? ` · ${currentUser.email}` : ''}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary" onClick={handleRefresh} disabled={isLoading} title="Actualizar historial" style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', gap: '6px', background: 'var(--bg-card)', opacity: isLoading ? 0.7 : 1 }}>
              <RefreshCw size={15} style={{ transform: `rotate(${spinTurns * 360}deg)`, transition: 'transform 0.6s ease-in-out' }} />
              <span>Actualizar</span>
            </button>
            <button type="button" className="btn-secondary" onClick={() => setIsPlanPanelOpen((o) => !o)} aria-expanded={isPlanPanelOpen} style={{ padding: '8px 14px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', gap: '6px', background: 'var(--bg-card)' }}>
              <Sparkles size={15} color="var(--primary)" />
              <span>{isPlanPanelOpen ? 'Cerrar' : 'Cambiar plan'}</span>
            </button>
          </div>
        </div>

        {isPlanPanelOpen && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Elige el plan al que quieres cambiar. Al pagar, el nuevo plan reemplaza al actual.</span>
              <div style={{ display: 'flex', background: 'var(--bg-subtle)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', gap: '2px' }}>
                {[{ id: 'monthly', label: 'Mensual' }, { id: 'annual', label: 'Anual −20%' }].map((c) => (
                  <button key={c.id} type="button" onClick={() => setPlanCycle(c.id)} style={{ padding: '5px 12px', borderRadius: 'var(--radius-xs)', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, background: planCycle === c.id ? 'var(--primary)' : 'transparent', color: planCycle === c.id ? 'var(--text-white)' : 'var(--text-muted)' }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {plans.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                {plans.map((plan) => {
                  const isCurrent = plan.nombre === currentUser?.plan && (!sub || sub.cycle === planCycle);
                  const price = planCycle === 'annual' ? plan.precioAnual : plan.precio;
                  return (
                    <div key={plan.id_plan} style={{ border: `1px solid ${plan.popular ? 'var(--accent-indigo-border)' : 'var(--border-color)'}`, background: plan.popular ? 'var(--bg-tint)' : 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{plan.nombre}</strong>
                        {plan.popular && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>Recomendado</span>}
                      </div>
                      <div><span style={{ fontSize: '1.4rem', fontWeight: 800 }}>{formatMoney(price)}</span><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> /mes{planCycle === 'annual' ? ' (cobro anual)' : ''}</span></div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{plan.storageQuota} de almacenamiento</span>
                      <button type="button" disabled={isCurrent} onClick={() => handleChoosePlan(plan)} className={isCurrent ? 'btn-secondary' : 'btn-primary'} style={{ marginTop: '6px', padding: '7px 12px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)', justifyContent: 'center', opacity: isCurrent ? 0.6 : 1, cursor: isCurrent ? 'default' : 'pointer' }}>
                        {isCurrent ? 'Plan actual' : `Elegir ${plan.nombre}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tarjetas de resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {/* Total pagado + mini gráfica */}
        <div style={{ ...cardStyle, padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>Total pagado ({year})</span>
            {years.length > 1 && (
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Año" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xs)', background: 'var(--bg-body)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', padding: '2px 4px', cursor: 'pointer' }}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 2px' }}>{formatMoney(summary.total)}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{summary.count} {summary.count === 1 ? 'transacción' : 'transacciones'}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '44px', marginTop: '14px' }} role="img" aria-label={`Gasto mensual de ${year}`}>
            {months.map((value, i) => (
              <div key={i} title={`${monthShortName(i)} ${year}: ${formatMoney(value)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ height: value > 0 ? `${Math.max(12, (value / maxMonth) * 100)}%` : '3px', background: value > 0 ? (i === currentMonth ? 'var(--primary)' : 'var(--accent-indigo-border)') : 'var(--bg-hover)', borderRadius: '3px', transition: 'height 0.3s' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
            {months.map((_, i) => <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-light)', fontWeight: 600 }}>{monthShortName(i)[0]}</span>)}
          </div>
        </div>

        {/* Próxima factura */}
        <div style={{ ...cardStyle, padding: '1.25rem 1.5rem' }}>
          <span style={labelStyle}>Próxima factura</span>
          {sub ? (
            <>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 2px' }}>{formatMoney(sub.price)}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarClock size={14} /> {formatLongDate(sub.end)}
              </div>
              <div style={{ marginTop: '14px' }}>
                <span style={{ display: 'inline-block', fontSize: '0.78rem', fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: sub.expired ? 'var(--danger-bg)' : sub.daysLeft <= 5 ? 'var(--warning-bg)' : 'var(--primary-light)', color: sub.expired ? 'var(--danger)' : sub.daysLeft <= 5 ? 'var(--warning-strong)' : 'var(--primary)' }}>
                  {sub.expired ? 'Suscripción vencida' : sub.daysLeft === 0 ? 'Se renueva hoy' : sub.daysLeft === 1 ? 'Se renueva mañana' : `Se renueva en ${sub.daysLeft} días`}
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 2px', color: 'var(--text-light)' }}>—</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Sin suscripción activa</div>
            </>
          )}
        </div>

        {/* Plan actual + progreso del periodo */}
        <div style={{ ...cardStyle, padding: '1.25rem 1.5rem' }}>
          <span style={labelStyle}>Plan actual</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 2px' }}>{sub?.planName || currentUser?.plan || 'Ninguno'}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{sub ? `Facturación ${cycleLabel(sub.cycle).toLowerCase()}` : 'Sin facturación activa'}</div>
          {sub && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ height: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }} role="progressbar" aria-valuenow={Math.round(sub.progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del periodo de facturación">
                <div style={{ width: `${sub.progress}%`, height: '100%', background: periodBarColor, borderRadius: 'var(--radius-full)', transition: 'width 0.4s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>{formatShortDate(sub.start)}</span>
                <span>{formatShortDate(sub.end)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transacciones */}
      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Transacciones</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{transactions.length} {transactions.length === 1 ? 'registro' : 'registros'} en total</span>
          </div>
          <button type="button" onClick={handleExport} disabled={filtered.length === 0} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '0.88rem', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', opacity: filtered.length === 0 ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: '6px' }} title={hasFilters ? 'Exporta solo las transacciones filtradas' : 'Exporta todas las transacciones'}>
            <FileDown size={16} /> {hasFilters ? 'Exportar filtrado' : 'Exportar todo'}
          </button>
        </div>

        {transactions.length > 0 && (
          <div style={{ padding: '0 1.5rem 1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {chips.map((id) => {
                const active = statusFilter === id;
                return (
                  <button key={id} type="button" onClick={() => setStatusFilter(id)} style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', border: `1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`, background: active ? 'var(--primary)' : 'var(--bg-card)', color: active ? 'var(--text-white)' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                    {CHIP_LABELS[id]} <span style={{ opacity: 0.75 }}>{counts[id]}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Periodo" style={{ padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-body)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                {PERIOD_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <div style={{ position: 'relative' }}>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pagos..." aria-label="Buscar pagos" style={{ padding: '8px 30px 8px 32px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-body)', fontSize: '0.82rem', outline: 'none', width: '230px', maxWidth: '100%' }} />
                <Search size={15} color="var(--text-light)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                {query && (
                  <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', display: 'flex', padding: '2px' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {hasFilters && (
                <button type="button" onClick={clearFilters} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Limpiar filtros</button>
              )}
            </div>
          </div>
        )}

        {transactions.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
            <Receipt size={44} style={{ margin: '0 auto 12px auto', opacity: 0.35 }} />
            <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', margin: '0 0 4px 0' }}>Aún no tienes pagos registrados</h4>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Cuando contrates o renueves un plan, tus recibos aparecerán aquí.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
            <Search size={40} style={{ margin: '0 auto 10px auto', opacity: 0.35 }} />
            <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', margin: '0 0 4px 0' }}>Ningún pago coincide con tu búsqueda</h4>
            <button type="button" onClick={clearFilters} className="btn-secondary" style={{ marginTop: '10px', padding: '7px 16px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}>Limpiar filtros</button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                    <SortHeader label="Fecha" field="date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Concepto</th>
                    <SortHeader label="Monto" field="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Estado</th>
                    <th style={{ padding: '12px 24px 12px 16px', fontWeight: 600, textAlign: 'right' }}>Factura</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.items.map((tx) => {
                    const failed = tx.statusKey === PAYMENT_STATUS.FAILED;
                    return (
                      <tr key={tx.id || tx.reference} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '14px 16px 14px 24px', fontSize: '0.88rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatShortDate(tx.date)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tx.concept}</div>
                          <button type="button" onClick={() => handleCopy(tx)} title="Copiar referencia" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-light)', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit' }}>
                            {tx.reference} {copiedId === tx.id ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                          </button>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.92rem', whiteSpace: 'nowrap' }}>{formatMoney(tx.amount)}</td>
                        <td style={{ padding: '14px 16px' }}><StatusPill statusKey={tx.statusKey} /></td>
                        <td style={{ padding: '14px 24px 14px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleInvoice(tx)}
                            disabled={failed}
                            className="btn-secondary"
                            title={failed ? 'Un pago fallido no genera factura' : tx.statusKey === PAYMENT_STATUS.PAID ? 'Descargar factura' : 'Descargar comprobante'}
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', gap: '6px', background: 'var(--bg-subtle)', opacity: failed ? 0.45 : 1, cursor: failed ? 'not-allowed' : 'pointer' }}
                          >
                            <Download size={14} /> Descargar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '0.82rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
              <span>
                Mostrando {pageData.from}–{pageData.to} de {filtered.length}
                {hasFilters && <> · Pagado en esta vista: <strong style={{ color: 'var(--text-main)' }}>{formatMoney(filteredTotal)}</strong></>}
              </span>
              {pageData.totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button type="button" onClick={() => setPage(pageData.page - 1)} disabled={pageData.page <= 1} aria-label="Página anterior" className="btn-secondary" style={{ padding: '5px 8px', borderRadius: 'var(--radius-sm)', opacity: pageData.page <= 1 ? 0.45 : 1 }}><ChevronLeft size={16} /></button>
                  <span style={{ fontWeight: 600 }}>Página {pageData.page} de {pageData.totalPages}</span>
                  <button type="button" onClick={() => setPage(pageData.page + 1)} disabled={pageData.page >= pageData.totalPages} aria-label="Página siguiente" className="btn-secondary" style={{ padding: '5px 8px', borderRadius: 'var(--radius-sm)', opacity: pageData.page >= pageData.totalPages ? 0.45 : 1 }}><ChevronRight size={16} /></button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
