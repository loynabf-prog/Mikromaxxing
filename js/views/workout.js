// ============================================================================
// Workout-Modus – dunkler Fokus-Screen, Satz für Satz
// ============================================================================
import * as store from '../store.js';
import { RPE_LABELS } from '../data.js';
import { icon } from '../icons.js';
import { $, $$, esc, de, router, openSheet, closeSheet, sheetHead, toast, haptic, beep, unlockAudio, fmtClock, confetti } from '../ui.js';

let el = null;
let timer = null;
let view = 'exercise';      // 'exercise' | 'list' | 'finish'
let draft = {};             // nächster Satz je Übung: { w, r, s }
let prFlags = new Set();    // `${exId}:${satzIndex}` mit neuem Rekord
let restWasRunning = false;
let finishRpe = 7;

export function openWorkout(key = store.todayKey(), weekday = store.weekdayOf(key)) {
  let w = store.getActiveWorkout();
  if (!w) w = store.startWorkout(key, weekday);
  if (!w) { toast('Heute steht kein Gym-Workout an – trag deine Einheit ein'); return; }
  unlockAudio();
  teardown();
  el = document.createElement('div');
  el.className = 'wo';
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  view = 'exercise';
  render();
  timer = setInterval(tick, 1000);
}

function teardown() {
  clearInterval(timer); timer = null;
  if (el) el.remove();
  el = null;
  document.body.style.overflow = '';
}

function cur() { const w = store.getActiveWorkout(); return { w, ex: w ? w.exercises[w.idx] : null }; }
function setsOf(w, exId) { return w.log[exId] || []; }

function nextDraft(w, ex) {
  if (draft[ex.id]) return draft[ex.id];
  const done = setsOf(w, ex.id);
  const last = done[done.length - 1];
  if (ex.load === 'time') return (draft[ex.id] = { s: last ? last.s : ex.target.s || ex.secs });
  const tg = ex.target || {};
  return (draft[ex.id] = {
    w: last ? last.w : tg.w != null ? tg.w : (ex.load === 'bw' ? 0 : 20),
    r: last ? last.r : tg.r || ex.reps[0],
  });
}

function setLabel(ex, x) {
  if (ex.load === 'time') return `${x.s} s`;
  const wt = ex.load === 'bw' ? (x.w ? `+${store.fmtKg(x.w)} kg` : 'Körpergewicht') : `${store.fmtKg(x.w)} kg`;
  return `${wt} × ${x.r}`;
}

function render() {
  if (!el) return;
  const { w, ex } = cur();
  if (!w) { teardown(); return; }
  if (view === 'finish') return renderFinish(w);
  if (view === 'list') return renderList(w);

  const done = setsOf(w, ex.id);
  const d = nextDraft(w, ex);
  const allDone = done.length >= ex.sets;
  const isLast = w.idx === w.exercises.length - 1;
  const tagCls = (ex.t || '').toLowerCase();
  const lastPerf = store.lastPerformance(ex.id);
  const lastStr = lastPerf && lastPerf.sets[done.length] ? ` · zuletzt ${setLabel(ex, lastPerf.sets[done.length])}` : '';

  el.innerHTML = `<div class="wo-inner">
    <div class="wo-top">
      <button class="wo-btn" id="wo-close" aria-label="Schließen">${icon('x')}</button>
      <div class="wo-tt"><b>${esc(w.title)}</b><span id="wo-el">${fmtClock((Date.now() - w.startedAt) / 1000)}</span></div>
      <button class="wo-btn" id="wo-list" aria-label="Übersicht">${icon('list')}</button>
    </div>
    <div class="wo-segs">${w.exercises.map((e, i) => `<button data-jump="${i}" class="${setsOf(w, e.id).length >= e.sets ? 'd' : ''} ${i === w.idx ? 'c' : ''}" aria-label="${esc(e.n)}"></button>`).join('')}</div>

    <span class="wo-tag ${tagCls}">${esc(ex.t || 'Übung')}</span>
    <div class="wo-name">${esc(ex.n)}</div>
    <div class="wo-plan">Übung ${w.idx + 1} von ${w.exercises.length} · ${ex.sets} × ${ex.load === 'time' ? `${ex.secs} s` : `${ex.reps[0]}–${ex.reps[1]} Wdh`} · Pause ${fmtClock(ex.rest)}</div>
    ${ex.target && ex.target.note ? `<div class="wo-coach">${icon('spark')}<div>${esc(ex.target.note)}</div></div>` : ''}

    ${done.map((x, i) => `<div class="wo-set"><span class="n">${i + 1}</span><span class="v">${setLabel(ex, x)}</span>
      ${prFlags.has(ex.id + ':' + i) ? '<span class="pr">REKORD</span>' : ''}
      ${i === done.length - 1 ? `<button class="undo" id="wo-undo" aria-label="Satz zurücknehmen">${icon('undo')}</button>` : icon('check')}</div>`).join('')}

    ${!allDone ? `<div class="wo-active">
      <div class="lbl">Satz ${done.length + 1} von ${ex.sets}${lastStr}</div>
      <div class="wo-steppers ${ex.load === 'time' ? 'one' : ''}">
        ${ex.load === 'time' ? stepper('s', d.s, 'SEKUNDEN') : stepper('w', store.fmtKg(d.w), ex.load === 'bw' ? 'ZUSATZ KG' : 'KG') + stepper('r', d.r, 'WDH')}
      </div>
      <button class="wo-go" id="wo-log">${icon('check')}Satz ${done.length + 1} fertig</button>
    </div>` : `<div class="wo-active" style="text-align:center">
      <div class="lbl" style="margin-bottom:10px">Alle ${ex.sets} Sätze geschafft</div>
      <button class="wo-go next" id="wo-next">${isLast ? 'Workout abschließen' : 'Nächste Übung'}${icon('chev')}</button>
      <button class="wo-btn" id="wo-extra" style="width:auto;padding:0 14px;border-radius:12px;margin:10px auto 0;font-size:13px;font-weight:800">+ Extra-Satz</button>
    </div>`}

    <div id="wo-rest">${restHtml(w)}</div>

    <div class="wo-nav">
      <button id="wo-prev" ${w.idx === 0 ? 'disabled style="opacity:.4"' : ''}>${icon('chevL')}Zurück</button>
      <button id="wo-fwd">${isLast ? 'Abschließen' : 'Weiter'}${icon('chev')}</button>
    </div>
  </div>`;
  wire(w, ex);
}

function stepper(field, val, label) {
  return `<div class="wo-stp"><button data-f="${field}" data-d="-1" aria-label="weniger">${icon('minus')}</button>
    <div class="val"><b>${val}</b><small>${label}</small></div>
    <button data-f="${field}" data-d="1" aria-label="mehr">${icon('plus')}</button></div>`;
}

function restHtml(w) {
  if (!w.restUntil) return '';
  const left = Math.max(0, Math.round((w.restUntil - Date.now()) / 1000));
  const total = w.restFor || 90;
  const c = 2 * Math.PI * 23;
  const off = c * (1 - left / total);
  if (left <= 0) {
    return `<div class="wo-rest done"><svg class="rr" viewBox="0 0 54 54"><circle cx="27" cy="27" r="23" fill="none" stroke="#34D399" stroke-width="5"/></svg>
      <div class="t"><b>Los!</b><span>Pause vorbei</span></div></div>`;
  }
  return `<div class="wo-rest"><svg class="rr" viewBox="0 0 54 54"><circle cx="27" cy="27" r="23" fill="none" stroke="#22252D" stroke-width="5"/>
    <circle cx="27" cy="27" r="23" fill="none" stroke="#60A5FA" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 27 27)"/></svg>
    <div class="t"><b>${fmtClock(left)}</b><span>Pause · Ziel ${fmtClock(total)}</span></div>
    <button class="skip" id="wo-skip">Überspringen</button></div>`;
}

function tick() {
  const { w } = cur();
  if (!w || !el) return;
  const elT = $('#wo-el', el);
  if (elT) elT.textContent = fmtClock((Date.now() - w.startedAt) / 1000);
  if (w.restUntil) {
    const running = w.restUntil > Date.now();
    if (restWasRunning && !running) { beep(2, 990); }
    restWasRunning = running;
    const r = $('#wo-rest', el);
    if (r) { r.innerHTML = restHtml(w); const sk = $('#wo-skip', el); if (sk) sk.onclick = () => { store.skipRest(); restWasRunning = false; render(); }; }
    if (!running && Date.now() - w.restUntil > 4000) { store.skipRest(); render(); }
  }
}

function wire(w, ex) {
  $('#wo-close', el).onclick = () => openCloseSheet();
  $('#wo-list', el).onclick = () => { view = 'list'; render(); };
  $$('[data-jump]', el).forEach(b => b.onclick = () => { store.setWorkoutIndex(Number(b.dataset.jump)); render(); });
  $$('[data-f]', el).forEach(b => b.onclick = () => {
    const d = nextDraft(w, ex);
    const dir = Number(b.dataset.d);
    if (b.dataset.f === 'w') d.w = Math.max(0, Math.round((d.w + dir * 2.5) * 10) / 10);
    if (b.dataset.f === 'r') d.r = Math.max(1, d.r + dir);
    if (b.dataset.f === 's') d.s = Math.max(5, d.s + dir * 5);
    haptic(4); render();
  });
  const log = $('#wo-log', el);
  if (log) log.onclick = () => {
    unlockAudio();
    const d = nextDraft(w, ex);
    const set = ex.load === 'time' ? { s: d.s } : { w: d.w, r: d.r };
    const res = store.logWorkoutSet(ex.id, set);
    const idx = setsOf(store.getActiveWorkout(), ex.id).length - 1;
    if (res && res.pr) { prFlags.add(ex.id + ':' + idx); toast('Neuer Rekord!'); beep(3, 1180); }
    restWasRunning = true;
    haptic(15); render();
  };
  const undo = $('#wo-undo', el);
  if (undo) undo.onclick = () => {
    const n = setsOf(w, ex.id).length - 1;
    prFlags.delete(ex.id + ':' + n);
    store.undoWorkoutSet(ex.id); restWasRunning = false; render();
  };
  const skip = $('#wo-skip', el);
  if (skip) skip.onclick = () => { store.skipRest(); restWasRunning = false; render(); };
  const next = $('#wo-next', el);
  if (next) next.onclick = () => advance(w);
  const extra = $('#wo-extra', el);
  if (extra) extra.onclick = () => { ex.sets += 1; store.save(); render(); };
  const prev = $('#wo-prev', el);
  if (prev) prev.onclick = () => { store.setWorkoutIndex(w.idx - 1); render(); };
  $('#wo-fwd', el).onclick = () => advance(w);
}

function advance(w) {
  if (w.idx >= w.exercises.length - 1) { view = 'finish'; render(); return; }
  store.setWorkoutIndex(w.idx + 1);
  store.skipRest(); restWasRunning = false;
  render();
}

function renderList(w) {
  el.innerHTML = `<div class="wo-inner">
    <div class="wo-top"><button class="wo-btn" id="wo-back" aria-label="Zurück">${icon('chevL')}</button>
      <div class="wo-tt"><b>Übersicht</b><span>${esc(w.title)}</span></div><span style="width:38px"></span></div>
    <div class="wo-list">${w.exercises.map((e, i) => {
      const n = setsOf(w, e.id).length;
      return `<button class="wo-li ${n >= e.sets ? 'done' : ''} ${i === w.idx ? 'cur' : ''}" data-go="${i}">
        <span class="n">${n >= e.sets ? icon('check') : i + 1}</span><span class="nm">${esc(e.n)}</span><span class="c">${n}/${e.sets}</span></button>`;
    }).join('')}</div>
    <button class="wo-go" id="wo-fin" style="margin-top:18px">${icon('check')}Workout abschließen</button>
  </div>`;
  $('#wo-back', el).onclick = () => { view = 'exercise'; render(); };
  $$('[data-go]', el).forEach(b => b.onclick = () => { store.setWorkoutIndex(Number(b.dataset.go)); view = 'exercise'; render(); });
  $('#wo-fin', el).onclick = () => { view = 'finish'; render(); };
}

function renderFinish(w) {
  const all = w.exercises.flatMap(e => setsOf(w, e.id).map(x => ({ e, x })));
  const volume = all.reduce((a, { e, x }) => a + (e.load === 'weight' ? (x.w || 0) * (x.r || 0) : 0), 0);
  const minutes = Math.max(1, Math.round((Date.now() - w.startedAt) / 60000));
  const prs = [...prFlags].map(k => { const [id, i] = k.split(':'); const e = w.exercises.find(z => z.id === id); const x = e && setsOf(w, id)[Number(i)]; return e && x ? `${e.n}: ${setLabel(e, x)}` : null; }).filter(Boolean);
  el.innerHTML = `<div class="wo-inner">
    <div class="wo-top"><button class="wo-btn" id="wo-back" aria-label="Zurück">${icon('chevL')}</button><div class="wo-tt"><b>Abschluss</b><span>${esc(w.title)}</span></div><span style="width:38px"></span></div>
    <div class="wo-name" style="margin-top:18px">${all.length ? 'Stark gemacht.' : 'Noch keine Sätze.'}</div>
    <div class="wo-plan">${minutes} Min · ${all.length} Sätze${volume ? ` · ${de(volume)} kg bewegt` : ''}</div>
    ${prs.length ? `<div class="wo-coach">${icon('trophy')}<div><b>${prs.length} neue${prs.length === 1 ? 'r' : ''} Rekord${prs.length === 1 ? '' : 'e'}</b><br>${prs.map(esc).join('<br>')}</div></div>` : ''}
    <div class="lbl" style="margin:18px 0 8px;color:#8B93A1">Wie hart war das Workout insgesamt?</div>
    <div class="rpe">${Array.from({ length: 10 }, (_, i) => `<button data-rpe="${i + 1}" class="${finishRpe === i + 1 ? 'on' : ''}">${i + 1}</button>`).join('')}</div>
    <div class="rpe-label" id="wo-rpel">${finishRpe}/10 · ${RPE_LABELS[finishRpe]}</div>
    <button class="wo-go" id="wo-save" style="margin-top:18px" ${all.length ? '' : 'disabled style="opacity:.4;margin-top:18px"'}>${icon('check')}Workout speichern</button>
  </div>`;
  $('#wo-back', el).onclick = () => { view = 'exercise'; render(); };
  $$('[data-rpe]', el).forEach(b => b.onclick = () => { finishRpe = Number(b.dataset.rpe); haptic(4); render(); });
  $('#wo-save', el).onclick = () => {
    const key = w.key;
    const before = store.dayPillars(key).overall;
    store.finishWorkout(finishRpe);
    prFlags = new Set(); draft = {};
    teardown();
    router.rerender();
    if (before < 100 && store.dayPillars(key).overall >= 100) confetti();
    toast(`Workout gespeichert · ${minutes} Min`);
  };
}

function openCloseSheet() {
  const sheet = openSheet(`${sheetHead('Workout verlassen?')}
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn" id="cs-pause">${icon('pause')}Pausieren – später weitermachen</button>
      <button class="btn ghost" id="cs-finish">${icon('check')}Jetzt abschließen</button>
      <button class="btn danger" id="cs-drop">${icon('trash')}Verwerfen</button>
    </div>`);
  $('#cs-pause', sheet).onclick = () => { closeSheet(); teardown(); router.rerender(); toast('Workout pausiert – auf „Heute" fortsetzen'); };
  $('#cs-finish', sheet).onclick = () => { closeSheet(); view = 'finish'; render(); };
  $('#cs-drop', sheet).onclick = () => {
    if (!confirm('Alle Sätze dieses Workouts verwerfen?')) return;
    store.cancelWorkout(); prFlags = new Set(); draft = {};
    closeSheet(); teardown(); router.rerender();
  };
}
