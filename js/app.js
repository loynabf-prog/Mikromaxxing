// ============================================================================
// Mikromaxxing – App-Start & Navigation
// ============================================================================
import * as store from './store.js';
import { injectIcons, icon } from './icons.js';
import { $, $$, router, closeAllSheets } from './ui.js';
import { renderToday } from './views/today.js';
import { renderFood, getFoodDate } from './views/food.js';
import { renderSport } from './views/sport.js';
import { renderProgress } from './views/progress.js';
import { renderSetup } from './views/setup.js';
import { openQuickAdd } from './views/quickadd.js';
import { openOnboarding } from './views/onboarding.js';

const VIEWS = { today: renderToday, food: renderFood, sport: renderSport, progress: renderProgress, setup: renderSetup };
const WITH_QBAR = new Set(['today', 'food']);
const app = $('#app');

function render(scrollTop = true) {
  const tab = router.tab;
  (VIEWS[tab] || renderToday)(app);
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const showBar = WITH_QBAR.has(tab);
  $('#qbar').classList.toggle('hidden', !showBar);
  $('#qfade').classList.toggle('hidden', !showBar);
  app.classList.toggle('no-qbar', !showBar);
  if (scrollTop) window.scrollTo(0, 0);
}

router.go = (tab) => {
  if (tab !== router.tab) router.prev = router.tab;
  router.tab = tab;
  closeAllSheets();
  render(true);
};
router.rerender = () => {
  const y = window.scrollY;
  render(false);
  window.scrollTo(0, y);
};

function quickKey() { return router.tab === 'food' ? getFoodDate() : store.todayKey(); }

function init() {
  injectIcons();
  store.load();
  $$('.nav-btn').forEach(b => {
    b.querySelector('[data-ic]').innerHTML = icon(b.querySelector('[data-ic]').dataset.ic);
    b.onclick = () => router.go(b.dataset.tab);
  });
  $('#q-plus').innerHTML = icon('plus');
  $('#q-mic').innerHTML = icon('mic');
  $('#q-plus').onclick = () => openQuickAdd({ key: quickKey() });
  $('#q-text').onclick = () => openQuickAdd({ key: quickKey() });
  $('#q-mic').onclick = () => openQuickAdd({ key: quickKey(), voice: true });

  render(true);
  if (!store.isOnboarded()) openOnboarding();

  // Beim Zurückkehren in die App (neuer Tag, Timer) neu zeichnen
  document.addEventListener('visibilitychange', () => { if (!document.hidden) router.rerender(); });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', init);
