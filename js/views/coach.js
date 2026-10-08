// ============================================================================
// Coach – Chat mit Claude, der Fassis Daten kennt. Fragen beantworten, Essen
// vorschlagen und alles Erzählte direkt eintragen. Dazu der Wochenrückblick.
// ============================================================================
import * as store from '../store.js';
import { askCoach, applyItems, describe, chatHistory, pushChat, clearChat, weeklyReview, getReview, hasAI } from '../assistant.js';
import { weekStart } from '../game.js';
import { PERSONA } from '../persona.js';
import { icon } from '../icons.js';
import { $, $$, esc, router, toast, haptic, confetti } from '../ui.js';
import { openAiSetup } from './aisetup.js';
import { afterChange } from './today.js';

const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const STARTERS = [
  'Was soll ich heute Abend essen?',
  'Wie läuft meine Woche bisher?',
  'Ich hab mittags eine Bowl mit Hähnchen gegessen und 1 L Wasser getrunken',
  'Wie schaffe ich es, abends nicht mehr zu snacken?',
  'Was kann ich heute fürs Knie tun?',
];
let busy = false;
let draft = '';

function itemsHtml(items, applied, idx) {
  const groups = {};
  for (const it of items) { const d = describe(it); (groups[d.area] = groups[d.area] || []).push({ it, d }); }
  const today = store.todayKey();
  return `<div class="log-card ${applied ? 'applied' : ''}">
    ${Object.entries(groups).map(([area, list]) => `<div class="log-area">${esc(area)}</div>${list.map(({ it, d }) => `
      <div class="log-row"><span class="log-ic">${icon(d.icon)}</span><span class="log-main"><b>${esc(d.title)}${d.isNew ? '<em class="qa-new">neu</em>' : ''}</b><span>${esc(d.sub)}${it.day !== today ? ` · ${esc(store.formatDateLabel(it.day))}` : ''}</span></span></div>`).join('')}`).join('')}
    ${applied ? `<div class="log-done">${icon('check')}Eingetragen</div>` : `<button class="btn volt block sm" data-apply="${idx}">${icon('check')}Alles eintragen</button>`}
  </div>`;
}

function msgHtml(m, i) {
  if (m.role === 'user') return `<div class="msg me"><div class="bub">${esc(m.text)}</div></div>`;
  return `<div class="msg ai"><div class="bub">${esc(m.text).replace(/\n/g, '<br>')}</div>
    ${m.items && m.items.length ? itemsHtml(m.items, m.applied, i) : ''}
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
      <div class="vh-actions">${hist.length ? `<button class="icon-btn" id="ch-clear" aria-label="Verlauf löschen">${icon('trash')}</button>` : ''}<button class="icon-btn" data-go="setup" aria-label="Einstellungen">${icon('sliders')}</button></div></div>
    ${!ai ? `<div class="card coach-setup">
        <div class="ch-title" style="margin-bottom:6px">Dein Coach braucht einen Claude-Key</div>
        <p class="hint">Dann kannst du hier alles fragen („Was esse ich heute Abend?") und einfach erzählen, was war – er trägt Essen, Training, Schlaf und Knie selbst ein.</p>
        <button class="btn volt block" id="ch-setup">${icon('key')}Einrichten</button></div>` : ''}
    ${reviewCard()}
    <div class="chat" id="chat">
      ${hist.length ? hist.map(msgHtml).join('') : `<div class="msg ai"><div class="bub">Hey ${esc(PERSONA.name)}. Frag mich alles zu Essen, Training und Knie – oder erzähl einfach, was du heute gegessen und gemacht hast. Ich trag's dann ein.</div></div>`}
      ${busy ? '<div class="msg ai"><div class="bub typing"><i></i><i></i><i></i></div></div>' : ''}
    </div>
    ${!hist.length || (hist[hist.length - 1].quick || []).length ? `<div class="hscroll starters">${(hist.length ? hist[hist.length - 1].quick || [] : STARTERS).map(q => `<button class="chipbtn" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
  </div>
  <div class="cbar" id="cbar">
    <textarea id="c-in" rows="1" placeholder="${ai ? 'Frag oder erzähl …' : 'Erst Claude-Key einrichten'}" ${ai ? '' : 'disabled'}>${esc(draft)}</textarea>
    <button class="c-mic" id="c-mic" aria-label="Sprechen" ${ai ? '' : 'disabled'}>${icon('mic')}</button>
    <button class="c-send" id="c-send" aria-label="Senden" ${ai ? '' : 'disabled'}>${icon('send')}</button>
  </div>`;
  wire(app);
  const chat = $('#chat', app);
  if (chat && hist.length) requestAnimationFrame(() => window.scrollTo(0, document.body.scrollHeight));
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
  inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(inp.value); } };
  grow();
  $('#c-send', app).onclick = () => send(inp.value);
  $$('[data-q]', app).forEach(b => b.onclick = () => send(b.dataset.q));
  $$('[data-apply]', app).forEach(b => b.onclick = () => apply(Number(b.dataset.apply)));
  $$('[data-retry]', app).forEach(b => b.onclick = () => {
    const h = chatHistory();
    const lastUser = [...h].reverse().find(m => m.role === 'user');
    h.splice(Number(b.dataset.retry), 1); store.save();
    if (lastUser) { h.splice(h.lastIndexOf(lastUser), 1); store.save(); send(lastUser.text); }
  });
  $('#c-mic', app).onclick = () => voice(inp);
}

async function send(text) {
  text = String(text || '').trim();
  if (!text || busy) return;
  if (!hasAI()) return openAiSetup(() => router.rerender());
  const history = chatHistory().map(m => ({ role: m.role, text: m.text }));
  pushChat({ role: 'user', text });
  draft = '';
  busy = true;
  router.rerender();
  try {
    const r = await askCoach(text, { mode: 'chat', history });
    pushChat({ role: 'ai', text: r.reply || (r.items.length ? 'Hab ich – schau kurz drüber:' : '…'), items: r.items, quick: r.quick });
  } catch (e) {
    pushChat({ role: 'ai', text: e.message || 'Da ist was schiefgelaufen.', error: true });
  }
  busy = false;
  if (router.tab === 'coach') router.rerender();
  haptic(6);
}

function apply(idx) {
  const h = chatHistory();
  const m = h[idx];
  if (!m || !m.items || m.applied) return;
  const key = store.todayKey();
  const before = store.dayPillars(key).overall;
  const undo = applyItems(m.items);
  m.applied = true; store.save();
  afterChange(key);
  if (before < 100 && store.dayPillars(key).overall >= 100) confetti();
  toast(`${m.items.length} ${m.items.length === 1 ? 'Eintrag' : 'Einträge'} gespeichert`, 'Rückgängig', () => { undo(); m.applied = false; store.save(); router.rerender(); });
}

let rec = null;
function voice(inp) {
  if (!SR) { inp.focus(); toast('Tippe auf das Mikrofon deiner Tastatur und sprich los'); return; }
  if (rec) { try { rec.stop(); } catch (e) { /* ok */ } return; }
  try {
    rec = new SR();
    rec.lang = 'de-DE'; rec.interimResults = true; rec.continuous = false;
    const base = inp.value.trim() ? inp.value.trim() + ' ' : '';
    let heard = '';
    rec.onresult = (e) => { heard = ''; for (const r of e.results) heard += r[0].transcript; inp.value = base + heard; draft = inp.value; };
    rec.onerror = () => { rec = null; $('#c-mic') && $('#c-mic').classList.remove('on'); };
    rec.onend = () => { rec = null; const b = $('#c-mic'); if (b) b.classList.remove('on'); if (heard.trim()) send(inp.value); };
    rec.start();
    $('#c-mic').classList.add('on');
    haptic();
  } catch (e) { rec = null; inp.focus(); toast('Spracheingabe nicht verfügbar – nutze das Tastatur-Mikro'); }
}
