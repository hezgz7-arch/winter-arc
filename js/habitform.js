// Formulario de hábito (crear / editar), como hoja inferior.
import { sheet, $, $$, esc, hhmm, parseHhmm, confirmDialog } from './ui.js';
import { CATEGORIES, MOMENTS, TYPES, ICONS, HABIT_COLORS, iconSvg } from './catalog.js';
import * as S from './store.js';
import { rulesLocked, arcContains } from './domain.js';

/** Devuelve una promesa con los campos del hábito o null si se cancela. `existing` null = nuevo. */
export function habitForm(existing, arc, { checkLocked = false } = {}) {
  const d = {
    name: '', iconKey: 'check', colorIndex: 0, category: 'PERSONAL', type: 'CHECK', moment: 'DAY', target: 1, unit: '', increment: 1,
    inverse: false, weeklyTotal: false, weeklyTarget: 3, timeLimitMinutes: 420, timeMode: 'BEFORE', weight: 1, reminderMinutes: null, ...(existing || {}),
  };
  return new Promise((res) => {
    let done = false;
    const m = sheet('', null);
    const finish = (v) => { if (!done) { done = true; m.close(); res(v); } };
    m.el.querySelector('.scrim').addEventListener('click', () => finish(null));

    const render = () => {
      m.body.innerHTML = `
      <h2>${existing ? 'Editar hábito' : 'Nuevo hábito'}</h2>
      <label class="field"><span>Nombre</span><input class="input" id="f-name" value="${esc(d.name)}" maxlength="60" autocomplete="off"></label>
      <div class="err hidden" id="e-name">Escribe un nombre</div>

      <label class="field"><span>Tipo de hábito</span>
        <select class="input" id="f-type">${Object.entries(TYPES).map(([k, [n]]) => `<option value="${k}" ${d.type === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <p class="muted small" style="margin:-6px 4px 14px">${TYPES[d.type][1]}</p>

      ${d.type === 'CANTIDAD' ? `
        <div class="row gap8">
          <label class="field grow"><span>${d.weeklyTotal ? 'Objetivo semanal' : 'Objetivo diario'}</span><input class="input" id="f-target" inputmode="decimal" value="${d.target}"></label>
          <label class="field grow"><span>Unidad</span><input class="input" id="f-unit" value="${esc(d.unit)}" maxlength="12"></label>
        </div>
        <div class="err hidden" id="e-target">Introduce un número mayor que cero</div>
        <label class="field"><span>Suma por toque</span><input class="input" id="f-inc" inputmode="decimal" value="${d.increment}"></label>
        <div class="err hidden" id="e-inc">Introduce un incremento mayor que cero</div>
        <div class="switch-row"><div class="t"><b>Límite máximo</b><span>Cumplido si no lo superas</span></div><button class="sw ${d.inverse ? 'on' : ''}" id="f-inv" role="switch" aria-checked="${d.inverse}"></button></div>
        <div class="switch-row"><div class="t"><b>Acumular durante la semana</b></div><button class="sw ${d.weeklyTotal ? 'on' : ''}" id="f-wt" role="switch" aria-checked="${d.weeklyTotal}"></button></div>` : ''}
      ${d.type === 'SEMANAL' ? `<label class="field"><span>Veces por semana: <b id="wt-v">${d.weeklyTarget}</b></span><input type="range" class="range" id="f-wk" min="1" max="7" value="${d.weeklyTarget}"></label>` : ''}
      ${d.type === 'HORA' ? `
        <div class="row gap8">
          <label class="field grow"><span>Condición</span><select class="input" id="f-tm"><option value="BEFORE" ${d.timeMode === 'BEFORE' ? 'selected' : ''}>Antes de</option><option value="AFTER" ${d.timeMode === 'AFTER' ? 'selected' : ''}>Después de</option></select></label>
          <label class="field grow"><span>Hora límite</span><input class="input" type="time" id="f-tl" value="${hhmm(d.timeLimitMinutes)}"></label>
        </div>` : ''}

      <label class="field"><span>Categoría</span><select class="input" id="f-cat">${Object.entries(CATEGORIES).map(([k, n]) => `<option value="${k}" ${d.category === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="field"><span>Momento del día</span><select class="input" id="f-mo">${Object.entries(MOMENTS).map(([k, n]) => `<option value="${k}" ${d.moment === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <div class="field"><span style="display:block;font-size:13px;color:var(--text-mid);margin:0 4px 6px;font-weight:600">Icono</span>
        <div class="ico-grid">${Object.keys(ICONS).map((k) => `<button data-ico="${k}" class="${d.iconKey === k ? 'on' : ''}" aria-label="Icono ${k}">${iconSvg(k, 22)}</button>`).join('')}</div></div>
      <div class="field"><span style="display:block;font-size:13px;color:var(--text-mid);margin:0 4px 6px;font-weight:600">Color</span>
        <div class="col-grid">${HABIT_COLORS.map((c, i) => `<button data-col="${i}" class="${d.colorIndex === i ? 'on' : ''}" style="background:${c}" aria-label="Color ${i + 1}"></button>`).join('')}</div></div>
      <label class="field mt16"><span>Peso en la puntuación: <b id="w-v">${d.weight}</b></span><input type="range" class="range" id="f-w" min="1" max="5" value="${d.weight}"></label>
      <p class="muted small" style="margin:-8px 4px 14px">Los hábitos con más peso cuentan más en la puntuación del día.</p>
      <div class="actions"><button class="btn ghost" id="f-cancel">Cancelar</button><button class="btn" id="f-save">Guardar</button></div>`;
      wire();
    };

    const readText = () => {
      const g = (id) => $(id, m.body);
      if (g('#f-name')) d.name = g('#f-name').value;
      if (g('#f-target')) d.target = g('#f-target').value;
      if (g('#f-unit')) d.unit = g('#f-unit').value;
      if (g('#f-inc')) d.increment = g('#f-inc').value;
      if (g('#f-tl')) d.timeLimitMinutes = g('#f-tl').value ? parseHhmm(g('#f-tl').value) : d.timeLimitMinutes;
      if (g('#f-tm')) d.timeMode = g('#f-tm').value;
      if (g('#f-cat')) d.category = g('#f-cat').value;
      if (g('#f-mo')) d.moment = g('#f-mo').value;
    };
    const wire = () => {
      const g = (id) => $(id, m.body);
      g('#f-type').addEventListener('change', (e) => { readText(); d.type = e.target.value; render(); });
      g('#f-inv')?.addEventListener('click', () => { readText(); d.inverse = !d.inverse; render(); });
      g('#f-wt')?.addEventListener('click', () => { readText(); d.weeklyTotal = !d.weeklyTotal; render(); });
      g('#f-wk')?.addEventListener('input', (e) => { d.weeklyTarget = Number(e.target.value); g('#wt-v').textContent = d.weeklyTarget; });
      g('#f-w').addEventListener('input', (e) => { d.weight = Number(e.target.value); g('#w-v').textContent = d.weight; });
      $$('[data-ico]', m.body).forEach((b) => b.addEventListener('click', () => { readText(); d.iconKey = b.dataset.ico; render(); }));
      $$('[data-col]', m.body).forEach((b) => b.addEventListener('click', () => { readText(); d.colorIndex = Number(b.dataset.col); render(); }));
      g('#f-cancel').addEventListener('click', () => finish(null));
      g('#f-save').addEventListener('click', async () => {
        readText();
        let ok = true;
        const bad = (id, cond) => { $(id, m.body)?.classList.toggle('hidden', !cond); if (cond) ok = false; };
        const toNum = (v) => Number(String(v).replace(',', '.'));
        bad('#e-name', !d.name.trim());
        if (d.type === 'CANTIDAD') { bad('#e-target', !(toNum(d.target) > 0)); bad('#e-inc', !(toNum(d.increment) > 0)); }
        if (!ok) return;
        const out = { ...d, name: d.name.trim(), target: d.type === 'CANTIDAD' ? toNum(d.target) : 1, increment: d.type === 'CANTIDAD' ? toNum(d.increment) : 1,
          unit: d.type === 'CANTIDAD' ? String(d.unit).trim() : '', weeklyTotal: d.type === 'CANTIDAD' && d.weeklyTotal, inverse: d.type === 'CANTIDAD' && d.inverse };
        if (existing && checkLocked && arc && rulesLocked(arc, S.today())) {
          const yes = await confirmDialog({ title: 'Cambiar una regla a mitad de reto', text: 'Pasados los primeros días, las reglas se consideran fijas: cambiarlas a escondidas es la forma más común de abandonar. Si el cambio es una mejora real, adelante.', action: 'Guardar cambio' });
          if (!yes) return;
        }
        finish(out);
      });
    };
    render();
  });
}
