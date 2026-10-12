// Pantalla «Hoy».
import * as S from './store.js';
import * as D from './domain.js';
import { HABIT_COLORS, iconSvg } from './catalog.js';
import { $, $$, esc, ic, ring, pct, qty, hhmm, parseHhmm, fLong, fShort, num, toast, menu, sheet, dialog, promptDialog, vibrate } from './ui.js';

let selDay = null; // null = hoy (sigue al día lógico actual)
let focusTimer = null;
export const requestDay = (d) => { selDay = d; };
export const stopTimers = () => { clearInterval(focusTimer); focusTimer = null; };

const PHASES = {
  FOUNDATION: ['Fase 1 · Fundación', 'Instala las reglas. Lo importante es no fallar dos días seguidos, no la perfección.'],
  ESCALATION: ['Fase 2 · Escalada', 'Sube la exigencia poco a poco. Si un día se tuerce, cumple al menos tus innegociables.'],
  CONSOLIDATION: ['Fase 3 · Consolidación', 'Mantén el sistema y protege lo ganado. Ya eres quien dijiste que serías.'],
};
const MOMENT_ORDER = [['MORNING', 'Mañana'], ['DAY', 'Día'], ['NIGHT', 'Noche']];

function subtitle(s) {
  const h = s.habit, e = s.entry;
  switch (h.type) {
    case 'CHECK': return s.completed ? 'hecho' : 'Un toque para marcar';
    case 'SEMANAL': return `${Math.floor(s.weeklyProgress)} / ${h.weeklyTarget} esta semana`;
    case 'EVITAR': return e?.failed ? 'Has fallado hoy' : 'Sin fallos';
    case 'HORA': {
      const rule = `${h.timeMode === 'BEFORE' ? 'antes de las' : 'después de las'} ${hhmm(h.timeLimitMinutes)}`;
      return e?.timeMinutes != null ? `Registrado a las ${hhmm(e.timeMinutes)} · ${rule}` : rule;
    }
    default: {
      if (h.weeklyTotal) return `${qty(s.weeklyProgress, h.unit)} / ${qty(h.target, h.unit)} esta semana`;
      const v = e?.value ?? 0;
      return h.inverse ? `${qty(v, h.unit)} (máx. ${qty(h.target, h.unit)})` : `${qty(v, h.unit)} / ${qty(h.target, h.unit)}`;
    }
  }
}

function tapperIcon(s) {
  const h = s.habit;
  if (h.type === 'EVITAR' && s.entry?.failed) return ic.x;
  if (s.completed) return ic.check;
  if (h.type === 'CANTIDAD') return ic.plus;
  if (h.type === 'HORA') return ic.clock;
  return ic.check;
}

function habitRow(s, locked, core) {
  const h = s.habit, color = HABIT_COLORS[h.colorIndex % HABIT_COLORS.length];
  const failed = h.type === 'EVITAR' && s.entry?.failed;
  const partial = h.type === 'CANTIDAD' && !s.completed && s.fraction > 0;
  const off = !s.included;
  const sub = off ? 'No cuenta hoy' : subtitle(s);
  return `<div class="habit ${s.completed ? 'done' : ''} ${off ? 'off' : ''}" style="--hc:${color}" data-habit="${h.id}">
    <div class="ico" data-open="${h.id}">${iconSvg(h.iconKey, 22)}</div>
    <div class="grow" data-open="${h.id}"><div class="name">${esc(h.name)}${core ? '<span class="star">★</span>' : ''}</div><div class="sub">${esc(sub)}</div></div>
    <button class="tapper ${failed ? 'fail' : ''}" data-tap="${h.id}" ${locked ? 'disabled style="opacity:.4"' : ''} aria-label="${esc(h.name)}">
      ${partial ? ring(s.fraction, 56, 4, false, color).replace('<svg', '<svg class="pr"') : ''}${tapperIcon(s)}</button>
    <button class="more" data-more="${h.id}" aria-label="Más opciones">${ic.more}</button>
  </div>`;
}

export function render(root) {
  stopTimers();
  const st = S.getState(), set = st.settings, arc = S.activeArc(), clk = S.clock(), today = clk.today();
  if (!arc) { root.innerHTML = '<div class="empty">No hay un arco activo.</div>'; return; }
  const day = selDay ?? today;
  const habits = S.habitsOf(arc.id, true);
  const idx = S.entryIndex();
  const shielded = S.shieldedSet(), core = S.coreSet();
  const stats = D.arcStats(habits, idx, arc, clk, today, set.streakThreshold, shielded);
  const result = D.evaluateDay(habits, idx, day, arc, clk, today);
  const isToday = day === today;
  const lockedDay = set.editWindowDays >= 0 && today - day > set.editWindowDays;
  const dn = D.arcDayNumber(arc, day), total = D.arcTotalDays(arc);
  const arcFrac = Math.min(1, Math.max(0, D.arcDayNumber(arc, Math.min(Math.max(today, arc.start), arc.end)) / total));
  const finished = today > arc.end;
  const [phaseName, phaseTip] = PHASES[D.phase(arc, Math.min(Math.max(day, arc.start), arc.end))];
  const shown = result.statuses.filter((s) => D.appliesOn(s.habit, day));
  const visible = shown.filter((s) => !(set.hideCompleted && s.completed));

  let h = `<div class="hero">
    <div class="row between">
      <div class="grow">
        <h1>${arc.start <= day && day <= arc.end ? `Día ${dn}/${total}` : esc(arc.name)}</h1>
        <div class="sub">${esc(fLong(day))}</div>
        <div class="streak ${stats.streak.atRisk ? 'risk' : ''}" title="${stats.streak.atRisk ? 'Racha en peligro hoy' : 'Racha actual'}">${ic.flame} ${stats.streak.current}</div>
      </div>
      <div class="ring-wrap">${ring(result.score ?? 0)}<div class="ring-label">${result.score == null ? '–' : pct(result.score)}</div></div>
    </div>
    <div class="bar mt12"><i style="width:${arcFrac * 100}%"></i></div>
  </div>
  <div class="daynav">
    <button class="icon-btn" data-day="-1" aria-label="Día anterior" ${day <= arc.start - 0 && false ? 'disabled' : ''}>${ic.left}</button>
    <button class="label" data-day="today">${isToday ? 'Hoy' : esc(fShort(day))}</button>
    <button class="icon-btn" data-day="1" aria-label="Día siguiente" ${day >= today ? 'disabled' : ''}>${ic.right}</button>
  </div>`;

  if (finished) h += `<div class="card warm tap" data-go="#/summary/${arc.id}"><b>Tu arco ha terminado</b><div class="small mt8">Ver resumen</div></div>`;
  if (!isToday) h += `<div class="card outlined small muted">${lockedDay ? 'Este día ya no se puede editar (límite configurado en Ajustes)' : 'Estás viendo un día anterior'}</div>`;

  // pacto
  const pactBody = set.why || set.identity
    ? `${set.identity ? `<div style="font-weight:700;font-size:16px">Soy alguien que ${esc(set.identity)}</div>` : ''}${set.why ? `<div class="muted small mt8">${esc(set.why)}</div>` : ''}`
    : `<div style="font-weight:700;font-size:16px;color:var(--text-mid)">Escribe tu porqué</div><div class="muted small mt8">Un motivo claro y la identidad que quieres construir te sostienen cuando falla la motivación.</div>`;
  h += `<div class="card pact tap" data-pact><div class="small" style="color:var(--secondary);font-weight:700;margin-bottom:6px">${phaseName}</div>${pactBody}<div class="muted small mt8">${esc(phaseTip)}</div></div>`;

  // enfoque
  h += `<div class="card tap" id="focus-card"></div>`;

  // energía
  if (isToday || set.energy[day] != null) {
    h += `<div class="card"><div style="font-weight:600">¿Cómo de enérgico te sientes hoy?</div><div class="energy">${[1, 2, 3, 4, 5].map((n) => `<button data-en="${n}" class="${set.energy[day] === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>`;
  }

  // atajos
  const coreInDay = result.statuses.filter((s) => s.included && core.has(s.habit.id));
  const solid = D.isSolid(result, core);
  h += `<div class="row between" style="margin:6px 4px"><span class="muted small grow">${core.size === 0 ? 'Marca con ★ tus innegociables (menú ⋮ de cada hábito): tu día mínimo' : solid === true ? '★ Día mínimo cumplido: el día cuenta' : solid === false ? '★ Faltan innegociables para el día mínimo' : ''}</span>
    <button class="link" id="hide-done">${set.hideCompleted ? 'Mostrar todos' : 'Ocultar hechos'}</button></div>`;

  // comodín
  if (arc.start <= day && day <= arc.end) {
    const left = D.shieldsLeft(arc, shielded, set.shieldsPerArc);
    if (shielded.has(day)) h += `<div class="card warm row between"><span>Día salvado con comodín: no rompe tu racha.</span><button class="link" data-shield="off">Quitar</button></div>`;
    else if (D.canShield(result, set.streakThreshold, today, shielded, left)) h += `<div class="card warm"><div>Este día no llegó al umbral. Un comodín protege tu racha (te quedan ${left}).</div><button class="btn tonal mt12" data-shield="on">Usar comodín</button></div>`;
  }

  if (!shown.length) h += `<div class="empty">Este arco no tiene hábitos. Añade alguno en Ajustes › Hábitos.</div>`;
  for (const [key, label] of MOMENT_ORDER) {
    const g = visible.filter((s) => s.habit.moment === key);
    const all = shown.filter((s) => s.habit.moment === key);
    if (!all.length) continue;
    const pending = all.filter((s) => s.included && !s.completed).length;
    h += `<div class="group-head"><span>${label}</span><span>${pending ? `${pending} pendientes` : 'Todo hecho'}</span></div>`;
    h += g.map((s) => habitRow(s, lockedDay, core.has(s.habit.id))).join('');
  }

  // nota
  h += `<div class="card mt16"><h3>Nota del día</h3><textarea class="input" id="note" placeholder="Cómo ha ido el día, qué has notado…" ${lockedDay ? 'disabled' : ''}>${esc(st.notes[day] || '')}</textarea></div>`;
  root.innerHTML = h;

  // ----- eventos -----
  const go = (hash) => { location.hash = hash; };
  $$('[data-go]', root).forEach((e) => e.addEventListener('click', () => go(e.dataset.go)));
  $$('[data-day]', root).forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.day;
    if (v === 'today') selDay = null; else { const nd = day + Number(v); selDay = nd >= today ? null : Math.max(arc.start - 30, nd); }
    S.commit();
  }));
  $('[data-pact]', root).addEventListener('click', editPact);
  $$('[data-en]', root).forEach((b) => b.addEventListener('click', () => { const n = Number(b.dataset.en); S.setEnergy(day, set.energy[day] === n ? null : n); vibrate(); }));
  $('#hide-done', root).addEventListener('click', () => S.setSetting({ hideCompleted: !set.hideCompleted }));
  $$('[data-shield]', root).forEach((b) => b.addEventListener('click', () => S.toggleShield(day, b.dataset.shield === 'on')));
  $$('[data-open]', root).forEach((b) => b.addEventListener('click', () => go(`#/habit/${b.dataset.open}`)));
  $$('[data-tap]', root).forEach((b) => b.addEventListener('click', () => {
    if (lockedDay) return;
    const hb = habits.find((x) => x.id === Number(b.dataset.tap));
    S.applyAction(hb, day, { kind: 'tap', nowMinutes: clk.clockMinutes() });
    vibrate();
    maybeCelebrate(arc, day, today);
  }));
  $$('[data-more]', root).forEach((b) => b.addEventListener('click', () => habitMenu(habits.find((x) => x.id === Number(b.dataset.more)), day, lockedDay, core)));
  const note = $('#note', root);
  note.addEventListener('change', () => S.setNote(day, note.value));
  note.addEventListener('blur', () => { if (note.value !== (S.getState().notes[day] || '')) S.setNote(day, note.value); });
  setupFocusCard(root, habits, day);
}

function habitMenu(h, day, locked, core) {
  const items = [{ label: `Ver detalle de ${h.name}`, run: () => { location.hash = `#/habit/${h.id}`; } }];
  if (!locked) {
    if (h.type === 'CANTIDAD') items.push({ label: 'Valor exacto', run: () => exactValue(h, day) });
    if (h.type === 'HORA') items.push({ label: 'Hora exacta', run: () => exactTime(h, day) });
    items.push({ label: 'Quitar registro', run: () => { S.applyAction(h, day, { kind: 'clear' }); toast(`Registro de ${h.name} eliminado`); } });
  }
  items.push({ label: core.has(h.id) ? 'Quitar de innegociables' : 'Marcar como innegociable', run: () => S.toggleCore(h.id, !core.has(h.id)) });
  menu(h.name, items);
}

async function exactValue(h, day) {
  const cur = S.getState().entries[h.id]?.[day]?.value ?? 0;
  const v = await promptDialog({ title: h.name, label: `Valor exacto${h.unit ? ' (' + h.unit + ')' : ''}`, value: String(cur || ''), inputmode: 'decimal', validate: (x) => (isNaN(Number(String(x).replace(',', '.'))) || String(x).trim() === '' || Number(String(x).replace(',', '.')) < 0 ? 'Introduce un número válido' : '') });
  if (v == null) return;
  S.applyAction(h, day, { kind: 'value', value: Number(String(v).replace(',', '.')) });
}
async function exactTime(h, day) {
  const cur = S.getState().entries[h.id]?.[day]?.timeMinutes;
  const v = await promptDialog({ title: h.name, label: 'Hora exacta', type: 'time', value: cur != null ? hhmm(cur) : hhmm(S.clock().clockMinutes()), validate: (x) => (x ? '' : 'Elige una hora') });
  if (v == null) return;
  S.applyAction(h, day, { kind: 'time', minutes: parseHhmm(v) });
}

async function editPact() {
  const set = S.getState().settings;
  sheet(`<h2>Tu pacto</h2><p class="muted small" style="margin:0 0 14px">Elige pocas reglas, hazlas medibles y no las renegocies a mitad de reto. Este texto lo ves cada día en Hoy.</p>
    <label class="field"><span>Soy alguien que…</span><input class="input" id="p-id" value="${esc(set.identity)}" placeholder="entrena y estudia aunque no le apetezca"></label>
    <label class="field"><span>Mi porqué</span><textarea class="input" id="p-why" placeholder="Por qué haces este reto y qué quieres tener el 31 de diciembre">${esc(set.why)}</textarea></label>
    <div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn" data-s>Guardar</button></div>`, (b, close) => {
    $('[data-c]', b).addEventListener('click', () => close());
    $('[data-s]', b).addEventListener('click', () => { S.setSetting({ identity: $('#p-id', b).value.trim(), why: $('#p-why', b).value.trim() }); close(); });
  });
}

function maybeCelebrate(arc, day, today) {
  if (day !== today) return;
  const set = S.getState().settings;
  if (set.lastCelebratedDay === today) return;
  const r = D.evaluateDay(S.habitsOf(arc.id, true), S.entryIndex(), day, arc, S.clock(), today);
  if (!r.isPerfect) return;
  S.setSetting({ lastCelebratedDay: today });
  const el = document.createElement('div');
  el.className = 'celebrate';
  el.innerHTML = `<div class="box"><div style="font-size:54px">❄️</div><h2>¡Día perfecto!</h2><p class="muted">Has cumplido todos tus hábitos de hoy</p></div>`;
  document.body.appendChild(el);
  vibrate([30, 40, 60]);
  const rm = () => el.remove();
  el.addEventListener('click', rm); setTimeout(rm, 2600);
}

// ---------- modo enfoque ----------
function setupFocusCard(root, habits, day) {
  const card = $('#focus-card', root);
  const set = S.getState().settings;
  const paint = () => {
    const f = S.getState().settings.focus;
    if (f) {
      const left = Math.max(0, f.start + f.minutes * 60000 - Date.now());
      const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
      card.innerHTML = `<div style="font-weight:700">Modo enfoque</div><div class="muted small mt8">${left > 0 ? `En marcha: ${mm}:${String(ss).padStart(2, '0')}` : '¡Bloque completado!'}</div>`;
    } else card.innerHTML = `<div style="font-weight:700">Modo enfoque</div><div class="muted small mt8">Temporiza un bloque y suma los minutos a tu hábito</div>`;
  };
  paint();
  if (set.focus) focusTimer = setInterval(paint, 1000);
  card.addEventListener('click', () => openFocus(habits, day));
}

export function openFocus(habits, day) {
  const set = S.getState().settings;
  const arc = S.activeArc();
  habits = habits || S.habitsOf(arc.id, true);
  day = day ?? S.today();
  const f = set.focus;
  let tick = null;
  const m = sheet('', null);
  const done = () => { clearInterval(tick); m.close(); };
  m.el.querySelector('.scrim').addEventListener('click', () => clearInterval(tick));
  if (!f) {
    const el = D.focusEligible(habits);
    if (!el.length) { m.body.innerHTML = `<h2>Modo enfoque</h2><p class="muted">Necesitas un hábito de cantidad medido en minutos u horas (por ejemplo, Estudio en h).</p><div class="actions"><button class="btn ghost" data-x>Cerrar</button></div>`; $('[data-x]', m.body).addEventListener('click', done); return; }
    m.body.innerHTML = `<h2>Modo enfoque</h2>
      <label class="field"><span>Hábito</span><select class="input" id="fh">${el.map((h) => `<option value="${h.id}">${esc(h.name)}</option>`).join('')}</select></label>
      <div class="field"><span style="display:block;font-size:13px;color:var(--text-mid);margin:0 4px 6px;font-weight:600">Minutos</span><div class="chips" id="fm">${[15, 25, 45, 60, 90].map((n) => `<button class="chip ${n === set.focusMinutes ? 'on' : ''}" data-m="${n}">${n}</button>`).join('')}</div></div>
      <p class="muted small">El tiempo sigue contando aunque cierres la app.</p>
      <div class="actions"><button class="btn ghost" data-x>Cancelar</button><button class="btn" data-go>Empezar</button></div>`;
    let mins = set.focusMinutes;
    $$('[data-m]', m.body).forEach((b) => b.addEventListener('click', () => { mins = Number(b.dataset.m); $$('[data-m]', m.body).forEach((x) => x.classList.toggle('on', x === b)); }));
    $('[data-x]', m.body).addEventListener('click', done);
    $('[data-go]', m.body).addEventListener('click', () => { S.setSetting({ focus: { habitId: Number($('#fh', m.body).value), start: Date.now(), minutes: mins }, focusMinutes: mins }); done(); });
    return;
  }
  const hb = habits.find((x) => x.id === f.habitId);
  const paint = () => {
    const now = Date.now(), left = Math.max(0, f.start + f.minutes * 60000 - now), logged = D.focusLogged(f.start, now, f.minutes);
    const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
    m.body.innerHTML = `<h2>${left > 0 ? 'Modo enfoque' : '¡Bloque completado!'}</h2><div class="muted" style="text-align:center">${esc(hb?.name || '')}</div>
      <div class="focus-time">${left > 0 ? `${mm}:${String(ss).padStart(2, '0')}` : '✓'}</div>
      <p class="muted small" style="text-align:center">${logged} min enfocados</p>
      <div class="actions"><button class="btn ghost" data-d>Descartar</button><button class="btn" data-l ${logged < 1 ? 'disabled' : ''}>Registrar ${logged} min</button></div>`;
    $('[data-d]', m.body).addEventListener('click', () => { S.setSetting({ focus: null }); done(); });
    $('[data-l]', m.body)?.addEventListener('click', () => {
      if (hb) { const add = D.focusValuePerMinute(hb) * logged; const cur = S.getState().entries[hb.id]?.[day]?.value ?? 0; S.applyAction(hb, day, { kind: 'value', value: Math.round((cur + add) * 1000) / 1000 }); }
      S.setSetting({ focus: null }); done(); toast(`${logged} min sumados a ${hb?.name}`);
    });
  };
  paint();
  tick = setInterval(() => { if (!document.body.contains(m.body)) { clearInterval(tick); return; } paint(); }, 1000);
}
