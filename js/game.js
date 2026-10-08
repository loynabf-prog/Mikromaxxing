// ============================================================================
// Mikromaxxing – Level, Missionen, Wochen-Challenge, Motivations-Profil
// XP werden aus den echten Daten berechnet (Rückgängig = XP weg, keine Tricks).
// Missionen werden pro Tag einmal gewählt – angepasst an Tagestyp, Schwächen
// und an das, was nachweislich motiviert.
// ============================================================================
import * as store from './store.js';
import { skillUps } from './skills.js';

// --- Ränge -------------------------------------------------------------------------
export const RANKS = [
  { from: 1, name: 'Rookie' }, { from: 5, name: 'Starter' }, { from: 10, name: 'Leistungsträger' },
  { from: 15, name: 'Captain' }, { from: 20, name: 'All-Star' }, { from: 25, name: 'MVP' }, { from: 30, name: 'Legende' },
];
const xpForLevel = (n) => 60 * (n - 1) * n; // L2: 120, L3: 360, L5: 1200, L10: 5400
export function levelInfo(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const base = xpForLevel(level), next = xpForLevel(level + 1);
  const rank = [...RANKS].reverse().find(r => level >= r.from);
  const nextRank = RANKS.find(r => r.from > level);
  return { level, rank: rank.name, nextRank: nextRank ? nextRank : null, xp, into: xp - base, need: next - base, pct: Math.round((xp - base) / (next - base) * 100) };
}

// --- XP pro Tag ------------------------------------------------------------------------
export function dayXP(key) {
  const s = store.getState();
  const d = s.log[key];
  if (!d) return { xp: 0, parts: [] };
  const parts = [];
  const add = (label, xp) => { if (xp > 0) parts.push({ label, xp }); };
  add('Einträge', Math.min(20, (d.entries || []).length * 2));
  const p = store.dayPillars(key);
  if (p.nutrition >= 100) add('Ernährungs-Ring voll', 20);
  if (p.sport >= 100) add('Sport-Ring voll', 20);
  if (!p.legacy && p.regen >= 100) add('Regenerations-Ring voll', 20);
  if (store.dayComplete(key)) add('Tagesziel geschafft', 30);
  if (key >= (s._v4Since || '0000') && store.inBudget(key) && (d.entries || []).length >= 3) add('Im Kalorien-Budget', 25);
  add('Einheiten', Math.min(50, (d.sessions || []).length * 25));
  add('Workout', (s.workouts || []).filter(w => w.key === key).length * 40);
  if (d.reha) add('Knie-Reha', 15);
  if (d.sleep != null) add('Schlaf eingetragen', 5);
  if (d.knee != null) add('Knie-Check', 5);
  if (d.weight != null) add('Gewogen', 5);
  if (d.skill) add('Skill-Training', 20);
  const m = s.missions[key];
  if (m && m.done) add('Missionen', Object.keys(m.done).reduce((a, id) => a + ((MISSIONS[id] && MISSIONS[id].xp) || 30), 0));
  return { xp: parts.reduce((a, x) => a + x.xp, 0), parts };
}
export function totalXP() {
  const s = store.getState();
  let xp = 0;
  for (const k of Object.keys(s.log)) xp += dayXP(k).xp;
  xp += (s.lifts || []).filter(l => store.isLiftPR(l.id)).length * 25;
  xp += skillUps() * 100;
  for (const w of Object.values(s.weekly || {})) if (w && w.done) xp += 150;
  return xp;
}

// --- Hilfen für Missionen -------------------------------------------------------------
const LIGHT_PROTEIN = new Set(['magerquark', 'cottage_cheese', 'protein_pudding', 'greek_yogurt', 'whey', 'kefir', 'harzer']);
function ctxFor(key, now) {
  const s = store.getState();
  const d = s.log[key] || { entries: [], sessions: [], supps: {} };
  const today = store.todayKey(now);
  const nowH = key < today ? 99 : key > today ? -1 : now.getHours() + now.getMinutes() / 60;
  const tot = store.computeTotals(key);
  const ent = (d.entries || []).map(e => ({ ...e, f: store.foodById(e.foodId), h: e.ts ? new Date(e.ts).getHours() + new Date(e.ts).getMinutes() / 60 : 12 })).filter(e => e.f);
  return { s, d, key, today, nowH, over: key < today, tot, ent, type: store.dayType(key), tg: store.macroTargets(key), plan: store.getTrainingFor(key) };
}
const pct = (a, b) => Math.max(0, Math.min(1, b ? a / b : 0));
const de = (x) => Math.round(x).toLocaleString('de-DE');

// --- Missions-Katalog ------------------------------------------------------------------
// cat: nut | spo | reg · style: target (Zahl erreichen) | habit (einfach machen) |
//      challenge (Disziplin) | record (eigenen Bestwert schlagen) | streak (Serie halten)
export const MISSIONS = {
  protein_first: { cat: 'nut', style: 'target', xp: 30, title: 'Erste Mahlzeit: 40 g Protein',
    desc: 'Starte das Essfenster mit einem Protein-Brett – das hält dich bis zum Training satt.',
    ev: (c) => { const g = c.ent.filter(e => e.h < 15.5).reduce((a, e) => a + (e.f.per100.protein || 0) * e.grams / 100, 0); return { p: pct(g, 40), done: g >= 40, label: `${de(g)} / 40 g` }; } },
  protein_goal: { cat: 'nut', style: 'target', xp: 35, title: 'Protein-Ziel knacken',
    desc: 'Dein Muskelschutz im Defizit.',
    ev: (c) => ({ p: pct(c.tot.protein, c.tg.protein), done: c.tot.protein >= c.tg.protein, label: `${de(c.tot.protein)} / ${de(c.tg.protein)} g` }) },
  budget: { cat: 'nut', style: 'challenge', xp: 40, title: 'Im Kalorien-Budget bleiben',
    desc: 'Der wichtigste Hebel für dein Tempo beim Abnehmen.',
    ev: (c) => {
      const ok = c.tot.kcal <= c.tg.kcal + 100;
      const settled = c.over || c.nowH >= 21.5;
      return { p: ok ? pct(c.tot.kcal, c.tg.kcal) : 0, done: settled && ok && c.tot.kcal >= c.tg.kcal * 0.6, failed: !ok, label: `${de(c.tot.kcal)} / ${de(c.tg.kcal)} kcal` };
    } },
  no_late: { cat: 'nut', style: 'challenge', xp: 40, title: 'Nach 22 Uhr nur Protein oder nichts',
    desc: 'Deine Schwachstelle: spät abends. Wenn Hunger, dann Quark oder Hüttenkäse.',
    ev: (c) => {
      const bad = c.ent.some(e => e.h >= 22 && !LIGHT_PROTEIN.has(e.f.id));
      return { p: bad ? 0 : c.nowH >= 22 ? 0.8 : 0.4, done: !bad && (c.over || c.nowH >= 23.5), failed: bad, label: bad ? 'leider gerissen' : c.nowH >= 22 ? 'läuft – durchhalten' : 'ab 22 Uhr' };
    } },
  water: { cat: 'nut', style: 'target', xp: 25, title: '3,5 L trinken',
    desc: 'Viel unterwegs beim Drehen – Flasche immer dabei.',
    ev: (c) => { const t = c.s.profile.water || 3500; return { p: pct(c.d.water || 0, t), done: (c.d.water || 0) >= t, label: `${(Math.round((c.d.water || 0) / 100) / 10).toString().replace('.', ',')} / ${(t / 1000).toString().replace('.', ',')} L` }; } },
  fish: { cat: 'nut', style: 'habit', xp: 30, title: 'Fisch für dein Knie',
    desc: 'Omega-3 wirkt entzündungshemmend – gut für die Patellasehne.',
    ev: (c) => { const ok = c.ent.some(e => e.f.cat === 'Fisch') || c.tot.omega3 >= 900; return { p: ok ? 1 : 0, done: ok, label: ok ? 'drin' : 'Lachs, Thunfisch, Makrele, Sushi …' }; } },
  veggies: { cat: 'nut', style: 'habit', xp: 25, title: 'Gemüse zu 2 Mahlzeiten',
    desc: 'Volumen ohne Kalorien – und Mikros für die Regeneration.',
    ev: (c) => { const parts = new Set(c.ent.filter(e => e.f.cat === 'Gemüse' && e.grams >= 60).map(e => store.partOfHour(Math.floor(e.h)).id)); return { p: pct(parts.size, 2), done: parts.size >= 2, label: `${parts.size} / 2` }; } },
  fiber: { cat: 'nut', style: 'target', xp: 25, title: '30 g Ballaststoffe',
    desc: 'Macht im Defizit satt und hält den Heißhunger weg.',
    ev: (c) => ({ p: pct(c.tot.fiber, 30), done: c.tot.fiber >= 30, label: `${de(c.tot.fiber)} / 30 g` }) },
  micros: { cat: 'nut', style: 'target', xp: 30, title: 'Mikros auf 80 %',
    desc: 'Vitamine und Mineralstoffe fast komplett gedeckt.',
    ev: (c) => { const m = store.microSummary(c.key, c.tot).coverage; return { p: pct(m, 80), done: m >= 80, label: `${m} / 80 %` }; } },
  protein_record: { cat: 'nut', style: 'record', xp: 40, title: 'Protein-Wochenbestwert schlagen',
    desc: 'Mehr Protein als an jedem Tag der letzten Woche.',
    when: (c) => bestOf(c, k => store.computeTotals(k).protein) > 60,
    ev: (c) => { const best = bestOf(c, k => store.computeTotals(k).protein); return { p: pct(c.tot.protein, best + 1), done: c.tot.protein > best, label: `${de(c.tot.protein)} / ${de(best + 1)} g` }; } },
  protein_streak: { cat: 'nut', style: 'streak', xp: 40, title: 'Protein-Serie halten',
    desc: 'Gestern Protein-Ziel geschafft – heute wieder.',
    when: (c) => streakOf(c, k => store.computeTotals(k).protein >= store.macroTargets(k).protein) >= 1,
    titleFn: (c) => `Protein-Serie: Tag ${streakOf(c, k => store.computeTotals(k).protein >= store.macroTargets(k).protein) + 1}`,
    ev: (c) => ({ p: pct(c.tot.protein, c.tg.protein), done: c.tot.protein >= c.tg.protein, label: `${de(c.tot.protein)} / ${de(c.tg.protein)} g` }) },
  budget_streak: { cat: 'nut', style: 'streak', xp: 45, title: 'Budget-Serie halten',
    desc: 'Gestern im Budget – mach die Serie länger.',
    when: (c) => streakOf(c, k => store.inBudget(k)) >= 1,
    titleFn: (c) => `Budget-Serie: Tag ${streakOf(c, k => store.inBudget(k)) + 1}`,
    ev: (c) => MISSIONS.budget.ev(c) },

  session: { cat: 'spo', style: 'habit', xp: 30, title: 'Training eintragen',
    desc: 'Heute steht Training an – eintragen füllt den Sport-Ring.',
    when: (c) => c.plan && c.plan.kind === 'sport' || c.type === 'basketball',
    ev: (c) => { const n = (c.d.sessions || []).length; return { p: n ? 1 : 0, done: n > 0, label: n ? 'erledigt' : 'offen' }; } },
  workout: { cat: 'spo', style: 'habit', xp: 35, title: 'Gym-Workout durchziehen',
    desc: 'Workout-Modus starten – Gewichte und Ziele sind vorbereitet.',
    when: (c) => c.plan && c.plan.kind === 'gym',
    ev: (c) => { const ok = (c.s.workouts || []).some(w => w.key === c.key); return { p: ok ? 1 : 0, done: ok, label: ok ? 'erledigt' : 'offen' }; } },
  pr: { cat: 'spo', style: 'record', xp: 45, title: 'Einen Rekord aufstellen',
    desc: 'Ein Satz mehr oder 2,5 kg mehr – irgendwo geht was.',
    when: (c) => c.plan && c.plan.kind === 'gym' && (c.s.lifts || []).length > 0,
    ev: (c) => { const ok = (c.s.lifts || []).some(l => l.date === c.key && store.isLiftPR(l.id)); return { p: ok ? 1 : 0, done: ok, label: ok ? 'Rekord!' : 'im Workout' }; } },
  steps: { cat: 'spo', style: 'target', xp: 30, title: '10.000 Schritte',
    desc: 'Ruhetag heißt nicht stillsitzen – Drehs zu Fuß zählen auch.',
    when: (c) => c.type === 'rest',
    ev: (c) => { const n = c.d.steps || 0, g = c.s.profile.stepGoal || 10000; return { p: pct(n, g), done: n >= g, label: `${de(n)} / ${de(g)}` }; } },
  steps_record: { cat: 'spo', style: 'record', xp: 35, title: 'Mehr Schritte als gestern',
    desc: 'Schlag deinen eigenen Wert von gestern.',
    when: (c) => c.type === 'rest' && store.getSteps(store.shiftDate(c.key, -1)) > 2000,
    ev: (c) => { const y = store.getSteps(store.shiftDate(c.key, -1)); const n = c.d.steps || 0; return { p: pct(n, y + 1), done: n > y, label: `${de(n)} / ${de(y + 1)}` }; } },
  skill: { cat: 'spo', style: 'habit', xp: 30, title: '10 Min Skill-Training',
    desc: 'Handstand, Back Lever oder Muscle-Up – vor dem Workout, wenn du frisch bist.',
    when: (c) => c.type !== 'basketball',
    ev: (c) => ({ p: c.d.skill ? 1 : 0, done: !!c.d.skill, label: c.d.skill ? 'erledigt' : 'Sport → Skills' }) },

  reha: { cat: 'reg', style: 'habit', xp: 25, title: 'Knie-Reha: 5 × 45 s',
    desc: 'Isometrie macht die Patellasehne belastbar – es wird ja schon besser.',
    ev: (c) => ({ p: c.d.reha ? 1 : 0, done: !!c.d.reha, label: c.d.reha ? 'erledigt' : '5 Minuten' }) },
  reha_streak: { cat: 'reg', style: 'streak', xp: 35, title: 'Reha-Serie halten',
    desc: 'Konstanz heilt Sehnen.',
    when: (c) => streakOf(c, k => !!(store.getState().log[k] || {}).reha) >= 2,
    titleFn: (c) => `Reha-Serie: Tag ${streakOf(c, k => !!(store.getState().log[k] || {}).reha) + 1}`,
    ev: (c) => MISSIONS.reha.ev(c) },
  sleep: { cat: 'reg', style: 'target', xp: 30, title: 'Mindestens 7 h geschlafen',
    desc: 'Schlaf ist dein stärkster Fatburner und Sehnen-Reparatur.',
    ev: (c) => { const h = c.d.sleep; return { p: h == null ? 0 : pct(h, 7), done: h != null && h >= 7, failed: h != null && h < 7, label: h == null ? 'eintragen' : `${String(h).replace('.', ',')} h` }; } },
  knee: { cat: 'reg', style: 'habit', xp: 15, title: 'Knie-Check machen',
    desc: '0–10 – so sehen wir, ob die Reha wirkt.',
    ev: (c) => ({ p: c.d.knee != null ? 1 : 0, done: c.d.knee != null, label: c.d.knee != null ? `${c.d.knee}/10` : 'offen' }) },
};

function bestOf(c, fn) { let b = 0; for (let i = 1; i <= 7; i++) b = Math.max(b, fn(store.shiftDate(c.key, -i))); return b; }
function streakOf(c, fn) { let n = 0; for (let i = 1; i <= 60; i++) { if (fn(store.shiftDate(c.key, -i))) n++; else break; } return n; }

// Deterministischer Zufall pro Datum
function rng(seedStr) {
  let h = 2166136261;
  for (const ch of seedStr) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}
function pickWeighted(list, weight, r) {
  const tot = list.reduce((a, x) => a + weight(x), 0);
  let t = r() * tot;
  for (const x of list) { t -= weight(x); if (t <= 0) return x; }
  return list[list.length - 1];
}

// --- Motivations-Profil: welche Art Mission schafft Fassi wirklich? ----------------------
export const STYLE_LABELS = { target: 'Zahlen erreichen', habit: 'Einfach abhaken', challenge: 'Disziplin-Challenges', record: 'Eigene Rekorde schlagen', streak: 'Serien halten' };
export function motivationProfile(today = store.todayKey()) {
  const s = store.getState();
  const by = {};
  let days = 0;
  for (const [k, m] of Object.entries(s.missions || {})) {
    if (k >= today || !m || !m.ids) continue;
    days++;
    for (const id of m.ids) {
      const def = MISSIONS[id];
      if (!def) continue;
      const b = by[def.style] || (by[def.style] = { n: 0, done: 0 });
      b.n++;
      if (m.done && m.done[id]) b.done++;
    }
  }
  const styles = Object.entries(by).map(([style, b]) => ({ style, label: STYLE_LABELS[style], n: b.n, rate: b.n ? b.done / b.n : 0 }))
    .sort((a, b) => b.rate - a.rate);
  return { days, styles, top: days >= 5 && styles.length ? styles[0] : null };
}

// --- Tagesmissionen ---------------------------------------------------------------------
export function missionsFor(key = store.todayKey(), now = new Date()) {
  const s = store.getState();
  const today = store.todayKey(now);
  let rec = s.missions[key];
  if (!rec || !rec.ids) {
    if (key !== today) return [];
    rec = s.missions[key] = { ids: chooseMissions(key, now), done: {} };
    store.save();
  }
  const c = ctxFor(key, now);
  const out = rec.ids.filter(id => MISSIONS[id]).map(id => {
    const def = MISSIONS[id];
    const r = def.ev(c);
    if (r.done && !rec.done[id]) { rec.done[id] = true; store.save(); }
    const done = !!rec.done[id];
    return { id, ...def, title: def.titleFn ? def.titleFn(c) : def.title, done, p: done ? 1 : r.p, label: r.label, failed: !done && !!r.failed };
  });
  return out;
}

function chooseMissions(key, now) {
  const c = ctxFor(key, now);
  const r = rng('m' + key);
  const prof = motivationProfile(key);
  const styleW = Object.fromEntries(prof.styles.map(x => [x.style, x.n >= 3 ? 0.5 + x.rate * 1.5 : 1]));
  // Schwächen aus der letzten Woche: Kategorien mit wenig Erfolg bekommen eine Mission mehr Gewicht
  const avail = Object.entries(MISSIONS).filter(([, m]) => !m.when || m.when(c)).map(([id, m]) => ({ id, ...m }));
  const w = (m) => (styleW[m.style] || 1) * (['budget', 'no_late', 'budget_streak'].includes(m.id) ? 2 : 1) * (m.id === 'protein_record' || m.id === 'steps_record' ? 0.7 : 1);
  const picks = [];
  for (const cat of ['nut', 'spo', 'reg']) {
    const list = avail.filter(m => m.cat === cat && !picks.includes(m.id));
    if (list.length) picks.push(pickWeighted(list, w, r).id);
  }
  // Abnehmen hat Vorrang: wenn noch keine Budget-/Spät-Mission drin ist, die Ernährungsmission jeden 2. Tag tauschen
  if (!picks.some(id => ['budget', 'no_late', 'budget_streak'].includes(id)) && r() < 0.5) {
    const alt = avail.filter(m => ['budget', 'no_late', 'budget_streak'].includes(m.id));
    if (alt.length) picks[0] = pickWeighted(alt, w, r).id;
  }
  return picks;
}

// --- Wochen-Challenge (Mo–So) -------------------------------------------------------------
export function weekStart(key) { const wd = store.weekdayOf(key); return store.shiftDate(key, -((wd + 6) % 7)); }
const WEEKLY = {
  w_budget5: { title: '5 Tage im Kalorien-Budget', goal: 5, count: (k) => store.inBudget(k) && (store.getState().log[k] || { entries: [] }).entries.length >= 3 },
  w_rings4: { title: '4 Tage Tagesziel geschafft', goal: 4, count: (k) => store.dayComplete(k) },
  w_nolate5: { title: '5 Abende ohne Spät-Snack', goal: 5, count: (k) => { const d = store.getState().log[k]; if (!d || !d.entries.length) return false; return !d.entries.some(e => { const f = store.foodById(e.foodId); return f && e.ts && new Date(e.ts).getHours() >= 22 && !LIGHT_PROTEIN.has(f.id); }); } },
  w_fish2: { title: '2× Fisch diese Woche', goal: 2, count: (k) => { const d = store.getState().log[k]; return !!d && d.entries.some(e => { const f = store.foodById(e.foodId); return f && f.cat === 'Fisch'; }); } },
  w_reha5: { title: '5× Knie-Reha', goal: 5, count: (k) => !!(store.getState().log[k] || {}).reha },
  w_skill3: { title: '3× Skill-Training', goal: 3, count: (k) => !!(store.getState().log[k] || {}).skill },
};
export function weeklyChallenge(key = store.todayKey()) {
  const s = store.getState();
  const wk = weekStart(key);
  let rec = s.weekly[wk];
  if (!rec) {
    const r = rng('w' + wk);
    const ids = Object.keys(WEEKLY);
    const prev = s.weekly[store.shiftDate(wk, -7)];
    const pool = ids.filter(id => !prev || prev.id !== id);
    rec = s.weekly[wk] = { id: pool[Math.floor(r() * pool.length)], done: false };
    store.save();
  }
  const def = WEEKLY[rec.id];
  let n = 0;
  for (let i = 0; i < 7; i++) { const k = store.shiftDate(wk, i); if (k > key) break; if (def.count(k)) n++; }
  if (n >= def.goal && !rec.done) { rec.done = true; store.save(); }
  const left = 7 - store.daysBetween(wk, key) - 1;
  return { id: rec.id, title: def.title, goal: def.goal, n: Math.min(n, def.goal), done: rec.done, daysLeft: Math.max(0, left), xp: 150 };
}
