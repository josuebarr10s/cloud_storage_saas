/**
 * Cálculos de la sección "Estadísticas" del panel de administración.
 * Funciones puras: reciben los planes, suscripciones y pagos y devuelven lo que se grafica.
 */

const DIA = 86400000;

export const PERIODOS = [
  { id: '30d', label: '30 días', dias: 30 },
  { id: '90d', label: '90 días', dias: 90 },
  { id: '12m', label: '12 meses', dias: 365 },
  { id: 'todo', label: 'Todo', dias: null },
];

// Paleta categórica validada (orden fijo; el color sigue al plan, no a su posición en el ranking)
export const COLORES_PLAN = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
export const COLOR_OTROS = '#898781';

/**
 * Le asigna a cada plan un color fijo según su orden por precio (y nombre en empate),
 * así un plan conserva su color aunque cambie el periodo o el ranking.
 * Del noveno plan en adelante se agrupan como "Otros".
 */
export function coloresPorPlan(planes) {
  const orden = [...planes].sort((a, b) => Number(a.precio) - Number(b.precio) || String(a.nombre).localeCompare(String(b.nombre)));
  const mapa = {};
  orden.forEach((p, i) => { mapa[p.id_plan] = i < COLORES_PLAN.length ? COLORES_PLAN[i] : COLOR_OTROS; });
  return mapa;
}

/**
 * Marca cada suscripción como:
 *  - 'nueva': la primera suscripción del usuario
 *  - 'cambio': el usuario venía de otro plan
 *  - 'renovacion': el usuario ya tenía ese mismo plan
 */
export function clasificarSuscripciones(suscripciones) {
  const porUsuario = new Map();
  for (const s of suscripciones) {
    if (!porUsuario.has(s.id_usuario)) porUsuario.set(s.id_usuario, []);
    porUsuario.get(s.id_usuario).push(s);
  }
  const resultado = [];
  for (const lista of porUsuario.values()) {
    lista.sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio) || String(a.id_suscripcion).localeCompare(String(b.id_suscripcion)));
    lista.forEach((s, i) => {
      const anterior = lista[i - 1];
      const tipo = !anterior ? 'nueva' : anterior.id_plan === s.id_plan ? 'renovacion' : 'cambio';
      resultado.push({ ...s, tipo });
    });
  }
  return resultado;
}

const inicioDeSemana = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // lunes
  return x;
};

/**
 * Divide el periodo en intervalos: semanas si dura hasta ~3 meses, meses si es más largo.
 */
export function crearIntervalos(desde, hasta) {
  const dias = (hasta - desde) / DIA;
  const intervalos = [];
  if (dias <= 92) {
    for (let ini = inicioDeSemana(desde); ini <= hasta; ) {
      const fin = new Date(ini); fin.setDate(fin.getDate() + 7);
      intervalos.push({
        inicio: ini,
        fin,
        label: ini.toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', ''),
        titulo: `Semana del ${ini.toLocaleDateString('es', { day: 'numeric', month: 'long' })}`,
      });
      ini = fin;
    }
    return { unidad: 'semana', intervalos };
  }
  let ini = new Date(desde.getFullYear(), desde.getMonth(), 1);
  const varios = desde.getFullYear() !== hasta.getFullYear();
  while (ini <= hasta) {
    const fin = new Date(ini.getFullYear(), ini.getMonth() + 1, 1);
    const mes = ini.toLocaleDateString('es', { month: 'short' }).replace('.', '');
    intervalos.push({
      inicio: ini,
      fin,
      label: varios && (ini.getMonth() === 0 || intervalos.length === 0) ? `${mes} ${String(ini.getFullYear()).slice(2)}` : mes,
      titulo: ini.toLocaleDateString('es', { month: 'long', year: 'numeric' }),
    });
    ini = fin;
  }
  return { unidad: 'mes', intervalos };
}

/**
 * Calcula todo lo que muestra la sección para un periodo.
 * @param {{ planes: Array, suscripciones: Array, pagos: Array }} datos
 * @param {{ dias: number|null }} periodo
 * @param {Date} ahora
 */
export function calcularEstadisticas({ planes, suscripciones, pagos }, periodo, ahora = new Date()) {
  const subs = clasificarSuscripciones(suscripciones);
  const fechas = subs.map((s) => new Date(s.fecha_inicio).getTime()).concat(pagos.map((p) => new Date(p.fecha_pago).getTime()))
    .filter((t) => Number.isFinite(t));
  const desde = periodo.dias
    ? new Date(ahora.getTime() - periodo.dias * DIA)
    : new Date(Math.min(ahora.getTime() - 30 * DIA, ...fechas));
  const enPeriodo = (fecha) => { const t = new Date(fecha).getTime(); return t >= desde.getTime() && t <= ahora.getTime(); };

  const subsPeriodo = subs.filter((s) => enPeriodo(s.fecha_inicio));
  const subPorId = new Map(subs.map((s) => [s.id_suscripcion, s]));
  const pagosPeriodo = pagos.filter((p) => (p.estado || 'completado') === 'completado' && enPeriodo(p.fecha_pago));

  const color = coloresPorPlan(planes);
  const porPlan = new Map(planes.map((p) => [p.id_plan, {
    id: p.id_plan, nombre: p.nombre, activo: p.activo !== false, color: color[p.id_plan],
    activas: 0, contrataciones: 0, renovaciones: 0, ingresos: 0,
  }]));
  for (const s of subs) if (s.estado === 'activa' && porPlan.has(s.id_plan)) porPlan.get(s.id_plan).activas += 1;
  for (const s of subsPeriodo) {
    const fila = porPlan.get(s.id_plan);
    if (!fila) continue;
    if (s.tipo === 'renovacion') fila.renovaciones += 1; else fila.contrataciones += 1;
  }
  for (const p of pagosPeriodo) {
    const fila = porPlan.get(subPorId.get(p.id_suscripcion)?.id_plan);
    if (fila) fila.ingresos += Number(p.monto) || 0;
  }

  const filas = [...porPlan.values()].sort((a, b) => b.contrataciones - a.contrataciones || b.activas - a.activas || a.nombre.localeCompare(b.nombre));

  const { unidad, intervalos } = crearIntervalos(desde, ahora);
  const indice = (fecha) => {
    const t = new Date(fecha).getTime();
    return intervalos.findIndex((it) => t >= it.inicio.getTime() && t < it.fin.getTime());
  };
  const serie = intervalos.map((it) => ({ ...it, porPlan: {}, total: 0, ingresosPorPlan: {}, ingresos: 0 }));
  for (const s of subsPeriodo) {
    if (s.tipo === 'renovacion') continue;
    const i = indice(s.fecha_inicio);
    if (i < 0) continue;
    serie[i].porPlan[s.id_plan] = (serie[i].porPlan[s.id_plan] || 0) + 1;
    serie[i].total += 1;
  }
  for (const p of pagosPeriodo) {
    const i = indice(p.fecha_pago);
    if (i < 0) continue;
    const monto = Number(p.monto) || 0;
    const plan = subPorId.get(p.id_suscripcion)?.id_plan;
    serie[i].ingresos += monto;
    if (plan) serie[i].ingresosPorPlan[plan] = (serie[i].ingresosPorPlan[plan] || 0) + monto;
  }

  const totales = {
    activas: subs.filter((s) => s.estado === 'activa').length,
    contrataciones: subsPeriodo.filter((s) => s.tipo !== 'renovacion').length,
    nuevas: subsPeriodo.filter((s) => s.tipo === 'nueva').length,
    cambios: subsPeriodo.filter((s) => s.tipo === 'cambio').length,
    renovaciones: subsPeriodo.filter((s) => s.tipo === 'renovacion').length,
    ingresos: pagosPeriodo.reduce((acc, p) => acc + (Number(p.monto) || 0), 0),
  };

  return { desde, hasta: ahora, unidad, filas, serie, totales };
}
