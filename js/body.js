// Pantalla «Cuerpo»: medidas y fotos de progreso.
import * as S from './store.js';
import { $, $$, esc, ic, num, fShort, fFull, seriesChart, sheet, dialog, confirmDialog, toast, menu } from './ui.js';

const FIELDS = [['weight', 'Peso', 'kg'], ['waist', 'Cintura', 'cm'], ['chest', 'Pecho', 'cm'], ['arm', 'Brazo', 'cm'], ['thigh', 'Muslo', 'cm']];
let metric = 'weight';
const urls = new Map();
async function photoUrl(id) {
  if (urls.has(id)) return urls.get(id);
  const b = await S.getPhotoBlob(id); if (!b) return null;
  const u = URL.createObjectURL(b); urls.set(id, u); return u;
}

export function render(root) {
  const st = S.getState(), today = S.today();
  const body = [...st.body].sort((a, b) => a.date - b.date);
  const [, label, unit] = FIELDS.find((f) => f[0] === metric);
  const pts = body.filter((b) => b[metric] != null).map((b) => [b.date, b[metric]]);
  const last = pts[pts.length - 1], first = pts[0];
  const photos = [...st.photos].sort((a, b) => b.date - a.date);

  root.innerHTML = `<h1 style="font-size:26px;margin:4px 0 14px">Cuerpo</h1>
  <div class="card">
    <div class="chips" style="margin-bottom:12px">${FIELDS.map(([k, n]) => `<button class="chip ${k === metric ? 'on' : ''}" data-m="${k}">${n}</button>`).join('')}</div>
    ${pts.length ? `${seriesChart(pts, { fmt: (v) => num(Math.round(v * 10) / 10) })}
      <div class="muted small mt8">${label}: ${num(last[1])} ${unit}${pts.length > 1 ? ` · ${last[1] - first[1] >= 0 ? '+' : ''}${num(Math.round((last[1] - first[1]) * 10) / 10)} ${unit} desde el inicio` : ''}</div>` : `<div class="empty" style="padding:12px">Aún no hay medidas de ${label.toLowerCase()}.</div>`}
    <button class="btn tonal block mt12" id="add-m">${ic.plus} Añadir medidas</button>
  </div>
  ${body.length ? `<div class="card"><h3>Historial</h3>${[...body].reverse().map((b) => `<button class="list-item" data-b="${b.id}"><div class="grow"><b>${esc(fFull(b.date))}</b><span class="d">${FIELDS.filter((f) => b[f[0]] != null).map((f) => `${f[1]} ${num(b[f[0]])} ${f[2]}`).join(' · ') || 'Sin datos'}</span></div><span class="chev">${ic.chev}</span></button>`).join('')}</div>` : ''}
  <div class="card"><h3>Fotos de progreso</h3>
    <div class="photos" id="ph">${photos.map((p) => `<button data-p="${p.id}"><img alt="" data-img="${p.id}"><span class="dt">${esc(fShort(p.date))}</span></button>`).join('')}
      <button id="add-p" style="display:grid;place-items:center;color:var(--primary)">${ic.camera}</button></div>
    ${photos.length > 1 ? '<button class="btn tonal block mt12" id="cmp">Comparar antes / después</button>' : ''}
    <input type="file" accept="image/*" id="file" hidden>
    <p class="muted small mt8">Las fotos se quedan solo en este dispositivo.</p>
  </div>`;

  $$('[data-m]', root).forEach((b) => b.addEventListener('click', () => { metric = b.dataset.m; render(root); }));
  $('#add-m', root).addEventListener('click', () => measureForm(null, today));
  $$('[data-b]', root).forEach((b) => b.addEventListener('click', () => measureForm(st.body.find((x) => x.id === Number(b.dataset.b)), today)));
  $$('[data-img]', root).forEach(async (img) => { const u = await photoUrl(Number(img.dataset.img)); if (u) img.src = u; });
  const file = $('#file', root);
  $('#add-p', root).addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files[0]; if (!f) return;
    try { await S.addPhoto(f, today); toast('Foto guardada'); } catch (e) { console.warn(e); toast('No se pudo guardar la foto'); }
  });
  $$('[data-p]', root).forEach((b) => b.addEventListener('click', () => viewPhoto(photos.find((p) => p.id === Number(b.dataset.p)))));
  $('#cmp', root)?.addEventListener('click', () => compare(photos));
}

function measureForm(ex, today) {
  const e = ex || { date: today };
  sheet(`<h2>${ex ? 'Editar medidas' : 'Nuevas medidas'}</h2>
    <p class="muted small" style="margin:0 0 12px">${esc(fFull(e.date))}</p>
    ${FIELDS.map(([k, n, u]) => `<label class="field"><span>${n} (${u})</span><input class="input" data-k="${k}" inputmode="decimal" value="${e[k] ?? ''}"></label>`).join('')}
    <div class="err hidden">Introduce al menos un valor válido</div>
    <div class="actions">${ex ? '<button class="btn ghost" data-del style="color:var(--error)">Borrar</button>' : ''}<button class="btn ghost" data-c>Cancelar</button><button class="btn" data-s>Guardar</button></div>`, (b, close) => {
    $('[data-c]', b).addEventListener('click', () => close());
    $('[data-del]', b)?.addEventListener('click', async () => { if (await confirmDialog({ title: 'Borrar medidas', text: 'Se eliminará este registro.', action: 'Borrar', danger: true })) { S.deleteBody(ex.id); close(); } });
    $('[data-s]', b).addEventListener('click', () => {
      const out = { ...e }; let any = false, bad = false;
      $$('[data-k]', b).forEach((i) => {
        const raw = i.value.trim().replace(',', '.');
        if (!raw) { out[i.dataset.k] = null; return; }
        const v = Number(raw); if (isNaN(v) || v <= 0) bad = true; else { out[i.dataset.k] = v; any = true; }
      });
      if (bad || !any) { $('.err', b).classList.remove('hidden'); return; }
      S.saveBody(out); close();
    });
  });
}

async function viewPhoto(p) {
  const u = await photoUrl(p.id);
  const m = dialog(`<img src="${u}" alt="" style="width:100%;border-radius:16px;display:block"><div class="muted small mt8">${esc(fFull(p.date))}</div>
    <div class="actions"><button class="btn ghost" data-del style="color:var(--error)">Borrar</button><button class="btn" data-c>Cerrar</button></div>`);
  $('[data-c]', m.body).addEventListener('click', () => m.close());
  $('[data-del]', m.body).addEventListener('click', async () => {
    if (await confirmDialog({ title: 'Borrar foto', text: 'No se puede deshacer.', action: 'Borrar', danger: true })) { await S.removePhoto(p.id); m.close(); }
  });
}

async function compare(photos) {
  const sorted = [...photos].sort((a, b) => a.date - b.date);
  const a = sorted[0], b = sorted[sorted.length - 1];
  const [ua, ub] = [await photoUrl(a.id), await photoUrl(b.id)];
  const m = dialog(`<div class="compare" id="cp"><img src="${ub}" alt=""><img class="top" src="${ua}" alt=""><div class="handle"></div><span class="lab" style="left:10px">${esc(fShort(a.date))}</span><span class="lab" style="right:10px">${esc(fShort(b.date))}</span></div>
    <div class="actions"><button class="btn" data-c>Cerrar</button></div>`);
  $('[data-c]', m.body).addEventListener('click', () => m.close());
  const cp = $('#cp', m.body), top = $('.top', cp), handle = $('.handle', cp);
  const move = (x) => { const r = cp.getBoundingClientRect(), f = Math.min(1, Math.max(0, (x - r.left) / r.width)); top.style.clipPath = `inset(0 ${(1 - f) * 100}% 0 0)`; handle.style.left = `${f * 100}%`; };
  let drag = false;
  cp.addEventListener('pointerdown', (e) => { drag = true; cp.setPointerCapture(e.pointerId); move(e.clientX); });
  cp.addEventListener('pointermove', (e) => { if (drag) move(e.clientX); });
  cp.addEventListener('pointerup', () => { drag = false; });
}
