// ============================================================================
// Mehr – alles, was nicht jeden Tag gebraucht wird: Dashboard, Essen, Sport,
// was sich der Coach gemerkt hat, Einstellungen.
// ============================================================================
import * as store from '../store.js';
import { levelInfo, totalXP } from '../game.js';
import { trainingWindow, fmtH } from '../planner.js';
import { icon } from '../icons.js';
import { $, $$, esc, de, router, openSheet, sheetHead, toast } from '../ui.js';

export function renderMore(app) {
  const key = store.todayKey();
  const tot = store.computeTotals(key);
  const mt = store.macroTargets(key);
  const left = Math.round(mt.kcal - tot.kcal);
  const tr = trainingWindow(key);
  const done = store.sessionsFor(key);
  const lv = levelInfo(totalXP());
  const w = store.currentWeight();
  const notes = store.getNotes();
  const row = (id, ic, title, sub) => `<button class="row big" data-more="${id}"><span class="row-ic">${icon(ic)}</span>
    <span class="row-main"><div class="row-t">${title}</div>${sub ? `<div class="row-s">${esc(sub)}</div>` : ''}</span><span class="row-end">${icon('chev')}</span></button>`;
  app.innerHTML = `<div class="view">
    <div class="vh"><div><div class="vh-title">Mehr</div></div></div>
    <div class="rows">
      ${row('progress', 'chart', 'Dashboard', `Level ${lv.level} · ${lv.rank}${w ? ` · ${de(w, 1)} kg` : ''}`)}
    </div>
    <div class="rows">
      ${row('food', 'apple', 'Essen', `${de(Math.abs(left))} kcal ${left >= 0 ? 'übrig' : 'drüber'} · ${de(Math.max(0, mt.protein - tot.protein))} g Protein offen`)}
      ${row('sport', 'dumbbell', 'Sport', done.length ? `Heute: ${done.map(x => x.title).join(', ')} ✓` : tr ? `Heute: ${tr.title} · ${fmtH(tr.start)}` : 'Heute frei')}
    </div>
    <div class="rows">
      ${row('notes', 'bulb', 'Das weiß dein Coach', notes.length ? `${notes.length} ${notes.length === 1 ? 'Sache' : 'Sachen'} gemerkt` : 'noch nichts gemerkt')}
      ${row('setup', 'sliders', 'Einstellungen', 'Ziele, Plan, Supplements, Claude')}
    </div>
  </div>`;
  $$('[data-more]', app).forEach(b => b.onclick = () => (b.dataset.more === 'notes' ? openNotes() : router.go(b.dataset.more)));
}

function openNotes() {
  const sheet = openSheet(`${sheetHead('Das weiß dein Coach', 'Merkt er sich aus euren Gesprächen')}<div class="sheet-body" id="nt-b"></div>`, { tall: true });
  const draw = () => {
    const notes = store.getNotes();
    $('#nt-b', sheet).innerHTML = notes.length
      ? `<div class="rows">${notes.slice().reverse().map(n => `<div class="row"><span class="row-ic">${icon('bulb')}</span><span class="row-main"><div class="row-t" style="font-weight:700">${esc(n.text)}</div></span><button class="icon-btn" data-rmnote="${n.id}" aria-label="Vergessen">${icon('x')}</button></div>`).join('')}</div>
         <p class="hint">Antippen von ✕ = vergessen. Neues merkt er sich, wenn du es ihm erzählst („Ich mag keinen Lachs").</p>`
      : `<div class="empty">Noch nichts.<br>Erzähl dem Coach einfach, was du magst, was nicht, oder wie es dem Knie geht – er merkt sich das.</div>`;
    $$('[data-rmnote]', sheet).forEach(b => b.onclick = () => { store.removeNote(b.dataset.rmnote); toast('Vergessen'); draw(); router.rerender(); });
  };
  draw();
}
