// ============================================================================
// Heute – zwei Ringe (Essen · Sport), kcal übrig, der nächste Schritt
// ============================================================================
import * as store from '../store.js';
import { KNEE_REHA } from '../data.js';
import { icon } from '../icons.js';
import {
  $, $$, esc, de, short, router, ringsSVG, toast, haptic, confetti, openSheet, closeSheet, sheetHead,
  greeting, longDate, downscalePhoto, pickFile, fmtHours, fmtClock, beep, unlockAudio,
} from '../ui.js';
import { openSuppsSheet, openRecommendSheet, openRecipe } from './food.js';
import { PERSONA } from '../persona.js';
import { dayPlan, fmtH, GYM_TIMES, nextStep, recipeById, trainingWindow } from '../planner.js';
import { levelInfo, totalXP, dayXP, missionsFor, weeklyChallenge, MISSIONS } from '../game.js';
import { openSessionSheet, openStepsSheet } from './sport.js';
import { openWorkout } from './workout.js';
import { openQuickAdd } from './quickadd.js';

export function renderToday(app) {
  const key = store.todayKey();
  const now = new Date();
  const s = store.getState();
  const p = store.dayPillars(key);
  store.getDay(key);
  const lv = levelInfo(totalXP());
  const ms = missionsFor(key, now);
  const ns = nextStep(key, now);
  const t = store.macroTargets(key);
  const left = Math.round(t.kcal - p.totals.kcal);
  const protLeft = Math.max(0, Math.round(t.protein - p.totals.protein));
  lastOverall = p.overall;

  const streak = store.currentStreak(key);
  const photo = s.profile.photo;

  app.innerHTML = `<div class="view simple">
    <div class="s-head">
      <div><div class="vh-date">${esc(longDate(store.dateOf(key)))}</div><div class="s-hi">${greeting(now)},<br>${esc(s.profile.name || PERSONA.name)}</div></div>
      <button class="me-btn" data-go="progress" aria-label="Dein Dashboard">${photo ? `<img src="${photo}" alt="">` : PERSON_SVG}<span class="lv num">${lv.level}</span></button>
    </div>

    <div class="status-row">
      <button class="stat-pill flame ${streak ? '' : 'zero'}" id="streak">${icon('flame')}${streak}<span>${streak === 1 ? 'Tag' : 'Tage'}</span></button>
      <button class="stat-pill xp" id="lvl">${icon('star')}Level ${lv.level}<i class="bar"><i style="width:${lv.pct}%"></i></i><span>${ms.filter(m => m.done).length}/${ms.length}</span></button>
    </div>

    <div class="s-card">
      <div class="s-hero">
        <button class="rings" id="rings" aria-label="Details zu Essen und Sport">${ringsSVG(p, { photo: null })}</button>
        <button class="s-nums" data-go="food">
          <div class="s-kcal num ${left < -100 ? 'over' : ''}">${de(Math.abs(left))}</div>
          <div class="s-lbl">${left >= 0 ? 'kcal übrig' : 'kcal drüber'}</div>
          <div class="s-prot num">${de(protLeft)}<small> g</small></div>
          <div class="s-lbl">${protLeft ? 'Protein offen' : 'Protein geschafft'}</div>
        </button>
      </div>
      <div class="s-split" id="legend">
        <button data-pill><i class="d-nut"></i>Essen<b>${p.nutrition} %</b></button>
        <button data-pill><i class="d-spo"></i>Sport<b>${p.sport} %</b></button>
      </div>
    </div>

    ${planRow(key, now)}
    ${nextCard(ns)}
    <button class="s-link" id="dayplan">${icon('clock')}Ganzer Tag${icon('chev')}</button>
  </div>`;

  wireToday(app, key, ns);
}

const PERSON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4.2"/><path d="M4 20.5c.9-4.2 4.1-6.3 8-6.3s7.1 2.1 8 6.3z"/></svg>';

// Heute geplantes Training – jederzeit mit einem Tipp abhaken (auch vorher)
function planRow(key, now) {
  const tr = trainingWindow(key);
  const sessions = store.sessionsFor(key);
  const burn = store.DAY_TYPES[store.dayType(key)].burn;
  if (sessions.length) {
    const x = sessions[sessions.length - 1];
    return `<button class="plan-row done" data-go="sport"><span class="pi">${icon(store.sportType(x.type).icon)}</span>
      <span class="pm"><b>${esc(x.title)}</b><span>${x.min} Min${burn ? ` · ~${de(burn)} kcal im Budget` : ''}</span></span>
      <span class="pc">${icon('check')}Erledigt</span></button>`;
  }
  if (!tr) {
    return `<button class="plan-row" data-plan="free"><span class="pi">${icon('walk')}</span>
      <span class="pm"><b>Heute frei</b><span>Spaziergang, Schritte oder spontan trainieren</span></span>
      <span class="pc">${icon('plus')}Eintragen</span></button>`;
  }
  const isGym = tr.kind === 'gym';
  const h = now.getHours() + now.getMinutes() / 60 + (store.todayKey(now) !== store.dateKey(now) ? 24 : 0);
  const when = h < tr.start ? `heute ${fmtH(tr.start)}` : h <= tr.end ? 'läuft gerade' : `war ${fmtH(tr.start)}`;
  return `<div class="plan-row"><span class="pi">${icon(tr.icon || 'dumbbell')}</span>
    <span class="pm"><b>${esc(tr.title)}</b><span>${when}${burn ? ` · ~${de(burn)} kcal schon im Budget` : ''}</span></span>
    <button class="pc" data-plan="${isGym ? 'gym' : 'sport'}">${icon(isGym ? 'play' : 'check')}${isGym ? 'Starten' : 'Abhaken'}</button></div>`;
}

// Die eine Karte: was jetzt dran ist
function nextCard(ns) {
  const r = ns.recipe;
  return `<div class="next ${ns.tone || ''}">
    <div class="next-k">${icon(ns.icon)}Jetzt</div>
    <div class="next-t">${esc(ns.title)}</div>
    ${ns.text ? `<div class="next-x">${esc(ns.text)}</div>` : ''}
    ${r ? `<button class="next-rec" data-rec="${r.recipe.id}"><b>${esc(r.recipe.name)}</b><span class="num">${de(r.totals.protein)} g Protein · ${de(r.totals.kcal)} kcal</span></button>` : ''}
    ${ns.kind === 'sleep' ? `<div class="next-chips">${ns.chips.map(v => `<button class="chipbtn" data-sleep="${v}">${String(v).replace('.', ',')} h</button>`).join('')}</div>` : ''}
    ${ns.kind === 'knee' ? `<div class="knee-scale big">${Array.from({ length: 11 }, (_, i) => `<button data-kn="${i}">${i}</button>`).join('')}</div>` : ''}
    ${ns.primary ? `<div class="next-act"><button class="btn volt" data-step="${ns.primary.act}">${esc(ns.primary.label)}</button></div>` : ''}
    ${ns.secondary ? `<button class="next-alt" data-step2="${ns.secondary.act}">${esc(ns.secondary.label)}${icon('chev')}</button>` : ''}
  </div>`;
}

function doStep(key, a) {
  if (!a) return;
  switch (a.act) {
    case 'recipe': {
      const r = recipeById(a.id);
      if (!r) return;
      const before = store.getDay(key).entries.length;
      store.logRecipe(key, r);
      haptic(10); afterChange(key);
      toast(`${r.name} eingetragen`, 'Rückgängig', () => { store.truncateEntries(key, before); router.rerender(); });
      return;
    }
    case 'quicksession': {
      const tr = trainingWindow(key);
      const plan = store.getTrainingFor(key);
      const type = tr && tr.kind === 'game' ? 'game' : plan && plan.kind === 'sport' ? plan.sport : 'other';
      const min = tr ? Math.round((tr.end - tr.start) * 60) : 60;
      const sess = store.addSession(key, { type, min: tr && tr.kind === 'game' ? 90 : min, rpe: type === 'game' ? 8 : 7, title: tr ? tr.title : undefined });
      haptic(12); afterChange(key);
      toast(`${sess.title} eingetragen`, 'Rückgängig', () => { store.removeSession(key, sess.id); router.rerender(); });
      return;
    }
    case 'rehadone': if (!store.getDay(key).reha) store.toggleReha(key); afterChange(key); toast('Knie-Reha erledigt'); return;
    case 'water': addWaterQuick(key, 500); return;
    case 'eat': openRecommendSheet(key, a.slot || 'first'); return;
    default: runAction(key, { type: a.act, text: a.text, sport: a.sport }); return;
  }
}

function wireToday(app, key, ns) {
  $$('[data-go]', app).forEach(b => b.onclick = () => router.go(b.dataset.go));
  $('#lvl', app).onclick = () => openLevelSheet(key);
  $('#streak', app).onclick = () => openLevelSheet(key);
  $('#rings', app).onclick = () => openPillarsSheet(key);
  $$('[data-pill]', app).forEach(b => b.onclick = () => openPillarsSheet(key));
  $$('[data-plan]', app).forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const a = b.dataset.plan;
    if (a === 'gym') openWorkout(key);
    else if (a === 'sport') doStep(key, { act: 'quicksession' });
    else openSessionSheet(key, {});
  });
  $('#dayplan', app).onclick = () => liveSheet('Dein Tag', 'Fahrplan aus deinem Rhythmus und Training', () => planCard(key, new Date()), (root) => wireCards(root, key));
  const pa = $('[data-step]', app); if (pa) pa.onclick = () => doStep(key, ns.primary);
  const sa = $('[data-step2]', app); if (sa) sa.onclick = () => doStep(key, ns.secondary);
  const xa = $('[data-step3]', app); if (xa) xa.onclick = () => doStep(key, ns.extra);
  $$('[data-rec]', app).forEach(b => b.onclick = () => openRecipe(key, b.dataset.rec, () => router.rerender()));
  $$('[data-sleep]', app).forEach(b => b.onclick = () => { store.setSleep(key, Number(b.dataset.sleep)); haptic(8); afterChange(key); });
  $$('[data-kn]', app).forEach(b => b.onclick = () => { store.setDayMeta(key, 'knee', Number(b.dataset.kn)); haptic(8); afterChange(key); });
}

// --- Hintergrund-Fenster ---------------------------------------------------------
let liveDraw = null;
function liveSheet(title, sub, render, wireFn) {
  let draw;
  const sheet = openSheet(`${sheetHead(esc(title), esc(sub || ''))}<div class="sheet-body" id="ls"></div>`, { tall: true, onClose: () => { if (liveDraw === draw) liveDraw = null; } });
  draw = () => { const b = $('#ls', sheet); if (!b) return; b.innerHTML = render(); wireFn(b, draw); };
  liveDraw = draw;
  draw();
  return sheet;
}
function openPillarsSheet(key) {
  liveSheet('Deine Ringe', 'Essen · Sport', () => {
    const p = store.dayPillars(key);
    return `${budgetCard(key, p, store.getDay(key), new Date())}${sportCard(key, p)}`;
  }, (root) => wireCards(root, key));
}
// Erholung allein (aus dem Sport-Bereich)
export function openRecoverySheet(key) {
  liveSheet('Erholung', 'Gehört zum Sport: Schlaf · Knie · Reha', () => recoveryBlock(key, store.dayPillars(key), false), (root) => wireCards(root, key));
}
function openLevelSheet(key) {
  liveSheet('Level & Missionen', '', () => {
    const lv = levelInfo(totalXP());
    return `<div class="lvl-sheet"><span class="lvl-badge num">${lv.level}</span><div><b>${esc(lv.rank)}</b><span class="lvl-bar"><i style="width:${lv.pct}%"></i></span>
      <span class="sub">+${dayXP(key).xp} XP heute · ${de(lv.need - lv.into)} bis Level ${lv.level + 1}</span></div></div>
      ${missionsCard(key, new Date())}
      <button class="btn ghost block" data-go="progress">${icon('chart')}Dashboard ansehen</button>`;
  }, (root) => wireCards(root, key));
}
function wireCards(root, key) {
  $$('[data-go]', root).forEach(b => b.onclick = () => router.go(b.dataset.go));
  const wa = $('#water-add', root); if (wa) wa.onclick = (e) => { e.stopPropagation(); addWaterQuick(key, 250); };
  const wt = $('#water-tile', root); if (wt) wt.onclick = () => openWaterSheet(key);
  $$('[data-knee]', root).forEach(b => b.onclick = () => { store.setKnee(key, Number(b.dataset.knee)); haptic(); afterChange(key); });
  $$('[data-act]', root).forEach(b => b.onclick = () => runAction(key, { type: b.dataset.act, sport: b.dataset.sport }));
  $$('[data-slot]', root).forEach(b => b.onclick = () => {
    if (b.dataset.slot) return openRecommendSheet(key, b.dataset.slot);
    const ty = b.dataset.ty;
    if (ty === 'train') { const pl = store.getTrainingFor(key); if (pl && pl.kind === 'gym') openWorkout(); else openSessionSheet(key, {}); }
    else if (ty === 'drink') addWaterQuick(key, 500);
  });
  $$('[data-gymt]', root).forEach(b => b.onclick = () => { store.setDayMeta(key, 'gymTime', b.dataset.gymt); haptic(4); afterChange(key); });
  $$('[data-mis]', root).forEach(b => b.onclick = () => openMission(key, b.dataset.mis));
}

function coachCard(h) {
  return `<button class="coach ${h.tone}" id="coach">
    <span class="coach-ic">${icon(h.icon)}</span>
    <span class="coach-body"><b>${esc(h.title)}</b><span>${esc(h.text)}</span></span>
    ${h.action ? `<span class="coach-go">${icon(h.action.type === 'food' || h.action.type === 'water' ? 'plus' : 'chev')}</span>` : ''}
  </button>`;
}

// Kalorienbudget je Tagestyp + Protein + Wasser/Supps
function budgetCard(key, p, day, now) {
  const s = store.getState();
  const t = store.macroTargets(key);
  const tot = p.totals;
  const left = t.kcal - tot.kcal;
  const over = left < -100;
  const dt = store.DAY_TYPES[t.type];
  const supps = s.supplements;
  const taken = supps.filter(x => day.supps[x.id]).length;
  const h = store.hourOn(key, now.getTime());
  const slot = h < 11 ? 'morgens' : h < 15 ? 'mittags' : h >= 19 ? 'abends' : 'pre';
  const openNow = supps.filter(x => x.time === slot && !day.supps[x.id]).map(x => short(x.name));
  return `<div class="card budget ${over ? 'over' : ''}">
    <div class="ch"><span class="chip nut">${icon(dt.icon)}${esc(dt.label)}</span><button class="more" data-go="food">Essen${icon('chev')}</button></div>
    <div class="big-row">
      <div><div class="big num">${de(Math.abs(left))}<small>${left >= 0 ? 'kcal übrig' : 'kcal drüber'}</small></div>
        <div class="lbl" style="margin-top:6px">Budget ${de(t.kcal)} · gegessen ${de(tot.kcal)}</div></div>
      <div style="text-align:right"><div class="mid num">${de(tot.protein)}<small>/ ${de(t.protein)} g</small></div><div class="lbl" style="margin-top:5px">Protein</div></div>
    </div>
    <div class="bbar"><i style="width:${Math.min(100, tot.kcal / t.kcal * 100)}%"></i><b style="left:${Math.min(100, tot.protein / t.protein * 100)}%"></b></div>
    <div class="macros"><span>Carbs <b>${de(tot.carbs)}/${de(t.carbs)} g</b></span><span>Fett <b>${de(tot.fat)}/${de(t.fat)} g</b></span><span>Ballastst. <b>${de(tot.fiber)} g</b></span></div>
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

// Dein Tag: Fahrplan aus Rhythmus, Training und dem, was schon gegessen wurde
function planCard(key, now) {
  const plan = dayPlan(key, now);
  const rows = plan.slots.map(x => {
    const st = x.status === 'done' || x.status === 'done-none' ? 'done' : x.status;
    let detail = '';
    if (x.type === 'meal') {
      if (x.status === 'done') detail = `${de(x.eaten.kcal)} kcal · ${de(x.eaten.protein)} g Protein`;
      else if (x.status === 'skipped') detail = 'ausgelassen';
      else if (x.target) detail = `~${de(x.target.kcal)} kcal · ${de(x.target.protein)} g Protein`;
    } else detail = x.text || '';
    const supps = (x.supps || []).filter(sp => !store.getDay(key).supps[sp.id]).map(sp => short(sp.name));
    const gym = x.type === 'train' && plan.train && plan.train.kind === 'gym'
      ? `<div class="gymt">${Object.entries(GYM_TIMES).map(([k, l]) => `<button class="chipbtn ${plan.train.gymTime === k ? 'on' : ''}" data-gymt="${k}">${l}</button>`).join('')}</div>` : '';
    return `<div class="tl ${st} ${x.next ? 'next' : ''} t-${x.type}">
      <span class="tl-t num">${fmtH(x.t)}</span>
      <span class="tl-dot">${st === 'done' ? icon('check') : x.type === 'train' ? icon(x.icon || 'dumbbell') : x.type === 'sleep' ? icon('moon') : x.type === 'drink' ? icon('coffee') : ''}</span>
      <button class="tl-main" data-slot="${x.type === 'meal' ? x.slot : ''}" data-ty="${x.type}">
        <b>${esc(x.title)}</b>${detail ? `<span>${esc(detail)}</span>` : ''}
        ${x.type === 'meal' && x.next && x.text ? `<em>${esc(x.text)}</em>` : ''}
        ${supps.length && st !== 'done' ? `<i class="tl-supp">${icon('pill')}${esc(supps.join(' · '))}</i>` : ''}
      </button>
      ${x.type === 'meal' && st !== 'done' && x.status !== 'skipped' ? `<button class="tl-go" data-slot="${x.slot}" aria-label="Was soll ich essen?">${icon('chev')}</button>` : ''}
      ${gym}
    </div>`;
  }).join('');
  return `<div class="card">
    <div class="ch"><span class="ch-title">Dein Tag</span><span class="sub">${plan.train ? esc(plan.train.title) : 'Kein Training geplant'}</span></div>
    <div class="timeline">${rows}</div>
  </div>`;
}

function missionsCard(key, now) {
  const ms = missionsFor(key, now);
  const wc = weeklyChallenge(key);
  const done = ms.filter(m => m.done).length;
  return `<div class="card">
    <div class="ch"><span class="ch-title">Missionen</span><span class="sub">${done} / ${ms.length} · +${ms.reduce((a, m) => a + m.xp, 0)} XP möglich</span></div>
    ${ms.map(m => `<button class="mis ${m.done ? 'done' : ''} ${m.failed ? 'failed' : ''} c-${m.cat === 'reg' ? 'spo' : m.cat}" data-mis="${m.id}">
      <span class="mis-ring" style="--p:${Math.round(m.p * 100)}">${m.done ? icon('check') : ''}</span>
      <span class="mis-main"><b>${esc(m.title)}</b><span>${esc(m.label)}</span></span>
      <span class="mis-xp num">+${m.xp}</span>
    </button>`).join('')}
    <div class="wch ${wc.done ? 'done' : ''}">
      <div class="wch-top"><span>${icon('trophy')}Woche: ${esc(wc.title)}</span><b class="num">+${wc.xp}</b></div>
      <div class="wch-dots">${Array.from({ length: wc.goal }, (_, i) => `<i class="${i < wc.n ? 'on' : ''}"></i>`).join('')}<span>${wc.done ? 'geschafft' : `${wc.n}/${wc.goal} · noch ${wc.daysLeft} Tage`}</span></div>
    </div>
  </div>`;
}

function sportCard(key, p) {
  const plan = store.getTrainingFor(key);
  const sessions = store.sessionsFor(key);
  const active = store.getActiveWorkout();
  const steps = store.getSteps(key);
  const stepGoal = store.getState().profile.stepGoal || 10000;

  let main;
  if (sessions.length) {
    main = sessions.map(x => {
      const st = store.sportType(x.type);
      return `<div class="sess" style="margin-bottom:8px"><span class="ic">${icon(st.icon)}</span>
        <div><div class="t1">${esc(x.title)}</div><div class="t2">${x.min} Min · Intensität ${x.rpe}/10${x.detail ? ` · ${esc(x.detail)}` : ''}</div></div></div>`;
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
    ${recoveryBlock(key, p)}
  </div>`;
}

// Erholung gehört zum Sport: Schlaf · Knie · Reha
function recoveryBlock(key, p, head = true) {
  const knee = p.parts.knee;
  const ks = store.kneeStatus(key);
  return `<div id="regen">
    ${head ? '<div class="part-head" style="margin-top:18px"><b>Erholung</b><span>Schlaf · Knie · Reha</span></div>' : ''}
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

// Mission antippen: worum geht's + direkt loslegen
function openMission(key, id) {
  const m = missionsFor(key).find(x => x.id === id);
  if (!m) return;
  const go = { reha: 'reha', reha_streak: 'reha', knee: 'knee', sleep: 'sleep', water: 'water', session: 'session', workout: 'workout', pr: 'workout', steps: 'steps', steps_record: 'steps' }[id];
  const sheet = openSheet(`${sheetHead(esc(m.title), m.done ? 'Geschafft' : esc(m.label))}
    <p class="hint" style="font-size:15px">${esc(m.desc)}</p>
    <div class="mis-detail"><span class="mis-ring big" style="--p:${Math.round(m.p * 100)}">${m.done ? icon('check') : Math.round(m.p * 100) + '%'}</span><div><b class="num">+${m.xp} XP</b><span>${esc({ target: 'Ziel erreichen', habit: 'Abhaken', challenge: 'Disziplin', record: 'Bestwert schlagen', streak: 'Serie halten' }[m.style] || '')}</span></div></div>
    <div class="sheet-foot">${go && !m.done ? `<button class="btn volt block" id="mis-go">${icon('play')}Jetzt erledigen</button>` : id === 'skill' && !m.done ? `<button class="btn volt block" id="mis-skill">${icon('zap')}Zu den Skills</button>` : `<button class="btn ghost block" data-close>Okay</button>`}</div>`);
  const g = $('#mis-go', sheet);
  if (g) g.onclick = () => { closeSheet(); runAction(key, { type: go === 'water' ? 'water' : go, ml: 500 }); };
  const sk = $('#mis-skill', sheet);
  if (sk) sk.onclick = () => { closeSheet(); router.go('sport'); };
  $$('[data-close]', sheet).forEach(b => b.onclick = () => closeSheet());
}

// Nach jeder Änderung: neu zeichnen + Konfetti, wenn der Tag gerade voll wurde
let lastOverall = null;
export function afterChange(key) {
  const before = lastOverall ?? 0;
  router.rerender();
  if (liveDraw) liveDraw();
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
    case 'knee': {
      if (!$('#regen')) openPillarsSheet(key);
      const el = $('#regen'); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
      break;
    }
    case 'add': openQuickAdd({ key, text: a.text || '' }); break;
    case 'eat': openRecommendSheet(key, a.slot || 'first'); break;
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
export function openWaterSheet(key) {
  const target = store.getState().profile.water;
  const sheet = openSheet(`${sheetHead('Wasser', `Ziel ${de(target / 1000, 1)} L`)}
    <div style="text-align:center;margin:6px 0 16px"><div class="big num" id="wv"></div></div>
    <div class="grid3" style="margin-bottom:10px">
      <button class="btn ghost" data-ml="250">+250 ml</button><button class="btn ghost" data-ml="500">+500 ml</button><button class="btn ghost" data-ml="1000">+1 L</button>
    </div>
    <div class="grid2"><button class="btn ghost" data-ml="-250">−250 ml</button><button class="btn ghost" id="wreset">Zurücksetzen</button></div>`);
  const show = () => { const w = store.getDay(key).water || 0; $('#wv', sheet).innerHTML = `${de(w / 1000, 2)}<small>L</small>`; };
  $$('[data-ml]', sheet).forEach(b => b.onclick = () => { store.addWater(key, Number(b.dataset.ml)); haptic(); show(); afterChange(key); });
  $('#wreset', sheet).onclick = () => { store.setWater(key, 0); show(); afterChange(key); };
  show();
}

// --- Knie-Reha mit Isometrie-Timer (5 × 45 s halten, 60 s Pause) -------------
export function openRehaSheet(key) {
  const HOLD = 45, REST = 60, SETS = 5;
  let set = 1, phase = 'idle', left = HOLD, timer = null;
  const sheet = openSheet(`${sheetHead(KNEE_REHA.title, KNEE_REHA.detail)}
    <p class="hint">${esc(KNEE_REHA.why)} Schmerz bis ca. 3/10 ist okay, danach Winkel flacher machen.</p>
    <div class="card" style="text-align:center;background:var(--fill-2)">
      <div class="lbl" id="rh-phase" style="color:var(--ink)">Bereit</div>
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
  // Zeitstempel-basiert: läuft auch korrekt weiter, wenn das iPhone kurz gesperrt war
  let phaseEnd = 0, pausedLeft = null;
  const tick = () => {
    left = Math.ceil((phaseEnd - Date.now()) / 1000);
    while (left <= 0) {
      if (phase === 'hold') {
        if (set >= SETS) return finish();
        phase = 'rest'; phaseEnd += REST * 1000; beep(2, 660);
      } else { phase = 'hold'; set++; phaseEnd += HOLD * 1000; beep(1, 990); }
      left = Math.ceil((phaseEnd - Date.now()) / 1000);
    }
    show();
  };
  $('#rh-go', sheet).onclick = () => {
    unlockAudio();
    if (timer) {
      clearInterval(timer); timer = null; pausedLeft = left;
      $('#rh-go', sheet).innerHTML = `${icon('play')}Weiter`; return;
    }
    if (phase === 'idle') { phase = 'hold'; left = HOLD; beep(1, 990); }
    phaseEnd = Date.now() + (pausedLeft != null ? pausedLeft : left) * 1000;
    pausedLeft = null;
    timer = setInterval(tick, 250);
    $('#rh-go', sheet).innerHTML = `${icon('pause')}Pause`;
    show();
  };
  $('#rh-done', sheet).onclick = () => { store.toggleReha(key); closeSheet(); afterChange(key); };
}

