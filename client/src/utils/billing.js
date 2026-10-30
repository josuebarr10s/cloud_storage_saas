import { normalizeText } from './formatters.js';

/**
 * Utilidades puras del historial de pagos (sin dependencias de React ni de Supabase).
 * Al ser funciones puras son fáciles de probar y de reutilizar.
 */

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DAYS_MONTHLY = 30;
export const DAYS_ANNUAL = 365;
const ANNUAL_THRESHOLD_DAYS = 300; // una suscripción de más de 300 días se considera anual
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const PAGE_SIZE = 8;

/* ------------------------------------------------------------------ */
/* Estados de pago                                                     */
/* ------------------------------------------------------------------ */

export const PAYMENT_STATUS = Object.freeze({
  PAID: 'paid',
  PENDING: 'pending',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

const STATUS_ALIASES = {
  completado: PAYMENT_STATUS.PAID,
  pagado: PAYMENT_STATUS.PAID,
  exitoso: PAYMENT_STATUS.PAID,
  aprobado: PAYMENT_STATUS.PAID,
  pendiente: PAYMENT_STATUS.PENDING,
  procesando: PAYMENT_STATUS.PENDING,
  fallido: PAYMENT_STATUS.FAILED,
  rechazado: PAYMENT_STATUS.FAILED,
  cancelado: PAYMENT_STATUS.FAILED,
  reembolsado: PAYMENT_STATUS.REFUNDED,
};

export const STATUS_META = Object.freeze({
  [PAYMENT_STATUS.PAID]: { label: 'Pagado', color: 'var(--success-hover)', bg: 'var(--success-bg)' },
  [PAYMENT_STATUS.PENDING]: { label: 'Pendiente', color: 'var(--warning-strong)', bg: 'var(--warning-bg)' },
  [PAYMENT_STATUS.FAILED]: { label: 'Fallido', color: 'var(--danger)', bg: 'var(--danger-bg)' },
  [PAYMENT_STATUS.REFUNDED]: { label: 'Reembolsado', color: 'var(--text-secondary)', bg: 'var(--bg-hover)' },
});

/** Convierte el estado crudo de la BD ('completado', 'pendiente'...) a una clave interna. */
export function normalizeStatus(raw) {
  return STATUS_ALIASES[normalizeText(raw)] || PAYMENT_STATUS.PENDING;
}

/* ------------------------------------------------------------------ */
/* Método de pago                                                      */
/* ------------------------------------------------------------------ */

const BRAND_LABELS = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', tarjeta: 'Tarjeta' };

/** Detecta la marca de la tarjeta a partir de su número (solo el prefijo). */
export function detectCardBrand(cardNumber = '') {
  const n = String(cardNumber).replace(/\D/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n)) return 'mastercard';
  const prefix4 = parseInt(n.slice(0, 4), 10);
  if (n.length >= 4 && prefix4 >= 2221 && prefix4 <= 2720) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return 'tarjeta';
}

/**
 * Codifica el método de pago para guardarlo en pago.metodo_pago sin cambiar el esquema.
 * Formato: "tarjeta_simulada:visa:4242". Nunca se guarda el número completo ni el CVC.
 */
export function encodePaymentMethod(brand, last4) {
  const digits = String(last4 || '').replace(/\D/g, '').slice(-4);
  if (digits.length !== 4) return 'tarjeta_simulada';
  return `tarjeta_simulada:${BRAND_LABELS[brand] ? brand : 'tarjeta'}:${digits}`;
}

/** Interpreta pago.metodo_pago (incluye el formato antiguo "tarjeta_simulada"). */
export function parsePaymentMethod(raw) {
  const [, brandKey, last4] = String(raw || '').split(':');
  const brand = BRAND_LABELS[brandKey] ? brandKey : 'tarjeta';
  const hasLast4 = /^\d{4}$/.test(last4 || '');
  return {
    brand,
    brandLabel: BRAND_LABELS[brand],
    last4: hasLast4 ? last4 : null,
    label: hasLast4 ? `${BRAND_LABELS[brand]} terminada en ${last4}` : 'Tarjeta (simulada)',
  };
}

/* ------------------------------------------------------------------ */
/* Formato                                                             */
/* ------------------------------------------------------------------ */

export function formatMoney(value) {
  const n = Number(value);
  return `$${(Number.isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatShortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatLongDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} de ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function monthShortName(monthIndex) {
  return MONTHS_SHORT[monthIndex] || '';
}

/** Días enteros que faltan hasta una fecha (negativo si ya pasó). */
export function daysUntil(iso, now = new Date()) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now.getTime()) / MS_PER_DAY);
}

/** Fecha local AAAA-MM-DD (toISOString usa UTC y puede adelantar un día). */
export function localDateKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ------------------------------------------------------------------ */
/* Modelo de datos                                                     */
/* ------------------------------------------------------------------ */

/** Mensual o anual, según el precio contratado respecto al plan o la duración de la suscripción. */
export function billingCycleOf(sub) {
  const planPrice = Number(sub?.plan?.precio);
  const contracted = Number(sub?.precio_contratado);
  if (planPrice > 0 && contracted > 0) {
    // El cobro anual corresponde a 12 meses con 20% de descuento (9.6x el precio mensual)
    return contracted >= planPrice * 6 ? 'annual' : 'monthly';
  }
  const start = new Date(sub?.fecha_inicio).getTime();
  const end = new Date(sub?.fecha_fin).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 'monthly';
  return (end - start) / MS_PER_DAY >= ANNUAL_THRESHOLD_DAYS ? 'annual' : 'monthly';
}

export const cycleLabel = (cycle) => (cycle === 'annual' ? 'Anual' : 'Mensual');

/**
 * Aplana suscripcion -> pago en una lista de transacciones lista para mostrar,
 * ordenada de la más reciente a la más antigua.
 */
export function buildTransactions(subscriptions = []) {
  const rows = [];
  subscriptions.forEach((sub) => {
    const planName = sub.plan?.nombre || 'Plan';
    const cycle = billingCycleOf(sub);
    const startTs = new Date(sub.fecha_inicio).getTime();
    (sub.pago || []).forEach((p) => {
      const rawPagoTs = new Date(p.fecha_pago).getTime();
      // Si fecha_pago quedó antes de fecha_inicio por el DEFAULT NOW() del servidor, usar fecha_inicio
      const effectiveDate = (!Number.isNaN(rawPagoTs) && (Number.isNaN(startTs) || rawPagoTs >= startTs - MS_PER_DAY))
        ? p.fecha_pago
        : sub.fecha_inicio;
      const ts = new Date(effectiveDate).getTime();
      const statusKey = normalizeStatus(p.estado);
      rows.push({
        id: p.id_pago,
        ts: Number.isNaN(ts) ? 0 : ts,
        date: effectiveDate,
        amount: Number(p.monto) || 0,
        statusKey,
        reference: p.referencia_transaccion || `NMB-${String(p.id_pago || '').slice(0, 8).toUpperCase()}`,
        planName,
        cycle,
        concept: `Plan ${planName} · ${cycleLabel(cycle)}`,
        method: parsePaymentMethod(p.metodo_pago),
        periodStart: sub.fecha_inicio,
        periodEnd: sub.fecha_fin,
        subscriptionId: sub.id_suscripcion,
      });
    });
  });
  return rows.sort((a, b) => b.ts - a.ts);
}

/** Suscripción vigente (la activa con fecha de fin más lejana) con datos de visualización. */
export function describeActiveSubscription(subscriptions = [], now = new Date()) {
  const active = subscriptions
    .filter((s) => normalizeText(s.estado) === 'activa')
    .sort((a, b) => new Date(b.fecha_fin) - new Date(a.fecha_fin))[0];
  if (!active) return null;

  const start = new Date(active.fecha_inicio).getTime();
  const end = new Date(active.fecha_fin).getTime();
  const total = end - start;
  const progress = total > 0 ? Math.min(100, Math.max(0, ((now.getTime() - start) / total) * 100)) : 0;
  const daysLeft = daysUntil(active.fecha_fin, now);
  const cycle = billingCycleOf(active);

  return {
    planName: active.plan?.nombre || 'Plan',
    cycle,
    price: Number(active.precio_contratado) || 0,
    start: active.fecha_inicio,
    end: active.fecha_fin,
    progress,
    daysLeft,
    expired: daysLeft !== null && daysLeft < 0,
  };
}

/** Método de pago "principal": el de la compra completada más reciente (prefiere el que tiene últimos 4 dígitos). */
export function pickPrimaryMethod(transactions = []) {
  const paid = transactions.filter((t) => t.statusKey === PAYMENT_STATUS.PAID);
  return paid.find((t) => t.method.last4)?.method || paid[0]?.method || transactions[0]?.method || null;
}

/* ------------------------------------------------------------------ */
/* Resúmenes                                                           */
/* ------------------------------------------------------------------ */

export function availableYears(transactions = [], now = new Date()) {
  const years = new Set([now.getFullYear()]);
  transactions.forEach((t) => years.add(new Date(t.ts).getFullYear()));
  return [...years].sort((a, b) => b - a);
}

/** Total pagado (solo cobros completados) de un año y número de transacciones. */
export function yearSummary(transactions = [], year) {
  const paid = transactions.filter((t) => t.statusKey === PAYMENT_STATUS.PAID && new Date(t.ts).getFullYear() === year);
  return { total: paid.reduce((acc, t) => acc + t.amount, 0), count: paid.length };
}

/** Total pagado por mes (12 posiciones) para la mini gráfica. */
export function monthlyTotals(transactions = [], year) {
  const months = Array(12).fill(0);
  transactions.forEach((t) => {
    const d = new Date(t.ts);
    if (t.statusKey === PAYMENT_STATUS.PAID && d.getFullYear() === year) months[d.getMonth()] += t.amount;
  });
  return months;
}

/* ------------------------------------------------------------------ */
/* Filtros, orden y paginación                                         */
/* ------------------------------------------------------------------ */

export const PERIOD_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todo el historial' },
  { id: '30d', label: 'Últimos 30 días' },
  { id: '90d', label: 'Últimos 90 días' },
  { id: 'year', label: 'Este año' },
]);

function periodStart(period, now) {
  if (period === '30d') return now.getTime() - 30 * MS_PER_DAY;
  if (period === '90d') return now.getTime() - 90 * MS_PER_DAY;
  if (period === 'year') return new Date(now.getFullYear(), 0, 1).getTime();
  return -Infinity;
}

export function filterTransactions(transactions = [], { status = 'all', query = '', period = 'all' } = {}, now = new Date()) {
  const q = normalizeText(query);
  const from = periodStart(period, now);
  return transactions.filter((t) => {
    if (status !== 'all' && t.statusKey !== status) return false;
    if (t.ts < from) return false;
    if (!q) return true;
    const haystack = normalizeText(`${t.concept} ${t.reference} ${t.method.label} ${formatShortDate(t.date)} ${t.amount.toFixed(2)}`);
    return haystack.includes(q);
  });
}

export function sortTransactions(transactions = [], key = 'date', direction = 'desc') {
  const sign = direction === 'asc' ? 1 : -1;
  return [...transactions].sort((a, b) => {
    const diff = key === 'amount' ? a.amount - b.amount : a.ts - b.ts;
    return diff !== 0 ? sign * diff : sign * (a.ts - b.ts);
  });
}

export function paginate(items = [], page = 1, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const startIdx = (current - 1) * pageSize;
  return { items: items.slice(startIdx, startIdx + pageSize), page: current, totalPages, from: items.length ? startIdx + 1 : 0, to: Math.min(items.length, startIdx + pageSize) };
}

/* ------------------------------------------------------------------ */
/* Exportación                                                         */
/* ------------------------------------------------------------------ */

const csvCell = (value) => {
  let text = String(value ?? '');
  // Evita que Excel interprete texto como fórmula
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function transactionsToCsv(transactions = []) {
  const header = ['Fecha', 'Referencia', 'Concepto', 'Monto (USD)', 'Estado', 'Método de pago'];
  const lines = transactions.map((t) => [
    localDateKey(t.ts),
    t.reference,
    t.concept,
    t.amount.toFixed(2),
    STATUS_META[t.statusKey].label,
    t.method.label,
  ].map(csvCell).join(','));
  return [header.join(','), ...lines].join('\r\n');
}

// Las facturas se abren en una ventana aparte sin las variables CSS de la app, por eso usan colores fijos
const PILL_COLORS = {
  [PAYMENT_STATUS.PAID]: { bg: '#ecfdf5', fg: '#059669' },
  [PAYMENT_STATUS.PENDING]: { bg: '#fffbeb', fg: '#b45309' },
  [PAYMENT_STATUS.FAILED]: { bg: '#fef2f2', fg: '#dc2626' },
  [PAYMENT_STATUS.REFUNDED]: { bg: '#f1f5f9', fg: '#475569' },
};

export function buildInvoiceHtml({ tx, user }) {
  const status = STATUS_META[tx.statusKey];
  const isPaid = tx.statusKey === PAYMENT_STATUS.PAID;
  const title = isPaid ? 'Factura' : 'Comprobante';
  const rows = [
    ['Referencia', tx.reference],
    ['Fecha', formatLongDate(tx.date)],
    ['Cliente', user?.name || 'Cliente Nimbox'],
    ['Correo', user?.email || '—'],
    ['Método de pago', tx.method.label],
    ['Periodo cubierto', `${formatShortDate(tx.periodStart)} – ${formatShortDate(tx.periodEnd)}`],
  ];

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)} ${escapeHtml(tx.reference)}</title>
<style>
  *{box-sizing:border-box} body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;margin:0;background:#f1f5f9}
  .bar{background:#1e293b;color:#fff;padding:10px 24px;display:flex;justify-content:space-between;align-items:center;font-size:14px}
  .bar button{background:#4f46e5;color:#fff;border:0;border-radius:8px;padding:8px 16px;font-weight:600;cursor:pointer}
  .sheet{max-width:720px;margin:24px auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 10px 25px rgba(15,23,42,.08)}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #eef2ff;padding-bottom:20px;margin-bottom:24px}
  .brand{font-size:26px;font-weight:800;letter-spacing:-.02em}.brand span{color:#4f46e5}
  h1{margin:0;font-size:22px;text-align:right}.sub{color:#64748b;font-size:13px;text-align:right;margin-top:4px}
  table{width:100%;border-collapse:collapse;font-size:14px} td{padding:10px 0;border-bottom:1px solid #f1f5f9} td:first-child{color:#64748b;width:38%}
  .total{margin-top:24px;background:#f8faff;border:1px solid #c7d2fe;border-radius:12px;padding:20px;display:flex;justify-content:space-between;align-items:center}
  .total strong{font-size:28px}.pill{display:inline-block;padding:3px 12px;border-radius:999px;font-size:12px;font-weight:700;background:${PILL_COLORS[tx.statusKey].bg};color:${PILL_COLORS[tx.statusKey].fg}}
  .concept{margin-top:24px;font-size:15px;font-weight:600}.foot{margin-top:28px;color:#94a3b8;font-size:12px;text-align:center}
  @media print{body{background:#fff}.bar{display:none}.sheet{box-shadow:none;margin:0;max-width:none}}
</style></head><body>
<div class="bar"><span>Usa «Guardar como PDF» en el diálogo de impresión.</span><button onclick="window.print()">Imprimir / Guardar PDF</button></div>
<div class="sheet">
  <div class="head"><div class="brand">Nimbox<span>.</span></div><div><h1>${escapeHtml(title)}</h1><div class="sub">N.º ${escapeHtml(tx.reference)}</div></div></div>
  <table>${rows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}</table>
  <div class="concept">${escapeHtml(tx.concept)}</div>
  <div class="total"><div><span class="pill">${escapeHtml(status.label)}</span></div><strong>${escapeHtml(formatMoney(tx.amount))}</strong></div>
  <div class="foot">Nimbox Cloud · Documento generado el ${escapeHtml(formatLongDate(new Date().toISOString()))}<br>Comprobante de un pago simulado con fines académicos.</div>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},400)})</script>
</body></html>`;
}

/* ------------------------------------------------------------------ */
/* Utilidades de navegador                                             */
/* ------------------------------------------------------------------ */

export function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Abre la factura en una pestaña nueva lista para imprimir. Devuelve false si el navegador bloqueó la ventana. */
export function openPrintableWindow(html) {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
