// ============================================================================
// Mikromaxxing – State-Verwaltung (localStorage)
// Zwei Bereiche: Essen (inkl. Diät) · Sport (inkl. Erholung). Alles bleibt lokal im Browser.
// ============================================================================
import {
  NUTRIENTS, DEFAULT_PROFILE, DEFAULT_SUPPLEMENTS, SEED_FOODS, DEFAULT_TRAINING,
  GAMES, DEFAULT_MEASUREMENTS, SNACKS, DEFAULT_MEALS, SPORT_TYPES,
} from './data.js';
import { PERSONA, PERSONA_FOODS, PERSONA_SUPP_TIMES } from './persona.js';

const STORAGE_KEY = 'mikromaxxing_v1';
const SCHEMA = 3;

// ============================================================================
// Datum
// ============================================================================
// Kalenderdatum als Schlüssel (ohne Tageswechsel-Logik)
export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// Der „App-Tag" wechselt erst um 4 Uhr: der Snack um 0:30 gehört noch zum Vortag
export const DAY_START = 4;
export function todayKey(d = new Date()) {
  const x = new Date(d.getTime());
  if (x.getHours() < DAY_START) x.setDate(x.getDate() - 1);
  return dateKey(x);
}
export function shiftDate(key, deltaDays) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return dateKey(dt);
}
// Stunden seit Mitternacht des Tages `key` (0:30 am Folgetag = 24,5)
export function hourOn(key, ts) {
  const [y, m, d] = key.split('-').map(Number);
  return (ts - new Date(y, m - 1, d).getTime()) / 3.6e6;
}
// Zeitstempel für neue Einträge: heute = jetzt, andere Tage = 13 Uhr
export function entryTs(key) {
  if (key === todayKey()) return Date.now();
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 13, 0).getTime();
}
export function dateOf(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function daysBetween(fromKey, toKey) {
  const [a, b] = [dateOf(fromKey), dateOf(toKey)];
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
}
export function weekdayOf(key) { return dateOf(key).getDay(); }
export function formatDateLabel(key) {
  const today = todayKey();
  if (key === today) return 'Heute';
  if (key === shiftDate(today, -1)) return 'Gestern';
  const dt = dateOf(key);
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return `${days[dt.getDay()]}, ${dt.getDate()}.${dt.getMonth() + 1}.`;
}

// ============================================================================
// Laden · Migration · Speichern
// ============================================================================
function personalize(m) {
  // Persona: Name, Rhythmus, Tempo, eigene Lebensmittel, Supplement-Zeiten
  const p = m.profile;
  p.name = PERSONA.name;
  if (!p.wakeTime || p.wakeTime === '07:00') p.wakeTime = PERSONA.life.wake;
  if (!p.sleepTarget || p.sleepTarget === 8) p.sleepTarget = PERSONA.life.sleepTarget;
  if (!p.tempo) p.tempo = PERSONA.goal.tempo;
  if (!p.firstMeal) p.firstMeal = PERSONA.eating.firstMeal;
  if (!p.gymDefault) p.gymDefault = PERSONA.training.gymDefault;
  if (p.kcalOffset == null) p.kcalOffset = 0;
  if (!p.targetWeight) p.targetWeight = PERSONA.body.targetWeight;
  const have = new Set(m.foods.map(f => f.id));
  for (const f of PERSONA_FOODS) if (!have.has(f.id)) m.foods.push(structuredClone(f));
  for (const s of m.supplements) {
    const t = PERSONA_SUPP_TIMES[s.id];
    if (t && s.time === 'morgens') s.time = t;
  }
  m._persona = PERSONA.id + '@' + PERSONA.version;
}

function freshState() {
  const s = freshStateRaw();
  personalize(s);
  return s;
}
function freshStateRaw() {
  return {
    schema: SCHEMA,
    profile: structuredClone(DEFAULT_PROFILE),
    foods: structuredClone(SEED_FOODS),
    supplements: structuredClone(DEFAULT_SUPPLEMENTS),
    training: structuredClone(DEFAULT_TRAINING),
    games: structuredClone(GAMES),
    measurements: structuredClone(DEFAULT_MEASUREMENTS),
    meals: structuredClone(DEFAULT_MEALS),
    photos: [], lifts: [], favorites: [], dayTemplate: [],
    workouts: [], activeWorkout: null,
    log: {}, // key -> { entries, water, supps, weight, sleep, knee, reha, steps, sessions }
    _onboarded: false,
    _ringV3Since: todayKey(),
    _v4Since: todayKey(),
    _v5Since: todayKey(),
    skills: {}, missions: {}, weekly: {}, ratings: {}, chat: [], notes: [], reviews: {},
    _trainV2: true, _mealsSeed1: true, _gamesV1: true, _bodyseed1: true, _athleteV1: true, _suppV2: true,
  };
}

let state = null;

export function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state = raw ? migrate(JSON.parse(raw)) : freshState();
    save();
  } catch (e) {
    console.error('State konnte nicht geladen werden, starte neu:', e);
    state = freshState();
  }
  return state;
}

function migrate(parsed) {
  const base = freshStateRaw();
  const m = Object.assign(base, parsed);
  // Bestehende Installs gelten als eingerichtet
  if (!('_onboarded' in parsed) || Object.keys(parsed.log || {}).length) m._onboarded = true;
  // Wer vor dem 3-Säulen-Umbau Daten hatte: alte Tage ohne Regeneration werten
  if (!('_ringV3Since' in parsed)) m._ringV3Since = todayKey();

  if (!m.profile) m.profile = structuredClone(DEFAULT_PROFILE);
  for (const k of Object.keys(DEFAULT_PROFILE)) {
    if (m.profile[k] === undefined) m.profile[k] = structuredClone(DEFAULT_PROFILE[k]);
  }
  if (!m.profile.targets) m.profile.targets = structuredClone(DEFAULT_PROFILE.targets);
  for (const k of Object.keys(DEFAULT_PROFILE.targets)) {
    if (m.profile.targets[k] == null) m.profile.targets[k] = DEFAULT_PROFILE.targets[k];
  }

  if (!Array.isArray(m.foods) || !m.foods.length) m.foods = structuredClone(SEED_FOODS);
  // Sehr alte Stände (vor der Athleten-Einrichtung): fehlende Basis-Lebensmittel ergänzen
  if (!parsed._athleteV1) {
    const have = new Set(m.foods.map(f => f.id));
    for (const f of SEED_FOODS) if (!have.has(f.id)) m.foods.push(structuredClone(f));
    m._athleteV1 = true;
  }
  for (const f of m.foods) if (typeof f.whole !== 'boolean') f.whole = true;

  if (!Array.isArray(m.supplements)) m.supplements = structuredClone(DEFAULT_SUPPLEMENTS);
  if (!parsed._suppV2) {
    const byId = Object.fromEntries(DEFAULT_SUPPLEMENTS.map(s => [s.id, s]));
    for (const s of m.supplements) {
      const d = byId[s.id];
      if (d) { if (!s.time) s.time = d.time; if (!s.takeWith) s.takeWith = d.takeWith; }
    }
    m._suppV2 = true;
  }

  // Neuer Trainingsplan mit Sätzen/Wiederholungen für den Workout-Modus
  if (!parsed._trainV2) { m.training = structuredClone(DEFAULT_TRAINING); m._trainV2 = true; }
  if (!m.training) m.training = structuredClone(DEFAULT_TRAINING);

  if (!parsed._gamesV1 || !Array.isArray(m.games)) { m.games = structuredClone(GAMES); m._gamesV1 = true; }
  if (!Array.isArray(m.measurements)) m.measurements = [];
  if (!parsed._bodyseed1) {
    if (!m.measurements.length) m.measurements = structuredClone(DEFAULT_MEASUREMENTS);
    m._bodyseed1 = true;
  }
  for (const k of ['photos', 'lifts', 'favorites', 'dayTemplate', 'meals', 'workouts']) {
    if (!Array.isArray(m[k])) m[k] = [];
  }
  if (!parsed._mealsSeed1) {
    const have = new Set(m.meals.map(x => x.id));
    for (const x of DEFAULT_MEALS) if (!have.has(x.id)) m.meals.push(structuredClone(x));
    m._mealsSeed1 = true;
  }
  if (m.activeWorkout === undefined) m.activeWorkout = null;
  if (!m.log) m.log = {};
  for (const k of ['skills', 'missions', 'weekly', 'ratings', 'reviews']) if (!m[k] || typeof m[k] !== 'object' || Array.isArray(m[k])) m[k] = {};
  if (!Array.isArray(m.chat)) m.chat = [];
  if (!Array.isArray(m.notes)) m.notes = [];
  if (!('_v4Since' in parsed)) m._v4Since = todayKey();
  // Ab hier zwei Ringe (Essen · Sport); ältere Tage behalten ihre Werte, damit XP stabil bleiben
  if (!('_v5Since' in parsed)) m._v5Since = todayKey();
  if (m._persona !== PERSONA.id + '@' + PERSONA.version) personalize(m);

  // Aufräumen: Bereiche, die es nicht mehr gibt (Tagesplan, Gewohnheiten, Autopilot)
  for (const k of ['schedule', 'habits', 'autopilot']) delete m[k];
  for (const k of Object.keys(m)) if (/^_(planV|habitsV|variety|foodsV|athleteV2|seedTrim)/.test(k)) delete m[k];
  for (const day of Object.values(m.log)) {
    for (const k of ['done', 'review', 'wake', 'wakeTs', 'workDone', 'autopilotLoaded', 'note']) delete day[k];
    if (!Array.isArray(day.entries)) day.entries = [];
    if (!day.supps) day.supps = {};
  }
  m.schema = SCHEMA;
  return m;
}

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Speichern fehlgeschlagen:', e);
    alert('Speichern fehlgeschlagen – evtl. ist der Browser-Speicher voll (Fotos?).');
  }
}

export function getState() { return load(); }
export function exportJSON() { return JSON.stringify(load(), null, 2); }
export function importJSON(text) { state = migrate(JSON.parse(text)); save(); return state; }
export function resetAll() { state = freshState(); save(); return state; }
export function isOnboarded() { return !!load()._onboarded; }
export function setOnboarded(v = true) { load()._onboarded = !!v; save(); }

// ============================================================================
// Tages-Log
// ============================================================================
export function getDay(key) {
  const s = load();
  if (!s.log[key]) {
    s.log[key] = { entries: [], water: 0, supps: {}, weight: null, sleep: null, knee: null, reha: false, steps: 0, sessions: [] };
  }
  const d = s.log[key];
  if (!d.entries) d.entries = [];
  if (!d.supps) d.supps = {};
  if (!Array.isArray(d.sessions)) d.sessions = [];
  return d;
}
function peekDay(key) { return load().log[key] || null; }

export function addEntry(key, foodId, grams, ts = entryTs(key)) {
  const day = getDay(key);
  day.entries.push({ foodId, grams: Math.round(Number(grams) || 0), ts });
  save();
  return day.entries.length - 1;
}
export function addEntries(key, items) {
  const day = getDay(key);
  const ts = entryTs(key);
  let n = 0;
  for (const it of items) {
    if (!foodById(it.foodId) || !(it.grams > 0)) continue;
    day.entries.push({ foodId: it.foodId, grams: Math.round(it.grams), ts });
    n++;
  }
  save();
  return n;
}
export function updateEntry(key, index, grams) {
  const day = getDay(key);
  if (day.entries[index]) { day.entries[index].grams = Math.round(Number(grams) || 0); save(); }
}
export function removeEntry(key, index) {
  const day = getDay(key);
  day.entries.splice(index, 1);
  save();
}
export function truncateEntries(key, length) {
  const day = getDay(key);
  day.entries.length = Math.min(day.entries.length, length);
  save();
}
export function copyEntries(fromKey, toKey) {
  const from = peekDay(fromKey);
  if (!from || !from.entries.length) return 0;
  return addEntries(toKey, from.entries.map(e => ({ foodId: e.foodId, grams: e.grams })));
}

export function setWater(key, ml) { getDay(key).water = Math.max(0, Math.round(Number(ml) || 0)); save(); }
export function addWater(key, ml) { const d = getDay(key); setWater(key, (d.water || 0) + ml); }
export function toggleSupp(key, id) { const d = getDay(key); d.supps[id] = !d.supps[id]; save(); }
export function setSupp(key, id, v) { getDay(key).supps[id] = !!v; save(); }
export function setWeight(key, kg) {
  const v = Number(String(kg ?? '').replace(',', '.'));
  getDay(key).weight = kg === '' || kg == null || isNaN(v) || v <= 0 ? null : v;
  save();
}

// Kleine Tages-Infos (z. B. Gym-Zeit, Skill-Training)
export function setDayMeta(key, field, value) { getDay(key)[field] = value; save(); }
export function dayMeta(key, field) { const d = peekDay(key); return d ? d[field] : undefined; }

// Gerichte aus „Was soll ich essen?" – merkt sich, was du isst und magst
export function logRecipe(key, recipe, portions = 1, ts = entryTs(key)) {
  const items = recipe.items.map(([foodId, grams]) => ({ foodId, grams: Math.round(grams * portions) })).filter(it => foodById(it.foodId));
  const day = getDay(key);
  for (const it of items) day.entries.push({ foodId: it.foodId, grams: it.grams, ts, recipe: recipe.id });
  const s = load();
  const st = s.ratings[recipe.id] || (s.ratings[recipe.id] = { r: 0, n: 0, last: null });
  st.n = (st.n || 0) + 1; st.last = key;
  save();
  return items.length;
}
export function rateRecipe(id, r) {
  const s = load();
  const st = s.ratings[id] || (s.ratings[id] = { r: 0, n: 0, last: null });
  st.r = st.r === r ? 0 : r;
  save();
  return st.r;
}
export function recipeStat(id) { return load().ratings[id] || { r: 0, n: 0, last: null }; }

// ============================================================================
// Bibliothek · Supplements · Profil
// ============================================================================
export function foodById(id) { return load().foods.find(f => f.id === id) || null; }
export function upsertFood(food) {
  const s = load();
  const i = s.foods.findIndex(f => f.id === food.id);
  if (i >= 0) s.foods[i] = food; else s.foods.push(food);
  save();
}
export function foodByBarcode(code) { return code ? load().foods.find(f => f.barcode === String(code)) || null : null; }
// Neues Lebensmittel (z. B. von Claude oder Open Food Facts) in die Bibliothek
export function saveNewFood(food) {
  const f = structuredClone(food);
  if (!f.id || foodById(f.id)) f.id = newFoodId(f.name);
  if (!f.per100) f.per100 = {};
  for (const nut of NUTRIENTS) if (typeof f.per100[nut.key] !== 'number') f.per100[nut.key] = 0;
  if (typeof f.whole !== 'boolean') f.whole = true;
  f.addedAt = Date.now();
  upsertFood(f);
  return f;
}
export function deleteFood(id) { const s = load(); s.foods = s.foods.filter(f => f.id !== id); save(); }
export function newFoodId(name) {
  const base = 'u_' + String(name || 'food').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24);
  let id = base, i = 2;
  while (foodById(id)) id = base + '_' + i++;
  return id;
}

export function upsertSupplement(supp) {
  const s = load();
  const i = s.supplements.findIndex(x => x.id === supp.id);
  if (i >= 0) s.supplements[i] = supp; else s.supplements.push(supp);
  save();
}
export function deleteSupplement(id) { const s = load(); s.supplements = s.supplements.filter(x => x.id !== id); save(); }

export function updateProfile(patch) { Object.assign(load().profile, patch); save(); }
export function setTarget(key, value) { load().profile.targets[key] = Number(value) || 0; save(); }

export function servingGrams(food) {
  if (!food) return 100;
  if (food.piece) return food.piece.g * (food.piece.def || 1);
  return (food.servings && food.servings[0]) ? food.servings[0].grams : 100;
}

// ============================================================================
// Kalorien & Makros je Tag: Tagestyp × Abnehm-Tempo (+ persönliche Korrektur)
// ============================================================================
export const TEMPO = {
  moderate: { label: 'Moderat', deficit: 500, rate: 0.5, desc: 'ca. 0,5 kg pro Woche – sehr muskelschonend' },
  fast: { label: 'Schnell', deficit: 750, rate: 0.75, desc: 'ca. 0,7–0,8 kg pro Woche – zügig, Muskeln bleiben' },
  max: { label: 'Maximal', deficit: 1000, rate: 1, desc: 'ca. 1 kg pro Woche – hart, nur mit viel Protein & Schlaf' },
};
export const DAY_TYPES = {
  basketball: { label: 'Basketball-Tag', burn: 750, icon: 'ball' },
  gym: { label: 'Gym-Tag', burn: 300, icon: 'dumbbell' },
  active: { label: 'Aktiver Tag', burn: 400, icon: 'activity' },
  rest: { label: 'Ruhetag', burn: 0, icon: 'moon' },
};
export function dayType(key) {
  const sess = sessionsFor(key);
  const types = new Set(sess.map(x => x.type));
  const plan = getTrainingFor(key);
  if (types.has('basketball') || types.has('game') || gamesForDate(key).length || (plan && plan.kind === 'sport' && plan.sport === 'basketball')) return 'basketball';
  if (types.has('gym') || (plan && plan.kind === 'gym')) return 'gym';
  if (sess.some(x => x.type !== 'walk') || (plan && plan.kind === 'sport')) return 'active';
  return 'rest';
}
export function bmr() {
  const p = load().profile;
  const w = currentWeight() || p.weight || 90;
  return 10 * w + 6.25 * (p.height || 180) - 5 * (p.age || 26) + (p.sex === 'f' ? -161 : 5);
}
// Energie-Basis je Tag festhalten (Grundumsatz, Defizit, Korrektur): spätere Gewichts-
// oder Tempo-Änderungen verschieben vergangene Tage nicht rückwirkend (Streak, XP bleiben stabil)
function energyBase(key) {
  const s = load();
  const day = s.log[key];
  if (day && day.eb && key < todayKey()) return day.eb;
  const p = s.profile;
  const eb = { b: Math.round(bmr()), d: (TEMPO[p.tempo] || TEMPO.fast).deficit, o: p.kcalOffset || 0 };
  if (day && key <= todayKey()) day.eb = eb;
  return eb;
}
// Viel unterwegs (Drehs) → Alltagsfaktor 1,45
export function kcalTarget(key = todayKey()) {
  const type = DAY_TYPES[dayType(key)];
  const eb = energyBase(key);
  const raw = eb.b * 1.45 + type.burn - eb.d + eb.o;
  return Math.round(Math.max(raw, eb.b + 150, 1800) / 50) * 50;
}
export function macroTargets(key = todayKey()) {
  const t = load().profile.targets;
  const kcal = kcalTarget(key);
  const protein = t.protein || 200;
  const fat = Math.round(Math.max(60, (load().profile.targetWeight || 84) * 0.85));
  const carbs = Math.max(80, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carbs, type: dayType(key) };
}
export function inBudget(key) {
  const tot = computeTotals(key);
  return tot.kcal > 0 && tot.kcal <= kcalTarget(key) + 100;
}

// ============================================================================
// Nährwerte
// ============================================================================
export function computeTotals(key) {
  const s = load();
  const day = s.log[key] || { entries: [], supps: {} };
  const totals = {};
  for (const nut of NUTRIENTS) totals[nut.key] = 0;
  for (const e of day.entries) {
    const food = s.foods.find(f => f.id === e.foodId);
    if (!food) continue;
    const f = (e.grams || 0) / 100;
    for (const nut of NUTRIENTS) totals[nut.key] += (food.per100[nut.key] || 0) * f;
  }
  for (const supp of s.supplements) {
    if (day.supps && day.supps[supp.id] && supp.nutrients) {
      for (const k in supp.nutrients) if (k in totals) totals[k] += supp.nutrients[k];
    }
  }
  return totals;
}

// Woher kommt ein Nährstoff heute? (Top-Quellen)
export function sourcesFor(key, nutKey, limit = 5) {
  const s = load();
  const day = s.log[key];
  if (!day) return [];
  const target = s.profile.targets[nutKey] || 0;
  const map = new Map();
  for (const e of day.entries) {
    const food = s.foods.find(f => f.id === e.foodId);
    if (!food) continue;
    const amt = (food.per100[nutKey] || 0) * (e.grams || 0) / 100;
    if (amt <= 0) continue;
    const cur = map.get(food.id) || { name: food.name, amount: 0 };
    cur.amount += amt;
    map.set(food.id, cur);
  }
  for (const supp of s.supplements) {
    if (day.supps && day.supps[supp.id] && supp.nutrients && supp.nutrients[nutKey]) {
      map.set('supp:' + supp.id, { name: supp.name + ' (Supp)', amount: supp.nutrients[nutKey] });
    }
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, limit)
    .map(x => ({ ...x, pct: target ? Math.round(x.amount / target * 100) : 0 }));
}

// Durchschnitt der letzten n Tage (nur Tage mit Einträgen zählen)
export function averageTotals(key, days = 7) {
  const s = load();
  const sum = {};
  for (const nut of NUTRIENTS) sum[nut.key] = 0;
  let n = 0;
  for (let i = 0; i < days; i++) {
    const k = shiftDate(key, -i);
    const day = s.log[k];
    if (!day || (!day.entries.length && !Object.values(day.supps || {}).some(Boolean))) continue;
    const t = computeTotals(k);
    for (const nut of NUTRIENTS) sum[nut.key] += t[nut.key];
    n++;
  }
  for (const k in sum) sum[k] = n ? sum[k] / n : 0;
  return { totals: sum, days: n };
}

// Protein über den Tag verteilt (Frühstück/Mittag/Nachmittag/Abend)
export const DAY_PARTS = [
  { id: 'morning', label: 'Früh', from: 0, to: 11 },
  { id: 'noon', label: 'Mittag', from: 11, to: 15 },
  { id: 'afternoon', label: 'Nachm.', from: 15, to: 19 },
  { id: 'evening', label: 'Abend', from: 19, to: 24 },
];
export function partOfHour(h) { return DAY_PARTS.find(p => h >= p.from && h < p.to) || DAY_PARTS[3]; }
export function proteinByPart(key) {
  const s = load();
  const day = s.log[key];
  const out = Object.fromEntries(DAY_PARTS.map(p => [p.id, 0]));
  if (day) {
    for (const e of day.entries) {
      const food = s.foods.find(f => f.id === e.foodId);
      if (!food) continue;
      const h = e.ts ? hourOn(key, e.ts) : 12;
      out[partOfHour(h).id] += (food.per100.protein || 0) * (e.grams || 0) / 100;
    }
  }
  const perPart = (s.profile.targets.protein || 0) / DAY_PARTS.length;
  return DAY_PARTS.map(p => ({ ...p, grams: Math.round(out[p.id]), target: Math.round(perPart) }));
}

// Vorschau: wie verändert sich die Ernährungs-Säule durch neue Einträge?
export function nutritionPreview(key, { foods = [], waterMl = 0, suppIds = [] } = {}) {
  const s = load();
  const day = s.log[key] || { water: 0, supps: {} };
  const before = dayPillars(key);
  const totals = { ...before.totals };
  let addKcal = 0, addProtein = 0;
  for (const it of foods) {
    const f = foodById(it.foodId);
    if (!f) continue;
    const x = (it.grams || 0) / 100;
    for (const nut of NUTRIENTS) totals[nut.key] += (f.per100[nut.key] || 0) * x;
    addKcal += (f.per100.kcal || 0) * x;
    addProtein += (f.per100.protein || 0) * x;
  }
  const supps = { ...(day.supps || {}) };
  for (const id of suppIds) {
    if (supps[id]) continue;
    supps[id] = true;
    const supp = s.supplements.find(x => x.id === id);
    if (supp && supp.nutrients) for (const k in supp.nutrients) if (k in totals) totals[k] += supp.nutrients[k];
  }
  const p = s.profile;
  const protein = Math.min(100, totals.protein / (p.targets.protein || 1) * 100);
  const micros = microSummary(key, totals).coverage;
  const water = Math.min(100, ((day.water || 0) + waterMl) / (p.water || 1) * 100);
  const suppPct = s.supplements.length ? s.supplements.filter(x => supps[x.id]).length / s.supplements.length * 100 : 100;
  return {
    before: before.nutrition,
    after: Math.round((protein + micros + water + suppPct) / 4),
    kcal: Math.round(addKcal), protein: Math.round(addProtein),
  };
}

// Mikro-Essentials (ohne Protein – das hat eine eigene Säule im Ring)
export const GAP_KEYS = [
  'protein', 'fiber', 'omega3',
  'vitA', 'vitC', 'vitD', 'vitE', 'vitK',
  'vitB1', 'vitB2', 'vitB3', 'vitB5', 'vitB6', 'vitB7', 'vitB9', 'vitB12',
  'calcium', 'iron', 'magnesium', 'zinc', 'potassium', 'phosphorus',
  'selenium', 'copper', 'manganese', 'iodine',
];
export const MICRO_KEYS = GAP_KEYS.filter(k => k !== 'protein');

export function microSummary(key, totals = computeTotals(key)) {
  const t = load().profile.targets;
  let sum = 0, n = 0, done = 0;
  const byKey = [];
  for (const k of MICRO_KEYS) {
    if (!t[k]) continue;
    const p = ((totals[k] || 0) / t[k]) * 100;
    byKey.push({ key: k, pct: Math.round(p) });
    sum += Math.min(100, p); n++;
    if (p >= 99.9) done++;
  }
  return { coverage: n ? Math.round(sum / n) : 0, done, total: n, byKey };
}

// Lücken-Coach: welches Lebensmittel schließt die offenen Lücken am besten?
const MAX_PIECE_SCALE = 3;
function scoreFood(food, grams, totals, targets) {
  const factor = grams / 100;
  let gapClose = 0;
  for (const key of GAP_KEYS) {
    const target = targets[key];
    if (!target) continue;
    const gap = target - (totals[key] || 0);
    if (gap <= 0.0001) continue;
    const contrib = (food.per100[key] || 0) * factor;
    if (contrib > 0) gapClose += Math.min(contrib, gap) / target;
  }
  return { gapClose, kcal: (food.per100.kcal || 0) * factor };
}
export function getRecommendations(key) {
  const s = load();
  const totals = computeTotals(key);
  const targets = s.profile.targets;
  const remainingKcal = kcalTarget(key) - (totals.kcal || 0);
  const wholeFoods = s.foods.filter(f => f.whole !== false);
  const ranked = wholeFoods.map(food => {
    const g = servingGrams(food);
    return { food, grams: g, ...scoreFood(food, g, totals, targets) };
  }).filter(r => r.gapClose > 0.0001).sort((a, b) => b.gapClose - a.gapClose);
  const fits = ranked.filter(r => r.kcal <= remainingKcal + 5);
  const topTips = (fits.length ? fits : ranked).slice(0, 4);

  const gaps = GAP_KEYS.filter(k => targets[k] && (totals[k] || 0) < targets[k] * 0.999).map(nutKey => {
    const target = targets[nutKey];
    const current = totals[nutKey] || 0;
    // Bestes Lebensmittel: schließt möglichst viel der Lücke (gedeckelt), bei Gleichstand weniger kcal
    const gapPct = Math.max(1, 100 - current / target * 100);
    let best = null, bestScore = -1;
    for (const food of wholeFoods) {
      const g = servingGrams(food);
      const contrib = (food.per100[nutKey] || 0) * g / 100;
      if (contrib <= 0) continue;
      const addedPct = Math.round(contrib / target * 100);
      const kcal = (food.per100.kcal || 0) * g / 100;
      const score = Math.min(addedPct, gapPct) - kcal / 400;
      if (score > bestScore) { bestScore = score; best = { food, grams: g, addedPct }; }
    }
    if (best && best.food.piece) {
      const p = best.food.piece;
      const per = (best.food.per100[nutKey] || 0) / 100 * p.g;
      let count = p.def || 1;
      while (count < MAX_PIECE_SCALE && per * count < target - current) count++;
      best.grams = p.g * count;
      best.addedPct = Math.round(per * count / target * 100);
    }
    return { nutKey, current, target, currentPct: Math.round(current / target * 100), best };
  }).sort((a, b) => a.currentPct - b.currentPct);
  return { totals, remainingKcal, topTips, gaps };
}

// ============================================================================
// Schnellzugriff · Favoriten · Mahlzeiten · Standardtag
// ============================================================================
export function getQuickPicks(limit = 8, now = Date.now()) {
  const s = load();
  const nowHour = new Date(now).getHours();
  const stats = new Map();
  for (const key of Object.keys(s.log)) {
    for (const e of s.log[key].entries) {
      let st = stats.get(e.foodId);
      if (!st) { st = { count: 0, lastTs: 0, lastGrams: 0, hourHits: 0 }; stats.set(e.foodId, st); }
      st.count++;
      if (e.ts) {
        if (e.ts > st.lastTs) { st.lastTs = e.ts; st.lastGrams = e.grams; }
        let diff = Math.abs(new Date(e.ts).getHours() - nowHour);
        if (diff > 12) diff = 24 - diff;
        if (diff <= 2) st.hourHits++;
      }
    }
  }
  const scored = [];
  for (const [foodId, st] of stats) {
    const food = foodById(foodId);
    if (!food) continue;
    const ageH = st.lastTs ? (now - st.lastTs) / 3.6e6 : 999;
    const rec = ageH < 24 ? 3 : ageH < 72 ? 2 : ageH < 168 ? 1 : 0;
    scored.push({ food, grams: st.lastGrams || servingGrams(food), score: st.hourHits * 2 + st.count + rec });
  }
  scored.sort((a, b) => b.score - a.score);
  if (!scored.length) {
    return ['egg', 'magerquark', 'banana', 'oats', 'chicken_breast', 'kiwi']
      .map(foodById).filter(Boolean).map(food => ({ food, grams: servingGrams(food), score: 0 }));
  }
  return scored.slice(0, limit);
}

export function isFavorite(id) { return (load().favorites || []).includes(id); }
export function toggleFavorite(id) {
  const s = load();
  const i = s.favorites.indexOf(id);
  if (i >= 0) s.favorites.splice(i, 1); else s.favorites.push(id);
  save();
  return s.favorites.includes(id);
}
export function getFavorites() {
  return load().favorites.map(foodById).filter(Boolean).map(food => ({ food, grams: servingGrams(food) }));
}

export function getSnacks() { return SNACKS; }
export function getMeals() { return load().meals || []; }
export function mealById(id) { return getMeals().find(m => m.id === id) || null; }
export function upsertMeal(meal) {
  const s = load();
  const i = s.meals.findIndex(m => m.id === meal.id);
  if (i >= 0) s.meals[i] = meal; else s.meals.push(meal);
  save();
}
export function deleteMeal(id) { const s = load(); s.meals = s.meals.filter(m => m.id !== id); save(); }
export function mealItems(mealId, portions = 1) {
  const meal = mealById(mealId);
  if (!meal) return [];
  return meal.items.filter(it => foodById(it.foodId)).map(it => ({ foodId: it.foodId, grams: Math.round(it.grams * portions) }));
}
export function logMeal(key, mealId, portions = 1) { return addEntries(key, mealItems(mealId, portions)); }
export function mealTotals(meal) {
  const out = { kcal: 0, protein: 0 };
  for (const it of meal.items) {
    const f = foodById(it.foodId);
    if (!f) continue;
    out.kcal += (f.per100.kcal || 0) * it.grams / 100;
    out.protein += (f.per100.protein || 0) * it.grams / 100;
  }
  return { kcal: Math.round(out.kcal), protein: Math.round(out.protein) };
}

export function saveDayTemplate(key) {
  const day = peekDay(key);
  load().dayTemplate = (day ? day.entries : []).map(e => ({ foodId: e.foodId, grams: e.grams }));
  save();
  return load().dayTemplate.length;
}
export function getDayTemplate() { return load().dayTemplate || []; }
export function loadDayTemplate(key) { return addEntries(key, getDayTemplate()); }
export function clearDayTemplate() { load().dayTemplate = []; save(); }

// ============================================================================
// Regeneration: Schlaf · Knie · Reha
// ============================================================================
export function setSleep(key, hours) {
  const h = Number(String(hours ?? '').replace(',', '.'));
  getDay(key).sleep = hours === '' || hours == null || isNaN(h) ? null : Math.max(0, Math.min(14, h));
  save();
}
export function setKnee(key, score) {
  const d = getDay(key);
  d.knee = d.knee === score ? null : score; // nochmal tippen = zurücksetzen
  save();
}
export function toggleReha(key) { const d = getDay(key); d.reha = !d.reha; save(); }

export function kneeHistory(key = todayKey(), days = 28) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = shiftDate(key, -i);
    const d = peekDay(k);
    out.push({ key: k, knee: d && d.knee != null ? d.knee : null, sleep: d && d.sleep != null ? d.sleep : null });
  }
  return out;
}
// Warnung, wenn das Knie heute stark schmerzt oder der Trend steigt
export function kneeStatus(key = todayKey()) {
  const hist = kneeHistory(key, 7).filter(x => x.knee != null);
  const today = (peekDay(key) || {}).knee;
  if (today != null && today >= 6) return { level: 'high', text: `Knie ${today}/10 – heute schonen: keine Sprints oder Sprünge, Reha zuerst.` };
  if (hist.length >= 4) {
    const recent = hist.slice(-3), older = hist.slice(0, -3);
    const avg = a => a.reduce((x, y) => x + y.knee, 0) / a.length;
    if (avg(recent) - avg(older) >= 1.5) return { level: 'rising', text: 'Dein Knie-Score steigt seit ein paar Tagen – Belastung etwas runter, Reha durchziehen.' };
  }
  return null;
}

// ============================================================================
// Sport: Wochen-Split · Einheiten · Belastung · Schritte
// ============================================================================
export function getTrainingFor(key) { return load().training[weekdayOf(key)] || null; }
export function setTrainingDay(weekday, plan) { load().training[weekday] = plan; save(); }
export function sportType(id) { return SPORT_TYPES.find(t => t.id === id) || SPORT_TYPES[SPORT_TYPES.length - 1]; }

export function addSession(key, { type, min, rpe, title, workoutId, detail }) {
  const d = getDay(key);
  const session = {
    id: 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    type, min: Math.round(Number(min) || 0), rpe: Math.round(Number(rpe) || 5),
    title: title || sportType(type).label, ts: Date.now(),
  };
  if (workoutId) session.workoutId = workoutId;
  if (detail) session.detail = String(detail).slice(0, 400);
  d.sessions.push(session);
  save();
  return session;
}
export function removeSession(key, id) {
  const d = getDay(key);
  d.sessions = d.sessions.filter(x => x.id !== id);
  save();
}
export function sessionsFor(key) { const d = peekDay(key); return d && d.sessions ? d.sessions : []; }
export const sessionLoad = (s) => (s.min || 0) * (s.rpe || 0); // Session-RPE (Foster)

export function getSteps(key) { const d = peekDay(key); return d && d.steps ? d.steps : 0; }
export function setSteps(key, n) { getDay(key).steps = Math.max(0, Math.round(Number(n) || 0)); save(); }

export function dayLoad(key) { return sessionsFor(key).reduce((a, s) => a + sessionLoad(s), 0); }

// Akut (7 Tage) vs. chronisch (Ø-Woche der letzten 28 Tage)
export function trainingLoad(key = todayKey()) {
  const s = load();
  let acute = 0, chronic28 = 0, first = null;
  for (let i = 0; i < 28; i++) {
    const k = shiftDate(key, -i);
    const l = dayLoad(k);
    if (i < 7) acute += l;
    chronic28 += l;
  }
  for (const k of Object.keys(s.log).sort()) {
    if ((s.log[k].sessions || []).length) { first = k; break; }
  }
  const chronic = chronic28 / 4;
  const ratio = chronic > 0 ? acute / chronic : null;
  const building = !first || daysBetween(first, key) < 14;
  let zone = 'none';
  if (ratio != null && !building) {
    zone = ratio < 0.8 ? 'low' : ratio <= 1.3 ? 'optimal' : ratio <= 1.5 ? 'elevated' : 'high';
  }
  const weeks = [];
  for (let w = 3; w >= 0; w--) {
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += dayLoad(shiftDate(key, -(w * 7 + i)));
    weeks.push(sum);
  }
  return { acute, chronic: Math.round(chronic), ratio, zone, building, weeks };
}

// ============================================================================
// Workout-Modus
// ============================================================================
function liftId() { return 'lift_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

// Letzte absolvierte Sätze einer Übung (aus der Workout-Historie)
export function lastPerformance(exId) {
  const ws = load().workouts;
  for (let i = ws.length - 1; i >= 0; i--) {
    const ex = ws[i].exercises.find(e => e.id === exId);
    if (ex && ex.sets.length) return { date: ws[i].key, sets: ex.sets };
  }
  return null;
}

// Doppel-Progression: erst Wiederholungen bis zur Obergrenze, dann Gewicht rauf
export function progressionFor(ex) {
  const last = lastPerformance(ex.id);
  if (ex.load === 'time') {
    if (!last) return { s: ex.secs, note: `${ex.sets} × ${ex.secs} s halten.` };
    const all = last.sets.every(x => (x.s || 0) >= ex.secs);
    const best = Math.max(...last.sets.map(x => x.s || 0));
    return all
      ? { s: best + 5, note: `Letztes Mal alle Sätze ${best} s geschafft → heute ${best + 5} s.` }
      : { s: ex.secs, note: `Ziel: ${ex.sets} × ${ex.secs} s sauber halten.` };
  }
  const [lo, hi] = ex.reps;
  if (!last) {
    return { w: ex.load === 'bw' ? 0 : null, r: lo, note: ex.load === 'bw'
      ? `Erstes Mal: ${ex.sets} × ${lo}–${hi} Wdh mit Körpergewicht.`
      : `Erstes Mal: Startgewicht wählen, mit dem ${hi} Wdh gerade so gehen.` };
  }
  const w = Math.max(...last.sets.map(x => x.w || 0));
  const topSets = last.sets.filter(x => (x.w || 0) === w);
  const minReps = Math.min(...topSets.map(x => x.r || 0));
  const repStr = last.sets.map(x => x.r).join('/');
  const wStr = ex.load === 'bw' ? (w ? `+${fmtKg(w)} kg` : 'Körpergewicht') : `${fmtKg(w)} kg`;
  if (minReps >= hi && topSets.length >= ex.sets) {
    if (ex.inc > 0) {
      const nw = w + ex.inc;
      const nStr = ex.load === 'bw' ? `+${fmtKg(nw)} kg` : `${fmtKg(nw)} kg`;
      return { w: nw, r: lo, up: true, note: `Letztes Mal ${wStr} × ${repStr} – Obergrenze geschafft. Heute ${nStr} × ${lo}.` };
    }
    return { w, r: hi, up: true, note: `${wStr} × ${repStr} – Obergrenze erreicht. Zeit für eine schwerere Variante.` };
  }
  const target = Math.min(hi, minReps + 1);
  return { w, r: target, note: `Letztes Mal ${wStr} × ${repStr}. Heute ${wStr}, Ziel ${target} Wdh in allen Sätzen.` };
}
export function fmtKg(x) { return String(Math.round(x * 10) / 10).replace('.', ','); }

export function getActiveWorkout() { return load().activeWorkout; }

export function startWorkout(key = todayKey(), weekday = weekdayOf(key)) {
  const s = load();
  const plan = s.training[weekday];
  if (!plan || plan.kind !== 'gym') return null;
  s.activeWorkout = {
    id: 'w_' + Date.now().toString(36),
    key, weekday, title: plan.title, startedAt: Date.now(), idx: 0,
    exercises: plan.exercises.map(e => ({ ...structuredClone(e), target: progressionFor(e) })),
    log: {}, restUntil: null, restFor: 0,
  };
  save();
  return s.activeWorkout;
}

export function setWorkoutIndex(i) {
  const w = load().activeWorkout;
  if (!w) return;
  w.idx = Math.max(0, Math.min(w.exercises.length - 1, i));
  save();
}

// Satz speichern: { w, r } oder { s } bei Halte-Übungen
export function logWorkoutSet(exId, set) {
  const w = load().activeWorkout;
  if (!w) return null;
  const ex = w.exercises.find(e => e.id === exId);
  if (!w.log[exId]) w.log[exId] = [];
  w.log[exId].push({ ...set, ts: Date.now() });
  w.restFor = ex ? ex.rest : 90;
  w.restUntil = Date.now() + w.restFor * 1000;
  save();
  // Rekord? (nur Gewichts-/Körpergewichtsübungen)
  if (ex && ex.load !== 'time') {
    const score = liftScore({ weight: set.w || 0, reps: set.r || 0, bw: ex.load === 'bw' });
    const prev = (load().lifts || []).filter(l => l.exId === exId || l.name === ex.n);
    const prevBest = prev.reduce((m, l) => Math.max(m, liftScore(l)), 0);
    const earlierToday = w.log[exId].slice(0, -1).reduce((m, x) => Math.max(m, liftScore({ weight: x.w || 0, reps: x.r || 0, bw: ex.load === 'bw' })), 0);
    return { pr: prev.length > 0 && score > prevBest && score > earlierToday };
  }
  return { pr: false };
}
export function undoWorkoutSet(exId) {
  const w = load().activeWorkout;
  if (!w || !w.log[exId] || !w.log[exId].length) return;
  w.log[exId].pop();
  w.restUntil = null;
  save();
}
export function skipRest() { const w = load().activeWorkout; if (w) { w.restUntil = null; save(); } }

export function finishWorkout(rpe = 7) {
  const s = load();
  const w = s.activeWorkout;
  if (!w) return null;
  const endedAt = Date.now();
  const min = Math.max(10, Math.round((endedAt - w.startedAt) / 60000));
  const record = {
    id: w.id, key: w.key, title: w.title, startedAt: w.startedAt, endedAt, rpe,
    exercises: w.exercises.map(e => ({ id: e.id, n: e.n, load: e.load, muscles: e.muscles || [], sets: (w.log[e.id] || []).map(x => ({ w: x.w, r: x.r, s: x.s })) }))
      .filter(e => e.sets.length),
  };
  s.workouts.push(record);
  // Sätze ins Kraft-Log (PR-Historie)
  for (const e of record.exercises) {
    if (e.load === 'time') continue;
    for (const st of e.sets) {
      s.lifts.push({ id: liftId(), name: e.n, exId: e.id, weight: st.w || 0, reps: st.r || 0, date: w.key, bw: e.load === 'bw' });
    }
  }
  s.activeWorkout = null;
  save();
  addSession(w.key, { type: 'gym', min, rpe, title: w.title, workoutId: w.id });
  return record;
}
export function cancelWorkout() { load().activeWorkout = null; save(); }
export function getWorkouts() { return load().workouts || []; }

// Trainierte Sätze pro Muskelgruppe (letzte 7 Tage)
export function muscleVolume(key = todayKey(), days = 7) {
  const from = shiftDate(key, -(days - 1));
  const vol = {};
  for (const w of getWorkouts()) {
    if (w.key < from || w.key > key) continue;
    for (const e of w.exercises) for (const m of e.muscles || []) vol[m] = (vol[m] || 0) + e.sets.length;
  }
  return vol;
}

// ============================================================================
// Kraft-Log (Rekorde)
// ============================================================================
export function e1rm(weight, reps) {
  if (!weight) return 0;
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}
function bodyWeight() { return currentWeight() || load().profile.weight || 80; }
export function liftScore(l) {
  const w = l.bw ? bodyWeight() + (l.weight || 0) : (l.weight || 0);
  return e1rm(w, l.reps || 0);
}
export function logLift(name, weight, reps, date = todayKey(), bw = false) {
  name = String(name || '').trim();
  if (!name) return;
  const l = { id: liftId(), name, weight: Number(weight) || 0, reps: Number(reps) || 0, date };
  if (bw) l.bw = true;
  load().lifts.push(l);
  save();
}
export function deleteLift(id) { const s = load(); s.lifts = s.lifts.filter(l => l.id !== id); save(); }
// --- Was sich der Coach über Fassie merkt -----------------------------------------
export function getNotes() { return load().notes || []; }
export function addNote(text) {
  text = String(text || '').trim().slice(0, 200);
  if (!text) return null;
  const s = load();
  const low = text.toLowerCase();
  if (s.notes.some(n => n.text.toLowerCase() === low)) return null;
  const n = { id: 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text, ts: Date.now() };
  s.notes.push(n);
  if (s.notes.length > 60) s.notes.splice(0, s.notes.length - 60);
  save();
  return n;
}
export function removeNote(id) { const s = load(); s.notes = s.notes.filter(n => n.id !== id); save(); }

export function getLiftsFor(name) {
  return (load().lifts || []).filter(l => l.name === name)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
export function liftExercises() {
  const names = [...new Set(load().lifts.map(l => l.name))];
  return names.map(name => {
    const sets = getLiftsFor(name);
    const last = sets[sets.length - 1];
    let pr = null;
    for (const x of sets) { const e = liftScore(x); if (!pr || e > pr.e1rm) pr = { ...x, e1rm: e }; }
    return { name, sets, last, pr, bw: !!last.bw, count: sets.length };
  }).sort((a, b) => b.last.date.localeCompare(a.last.date));
}
let prCache = { sig: null, ids: new Set() };
export function prLiftIds() {
  const s = load();
  const ls = s.lifts || [];
  const sig = `${ls.length}:${ls.length ? ls[ls.length - 1].id : ''}:${bodyWeight()}`;
  if (prCache.sig === sig) return prCache.ids;
  const byName = {};
  for (const l of ls) (byName[l.name] = byName[l.name] || []).push(l);
  const ids = new Set();
  for (const list of Object.values(byName)) {
    list.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    let best = 0;
    for (const l of list) { const e = liftScore(l); if (e > 0 && e > best) { ids.add(l.id); best = e; } }
  }
  prCache = { sig, ids };
  return ids;
}
export function isLiftPR(id) { return prLiftIds().has(id); }

// ============================================================================
// Zwei Bereiche: Essen (Ernährung + Diät) · Sport (Training + Erholung)
// Tage vor dem Umbau behalten die alte Drei-Säulen-Wertung (stabile XP & Serien).
// ============================================================================
export function dayPillars(key = todayKey()) {
  const s = load();
  const day = s.log[key];
  const p = s.profile;
  const totals = computeTotals(key);

  const protein = Math.min(100, (totals.protein || 0) / (p.targets.protein || 1) * 100);
  const micros = microSummary(key, totals).coverage;
  const water = Math.min(100, ((day && day.water) || 0) / (p.water || 1) * 100);
  const supps = s.supplements.length
    ? s.supplements.filter(x => day && day.supps && day.supps[x.id]).length / s.supplements.length * 100
    : 100;

  const sessions = (day && day.sessions) || [];
  const sessionDone = sessions.length > 0 || !!(day && day.activityManual);
  const steps = (day && day.steps) || 0;
  const activity = sessionDone ? 100 : Math.min(100, Math.round(steps / (p.stepGoal || 10000) * 100));

  const sleepH = day && day.sleep != null ? day.sleep : null;
  const sleep = sleepH == null ? 0 : Math.min(100, sleepH / (p.sleepTarget || 8) * 100);
  const knee = day && day.knee != null ? 100 : 0;
  const reha = day && day.reha ? 100 : 0;
  const recovery = Math.round((sleep + knee + reha) / 3);

  // Kalorien-Budget: zählt, sobald gegessen wurde; drüber kostet schnell Punkte
  const target = kcalTarget(key);
  const kcal = totals.kcal || 0;
  const budget = kcal <= 0 ? 0 : kcal <= target + 100 ? 100 : Math.max(0, Math.round(100 - (kcal - target - 100) / target * 400));

  const parts = {
    protein: Math.round(protein), micros, water: Math.round(water), supps: Math.round(supps), budget,
    sessionDone, steps, activity, recovery, sleep: Math.round(sleep), sleepH, knee: day ? day.knee : null, reha: !!(day && day.reha),
  };

  if (key < (s._v5Since || '0000')) {
    // Alte Wertung (bis zum Umbau)
    const nutrition = Math.round((protein + micros + water + supps) / 4);
    const legacy = key < (s._ringV3Since || '0000');
    const overall = legacy ? Math.round((nutrition + activity) / 2) : Math.round((nutrition + activity + recovery) / 3);
    return { nutrition, sport: activity, regen: recovery, overall, legacy, old: true, parts, totals };
  }
  const nutrition = Math.round(protein * 0.35 + budget * 0.25 + micros * 0.2 + water * 0.1 + supps * 0.1);
  const sport = Math.round(activity * 0.6 + recovery * 0.4);
  return { nutrition, sport, regen: recovery, overall: Math.round((nutrition + sport) / 2), legacy: false, old: false, parts, totals };
}
export function ringSummary(key) { const p = dayPillars(key); return { pct: p.overall, ...p }; }
// Tag geschafft = Ringe ab Tagesziel UND Kalorien im Budget (seit dem Persona-Update)
export function dayComplete(key) {
  const s = load();
  if (ringSummary(key).pct < (s.profile.dayGoal || 80)) return false;
  return key < (s._v4Since || '0000') || inBudget(key);
}

export function currentStreak(today = todayKey()) {
  let streak = 0, cursor = today, first = true;
  while (streak < 500) {
    if (dayComplete(cursor)) streak++;
    else if (!first) break;
    first = false;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}
export function bestStreak() {
  const keys = Object.keys(load().log).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    if (!dayComplete(k)) { run = 0; prev = k; continue; }
    run = prev && shiftDate(prev, 1) === k && run > 0 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}
export function ringHistory(n = 28, today = todayKey()) {
  const goal = load().profile.dayGoal || 80;
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = shiftDate(today, -i);
    const r = ringSummary(k);
    out.push({ key: k, pct: r.pct, nutrition: r.nutrition, sport: r.sport, regen: r.regen, complete: r.pct >= goal });
  }
  return out;
}
export function perfectDays() { return Object.keys(load().log).filter(k => ringSummary(k).pct >= 100).length; }

// ============================================================================
// Coach: der eine sinnvollste nächste Schritt
// action: { type: 'workout'|'session'|'food'|'water'|'supps'|'sleep'|'knee'|'reha'|'add', ... }
// ============================================================================
export function coachHints(key = todayKey(), now = new Date()) {
  const s = load();
  const h = hourOn(key, now.getTime());
  const isToday = key === todayKey(now);
  const p = dayPillars(key);
  const day = s.log[key] || {};
  const plan = getTrainingFor(key);
  const hints = [];
  const add = (prio, tone, icon, title, text, action) => hints.push({ prio, tone, icon, title, text, action });

  const ks = kneeStatus(key);
  if (ks) add(100, 'warn', 'knee', 'Knie', ks.text, { type: 'reha' });

  const load_ = trainingLoad(key);
  if (load_.zone === 'high') add(90, 'warn', 'gauge', 'Belastung', 'Deine Trainingslast ist diese Woche deutlich über dem Schnitt – heute locker machen.', null);

  if (isToday && h < 12 && p.parts.sleepH == null) add(70, 'info', 'moon', 'Guten Morgen', 'Wie lange hast du geschlafen?', { type: 'sleep' });
  if (isToday && h < 14 && p.parts.knee == null) add(68, 'info', 'knee', 'Knie-Check', 'Kurz einschätzen: wie fühlt sich das Knie heute an (0–10)?', { type: 'knee' });

  const games = gamesForDate(key);
  if (games.length && !p.parts.sessionDone) {
    const g = games[0];
    add(85, 'info', 'trophy', `Spieltag · ${g.time}`, `${g.home ? 'Heimspiel' : 'Auswärts'} gegen ${g.opponent}. 2–3 h vorher Carbs + etwas Protein, viel trinken.`, { type: 'session', sport: 'game' });
  }
  if (plan && plan.kind === 'gym' && !p.parts.sessionDone && h < 21) {
    add(80, 'info', 'dumbbell', `Heute: ${plan.title}`, s.activeWorkout ? 'Dein Workout läuft noch – weitermachen?' : 'Workout starten – letzte Werte und Ziele sind schon vorbereitet.', { type: 'workout' });
  }
  if (plan && plan.kind === 'sport' && !p.parts.sessionDone) {
    const t = plan.time ? Number(plan.time.slice(0, 2)) : null;
    if (t != null && h >= t - 4 && h < t) {
      add(78, 'info', 'zap', `${plan.title} um ${plan.time}`, 'Jetzt Pre-Workout-Snack: Banane + Datteln oder Reiswaffeln, dazu 500 ml Wasser.', { type: 'add', text: '1 Banane, 2 Datteln' });
    } else if (t == null || h >= t + 1.5) {
      add(74, 'info', sportType(plan.sport).icon, plan.title, 'Einheit eintragen – Dauer und Intensität, das füllt deinen Sport-Ring.', { type: 'session', sport: plan.sport });
    }
  }

  // Persönlich: Essfenster, Budget, späte Snacks
  const kTarget = kcalTarget(key);
  const kOver = Math.round((p.totals.kcal || 0) - kTarget);
  const name = s.profile.name || '';
  if (isToday && kOver > 150) add(88, 'warn', 'flame', 'Budget überschritten', `${kOver} kcal über dem Plan. Kein Drama – heute nichts mehr nachlegen, morgen ganz normal weiter. Kein Ausgleichs-Hungern.`, null);
  if (isToday && h < 11.5 && !(day.entries || []).length) add(64, 'info', 'coffee', `Morgen${name ? ', ' + name : ''}`, `Bis Mittag reicht Kaffee + Wasser. Erste Mahlzeit gegen ${s.profile.firstMeal || '12:30'}: richtig Protein rein.`, { type: 'eat', slot: 'first' });
  if (isToday && h >= 21.5 && kOver <= 0 && (day.entries || []).length) add(56, 'good', 'moon', 'Budget hält', 'Jetzt kommt deine kritische Zeit. Wenn noch Hunger: 250 g Magerquark – sonst ab ins Bett.', { type: 'add', text: '250 g Magerquark' });

  const protGap = Math.round((s.profile.targets.protein || 0) - (p.totals.protein || 0));
  if (protGap > 35 && h >= 13) {
    const evening = h >= 19;
    const foodId = evening ? 'magerquark' : 'whey';
    const f = foodById(foodId) || foodById('egg');
    if (f) {
      const g = servingGrams(f);
      const pg = Math.round((f.per100.protein || 0) * g / 100);
      add(60, 'info', 'apple', `Noch ${protGap} g Protein`, `${evening ? 'Für die Nacht: ' : ''}${f.name.replace(/\s*\(.*\)/, '')} (${g} g) bringt ${pg} g.`, { type: 'food', foodId: f.id, grams: g });
    }
  }
  const expected = (s.profile.water || 3500) * Math.min(1, Math.max(0, (h - 7) / 14));
  if (isToday && (day.water || 0) < expected - 600) {
    const open = ((s.profile.water || 0) - (day.water || 0)) / 1000;
    add(50, 'info', 'drop', 'Trinken', `Noch ${open.toFixed(1).replace('.', ',')} L offen – jetzt 500 ml.`, { type: 'water', ml: 500 });
  }
  const slot = h < 11 ? 'morgens' : h < 15 ? 'mittags' : h >= 19 ? 'abends' : null;
  if (slot) {
    const open = s.supplements.filter(x => x.time === slot && !(day.supps && day.supps[x.id]));
    if (open.length) add(45, 'info', 'pill', `Supplements ${slot}`, open.map(x => x.name.replace(/\s*\(.*\)/, '')).join(', '), { type: 'supps' });
  }
  if (!p.parts.reha && h >= 10) add(42, 'info', 'knee', 'Knie-Reha', 'Wall Sit oder Spanish Squat · 5 × 45 s – 5 Minuten, die dein Knie stark machen.', { type: 'reha' });
  if (isToday && h >= 21) {
    const [wh, wm] = String(s.profile.wakeTime || '07:00').split(':').map(Number);
    const bed = (wh * 60 + wm - (s.profile.sleepTarget || 8) * 60 + 1440) % 1440;
    add(40, 'info', 'moon', 'Schlaf', `Für ${s.profile.sleepTarget || 8} h Schlaf: spätestens ${String(Math.floor(bed / 60)).padStart(2, '0')}:${String(bed % 60).padStart(2, '0')} ins Bett.`, null);
  }
  if (p.overall >= 100 && kOver <= 100) add(200, 'good', 'trophy', 'Tag geschafft', 'Alle drei Ringe voll und im Budget. Du hast dir den Schlaf verdient.', null);

  return hints.sort((a, b) => b.prio - a.prio);
}

// ============================================================================
// Basketball-Spielplan
// ============================================================================
export function getGames() { return load().games || []; }
export function gamesForDate(key) { return getGames().filter(g => g.date === key); }
export function upcomingGames(fromKey = todayKey(), limit = 6) {
  return getGames().filter(g => g.date >= fromKey)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, limit);
}
export function nextGame(fromKey = todayKey()) {
  const g = upcomingGames(fromKey, 1)[0];
  return g ? { game: g, days: daysBetween(fromKey, g.date) } : null;
}

// ============================================================================
// Körper: Messungen · Gewicht · Projektion · Badges · Fotos
// ============================================================================
export function getMeasurements() { return (load().measurements || []).slice().sort((a, b) => a.date.localeCompare(b.date)); }
export function addMeasurement(entry) {
  const s = load();
  const i = s.measurements.findIndex(m => m.date === entry.date);
  if (i >= 0) s.measurements[i] = entry; else s.measurements.push(entry);
  save();
}
export function deleteMeasurement(date) { const s = load(); s.measurements = s.measurements.filter(m => m.date !== date); save(); }
export function latestMeasurement() { const m = getMeasurements(); return m.length ? m[m.length - 1] : null; }
export function firstMeasurement() { const m = getMeasurements(); return m.length ? m[0] : null; }

export function weightTrend(key = todayKey(), windowDays = 7) {
  const vals = [];
  for (let i = 0; i < windowDays; i++) {
    const d = peekDay(shiftDate(key, -i));
    if (d && d.weight != null && !isNaN(d.weight)) vals.push(d.weight);
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
export function currentWeight() {
  const s = load();
  for (const k of Object.keys(s.log).sort().reverse()) if (s.log[k].weight != null) return s.log[k].weight;
  const m = latestMeasurement();
  if (m && m.values.weight != null) return m.values.weight;
  return s.profile.weight || null;
}
export function weightSeries(key = todayKey(), days = 30) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = shiftDate(key, -i);
    const d = peekDay(k);
    out.push({ key: k, w: d && d.weight != null ? d.weight : null });
  }
  return out;
}

export function weeklySummary(today = todayKey()) {
  let ringSum = 0, complete = 0, sessions = 0, loadSum = 0;
  for (let i = 0; i < 7; i++) {
    const k = shiftDate(today, -i);
    ringSum += ringSummary(k).pct;
    if (dayComplete(k)) complete++;
    sessions += sessionsFor(k).length;
    loadSum += dayLoad(k);
  }
  const wNow = weightTrend(today, 7), wPrev = weightTrend(shiftDate(today, -7), 7);
  return {
    avgRing: Math.round(ringSum / 7), complete, sessions, load: loadSum,
    wNow, wPrev, delta: wNow != null && wPrev != null ? +(wNow - wPrev).toFixed(1) : null,
  };
}

export function goalProjection(today = todayKey()) {
  const s = load();
  const cur = currentWeight();
  const target = s.profile.targetWeight;
  if (cur == null || !target) return { current: cur, target, rate: null };
  const wNow = weightTrend(today, 7), wThen = weightTrend(shiftDate(today, -14), 7);
  let rate = null, weeks = null, date = null;
  if (wNow != null && wThen != null) {
    rate = +((wNow - wThen) / 2).toFixed(2);
    if (rate < -0.05 && cur > target) {
      weeks = Math.ceil((cur - target) / -rate);
      const d = new Date(); d.setDate(d.getDate() + weeks * 7);
      date = dateKey(d);
    }
  }
  const tempo = TEMPO[s.profile.tempo] || TEMPO.fast;
  let planDate = null, planWeeks = null;
  if (cur > target) {
    planWeeks = Math.ceil((cur - target) / tempo.rate);
    const d = new Date(); d.setDate(d.getDate() + planWeeks * 7);
    planDate = dateKey(d);
  }
  return { current: cur, target, rate, weeks, date, planDate, planWeeks, tempo: tempo.label };
}
// Abgleich echter Trend vs. gewähltes Tempo → konkreter Vorschlag (delta in kcal)
export function kcalAdvice(today = todayKey()) {
  const proj = goalProjection(today);
  const p = load().profile;
  const tempo = TEMPO[p.tempo] || TEMPO.fast;
  const kcal = kcalTarget(today);
  const r = (x) => String(Math.abs(x)).replace('.', ',');
  if (proj.rate == null) return { text: `Wieg dich ein paar Mal pro Woche morgens nüchtern – nach 2 Wochen gleiche ich dein Ziel (${tempo.label}, ${tempo.desc}) mit deinem echten Trend ab.`, delta: 0 };
  if (proj.current <= proj.target) return { text: 'Zielgewicht erreicht – Zeit, auf Erhalt umzustellen.', delta: 0 };
  const loss = -proj.rate;
  if (loss < tempo.rate * 0.6) return { text: `Du verlierst ${r(loss)} kg/Woche, geplant sind ${r(tempo.rate)}. Vorschlag: 150 kcal weniger pro Tag (heute ${de0(kcal - 150)} statt ${de0(kcal)}).`, delta: -150 };
  if (loss > Math.max(1.1, tempo.rate * 1.6)) return { text: `Du verlierst ${r(loss)} kg/Woche – schneller als geplant. 100 kcal mehr schützen deine Muskeln.`, delta: 100 };
  return { text: `${r(loss)} kg pro Woche – genau im Plan (${tempo.label}). Nichts ändern.`, delta: 0 };
}
function de0(x) { return Math.round(x).toLocaleString('de-DE'); }
export function kcalSuggestion(today = todayKey()) { return kcalAdvice(today).text; }
export function applyKcalOffset(delta) {
  const p = load().profile;
  p.kcalOffset = Math.max(-600, Math.min(600, (p.kcalOffset || 0) + delta));
  save();
}

export function getBadges() {
  const s = load();
  const streak = currentStreak(), best = Math.max(bestStreak(), streak), perfect = perfectDays();
  const first = firstMeasurement(), latest = latestMeasurement(), cur = currentWeight();
  const startW = first && first.values.weight != null ? first.values.weight : null;
  const lostW = startW != null && cur != null ? startW - cur : 0;
  const lostBf = first && latest && first.values.bodyfat != null && latest.values.bodyfat != null ? first.values.bodyfat - latest.values.bodyfat : 0;
  const workouts = s.workouts.length;
  const kneeDays = Object.values(s.log).filter(d => d.knee != null).length;
  const prs = s.lifts.filter(l => isLiftPR(l.id)).length;
  const budgetDays = Object.keys(s.log).filter(k => k >= (s._v4Since || '0000') && inBudget(k) && s.log[k].entries.length >= 3).length;
  const skillUpsN = Object.values(s.skills || {}).reduce((a, x) => a + ((x && x.ups) || []).length, 0);
  const skillDone = Object.values(s.skills || {}).filter(x => x && x.done).length;
  const B = (icon, label, earned, desc) => ({ icon, label, earned: !!earned, desc });
  return [
    B('flame', '3 Tage Streak', best >= 3, 'Drei Tage in Folge dein Tagesziel.'),
    B('flame', '7 Tage Streak', best >= 7, 'Eine ganze Woche durchgezogen.'),
    B('zap', '30 Tage Streak', best >= 30, 'Ein Monat Disziplin.'),
    B('target', '100 % Tag', perfect >= 1, 'Alle drei Ringe an einem Tag voll.'),
    B('trophy', '10 perfekte Tage', perfect >= 10, 'Zehn Tage mit vollem Ring.'),
    B('dumbbell', 'Erstes Workout', workouts >= 1, 'Den Workout-Modus durchgezogen.'),
    B('dumbbell', '20 Workouts', workouts >= 20, 'Zwanzig geloggte Workouts.'),
    B('medal', '5 Rekorde', prs >= 5, 'Fünf persönliche Bestleistungen.'),
    B('knee', 'Knie im Blick', kneeDays >= 14, '14 Tage Knie-Check gemacht.'),
    B('scale', '−2 kg', lostW >= 2, 'Zwei Kilo runter seit Start.'),
    B('scale', '−5 kg', lostW >= 5, 'Fünf Kilo runter.'),
    B('chart', '−2 % Körperfett', lostBf >= 2, 'Zwei Prozent Körperfett weniger.'),
    B('flame', '7× im Budget', budgetDays >= 7, 'Sieben Tage im Kalorien-Budget.'),
    B('zap', 'Erste Skill-Stufe', skillUpsN >= 1, 'Eine Calisthenics-Stufe geschafft.'),
    B('trophy', 'Skill gemeistert', skillDone >= 1, 'Handstand, Back Lever oder Muscle-Up geschafft.'),
  ];
}

export function getProgressPhotos() { return (load().photos || []).slice().sort((a, b) => a.date.localeCompare(b.date)); }
export function addProgressPhoto(url, date = todayKey()) {
  const s = load();
  const i = s.photos.findIndex(p => p.date === date);
  if (i >= 0) s.photos[i] = { date, url }; else s.photos.push({ date, url });
  save();
}
export function deleteProgressPhoto(date) { const s = load(); s.photos = s.photos.filter(p => p.date !== date); save(); }
