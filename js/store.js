// Estado de la app, persistencia local (localStorage + IndexedDB para fotos) y copias de seguridad.
import { EntryIndex, DayClock, applyEntryAction, parseIso, toIso } from './domain.js';

const KEY = 'winterarc.state.v1';
export const APP_VERSION = '1.0.0';

export const DEFAULT_SETTINGS = {
  onboardingDone: false, theme: 'DARK', rolloverMinutes: 180, editWindowDays: -1, streakThreshold: 0.8,
  haptics: true, backupReminderEnabled: true, lastBackupDay: -1, lastCelebratedDay: -1,
  why: '', identity: '', shieldDays: [], shieldsPerArc: 3, coreHabitIds: [], hideCompleted: false,
  focus: null, // { habitId, start, minutes }
  focusMinutes: 25, energy: {}, // energy: { epochDay: 1..5 }
  installTipDismissed: false,
};

function fresh() {
  return { v: 1, nextId: 1, arcs: [], habits: [], entries: {}, notes: {}, body: [], photos: [], reviews: [], settings: { ...DEFAULT_SETTINGS } };
}

let state = fresh();
const listeners = new Set();
let storageOk = true;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      state = { ...fresh(), ...s, settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) } };
    }
  } catch (e) { storageOk = false; console.warn('Sin almacenamiento persistente', e); }
  return state;
}
export const isStorageOk = () => storageOk;
export const getState = () => state;
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

let saveTimer = null;
function persistNow() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; } catch (e) { storageOk = false; console.warn(e); }
}
export function commit() {
  persistNow();
  listeners.forEach((f) => f(state));
}
window.addEventListener('pagehide', persistNow);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistNow(); });

export const nextId = () => state.nextId++;
export const clock = () => new DayClock(state.settings.rolloverMinutes);
export const today = () => clock().today();
export const activeArc = () => state.arcs.find((a) => a.status === 'ACTIVE') || null;
export const habitsOf = (arcId, includeArchived = true) =>
  state.habits.filter((h) => h.arcId === arcId && (includeArchived || h.archivedOn == null)).sort((a, b) => a.sortOrder - b.sortOrder);
export const entryIndex = () => new EntryIndex(state.entries);
export const shieldedSet = () => new Set(state.settings.shieldDays);
export const coreSet = () => new Set(state.settings.coreHabitIds);

export function setSetting(patch) { Object.assign(state.settings, patch); commit(); }

// ---------- hábitos ----------
export function makeHabit(arc, partial, activeFrom) {
  const order = habitsOf(arc.id).reduce((m, h) => Math.max(m, h.sortOrder), -1) + 1;
  return {
    id: nextId(), arcId: arc.id, name: '', catalogKey: null, iconKey: 'check', colorIndex: 0, category: 'PERSONAL', type: 'CHECK',
    moment: 'DAY', target: 1, unit: '', increment: 1, inverse: false, weeklyTotal: false, weeklyTarget: 3,
    timeLimitMinutes: 0, timeMode: 'BEFORE', weight: 1, reminderMinutes: null, sortOrder: order, activeFrom, archivedOn: null, ...partial,
  };
}

export function addHabit(arc, partial, activeFrom) {
  const h = makeHabit(arc, partial, activeFrom ?? arc.start);
  state.habits.push(h); commit(); return h;
}
export function updateHabit(id, patch) {
  const h = state.habits.find((x) => x.id === id); if (!h) return;
  Object.assign(h, patch); commit();
}
export function archiveHabit(id, day) { updateHabit(id, { archivedOn: day }); }
export function restoreHabit(id) { updateHabit(id, { archivedOn: null }); }
export function moveHabit(id, delta) {
  const h = state.habits.find((x) => x.id === id); if (!h) return;
  const list = habitsOf(h.arcId, false);
  const i = list.findIndex((x) => x.id === id), j = i + delta;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  list.forEach((x, k) => { x.sortOrder = k; });
  commit();
}

// ---------- registros ----------
export function applyAction(habit, day, action) {
  const cur = state.entries[habit.id]?.[day] ?? null;
  const next = applyEntryAction(habit, cur, action);
  if (!state.entries[habit.id]) state.entries[habit.id] = {};
  if (next) state.entries[habit.id][day] = next; else delete state.entries[habit.id][day];
  commit();
}
export function setNote(day, text) { if (text.trim()) state.notes[day] = text; else delete state.notes[day]; commit(); }

// ---------- ajustes derivados ----------
export function toggleShield(day, on) {
  const s = new Set(state.settings.shieldDays);
  if (on) s.add(day); else s.delete(day);
  setSetting({ shieldDays: [...s].sort((a, b) => a - b) });
}
export function toggleCore(habitId, on) {
  const s = new Set(state.settings.coreHabitIds);
  if (on) s.add(habitId); else s.delete(habitId);
  setSetting({ coreHabitIds: [...s].sort((a, b) => a - b) });
}
export function setEnergy(day, level) {
  const e = { ...state.settings.energy };
  if (level == null) delete e[day]; else e[day] = level;
  setSetting({ energy: e });
}

// ---------- arcos ----------
export function createArc({ name, start, end }) {
  const arc = { id: nextId(), name, start, end, status: 'ACTIVE' };
  state.arcs.push(arc); commit(); return arc;
}
export function updateArc(id, patch) { Object.assign(state.arcs.find((a) => a.id === id), patch); commit(); }
export function archiveArc(id) {
  updateArc(id, { status: 'ARCHIVED' });
  setSetting({ shieldDays: [], coreHabitIds: [], focus: null, lastCelebratedDay: -1 });
}

// ---------- cuerpo / revisiones ----------
export function saveBody(entry) {
  if (entry.id) Object.assign(state.body.find((b) => b.id === entry.id), entry);
  else state.body.push({ ...entry, id: nextId() });
  commit();
}
export function deleteBody(id) { state.body = state.body.filter((b) => b.id !== id); commit(); }
export function saveReview(arcId, weekStart, texts) {
  const ex = state.reviews.find((r) => r.arcId === arcId && r.weekStart === weekStart);
  if (ex) Object.assign(ex, texts, { createdAt: Date.now() });
  else state.reviews.push({ id: nextId(), arcId, weekStart, ...texts, createdAt: Date.now() });
  commit();
}

// ---------- fotos (IndexedDB) ----------
let dbp = null;
function db() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('winterarc', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('photos');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('photos', mode); const o = fn(t.objectStore('photos')); t.oncomplete = () => res(o?.result); t.onerror = () => rej(t.error); }); };
export const putPhotoBlob = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
export const getPhotoBlob = (id) => tx('readonly', (s) => s.get(id));
export const deletePhotoBlob = (id) => tx('readwrite', (s) => s.delete(id));
export const clearPhotoBlobs = () => tx('readwrite', (s) => s.clear());
export const allPhotoBlobs = async () => {
  const out = {};
  for (const p of state.photos) { const b = await getPhotoBlob(p.id); if (b) out[p.id] = b; }
  return out;
};

/** Reduce a 1600 px JPEG respetando la orientación EXIF. */
export async function processImage(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/jpeg', 0.85));
}
export async function addPhoto(file, day, note = '') {
  const blob = await processImage(file);
  const id = nextId();
  await putPhotoBlob(id, blob);
  state.photos.push({ id, date: day, note }); commit();
}
export async function removePhoto(id) {
  await deletePhotoBlob(id);
  state.photos = state.photos.filter((p) => p.id !== id); commit();
}

// ---------- copias de seguridad ----------
const FORMAT = 'winterarc-web';
const blobToDataUrl = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
const dataUrlToBlob = async (u) => (await fetch(u)).blob();

export async function exportBackup(withPhotos) {
  const data = JSON.parse(JSON.stringify(state));
  const photos = {};
  if (withPhotos) {
    const blobs = await allPhotoBlobs();
    for (const [id, b] of Object.entries(blobs)) photos[id] = await blobToDataUrl(b);
  } else data.photos = [];
  return JSON.stringify({ format: FORMAT, version: 1, app: APP_VERSION, exportedAt: Date.now(), data, photos });
}

export function validateBackup(text) {
  let j;
  try { j = JSON.parse(text); } catch { return { error: 'corrupt' }; }
  if (!j || j.format !== FORMAT) return { error: 'not_backup' };
  if (j.version > 1) return { error: 'newer' };
  const d = j.data;
  const arrays = ['arcs', 'habits', 'body', 'photos', 'reviews'];
  if (!d || typeof d !== 'object' || arrays.some((k) => !Array.isArray(d[k])) || typeof d.entries !== 'object' || typeof d.notes !== 'object') return { error: 'inconsistent' };
  const arcIds = new Set(d.arcs.map((a) => a.id));
  if (d.arcs.some((a) => !(a.start <= a.end))) return { error: 'inconsistent' };
  if (d.habits.some((h) => !arcIds.has(h.arcId) || !h.name || !['CHECK', 'CANTIDAD', 'HORA', 'EVITAR', 'SEMANAL'].includes(h.type))) return { error: 'inconsistent' };
  return { ok: true, backup: j, summary: {
    date: new Date(j.exportedAt || 0).toLocaleDateString('es-ES'), app: j.app || '?', arcs: d.arcs.length, habits: d.habits.length,
    entries: Object.values(d.entries).reduce((a, m) => a + Object.keys(m).length, 0), body: d.body.length, photos: Object.keys(j.photos || {}).length, reviews: d.reviews.length } };
}

export async function restoreBackup(backup) {
  const d = backup.data;
  await clearPhotoBlobs();
  const ids = new Set();
  for (const [id, url] of Object.entries(backup.photos || {})) { await putPhotoBlob(Number(id), await dataUrlToBlob(url)); ids.add(Number(id)); }
  state = { ...fresh(), ...d, photos: d.photos.filter((p) => ids.has(p.id)), settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) } };
  commit();
}

export async function wipeAll() {
  await clearPhotoBlobs();
  state = fresh(); commit();
}

export function toCsv() {
  const arc = activeArc() || state.arcs[state.arcs.length - 1];
  const esc = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = [['fecha', 'habito', 'tipo', 'valor', 'hora', 'fallo']];
  for (const h of state.habits.filter((x) => !arc || x.arcId === arc.id)) {
    const m = state.entries[h.id] || {};
    for (const d of Object.keys(m).map(Number).sort((a, b) => a - b)) {
      const e = m[d];
      rows.push([toIso(d), h.name, h.type, e.value, e.timeMinutes == null ? '' : `${String(Math.floor(e.timeMinutes / 60)).padStart(2, '0')}:${String(e.timeMinutes % 60).padStart(2, '0')}`, e.failed ? 1 : 0]);
    }
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}
export { parseIso, toIso };
