// ============================================================================
// Mikromaxxing – State-Verwaltung (localStorage)
// Hält Profil/Ziele, Lebensmittelbibliothek, Supplemente und das Tages-Log.
// ============================================================================
import {
  NUTRIENTS, DEFAULT_PROFILE, DEFAULT_SUPPLEMENTS, SEED_FOODS,
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
    log: {}, // key -> { entries:[{foodId, grams}], water, supps:{id:bool}, weight, note }
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
  // Normalisierung: jedes Lebensmittel hat ein whole-Flag (Standard: unverarbeitet).
  for (const f of merged.foods) if (typeof f.whole !== 'boolean') f.whole = true;
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
    s.log[key] = { entries: [], water: 0, supps: {}, weight: null, note: '' };
  }
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
    const seeds = ['chicken_breast', 'egg', 'oats', 'greek_yogurt', 'banana', 'salmon'];
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
  const perNutrient = openGaps.map(nutKey => {
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
  }).filter(x => x.best) // nur Nährstoffe, für die es einen Lieferanten gibt
    .sort((a, b) => a.currentPct - b.currentPct);

  return { totals, remainingKcal, openGaps, topTips, perNutrient, allDone: openGaps.length === 0 };
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
