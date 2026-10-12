// Arranque, enrutado por hash, tema y aviso de instalación en iOS.
import * as S from './store.js';
import { $, $$, ic, toast } from './ui.js';
import * as Today from './today.js';
import * as Progress from './progress.js';
import * as Body from './body.js';
import * as Settings from './settings.js';
import * as Onboarding from './onboarding.js';

S.load();

const mq = window.matchMedia('(prefers-color-scheme: light)');
function applyTheme() {
  const t = S.getState().settings.theme;
  const light = t === 'LIGHT' || (t === 'SYSTEM' && mq.matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = light ? '#F6F4FF' : '#0B0A16';
}
mq.addEventListener?.('change', applyTheme);

const TABS = [['hoy', 'Hoy', ic.today], ['progreso', 'Progreso', ic.progress], ['cuerpo', 'Cuerpo', ic.body], ['ajustes', 'Ajustes', ic.settings]];
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/');
  return { name: parts[0] || '', arg: parts[1] ? Number(parts[1]) : null };
}

function renderNav(active, show) {
  const nav = $('#nav');
  nav.classList.toggle('hidden', !show);
  $('#screen').classList.toggle('no-nav', !show);
  if (!show) return;
  nav.innerHTML = `<div class="inner">${TABS.map(([k, n, i]) => `<button data-tab="${k}" class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''}><span class="pill">${i}</span><span>${n}</span></button>`).join('')}</div>`;
  $$('[data-tab]', nav).forEach((b) => b.addEventListener('click', () => { if (location.hash === `#/${b.dataset.tab}`) window.scrollTo(0, 0); else location.hash = `#/${b.dataset.tab}`; }));
}

function backupNudge() {
  const set = S.getState().settings;
  if (!set.backupReminderEnabled || !S.getState().arcs.length) return '';
  const days = set.lastBackupDay < 0 ? null : S.today() - set.lastBackupDay;
  const firstUse = S.getState().arcs[0]?.start ?? S.today();
  if (days == null ? S.today() - firstUse < 3 : days < 7) return '';
  return `<div class="card warm tap" data-go="#/ajustes"><b>Haz una copia de seguridad</b><div class="small mt8">${days == null ? 'Todavía no has guardado ninguna.' : `Hace ${days} días de la última.`} Tus datos solo están en este dispositivo.</div></div>`;
}
function installTip() {
  const set = S.getState().settings;
  if (!isIOS || standalone() || set.installTipDismissed) return '';
  return `<div class="card outlined" id="itip"><b>Instálala en tu iPhone</b><div class="small muted mt8">Toca <b>Compartir</b> (el cuadrado con la flecha) y luego <b>Añadir a pantalla de inicio</b>. Así funciona a pantalla completa y sin conexión.</div><button class="link mt8" id="itip-x">Entendido</button></div>`;
}

let lastRoute = '';
function render() {
  applyTheme();
  const r = route(), root = $('#screen');
  Today.stopTimers();
  const st = S.getState();
  const hasArc = st.arcs.length > 0 && S.activeArc();
  if (!st.settings.onboardingDone || (!hasArc && r.name !== 'nuevo')) {
    renderNav('', false);
    Onboarding.render(root, { newArc: st.arcs.length > 0 });
    return;
  }
  const full = ['habit', 'summary', 'habitos', 'editar'].includes(r.name);
  const tab = ['hoy', 'progreso', 'cuerpo', 'ajustes'].includes(r.name) ? r.name : full ? ({ habit: 'progreso', summary: 'progreso', habitos: 'ajustes', editar: 'progreso' })[r.name] : 'hoy';
  renderNav(tab, true);
  const key = location.hash;
  const scroll = key === lastRoute ? window.scrollY : 0;
  lastRoute = key;

  switch (r.name) {
    case 'progreso': Progress.render(root); break;
    case 'cuerpo': Body.render(root); break;
    case 'ajustes': Settings.render(root); break;
    case 'habit': Progress.renderHabit(root, r.arg); break;
    case 'summary': Progress.renderSummary(root, r.arg); break;
    case 'habitos': Settings.renderHabits(root); break;
    case 'editar': Settings.editHabit(r.arg); Progress.renderHabit(root, r.arg); break;
    case 'nuevo': Onboarding.render(root, { newArc: true }); renderNav('', false); break;
    default:
      Today.render(root);
      if (r.name === '' || r.name === 'hoy') { root.insertAdjacentHTML('afterbegin', backupNudge() + installTip()); $('#itip-x', root)?.addEventListener('click', () => S.setSetting({ installTipDismissed: true })); }
      $$('[data-go]', root).forEach((e) => e.addEventListener('click', () => { location.hash = e.dataset.go; }));
  }
  window.scrollTo(0, scroll);
}

let raf = 0;
S.subscribe(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); });
window.addEventListener('hashchange', render);
// al volver a la app (otro día, temporizador…)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') render(); });

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW', e)));
}
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
