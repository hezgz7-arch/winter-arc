// Pantallas «Progreso», detalle de hábito y resumen del arco.
import * as S from './store.js';
import * as D from './domain.js';
import { ACHIEVEMENTS, HABIT_COLORS, iconSvg } from './catalog.js';
import { $, $$, esc, ic, pct, num, qty, hhmm, fShort, fFull, heatmap, lineChart, barChart, seriesChart, weekdayName, sheet } from './ui.js';
import { requestDay } from './today.js';

function ctx() {
  const set = S.getState().settings, arc = S.activeArc(), clk = S.clock(), today = clk.today();
  if (!arc) return null;
  const habits = S.habitsOf(arc.id, true), idx = S.entryIndex();
  const stats = D.arcStats(habits, idx, arc, clk, today, set.streakThreshold, S.shieldedSet());
  return { set, arc, clk, today, habits, idx, stats };
}

export function render(root) {
  const c = ctx();
  if (!c) { root.innerHTML = '<div class="empty">No hay un arco activo.</div>'; return; }
  const { set, arc, today, stats, habits } = c;
  const core = S.coreSet();
  const ins = D.insights(arc, stats.results, stats, core, today);
  const cmp = stats.comparison;
  const en = D.energyAnalysis(stats.results, set.energy);

  let h = `<h1 style="font-size:26px;margin:4px 0 14px">Progreso</h1>
  <div class="kpis">
    <div class="kpi"><b>${pct(stats.completionRate)}</b><span>Cumplimiento medio</span></div>
    <div class="kpi"><b>${stats.streak.current}</b><span>Racha (mejor ${stats.streak.best})</span></div>
    <div class="kpi"><b>${stats.perfectDays}</b><span>Días perfectos</span></div>
    <div class="kpi"><b>${stats.daysRemaining}</b><span>Días restantes</span></div>
  </div>`;

  h += `<div class="card"><h3>Mapa del arco</h3>${heatmap(arc, stats.results, today, null)}<div class="muted small mt8">Toca un día para verlo o editarlo.</div></div>`;
  h += `<div class="card"><h3>Evolución</h3>${lineChart(stats.results, stats.movingAverage)}</div>`;
  if (stats.weeks.length) h += `<div class="card"><h3>Media por semana</h3>${barChart(stats.weeks)}</div>`;
  if (cmp.thisWeek != null) {
    const d = cmp.delta;
    h += `<div class="card"><h3>Esta semana vs la anterior</h3><div style="font-size:15px">${pct(cmp.thisWeek)}${cmp.lastWeek != null ? ` frente a ${pct(cmp.lastWeek)}` : ''}</div>
      ${d != null ? `<div class="small mt8" style="color:${d >= 0 ? 'var(--secondary)' : 'var(--error)'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(d * 100))} puntos</div>` : ''}</div>`;
  }

  // día de la semana
  const wd = ins.weekdays;
  h += `<div class="card"><h3>Tus días de la semana</h3>${wd.map((w) => `<div class="dow"><span class="n">${weekdayName(w.day).slice(0, 3)}</span><span class="b"><i class="${w.day === ins.bestWeekday ? 'best' : ''}" style="width:${(w.average ?? 0) * 100}%"></i></span><span class="v">${w.average == null ? '–' : pct(w.average)}</span></div>`).join('')}
    ${ins.bestWeekday != null ? `<p class="muted small mt8">Tu mejor día es el ${weekdayName(ins.bestWeekday).toLowerCase()}${ins.worstDay != null || ins.worstWeekday != null ? `; el más flojo, el ${weekdayName(ins.worstWeekday).toLowerCase()}` : ''}.</p>` : '<p class="muted small mt8">Hacen falta unas semanas de datos para ver patrones.</p>'}</div>`;

  if (en) h += `<div class="card"><h3>Energía y rendimiento</h3><p class="small" style="margin:0">Energía media ${num(Math.round(en.average * 10) / 10)}/5 en ${en.days} días.${en.high != null ? ` Con energía alta (4-5) cumples ${pct(en.high)}.` : ''}${en.low != null ? ` Con energía baja (1-2), ${pct(en.low)}.` : ''}</p></div>`;

  // ranking
  h += `<div class="card"><h3>Hábitos</h3>${stats.ranking.length ? stats.ranking.map((r) => `<button class="list-item" data-habit="${r.habit.id}">
      <span class="pick" style="border:0;background:none;padding:0;width:auto"><span class="ico" style="color:${HABIT_COLORS[r.habit.colorIndex % 8]}">${iconSvg(r.habit.iconKey, 20)}</span></span>
      <div class="grow"><b>${esc(r.habit.name)}</b><span class="d">${r.completedDays}/${r.includedDays} días</span></div><b style="color:var(--primary)">${pct(r.rate)}</b></button>`).join('') : '<div class="empty">Aún no hay datos.</div>'}</div>`;

  // logros
  h += `<div class="card"><h3>Logros</h3>${ins.achievements.map((a) => `<div class="ach ${a.unlocked ? 'unlocked' : ''}"><div class="t"><span>${a.unlocked ? '★ ' : ''}${esc(ACHIEVEMENTS[a.key])}</span><span>${Math.min(a.current, a.target)}/${a.target}</span></div><div class="bar"><i style="width:${a.fraction * 100}%"></i></div></div>`).join('')}</div>`;

  // revisión semanal
  h += `<div class="card tap" id="rev"><h3>Revisión semanal</h3><div class="muted small">Qué ha ido bien, qué ha fallado y qué cambias la semana que viene.</div></div>`;
  h += `<button class="btn tonal block mt12" id="sum">Resumen del arco</button>`;
  root.innerHTML = h;

  $$('[data-day]', root).forEach((e) => e.addEventListener('click', () => { requestDay(Math.min(Number(e.dataset.day), today) === today ? null : Number(e.dataset.day)); location.hash = '#/hoy'; }));
  $$('[data-habit]', root).forEach((e) => e.addEventListener('click', () => { location.hash = `#/habit/${e.dataset.habit}`; }));
  $('#rev', root).addEventListener('click', () => weeklyReview(arc, today));
  $('#sum', root).addEventListener('click', () => { location.hash = `#/summary/${arc.id}`; });
}

function weeklyReview(arc, today) {
  const ws = D.weekStart(Math.min(today, arc.end));
  const ex = S.getState().reviews.find((r) => r.arcId === arc.id && r.weekStart === ws) || {};
  sheet(`<h2>Revisión · semana del ${esc(fShort(ws))}</h2>
    <label class="field"><span>¿Qué ha ido bien?</span><textarea class="input" id="r1">${esc(ex.good || '')}</textarea></label>
    <label class="field"><span>¿Qué ha fallado?</span><textarea class="input" id="r2">${esc(ex.bad || '')}</textarea></label>
    <label class="field"><span>¿Qué cambias la próxima semana?</span><textarea class="input" id="r3">${esc(ex.change || '')}</textarea></label>
    <div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn" data-s>Guardar</button></div>`, (b, close) => {
    $('[data-c]', b).addEventListener('click', () => close());
    $('[data-s]', b).addEventListener('click', () => { S.saveReview(arc.id, ws, { good: $('#r1', b).value, bad: $('#r2', b).value, change: $('#r3', b).value }); close(); });
  });
}

export function renderHabit(root, id) {
  const c = ctx();
  const hb = S.getState().habits.find((x) => x.id === id);
  if (!c || !hb) { location.hash = '#/hoy'; return; }
  const det = D.habitDetail(hb, c.habits, c.idx, c.arc, c.clk, c.today);
  const color = HABIT_COLORS[hb.colorIndex % 8];
  const fmt = hb.type === 'HORA' ? (v) => hhmm(Math.round(v)) : (v) => num(Math.round(v * 10) / 10);
  let h = `<div class="top-bar"><button class="icon-btn" id="back" aria-label="Atrás">${ic.back}</button><h1>${esc(hb.name)}</h1></div>
  <div class="kpis">
    <div class="kpi"><b>${pct(det.rate)}</b><span>Cumplimiento</span></div>
    <div class="kpi"><b>${det.streak.current}</b><span>Racha (mejor ${det.streak.best})</span></div>
    <div class="kpi"><b>${det.completedDays}/${det.includedDays}</b><span>Días cumplidos</span></div>
    <div class="kpi"><b>${hb.type === 'EVITAR' ? D.cleanDays(hb, c.idx, c.arc, c.today) : hb.type === 'CANTIDAD' ? num(Math.round(det.total * 10) / 10) : det.loggedDays}</b><span>${hb.type === 'EVITAR' ? 'Días limpio' : hb.type === 'CANTIDAD' ? `Total${hb.unit ? ' (' + esc(hb.unit) + ')' : ''}` : 'Registros'}</span></div>
  </div>`;
  if (det.series.length) h += `<div class="card"><h3>Evolución</h3>${seriesChart(det.series, { fmt, color, zeroBase: hb.type === 'CANTIDAD' })}</div>`;
  else h += '<div class="empty">Sin registros todavía.</div>';
  // calendario del mes actual
  const first = Math.max(c.arc.start, D.weekStart(c.today) - 28);
  const cells = [];
  const byDate = new Map(det.statuses.map((s) => [s.date, s]));
  for (let d = first - D.dow(first); d <= Math.min(c.today, c.arc.end); d++) {
    const s = byDate.get(d);
    const cls = d < c.arc.start || !s || !s.included ? 'na' : s.completed ? 'ok' : s.fraction > 0 ? 'part' : 'miss';
    cells.push(`<div class="c ${cls}">${dayNum(d)}</div>`);
  }
  h += `<div class="card"><h3>Últimas semanas</h3><div class="cal">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((x) => `<div class="dn">${x}</div>`).join('')}${cells.join('')}</div></div>`;
  h += `<button class="btn outline block" id="edit">Editar hábito</button>`;
  root.innerHTML = h;
  $('#back', root).addEventListener('click', () => history.back());
  $('#edit', root).addEventListener('click', () => { location.hash = `#/editar/${hb.id}`; });
}
const dayNum = (d) => D.dayToDate(d).getUTCDate();

export function renderSummary(root, arcId) {
  const st = S.getState(), arc = st.arcs.find((a) => a.id === arcId);
  if (!arc) { location.hash = '#/hoy'; return; }
  const clk = S.clock(), today = clk.today(), habits = S.habitsOf(arc.id, true);
  const stats = D.arcStats(habits, S.entryIndex(), arc, clk, today, st.settings.streakThreshold, S.shieldedSet());
  const top = stats.ranking.slice(0, 3), low = stats.ranking.slice(-2).reverse();
  root.innerHTML = `<div class="top-bar"><button class="icon-btn" id="back" aria-label="Atrás">${ic.back}</button><h1>${esc(arc.name)}</h1></div>
    <div class="muted small" style="margin:0 4px 14px">${esc(fFull(arc.start))} – ${esc(fFull(arc.end))}</div>
    <div class="kpis">
      <div class="kpi"><b>${pct(stats.completionRate)}</b><span>Cumplimiento medio</span></div>
      <div class="kpi"><b>${stats.streak.best}</b><span>Mejor racha</span></div>
      <div class="kpi"><b>${stats.perfectDays}</b><span>Días perfectos</span></div>
      <div class="kpi"><b>${stats.daysElapsed}/${D.arcTotalDays(arc)}</b><span>Días transcurridos</span></div>
    </div>
    <div class="card"><h3>Evolución</h3>${lineChart(stats.results, stats.movingAverage)}</div>
    ${top.length ? `<div class="card"><h3>Tus hábitos más sólidos</h3>${top.map((r) => `<div class="dow"><span class="n" style="width:auto;flex:1">${esc(r.habit.name)}</span><span class="v">${pct(r.rate)}</span></div>`).join('')}</div>` : ''}
    ${low.length > 1 ? `<div class="card"><h3>Los que más cuesta mantener</h3>${low.map((r) => `<div class="dow"><span class="n" style="width:auto;flex:1">${esc(r.habit.name)}</span><span class="v">${pct(r.rate)}</span></div>`).join('')}</div>` : ''}`;
  $('#back', root).addEventListener('click', () => history.back());
}
