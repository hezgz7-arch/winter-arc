// Asistente de primer uso / nuevo arco: nombre y fechas → hábitos → pacto.
import * as S from './store.js';
import * as D from './domain.js';
import { CATALOG, CATEGORIES, iconSvg } from './catalog.js';
import { $, $$, esc } from './ui.js';

export function render(root, { newArc = false } = {}) {
  const today = S.today();
  const yearEnd = D.parseIso(`${D.dayToDate(today).getUTCFullYear()}-12-31`);
  const model = {
    step: 0, name: 'Winter Arc', start: today, end: Math.max(today + 29, today + 91 > yearEnd + 400 ? today + 91 : Math.min(today + 91, Math.max(yearEnd, today + 29))),
    picked: new Set(CATALOG.filter((c) => c.suggested).map((c) => c.key)), identity: '', why: '',
  };
  model.end = today + 91; // 92 días por defecto

  const paint = () => {
    const steps = `<div class="steps">${[0, 1, 2].map((i) => `<i class="${i <= model.step ? 'on' : ''}"></i>`).join('')}</div>`;
    let body = '';
    if (model.step === 0) {
      const total = model.end - model.start + 1;
      body = `<h1 style="font-size:28px;margin-bottom:6px">${newArc ? 'Nuevo arco' : 'Tu Winter Arc'}</h1>
        <p class="muted" style="margin:0 0 20px">Un reto con principio y fin. Pocas reglas, medibles, y sin renegociarlas a mitad.</p>
        <label class="field"><span>Nombre</span><input class="input" id="o-name" value="${esc(model.name)}" maxlength="40"></label>
        <div class="row gap8"><label class="field grow"><span>Inicio</span><input class="input" type="date" id="o-s" value="${D.toIso(model.start)}"></label>
        <label class="field grow"><span>Fin</span><input class="input" type="date" id="o-e" value="${D.toIso(model.end)}"></label></div>
        <p class="muted small" id="o-len">${total > 0 ? `${total} días` : ''}</p><div class="err hidden" id="o-err"></div>`;
    } else if (model.step === 1) {
      body = `<h1 style="font-size:26px;margin-bottom:6px">Elige tus hábitos</h1><p class="muted" style="margin:0 0 16px">Mejor pocos y bien hechos. Puedes cambiarlos en Ajustes.</p>` +
        Object.entries(CATEGORIES).map(([cat, label]) => {
          const list = CATALOG.filter((c) => c.category === cat); if (!list.length) return '';
          return `<div class="group-head"><span>${label}</span></div>${list.map((c) => `<button class="pick ${model.picked.has(c.key) ? 'on' : ''}" data-k="${c.key}"><span class="ico" style="color:var(--primary)">${iconSvg(c.iconKey, 20)}</span><b>${esc(c.name)}</b><span class="ck">${model.picked.has(c.key) ? '✓' : ''}</span></button>`).join('')}`;
        }).join('') + `<div class="err hidden" id="o-err">Elige al menos un hábito</div>`;
    } else {
      body = `<h1 style="font-size:26px;margin-bottom:6px">Tu pacto</h1><p class="muted" style="margin:0 0 16px">Lo verás cada día en Hoy. Es opcional, pero ayuda cuando falla la motivación.</p>
        <label class="field"><span>Soy alguien que…</span><input class="input" id="o-id" value="${esc(model.identity)}" placeholder="entrena y estudia aunque no le apetezca"></label>
        <label class="field"><span>Mi porqué</span><textarea class="input" id="o-why" placeholder="Qué quieres tener al terminar el reto">${esc(model.why)}</textarea></label>`;
    }
    root.innerHTML = `<div class="wizard">${steps}${body}<div class="sticky-foot">${model.step > 0 ? '<button class="btn outline" id="o-back">Atrás</button>' : ''}<button class="btn" id="o-next">${model.step === 2 ? 'Empezar' : 'Siguiente'}</button></div></div>`;

    $('#o-back', root)?.addEventListener('click', () => { read(); model.step--; paint(); });
    $$('[data-k]', root).forEach((b) => b.addEventListener('click', () => { const k = b.dataset.k; model.picked.has(k) ? model.picked.delete(k) : model.picked.add(k); b.classList.toggle('on'); $('.ck', b).textContent = model.picked.has(k) ? '✓' : ''; }));
    $('#o-s', root)?.addEventListener('change', () => { read(); $('#o-len', root).textContent = model.end >= model.start ? `${model.end - model.start + 1} días` : ''; });
    $('#o-e', root)?.addEventListener('change', () => { read(); $('#o-len', root).textContent = model.end >= model.start ? `${model.end - model.start + 1} días` : ''; });
    $('#o-next', root).addEventListener('click', () => {
      read();
      const err = $('#o-err', root);
      if (model.step === 0) {
        const n = model.end - model.start + 1;
        if (!model.name.trim()) return show(err, 'Escribe un nombre');
        if (!(n >= 7)) return show(err, 'El arco debe durar al menos 7 días');
        if (n > 366) return show(err, 'El arco no puede superar un año');
      }
      if (model.step === 1 && !model.picked.size) return show(err, 'Elige al menos un hábito');
      if (model.step < 2) { model.step++; paint(); window.scrollTo(0, 0); return; }
      finish();
    });
  };
  const show = (el, t) => { if (el) { el.textContent = t; el.classList.remove('hidden'); } };
  const read = () => {
    if ($('#o-name', root)) { model.name = $('#o-name', root).value; if ($('#o-s', root).value) model.start = D.parseIso($('#o-s', root).value); if ($('#o-e', root).value) model.end = D.parseIso($('#o-e', root).value); }
    if ($('#o-id', root)) { model.identity = $('#o-id', root).value.trim(); model.why = $('#o-why', root).value.trim(); }
  };
  const finish = () => {
    const arc = S.createArc({ name: model.name.trim(), start: model.start, end: model.end });
    const from = Math.max(model.start, 0);
    CATALOG.filter((c) => model.picked.has(c.key)).forEach((c, i) => S.addHabit(arc, {
      catalogKey: c.key, name: c.name, iconKey: c.iconKey, category: c.category, type: c.type, moment: c.moment, target: c.target, unit: c.unit,
      increment: c.increment, inverse: c.inverse, weeklyTotal: c.weeklyTotal, weeklyTarget: c.weeklyTarget, timeLimitMinutes: c.timeLimitMinutes,
      timeMode: c.timeMode, weight: c.weight, colorIndex: i % 8,
    }, from));
    S.setSetting({ onboardingDone: true, identity: model.identity, why: model.why });
    location.hash = '#/hoy';
  };
  paint();
}
