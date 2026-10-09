// ============================================================================
// Mikromaxxing – „Dein Tag" & „Was soll ich essen?"
// Baut aus Persona (Rhythmus, Essfenster), Training/Spielen und dem, was schon
// gegessen wurde, einen Fahrplan – und schlägt passende Gerichte vor.
// ============================================================================
import * as store from './store.js';
import { RECIPES, PERSONA } from './persona.js';
import { NUTRIENTS } from './data.js';
import { GAP_KEYS } from './store.js';

const toH = (str) => { const [h, m] = String(str || '0:0').split(':').map(Number); return h + (m || 0) / 60; };
export const fmtH = (h) => { h = ((h % 24) + 24) % 24; const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return `${String(mm === 60 ? hh + 1 : hh).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`; };

export const GYM_TIMES = { morning: 'Morgens', evening: 'Abends', night: 'Nachts' };
export function gymTimeFor(key) { return store.dayMeta(key, 'gymTime') || store.getState().profile.gymDefault || PERSONA.training.gymDefault; }

// Wann wird heute trainiert?
export function trainingWindow(key) {
  const plan = store.getTrainingFor(key);
  const game = store.gamesForDate(key)[0];
  if (game) return { start: toH(game.time) - 0.75, end: toH(game.time) + 1.75, title: `Spiel ${game.home ? 'vs' : '@'} ${game.opponent}`, kind: 'game', icon: 'trophy' };
  if (!plan || plan.kind === 'rest') return null;
  if (plan.kind === 'gym') {
    const t = gymTimeFor(key);
    const start = toH(PERSONA.training.gymTimes[t] || '18:30');
    return { start, end: start + 1.25, title: plan.title, kind: 'gym', gymTime: t, icon: 'dumbbell' };
  }
  const start = plan.time ? toH(plan.time) : 18.5;
  const dur = (plan.min || 90) / 60;
  return { start, end: start + dur, title: plan.title, kind: plan.sport === 'basketball' ? 'basketball' : 'sport', icon: store.sportType(plan.sport).icon };
}

function entriesBetween(key, day, from, to) {
  return (day ? day.entries : []).filter(e => {
    const h = e.ts ? store.hourOn(key, e.ts) : 12;
    return h >= from && h < to;
  });
}
function sumEntries(list) {
  let kcal = 0, protein = 0;
  for (const e of list) { const f = store.foodById(e.foodId); if (!f) continue; kcal += (f.per100.kcal || 0) * e.grams / 100; protein += (f.per100.protein || 0) * e.grams / 100; }
  return { kcal, protein };
}

// --- Dein Tag ------------------------------------------------------------------
// slot: { id, type: 'drink'|'meal'|'train'|'sleep', slot (für Empfehlungen), t, title, text, supps, share, status, eaten, target }
export function dayPlan(key = store.todayKey(), now = new Date()) {
  const s = store.getState();
  const p = s.profile;
  const isToday = key === store.todayKey(now);
  const isPast = key < store.todayKey(now);
  const nowH = isToday ? store.hourOn(key, now.getTime()) : isPast ? 99 : -1;
  const day = s.log[key];
  const tgt = store.macroTargets(key);
  const tr = trainingWindow(key);
  const wake = toH(p.wakeTime || PERSONA.life.wake);
  let first = toH(p.firstMeal || PERSONA.eating.firstMeal);
  // Training/Spiel um die Mittagszeit: erste Mahlzeit ca. 2 h vorher
  if (tr && tr.start >= 11 && tr.start < 15) first = Math.max(wake + 1, Math.min(first, tr.start - 2));
  const bed = (wake - (p.sleepTarget || 7.5) + 24) % 24;
  const slots = [];
  const meal = (id, slot, t, title, text, share, pshare) => slots.push({ id, type: 'meal', slot, t, title, text, share, pshare: pshare ?? share });

  slots.push({ id: 'wake', type: 'drink', t: wake, title: 'Aufstehen', text: '500 ml Wasser, dann Kaffee – Frühstück brauchst du nicht.' });
  if (tr && tr.start < 11) {
    slots.push({ id: 'train', type: 'train', t: tr.start, title: tr.title, text: 'Nüchtern trainieren ist okay – vorher ein Glas Wasser.', icon: tr.icon });
    meal('post', 'post', tr.end + 0.2, 'Nach dem Training', 'Shake oder Skyr – Protein jetzt, die erste richtige Mahlzeit kommt mittags.', 0.12, 0.17);
  }
  meal('first', 'first', first, 'Erste Mahlzeit', 'Deine Bowl: viel Protein, Gemüse, Carbs. Dazu die Supps mit Fett.', 0.34, 0.3);
  if (tr && tr.start >= 15 && tr.start < 20.5) {
    meal('pre', 'pre', Math.max(first + 2.5, tr.start - 1.75), 'Vor dem Training', 'Leichte Carbs + etwas Protein, nichts Schweres.', 0.12, 0.1);
    slots.push({ id: 'train', type: 'train', t: tr.start, title: tr.title, text: tr.kind === 'basketball' || tr.kind === 'game' ? 'Knie warm machen: 2 × 45 s Wall Sit vorm Spielen.' : 'Erst 10 Min Skill-Training, dann der Plan.', icon: tr.icon });
    meal('dinner', 'dinner', tr.end + 0.3, 'Nach dem Training', 'Hauptmahlzeit: Protein + Carbs – hier wird regeneriert.', 0.36, 0.33);
  } else if (tr && tr.start >= 20.5) {
    meal('dinner', 'dinner', 19, 'Abendessen', 'Normal essen, mind. 90 Min vor dem Gym.', 0.38, 0.3);
    slots.push({ id: 'train', type: 'train', t: tr.start, title: tr.title, text: 'Erst 10 Min Skill-Training, dann der Plan.', icon: tr.icon });
    meal('post', 'post', tr.end + 0.15, 'Nach dem Gym', 'Nur ein Shake oder Quark – kein großes Essen mehr so spät.', 0.08, 0.15);
  } else if (tr && tr.start >= 11 && tr.start < 15) {
    slots.push({ id: 'train', type: 'train', t: tr.start, title: tr.title, text: tr.kind === 'gym' ? 'Erst 10 Min Skill-Training, dann der Plan.' : 'Knie warm machen: 2 × 45 s Wall Sit vorm Spielen.', icon: tr.icon });
    meal('dinner', 'dinner', tr.end + 0.3, 'Nach dem Training', 'Protein + Carbs – hier wird regeneriert.', 0.36, 0.33);
  } else {
    if (tr) slots.push({ id: 'train', type: 'train', t: tr.start, title: tr.title, text: '', icon: tr.icon });
    meal('dinner', 'dinner', toH(PERSONA.eating.dinnerRest), 'Abendessen', 'Protein + viel Gemüse. Heute zählt das Budget.', 0.42, 0.38);
  }
  const lastT = Math.max(...slots.map(x => x.t));
  const bedT = Math.max(bed < 12 ? bed + 24 : bed, lastT + 0.75);
  const lateT = Math.min(Math.max(21.5, lastT + 1.25), bedT - 0.25);
  if (!slots.some(x => x.id === 'post' && x.t > 21) && lateT - lastT >= 0.6) {
    meal('late', 'late', lateT, 'Spät-Snack (nur bei Hunger)', 'Wenn noch was rein muss: Magerquark oder Hüttenkäse – nicht der Kühlschrank.', 0.1, 0.12);
  }
  slots.push({ id: 'bed', type: 'sleep', t: bedT, title: 'Ins Bett', text: `Für ${String(p.sleepTarget || 7.5).replace('.', ',')} h Schlaf bis ${fmtH(wake)}.` });
  slots.sort((a, b) => a.t - b.t);

  // Supplements an die passenden Momente hängen
  const supps = s.supplements;
  const attach = (id, pred) => { const sl = slots.find(x => x.id === id) || slots.find(x => x.id === 'first'); if (sl) sl.supps = [...(sl.supps || []), ...supps.filter(pred)]; };
  attach('wake', x => x.time === 'morgens');
  attach('first', x => x.time === 'mittags' || x.time === 'egal');
  attach(slots.some(x => x.id === 'pre') ? 'pre' : slots.some(x => x.id === 'post') ? 'post' : 'first', x => x.time === 'pre');
  attach(slots.some(x => x.id === 'late') ? 'late' : 'dinner', x => x.time === 'abends');

  // Zeitfenster, Status und was schon gegessen wurde
  const meals = slots.filter(x => x.type === 'meal');
  meals.forEach((m, i) => {
    const prev = meals[i - 1], next = meals[i + 1];
    m.from = prev ? (prev.t + m.t) / 2 : 0;
    m.to = next ? (m.t + next.t) / 2 : 29;
    m.eaten = sumEntries(entriesBetween(key, day, m.from, m.to));
  });
  const totals = store.computeTotals(key);
  const kcalLeft = Math.max(0, tgt.kcal - totals.kcal);
  const protLeft = Math.max(0, tgt.protein - totals.protein);
  const open = meals.filter(m => m.eaten.kcal < 80 && nowH < m.to);
  const shareSum = open.reduce((a, m) => a + m.share, 0) || 1;
  const pshareSum = open.reduce((a, m) => a + m.pshare, 0) || 1;
  for (const m of meals) {
    if (m.eaten.kcal >= 80) m.status = 'done';
    else if (nowH >= m.to) m.status = 'skipped';
    else if (nowH >= Math.max(m.from, m.t - 1.25)) m.status = 'now';
    else m.status = 'later';
    const cap = { late: 450, pre: 600, post: 500 }[m.slot] || 1500;
    if (open.includes(m)) m.target = { kcal: Math.min(cap, Math.round(kcalLeft * m.share / shareSum / 10) * 10), protein: Math.min(m.slot === 'late' || m.slot === 'post' ? 45 : 90, Math.round(protLeft * m.pshare / pshareSum)) };
  }
  for (const x of slots) if (x.type !== 'meal') x.status = nowH >= x.t + (x.type === 'train' ? 1.5 : 0.5) ? 'done' : nowH >= x.t - 0.25 ? 'now' : 'later';
  // Spät-Snack ist optional: nicht als „verpasst" zählen
  const late = slots.find(x => x.id === 'late');
  if (late && late.status === 'skipped') late.status = 'done-none';
  const next = slots.find(x => x.status === 'now') || slots.find(x => x.status === 'later');
  if (next) next.next = true;
  return { slots, train: tr, targets: tgt, totals, kcalLeft, protLeft, type: tgt.type };
}

// --- Was soll ich essen? -----------------------------------------------------------
export const PLACES = { home: 'Zuhause', prep: 'Meal-Prep', lidl: 'Lidl / Rewe', imbiss: 'Imbiss', out: 'Restaurant' };
export const SLOT_LABELS = { first: 'Mittag', pre: 'Vor dem Training', post: 'Nach dem Training', dinner: 'Abend', late: 'Spät', snack: 'Snack' };

function recipeTotals(recipe) {
  const t = Object.fromEntries(NUTRIENTS.map(n => [n.key, 0]));
  let ok = true;
  for (const [id, g] of recipe.items) {
    const f = store.foodById(id);
    if (!f) { ok = false; continue; }
    for (const n of NUTRIENTS) t[n.key] += (f.per100[n.key] || 0) * g / 100;
  }
  return ok ? t : null;
}

// Eigene Mahlzeiten aus „Meine Mahlzeiten" mitnehmen
function allRecipes() {
  const own = store.getMeals().filter(m => !RECIPES.some(r => r.name.toLowerCase() === m.name.toLowerCase().replace(/\s*\(.*\)/, '') || r.id === 'r_poke' && m.id === 'meal_pokebowl'))
    .map(m => ({ id: m.id, name: m.name, slots: ['first', 'dinner'], place: 'home', prep: 10, why: m.why || 'Deine eigene Mahlzeit.', items: m.items.map(it => [it.foodId, it.grams]), own: true }));
  return [...RECIPES, ...own];
}
export function recipeById(id) { return allRecipes().find(r => r.id === id) || null; }

// Wie gut passt ein Gericht gerade? (Budget, Protein, Lücken, Vorlieben, Abwechslung)
export function recommend(key, slotKey, { place = null, limit = 4, budget = null } = {}) {
  const s = store.getState();
  const tgt = store.macroTargets(key);
  const totals = store.computeTotals(key);
  const plan = dayPlan(key);
  const sl = plan.slots.find(x => x.slot === slotKey && x.target);
  const kcalB = budget || (sl ? sl.target.kcal : Math.max(250, (tgt.kcal - totals.kcal) * 0.4));
  const protB = sl ? sl.target.protein : Math.max(20, (tgt.protein - totals.protein) * 0.4);
  const targets = s.profile.targets;
  const recent = new Set();
  for (let i = 1; i <= 2; i++) { const d = s.log[store.shiftDate(key, -i)]; if (d) for (const e of d.entries) if (e.recipe) recent.add(e.recipe); }

  const pool = allRecipes().filter(r => r.slots.includes(slotKey) || (slotKey === 'snack' && r.slots.includes('late')) || (slotKey === 'late' && r.slots.includes('snack')))
    .filter(r => !place || r.place === place || (place === 'home' && r.place === 'prep'));
  const out = [];
  for (const r of pool) {
    const t = recipeTotals(r);
    if (!t) continue;
    const st = store.recipeStat(r.id);
    if (st.r < 0) continue; // 👎 = nicht mehr vorschlagen
    let score = Math.min(1, t.protein / Math.max(15, protB)) * 40;
    score += t.kcal <= kcalB * 1.15 ? 25 - Math.abs(t.kcal - kcalB) / Math.max(150, kcalB) * 15 : -((t.kcal - kcalB * 1.15) / Math.max(150, kcalB)) * 60;
    score += Math.min(0.5, t.protein * 4 / Math.max(1, t.kcal)) * 50;
    const gapHits = [];
    let gap = 0;
    for (const k of GAP_KEYS) {
      if (k === 'protein' || !targets[k]) continue;
      const open = targets[k] - (totals[k] || 0);
      if (open <= 0) continue;
      const g = Math.min(t[k], open) / targets[k];
      gap += g;
      if (g >= 0.3) gapHits.push({ k, g });
    }
    score += Math.min(1.5, gap) * 12;
    if (st.r > 0) score += 12;
    score += Math.min(12, (st.n || 0) * 3);
    if (recent.has(r.id)) score -= 10;
    gapHits.sort((a, b) => b.g - a.g);
    const labels = gapHits.slice(0, 2).map(x => NUTRIENTS.find(n => n.key === x.k).label);
    const fit = t.kcal <= kcalB * 1.15 ? 'passt ins Budget' : `${Math.round(t.kcal - kcalB)} kcal über Plan`;
    out.push({ recipe: r, totals: t, score, labels, fit, over: t.kcal > kcalB * 1.15, rating: st.r, kcalB, protB });
  }
  out.sort((a, b) => b.score - a.score);
  return { list: out.slice(0, limit), kcalB: Math.round(kcalB), protB: Math.round(protB) };
}

// Welcher Slot passt jetzt gerade?
export function currentSlot(key = store.todayKey(), now = new Date()) {
  const plan = dayPlan(key, now);
  const m = plan.slots.find(x => x.type === 'meal' && (x.status === 'now' || x.status === 'later'));
  return m ? m.slot : 'late';
}
