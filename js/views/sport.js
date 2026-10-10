// ============================================================================
// Sport – Wochen-Split, Einheiten, Belastung, Kraft-Log, Spielplan
// ============================================================================
import * as store from '../store.js';
import { SPORT_TYPES, RPE_LABELS, WEEKDAYS, WEEKDAYS_LONG, MUSCLES } from '../data.js';
import { icon } from '../icons.js';
import { $, $$, esc, de, router, openSheet, closeSheet, sheetHead, toast, haptic } from '../ui.js';
import { openWorkout } from './workout.js';
import { afterChange, openRecoverySheet } from './today.js';
import { SKILLS, skillState, practiceSkill, advanceSkill, setSkillStage, skillSessionsThisWeek } from '../skills.js';
import { GYM_TIMES, gymTimeFor } from '../planner.js';
import { PERSONA } from '../persona.js';
import { confetti } from '../ui.js';

let selDay = null; // Datum-Key des gewählten Wochentags

function weekKeys(today) {
  const wd = store.weekdayOf(today);
  const monday = store.shiftDate(today, -((wd + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => store.shiftDate(monday, i));
}

export function renderSport(app) {
  const today = store.todayKey();
  const key = selDay && weekKeys(today).includes(selDay) ? selDay : today;
  const isToday = key === today;
  const plan = store.getTrainingFor(key);
  const sessions = store.sessionsFor(key);
  const active = store.getActiveWorkout();

  app.innerHTML = `<div class="view simple">
    <div class="sub-h">
      <button class="icon-btn" data-back aria-label="Zurück">${icon('chevL')}</button>
      <div class="vh-title">Sport</div>
      ${isToday ? '' : `<button class="chipbtn sm" data-day="${today}">Zurück zu heute</button>`}
    </div>

    ${planCard(key, plan, isToday, active, sessions)}
    <div class="rows">
      ${isToday ? recoveryRow(today) : ''}
      <button class="row" data-srow="hub"><span class="row-ic">${icon('layers')}</span>
        <span class="row-main"><div class="row-t">Mehr</div><div class="row-s">Woche, Skills, Belastung, Rekorde, Spielplan</div></span><span class="row-end">${icon('chev')}</span></button>
    </div>
  </div>`;

  $$('[data-go]', app).forEach(b => b.onclick = () => router.go(b.dataset.go));
  $$('[data-day]', app).forEach(b => b.onclick = () => { selDay = b.dataset.day; router.rerender(); });
  $$('[data-start]', app).forEach(b => b.onclick = () => openWorkout(key));
  $$('[data-gympick]', app).forEach(b => b.onclick = () => openGymPicker(key));
  $$('[data-log]', app).forEach(b => b.onclick = () => openSessionSheet(key, { sport: b.dataset.log || undefined }));
  $$('[data-rmsess]', app).forEach(b => b.onclick = () => {
    if (!confirm('Einheit löschen?')) return;
    store.removeSession(key, b.dataset.rmsess); router.rerender();
  });
  $$('[data-gymt]', app).forEach(b => b.onclick = () => { store.setDayMeta(key, 'gymTime', b.dataset.gymt); haptic(4); router.rerender(); });
  $$('[data-srow]', app).forEach(b => b.onclick = () => (b.dataset.srow === 'recovery' ? openRecoverySheet(today) : openSportHub(today)));
}

// Erholung = Teil des Sports
function recoveryRow(key) {
  const d = store.getDay(key);
  const bits = [d.sleep != null ? `Schlaf ${String(d.sleep).replace('.', ',')} h` : 'Schlaf offen', d.knee != null ? `Knie ${d.knee}/10` : 'Knie offen', d.reha ? 'Reha ✓' : 'Reha offen'];
  return `<button class="row" data-srow="recovery"><span class="row-ic">${icon('moon')}</span>
    <span class="row-main"><div class="row-t">Erholung</div><div class="row-s">${esc(bits.join(' · '))}</div></span><span class="row-end">${icon('chev')}</span></button>`;
}

// Alles Weitere liegt hinter einer Zeile
function sportRows(today) {
  const skills = Object.entries(SKILLS).map(([id, sk]) => `${sk.name} ${skillState(id).stage + 1}/${sk.stages.length}`).join(' · ');
  const l = store.trainingLoad(today);
  const zone = { low: 'eher wenig', optimal: 'im grünen Bereich', elevated: 'erhöht', high: 'sehr hoch', none: l.building ? 'baut sich auf' : 'noch keine Daten' }[l.zone];
  const ng = store.nextGame(today);
  const prs = store.liftExercises().length;
  const row = (id, ic, title, sub) => `<button class="row" data-srow="${id}"><span class="row-ic">${icon(ic)}</span>
    <span class="row-main"><div class="row-t">${title}</div><div class="row-s">${esc(sub)}</div></span><span class="row-end">${icon('chev')}</span></button>`;
  return `<div class="rows">
    ${row('week', 'calendar', 'Woche', 'Was an welchem Tag ansteht')}
    ${row('skills', 'zap', 'Skills', skills)}
    ${row('load', 'gauge', 'Belastung', `7 Tage: ${zone}`)}
    ${row('lifts', 'medal', 'Rekorde', prs ? `${prs} Übungen` : 'kommen mit dem ersten Workout')}
    ${row('plan', 'sliders', 'Trainingsplan ändern', 'Tage, Zeiten, Sportarten')}
    ${row('games', 'trophy', 'Spielplan', ng ? `${ng.days === 0 ? 'heute' : ng.days === 1 ? 'morgen' : `in ${ng.days} Tagen`} · ${ng.game.home ? 'vs' : '@'} ${ng.game.opponent}` : 'keine Spiele')}
  </div>`;
}
function openSportHub(today) {
  const sheet = openSheet(`${sheetHead('Mehr zum Sport')}<div class="sheet-body">${sportRows(today).replace(/data-srow=/g, 'data-sh=')}</div>`);
  $$('[data-sh]', sheet).forEach(b => b.onclick = () => { closeSheet(); b.dataset.sh === 'week' ? openWeekSheet(today) : b.dataset.sh === 'plan' ? router.go('setup') : openSportSheet(today, b.dataset.sh); });
}
function openWeekSheet(today) {
  const sheet = openSheet(`${sheetHead('Deine Woche', 'Tag antippen, um ihn anzusehen')}<div class="sheet-body"><div class="rows">${weekKeys(today).map(k => {
    const pl = store.getTrainingFor(k);
    const done = store.sessionsFor(k);
    const ic = done.length ? 'check' : pl && pl.kind === 'gym' ? 'dumbbell' : pl && pl.kind === 'sport' ? store.sportType(pl.sport).icon : 'moon';
    const sub = done.length ? done.map(x => x.title).join(', ') + ' ✓' : pl ? pl.title || (pl.kind === 'gym' ? 'Gym' : store.sportType(pl.sport).label) : 'Pause';
    return `<button class="row ${k === today ? 'today' : ''}" data-wk="${k}"><span class="row-ic" ${done.length ? 'style="background:var(--nut);color:var(--on-ink)"' : ''}>${icon(ic)}</span>
      <span class="row-main"><div class="row-t">${WEEKDAYS_LONG[store.weekdayOf(k)]}${k === today ? ' · heute' : ''}</div><div class="row-s">${esc(sub)}</div></span><span class="row-end">${icon('chev')}</span></button>`;
  }).join('')}</div></div>`, { tall: true });
  $$('[data-wk]', sheet).forEach(b => b.onclick = () => { selDay = b.dataset.wk; closeSheet(); router.rerender(); window.scrollTo(0, 0); });
}
function openSportSheet(today, id) {
  const titles = { skills: 'Deine Skills', load: 'Belastung', lifts: 'Rekorde', games: 'Spielplan TSC' };
  const sheet = openSheet(`${sheetHead(titles[id])}<div class="sheet-body" id="sp-b"></div>`, { tall: true });
  const draw = () => {
    const b = $('#sp-b', sheet);
    b.innerHTML = id === 'skills' ? skillsCard(today) : id === 'load' ? loadCard(today) + muscleCard(today) : id === 'lifts' ? liftsCard() : gamesCard(today);
    $$('[data-skill]', b).forEach(x => x.onclick = () => openSkill(today, x.dataset.skill));
    $$('[data-lift]', b).forEach(x => x.onclick = () => openLiftHistory(x.dataset.lift));
    const ml = $('#lift-manual', b); if (ml) ml.onclick = () => openManualLift();
    const ch = b.querySelector('.card .ch'); if (ch && id !== 'lifts') ch.remove();
  };
  draw();
}

// --- Calisthenics-Skills ---------------------------------------------------------
function nextSkill() {
  // Der Skill, der am längsten nicht trainiert wurde
  return Object.keys(SKILLS).map(id => ({ id, last: skillState(id).log.slice(-1)[0] || '' })).sort((a, b) => a.last.localeCompare(b.last))[0].id;
}
function skillsCard(key) {
  const n = skillSessionsThisWeek(key);
  return `<div class="card">
    <div class="ch"><span class="ch-title">Deine Skills</span><span class="sub">${n}× trainiert diese Woche</span></div>
    ${Object.entries(SKILLS).map(([id, sk]) => {
      const st = skillState(id);
      const stage = sk.stages[st.stage];
      const today = st.log.includes(key);
      return `<button class="skill" data-skill="${id}">
        <span class="skill-ic">${icon(sk.icon)}</span>
        <span class="skill-main"><b>${esc(sk.name)}${st.done ? ' ✓' : ''}</b><span>Stufe ${st.stage + 1}/${sk.stages.length} · ${esc(stage.name)}</span>
          <span class="skill-ladder">${sk.stages.map((_, i) => `<i class="${i < st.stage || st.done ? 'on' : i === st.stage ? 'cur' : ''}"></i>`).join('')}</span></span>
        ${today ? `<span class="done-tag" style="color:var(--nut)">${icon('check')}</span>` : icon('chev')}
      </button>`;
    }).join('')}
    <p class="hint" style="margin:10px 0 0">${esc(PERSONA.skillWhy)} 2–3× pro Woche je 10 Minuten, frisch vor dem Workout.</p>
  </div>`;
}
function openSkill(key, id) {
  const sk = SKILLS[id];
  const draw = () => {
    const st = skillState(id);
    const cur = sk.stages[st.stage];
    const today = st.log.includes(key);
    sheet.querySelector('.sheet-body').innerHTML = `
      <p class="hint" style="font-size:14px">${esc(sk.why)}</p>
      <div class="skill-now">
        <div class="lbl" style="color:var(--nut)">Stufe ${st.stage + 1} von ${sk.stages.length}${st.done ? ' · Ziel erreicht' : ''}</div>
        <div class="skill-now-t">${esc(cur.name)}</div>
        <div class="skill-test">${icon('target')}<span>Nächste Stufe, wenn: <b>${esc(cur.test)}</b></span></div>
        <p>${esc(cur.how)}</p>
      </div>
      <div class="part-head"><b>Leiter</b><span class="sub">antippen zum Einstufen</span></div>
      ${sk.stages.map((s2, i) => `<button class="lad ${i < st.stage || st.done ? 'done' : i === st.stage ? 'cur' : ''}" data-stage="${i}">
        <span class="lad-n">${i < st.stage || (st.done && i === st.stage) ? icon('check') : i + 1}</span><span><b>${esc(s2.name)}</b><span>${esc(s2.test)}</span></span></button>`).join('')}
      <div class="skill-safe">${icon('alert')}<span>${esc(sk.safety)}</span></div>`;
    sheet.querySelector('.sheet-foot').innerHTML = `
      <button class="btn ghost" id="sk-done" ${today ? 'disabled' : ''}>${icon(today ? 'check' : 'timer')}${today ? 'Erledigt' : 'Trainiert'}</button>
      <button class="btn volt" id="sk-up" ${st.done ? 'disabled' : ''}>${icon('trophy')}${st.stage >= sk.stages.length - 1 ? 'Geschafft' : 'Bestanden'}</button>`;
    $('#sk-done', sheet).onclick = () => { practiceSkill(key, id); haptic(10); afterChange(key); toast(`${sk.name}: Session gespeichert`); draw(); };
    $('#sk-up', sheet).onclick = () => {
      if (!confirm(`„${cur.test}" wirklich sauber geschafft?`)) return;
      advanceSkill(id, key);
      if (!skillState(id).log.includes(key)) practiceSkill(key, id);
      confetti(); haptic(30); afterChange(key);
      toast(skillState(id).done ? `${sk.name} – Ziel erreicht! +100 XP` : `Neue Stufe: ${sk.stages[skillState(id).stage].name} · +100 XP`);
      draw();
    };
    $$('[data-stage]', sheet).forEach(b => b.onclick = () => {
      const i = Number(b.dataset.stage);
      if (i === skillState(id).stage) return;
      if (confirm(`Auf Stufe ${i + 1} „${sk.stages[i].name}" einstufen?`)) { setSkillStage(id, i); router.rerender(); draw(); }
    });
  };
  const sheet = openSheet(`${sheetHead(esc(sk.name), 'Calisthenics-Skill')}<div class="sheet-body"></div><div class="sheet-foot"></div>`, { tall: true });
  draw();
}

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}

function planCard(key, plan, isToday, active, sessions) {
  const label = WEEKDAYS_LONG[store.weekdayOf(key)] + (isToday ? ' · heute' : '');
  let body = '';
  if (!plan || plan.kind === 'rest') {
    body = `<div class="sess"><span class="ic">${icon('walk')}</span><div><div class="t1">${esc(plan ? plan.title : 'Frei')}</div><div class="t2">${esc(plan ? plan.focus : '')}</div></div></div>
      <p class="hint" style="margin:12px 0 0">Ruhetag heißt nicht stillsitzen: ein Spaziergang oder 10.000 Schritte zählen für deinen Sport-Ring – genau wie Schlaf und Reha.</p>`;
  } else if (plan.kind === 'gym') {
    const gt = gymTimeFor(key);
    body = `<div class="sess"><span class="ic">${icon('dumbbell')}</span><div><div class="t1">${esc(plan.title)}</div><div class="t2">${esc(plan.focus || '')} · ${plan.exercises.length} Übungen</div></div></div>
      <div class="gymt" style="margin:12px 0 0">${Object.entries(GYM_TIMES).map(([k, l]) => `<button class="chipbtn sm ${gt === k ? 'on' : ''}" data-gymt="${k}">${l}</button>`).join('')}</div>
      <div style="margin-top:10px">${plan.exercises.map((ex, i) => {
        const tg = store.progressionFor(ex);
        const sr = ex.load === 'time' ? `${ex.sets} × ${tg.s} s` : `${ex.sets} × ${ex.reps[0]}–${ex.reps[1]}`;
        const w = ex.load === 'time' ? '' : tg.w != null && tg.w > 0 ? ` · ${ex.load === 'bw' ? '+' : ''}${store.fmtKg(tg.w)} kg` : '';
        return `<div class="ex-prev"><span class="n">${i + 1}</span><span class="nm">${esc(ex.n)}${tg.up ? ` <span class="tag kraft" style="margin-left:4px">↑</span>` : ''}</span><span class="sr">${sr}${w}</span></div>`;
      }).join('')}</div>`;
  } else {
    const st = store.sportType(plan.sport);
    body = `<div class="sess"><span class="ic">${icon(st.icon)}</span><div><div class="t1">${esc(plan.title)}</div><div class="t2">${esc(plan.focus || '')}${plan.min ? ` · ca. ${plan.min} Min` : ''}</div></div></div>`;
  }
  const done = sessions.map(x => {
    const st = store.sportType(x.type);
    return `<div class="ex-prev"><span class="n" style="background:var(--nut);color:var(--on-ink)">${icon('check')}</span>
      <span class="nm">${esc(x.title)}<span class="sub" style="display:block">${x.min} Min · Intensität ${x.rpe}/10${x.detail ? ` · ${esc(x.detail)}` : ''}</span></span>
      <button class="qa-rm" data-rmsess="${x.id}" aria-label="Löschen">${icon('trash')}</button></div>`;
  }).join('');
  let actions = '';
  if (isToday && active) actions = `<button class="btn accent" data-start>${icon('play')}Workout fortsetzen</button>`;
  else if (isToday && plan && plan.kind === 'gym' && !sessions.some(x => x.workoutId)) actions = `<button class="btn accent" data-start>${icon('play')}Workout starten</button>`;
  const future = key > store.todayKey();
  if (!future) actions += `<button class="btn ${actions ? 'ghost' : 'accent'}" data-log="${plan && plan.kind === 'sport' ? plan.sport : plan && plan.kind === 'rest' ? 'walk' : ''}">${icon('plus')}Einheit eintragen</button>`;
  const otherGym = isToday && !active && !(plan && plan.kind === 'gym');
  return `<div class="card">
    <div class="ch"><span class="chip spo">${icon('calendar')}${esc(label)}</span>${sessions.length ? `<span class="done-tag" style="color:var(--spo)">Erledigt${icon('check')}</span>` : ''}</div>
    ${body}
    ${done ? `<div class="part-head" style="margin-top:14px"><b>Eingetragen</b></div>${done}` : ''}
    ${actions ? `<div class="sess-actions">${actions}</div>` : `<p class="hint" style="margin:12px 0 0">Geplant – eintragen kannst du am Tag selbst.</p>`}
    ${otherGym ? `<button class="steps-line" data-gympick style="justify-content:center;font-weight:800;font-size:13.5px">${icon('dumbbell')}Spontan ins Gym? Workout wählen</button>` : ''}
  </div>`;
}

// Gym-Workout an einem anderen Tag starten (z. B. statt Basketball)
function openGymPicker(key) {
  const tr = store.getState().training;
  const gyms = Object.entries(tr).filter(([, d]) => d && d.kind === 'gym');
  const sheet = openSheet(`${sheetHead('Welches Workout?', 'Dein Plan bleibt unverändert')}
    ${gyms.map(([wd, d]) => `<button class="row" data-wd="${wd}" style="padding-left:0;padding-right:0"><span class="row-ic" style="background:var(--spo-t);color:var(--spo)">${icon('dumbbell')}</span>
      <span class="row-main"><div class="row-t">${esc(d.title)}</div><div class="row-s">${esc(d.focus || '')} · ${d.exercises.length} Übungen · sonst ${WEEKDAYS_LONG[wd]}</div></span>${icon('play')}</button>`).join('')}`);
  $$('[data-wd]', sheet).forEach(b => b.onclick = () => { closeSheet(); openWorkout(key, Number(b.dataset.wd)); });
}

function loadCard(today) {
  const l = store.trainingLoad(today);
  const zone = { low: ['eher wenig', 'Du kannst mehr – Belastung langsam steigern.'], optimal: ['optimal', 'Genau richtig: genug Reiz, geringes Verletzungsrisiko.'], elevated: ['erhöht', 'Mehr als sonst – aufs Knie hören, Schlaf priorisieren.'], high: ['sehr hoch', 'Deutlich über deinem Schnitt – 1–2 lockere Tage einbauen.'], none: [l.building ? 'baut sich auf' : 'keine Daten', l.building ? 'Nach ca. 2 Wochen mit Einträgen wird die Bewertung aussagekräftig.' : 'Trag deine Einheiten ein, dann siehst du hier deine Belastung.'] }[l.zone];
  const pos = l.ratio != null && !l.building ? Math.min(100, Math.max(0, l.ratio / 2 * 100)) : null;
  const max = Math.max(1, ...l.weeks);
  return `<div class="card">
    <div class="ch"><span class="ch-title">Belastung</span><span class="sub">Minuten × Intensität</span></div>
    <div class="big-row">
      <div><div class="mid num">${de(l.acute)}</div><div class="lbl" style="margin-top:5px">letzte 7 Tage</div></div>
      <div style="text-align:right"><div class="mid num">${l.ratio != null ? de(l.ratio, 2) : '–'}</div><div class="lbl" style="margin-top:5px">Verhältnis zum Schnitt</div></div>
    </div>
    <div class="load"><div class="row-l"><span>Akut : chronisch</span><b class="${l.zone}">${zone[0]}</b></div>
      <div class="gauge ${pos == null ? 'off' : ''}">${pos != null ? `<i style="left:${pos}%"></i>` : ''}</div></div>
    <p class="hint" style="margin:10px 0 12px">${zone[1]}</p>
    ${l.weeks.some(Boolean) ? `<svg class="chart" viewBox="0 0 300 92">
      ${l.weeks.map((w, i) => {
        const h = Math.round(w / max * 64);
        const x = 12 + i * 72;
        return `<rect x="${x}" y="${70 - h}" width="56" height="${Math.max(2, h)}" rx="8" fill="${i === 3 ? '#4D8DFF' : '#26324A'}"/>
          <text x="${x + 28}" y="86" text-anchor="middle">${i === 3 ? 'diese Woche' : `vor ${3 - i} Wo`}</text>
          ${w ? `<text x="${x + 28}" y="${64 - h}" text-anchor="middle" style="fill:var(--ink-2)">${de(w)}</text>` : ''}`;
      }).join('')}
    </svg>` : ''}
  </div>`;
}

function muscleCard(today) {
  const vol = store.muscleVolume(today, 7);
  const max = Math.max(10, ...Object.values(vol));
  if (!Object.keys(vol).length) return '';
  return `<div class="card">
    <div class="ch"><span class="ch-title">Muskeln diese Woche</span><span class="sub">Sätze</span></div>
    ${MUSCLES.map(m => `<div class="vol"><span>${m}</span><span class="bar"><i style="width:${(vol[m] || 0) / max * 100}%"></i></span><span>${vol[m] || 0}</span></div>`).join('')}
    <p class="hint" style="margin:8px 0 0">Richtwert für Muskelaufbau: ca. 10–20 harte Sätze pro Muskel und Woche.</p>
  </div>`;
}

function liftsCard() {
  const ex = store.liftExercises().slice(0, 8);
  return `<div class="card">
    <div class="ch"><span class="ch-title">Rekorde</span><button class="more" id="lift-manual">${icon('plus')}Satz</button></div>
    ${ex.length ? ex.map(e => `<button class="pr-row" data-lift="${esc(e.name)}">
      <span class="badge-ico" style="background:var(--spo-t);color:var(--spo)">${icon('medal')}</span>
      <span class="qa-main"><div class="qa-nm">${esc(e.name)}</div><div class="qa-am">zuletzt ${e.last.bw ? (e.last.weight ? '+' + store.fmtKg(e.last.weight) + ' kg' : 'Körpergewicht') : store.fmtKg(e.last.weight) + ' kg'} × ${e.last.reps}</div></span>
      <span class="pv"><b class="num">${de(e.pr.e1rm)} kg</b><span>1RM GESCHÄTZT</span></span></button>`).join('')
      : '<div class="empty">Deine Rekorde erscheinen hier automatisch, sobald du Workouts machst.</div>'}
  </div>`;
}

function gamesCard(today) {
  const games = store.upcomingGames(today, 5);
  if (!games.length) return '';
  const mon = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return `<div class="card">
    <div class="ch"><span class="ch-title">Spielplan TSC</span><span class="sub">nächste ${games.length}</span></div>
    ${games.map(g => { const d = store.dateOf(g.date); const dd = store.daysBetween(today, g.date); return `
      <div class="game"><div class="gd"><b>${d.getDate()}</b><span>${mon[d.getMonth()]}</span></div>
        <div class="gm"><b>${g.home ? 'vs' : '@'} ${esc(g.opponent)}</b><span>${WEEKDAYS[d.getDay()]} · ${esc(g.time)} · ${dd === 0 ? 'heute' : dd === 1 ? 'morgen' : `in ${dd} Tagen`}</span></div>
        <span class="ha ${g.home ? 'home' : ''}">${g.home ? 'HEIM' : 'AUSW.'}</span></div>`; }).join('')}
  </div>`;
}

// --- Einheit eintragen (Dauer × Intensität) ---------------------------------
export function openSessionSheet(key, { sport } = {}) {
  const plan = store.getTrainingFor(key);
  let type = sport || (plan && plan.kind === 'sport' ? plan.sport : plan && plan.kind === 'gym' ? 'gym' : 'walk');
  if (store.gamesForDate(key).length && !sport) type = 'game';
  let min = (plan && plan.kind === 'sport' && plan.sport === type && plan.min) || store.sportType(type).min;
  let rpe = type === 'walk' ? 3 : 7;
  const sheet = openSheet(`${sheetHead('Einheit eintragen', 'Dauer × Intensität = deine Trainingslast')}
    <div class="sheet-body">
      <div class="chips" id="ss-types">${SPORT_TYPES.map(t => `<button class="chipbtn" data-type="${t.id}">${icon(t.icon)}${t.label}</button>`).join('')}</div>
      <div class="part-head" style="margin-top:16px"><b>Dauer</b></div>
      <div class="stepper"><button class="st-btn" data-m="-5">${icon('minus')}</button><div class="st-val num" id="ss-min"></div><button class="st-btn" data-m="5">${icon('plus')}</button></div>
      <div class="chips" style="margin-top:8px">${[30, 45, 60, 90, 120].map(m => `<button class="chipbtn" data-mset="${m}">${m} Min</button>`).join('')}</div>
      <div class="part-head" style="margin-top:16px"><b>Wie hart war's?</b><span id="ss-load"></span></div>
      <div class="rpe">${Array.from({ length: 10 }, (_, i) => `<button data-rpe="${i + 1}">${i + 1}</button>`).join('')}</div>
      <div class="rpe-label" id="ss-rpel"></div>
    </div>
    <div class="sheet-foot"><button class="btn block" id="ss-save">${icon('check')}Eintragen</button></div>`, { tall: true });
  const show = () => {
    $$('[data-type]', sheet).forEach(b => b.classList.toggle('on', b.dataset.type === type));
    $$('[data-rpe]', sheet).forEach(b => b.classList.toggle('on', Number(b.dataset.rpe) === rpe));
    $$('[data-mset]', sheet).forEach(b => b.classList.toggle('on', Number(b.dataset.mset) === min));
    $('#ss-min', sheet).innerHTML = `${min}<small>MINUTEN</small>`;
    $('#ss-rpel', sheet).textContent = `${rpe}/10 · ${RPE_LABELS[rpe]}`;
    $('#ss-load', sheet).textContent = `Last ${de(min * rpe)}`;
  };
  $$('[data-type]', sheet).forEach(b => b.onclick = () => { type = b.dataset.type; min = (plan && plan.kind === 'sport' && plan.sport === type && plan.min) || store.sportType(type).min; show(); });
  $$('[data-m]', sheet).forEach(b => b.onclick = () => { min = Math.max(5, min + Number(b.dataset.m)); haptic(4); show(); });
  $$('[data-mset]', sheet).forEach(b => b.onclick = () => { min = Number(b.dataset.mset); show(); });
  $$('[data-rpe]', sheet).forEach(b => b.onclick = () => { rpe = Number(b.dataset.rpe); haptic(4); show(); });
  $('#ss-save', sheet).onclick = () => {
    const title = plan && plan.kind === 'sport' && plan.sport === type ? plan.title : store.sportType(type).label;
    store.addSession(key, { type, min, rpe, title });
    closeSheet(); haptic(12); afterChange(key);
    toast(`${title} eingetragen · Last ${de(min * rpe)}`);
  };
  show();
}

// --- Schritte -----------------------------------------------------------------
export function openStepsSheet(key) {
  let n = store.getSteps(key);
  const goal = store.getState().profile.stepGoal || 10000;
  const sheet = openSheet(`${sheetHead('Schritte', `Minimum ${de(goal)} an Tagen ohne Einheit`)}
    <p class="hint">Die Zahl findest du in der Health-App auf deinem iPhone. Einfach übertragen.</p>
    <div class="field"><input type="number" inputmode="numeric" id="st-n" value="${n || ''}" placeholder="0" style="font-size:28px;font-weight:850;text-align:center"></div>
    <div class="chips" style="justify-content:center">${[1000, 2500, 5000].map(x => `<button class="chipbtn" data-add="${x}">+${de(x)}</button>`).join('')}<button class="chipbtn" data-set="${goal}">${de(goal)}</button></div>
    <div class="sheet-foot"><button class="btn block" id="st-save">${icon('check')}Speichern</button></div>`);
  const inp = $('#st-n', sheet);
  $$('[data-add]', sheet).forEach(b => b.onclick = () => { inp.value = (Number(inp.value) || 0) + Number(b.dataset.add); });
  $$('[data-set]', sheet).forEach(b => b.onclick = () => { inp.value = b.dataset.set; });
  $('#st-save', sheet).onclick = () => { store.setSteps(key, inp.value); closeSheet(); afterChange(key); toast('Schritte gespeichert'); };
}

// --- Kraft-Log ----------------------------------------------------------------
function openLiftHistory(name) {
  const sets = store.getLiftsFor(name).slice().reverse();
  const sheet = openSheet(`${sheetHead(esc(name), `${sets.length} Sätze`)}
    <div class="sheet-body">${sets.map(x => {
      const d = store.dateOf(x.date);
      const pr = store.isLiftPR(x.id);
      return `<div class="entry"><span class="qa-main"><div class="qa-nm">${x.bw ? (x.weight ? '+' + store.fmtKg(x.weight) + ' kg' : 'Körpergewicht') : store.fmtKg(x.weight) + ' kg'} × ${x.reps}${pr ? ' <span class="tag kraft">Rekord</span>' : ''}</div>
        <div class="qa-am">${d.getDate()}.${d.getMonth() + 1}. · 1RM ≈ ${de(store.liftScore(x))} kg</div></span>
        <button class="qa-rm" data-del="${x.id}">${icon('trash')}</button></div>`;
    }).join('')}</div>`, { tall: true });
  $$('[data-del]', sheet).forEach(b => b.onclick = () => { store.deleteLift(b.dataset.del); closeSheet(); router.rerender(); });
}

function openManualLift() {
  const names = [...new Set([...Object.values(store.getState().training).flatMap(d => ((d && d.exercises) || []).filter(e => e.load !== 'time').map(e => e.n)), ...store.liftExercises().map(x => x.name)])];
  const sheet = openSheet(`${sheetHead('Satz eintragen', 'Ohne Workout-Modus')}
    <label class="field"><span>Übung</span><input id="ml-n" list="ml-names" placeholder="z. B. Kreuzheben"><datalist id="ml-names">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist></label>
    <div class="grid2"><label class="field"><span>Gewicht (kg)</span><input id="ml-w" type="text" inputmode="decimal"></label>
      <label class="field"><span>Wiederholungen</span><input id="ml-r" type="number" inputmode="numeric"></label></div>
    <div class="sheet-foot"><button class="btn block" id="ml-save">${icon('check')}Speichern</button></div>`);
  $('#ml-save', sheet).onclick = () => {
    const n = $('#ml-n', sheet).value.trim(), w = Number(String($('#ml-w', sheet).value).replace(',', '.')), r = Number($('#ml-r', sheet).value);
    if (!n || !r) return toast('Übung und Wiederholungen eintragen');
    store.logLift(n, w || 0, r);
    closeSheet(); router.rerender(); toast('Satz gespeichert');
  };
}
