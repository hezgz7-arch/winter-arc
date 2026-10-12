// Utilidades de interfaz: formato, hojas/diálogos, toasts, anillo y gráficos SVG.
import { dayToDate, dow } from './domain.js';
import { WEEKDAYS } from './catalog.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- formato ----------
const nf = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
export const num = (v) => nf.format(v);
export const pct = (v) => `${Math.round(v * 100)} %`;
export const qty = (v, unit) => `${num(v)}${unit ? ' ' + unit : ''}`;
export const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const parseHhmm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const fmtL = (opts) => new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', ...opts });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const fLong = (d) => cap(fmtL({ weekday: 'long', day: 'numeric', month: 'long' }).format(dayToDate(d)));
export const fShort = (d) => fmtL({ day: 'numeric', month: 'short' }).format(dayToDate(d));
export const fFull = (d) => fmtL({ day: 'numeric', month: 'long', year: 'numeric' }).format(dayToDate(d));
export const fMonth = (d) => cap(fmtL({ month: 'long', year: 'numeric' }).format(dayToDate(d)));
export const weekdayName = (i) => WEEKDAYS[i];

export function vibrate(ms = 12) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* iOS no lo soporta */ } }

// ---------- iconos de interfaz ----------
const I = (d, s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ic = {
  back: I('<path d="M15 5l-7 7 7 7"/>'), chev: I('<path d="M9 5l7 7-7 7"/>', 20), left: I('<path d="M15 5l-7 7 7 7"/>'), right: I('<path d="M9 5l7 7-7 7"/>'),
  more: I('<circle cx="12" cy="5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/>'),
  check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 26), x: I('<path d="M6 6l12 12M18 6L6 18"/>', 22), plus: I('<path d="M12 5v14M5 12h14"/>'),
  flame: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3.500 4.500 5.500 4.500 10a4.500 4.500 0 0 1-9 0c0-1.500.600-2.700 1.500-3.700.2 1.200.9 1.900 1.700 2.200C10.200 7.800 10.800 4.500 12 2z"/></svg>',
  today: I('<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/><rect x="8" y="13" width="4" height="4" rx="1" fill="currentColor"/>'),
  progress: I('<path d="M3 17l5-6 4 3 5-8 4 4"/><path d="M3 21h18"/>'),
  body: I('<rect x="5" y="3" width="14" height="18" rx="3"/><circle cx="12" cy="9" r="2.5"/><path d="M9 16h6"/>'),
  settings: I('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100L7 17M17 7l2.100-2.100"/>'),
  trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  edit: I('<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>'),
  star: I('<path d="M12 3.500l2.700 5.500 6 .9-4.400 4.200 1 6L12 17.300 6.700 20.100l1-6L3.300 9.900l6-.9z"/>', 22),
  clock: I('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', 22),
  shield: I('<path d="M12 3l7 3v6c0 4.500-3 7.500-7 9-4-1.500-7-4.500-7-9V6z"/>', 22),
  archive: I('<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11h14V8M10 12h4"/>', 22),
  restore: I('<path d="M4 12a8 8 0 1 0 3-6.200M4 4v5h5"/>', 22),
  up: I('<path d="M6 15l6-6 6 6"/>', 22), down: I('<path d="M6 9l6 6 6-6"/>', 22),
  focus: I('<circle cx="12" cy="13" r="7"/><path d="M12 9v4l2 2M9 3h6"/>', 22),
  share: I('<path d="M12 15V3M8 7l4-4 4 4M5 12v8h14v-8"/>', 22),
  camera: I('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.500"/>', 22),
};

// ---------- anillo ----------
export function ring(frac, size = 108, stroke = 10, grad = true, color = 'var(--primary)') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, id = 'g' + Math.random().toString(36).slice(2, 7);
  const f = Math.min(1, Math.max(0, frac || 0));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    ${grad ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4FE0D2"/><stop offset=".55" stop-color="#B7A4FF"/><stop offset="1" stop-color="#FF7EC3"/></linearGradient></defs>` : ''}
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="color-mix(in srgb, var(--outline) 28%, transparent)" stroke-width="${stroke}"/>
    ${f > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${grad ? `url(#${id})` : color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c * f} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}
  </svg>`;
}

// ---------- capa de hojas / diálogos ----------
const layer = () => $('#layer');
let openCount = 0;
function mount(html, kind, onClose) {
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  el.innerHTML = `<div class="scrim"></div><div class="${kind}" role="dialog" aria-modal="true">${html}</div>`;
  layer().appendChild(el);
  layer().style.pointerEvents = 'auto';
  openCount++;
  document.body.style.overflow = 'hidden';
  let closed = false;
  const close = (v) => {
    if (closed) return; closed = true;
    el.remove(); openCount--;
    if (!openCount) { layer().style.pointerEvents = 'none'; document.body.style.overflow = ''; }
    onClose?.(v);
  };
  $('.scrim', el).addEventListener('click', () => close(undefined));
  return { el, close, body: $(`.${kind}`, el) };
}

/** Hoja inferior con contenido arbitrario. */
export function sheet(html, setup) {
  const m = mount(html, 'sheet');
  setup?.(m.body, m.close);
  return m;
}
export function dialog(html, setup) {
  const m = mount(html, 'dialog');
  setup?.(m.body, m.close);
  return m;
}

export function confirmDialog({ title, text, action = 'Aceptar', danger = false, cancel = 'Cancelar' }) {
  return new Promise((res) => {
    const m = mount(`<h2>${esc(title)}</h2><p class="muted" style="margin:0;white-space:pre-line">${esc(text)}</p>
      <div class="actions"><button class="btn ghost" data-v="0">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : ''}" data-v="1">${esc(action)}</button></div>`, 'dialog', (v) => res(v === true));
    $$('button[data-v]', m.body).forEach((b) => b.addEventListener('click', () => m.close(b.dataset.v === '1')));
  });
}

export function alertDialog(title, text) {
  return new Promise((res) => {
    const m = mount(`<h2>${esc(title)}</h2><p class="muted" style="margin:0;white-space:pre-line">${esc(text)}</p><div class="actions"><button class="btn ghost" data-ok>Aceptar</button></div>`, 'dialog', () => res());
    $('[data-ok]', m.body).addEventListener('click', () => m.close());
  });
}

/** Menú de acciones: items = [{label, icon, danger, run}] */
export function menu(title, items) {
  const m = sheet(`${title ? `<h2>${esc(title)}</h2>` : ''}${items.map((it, i) => `<button class="menu-item ${it.danger ? 'danger' : ''}" data-i="${i}">${it.icon || ''}<span>${esc(it.label)}</span></button>`).join('')}`);
  $$('[data-i]', m.body).forEach((b) => b.addEventListener('click', () => { m.close(); items[Number(b.dataset.i)].run(); }));
}

/** Pide un texto o número en un diálogo. */
export function promptDialog({ title, label, value = '', type = 'text', inputmode, action = 'Guardar', hint = '', validate }) {
  return new Promise((res) => {
    const m = mount(`<h2>${esc(title)}</h2>${hint ? `<p class="muted small" style="margin:0 0 12px">${esc(hint)}</p>` : ''}
      <label class="field"><span>${esc(label)}</span><input class="input" type="${type}" ${inputmode ? `inputmode="${inputmode}"` : ''} value="${esc(value)}" autocomplete="off"></label>
      <div class="err hidden"></div>
      <div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn" data-ok>${esc(action)}</button></div>`, 'dialog', (v) => res(v ?? null));
    const inp = $('input', m.body), err = $('.err', m.body);
    $('[data-c]', m.body).addEventListener('click', () => m.close(null));
    const ok = () => {
      const e = validate?.(inp.value);
      if (e) { err.textContent = e; err.classList.remove('hidden'); return; }
      m.close(inp.value);
    };
    $('[data-ok]', m.body).addEventListener('click', ok);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
    setTimeout(() => inp.focus(), 80);
  });
}

let toastTimer;
export function toast(text, action, onAction) {
  const t = $('#toast');
  t.innerHTML = `<div><span>${esc(text)}</span>${action ? `<button>${esc(action)}</button>` : ''}</div>`;
  if (action) $('button', t).addEventListener('click', () => { t.innerHTML = ''; onAction?.(); });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.innerHTML = ''; }, action ? 5000 : 2600);
}

// ---------- gráficos ----------
/** Mapa de calor: semanas en columnas (lunes arriba). */
export function heatColor(score) {
  if (score == null) return null;
  const s = Math.max(0, Math.min(1, score));
  // de brasa tenue a lila a cian
  const stops = [[0, [58, 52, 100]], [0.5, [120, 100, 214]], [0.8, [183, 164, 255]], [1, [79, 224, 210]]];
  for (let i = 1; i < stops.length; i++) {
    if (s <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i], t = (s - a) / (b - a);
      return `rgb(${ca.map((v, k) => Math.round(v + (cb[k] - v) * t)).join(',')})`;
    }
  }
  return 'rgb(79,224,210)';
}

export function heatmap(arc, results, today, selected) {
  const first = arc.start - dow(arc.start);
  const cells = [];
  for (let d = first; d <= arc.end; d++) {
    const inArc = d >= arc.start;
    const r = results.find((x) => x.date === d);
    let cls = '', style = '';
    if (!inArc) cls = 'out';
    else if (d > today) cls = 'fut';
    else if (r?.score != null) style = `background:${heatColor(r.score)}`;
    if (d === selected) cls += ' sel';
    cells.push(`<i class="${cls}" style="${style}" ${inArc ? `data-day="${d}"` : ''}></i>`);
  }
  // rellenar hasta completar la última semana
  while (cells.length % 7) cells.push('<i class="out"></i>');
  return `<div class="heat">${cells.join('')}</div>`;
}

function scaleX(n, w, pad) { return (i) => pad + (n <= 1 ? 0 : (i / (n - 1)) * (w - pad * 2)); }

/** Línea doble: puntuación diaria + media móvil. */
export function lineChart(results, avgs) {
  const W = 340, H = 170, pad = 24, bottom = 20;
  const n = results.length;
  if (n < 2) return '<p class="muted small">Se necesitan al menos 2 días.</p>';
  const x = scaleX(n, W, pad), y = (v) => pad / 2 + (1 - v) * (H - pad / 2 - bottom);
  const dayPts = results.map((r, i) => (r.score == null ? null : [x(i), y(r.score)]));
  const path = (pts) => { let d = '', pen = false; for (const p of pts) { if (!p) { pen = false; continue; } d += `${pen ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`; pen = true; } return d; };
  const avgPts = avgs.map((v, i) => (v == null ? null : [x(i), y(v)]));
  const grid = [0, .5, 1].map((v) => `<line x1="${pad}" x2="${W - pad}" y1="${y(v)}" y2="${y(v)}" stroke="var(--outline-v)" stroke-dasharray="3 4"/><text x="${pad - 6}" y="${y(v) + 4}" text-anchor="end">${v * 100}</text>`).join('');
  const dots = dayPts.map((p) => (p ? `<circle cx="${p[0]}" cy="${p[1]}" r="2.2" fill="var(--outline)"/>` : '')).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${grid}${n <= 60 ? dots : ''}<path d="${path(dayPts)}" fill="none" stroke="var(--outline)" stroke-width="1" opacity=".5"/>
    <path d="${path(avgPts)}" fill="none" stroke="var(--primary)" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="legend"><i style="background:var(--outline)"></i>Día <i style="background:var(--primary);margin-left:10px"></i>Media 7 días</div>`;
}

export function barChart(weeks) {
  if (!weeks.length) return '';
  const W = 340, H = 150, pad = 20, bottom = 20;
  const bw = Math.min(26, (W - pad * 2) / weeks.length - 4);
  const step = (W - pad * 2) / weeks.length;
  const bars = weeks.map((w, i) => {
    const v = w.average ?? 0, h = v * (H - bottom - 10), cx = pad + step * i + step / 2;
    return `<rect x="${cx - bw / 2}" y="${H - bottom - h}" width="${bw}" height="${Math.max(2, h)}" rx="5" fill="${w.average == null ? 'var(--surface-hst)' : 'var(--primary)'}"/><text x="${cx}" y="${H - 5}" text-anchor="middle">S${i + 1}</text>${w.average != null ? `<text x="${cx}" y="${H - bottom - h - 4}" text-anchor="middle" style="fill:var(--text)">${Math.round(v * 100)}</text>` : ''}`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img"><line x1="${pad}" x2="${W - pad}" y1="${H - bottom}" y2="${H - bottom}" stroke="var(--outline-v)"/>${bars}</svg>`;
}

/** Serie genérica (fecha, valor) con ejes simples. */
export function seriesChart(points, { fmt = num, color = 'var(--primary)', zeroBase = false } = {}) {
  if (points.length < 1) return '';
  const W = 340, H = 170, pad = 30, bottom = 22;
  let min = Math.min(...points.map((p) => p[1])), max = Math.max(...points.map((p) => p[1]));
  if (zeroBase) min = Math.min(0, min);
  if (min === max) { min -= 1; max += 1; }
  const padv = (max - min) * 0.1; min -= zeroBase ? 0 : padv; max += padv;
  const d0 = points[0][0], d1 = points[points.length - 1][0], span = Math.max(1, d1 - d0);
  const x = (d) => pad + ((d - d0) / span) * (W - pad * 2) * (points.length > 1 ? 1 : 0) + (points.length > 1 ? 0 : (W - pad * 2) / 2);
  const y = (v) => 8 + (1 - (v - min) / (max - min)) * (H - 8 - bottom);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
  const ticks = [min, (min + max) / 2, max].map((v) => `<line x1="${pad}" x2="${W - pad}" y1="${y(v)}" y2="${y(v)}" stroke="var(--outline-v)" stroke-dasharray="3 4"/><text x="${pad - 5}" y="${y(v) + 4}" text-anchor="end">${esc(fmt(v))}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${ticks}<path d="${line}" fill="none" stroke="${color}" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/>
    ${points.map((p) => `<circle cx="${x(p[0])}" cy="${y(p[1])}" r="3" fill="${color}"/>`).join('')}
    <text x="${pad}" y="${H - 4}" text-anchor="start">${esc(fShort(d0))}</text><text x="${W - pad}" y="${H - 4}" text-anchor="end">${esc(fShort(d1))}</text></svg>`;
}
