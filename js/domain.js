// Puerto de la lógica de dominio de Winter Arc (Kotlin → JS).
// Las fechas son enteros «epochDay» (días desde 1970-01-01, hora local).

export const HabitType = { CHECK: 'CHECK', CANTIDAD: 'CANTIDAD', HORA: 'HORA', EVITAR: 'EVITAR', SEMANAL: 'SEMANAL' };

// ---------- fechas ----------
export const dayToDate = (d) => new Date(d * 86400000); // en UTC
export const dateToDay = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);
export const parseIso = (s) => { const [y, m, d] = s.split('-').map(Number); return dateToDay(y, m, d); };
export const toIso = (d) => dayToDate(d).toISOString().slice(0, 10);
export const dow = (d) => (((d + 3) % 7) + 7) % 7; // 0 = lunes … 6 = domingo
export const weekStart = (d) => d - dow(d);

/** Reloj de «día lógico»: lo registrado antes de la hora de cambio cuenta como el día anterior. */
export class DayClock {
  constructor(rolloverMinutes = 180) { this.rollover = rolloverMinutes; }
  /** Día lógico de un instante (ms). */
  logicalDay(ms = Date.now()) {
    const local = ms - new Date(ms).getTimezoneOffset() * 60000;
    return Math.floor((local - this.rollover * 60000) / 86400000);
  }
  today(ms = Date.now()) { return this.logicalDay(ms); }
  clockMinutes(ms = Date.now()) { const t = new Date(ms); return t.getHours() * 60 + t.getMinutes(); }
  normalize(m) { return m < this.rollover ? m + 1440 : m; }
}

// ---------- arco ----------
export const arcTotalDays = (arc) => arc.end - arc.start + 1;
export const arcContains = (arc, d) => d >= arc.start && d <= arc.end;
export const arcDayNumber = (arc, d) => d - arc.start + 1;

// ---------- hábito ----------
export const isWeekly = (h) => h.type === HabitType.SEMANAL || (h.type === HabitType.CANTIDAD && h.weeklyTotal);
export const appliesOn = (h, d) => d >= h.activeFrom && (h.archivedOn == null || d < h.archivedOn);

// ---------- índice de registros ----------
export class EntryIndex {
  constructor(entries) { this.map = entries || {}; }
  get(habitId, day) { return this.map[habitId]?.[day] ?? null; }
  forHabit(habitId) { return this.map[habitId] ?? {}; }
}

// ---------- acciones sobre un registro ----------
const roundTo = (v) => Math.round(v * 1000) / 1000;

export function applyEntryAction(habit, current, action) {
  const base = current ? { ...current } : { value: 0, timeMinutes: null, failed: false };
  let r;
  switch (action.kind) {
    case 'clear': r = null; break;
    case 'value': r = { ...base, value: Math.max(0, action.value) }; break;
    case 'time': r = { ...base, timeMinutes: Math.min(1439, Math.max(0, action.minutes)) }; break;
    case 'tap':
      switch (habit.type) {
        case HabitType.CHECK: case HabitType.SEMANAL: r = { ...base, value: base.value > 0 ? 0 : 1 }; break;
        case HabitType.EVITAR: r = { ...base, failed: !base.failed }; break;
        case HabitType.HORA: r = { ...base, timeMinutes: base.timeMinutes != null ? null : Math.min(1439, Math.max(0, action.nowMinutes)) }; break;
        default: r = { ...base, value: roundTo(base.value + habit.increment) };
      }
      break;
    default: r = null;
  }
  if (!r) return null;
  const empty =
    (habit.type === HabitType.CHECK || habit.type === HabitType.SEMANAL) ? r.value <= 0 :
    habit.type === HabitType.CANTIDAD ? (!habit.inverse && r.value <= 0) :
    habit.type === HabitType.HORA ? r.timeMinutes == null :
    !r.failed;
  return empty ? null : r;
}

// ---------- evaluación ----------
export function meetsTime(habit, minutes, clock) {
  const logged = clock.normalize(minutes);
  const limit = clock.normalize(habit.timeLimitMinutes);
  return habit.timeMode === 'BEFORE' ? logged <= limit : logged >= limit;
}

function quantityFraction(h, e) {
  if (!e) return 0;
  if (h.inverse) return e.value <= h.target ? 1 : 0;
  if (h.target <= 0) return e.value > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, e.value / h.target));
}

function dailyStatus(h, date, clock, entry) {
  let f;
  switch (h.type) {
    case HabitType.CHECK: case HabitType.SEMANAL: f = (entry?.value ?? 0) > 0 ? 1 : 0; break;
    case HabitType.CANTIDAD: f = quantityFraction(h, entry); break;
    case HabitType.HORA: f = entry?.timeMinutes != null && meetsTime(h, entry.timeMinutes, clock) ? 1 : 0; break;
    default: f = entry?.failed ? 0 : 1;
  }
  return { habit: h, date, included: true, fraction: f, completed: f >= 1, entry, weeklyProgress: 0, weeklyGoal: 0 };
}

function weeklyStatus(h, entries, date, arc, entry) {
  const ws = weekStart(date);
  const from = Math.max(ws, arc.start, h.activeFrom);
  const to = Math.min(ws + 6, arc.end);
  const isQ = h.type === HabitType.CANTIDAD;
  const goal = isQ ? h.target : h.weeklyTarget;
  let before = 0;
  for (let d = from; d < date; d++) {
    const v = entries.get(h.id, d)?.value ?? 0;
    before += isQ ? v : (v > 0 ? 1 : 0);
  }
  const todayValue = entry?.value ?? 0;
  const logged = todayValue > 0;
  const progress = before + (isQ ? todayValue : logged ? 1 : 0);
  let included, fraction = 0;
  if (logged) { included = true; fraction = 1; }
  else if (before >= goal) { included = false; }
  else {
    const remaining = to - date + 1;
    included = isQ ? date === to : remaining <= goal - before;
  }
  return { habit: h, date, included, fraction, completed: included && fraction >= 1, entry, weeklyProgress: progress, weeklyGoal: goal };
}

export function habitStatus(h, entries, date, arc, clock) {
  const entry = entries.get(h.id, date);
  if (!appliesOn(h, date)) return { habit: h, date, included: false, fraction: 0, completed: false, entry, weeklyProgress: 0, weeklyGoal: 0 };
  return isWeekly(h) ? weeklyStatus(h, entries, date, arc, entry) : dailyStatus(h, date, clock, entry);
}

export function dayResultMetrics(r) {
  r.includedCount = r.statuses.filter((s) => s.included).length;
  r.completedCount = r.statuses.filter((s) => s.included && s.completed).length;
  r.pendingCount = r.includedCount - r.completedCount;
  r.isPerfect = r.score != null && r.includedCount > 0 && r.completedCount === r.includedCount;
  return r;
}

export function evaluateDay(habits, entries, date, arc, clock, today) {
  const statuses = habits.map((h) => habitStatus(h, entries, date, arc, clock));
  const mk = (score) => dayResultMetrics({ date, score, statuses });
  if (!arcContains(arc, date) || date > today) return mk(null);
  const inc = statuses.filter((s) => s.included);
  const totalW = inc.reduce((a, s) => a + s.habit.weight, 0);
  if (!inc.length || totalW <= 0) return mk(null);
  const score = inc.reduce((a, s) => a + s.habit.weight * s.fraction, 0) / totalW;
  return mk(Math.min(1, Math.max(0, score)));
}

export function evaluateArc(habits, entries, arc, clock, today) {
  const last = Math.min(today, arc.end);
  const out = [];
  for (let d = arc.start; d <= last; d++) out.push(evaluateDay(habits, entries, d, arc, clock, today));
  return out;
}

// ---------- rachas ----------
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

function computeStreak(days, today) {
  let run = 0, best = 0, atRisk = false;
  for (const d of days) {
    if (!d.counts) continue;
    if (d.meets) { run++; if (run > best) best = run; }
    else if (d.date === today) atRisk = run > 0;
    else run = 0;
  }
  return { current: run, best, atRisk };
}

export function globalStreak(results, threshold, today, shielded = new Set()) {
  return computeStreak(results.map((r) => {
    const meets = r.score != null && r.score >= threshold;
    return { date: r.date, counts: r.score != null && (meets || !shielded.has(r.date)), meets };
  }), today);
}

export const habitStreak = (statuses, today) =>
  computeStreak(statuses.map((s) => ({ date: s.date, counts: s.included, meets: s.included && s.completed })), today);

// ---------- estadísticas ----------
export function arcStats(habits, entries, arc, clock, today, threshold, shielded = new Set()) {
  const results = evaluateArc(habits, entries, arc, clock, today);
  const scored = results.map((r) => r.score).filter((s) => s != null);
  const daysElapsed = today < arc.start ? 0 : today > arc.end ? arcTotalDays(arc) : arcDayNumber(arc, today);
  const daysRemaining = today < arc.start ? arcTotalDays(arc) : today > arc.end ? 0 : arc.end - today;
  return {
    results,
    completionRate: scored.length ? avg(scored) : 0,
    perfectDays: results.filter((r) => r.isPerfect).length,
    streak: globalStreak(results, threshold, today, shielded),
    daysElapsed, daysRemaining,
    movingAverage: movingAverage(results, 7),
    weeks: weekStats(results),
    ranking: ranking(habits, results),
    comparison: comparison(results, today),
  };
}

export function movingAverage(results, window) {
  return results.map((_, i) => {
    const s = results.slice(Math.max(0, i - window + 1), i + 1).map((r) => r.score).filter((x) => x != null);
    return s.length ? avg(s) : null;
  });
}

export function weekStats(results) {
  const groups = new Map();
  for (const r of results) {
    const k = weekStart(r.date);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  return [...groups.keys()].sort((a, b) => a - b).map((k) => {
    const days = groups.get(k);
    const sc = days.map((r) => r.score).filter((s) => s != null);
    return { weekStart: k, average: sc.length ? avg(sc) : null, days: days.length };
  });
}

export function ranking(habits, results) {
  const out = [];
  for (const habit of habits) {
    const st = results.map((r) => r.statuses.find((s) => s.habit.id === habit.id)).filter((s) => s && s.included);
    if (!st.length) continue;
    out.push({ habit, rate: st.reduce((a, s) => a + s.fraction, 0) / st.length, includedDays: st.length, completedDays: st.filter((s) => s.completed).length });
  }
  return out.sort((a, b) => b.rate - a.rate);
}

export function comparison(results, today) {
  const ts = weekStart(today), ls = ts - 7;
  const a = (s) => { const x = results.filter((r) => r.date >= s && r.date < s + 7).map((r) => r.score).filter((v) => v != null); return x.length ? avg(x) : null; };
  const thisWeek = a(ts), lastWeek = a(ls);
  return { thisWeek, lastWeek, delta: thisWeek != null && lastWeek != null ? thisWeek - lastWeek : null };
}

export function habitDetail(habit, habits, entries, arc, clock, today) {
  const results = evaluateArc(habits, entries, arc, clock, today);
  const statuses = results.map((r) => r.statuses.find((s) => s.habit.id === habit.id)).filter(Boolean);
  const included = statuses.filter((s) => s.included);
  const own = Object.entries(entries.forHabit(habit.id))
    .map(([d, e]) => [Number(d), e])
    .filter(([d]) => arcContains(arc, d) && d <= today && appliesOn(habit, d));
  const series = own.sort((a, b) => a[0] - b[0]).map(([d, e]) => {
    let m;
    switch (habit.type) {
      case HabitType.CANTIDAD: m = e.value; break;
      case HabitType.HORA: m = e.timeMinutes; break;
      case HabitType.EVITAR: m = e.failed ? 0 : 1; break;
      default: m = e.value > 0 ? 1 : 0;
    }
    return m == null ? null : [d, m];
  }).filter(Boolean);
  const quantity = habit.type === HabitType.CANTIDAD;
  const valued = own.map(([, e]) => e).filter((e) => e.value > 0);
  const total = quantity ? valued.reduce((a, e) => a + e.value, 0) : valued.length;
  const average = valued.length && quantity ? total / valued.length : 0;
  return {
    habit, statuses, streak: habitStreak(statuses, today),
    rate: included.length ? included.reduce((a, s) => a + s.fraction, 0) / included.length : 0,
    includedDays: included.length, completedDays: included.filter((s) => s.completed).length,
    total, average, loggedDays: valued.length, series,
  };
}

export function cleanDays(habit, entries, arc, today) {
  const last = Math.min(today, arc.end);
  const start = Math.max(arc.start, habit.activeFrom);
  if (last < start) return 0;
  const fails = Object.entries(entries.forHabit(habit.id)).filter(([, e]) => e.failed).map(([d]) => Number(d)).filter((d) => d <= last && d >= start);
  const lastFail = fails.length ? Math.max(...fails) : null;
  const from = lastFail != null ? lastFail + 1 : start;
  return Math.max(0, last - from + 1);
}

// ---------- coach ----------
export function phase(arc, date) {
  const n = Math.max(1, arcDayNumber(arc, date));
  const third = arcTotalDays(arc) / 3;
  return n <= third ? 'FOUNDATION' : n <= 2 * third ? 'ESCALATION' : 'CONSOLIDATION';
}
export const rulesLocked = (arc, today, grace = 3) => today >= arc.start && arcDayNumber(arc, today) > grace;

export function isSolid(result, coreIds) {
  const core = result.statuses.filter((s) => s.included && coreIds.has(s.habit.id));
  if (!core.length) return null;
  return core.every((s) => s.completed);
}
export const shieldsLeft = (arc, shielded, total) => Math.max(0, total - [...shielded].filter((d) => arcContains(arc, d)).length);
export const canShield = (result, threshold, today, shielded, left) =>
  left > 0 && result.date < today && !shielded.has(result.date) && result.score != null && result.score < threshold;

export function insights(arc, results, stats, coreIds, today) {
  const weekdays = [0, 1, 2, 3, 4, 5, 6].map((dw) => {
    const sc = results.filter((r) => dow(r.date) === dw).map((r) => r.score).filter((s) => s != null);
    return { day: dw, average: sc.length ? avg(sc) : null, days: sc.length };
  });
  const rated = weekdays.filter((w) => w.average != null && w.days >= 2);
  const best = rated.length ? rated.reduce((a, b) => (b.average > a.average ? b : a)).day : null;
  const worstC = rated.length ? rated.reduce((a, b) => (b.average < a.average ? b : a)) : null;
  const worst = worstC && worstC.day !== best ? worstC.day : null;
  const solid = results.filter((r) => isSolid(r, coreIds) === true).length;
  const A = (key, cur, target) => ({ key, current: cur, target, unlocked: cur >= target, fraction: Math.min(1, Math.max(0, cur / target)) });
  const el = stats.daysElapsed;
  const achievements = [
    A('day7', el, 7), A('day30', el, 30), A('day60', el, 60), A('day_end', el, arcTotalDays(arc)),
    A('streak7', stats.streak.best, 7), A('streak21', stats.streak.best, 21), A('streak50', stats.streak.best, 50),
    A('perfect1', stats.perfectDays, 1), A('perfect10', stats.perfectDays, 10), A('perfect30', stats.perfectDays, 30),
    A('solid21', solid, 21),
  ];
  let pd = Math.min(today, arc.end); if (pd < arc.start) pd = arc.start;
  return { phase: phase(arc, pd), weekdays, bestWeekday: best, worstWeekday: worst, solidDays: solid, achievements };
}

// ---------- enfoque y energía ----------
export function focusValuePerMinute(h) {
  if (h.type !== HabitType.CANTIDAD || h.inverse) return null;
  const u = h.unit.trim().toLowerCase();
  if (u.startsWith('min')) return 1;
  if (u === 'h' || u.startsWith('hora') || u === 'hr' || u === 'hrs') return 1 / 60;
  return null;
}
export const focusEligible = (habits) => habits.filter((h) => h.archivedOn == null && focusValuePerMinute(h) != null);
export const focusLogged = (start, now, planned) => Math.min(planned, Math.max(0, Math.floor((now - start) / 60000)));

export function energyAnalysis(results, energy) {
  const pairs = results.map((r) => (r.score != null && energy[r.date] != null ? [energy[r.date], r.score] : null)).filter(Boolean);
  if (pairs.length < 5) return null;
  const hi = pairs.filter((p) => p[0] >= 4).map((p) => p[1]);
  const lo = pairs.filter((p) => p[0] <= 2).map((p) => p[1]);
  return { average: avg(pairs.map((p) => p[0])), high: hi.length ? avg(hi) : null, low: lo.length ? avg(lo) : null, days: pairs.length };
}
