// ============================================================================
// Mikromaxxing – State-Verwaltung (localStorage)
// Hält Profil/Ziele, Lebensmittelbibliothek, Supplemente und das Tages-Log.
// ============================================================================
import {
  NUTRIENTS, DEFAULT_PROFILE, DEFAULT_SUPPLEMENTS, SEED_FOODS,
  DEFAULT_SCHEDULE, DEFAULT_TRAINING, DEFAULT_HABITS, DEFAULT_AUTOPILOT, GAMES,
  DEFAULT_MEASUREMENTS,
} from './data.js';

const STORAGE_KEY = 'mikromaxxing_v1';
const SCHEMA = 1;

// --- Datum-Helfer ------------------------------------------------------------
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function shiftDate(key, deltaDays) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return todayKey(dt);
}

export function formatDateLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const today = todayKey();
  if (key === today) return 'Heute';
  if (key === shiftDate(today, -1)) return 'Gestern';
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return `${days[dt.getDay()]}, ${d}.${m}.`;
}

// --- Default-Zustand ---------------------------------------------------------
function freshState() {
  return {
    schema: SCHEMA,
    profile: structuredClone(DEFAULT_PROFILE),
    foods: structuredClone(SEED_FOODS),
    supplements: structuredClone(DEFAULT_SUPPLEMENTS),
    schedule: structuredClone(DEFAULT_SCHEDULE),
    training: structuredClone(DEFAULT_TRAINING),
    habits: structuredClone(DEFAULT_HABITS),
    autopilot: structuredClone(DEFAULT_AUTOPILOT),
    games: structuredClone(GAMES),
    measurements: structuredClone(DEFAULT_MEASUREMENTS),
    _seedTrimV1: true,
    _athleteV1: true,
    _athleteV2: true,
    _variety1: true,
    _habitsV2: true,
    _habitsV3: true,
    _planV3: true,
    _planV4: true,
    _gamesV1: true,
    _bodyseed1: true,
    log: {}, // key -> { entries, water, supps, weight, note, done:{}, autopilotLoaded }
  };
}

// --- Laden / Speichern -------------------------------------------------------
let state = null;

export function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = migrate(parsed);
      save(); // Migration (Normalisierung/Bereinigung) sofort persistieren
    } else {
      state = freshState();
      save();
    }
  } catch (e) {
    console.error('State konnte nicht geladen werden, starte neu:', e);
    state = freshState();
  }
  return state;
}

function migrate(parsed) {
  // Fehlende Felder mit Defaults auffüllen (vorwärtskompatibel).
  const base = freshState();
  const merged = Object.assign(base, parsed);
  if (!merged.profile) merged.profile = base.profile;
  if (!merged.profile.targets) merged.profile.targets = base.profile.targets;
  if (!Array.isArray(merged.foods) || merged.foods.length === 0) merged.foods = base.foods;
  if (!Array.isArray(merged.supplements)) merged.supplements = base.supplements;
  if (!merged.log) merged.log = {};
  // Life-Planner-Felder (für bestehende Installs nachrüsten)
  if (!merged.schedule) merged.schedule = base.schedule;
  if (!merged.training) merged.training = base.training;
  if (!Array.isArray(merged.habits)) merged.habits = base.habits;
  if (!Array.isArray(merged.autopilot)) merged.autopilot = base.autopilot;
  // Normalisierung: jedes Lebensmittel hat ein whole-Flag (Standard: unverarbeitet).
  for (const f of merged.foods) if (typeof f.whole !== 'boolean') f.whole = true;
  // Einmalige Bereinigung: verarbeitete Start-Lebensmittel entfernen (nur Obst/Gemüse
  // bleiben im Startset). Bereits geloggte Einträge werden geschont.
  if (!merged._seedTrimV1) {
    const REMOVED = new Set([
      'chicken_breast', 'egg', 'salmon', 'mackerel', 'sardines', 'tuna_can', 'cod',
      'beef_lean', 'beef_liver', 'chicken_thigh', 'greek_yogurt', 'cottage_cheese',
      'milk', 'kefir', 'oats', 'brown_rice', 'quinoa', 'ww_bread', 'lentils',
      'kidney_beans', 'almonds', 'walnuts', 'pumpkin_seeds', 'chia', 'peanut_butter',
      'olive_oil',
    ]);
    const usedIds = new Set();
    for (const key of Object.keys(merged.log)) {
      for (const e of (merged.log[key].entries || [])) usedIds.add(e.foodId);
    }
    merged.foods = merged.foods.filter(f => !(REMOVED.has(f.id) && !usedIds.has(f.id)));
    merged._seedTrimV1 = true;
  }
  // Einmalige Athleten-Einrichtung (Lebensmittel, Stack, Supplements, Training,
  // Profil-Ziele). Log/gegessene Einträge bleiben erhalten.
  if (!merged._athleteV1) {
    const have = new Set(merged.foods.map(f => f.id));
    for (const f of SEED_FOODS) if (!have.has(f.id)) merged.foods.push(structuredClone(f));
    merged.supplements = structuredClone(DEFAULT_SUPPLEMENTS);
    merged.autopilot = structuredClone(DEFAULT_AUTOPILOT);
    merged.training = structuredClone(DEFAULT_TRAINING);
    merged.profile.height = 180;
    merged.profile.weight = 95;
    merged.profile.activity = 'high';
    merged.profile.goal = 'recomp';
    Object.assign(merged.profile.targets, { kcal: 2450, protein: 210, carbs: 210, fat: 85 });
    merged._athleteV1 = true;
  }
  // Stack-Update (persönliche Auswahl): fehlende Lebensmittel ergänzen, neuen
  // Essential-Stack setzen. Log bleibt erhalten.
  if (!merged._athleteV2) {
    const have = new Set(merged.foods.map(f => f.id));
    for (const f of SEED_FOODS) if (!have.has(f.id)) merged.foods.push(structuredClone(f));
    merged.autopilot = structuredClone(DEFAULT_AUTOPILOT);
    merged._athleteV2 = true;
  }
  // Neue Lebensmittel für Abwechslung ergänzen (additiv, ändert Stack nicht)
  if (!merged._variety1) {
    const have = new Set(merged.foods.map(f => f.id));
    for (const f of SEED_FOODS) if (!have.has(f.id)) merged.foods.push(structuredClone(f));
    merged._variety1 = true;
  }
  // Neue tägliche Gewohnheiten (Knie-Reha, Core, Calisthenics AM/PM) ergänzen
  if (!merged._habitsV2) {
    const haveH = new Set(merged.habits.map(h => h.id));
    const additions = DEFAULT_HABITS.filter(h => !haveH.has(h.id));
    // Neue Reha-/Athletik-Gewohnheiten nach vorne stellen
    merged.habits = [...additions, ...merged.habits];
    merged._habitsV2 = true;
  }
  // Weitere neue Standard-Gewohnheiten ergänzen (z.B. Wiegen)
  if (!merged._habitsV3) {
    const haveH = new Set(merged.habits.map(h => h.id));
    for (const h of DEFAULT_HABITS) if (!haveH.has(h.id)) merged.habits.push(structuredClone(h));
    merged._habitsV3 = true;
  }
  if (!Array.isArray(merged.measurements)) merged.measurements = [];
  // Knie-sicherer Wochenplan + Trainingsplan (überschreibt Vorlage)
  if (!merged._planV3) {
    merged.schedule = structuredClone(DEFAULT_SCHEDULE);
    merged.training = structuredClone(DEFAULT_TRAINING);
    merged._planV3 = true;
  }
  // Plan-Update: Do flexibel, Gym B auf Fr, Schwimmen+Sauna kombiniert
  if (!merged._planV4) {
    merged.schedule = structuredClone(DEFAULT_SCHEDULE);
    merged.training = structuredClone(DEFAULT_TRAINING);
    merged._planV4 = true;
  }
  // Basketball-Spielplan setzen
  if (!merged._gamesV1) {
    merged.games = structuredClone(GAMES);
    merged._gamesV1 = true;
  }
  if (!Array.isArray(merged.games)) merged.games = structuredClone(GAMES);
  // Start-Körpermessung (InBody) seeden, falls noch keine vorhanden
  if (!merged._bodyseed1) {
    if (!Array.isArray(merged.measurements) || merged.measurements.length === 0) {
      merged.measurements = structuredClone(DEFAULT_MEASUREMENTS);
    }
    if (merged.profile.targetWeight == null) merged.profile.targetWeight = 85;
    merged._bodyseed1 = true;
  }
  return merged;
}

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Speichern fehlgeschlagen (Speicher voll?):', e);
    alert('Speichern fehlgeschlagen. Ggf. ist der Browser-Speicher voll.');
  }
}

export function getState() { return load(); }

// --- Tages-Log-Zugriff -------------------------------------------------------
export function getDay(key) {
  const s = load();
  if (!s.log[key]) {
    s.log[key] = { entries: [], water: 0, supps: {}, weight: null, note: '', done: {}, autopilotLoaded: false };
  }
  if (!s.log[key].done) s.log[key].done = {};
  return s.log[key];
}

export function addEntry(key, foodId, grams) {
  const day = getDay(key);
  day.entries.push({ foodId, grams: Number(grams) || 0, ts: Date.now() });
  save();
  return day.entries.length - 1;
}

export function updateEntry(key, index, grams) {
  const day = getDay(key);
  if (day.entries[index]) {
    day.entries[index].grams = Number(grams) || 0;
    save();
  }
}

export function removeEntry(key, index) {
  const day = getDay(key);
  day.entries.splice(index, 1);
  save();
}

export function setWater(key, ml) {
  const day = getDay(key);
  day.water = Math.max(0, Number(ml) || 0);
  save();
}

export function toggleSupp(key, suppId) {
  const day = getDay(key);
  day.supps[suppId] = !day.supps[suppId];
  save();
}

export function setWeight(key, kg) {
  const day = getDay(key);
  day.weight = kg === '' || kg == null ? null : Number(kg);
  save();
}

export function setNote(key, text) {
  const day = getDay(key);
  day.note = text;
  save();
}

// --- Lebensmittel-CRUD -------------------------------------------------------
export function foodById(id) {
  return load().foods.find(f => f.id === id) || null;
}

export function upsertFood(food) {
  const s = load();
  const idx = s.foods.findIndex(f => f.id === food.id);
  if (idx >= 0) s.foods[idx] = food;
  else s.foods.push(food);
  save();
}

export function deleteFood(id) {
  const s = load();
  s.foods = s.foods.filter(f => f.id !== id);
  save();
}

// --- Supplement-CRUD ---------------------------------------------------------
export function upsertSupplement(supp) {
  const s = load();
  const idx = s.supplements.findIndex(x => x.id === supp.id);
  if (idx >= 0) s.supplements[idx] = supp;
  else s.supplements.push(supp);
  save();
}

export function deleteSupplement(id) {
  const s = load();
  s.supplements = s.supplements.filter(x => x.id !== id);
  save();
}

// --- Profil ------------------------------------------------------------------
export function updateProfile(patch) {
  const s = load();
  Object.assign(s.profile, patch);
  save();
}

export function setTarget(key, value) {
  const s = load();
  s.profile.targets[key] = Number(value) || 0;
  save();
}

// --- Berechnungen ------------------------------------------------------------
// Summiert alle Nährstoffe eines Tages aus den Einträgen.
export function computeTotals(key) {
  const s = load();
  const day = s.log[key] || { entries: [] };
  const totals = {};
  for (const nut of NUTRIENTS) totals[nut.key] = 0;
  for (const entry of day.entries) {
    const food = s.foods.find(f => f.id === entry.foodId);
    if (!food) continue;
    const factor = (entry.grams || 0) / 100;
    for (const nut of NUTRIENTS) {
      totals[nut.key] += (food.per100[nut.key] || 0) * factor;
    }
  }
  // Abgehakte Supplements mit hinterlegten Nährwerten mitzählen
  if (day.supps) {
    for (const supp of s.supplements) {
      if (day.supps[supp.id] && supp.nutrients) {
        for (const k in supp.nutrients) {
          if (k in totals) totals[k] += supp.nutrients[k];
        }
      }
    }
  }
  return totals;
}

// --- Backup / Wiederherstellung ---------------------------------------------
export function exportJSON() {
  return JSON.stringify(load(), null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  state = migrate(parsed);
  save();
  return state;
}

export function resetAll() {
  state = freshState();
  save();
  return state;
}

// ============================================================================
// Schnellzugriff (Smart-Mix): Uhrzeit + zuletzt + Häufigkeit
// ============================================================================
// Liefert die passendsten Lebensmittel zum One-Tap-Loggen, inkl. vorgeschlagener
// Grammzahl (aus der letzten Nutzung).
export function getQuickPicks(limit = 8, now = Date.now()) {
  const s = load();
  const nowHour = new Date(now).getHours();
  const stats = new Map(); // foodId -> { count, lastTs, lastGrams, hourHits }

  for (const key of Object.keys(s.log)) {
    for (const e of s.log[key].entries) {
      if (!e.foodId) continue;
      let st = stats.get(e.foodId);
      if (!st) { st = { count: 0, lastTs: 0, lastGrams: 0, hourHits: 0 }; stats.set(e.foodId, st); }
      st.count += 1;
      if (e.ts) {
        if (e.ts > st.lastTs) { st.lastTs = e.ts; st.lastGrams = e.grams; }
        const h = new Date(e.ts).getHours();
        let diff = Math.abs(h - nowHour);
        if (diff > 12) diff = 24 - diff;      // zyklisch
        if (diff <= 2) st.hourHits += 1;      // ±2 Stunden
      } else if (!st.lastGrams) {
        st.lastGrams = e.grams;
      }
    }
  }

  const scored = [];
  for (const [foodId, st] of stats) {
    const food = s.foods.find(f => f.id === foodId);
    if (!food) continue;
    // Recency-Bonus
    let rec = 0;
    if (st.lastTs) {
      const ageH = (now - st.lastTs) / 3.6e6;
      if (ageH < 24) rec = 3; else if (ageH < 72) rec = 2; else if (ageH < 168) rec = 1;
    }
    const score = st.hourHits * 2 + st.count + rec;
    const grams = st.lastGrams || servingGrams(food);
    scored.push({ food, grams, score });
  }
  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    // Erststart: sinnvolle Standard-Vorschläge
    const seeds = ['banana', 'apple', 'kiwi', 'bell_pepper', 'carrot', 'spinach'];
    return seeds.map(id => s.foods.find(f => f.id === id)).filter(Boolean)
      .map(food => ({ food, grams: servingGrams(food), score: 0 }));
  }
  return scored.slice(0, limit);
}

// ============================================================================
// 100%-Coach: Empfehlungen zum Schließen der Nährstoff-Lücken
// ============================================================================
// Nährstoffe, die "auf 100%" gebracht werden sollen (ohne kcal & Limit-Werte).
export const GAP_KEYS = [
  'protein', 'fiber', 'omega3',
  'vitA', 'vitC', 'vitD', 'vitE', 'vitK',
  'vitB1', 'vitB2', 'vitB3', 'vitB5', 'vitB6', 'vitB7', 'vitB9', 'vitB12',
  'calcium', 'iron', 'magnesium', 'zinc', 'potassium', 'phosphorus',
  'selenium', 'copper', 'manganese', 'iodine',
];

function servingGrams(food) {
  if (food.piece) return food.piece.g * (food.piece.def || 1);
  return (food.servings && food.servings[0]) ? food.servings[0].grams : 100;
}

const MAX_PIECE_SCALE = 3; // Coach schlägt max. so viele Stück vor (damit's gesund/realistisch bleibt)

// Bewertet ein Lebensmittel: wie viel der offenen Tages-Lücken schließt es
// (Summe der geschlossenen Zielanteile) und was kostet es an kcal.
function scoreFood(food, grams, totals, targets) {
  const factor = grams / 100;
  let gapClose = 0;
  const contribs = [];
  for (const key of GAP_KEYS) {
    const target = targets[key];
    if (!target) continue;
    const gap = target - (totals[key] || 0);
    if (gap <= 0.0001) continue;
    const contrib = (food.per100[key] || 0) * factor;
    if (contrib <= 0) continue;
    const filled = Math.min(contrib, gap);
    gapClose += filled / target;
    contribs.push({ key, addedPct: Math.round((contrib / target) * 100) });
  }
  contribs.sort((a, b) => b.addedPct - a.addedPct);
  return { gapClose, kcal: (food.per100.kcal || 0) * factor, contribs };
}

export function getRecommendations(key) {
  const s = load();
  const totals = computeTotals(key);
  const targets = s.profile.targets;
  const remainingKcal = targets.kcal - (totals.kcal || 0);
  const wholeFoods = s.foods.filter(f => f.whole !== false);

  // Offene Lücken (für die Fortschrittsanzeige / Erfolgszustand)
  const openGaps = GAP_KEYS.filter(k => targets[k] && (totals[k] || 0) < targets[k] * 0.999);

  // --- Top-Tipps: Lebensmittel, die am meisten Lücken pro Portion schließen ---
  const ranked = wholeFoods
    .map(food => {
      const g = servingGrams(food);
      return { food, grams: g, ...scoreFood(food, g, totals, targets) };
    })
    .filter(r => r.gapClose > 0.0001)
    .sort((a, b) => b.gapClose - a.gapClose);

  const fits = ranked.filter(r => r.kcal <= remainingKcal + 5);
  const topTips = (fits.length ? fits : ranked).slice(0, 4);

  // --- Aufschlüsselung pro fehlendem Nährstoff (größtes Defizit zuerst) ------
  const allGaps = openGaps.map(nutKey => {
    const target = targets[nutKey];
    const current = totals[nutKey] || 0;
    const currentPct = Math.round((current / target) * 100);
    // Bestes unverarbeitetes Lebensmittel für genau diesen Nährstoff (dichteste Quelle)
    let best = null;
    for (const food of wholeFoods) {
      const g = servingGrams(food);
      const contrib = (food.per100[nutKey] || 0) * (g / 100);
      if (contrib <= 0) continue;
      const addedPct = Math.round((contrib / target) * 100);
      const kcal = Math.round((food.per100.kcal || 0) * (g / 100));
      if (!best || addedPct > best.addedPct) best = { food, grams: g, addedPct, kcal };
    }
    // Stück-Lebensmittel zum Lückenfüllen hochrechnen (z.B. 2 Paprika), gedeckelt.
    if (best && best.food.piece) {
      const p = best.food.piece;
      const perPieceContrib = (best.food.per100[nutKey] || 0) / 100 * p.g;
      const perPieceKcal = (best.food.per100.kcal || 0) / 100 * p.g;
      const gapAbs = target - current;
      let count = p.def || 1;
      while (count < MAX_PIECE_SCALE
             && perPieceContrib * count < gapAbs
             && (remainingKcal <= 0 || perPieceKcal * (count + 1) <= remainingKcal)) {
        count++;
      }
      const g = p.g * count;
      best = {
        food: best.food, grams: g,
        addedPct: Math.round((best.food.per100[nutKey] || 0) / 100 * g / target * 100),
        kcal: Math.round((best.food.per100.kcal || 0) / 100 * g),
      };
    }
    return { nutKey, current, target, currentPct, best };
  });
  // Aufteilen: füllbar über Obst/Gemüse vs. nur über Supplement/Hauptmahlzeit
  const perNutrient = allGaps.filter(x => x.best).sort((a, b) => a.currentPct - b.currentPct);
  const hardGaps = allGaps.filter(x => !x.best).sort((a, b) => a.currentPct - b.currentPct);

  return { totals, remainingKcal, openGaps, topTips, perNutrient, hardGaps, allDone: openGaps.length === 0 };
}

// Nährstoffe, die aus Obst/Gemüse praktisch nicht ausreichend kommen
// (Info-Hinweis für den Nutzer). Werden als "über Supplement/Hauptmahlzeit" markiert.
export const SUPPLEMENT_ONLY = new Set(['vitB12', 'vitD', 'omega3', 'iodine', 'calcium']);

// --- Essentials-Zusammenfassung (Mikros + Protein) --------------------------
export function essentialsSummary(key) {
  const s = load();
  const totals = computeTotals(key);
  const t = s.profile.targets;
  let done = 0, n = 0, sum = 0;
  const byKey = [];
  for (const k of GAP_KEYS) {
    if (!t[k]) continue;
    const cur = totals[k] || 0;
    const p = (cur / t[k]) * 100;
    byKey.push({ key: k, pct: Math.round(p) });
    sum += Math.min(100, p);
    n++;
    if (cur >= t[k] * 0.999) done++;
  }
  return { done, total: n, coverage: n ? Math.round(sum / n) : 0, byKey };
}

// --- Essential-Stack automatisch für heute laden ----------------------------
export function ensureAutopilot(key) {
  const s = load();
  if (s.profile.autopilotAuto === false) return false;
  if (!s.autopilot || !s.autopilot.length) return false;
  const day = getDay(key);
  if (day.autopilotLoaded) return false;
  loadAutopilot(key);
  return true;
}

export function lastGramsFor(foodId) {
  const s = load();
  let latest = null;
  for (const key of Object.keys(s.log)) {
    for (const e of s.log[key].entries) {
      if (e.foodId === foodId && (!latest || (e.ts || 0) > (latest.ts || 0))) latest = e;
    }
  }
  if (latest) return latest.grams;
  const food = s.foods.find(f => f.id === foodId);
  return food && food.servings && food.servings[0] ? food.servings[0].grams : 100;
}

// ============================================================================
// LIFE PLANNER
// ============================================================================
export function weekdayOf(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

function timeToMin(t) {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return h * 60 + m;
}

// --- Tagesplan / Timeline ----------------------------------------------------
export function getDaySchedule(key) {
  const s = load();
  const wd = weekdayOf(key);
  const blocks = (s.schedule[wd] || []).slice();
  blocks.sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
  return blocks;
}

// Aktueller & nächster Block anhand der Uhrzeit
export function currentBlock(key, now = new Date()) {
  const blocks = getDaySchedule(key);
  if (!blocks.length) return { current: null, next: null };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let current = null, next = null;
  for (const b of blocks) {
    if (timeToMin(b.time) <= nowMin) current = b;
    else { next = b; break; }
  }
  // Vor dem ersten Block: nächster ist der erste
  if (!current) next = blocks[0];
  return { current, next };
}

// --- Checks (Blöcke, Steps, Habits) -----------------------------------------
export function toggleCheck(key, checkKey) {
  const day = getDay(key);
  day.done[checkKey] = !day.done[checkKey];
  save();
}
export function isChecked(key, checkKey) {
  const s = load();
  const day = s.log[key];
  return !!(day && day.done && day.done[checkKey]);
}

// --- Training ----------------------------------------------------------------
export function getTrainingFor(key) {
  const s = load();
  return s.training[weekdayOf(key)] || null;
}

// --- Gewohnheiten & Streaks --------------------------------------------------
export function getHabits() { return load().habits; }

export function habitStreak(habitId, todayKeyStr = todayKey()) {
  const s = load();
  const ck = 'habit:' + habitId;
  let streak = 0;
  let cursor = todayKeyStr;
  // Heute zählt nur, wenn erledigt; sonst wird heute übersprungen (noch offen).
  let first = true;
  while (true) {
    const day = s.log[cursor];
    const done = !!(day && day.done && day.done[ck]);
    if (done) { streak++; }
    else if (first) { /* heute noch offen: nicht abbrechen */ }
    else { break; }
    first = false;
    cursor = shiftDate(cursor, -1);
    if (streak > 400) break; // Sicherheitslimit
  }
  return streak;
}

export function upsertHabit(habit) {
  const s = load();
  const i = s.habits.findIndex(h => h.id === habit.id);
  if (i >= 0) s.habits[i] = habit; else s.habits.push(habit);
  save();
}
export function deleteHabit(id) {
  const s = load();
  s.habits = s.habits.filter(h => h.id !== id);
  save();
}

// --- Ernährungs-Autopilot ----------------------------------------------------
export function getAutopilot() { return load().autopilot; }

export function setAutopilot(list) {
  const s = load();
  s.autopilot = list;
  save();
}

export function isAutopilotLoaded(key) {
  const s = load();
  return !!(s.log[key] && s.log[key].autopilotLoaded);
}

// Lädt den festen Tagesplan in den heutigen Log (einmalig).
export function loadAutopilot(key) {
  const s = load();
  const day = getDay(key);
  let added = 0;
  for (const item of s.autopilot) {
    const food = s.foods.find(f => f.id === item.foodId);
    if (!food) continue;
    day.entries.push({ foodId: item.foodId, grams: Number(item.grams) || 0, ts: Date.now() });
    added++;
  }
  day.autopilotLoaded = true;
  save();
  return added;
}

// --- Tagesplan-Editor --------------------------------------------------------
export function setScheduleDay(weekday, blocks) {
  const s = load();
  s.schedule[weekday] = blocks;
  save();
}
export function setTrainingDay(weekday, training) {
  const s = load();
  s.training[weekday] = training;
  save();
}

// --- Basketball-Spielplan ----------------------------------------------------
export function getGames() { return load().games || []; }

export function gamesForDate(key) {
  return (load().games || []).filter(g => g.date === key);
}

export function nextGame(fromKey = todayKey()) {
  const games = (load().games || []).slice().sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time));
  for (const g of games) {
    if (g.date >= fromKey) {
      const [y, m, d] = g.date.split('-').map(Number);
      const [fy, fm, fd] = fromKey.split('-').map(Number);
      const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(fy, fm - 1, fd)) / 86400000);
      return { game: g, days };
    }
  }
  return null;
}

export function upcomingGames(fromKey = todayKey(), limit = 6) {
  return (load().games || [])
    .filter(g => g.date >= fromKey)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, limit);
}

// --- Körperanalyse / Messungen ----------------------------------------------
export function getMeasurements() {
  return (load().measurements || []).slice().sort((a, b) => a.date.localeCompare(b.date));
}
export function addMeasurement(entry) {
  const s = load();
  if (!s.measurements) s.measurements = [];
  // gleiches Datum überschreiben
  const i = s.measurements.findIndex(m => m.date === entry.date);
  if (i >= 0) s.measurements[i] = entry; else s.measurements.push(entry);
  save();
}
export function deleteMeasurement(date) {
  const s = load();
  s.measurements = (s.measurements || []).filter(m => m.date !== date);
  save();
}
export function latestMeasurement() {
  const m = getMeasurements();
  return m.length ? m[m.length - 1] : null;
}
export function firstMeasurement() {
  const m = getMeasurements();
  return m.length ? m[0] : null;
}

// --- 7-Tage-Gewichtsschnitt (aus Tages-Log) ---------------------------------
export function weightTrend(key = todayKey(), windowDays = 7) {
  const s = load();
  const vals = [];
  for (let i = 0; i < windowDays; i++) {
    const d = shiftDate(key, -i);
    const w = s.log[d] && s.log[d].weight;
    if (w != null && !isNaN(w)) vals.push(w);
  }
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
