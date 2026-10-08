// ============================================================================
// Mikromaxxing – Eintragen per Satz
// Zerlegt deutsche Freitext- oder Spracheingaben („3 Eier, 200g Skyr mit
// Heidelbeeren und ne Banane") in Lebensmittel, Mahlzeiten, Wasser und
// Supplements mit Mengen. Reine Logik ohne DOM – auch in Node testbar.
// ============================================================================
import { FOOD_ALIASES, SUPP_ALIASES, ZERO_DRINKS, WATER_WORDS } from './data.js';

// --- Normalisierung ----------------------------------------------------------
export function fold(str) {
  return String(str || '').toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9.,/½\s-]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// Grobe deutsche Stammform für Singular/Plural-Vergleiche (eier→ei, bananen→banan)
function stem(word) {
  if (word.length <= 3) return word;
  for (const suf of ['en', 'er', 'n', 'e', 's']) {
    if (word.endsWith(suf) && word.length - suf.length >= 2) return word.slice(0, -suf.length);
  }
  return word;
}

function lev(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 9;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

// --- Zahlen & Einheiten ------------------------------------------------------
const NUMBER_WORDS = {
  ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, eines: 1, ne: 1, nen: 1, n: 1,
  zwei: 2, drei: 3, vier: 4, funf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
  elf: 11, zwolf: 12, zwanzig: 20, dreissig: 30, vierzig: 40, funfzig: 50,
  hundert: 100, einhundert: 100, zweihundert: 200, dreihundert: 300, vierhundert: 400,
  funfhundert: 500, tausend: 1000,
  halb: 0.5, halbe: 0.5, halber: 0.5, halbes: 0.5, halben: 0.5, halbem: 0.5,
  anderthalb: 1.5, eineinhalb: 1.5, paar: 2,
};

// Einheit → Funktion (Anzahl, Lebensmittel) → Gramm/ml
const UNITS = [
  { re: /^(g|gr|gramm)$/,                 grams: (n) => n },
  { re: /^(kg|kilo|kilogramm)$/,          grams: (n) => n * 1000 },
  { re: /^(ml|milliliter)$/,              grams: (n) => n },
  { re: /^(cl)$/,                         grams: (n) => n * 10 },
  { re: /^(l|liter)$/,                    grams: (n) => n * 1000 },
  { re: /^(el|essloffel)$/,               grams: (n) => n * 15 },
  { re: /^(tl|teeloffel)$/,               grams: (n) => n * 5 },
  { re: /^(scoop|scoops|messloffel)$/,    grams: (n) => n * 30 },
  { re: /^(handvoll)$/,                   grams: (n) => n * 30 },
  { re: /^(glas|glaser|glaschen)$/,       grams: (n) => n * 200 },
  { re: /^(tasse|tassen)$/,               grams: (n) => n * 150 },
  { re: /^(flasche|flaschen)$/,           grams: (n) => n * 500 },
  { re: /^(schale|schussel|teller)$/,     grams: (n) => n * 250 },
  { re: /^(dose|dosen)$/,                 grams: (n, f) => n * servingOr(f, 'dose', 140) },
  { re: /^(becher)$/,                     grams: (n, f) => n * servingOr(f, 'becher', 150) },
  { re: /^(packung|packchen|pack)$/,      grams: (n, f) => n * servingOr(f, 'packung', 200) },
  { re: /^(portion|portionen)$/,          grams: (n, f) => n * defaultGrams(f) },
  { re: /^(scheibe|scheiben)$/,           grams: (n, f) => n * (f && f.piece && /scheibe/i.test(f.piece.name) ? f.piece.g : 25) },
  { re: /^(riegel)$/,                     grams: (n, f) => n * (f && f.piece ? f.piece.g : 60) },
  { re: /^(stuck|stk|st|x|mal)$/,         grams: (n, f) => n * pieceGrams(f) },
];

function servingOr(food, word, fallback) {
  const s = food && food.servings && food.servings.find(x => fold(x.label).includes(word));
  return s ? s.grams : fallback;
}
function pieceGrams(food) {
  if (food && food.piece) return food.piece.g;
  if (food && food.servings && food.servings[0]) return food.servings[0].grams;
  return 100;
}
export function defaultGrams(food) {
  if (!food) return 100;
  if (food.piece) return food.piece.g * (food.piece.def || 1);
  if (food.servings && food.servings[0]) return food.servings[0].grams;
  return 100;
}

// Füllwörter, die beim Abgleich stören
const FILLER = new Set([
  'ich', 'hab', 'habe', 'hatte', 'gerade', 'eben', 'heute', 'morgens', 'mittags', 'abends',
  'zum', 'zur', 'als', 'fruhstuck', 'mittagessen', 'abendessen', 'snack', 'gegessen', 'getrunken',
  'genommen', 'eingenommen', 'noch', 'dann', 'auch', 'so', 'ca', 'circa', 'etwa', 'ungefahr',
  'bisschen', 'etwas', 'der', 'die', 'das', 'den', 'dem', 'des', 'von', 'vom', 'aus', 'meine',
  'mein', 'meinen', 'nochmal', 'also', 'ja', 'ok', 'und', 'mit', 'dazu', 'plus', 'kleinen',
]);
// Zubereitungs-/Größenwörter (werden entfernt, Größe skaliert Stück-Lebensmittel)
const SIZE = [
  { re: /^(gross|grosse|grossen|grosser|grosses|riesig\w*)$/, f: 1.3 },
  { re: /^(klein|kleine|kleiner|kleines|kleinen)$/, f: 0.7 },
];
const PREP = /^(gebraten\w*|gekocht\w*|gegrillt\w*|roh\w*|frisch\w*|gedunstet\w*|gebacken\w*|geback\w*|warm\w*|kalt\w*|ganz\w*|mittel\w*|selbstgemacht\w*|tiefgekuhlt\w*|tk|bio)$/;

// Trenner zwischen einzelnen Posten
const SPLIT_RE = /\s*(?:,|;|\n|\+|&|\bund\b|\bmit\b|\bplus\b|\bdazu\b|\bsowie\b|\bdanach\b|\bausserdem\b)\s*/;

// --- Index ------------------------------------------------------------------
function nameAliases(food) {
  const base = String(food.name || '').replace(/\(.*?\)/g, ' ');
  return base.split('/').map(x => fold(x)).filter(x => x.length >= 2);
}

export function buildIndex(ctx) {
  const foods = (ctx.foods || []).map(food => {
    const aliases = new Set(nameAliases(food));
    for (const a of (FOOD_ALIASES[food.id] || [])) aliases.add(fold(a));
    if (Array.isArray(food.aliases)) for (const a of food.aliases) aliases.add(fold(a));
    return { food, aliases: [...aliases] };
  });
  const meals = (ctx.meals || []).map(meal => ({ meal, name: fold(meal.name.replace(/\(.*?\)/g, ' ')), full: fold(meal.name) }));
  const supps = (ctx.supplements || []).map(supp => {
    const aliases = new Set([fold(supp.name.replace(/\(.*?\)/g, ' '))]);
    for (const a of (SUPP_ALIASES[supp.id] || [])) aliases.add(fold(a));
    return { supp, aliases: [...aliases] };
  });
  return { foods, meals, supps };
}

// Bewertet, wie gut eine Phrase zu einem Alias passt (0 = gar nicht)
function aliasScore(phrase, alias) {
  if (!alias) return 0;
  if (phrase === alias) return 100;
  const padded = ` ${phrase} `;
  if (padded.includes(` ${alias} `)) return 70 + Math.min(alias.length, 20);
  const pw = phrase.split(' ');
  const aw = alias.split(' ');
  if (aw.length === 1) {
    const as = stem(alias);
    for (const w of pw) {
      if (w.length < 2) continue;
      if (stem(w) === as) return 68 + Math.min(alias.length, 20);
      // Komposita: „hähnchenbrustfilet" enthält „hähnchenbrust"
      if (alias.length >= 5 && w.length > alias.length && (w.startsWith(alias) || w.endsWith(alias))) return 55 + Math.min(alias.length, 15);
      if (w.length >= 4 && alias.length >= 4) {
        const d = lev(w, alias);
        const max = alias.length >= 8 ? 2 : 1;
        if (d <= max) return 50 - d * 8 + Math.min(alias.length, 10);
      }
    }
  }
  return 0;
}

const SOFT_WORDS = new Set(['rot', 'rote', 'roter', 'rotes', 'grun', 'grune', 'gelb', 'gelbe', 'weiss', 'weisse', 'schwarz', 'schwarze', 'normal', 'normale', 'naturell', 'natur', 'stuck', 'stucke', 'portion', 'mittelgross', 'reif', 'reife', 'light', 'leicht']);
function bestFood(phrase, index) {
  let best = null;
  for (const entry of index.foods) {
    let score = 0, alias = '';
    for (const a of entry.aliases) { const sc = aliasScore(phrase, a); if (sc > score) { score = sc; alias = a; } }
    if (score > 0 && (!best || score > best.score)) best = { food: entry.food, score, alias };
  }
  // Wörter, die das Lebensmittel nicht erklärt („dal" in „linsen dal") → unsicher
  if (best && best.score < 100) {
    const aw = best.alias.split(' ').map(stem);
    const extra = phrase.split(' ').filter(w => w.length >= 3 && !SOFT_WORDS.has(w) && !aw.some(a => a === stem(w) || w.includes(a) || a.includes(stem(w))));
    if (extra.length) best.extra = extra;
  }
  return best;
}

function suggestFoods(phrase, index, limit = 3) {
  const words = phrase.split(' ').filter(w => w.length >= 3);
  const scored = [];
  for (const entry of index.foods) {
    let s = 0;
    for (const a of entry.aliases) {
      if (a.length < 4) continue;
      for (const w of words) {
        if (w.length >= 4 && (a.includes(w) || w.includes(a))) s = Math.max(s, 40);
        else if (w.length >= 5 && lev(w, a) <= 2) s = Math.max(s, 30 - lev(w, a));
      }
    }
    if (s > 0) scored.push({ id: entry.food.id, s });
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map(x => x.id);
}

function bestMeal(phrase, index) {
  let best = null;
  for (const m of index.meals) {
    let score = 0;
    if (phrase === m.name || phrase === m.full) score = 100;
    else if (m.name.length >= 4 && (` ${phrase} `.includes(` ${m.name} `))) score = 95;
    else if (phrase.length >= 5 && m.name.includes(phrase)) score = 85;
    if (score && (!best || score > best.score)) best = { meal: m.meal, score };
  }
  return best;
}

function bestSupp(phrase, index) {
  let best = null;
  for (const entry of index.supps) {
    let score = 0;
    for (const a of entry.aliases) score = Math.max(score, aliasScore(phrase, a));
    if (score >= 68 && (!best || score > best.score)) best = { supp: entry.supp, score };
  }
  return best;
}

// --- Menge aus einem Posten lesen -------------------------------------------
function parseNumber(tok) {
  if (tok === '½') return 0.5;
  if (/^\d+\/\d+$/.test(tok)) { const [a, b] = tok.split('/').map(Number); return b ? a / b : null; }
  if (/^\d+(?:[.,]\d+)?$/.test(tok)) return Number(tok.replace(',', '.'));
  if (tok in NUMBER_WORDS) return NUMBER_WORDS[tok];
  return null;
}

function unitFor(tok) {
  return UNITS.find(u => u.re.test(tok)) || null;
}

// Zerlegt einen Posten in { count, unit, rest, size }
function splitQuantity(chunk) {
  // „200g" → „200 g", „2x" → „2 x", „1,5l" → „1,5 l"
  const prepared = chunk
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/(\d)\s*-\s*(\d)/g, '$1-$2');
  const toks = prepared.split(' ').filter(Boolean);
  let count = null, unit = null, size = 1;
  const rest = [];
  for (let i = 0; i < toks.length; i++) {
    let t = toks[i];
    // Bereich „2-3" → Mittelwert
    if (/^\d+(?:[.,]\d+)?-\d+(?:[.,]\d+)?$/.test(t)) {
      const [a, b] = t.split('-').map(x => Number(x.replace(',', '.')));
      if (count == null) { count = (a + b) / 2; continue; }
    }
    const num = parseNumber(t);
    const isWordNum = t in NUMBER_WORDS;
    // „ein paar" → 2
    if (t === 'ein' && toks[i + 1] === 'paar') { count = 2; i++; continue; }
    // Zahlwörter („ein", „halbes") zählen nur vor dem Lebensmittel als Menge
    if (num != null && count == null && (!isWordNum || rest.length === 0)) {
      count = num;
      const u = toks[i + 1] && unitFor(toks[i + 1]);
      if (u) { unit = u; i++; }
      continue;
    }
    if (num != null) continue; // zweite Zahl im selben Posten ignorieren
    if (!unit && unitFor(t) && count == null && /^(glas|tasse|scheibe|portion|becher|dose|handvoll|schale|flasche|scoop|riegel)/.test(t)) {
      unit = unitFor(t); count = 1; continue;
    }
    const sz = SIZE.find(s => s.re.test(t));
    if (sz) { size *= sz.f; continue; }
    if (PREP.test(t) || FILLER.has(t)) continue;
    rest.push(t);
  }
  return { count, unit, size, phrase: rest.join(' ').trim() };
}

function amountFor(food, q) {
  let grams, estimated = false;
  if (q.unit) {
    grams = q.unit.grams(q.count == null ? 1 : q.count, food);
  } else if (q.count != null) {
    if (food && food.piece) grams = q.count * food.piece.g * q.size;
    else if (q.count >= 15) grams = q.count;               // „Skyr 200" = Gramm
    else grams = q.count * defaultGrams(food);
  } else {
    grams = defaultGrams(food) * (food && food.piece ? q.size : 1);
    estimated = true;
  }
  return { grams: Math.max(1, Math.round(grams)), estimated };
}

// Deutsche Mehrzahl für Stück-Bezeichnungen (Ei → Eier, Banane → Bananen)
const PLURAL = { ei: 'Eier', apfel: 'Äpfel', kiwi: 'Kiwis', scoop: 'Scoops', riegel: 'Riegel', paprika: 'Paprika', stuck: 'Stück', avocado: 'Avocados', mango: 'Mangos' };
export function plural(word) {
  const w = String(word || '');
  const hit = PLURAL[fold(w)];
  if (hit) return hit;
  if (/e$/.test(w)) return w + 'n';
  if (/el$/.test(w)) return w + 'n';
  return w;
}

// Originalschreibweise einer normalisierten Phrase („doner" → „Döner")
export function originalPhrase(text, phrase) {
  const words = String(text || '').split(/[\s,;+&]+/).filter(Boolean);
  const target = fold(phrase);
  const n = target.split(' ').length;
  for (let i = 0; i + n <= words.length; i++) {
    const cand = words.slice(i, i + n).join(' ').replace(/[.!?:]+$/, '');
    if (fold(cand) === target) return cand;
  }
  return phrase;
}

// Menge aus dem Original-Satzteil für ein (neu angelegtes) Lebensmittel
export function amountFromRaw(food, raw) {
  const q = splitQuantity(fold(raw || '').replace(/(\d),(\d)/g, '$1.$2'));
  return amountFor(food, q).grams;
}

export function amountLabel(food, grams) {
  if (food && food.piece) {
    const n = grams / food.piece.g;
    const rounded = Math.round(n * 2) / 2;
    if (Math.abs(n - rounded) < 0.05) {
      const s = String(rounded).replace('.', ',');
      return `${s} ${rounded === 1 ? food.piece.name : plural(food.piece.name)} · ${grams} g`;
    }
  }
  return `${grams} g`;
}

// --- Hauptfunktion -----------------------------------------------------------
// Rückgabe: Liste von Posten
//   { raw, type: 'food'|'meal'|'water'|'supp'|'zero'|'unknown', foodId, mealId,
//     suppId, grams, ml, estimated, suggestions }
export function parseEntry(text, ctx, prebuilt) {
  const index = prebuilt || buildIndex(ctx);
  // Dezimalkomma („1,5 l") schützen, bevor an Kommas getrennt wird
  const folded = fold(text).replace(/(\d),(\d)/g, '$1.$2');
  if (!folded) return [];
  const chunks = folded.split(SPLIT_RE).map(c => c.trim()).filter(Boolean);
  const out = [];
  let lastWasHotDrink = false;

  for (const raw of chunks) {
    const q = splitQuantity(raw);
    const phrase = q.phrase;
    if (!phrase) { continue; }

    // 1) Wasser
    if (WATER_WORDS.some(w => ` ${phrase} `.includes(` ${w} `))) {
      let ml;
      if (q.unit) ml = q.unit.grams(q.count == null ? 1 : q.count, null);
      else if (q.count != null) ml = q.count >= 50 ? q.count : (q.count <= 5 && /liter/.test(raw) ? q.count * 1000 : q.count * 250);
      else ml = 250;
      out.push({ raw, type: 'water', ml: Math.round(ml), estimated: q.count == null && !q.unit });
      lastWasHotDrink = false;
      continue;
    }

    // 2) Kalorienfreie Getränke (Kaffee, Tee …)
    if (ZERO_DRINKS.some(w => ` ${phrase} `.includes(` ${w} `) || phrase === w)) {
      out.push({ raw, type: 'zero', label: phrase });
      lastWasHotDrink = true;
      continue;
    }

    // 3) Gespeicherte Mahlzeit (z. B. „Poke Bowl")
    const meal = bestMeal(phrase, index);
    // 4) Lebensmittel
    const food = bestFood(phrase, index);
    // 5) Supplement
    const supp = bestSupp(phrase, index);

    if (meal && (!food || meal.score >= food.score)) {
      const portions = q.count != null && !q.unit ? q.count : 1;
      out.push({ raw, type: 'meal', mealId: meal.meal.id, portions, estimated: false });
      lastWasHotDrink = false;
      continue;
    }
    if (supp && (!food || supp.score > food.score)) {
      out.push({ raw, type: 'supp', suppId: supp.supp.id });
      lastWasHotDrink = false;
      continue;
    }
    if (food && food.score >= 40) {
      let { grams, estimated } = amountFor(food.food, q);
      // „Kaffee mit Milch" ohne Mengenangabe → nur ein Schuss Milch
      if (lastWasHotDrink && food.food.id === 'milk' && q.count == null && !q.unit) { grams = 30; estimated = true; }
      out.push({ raw, type: 'food', foodId: food.food.id, grams, estimated, phrase,
        confidence: food.score >= 68 && !food.extra ? 'high' : 'low' });
      lastWasHotDrink = false;
      continue;
    }
    out.push({ raw, type: 'unknown', phrase, suggestions: suggestFoods(phrase, index) });
    lastWasHotDrink = false;
  }
  return out;
}
