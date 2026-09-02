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
  day.entries.push({ foodId, grams: Number(grams) || 0 });
  save();
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
