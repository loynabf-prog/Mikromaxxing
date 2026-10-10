// ============================================================================
// Coach – Chat mit Claude, der Fassis Daten kennt. Fragen beantworten, Essen
// vorschlagen und alles Erzählte direkt eintragen. Dazu der Wochenrückblick.
// ============================================================================
import * as store from '../store.js';
import { askCoach, applyItems, describe, chatHistory, pushChat, clearChat, weeklyReview, getReview, hasAI } from '../assistant.js';
import { openQuickAdd } from './quickadd.js';
import { createDictation, hasVoice } from '../voice.js';
import { weekStart } from '../game.js';
import { PERSONA } from '../persona.js';
import { icon } from '../icons.js';
import { $, $$, esc, router, toast, haptic, confetti } from '../ui.js';
import { openAiSetup } from './aisetup.js';
import { afterChange } from './today.js';

const STARTERS = [
  'Was soll ich heute Abend essen?',
  'Wie läuft meine Woche bisher?',
  'Ich hab mittags eine Bowl mit Hähnchen gegessen und 1 L Wasser getrunken',
  'Wie schaffe ich es, abends nicht mehr zu snacken?',
  'Was kann ich heute fürs Knie tun?',
];
let busy = false;
let draft = '';
let pending = null;            // { voice } – von der Eingabeleiste
const undos = new Map();       // Nachrichten-ts → Rückgängig (nur in dieser Sitzung)
let openLog = null;            // aufgeklappte Eintrags-Liste (ts)

// Von überall: in den Coach springen (optional direkt mit Sprechen)
export function openCoach({ voice = false } = {}) {
  pending = { voice };
  router.go('coach');
}

function itemsHtml(m, idx) {
  const items = m.items;
  if (!m.applied) return `<div class="log-card"><div class="log-sum">${esc(items.length)} ${items.length === 1 ? 'Eintrag' : 'Einträge'} nicht gespeichert</div><button class="btn volt block sm" data-apply="${idx}">${icon('check')}Jetzt eintragen</button></div>`;
  const open = openLog === m.ts;
  const today = store.todayKey();
  const names = items.map(it => describe(it).title);
  return `<div class="log-card applied">
    <button class="log-sum" data-logt="${m.ts}">${icon('check')}<span><b>Eingetragen</b> · ${esc(names.slice(0, 3).join(', '))}${names.length > 3 ? ` +${names.length - 3}` : ''}</span>${icon(open ? 'chevD' : 'chev')}</button>
    ${open ? items.map(it => { const d = describe(it); return `<div class="log-row"><span class="log-ic">${icon(d.icon)}</span><span class="log-main"><b>${esc(d.title)}${d.isNew ? '<em class="qa-new">neu</em>' : ''}</b><span>${esc(d.sub)}${it.day !== today ? ` · ${esc(store.formatDateLabel(it.day))}` : ''}</span></span></div>`; }).join('') : ''}
    ${undos.has(m.ts) ? `<button class="log-undo" data-undo="${m.ts}">${icon('undo')}Rückgängig</button>` : ''}
  </div>`;
}

function msgHtml(m, i) {
  if (m.role === 'user') return `<div class="msg me"><div class="bub">${esc(m.text)}</div></div>`;
  return `<div class="msg ai"><div class="bub">${esc(m.text).replace(/\n/g, '<br>')}</div>
    ${m.items && m.items.length ? itemsHtml(m, i) : ''}
    ${m.error ? `<button class="chipbtn" data-retry="${i}">${icon('refresh')}Nochmal</button>` : ''}
  </div>`;
}

function reviewCard() {
  if (!hasAI()) return '';
  const thisWk = weekStart(store.todayKey());
  const lastWk = store.shiftDate(thisWk, -7);
  const rev = getReview(lastWk);
  const hasData = Array.from({ length: 7 }, (_, i) => store.getState().log[store.shiftDate(lastWk, i)]).some(d => d && (d.entries.length || (d.sessions || []).length));
  if (!rev && !hasData) return '';
  if (!rev) return `<button class="review-cta" id="rv-make">${icon('spark')}<span><b>Wochenrückblick</b><span>Letzte Woche auswerten lassen – 3 Tipps für diese Woche</span></span>${icon('chev')}</button>`;
  return `<div class="review">
    <div class="review-k">Wochenrückblick · ab ${store.dateOf(lastWk).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</div>
    <div class="review-h">${esc(rev.headline)}</div>
    ${rev.good && rev.good.length ? `<div class="review-l good">${rev.good.map(x => `<div>${icon('check')}<span>${esc(x)}</span></div>`).join('')}</div>` : ''}
    ${rev.focus && rev.focus.length ? `<div class="review-l focus">${rev.focus.map((x, i) => `<div><b>${i + 1}</b><span>${esc(x)}</span></div>`).join('')}</div>` : ''}
    ${rev.mission ? `<div class="review-m">${icon('trophy')}<span>${esc(rev.mission)}</span></div>` : ''}
  </div>`;
}

export function renderCoach(app) {
  const hist = chatHistory();
  const ai = hasAI();
  app.innerHTML = `<div class="view coach-view">
    <div class="vh"><div><div class="vh-date">Kennt deinen Tag</div><div class="vh-title">Coach</div></div>
      <div class="vh-actions">${hist.length ? `<button class="icon-btn" id="ch-clear" aria-label="Verlauf löschen">${icon('trash')}</button>` : ''}</div></div>
    ${!ai ? `<div class="card coach-setup">
        <div class="ch-title" style="margin-bottom:6px">Einmal Claude verbinden</div>
        <p class="hint">Dann versteht dein Coach alles, was du erzählst, und trägt es selbst ein. Bis dahin kannst du unten trotzdem schreiben – einfache Sachen erkenne ich auch so.</p>
        <button class="btn volt block" id="ch-setup">${icon('key')}Verbinden</button></div>` : ''}
    ${reviewCard()}
    <div class="chat" id="chat">
      ${hist.length ? hist.map(msgHtml).join('') : `<div class="msg ai"><div class="bub">Hey ${esc(PERSONA.name)}. Erzähl mir einfach, was du gegessen, trainiert oder geschlafen hast – ich trag alles ein. Oder frag mich, was du als Nächstes essen sollst.</div></div>`}
      ${busy ? '<div class="msg ai"><div class="bub typing"><i></i><i></i><i></i></div></div>' : ''}
    </div>
    ${!hist.length || (hist[hist.length - 1].quick || []).length ? `<div class="hscroll starters">${(hist.length ? hist[hist.length - 1].quick || [] : STARTERS).map(q => `<button class="chipbtn" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
  </div>
  <div class="cbar" id="cbar">
    <button class="c-plus" id="c-plus" aria-label="Scannen, suchen, schnell eintragen">${icon('plus')}</button>
    <textarea id="c-in" rows="1" placeholder="Erzähl oder frag …">${esc(draft)}</textarea>
    <button class="c-mic" id="c-mic" aria-label="Sprechen">${icon('mic')}</button>
    <button class="c-send" id="c-send" aria-label="Senden">${icon('send')}</button>
    <div class="c-rec" id="c-rec"><i></i><span>Ich höre zu – Pausen sind okay. Tippe auf <b>Fertig</b>, wenn du durch bist.</span></div>
  </div>`;
  wire(app);
  recUI();
  const chat = $('#chat', app);
  if (chat && hist.length) requestAnimationFrame(() => window.scrollTo(0, document.body.scrollHeight));
  if (pending) {
    const pv = pending; pending = null;
    const inp = $('#c-in', app);
    if (pv.voice) voice(inp); else setTimeout(() => inp.focus(), 50);
  }
}

function wire(app) {
  $$('[data-go]', app).forEach(b => b.onclick = () => router.go(b.dataset.go));
  const su = $('#ch-setup', app);
  if (su) su.onclick = () => openAiSetup(() => router.rerender());
  const cl = $('#ch-clear', app);
  if (cl) cl.onclick = () => { if (confirm('Chatverlauf löschen?')) { clearChat(); router.rerender(); } };
  const mk = $('#rv-make', app);
  if (mk) mk.onclick = async () => {
    mk.disabled = true; mk.innerHTML = `${icon('loader', 'spin')}<span><b>Werte deine Woche aus …</b></span>`;
    try { await weeklyReview(store.shiftDate(weekStart(store.todayKey()), -7)); } catch (e) { toast(e.message || 'Hat nicht geklappt'); }
    router.rerender();
  };
  const inp = $('#c-in', app);
  const grow = () => { inp.style.height = 'auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; };
  inp.oninput = () => { draft = inp.value; grow(); };
  inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (dict.on) dict.finish(); else send(inp.value); } };
  grow();
  $('#c-send', app).onclick = () => (dict.on ? dict.finish() : send(inp.value));
  $$('[data-q]', app).forEach(b => b.onclick = () => send(b.dataset.q));
  $$('[data-apply]', app).forEach(b => b.onclick = () => apply(Number(b.dataset.apply)));
  $$('[data-logt]', app).forEach(b => b.onclick = () => { const t = Number(b.dataset.logt); openLog = openLog === t ? null : t; router.rerender(); });
  $$('[data-undo]', app).forEach(b => b.onclick = () => {
    const t = Number(b.dataset.undo);
    const m = chatHistory().find(x => x.ts === t);
    const u = undos.get(t);
    if (!m || !u) return;
    u(); undos.delete(t); m.applied = false; store.save();
    afterChange(store.todayKey());
    toast('Rückgängig gemacht');
  });
  $('#c-plus', app).onclick = () => dict.on ? dict.cancel() : openQuickAdd({ key: store.todayKey(), onDone: () => router.rerender() });
  $$('[data-retry]', app).forEach(b => b.onclick = () => {
    const h = chatHistory();
    const lastUser = [...h].reverse().find(m => m.role === 'user');
    h.splice(Number(b.dataset.retry), 1); store.save();
    if (lastUser) { h.splice(h.lastIndexOf(lastUser), 1); store.save(); send(lastUser.text); }
  });
  $('#c-mic', app).onclick = () => (dict.on ? dict.finish() : voice(inp));
}

async function send(text) {
  text = String(text || '').trim();
  if (!text || busy) return;
  if (!hasAI()) { draft = ''; const inp = $('#c-in'); if (inp) inp.value = ''; return openQuickAdd({ key: store.todayKey(), text }); }
  const history = chatHistory().map(m => ({ role: m.role, text: m.text }));
  pushChat({ role: 'user', text });
  draft = '';
  busy = true;
  router.rerender();
  try {
    const r = await askCoach(text, { mode: 'chat', history });
    pushChat({ role: 'ai', text: r.reply || (r.items.length ? 'Hab ich eingetragen.' : '…'), items: r.items, quick: r.quick });
    if (r.items.length) apply(chatHistory().length - 1, true);
  } catch (e) {
    pushChat({ role: 'ai', text: e.message || 'Da ist was schiefgelaufen.', error: true });
  }
  busy = false;
  if (router.tab === 'coach') router.rerender();
  haptic(6);
}

function apply(idx, quiet = false) {
  const h = chatHistory();
  const m = h[idx];
  if (!m || !m.items || m.applied) return;
  const key = store.todayKey();
  const before = store.dayPillars(key).overall;
  const undo = applyItems(m.items);
  m.applied = true; store.save();
  undos.set(m.ts, undo);
  afterChange(key);
  if (before < 100 && store.dayPillars(key).overall >= 100) confetti();
  if (!quiet) toast(`${m.items.length} ${m.items.length === 1 ? 'Eintrag' : 'Einträge'} gespeichert`);
}

// --- Sprechen: hört zu, bis „Fertig" gedrückt wird ------------------------------------
const dict = createDictation({
  onText: (t) => { draft = t; const inp = $('#c-in'); if (inp) { inp.value = t; inp.style.height = 'auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; } },
  onState: () => recUI(),
  onDone: (t) => { if (t) send(t); },
  onError: (msg) => toast(msg),
});
function recUI() {
  const bar = $('#cbar');
  if (!bar) return;
  const on = dict.on;
  bar.classList.toggle('listening', on);
  const rh = $('#c-rec'); if (rh) rh.classList.toggle('on', on);
  const plus = $('#c-plus'); if (plus) { plus.innerHTML = icon(on ? 'x' : 'plus'); plus.setAttribute('aria-label', on ? 'Abbrechen' : 'Scannen, suchen, schnell eintragen'); }
  const sendB = $('#c-send'); if (sendB) sendB.innerHTML = on ? `${icon('check')}<span>Fertig</span>` : icon('send');
  const inp = $('#c-in'); if (inp) inp.placeholder = on ? 'Ich höre zu …' : 'Erzähl oder frag …';
}
function voice(inp) {
  if (!hasVoice() || !dict.start(inp.value)) { inp.focus(); toast('Tippe auf das Mikrofon deiner Tastatur und sprich los'); return; }
  haptic();
}
