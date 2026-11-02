import { normalizeText, formatBytes } from './formatters.js';

/**
 * Utilidades puras del historial de pagos (sin dependencias de React ni de Supabase).
 * Al ser funciones puras son fáciles de probar y de reutilizar.
 */

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DAYS_MONTHLY = 30;
export const DAYS_ANNUAL = 365;
export const MIN_DAYS_BETWEEN_MONTHLY_CHARGES = 25;
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
 * Filtra cobros duplicados:
 * 1. Garantiza máximo un pago por registro de suscripción (id_suscripcion).
 * 2. Si existen dos suscripciones consecutivas del mismo plan y ciclo creadas con menos
 *    de MIN_DAYS_BETWEEN_MONTHLY_CHARGES días de diferencia (por doble ejecución entre BD/cliente
 *    o múltiples dispositivos), conserva únicamente una por mes.
 */
export function deduplicateSubscriptions(subscriptions = []) {
  const valid = subscriptions.filter((s) => normalizeText(s?.estado) !== 'cancelada');
  const chronological = [...valid].sort(
    (a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
  );

  const kept = [];

  chronological.forEach((sub) => {
    const rawPagos = Array.isArray(sub.pago) ? [...sub.pago] : [];
    // Si por un trigger + inserción se crearon dos pagos para la misma suscripción, dejar solo uno
    rawPagos.sort((a, b) => {
      const aHasCard = String(a.metodo_pago || '').includes(':') ? 0 : 1;
      const bHasCard = String(b.metodo_pago || '').includes(':') ? 0 : 1;
      if (aHasCard !== bHasCard) return aHasCard - bHasCard;
      return new Date(a.fecha_pago || 0).getTime() - new Date(b.fecha_pago || 0).getTime();
    });
    const singlePago = rawPagos.length > 0 ? [rawPagos[0]] : [];
    const normalizedSub = { ...sub, pago: singlePago };

    const prev = kept[kept.length - 1];
    if (prev) {
      const samePlan =
        (prev.id_plan && sub.id_plan && prev.id_plan === sub.id_plan) ||
        normalizeText(prev.plan?.nombre) === normalizeText(sub.plan?.nombre);
      const cycle = billingCycleOf(sub);
      const sameCycle = billingCycleOf(prev) === cycle;
      const prevStart = new Date(prev.fecha_inicio).getTime();
      const curStart = new Date(sub.fecha_inicio).getTime();
      const minGapMs = (cycle === 'annual' ? 300 : MIN_DAYS_BETWEEN_MONTHLY_CHARGES) * MS_PER_DAY;

      if (
        samePlan &&
        sameCycle &&
        !Number.isNaN(prevStart) &&
        !Number.isNaN(curStart) &&
        Math.abs(curStart - prevStart) < minGapMs
      ) {
        // Es un cobro duplicado dentro del mismo ciclo mensual/anual: conservar el primero
        // pero si el duplicado era el que tenía estado 'activa', mantener activo el primero.
        if (normalizeText(sub.estado) === 'activa') {
          prev.estado = 'activa';
        }
        if (prev.pago.length === 0 && singlePago.length > 0) {
          prev.pago = singlePago;
        }
        return;
      }
    }

    kept.push(normalizedSub);
  });

  return kept.sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime());
}

/**
 * Aplana suscripcion -> pago en una lista de transacciones lista para mostrar,
 * ordenada de la más reciente a la más antigua y sin duplicados del mismo mes.
 */
export function buildTransactions(subscriptions = []) {
  const rows = [];
  const cleanSubscriptions = deduplicateSubscriptions(subscriptions);

  cleanSubscriptions.forEach((sub) => {
    const planName = sub.plan?.nombre || 'Plan';
    const cycle = billingCycleOf(sub);
    const startTs = new Date(sub.fecha_inicio).getTime();
    const storageBytes = Number(sub.limite_bytes_contratado) || Number(sub.plan?.limite_almacenamiento_bytes) || 0;
    const planMonthlyPrice = Number(sub.plan?.precio) || 0;
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
        storageBytes,
        planMonthlyPrice,
      });
    });
  });
  return rows.sort((a, b) => b.ts - a.ts);
}

/** Suscripción vigente (la activa con fecha de fin más lejana) con datos de visualización. */
export function describeActiveSubscription(subscriptions = [], now = new Date()) {
  const cleanSubscriptions = deduplicateSubscriptions(subscriptions);
  const active = cleanSubscriptions
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
/* Exportación (Excel .xlsx nativo + CSV)                              */
/* ------------------------------------------------------------------ */

const csvCell = (value) => {
  let text = String(value ?? '');
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

const EXCEL_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlTextCell(col, row, text, styleId = 0) {
  const safe = /^[=+\-@]/.test(String(text ?? '')) ? `'${text}` : String(text ?? '');
  return `<c r="${col}${row}" s="${styleId}" t="inlineStr"><is><t>${escapeXml(safe)}</t></is></c>`;
}

function xmlNumCell(col, row, num, styleId = 0) {
  const n = Number(num);
  return `<c r="${col}${row}" s="${styleId}"><v>${Number.isFinite(n) ? n.toFixed(2) : 0}</v></c>`;
}

function xmlEmptyRange(startIdx, endIdx, row, styleId) {
  const out = [];
  for (let i = startIdx; i <= endIdx; i += 1) {
    out.push(`<c r="${EXCEL_COLS[i]}${row}" s="${styleId}"/>`);
  }
  return out.join('');
}

// Tabla CRC-32 estándar para empaquetar el contenedor ZIP de OpenXML (.xlsx)
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Empaqueta archivos XML en un archivo ZIP válido en memoria (método STORE) para formar un .xlsx nativo. */
function buildZipArchive(files) {
  const encoder = new TextEncoder();
  const entries = files.map((f) => {
    const nameBytes = encoder.encode(f.name);
    const dataBytes = encoder.encode(f.content);
    return { nameBytes, dataBytes, crc: crc32(dataBytes), offset: 0 };
  });

  let offset = 0;
  let centralSize = 0;
  entries.forEach((e) => {
    e.offset = offset;
    offset += 30 + e.nameBytes.length + e.dataBytes.length;
    centralSize += 46 + e.nameBytes.length;
  });

  const totalSize = offset + centralSize + 22;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);
  let pos = 0;

  entries.forEach((e) => {
    view.setUint32(pos, 0x04034b50, true);
    view.setUint16(pos + 4, 20, true);
    view.setUint16(pos + 6, 0x0800, true); // UTF-8
    view.setUint16(pos + 8, 0, true); // STORE
    view.setUint16(pos + 10, 0, true);
    view.setUint16(pos + 12, 0x2100, true);
    view.setUint32(pos + 14, e.crc, true);
    view.setUint32(pos + 18, e.dataBytes.length, true);
    view.setUint32(pos + 22, e.dataBytes.length, true);
    view.setUint16(pos + 26, e.nameBytes.length, true);
    view.setUint16(pos + 28, 0, true);
    pos += 30;
    out.set(e.nameBytes, pos);
    pos += e.nameBytes.length;
    out.set(e.dataBytes, pos);
    pos += e.dataBytes.length;
  });

  const centralStart = pos;
  entries.forEach((e) => {
    view.setUint32(pos, 0x02014b50, true);
    view.setUint16(pos + 4, 20, true);
    view.setUint16(pos + 6, 20, true);
    view.setUint16(pos + 8, 0x0800, true);
    view.setUint16(pos + 10, 0, true);
    view.setUint16(pos + 12, 0, true);
    view.setUint16(pos + 14, 0x2100, true);
    view.setUint32(pos + 16, e.crc, true);
    view.setUint32(pos + 20, e.dataBytes.length, true);
    view.setUint32(pos + 24, e.dataBytes.length, true);
    view.setUint16(pos + 28, e.nameBytes.length, true);
    view.setUint16(pos + 30, 0, true);
    view.setUint16(pos + 32, 0, true);
    view.setUint16(pos + 34, 0, true);
    view.setUint16(pos + 36, 0, true);
    view.setUint32(pos + 38, 0, true);
    view.setUint32(pos + 42, e.offset, true);
    pos += 46;
    out.set(e.nameBytes, pos);
    pos += e.nameBytes.length;
  });

  view.setUint32(pos, 0x06054b50, true);
  view.setUint16(pos + 4, 0, true);
  view.setUint16(pos + 6, 0, true);
  view.setUint16(pos + 8, entries.length, true);
  view.setUint16(pos + 10, entries.length, true);
  view.setUint32(pos + 12, centralSize, true);
  view.setUint32(pos + 16, centralStart, true);
  view.setUint16(pos + 20, 0, true);

  return out;
}

/**
 * Construye un libro de Excel (.xlsx) nativo, organizado con encabezado corporativo,
 * resumen ejecutivo, columnas con ancho ajustado, estados coloreados y fila de total.
 */
export function buildTransactionsXlsx({ transactions = [], user = null, subscription = null, paymentMethod = null } = {}) {
  const now = new Date();
  const clientName = user?.name || 'Cliente Nimbox';
  const clientEmail = user?.email || '—';
  const activePlanText = subscription
    ? `Plan ${subscription.planName} (${cycleLabel(subscription.cycle)})`
    : (user?.plan && user.plan !== 'Ninguno' ? `Plan ${user.plan}` : 'Sin suscripción activa');
  const nextBillingText = subscription?.end ? formatShortDate(subscription.end) : '—';
  const primaryMethodText = paymentMethod?.label || 'Sin método registrado';

  const paidTransactions = transactions.filter((t) => t.statusKey === PAYMENT_STATUS.PAID);
  const totalPaid = paidTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  // Índices de estilo (cellXfs):
  // 0: Base
  // 1: Banner título principal (fondo #312E81, texto blanco 14pt bold, centrado)
  // 2: Subtítulo banner (fondo #EEF2FF, texto #3730A3 10pt, centrado)
  // 3: Etiqueta tarjeta resumen (fondo #F1F5F9, texto #475569 8.5pt bold, borde)
  // 4: Valor tarjeta resumen texto (fondo #FFFFFF, texto #0F172A 10pt bold, borde)
  // 5: Valor tarjeta resumen moneda (fondo #ECFDF5, texto #047857 11pt bold, formato $#,##0.00, derecha, borde)
  // 6: Encabezado de tabla centrado (fondo #1E293B, texto blanco 10pt bold, borde)
  // 7: Encabezado de tabla derecha (fondo #1E293B, texto blanco 10pt bold, derecha, borde)
  // 8: Celda par texto centrado
  // 9: Celda impar (cebra) texto centrado
  // 10: Celda par texto izquierda
  // 11: Celda impar (cebra) texto izquierda
  // 12: Celda par moneda derecha ($#,##0.00)
  // 13: Celda impar (cebra) moneda derecha ($#,##0.00)
  // 14: Estado Pagado (fondo verde suave #DCFCE7, texto #15803D bold, centrado)
  // 15: Estado Pendiente (fondo ámbar suave #FEF3C7, texto #B45309 bold, centrado)
  // 16: Estado Fallido (fondo rojo suave #FEE2E2, texto #B91C1C bold, centrado)
  // 17: Estado Reembolsado (fondo gris #E2E8F0, texto #475569 bold, centrado)
  // 18: Pie de tabla etiqueta TOTAL (fondo #EEF2FF, texto #1E1B4B 10.5pt bold, derecha, borde doble)
  // 19: Pie de tabla monto TOTAL (fondo #EEF2FF, texto #312E81 11pt bold, formato $#,##0.00, derecha, borde doble)

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/>
  </numFmts>
  <fonts count="12">
    <font><sz val="10"/><color rgb="FF0F172A"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="9.5"/><color rgb="FF3730A3"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="8.5"/><color rgb="FF475569"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FF0F172A"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF047857"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="9.5"/><color rgb="FF15803D"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="9.5"/><color rgb="FFB45309"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="9.5"/><color rgb="FFB91C1C"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="9.5"/><color rgb="FF475569"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="10.5"/><color rgb="FF1E1B4B"/><name val="Segoe UI"/><family val="2"/></font>
  </fonts>
  <fills count="12">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF312E81"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEEF2FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="4">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FF1E293B"/></left>
      <right style="thin"><color rgb="FF1E293B"/></right>
      <top style="medium"><color rgb="FF1E293B"/></top>
      <bottom style="medium"><color rgb="FF1E293B"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFC7D2FE"/></left>
      <right style="thin"><color rgb="FFC7D2FE"/></right>
      <top style="medium"><color rgb="FF4F46E5"/></top>
      <bottom style="double"><color rgb="FF4F46E5"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="20">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="164" fontId="5" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="6" fillId="7" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="6" fillId="7" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="164" fontId="4" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="4" fillId="8" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="7" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="8" fillId="10" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="9" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="10" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="11" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="11" fillId="3" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;

  const statusStyleMap = {
    [PAYMENT_STATUS.PAID]: 14,
    [PAYMENT_STATUS.PENDING]: 15,
    [PAYMENT_STATUS.FAILED]: 16,
    [PAYMENT_STATUS.REFUNDED]: 17,
  };

  const rowsXml = [];

  // Fila 1: Banner principal
  rowsXml.push(
    `<row r="1" ht="34" customHeight="1">${xmlTextCell('A', 1, 'NIMBOX CLOUD  ·  REPORTE DE FACTURACIÓN E HISTORIAL DE PAGOS', 1)}${xmlEmptyRange(1, 9, 1, 1)}</row>`
  );

  // Fila 2: Subtítulo con fecha de generación y método principal
  rowsXml.push(
    `<row r="2" ht="22" customHeight="1">${xmlTextCell('A', 2, `Generado el ${formatLongDate(now.toISOString())}  ·  Método principal: ${primaryMethodText}`, 2)}${xmlEmptyRange(1, 9, 2, 2)}</row>`
  );

  // Fila 3: Espacio
  rowsXml.push('<row r="3" ht="10" customHeight="1"/>');

  // Fila 4: Encabezados de tarjetas de resumen
  rowsXml.push(
    `<row r="4" ht="19" customHeight="1">` +
      xmlTextCell('A', 4, 'CLIENTE / CUENTA', 3) + xmlEmptyRange(1, 2, 4, 3) +
      xmlTextCell('D', 4, 'SUSCRIPCIÓN ACTIVA', 3) + xmlEmptyRange(4, 4, 4, 3) +
      xmlTextCell('F', 4, 'PRÓXIMA RENOVACIÓN', 3) + xmlEmptyRange(6, 6, 4, 3) +
      xmlTextCell('H', 4, 'TRANSACCIONES', 3) + xmlEmptyRange(8, 8, 4, 3) +
      xmlTextCell('J', 4, 'TOTAL PAGADO (USD)', 3) +
    `</row>`
  );

  // Fila 5: Valores de tarjetas de resumen
  rowsXml.push(
    `<row r="5" ht="24" customHeight="1">` +
      xmlTextCell('A', 5, `${clientName} (${clientEmail})`, 4) + xmlEmptyRange(1, 2, 5, 4) +
      xmlTextCell('D', 5, activePlanText, 4) + xmlEmptyRange(4, 4, 5, 4) +
      xmlTextCell('F', 5, nextBillingText, 4) + xmlEmptyRange(6, 6, 5, 4) +
      xmlTextCell('H', 5, `${transactions.length} registros (${paidTransactions.length} pagados)`, 4) + xmlEmptyRange(8, 8, 5, 4) +
      xmlNumCell('J', 5, totalPaid, 5) +
    `</row>`
  );

  // Fila 6: Espacio
  rowsXml.push('<row r="6" ht="12" customHeight="1"/>');

  // Fila 7: Encabezado de la tabla de transacciones
  const tableHeaders = [
    ['A', 'N.º', 6],
    ['B', 'Fecha de Pago', 6],
    ['C', 'Referencia', 6],
    ['D', 'Plan', 6],
    ['E', 'Ciclo', 6],
    ['F', 'Inicio del Periodo', 6],
    ['G', 'Fin del Periodo', 6],
    ['H', 'Método de Pago', 6],
    ['I', 'Estado', 6],
    ['J', 'Monto (USD)', 7],
  ];
  rowsXml.push(
    `<row r="7" ht="26" customHeight="1">${tableHeaders.map(([col, label, st]) => xmlTextCell(col, 7, label, st)).join('')}</row>`
  );

  // Filas de datos (desde la fila 8)
  const firstDataRow = 8;
  transactions.forEach((tx, idx) => {
    const r = firstDataRow + idx;
    const isOdd = idx % 2 === 1;
    const centerStyle = isOdd ? 9 : 8;
    const leftStyle = isOdd ? 11 : 10;
    const moneyStyle = isOdd ? 13 : 12;
    const statusStyle = statusStyleMap[tx.statusKey] || 15;
    const statusLabel = STATUS_META[tx.statusKey]?.label || 'Pendiente';

    rowsXml.push(
      `<row r="${r}" ht="22" customHeight="1">` +
        xmlTextCell('A', r, String(idx + 1), centerStyle) +
        xmlTextCell('B', r, formatShortDate(tx.date), centerStyle) +
        xmlTextCell('C', r, tx.reference, centerStyle) +
        xmlTextCell('D', r, `Plan ${tx.planName || 'Plan'}`, centerStyle) +
        xmlTextCell('E', r, cycleLabel(tx.cycle), centerStyle) +
        xmlTextCell('F', r, formatShortDate(tx.periodStart), centerStyle) +
        xmlTextCell('G', r, formatShortDate(tx.periodEnd), centerStyle) +
        xmlTextCell('H', r, tx.method?.label || 'Tarjeta (simulada)', leftStyle) +
        xmlTextCell('I', r, statusLabel, statusStyle) +
        xmlNumCell('J', r, tx.amount, moneyStyle) +
      `</row>`
    );
  });

  // Fila final de Total General
  const totalRow = firstDataRow + transactions.length;
  rowsXml.push(
    `<row r="${totalRow}" ht="26" customHeight="1">` +
      xmlTextCell('A', totalRow, 'TOTAL PAGADO (TRANSACCIONES COMPLETADAS)', 18) +
      xmlEmptyRange(1, 8, totalRow, 18) +
      xmlNumCell('J', totalRow, totalPaid, 19) +
    `</row>`
  );

  const lastDataRow = Math.max(7, totalRow - 1);

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0" showGridLines="1"/>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="20" customHeight="1"/>
  <cols>
    <col min="1" max="1" width="7" customWidth="1"/>
    <col min="2" max="2" width="17" customWidth="1"/>
    <col min="3" max="3" width="26" customWidth="1"/>
    <col min="4" max="4" width="17" customWidth="1"/>
    <col min="5" max="5" width="14" customWidth="1"/>
    <col min="6" max="6" width="18" customWidth="1"/>
    <col min="7" max="7" width="18" customWidth="1"/>
    <col min="8" max="8" width="29" customWidth="1"/>
    <col min="9" max="9" width="15" customWidth="1"/>
    <col min="10" max="10" width="18" customWidth="1"/>
  </cols>
  <sheetData>
    ${rowsXml.join('\n    ')}
  </sheetData>
  <autoFilter ref="A7:J${lastDataRow}"/>
  <mergeCells count="11">
    <mergeCell ref="A1:J1"/>
    <mergeCell ref="A2:J2"/>
    <mergeCell ref="A4:C4"/>
    <mergeCell ref="D4:E4"/>
    <mergeCell ref="F4:G4"/>
    <mergeCell ref="H4:I4"/>
    <mergeCell ref="A5:C5"/>
    <mergeCell ref="D5:E5"/>
    <mergeCell ref="F5:G5"/>
    <mergeCell ref="H5:I5"/>
    <mergeCell ref="A${totalRow}:I${totalRow}"/>
  </mergeCells>
  <pageMargins left="0.5" right="0.5" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
</worksheet>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Historial de Pagos" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  return buildZipArchive([
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: rootRelsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/styles.xml', content: stylesXml },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
  ]);
}

// Las facturas se abren en una ventana aparte sin las variables CSS de la app, por eso usan colores fijos
const PILL_COLORS = {
  [PAYMENT_STATUS.PAID]: { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0', dot: '#10b981', desc: 'Cobro procesado y verificado exitosamente' },
  [PAYMENT_STATUS.PENDING]: { bg: '#fffbeb', fg: '#b45309', border: '#fde68a', dot: '#f59e0b', desc: 'Pago en proceso de validación' },
  [PAYMENT_STATUS.FAILED]: { bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca', dot: '#ef4444', desc: 'El intento de cobro no pudo completarse' },
  [PAYMENT_STATUS.REFUNDED]: { bg: '#f1f5f9', fg: '#334155', border: '#cbd5e1', dot: '#64748b', desc: 'Importe devuelto al método de pago original' },
};

export function buildInvoiceHtml({ tx, user }) {
  const status = STATUS_META[tx.statusKey] || STATUS_META[PAYMENT_STATUS.PENDING];
  const pill = PILL_COLORS[tx.statusKey] || PILL_COLORS[PAYMENT_STATUS.PENDING];
  const isPaid = tx.statusKey === PAYMENT_STATUS.PAID;
  const docType = isPaid ? 'FACTURA DE SUSCRIPCIÓN' : 'COMPROBANTE DE TRANSACCIÓN';
  const shortTitle = isPaid ? 'Factura' : 'Comprobante';

  const clientName = user?.name || 'Cliente Nimbox';
  const clientEmail = user?.email || '—';
  const subCode = tx.subscriptionId
    ? `SUB-${String(tx.subscriptionId).replace(/-/g, '').slice(0, 8).toUpperCase()}`
    : 'SUB-ACTIVA';
  const paymentIdCode = tx.id
    ? `PAY-${String(tx.id).replace(/-/g, '').slice(0, 8).toUpperCase()}`
    : tx.reference;

  const isAnnual = tx.cycle === 'annual';
  const cycleText = isAnnual ? 'Anual (365 días)' : 'Mensual (30 días)';
  const periodText = `${formatShortDate(tx.periodStart)} al ${formatShortDate(tx.periodEnd)}`;
  const storageText = tx.storageBytes > 0 ? formatBytes(tx.storageBytes) : 'Almacenamiento Cloud';

  // Cálculo de desglose financiero (si es anual y conocemos el precio mensual base, mostramos el ahorro del 20%)
  const amount = Number(tx.amount) || 0;
  const rawAnnualBase = isAnnual && tx.planMonthlyPrice > 0 ? Number((tx.planMonthlyPrice * 12).toFixed(2)) : amount;
  const hasAnnualDiscount = isAnnual && rawAnnualBase > amount + 0.01;
  const basePrice = hasAnnualDiscount ? rawAnnualBase : amount;
  const discountAmount = hasAnnualDiscount ? Number((rawAnnualBase - amount).toFixed(2)) : 0;
  const taxAmount = 0;

  const generatedAt = formatLongDate(new Date().toISOString());

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(shortTitle)} ${escapeHtml(tx.reference)} · Nimbox Cloud</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      background: #e2e8f0;
      line-height: 1.5;
    }

    /* Barra superior de acciones (no se imprime) */
    .toolbar {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
    }
    .toolbar-info { display: flex; align-items: center; gap: 10px; color: #cbd5e1; }
    .toolbar-badge {
      background: rgba(79, 70, 229, 0.25);
      color: #c7d2fe;
      border: 1px solid rgba(129, 140, 248, 0.4);
      padding: 3px 10px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.04em;
    }
    .toolbar-actions { display: flex; gap: 10px; }
    .btn-print {
      background: #4f46e5;
      color: #ffffff;
      border: 0;
      border-radius: 8px;
      padding: 9px 18px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(79, 70, 229, 0.35);
    }
    .btn-print:hover { background: #4338ca; }
    .btn-close {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 9px 14px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-close:hover { background: #334155; color: #ffffff; }

    /* Hoja principal de la factura */
    .invoice-sheet {
      max-width: 840px;
      margin: 28px auto 40px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
      border: 1px solid #cbd5e1;
    }

    /* Encabezado corporativo */
    .invoice-header {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      color: #ffffff;
      padding: 32px 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }
    .brand-logo {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .brand-logo span { color: #818cf8; }
    .brand-meta {
      font-size: 12.5px;
      color: #c7d2fe;
      line-height: 1.55;
    }
    .doc-box { text-align: right; }
    .doc-type {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #a5b4fc;
      margin-bottom: 4px;
    }
    .doc-ref {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.01em;
      margin-bottom: 10px;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: ${pill.bg};
      color: ${pill.fg};
      border: 1px solid ${pill.border};
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${pill.dot};
    }

    /* Franja de resumen rápido (4 indicadores clave) */
    .summary-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .summary-item {
      padding: 16px 20px;
      border-right: 1px solid #e2e8f0;
    }
    .summary-item:last-child {
      border-right: none;
      background: #eef2ff;
    }
    .summary-label {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 4px;
    }
    .summary-value {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      word-break: break-word;
    }
    .summary-item:last-child .summary-label { color: #4338ca; }
    .summary-item:last-child .summary-value {
      color: #312e81;
      font-size: 16px;
      font-weight: 800;
    }

    /* Cuerpo principal */
    .invoice-body { padding: 32px 40px; }

    /* Bloques de información (Emisor / Cliente y Detalles) */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }
    .info-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
    }
    .info-card-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #4f46e5;
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      padding: 4px 0;
      font-size: 13px;
    }
    .info-row span:first-child {
      color: #64748b;
      font-weight: 500;
      flex-shrink: 0;
    }
    .info-row span:last-child {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }

    /* Tabla de conceptos */
    .section-heading {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #334155;
      margin: 0 0 10px 0;
    }
    .items-table-wrap {
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }
    .items-table thead th {
      background: #1e293b;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 12px 16px;
      text-align: left;
    }
    .items-table thead th.num,
    .items-table tbody td.num {
      text-align: right;
    }
    .items-table thead th.center,
    .items-table tbody td.center {
      text-align: center;
    }
    .items-table tbody td {
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      color: #1e293b;
    }
    .items-table tbody tr:last-child td { border-bottom: none; }
    .item-title {
      font-size: 14.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .item-sub {
      font-size: 12px;
      color: #64748b;
      line-height: 1.45;
    }
    .cycle-tag {
      display: inline-block;
      background: #eef2ff;
      color: #4338ca;
      border: 1px solid #c7d2fe;
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 6px;
    }

    /* Sección inferior: Verificación + Desglose de Totales */
    .bottom-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 24px;
      align-items: start;
    }
    .verification-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      font-size: 12.5px;
      color: #475569;
    }
    .verification-box strong {
      display: block;
      color: #0f172a;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .verification-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .verification-list li {
      padding: 3px 0;
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .verification-list li span:last-child {
      font-weight: 600;
      color: #1e293b;
    }

    .totals-card {
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      overflow: hidden;
      background: #ffffff;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 18px;
      font-size: 13.5px;
      border-bottom: 1px solid #f1f5f9;
      color: #475569;
    }
    .totals-row.discount {
      color: #047857;
      background: #ecfdf5;
      font-weight: 600;
    }
    .totals-row strong { color: #0f172a; }
    .totals-final {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background: #eef2ff;
      border-top: 2px solid #818cf8;
    }
    .totals-final span {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #312e81;
    }
    .totals-final strong {
      font-size: 22px;
      font-weight: 800;
      color: #1e1b4b;
    }

    /* Pie de página */
    .invoice-footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 18px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      font-size: 11.5px;
      color: #64748b;
    }

    @page { size: A4; margin: 12mm; }
    @media print {
      body { background: #ffffff; }
      .toolbar { display: none !important; }
      .invoice-sheet {
        margin: 0;
        max-width: none;
        box-shadow: none;
        border: 1px solid #cbd5e1;
      }
    }
    @media (max-width: 680px) {
      .summary-strip { grid-template-columns: 1fr 1fr; }
      .info-grid, .bottom-grid { grid-template-columns: 1fr; }
      .invoice-header, .invoice-footer { flex-direction: column; text-align: left; }
      .doc-box { text-align: left; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-info">
      <span class="toolbar-badge">VISTA DE IMPRESIÓN</span>
      <span>Selecciona <strong>«Guardar como PDF»</strong> en el destino de impresión para descargar tu factura.</span>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="btn-print" onclick="window.print()">Imprimir / Guardar PDF</button>
      <button type="button" class="btn-close" onclick="window.close()">Cerrar</button>
    </div>
  </div>

  <div class="invoice-sheet">
    <!-- Encabezado corporativo -->
    <div class="invoice-header">
      <div>
        <div class="brand-logo">Nimbox<span>.</span></div>
        <div class="brand-meta">
          <strong>Nimbox Cloud Storage SaaS</strong><br>
          Servicios de Almacenamiento y Respaldo en la Nube<br>
          Soporte y Facturación: facturacion@nimbox.cloud
        </div>
      </div>
      <div class="doc-box">
        <div class="doc-type">${escapeHtml(docType)}</div>
        <div class="doc-ref">N.º ${escapeHtml(tx.reference)}</div>
        <div class="status-pill">
          <span class="status-dot"></span>
          <span>${escapeHtml(status.label)}</span>
        </div>
      </div>
    </div>

    <!-- Franja de 4 indicadores clave -->
    <div class="summary-strip">
      <div class="summary-item">
        <div class="summary-label">Fecha de Emisión</div>
        <div class="summary-value">${escapeHtml(formatShortDate(tx.date))}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Método de Pago</div>
        <div class="summary-value">${escapeHtml(tx.method?.label || 'Tarjeta (simulada)')}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Periodo Facturado</div>
        <div class="summary-value">${escapeHtml(periodText)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total (${escapeHtml(status.label)})</div>
        <div class="summary-value">${escapeHtml(formatMoney(amount))} USD</div>
      </div>
    </div>

    <div class="invoice-body">
      <!-- Tarjetas de Cliente y Detalles de la Operación -->
      <div class="info-grid">
        <div class="info-card">
          <h3 class="info-card-title">Facturado a (Datos del Cliente)</h3>
          <div class="info-row">
            <span>Titular de la cuenta</span>
            <span>${escapeHtml(clientName)}</span>
          </div>
          <div class="info-row">
            <span>Correo electrónico</span>
            <span>${escapeHtml(clientEmail)}</span>
          </div>
          <div class="info-row">
            <span>ID de Suscripción</span>
            <span>${escapeHtml(subCode)}</span>
          </div>
          <div class="info-row">
            <span>Moneda de facturación</span>
            <span>USD (Dólar estadounidense)</span>
          </div>
        </div>

        <div class="info-card">
          <h3 class="info-card-title">Detalles de la Suscripción y Pago</h3>
          <div class="info-row">
            <span>Plan contratado</span>
            <span>Plan ${escapeHtml(tx.planName || 'Plan')}</span>
          </div>
          <div class="info-row">
            <span>Modalidad / Ciclo</span>
            <span>${escapeHtml(cycleText)}</span>
          </div>
          <div class="info-row">
            <span>Capacidad asignada</span>
            <span>${escapeHtml(storageText)}</span>
          </div>
          <div class="info-row">
            <span>Fecha exacta de cobro</span>
            <span>${escapeHtml(formatLongDate(tx.date))}</span>
          </div>
        </div>
      </div>

      <!-- Tabla detallada de conceptos -->
      <h4 class="section-heading">Detalle de Conceptos Facturados</h4>
      <div class="items-table-wrap">
        <table class="items-table">
          <thead>
            <tr>
              <th class="center" style="width: 64px;">Cant.</th>
              <th>Descripción del Servicio</th>
              <th class="center" style="width: 110px;">Ciclo</th>
              <th style="width: 190px;">Vigencia del Servicio</th>
              <th class="num" style="width: 120px;">Precio Base</th>
              <th class="num" style="width: 125px;">Importe (USD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="center" style="font-weight: 700;">1</td>
              <td>
                <div class="item-title">Suscripción Nimbox — Plan ${escapeHtml(tx.planName || 'Plan')}</div>
                <div class="item-sub">
                  Incluye ${escapeHtml(storageText)} de almacenamiento seguro en la nube, sincronización multi-dispositivo y renovación automática.
                </div>
              </td>
              <td class="center">
                <span class="cycle-tag">${escapeHtml(cycleLabel(tx.cycle))}</span>
              </td>
              <td>
                <div style="font-weight: 600; color: #0f172a;">${escapeHtml(formatShortDate(tx.periodStart))}</div>
                <div style="font-size: 12px; color: #64748b;">hasta ${escapeHtml(formatShortDate(tx.periodEnd))}</div>
              </td>
              <td class="num" style="font-weight: 600;">${escapeHtml(formatMoney(basePrice))}</td>
              <td class="num" style="font-weight: 800; color: #0f172a;">${escapeHtml(formatMoney(amount))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Resumen inferior: Verificación + Desglose Financiero -->
      <div class="bottom-grid">
        <div class="verification-box">
          <strong>Información de Verificación del Pago</strong>
          <ul class="verification-list">
            <li><span>Referencia de transacción:</span> <span>${escapeHtml(tx.reference)}</span></li>
            <li><span>Identificador de registro:</span> <span>${escapeHtml(paymentIdCode)}</span></li>
            <li><span>Instrumento utilizado:</span> <span>${escapeHtml(tx.method?.label || 'Tarjeta (simulada)')}</span></li>
            <li><span>Dictamen de la operación:</span> <span>${escapeHtml(pill.desc)}</span></li>
          </ul>
        </div>

        <div class="totals-card">
          <div class="totals-row">
            <span>Subtotal</span>
            <strong>${escapeHtml(formatMoney(basePrice))} USD</strong>
          </div>
          ${hasAnnualDiscount ? `
          <div class="totals-row discount">
            <span>Descuento plan anual (20%)</span>
            <span>-${escapeHtml(formatMoney(discountAmount))} USD</span>
          </div>` : ''}
          <div class="totals-row">
            <span>Impuestos (Servicios digitales 0%)</span>
            <strong>$0.00 USD</strong>
          </div>
          <div class="totals-final">
            <span>Total ${isPaid ? 'Pagado' : 'del Documento'}</span>
            <strong>${escapeHtml(formatMoney(amount))} USD</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Pie de página -->
    <div class="invoice-footer">
      <div>
        <strong>Nimbox Cloud</strong> · Documento generado el ${escapeHtml(generatedAt)}
      </div>
      <div>
        Comprobante digital de pago simulado emitido con fines académicos.
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 400);
    });
  </script>
</body>
</html>`;
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

export function downloadBlobFile(filename, bytes, mime = 'application/octet-stream') {
  const blob = new Blob([bytes], { type: mime });
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
