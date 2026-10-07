// ============================================================================
// Heute – drei Ringe, Coach-Hinweis, Ernährung · Sport · Regeneration
// ============================================================================
import * as store from '../store.js';
import { KNEE_REHA } from '../data.js';
import { icon } from '../icons.js';
import {
  $, $$, esc, de, short, router, ringsSVG, toast, haptic, confetti, openSheet, closeSheet, sheetHead,
  greeting, longDate, downscalePhoto, pickFile, fmtHours, fmtClock, beep, unlockAudio,
} from '../ui.js';
import { openSuppsSheet } from './food.js';
import { openSessionSheet, openStepsSheet } from './sport.js';
import { openWorkout } from './workout.js';
import { openQuickAdd } from './quickadd.js';

export function renderToday(app) {
  const key = store.todayKey();
  const now = new Date();
  const s = store.getState();
  const p = store.dayPillars(key);
  const day = store.getDay(key);
  const streak = store.currentStreak(key);
  const hint = store.coachHints(key, now)[0];
  lastOverall = p.overall;

  app.innerHTML = `<div class="view">
    <div class="vh">
      <div><div class="vh-date">${esc(longDate(now))}</div><div class="vh-title">${greeting(now)}</div></div>
      <div class="vh-actions">
        <span class="streak ${streak ? '' : 'zero'}" title="Tage in Folge">${icon('flame')}${streak}</span>
        <button class="icon-btn" data-go="setup" aria-label="Einstellungen">${icon('sliders')}</button>
      </div>
    </div>

    <div class="hero">
      <button class="rings" id="ring-photo" aria-label="Profilfoto">${ringsSVG(p, { photo: s.profile.photo })}</button>
      <div class="hstats">
        <button class="hs nut" data-go="food"><div class="t"><i></i>Ernährung</div><div class="v num">${p.nutrition}<small>%</small></div></button>
        <button class="hs spo" data-go="sport"><div class="t"><i></i>Sport</div><div class="v num">${p.sport}<small>%</small></div></button>
        <button class="hs reg" data-scroll="regen"><div class="t"><i></i>Regeneration</div><div class="v num">${p.regen}<small>%</small></div></button>
      </div>
    </div>

    ${hint ? coachCard(hint) : ''}
    ${nutritionCard(key, p, day, now)}
    ${sportCard(key, p)}
    ${regenCard(key, p)}
  </div>`;

  wire(app, key, hint);
}

function coachCard(h) {
  return `<button class="coach ${h.tone}" id="coach">
    <span class="coach-ic">${icon(h.icon)}</span>
    <span class="coach-body"><b>${esc(h.title)}</b><span>${esc(h.text)}</span></span>
    ${h.action ? `<span class="coach-go">${icon(h.action.type === 'food' || h.action.type === 'water' ? 'plus' : 'chev')}</span>` : ''}
  </button>`;
}

function nutritionCard(key, p, day, now) {
  const s = store.getState();
  const t = s.profile.targets;
  const parts = store.proteinByPart(key);
  const nowPart = store.partOfHour(now.getHours()).id;
  const supps = s.supplements;
  const taken = supps.filter(x => day.supps[x.id]).length;
  const slot = now.getHours() < 11 ? 'morgens' : now.getHours() < 15 ? 'mittags' : now.getHours() >= 19 ? 'abends' : 'pre';
  const openNow = supps.filter(x => x.time === slot && !day.supps[x.id]).map(x => short(x.name));
  return `<div class="card">
    <div class="ch"><span class="chip nut">${icon('leaf')}Ernährung</span><button class="more" data-go="food">Details${icon('chev')}</button></div>
    <div class="big-row">
      <div><div class="big num">${de(p.totals.protein)}<small>/ ${de(t.protein)} g</small></div><div class="lbl" style="margin-top:6px">Protein</div></div>
      <div style="text-align:right"><div class="mid num">${de(p.totals.kcal)}</div><div class="lbl" style="margin-top:5px">kcal · Ziel ${de(t.kcal)}</div></div>
    </div>
    <div class="pdist">${parts.map(pt => `
      <div class="pd ${pt.id === nowPart ? 'now' : ''}"><div class="bar"><i style="width:${Math.min(100, pt.target ? pt.grams / pt.target * 100 : 0)}%"></i></div>
      <span><b>${pt.grams} g</b> ${pt.label}</span></div>`).join('')}
    </div>
    <div class="minis">
      <div class="mini" id="water-tile" role="button">
        ${icon('drop', 'w')}<div class="mt num">${de((day.water || 0) / 1000, 1)} L<small>von ${de(s.profile.water / 1000, 1)} L</small></div>
        <button class="add" id="water-add" aria-label="250 ml trinken">${icon('plus')}</button>
      </div>
      <button class="mini" data-act="supps">
        ${icon('pill', 'p')}<div class="mt num">${taken} / ${supps.length}<small>${openNow.length ? esc(openNow.join(', ')) : 'Supplements'}</small></div>
      </button>
    </div>
  </div>`;
}

function sportCard(key, p) {
  const plan = store.getTrainingFor(key);
  const sessions = store.sessionsFor(key);
  const active = store.getActiveWorkout();
  const steps = store.getSteps(key);
  const stepGoal = store.getState().profile.stepGoal || 10000;
  const load = store.trainingLoad(key);
  const ng = store.nextGame(key);
  const zoneLabel = { low: 'eher wenig', optimal: 'im grünen Bereich', elevated: 'erhöht', high: 'sehr hoch', none: load.building ? 'baut sich auf' : 'noch keine Daten' }[load.zone];
  const gaugePos = load.ratio != null && !load.building ? Math.min(100, Math.max(0, load.ratio / 2 * 100)) : null;

  let main;
  if (sessions.length) {
    main = sessions.map(x => {
      const st = store.sportType(x.type);
      return `<div class="sess" style="margin-bottom:8px"><span class="ic">${icon(st.icon)}</span>
        <div><div class="t1">${esc(x.title)}</div><div class="t2">${x.min} Min · Intensität ${x.rpe}/10 · Last ${de(store.sessionLoad(x))}</div></div></div>`;
    }).join('');
  } else {
    const ic = !plan ? 'walk' : plan.kind === 'gym' ? 'dumbbell' : plan.kind === 'rest' ? 'walk' : store.sportType(plan.sport).icon;
    main = `<div class="sess"><span class="ic">${icon(ic)}</span>
      <div><div class="t1">${esc(plan ? plan.title : 'Frei')}</div><div class="t2">${esc(plan ? plan.focus || '' : '')}</div></div></div>`;
  }
  let actions;
  if (active) actions = `<button class="btn accent" data-act="workout">${icon('play')}Workout fortsetzen</button>`;
  else if (!sessions.length && plan && plan.kind === 'gym') actions = `<button class="btn accent" data-act="workout">${icon('play')}Workout starten</button><button class="btn ghost" data-act="session">Andere Einheit</button>`;
  else if (!sessions.length && plan && plan.kind === 'sport') actions = `<button class="btn accent" data-act="session" data-sport="${plan.sport}">${icon('plus')}Einheit eintragen</button>`;
  else if (!sessions.length) actions = `<button class="btn ghost" data-act="session" data-sport="walk">${icon('plus')}Spaziergang / Einheit</button>`;
  else actions = `<button class="btn ghost" data-act="session">${icon('plus')}Weitere Einheit</button>`;

  return `<div class="card">
    <div class="ch"><span class="chip spo">${icon('dumbbell')}Sport</span>
      ${p.parts.sessionDone ? `<span class="done-tag" style="color:var(--spo)">Erledigt${icon('check')}</span>` : `<button class="more" data-go="sport">Plan${icon('chev')}</button>`}</div>
    ${main}
    <div class="sess-actions">${actions}</div>
    <button class="steps-line" data-act="steps">${icon('steps')}<span class="st-bar"><i style="width:${Math.min(100, steps / stepGoal * 100)}%"></i></span><b class="num">${de(steps)}</b><span class="sub">/ ${de(stepGoal)}</span></button>
    <div class="load"><div class="row-l"><span>Belastung 7 Tage</span><b class="${load.zone}">${zoneLabel}</b></div>
      <div class="gauge ${gaugePos == null ? 'off' : ''}">${gaugePos != null ? `<i style="left:${gaugePos}%"></i>` : ''}</div></div>
    ${ng && ng.days <= 14 ? `<div class="next-game">${icon('trophy')}<span>${ng.days === 0 ? 'Heute' : ng.days === 1 ? 'Morgen' : `In ${ng.days} Tagen`} · ${ng.game.home ? 'vs' : '@'} <b>${esc(ng.game.opponent)}</b> · ${esc(ng.game.time)}</span></div>` : ''}
  </div>`;
}

function regenCard(key, p) {
  const knee = p.parts.knee;
  const ks = store.kneeStatus(key);
  return `<div class="card" id="regen">
    <div class="ch"><span class="chip reg">${icon('moon')}Regeneration</span><span class="more">${p.regen}%</span></div>
    <div class="regen">
      <button class="tile" data-act="sleep"><div class="lbl">Schlaf</div>
        <div class="mid num">${p.parts.sleepH != null ? `${fmtHours(p.parts.sleepH)}<small>h</small>` : '<span style="color:var(--faint)">–</span>'}</div>
        ${p.parts.sleepH == null ? '<div class="sub" style="margin-top:4px">eintragen</div>' : ''}</button>
      <div class="tile"><div class="lbl">Knie heute <span style="color:var(--faint)">· 0 = top</span></div>
        <div class="knee-scale">${Array.from({ length: 11 }, (_, i) => `<button data-knee="${i}" class="${knee === i ? 'on' + (i >= 6 ? ' hot' : '') : knee != null && i < knee ? 'lo' : ''}">${i}</button>`).join('')}</div>
      </div>
    </div>
    <button class="reha-btn ${p.parts.reha ? 'on' : ''}" data-act="reha">
      <span class="box">${p.parts.reha ? icon('check') : ''}</span>
      <span style="flex:1"><b>${KNEE_REHA.title}</b><span>${KNEE_REHA.detail}</span></span>
      ${icon('timer')}
    </button>
    ${ks ? `<div class="hint" style="margin:10px 2px 0;color:var(--warn);font-weight:650">${esc(ks.text)}</div>` : ''}
  </div>`;
}

function wire(app, key, hint) {
  $$('[data-go]', app).forEach(b => b.onclick = () => router.go(b.dataset.go));
  $$('[data-scroll]', app).forEach(b => b.onclick = () => $('#' + b.dataset.scroll, app).scrollIntoView({ behavior: 'smooth', block: 'center' }));
  $('#ring-photo', app).onclick = async () => {
    const f = await pickFile();
    if (!f) return;
    store.updateProfile({ photo: await downscalePhoto(f, { size: 360 }) });
    router.rerender(); toast('Foto gesetzt');
  };
  const coach = $('#coach', app);
  if (coach && hint && hint.action) coach.onclick = () => runAction(key, hint.action);

  $('#water-add', app).onclick = (e) => { e.stopPropagation(); addWaterQuick(key, 250); };
  $('#water-tile', app).onclick = () => openWaterSheet(key);
  $$('[data-knee]', app).forEach(b => b.onclick = () => {
    store.setKnee(key, Number(b.dataset.knee)); haptic(); afterChange(key);
  });
  $$('[data-act]', app).forEach(b => b.onclick = () => runAction(key, { type: b.dataset.act, sport: b.dataset.sport }));
}

// Nach jeder Änderung: neu zeichnen + Konfetti, wenn der Tag gerade voll wurde
let lastOverall = null;
export function afterChange(key) {
  const before = lastOverall ?? 0;
  router.rerender();
  const now = store.dayPillars(key).overall;
  if (before < 100 && now >= 100) confetti();
  lastOverall = now;
}

function addWaterQuick(key, ml) {
  const before = store.getDay(key).water || 0;
  store.addWater(key, ml); haptic();
  afterChange(key);
  toast(`+${ml} ml Wasser`, 'Rückgängig', () => { store.setWater(key, before); router.rerender(); });
}

export function runAction(key, a) {
  if (!a) return;
  switch (a.type) {
    case 'workout': openWorkout(); break;
    case 'session': openSessionSheet(key, { sport: a.sport }); break;
    case 'steps': openStepsSheet(key); break;
    case 'supps': openSuppsSheet(key); break;
    case 'sleep': openSleepSheet(key); break;
    case 'reha': openRehaSheet(key); break;
    case 'water': addWaterQuick(key, a.ml || 500); break;
    case 'knee': $('#regen').scrollIntoView({ behavior: 'smooth', block: 'center' }); break;
    case 'add': openQuickAdd({ key, text: a.text || '' }); break;
    case 'food': {
      const before = store.getDay(key).entries.length;
      store.addEntry(key, a.foodId, a.grams);
      const f = store.foodById(a.foodId);
      afterChange(key);
      toast(`${short(f.name)} (${a.grams} g) eingetragen`, 'Rückgängig', () => { store.truncateEntries(key, before); router.rerender(); });
      break;
    }
    default: break;
  }
}

// --- Schlaf -----------------------------------------------------------------
export function openSleepSheet(key) {
  const day = store.getDay(key);
  let h = day.sleep != null ? day.sleep : (store.getState().profile.sleepTarget || 8);
  const sheet = openSheet(`${sheetHead('Schlaf', 'Wie lange hast du geschlafen?')}
    <div class="stepper" style="margin-bottom:12px">
      <button class="st-btn" data-d="-0.25">${icon('minus')}</button>
      <div class="st-val num" id="sv"></div>
      <button class="st-btn" data-d="0.25">${icon('plus')}</button>
    </div>
    <div class="chips" style="justify-content:center">${[6, 6.5, 7, 7.5, 8, 8.5, 9].map(x => `<button class="chipbtn" data-h="${x}">${fmtHours(x)} h</button>`).join('')}</div>
    <p class="hint" style="margin-top:14px">Ziel: ${store.getState().profile.sleepTarget} h. Schlaf ist der stärkste Hebel für Regeneration, Fettabbau und dein Knie.</p>
    <div class="sheet-foot"><button class="btn block" id="save">${icon('check')}Speichern</button></div>`);
  const show = () => { $('#sv', sheet).innerHTML = `${fmtHours(h)}<small>STUNDEN</small>`; $$('[data-h]', sheet).forEach(b => b.classList.toggle('on', Number(b.dataset.h) === h)); };
  $$('[data-d]', sheet).forEach(b => b.onclick = () => { h = Math.max(0, Math.min(14, h + Number(b.dataset.d))); haptic(4); show(); });
  $$('[data-h]', sheet).forEach(b => b.onclick = () => { h = Number(b.dataset.h); show(); });
  $('#save', sheet).onclick = () => { store.setSleep(key, h); closeSheet(); afterChange(key); toast('Schlaf eingetragen'); };
  show();
}

// --- Wasser -----------------------------------------------------------------
function openWaterSheet(key) {
  const target = store.getState().profile.water;
  const sheet = openSheet(`${sheetHead('Wasser', `Ziel ${de(target / 1000, 1)} L`)}
    <div style="text-align:center;margin:6px 0 16px"><div class="big num" id="wv"></div></div>
    <div class="grid3" style="margin-bottom:10px">
      <button class="btn ghost" data-ml="250">+250 ml</button><button class="btn ghost" data-ml="500">+500 ml</button><button class="btn ghost" data-ml="1000">+1 L</button>
    </div>
    <div class="grid2"><button class="btn ghost" data-ml="-250">−250 ml</button><button class="btn ghost" id="wreset">Zurücksetzen</button></div>`);
  const show = () => { const w = store.getDay(key).water || 0; $('#wv', sheet).innerHTML = `${de(w / 1000, 2)}<small>L</small>`; };
  $$('[data-ml]', sheet).forEach(b => b.onclick = () => { store.addWater(key, Number(b.dataset.ml)); haptic(); show(); router.rerender(); });
  $('#wreset', sheet).onclick = () => { store.setWater(key, 0); show(); router.rerender(); };
  show();
}

// --- Knie-Reha mit Isometrie-Timer (5 × 45 s halten, 60 s Pause) -------------
export function openRehaSheet(key) {
  const HOLD = 45, REST = 60, SETS = 5;
  let set = 1, phase = 'idle', left = HOLD, timer = null;
  const sheet = openSheet(`${sheetHead(KNEE_REHA.title, KNEE_REHA.detail)}
    <p class="hint">${esc(KNEE_REHA.why)} Schmerz bis ca. 3/10 ist okay, danach Winkel flacher machen.</p>
    <div class="card" style="text-align:center;background:var(--reg-t);box-shadow:none">
      <div class="lbl" id="rh-phase" style="color:var(--reg)">Bereit</div>
      <div class="big num" id="rh-time" style="margin:8px 0 6px">${fmtClock(HOLD)}</div>
      <div class="sub" id="rh-set">Satz 1 von ${SETS}</div>
    </div>
    <div class="sheet-foot">
      <button class="btn accent" id="rh-go">${icon('play')}Timer starten</button>
      <button class="btn ghost" id="rh-done">${store.getDay(key).reha ? 'Als offen markieren' : 'Schon erledigt'}</button>
    </div>`, { onClose: () => clearInterval(timer) });
  const show = () => {
    $('#rh-time', sheet).textContent = fmtClock(left);
    $('#rh-phase', sheet).textContent = phase === 'hold' ? 'Halten' : phase === 'rest' ? 'Pause' : phase === 'done' ? 'Fertig' : 'Bereit';
    $('#rh-set', sheet).textContent = phase === 'done' ? `${SETS} Sätze geschafft` : `Satz ${set} von ${SETS}`;
  };
  const finish = () => {
    clearInterval(timer); phase = 'done'; show(); beep(3, 1040);
    if (!store.getDay(key).reha) store.toggleReha(key);
    afterChange(key);
    $('#rh-go', sheet).innerHTML = `${icon('check')}Erledigt`;
    $('#rh-go', sheet).onclick = () => closeSheet();
    toast('Knie-Reha erledigt');
  };
  const tick = () => {
    left--;
    if (left <= 0) {
      if (phase === 'hold') {
        if (set >= SETS) return finish();
        phase = 'rest'; left = REST; beep(2, 660);
      } else { phase = 'hold'; set++; left = HOLD; beep(1, 990); }
    }
    show();
  };
  $('#rh-go', sheet).onclick = () => {
    unlockAudio();
    if (phase === 'idle') { phase = 'hold'; left = HOLD; beep(1, 990); }
    if (timer) { clearInterval(timer); timer = null; $('#rh-go', sheet).innerHTML = `${icon('play')}Weiter`; return; }
    timer = setInterval(tick, 1000);
    $('#rh-go', sheet).innerHTML = `${icon('pause')}Pause`;
    show();
  };
  $('#rh-done', sheet).onclick = () => { store.toggleReha(key); closeSheet(); afterChange(key); };
}

