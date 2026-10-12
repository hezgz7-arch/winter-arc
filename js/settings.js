// Ajustes, gestión de hábitos y copias de seguridad.
import * as S from './store.js';
import * as D from './domain.js';
import { CATALOG, HABIT_COLORS, iconSvg } from './catalog.js';
import { $, $$, esc, ic, hhmm, parseHhmm, fFull, toast, menu, sheet, confirmDialog, alertDialog, promptDialog } from './ui.js';
import { habitForm } from './habitform.js';
import { openFocus } from './today.js';

const THEMES = { DARK: 'Oscuro', LIGHT: 'Claro', SYSTEM: 'Sistema' };

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const stamp = () => D.toIso(S.today());

async function shareOrDownload(name, text) {
  const file = new File([text], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Copia de Winter Arc' }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  download(name, text, 'application/json');
}

export function render(root) {
  const st = S.getState(), set = st.settings, arc = S.activeArc();
  const row = (id, t, d, right = ic.chev) => `<button class="list-item" id="${id}"><div class="grow"><b>${t}</b>${d ? `<span class="d">${d}</span>` : ''}</div><span class="chev">${right}</span></button>`;
  const sw = (id, t, d, on) => `<div class="switch-row"><div class="t"><b>${t}</b>${d ? `<span>${d}</span>` : ''}</div><button class="sw ${on ? 'on' : ''}" id="${id}" role="switch" aria-checked="${on}"></button></div>`;
  const days = set.lastBackupDay < 0 ? null : S.today() - set.lastBackupDay;

  root.innerHTML = `<h1 style="font-size:26px;margin:4px 0 14px">Ajustes</h1>
  ${S.isStorageOk() ? '' : '<div class="card error">El navegador no permite guardar datos (¿modo privado?). Lo que registres se perderá al cerrar.</div>'}
  <div class="card"><h3>Reto</h3>
    ${row('s-habits', 'Hábitos', 'Añadir, editar, ordenar y archivar')}
    ${row('s-arc', esc(arc?.name || 'Sin arco'), arc ? `${esc(fFull(arc.start))} – ${esc(fFull(arc.end))}` : '')}
    ${row('s-focus', 'Modo enfoque', 'Temporizador que suma minutos a un hábito')}
  </div>
  <div class="card"><h3>Apariencia y reglas</h3>
    <div class="field"><span style="display:block;font-size:13px;color:var(--text-mid);margin:0 4px 6px;font-weight:600">Tema</span>
      <div class="seg">${Object.entries(THEMES).map(([k, n]) => `<button data-th="${k}" class="${set.theme === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <label class="field"><span>El día empieza a las</span><input class="input" type="time" id="s-roll" value="${hhmm(set.rolloverMinutes)}"></label>
    <p class="muted small" style="margin:-6px 4px 12px">Antes de esta hora, lo que registres cuenta para el día anterior.</p>
    <label class="field"><span>Umbral de racha: <b id="thv">${Math.round(set.streakThreshold * 100)} %</b></span><input type="range" class="range" id="s-th" min="50" max="100" step="5" value="${Math.round(set.streakThreshold * 100)}"></label>
    <label class="field"><span>Editar días pasados</span><select class="input" id="s-win">${[[-1, 'Siempre'], [0, 'Solo hoy'], [1, 'Hoy y ayer'], [3, 'Últimos 3 días'], [7, 'Última semana']].map(([v, n]) => `<option value="${v}" ${set.editWindowDays === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    ${sw('s-hap', 'Vibración al marcar', 'No disponible en iPhone', set.haptics)}
  </div>
  <div class="card"><h3>Copias de seguridad</h3>
    <p class="small" style="margin:0 0 10px;color:var(--text-mid)">${days == null ? 'Aún no has hecho ninguna copia.' : days === 0 ? 'Última copia: hoy.' : `Última copia: hace ${days} día${days > 1 ? 's' : ''}.`} Tus datos viven solo en este dispositivo: guarda copias de vez en cuando.</p>
    ${sw('s-brem', 'Recordar copias', 'Aviso en Hoy si pasa una semana', set.backupReminderEnabled)}
    ${row('s-exp', 'Exportar copia', 'Archivo con todo, incluidas las fotos')}
    ${row('s-expn', 'Exportar sin fotos', 'Más ligero')}
    ${row('s-imp', 'Importar copia', 'Reemplaza los datos actuales')}
    ${row('s-csv', 'Exportar a CSV', 'Registros del arco para hojas de cálculo')}
    <input type="file" id="s-file" accept=".json,application/json" hidden>
  </div>
  <div class="card"><h3>Datos</h3>${row('s-wipe', '<span style="color:var(--error)">Borrar todo</span>', 'Elimina hábitos, registros y fotos')}</div>
  <p class="muted small" style="text-align:center;margin:18px 0 6px">Winter Arc web ${S.APP_VERSION} · todo se guarda en tu dispositivo</p>`;

  const g = (id) => $(id, root);
  $$('[data-th]', root).forEach((b) => b.addEventListener('click', () => S.setSetting({ theme: b.dataset.th })));
  g('#s-roll').addEventListener('change', (e) => { if (e.target.value) S.setSetting({ rolloverMinutes: parseHhmm(e.target.value) }); });
  g('#s-th').addEventListener('input', (e) => { $('#thv', root).textContent = `${e.target.value} %`; });
  g('#s-th').addEventListener('change', (e) => S.setSetting({ streakThreshold: Number(e.target.value) / 100 }));
  g('#s-win').addEventListener('change', (e) => S.setSetting({ editWindowDays: Number(e.target.value) }));
  g('#s-hap').addEventListener('click', () => S.setSetting({ haptics: !set.haptics }));
  g('#s-brem').addEventListener('click', () => S.setSetting({ backupReminderEnabled: !set.backupReminderEnabled }));
  g('#s-habits').addEventListener('click', () => { location.hash = '#/habitos'; });
  g('#s-arc').addEventListener('click', () => arcMenu(arc));
  g('#s-focus').addEventListener('click', () => openFocus());
  g('#s-exp').addEventListener('click', () => doExport(true));
  g('#s-expn').addEventListener('click', () => doExport(false));
  g('#s-csv').addEventListener('click', () => download(`winterarc-${stamp()}.csv`, '﻿' + S.toCsv(), 'text/csv'));
  const file = g('#s-file');
  g('#s-imp').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => { const f = file.files[0]; file.value = ''; if (f) doImport(await f.text()); });
  g('#s-wipe').addEventListener('click', wipe);
}

async function doExport(photos) {
  try {
    const text = await S.exportBackup(photos);
    await shareOrDownload(`winterarc-${stamp()}.json`, text);
    S.setSetting({ lastBackupDay: S.today() });
    toast('Copia exportada');
  } catch (e) { console.warn(e); alertDialog('No se pudo exportar', String(e.message || e)); }
}

const ERR = { corrupt: 'El archivo no se puede leer.', not_backup: 'Este archivo no es una copia de Winter Arc web. (Las copias de la app Android no son compatibles.)', newer: 'La copia viene de una versión más nueva de la app.', inconsistent: 'El archivo está incompleto o dañado.' };
async function doImport(text) {
  const v = S.validateBackup(text);
  if (!v.ok) return alertDialog('Copia no válida', ERR[v.error]);
  const s = v.summary;
  const yes = await confirmDialog({ title: 'Importar copia', text: `Copia del ${s.date}: ${s.arcs} arco(s), ${s.habits} hábitos, ${s.entries} registros, ${s.photos} fotos.\n\nSe reemplazarán todos los datos actuales.`, action: 'Reemplazar', danger: true });
  if (!yes) return;
  try { await S.restoreBackup(v.backup); toast('Copia restaurada'); location.hash = '#/hoy'; } catch (e) { alertDialog('Error al restaurar', String(e.message || e)); }
}

async function wipe() {
  if (!await confirmDialog({ title: 'Borrar todo', text: 'Se eliminarán hábitos, registros, medidas y fotos de este dispositivo. No se puede deshacer.', action: 'Continuar', danger: true })) return;
  const t = await promptDialog({ title: 'Confirmar borrado', label: 'Escribe BORRAR para confirmar', action: 'Borrar todo', validate: (x) => (x.trim().toUpperCase() === 'BORRAR' ? '' : 'Escribe BORRAR') });
  if (t == null) return;
  await S.wipeAll(); location.hash = '#/'; location.reload();
}

function arcMenu(arc) {
  menu(arc?.name || 'Arco', [
    ...(arc ? [{ label: 'Renombrar', run: async () => { const n = await promptDialog({ title: 'Nombre del arco', label: 'Nombre', value: arc.name, validate: (x) => (x.trim() ? '' : 'Escribe un nombre') }); if (n) S.updateArc(arc.id, { name: n.trim() }); } },
      { label: 'Ver resumen', run: () => { location.hash = `#/summary/${arc.id}`; } },
      { label: 'Archivar y empezar un arco nuevo', danger: true, run: async () => { if (await confirmDialog({ title: 'Archivar arco', text: 'El arco queda guardado como historial y empezarás uno nuevo.', action: 'Archivar' })) { S.archiveArc(arc.id); location.hash = '#/nuevo'; } } }]
      : [{ label: 'Crear arco', run: () => { location.hash = '#/nuevo'; } }]),
  ]);
}

// ---------- gestión de hábitos ----------
export function renderHabits(root) {
  const arc = S.activeArc();
  if (!arc) { location.hash = '#/ajustes'; return; }
  const all = S.habitsOf(arc.id, true), active = all.filter((h) => h.archivedOn == null), arch = all.filter((h) => h.archivedOn != null);
  const core = S.coreSet();
  const item = (h, i, n, isArch) => `<div class="list-item" data-h="${h.id}">
    <span class="ico" style="color:${HABIT_COLORS[h.colorIndex % 8]}">${iconSvg(h.iconKey, 22)}</span>
    <button class="grow" data-edit="${h.id}" style="text-align:left"><b>${esc(h.name)}${core.has(h.id) ? ' ★' : ''}</b><span class="d">${esc(h.category)}</span></button>
    ${isArch ? `<button class="icon-btn" data-restore="${h.id}" aria-label="Restaurar">${ic.restore}</button>`
      : `<button class="icon-btn" data-up="${h.id}" ${i === 0 ? 'disabled style="opacity:.3"' : ''} aria-label="Subir">${ic.up}</button><button class="icon-btn" data-down="${h.id}" ${i === n - 1 ? 'disabled style="opacity:.3"' : ''} aria-label="Bajar">${ic.down}</button><button class="icon-btn" data-arch="${h.id}" aria-label="Archivar">${ic.archive}</button>`}
  </div>`;
  root.innerHTML = `<div class="top-bar"><button class="icon-btn" id="back" aria-label="Atrás">${ic.back}</button><h1>Hábitos</h1></div>
    <div class="card">${active.length ? active.map((h, i) => item(h, i, active.length, false)).join('') : '<div class="empty">Sin hábitos activos.</div>'}</div>
    <div class="row gap8"><button class="btn block" id="add">${ic.plus} Nuevo hábito</button><button class="btn tonal block" id="cat">Del catálogo</button></div>
    ${arch.length ? `<h3 style="margin:20px 4px 8px" class="muted">Archivados</h3><div class="card">${arch.map((h) => item(h, 0, 0, true)).join('')}</div>` : ''}`;
  $('#back', root).addEventListener('click', () => history.back());
  $('#add', root).addEventListener('click', async () => { const f = await habitForm(null, arc); if (f) S.addHabit(arc, f, S.today() < arc.start ? arc.start : S.today()); });
  $('#cat', root).addEventListener('click', () => catalogPicker(arc));
  $$('[data-edit]', root).forEach((b) => b.addEventListener('click', () => editHabit(Number(b.dataset.edit))));
  $$('[data-up]', root).forEach((b) => b.addEventListener('click', () => S.moveHabit(Number(b.dataset.up), -1)));
  $$('[data-down]', root).forEach((b) => b.addEventListener('click', () => S.moveHabit(Number(b.dataset.down), 1)));
  $$('[data-restore]', root).forEach((b) => b.addEventListener('click', () => S.restoreHabit(Number(b.dataset.restore))));
  $$('[data-arch]', root).forEach((b) => b.addEventListener('click', async () => {
    const h = all.find((x) => x.id === Number(b.dataset.arch));
    if (await confirmDialog({ title: `Archivar «${h.name}»`, text: 'Dejará de contar desde hoy. Los registros pasados se conservan.', action: 'Archivar' })) S.archiveHabit(h.id, S.today());
  }));
}

export async function editHabit(id) {
  const arc = S.activeArc(), h = S.getState().habits.find((x) => x.id === id);
  if (!h) return;
  const f = await habitForm(h, arc, { checkLocked: true });
  if (f) { const { id: _i, arcId: _a, sortOrder: _s, activeFrom: _f, archivedOn: _r, ...patch } = f; S.updateHabit(id, patch); }
  if (location.hash.startsWith('#/editar')) history.back();
}

function catalogPicker(arc) {
  const have = new Set(S.habitsOf(arc.id, false).map((h) => h.catalogKey).filter(Boolean));
  const chosen = new Set();
  sheet(`<h2>Catálogo</h2><div id="cl">${CATALOG.map((c) => `<button class="pick ${have.has(c.key) ? 'on' : ''}" data-k="${c.key}" ${have.has(c.key) ? 'disabled style="opacity:.5"' : ''}><span class="ico" style="color:var(--primary)">${iconSvg(c.iconKey, 20)}</span><span><b>${esc(c.name)}</b></span><span class="ck"></span></button>`).join('')}</div>
    <div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn" data-s>Añadir</button></div>`, (b, close) => {
    $$('[data-k]', b).forEach((e) => e.addEventListener('click', () => { const k = e.dataset.k; if (chosen.has(k)) chosen.delete(k); else chosen.add(k); e.classList.toggle('on', chosen.has(k)); $('.ck', e).textContent = chosen.has(k) ? '✓' : ''; }));
    $('[data-c]', b).addEventListener('click', () => close());
    $('[data-s]', b).addEventListener('click', () => {
      const from = S.today() < arc.start ? arc.start : S.today();
      for (const k of chosen) { const c = CATALOG.find((x) => x.key === k); S.addHabit(arc, { catalogKey: c.key, name: c.name, iconKey: c.iconKey, category: c.category, type: c.type, moment: c.moment, target: c.target, unit: c.unit, increment: c.increment, inverse: c.inverse, weeklyTotal: c.weeklyTotal, weeklyTarget: c.weeklyTarget, timeLimitMinutes: c.timeLimitMinutes, timeMode: c.timeMode, weight: c.weight, colorIndex: Math.floor(Math.random() * 8) }, from); }
      close();
    });
  });
}
