// ============================================================================
// Mikromaxxing – Nährwerte nachschlagen
//   · Claude (Haiku 5.5) schätzt unbekannte Lebensmittel & Gerichte
//   · Open Food Facts liefert Packungswerte zum Barcode
// Der API-Key liegt nur auf diesem Gerät (eigener localStorage-Eintrag,
// nicht im Backup-Export).
// ============================================================================
import { NUTRIENTS, FOOD_CATS } from './data.js';

const AI_KEY = 'mikromaxxing_ai';
const MODEL = 'claude-haiku-5-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product/';
const NUT_KEYS = NUTRIENTS.map(n => n.key);

// --- Einstellungen ----------------------------------------------------------
function readAI() {
  try { return JSON.parse(localStorage.getItem(AI_KEY) || '{}') || {}; } catch (e) { return {}; }
}
export function getApiKey() { return readAI().key || ''; }
export function hasAI() { return !!getApiKey(); }
export function setApiKey(key) {
  const cur = readAI();
  cur.key = String(key || '').trim();
  try { localStorage.setItem(AI_KEY, JSON.stringify(cur)); } catch (e) { /* voll */ }
}
export function aiUsage() { const a = readAI(); return { calls: a.calls || 0, inTok: a.inTok || 0, outTok: a.outTok || 0 }; }
function trackUsage(usage) {
  if (!usage) return;
  const a = readAI();
  a.calls = (a.calls || 0) + 1;
  a.inTok = (a.inTok || 0) + (usage.input_tokens || 0);
  a.outTok = (a.outTok || 0) + (usage.output_tokens || 0);
  try { localStorage.setItem(AI_KEY, JSON.stringify(a)); } catch (e) { /* egal */ }
}
// Haiku 5.5: 0,10 $ / 1 Mio. Input-Tokens, 0,50 $ / 1 Mio. Output-Tokens
export function aiCostUSD() { const u = aiUsage(); return u.inTok * 0.10 / 1e6 + u.outTok * 0.50 / 1e6; }

export class LookupError extends Error {
  constructor(msg, code) { super(msg); this.code = code; }
}

// --- Claude-Aufruf ----------------------------------------------------------
const PER100_SCHEMA = {
  type: 'object', additionalProperties: false, required: NUT_KEYS,
  properties: Object.fromEntries(NUT_KEYS.map(k => [k, { type: 'number' }])),
};
const ITEM_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['query', 'found', 'name', 'cat', 'whole', 'per100', 'unit', 'pieceName', 'pieceGrams', 'portionGrams', 'aliases', 'benefit', 'confidence'],
  properties: {
    query: { type: 'string' },
    found: { type: 'boolean' },
    name: { type: 'string' },
    cat: { type: 'string', enum: FOOD_CATS },
    whole: { type: 'boolean' },
    per100: PER100_SCHEMA,
    unit: { type: 'string', enum: ['piece', 'gram'] },
    pieceName: { type: 'string' },
    pieceGrams: { type: 'number' },
    portionGrams: { type: 'number' },
    aliases: { type: 'array', items: { type: 'string' } },
    benefit: { type: 'string' },
    confidence: { type: 'string', enum: ['hoch', 'mittel', 'niedrig'] },
  },
};
const RESULT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['items'],
  properties: { items: { type: 'array', items: ITEM_SCHEMA } },
};

const SYSTEM = `Du bist Ernährungswissenschaftler und legst Einträge für eine deutschsprachige Nährwert-App an. Der Nutzer ist ein 26-jähriger Athlet (Basketball, Gym, Calisthenics) mit Patellasehnen-Problemen am linken Knie, Ziel: Fett ab, Muskeln auf.

Für jede Eingabe bestimmst du das gemeinte Lebensmittel, Getränk oder Gericht – so, wie man es in Deutschland typischerweise bekommt (Imbiss, Restaurant, Bäcker oder Supermarkt, je nachdem was naheliegt). Gerichte rechnest du als gewichteten Mix ihrer üblichen Zutaten.

Nährwerte immer pro 100 g essbarem Anteil (Getränke pro 100 ml), orientiert am Bundeslebensmittelschlüssel, an USDA FoodData Central oder an typischen Packungsangaben. Schätze jeden Mikronährstoff realistisch; 0 nur, wenn er praktisch nicht enthalten ist. kcal muss zu den Makros passen (4 kcal je g Protein und Kohlenhydrate, 9 je g Fett, 2 je g Ballaststoffe).

Einheiten: kcal in kcal; protein, carbs, fat, fiber, sugar, satfat in g; vitA (als Retinol-Äquivalent), vitD, vitK, vitB7, vitB9 (Folat-Äquivalent), vitB12, selenium, iodine in µg; vitC, vitE, vitB1, vitB2, vitB3, vitB5, vitB6, calcium, iron, magnesium, zinc, potassium, sodium, phosphorus, copper, manganese, omega3 (EPA+DHA+ALA) in mg.

unit = "piece", wenn man es stückweise isst (Ei, Banane, Döner, Riegel, Brötchen): pieceName ist die Stück-Bezeichnung im Singular (z. B. "Döner"), pieceGrams das Gewicht eines Stücks und portionGrams = pieceGrams. Sonst unit = "gram", pieceName = "" und pieceGrams = 0, portionGrams = übliche Portion in g.

name: kurzer deutscher Name, Zubereitung oder Variante in Klammern, z. B. "Döner Kebab (im Brot)". aliases: 2–5 kleingeschriebene Wörter oder Wortgruppen, mit denen man es ansagen würde, inklusive der Eingabe. whole: true für naturbelassene Lebensmittel, false für Gerichte, Fast Food, Süßes und stark Verarbeitetes.

benefit: ein kurzer, ehrlicher Satz, was das Lebensmittel diesem Athleten bringt (Protein, auffällige Vitamine/Mineralstoffe, Sehnen, Regeneration) – oder dass es vor allem Energie liefert.

confidence: wie sicher die Werte sind (hoch bei Grundnahrungsmitteln, niedrig bei sehr variablen Gerichten).

found = false, wenn die Eingabe kein Lebensmittel und kein Getränk ist; dann name = "", per100 mit Nullen, aliases = [] und benefit = "".
query: die Eingabe genau so, wie sie übergeben wurde.`;

async function callClaude(userText, maxTokens = 8000, plain = false) {
  const key = getApiKey();
  if (!key) throw new LookupError('Kein API-Key hinterlegt', 'nokey');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new LookupError('Du bist offline', 'offline');
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system: plain
      ? `${SYSTEM}\n\nAntworte ausschließlich mit einem JSON-Objekt nach diesem JSON-Schema, ohne weiteren Text:\n${JSON.stringify(RESULT_SCHEMA)}`
      : SYSTEM,
    messages: [{ role: 'user', content: userText }],
  };
  if (!plain) body.output_config = { format: { type: 'json_schema', schema: RESULT_SCHEMA } };
  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new LookupError('Keine Verbindung zu Claude', 'network');
  }
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = (j.error && j.error.message) || ''; } catch (e) { /* kein JSON */ }
    if (res.status === 401 || res.status === 403) throw new LookupError('API-Key ungültig oder ohne Berechtigung', 'auth');
    if (res.status === 429) throw new LookupError('Zu viele Anfragen – kurz warten', 'rate');
    if (res.status === 400 && /credit|balance|billing/i.test(detail)) throw new LookupError('Kein Guthaben auf dem API-Konto', 'billing');
    // Strukturiertes Format abgelehnt → einmal mit reiner JSON-Anweisung
    if (res.status === 400 && !plain && /schema|output_config|format|grammar/i.test(detail)) return callClaude(userText, maxTokens, true);
    if (res.status >= 500) throw new LookupError('Claude ist gerade überlastet – gleich nochmal', 'overloaded');
    throw new LookupError(detail || `Fehler ${res.status}`, 'api');
  }
  const data = await res.json();
  trackUsage(data.usage);
  if (data.stop_reason === 'refusal') throw new LookupError('Claude hat die Anfrage abgelehnt', 'refusal');
  if (data.stop_reason === 'max_tokens') throw new LookupError('Antwort zu lang – bitte weniger auf einmal', 'max_tokens');
  let text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  if (plain) { const a = text.indexOf('{'), z = text.lastIndexOf('}'); if (a >= 0 && z > a) text = text.slice(a, z + 1); }
  try { return JSON.parse(text); } catch (e) { throw new LookupError('Antwort nicht lesbar', 'parse'); }
}

// Werte säubern: keine negativen/kaputten Zahlen, kcal plausibel
function cleanPer100(p) {
  const out = {};
  for (const k of NUT_KEYS) {
    const v = Number(p && p[k]);
    out[k] = isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : 0;
  }
  const est = out.protein * 4 + out.carbs * 4 + out.fat * 9 + out.fiber * 2;
  if (!out.kcal && est) out.kcal = Math.round(est);
  return out;
}

// Ergebnis eines KI-Eintrags → Lebensmittel für die Bibliothek
function toFood(item, extra = {}) {
  const piece = item.unit === 'piece' && item.pieceGrams > 0
    ? { name: (item.pieceName || 'Stück').trim(), g: Math.round(item.pieceGrams), def: 1 }
    : null;
  const portion = Math.round(item.portionGrams) || (piece ? piece.g : 100);
  const aliases = [...new Set([String(item.query || '').toLowerCase().trim(), ...(item.aliases || []).map(a => String(a).toLowerCase().trim())])].filter(Boolean);
  return {
    id: null,
    name: String(item.name || item.query || 'Neues Lebensmittel').trim(),
    cat: FOOD_CATS.includes(item.cat) ? item.cat : 'Sonstiges',
    whole: !!item.whole,
    ...(piece ? { piece, servings: [] } : { servings: [{ label: `Portion (${portion} g)`, grams: portion }] }),
    aliases,
    per100: cleanPer100(item.per100),
    benefit: String(item.benefit || '').trim(),
    source: 'ai',
    confidence: item.confidence || 'mittel',
    ...extra,
  };
}

// Mehrere unbekannte Einträge in einem Rutsch schätzen.
// Rückgabe: Map phrase → { food } | { notFood: true }
export async function estimateFoods(phrases, { context = '' } = {}) {
  const list = [...new Set(phrases.map(p => String(p).trim()).filter(Boolean))];
  if (!list.length) return new Map();
  const ctx = String(context || '').trim();
  const text = `Lege für diese Einträge aus meinem Ernährungstagebuch je ein Lebensmittel an. Mengenangaben sind schon entfernt, Umlaute wurden zu a/o/u vereinfacht${ctx ? ` – so habe ich es ursprünglich geschrieben: "${ctx.slice(0, 600)}"` : ''}.\n${list.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
  const json = await callClaude(text, Math.min(16000, 3000 + list.length * 2500));
  const out = new Map();
  const items = Array.isArray(json.items) ? json.items : [];
  list.forEach((phrase, i) => {
    const hit = items.find(it => String(it.query || '').trim().toLowerCase() === phrase.toLowerCase()) || items[i];
    if (!hit) return;
    out.set(phrase, hit.found === false || !hit.name ? { notFood: true } : { food: toFood({ ...hit, query: phrase }) });
  });
  return out;
}

// Packungsprodukt: bekannte Werte bleiben, Claude ergänzt nur die Lücken
export async function completeProduct(food, knownKeys) {
  const known = Object.fromEntries([...knownKeys].map(k => [k, food.per100[k]]));
  const text = `Packungsprodukt: "${food.name}"${food.brand ? ` von ${food.brand}` : ''}${food.quantity ? ` (${food.quantity})` : ''}.
Diese Werte pro 100 g stehen auf der Packung und sind exakt – übernimm sie unverändert: ${JSON.stringify(known)}.
Schätze alle übrigen Nährstoffe für genau dieses Produkt. query = "${food.name}".`;
  const json = await callClaude(text, 6000);
  const it = (json.items || [])[0];
  if (!it || it.found === false) return food;
  const est = cleanPer100(it.per100);
  const per100 = { ...food.per100 };
  for (const k of NUT_KEYS) if (!knownKeys.has(k)) per100[k] = est[k];
  return {
    ...food, per100,
    cat: food.cat && food.cat !== 'Sonstiges' ? food.cat : (FOOD_CATS.includes(it.cat) ? it.cat : 'Sonstiges'),
    whole: typeof it.whole === 'boolean' ? it.whole : food.whole,
    benefit: String(it.benefit || '').trim() || food.benefit || '',
    aliases: [...new Set([...(food.aliases || []), ...(it.aliases || []).map(a => String(a).toLowerCase())])],
    microsBy: 'ai',
  };
}

// Kurzer Verbindungstest für die Einstellungen
export async function testConnection() {
  const r = await estimateFoods(['banane']);
  return r.get('banane');
}

// --- Open Food Facts -------------------------------------------------------
// _100g-Werte sind in Gramm normiert → in die Einheiten der App umrechnen
const OFF_MAP = [
  ['kcal', 'energy-kcal_100g', 1], ['protein', 'proteins_100g', 1], ['carbs', 'carbohydrates_100g', 1],
  ['fat', 'fat_100g', 1], ['fiber', 'fiber_100g', 1], ['sugar', 'sugars_100g', 1], ['satfat', 'saturated-fat_100g', 1],
  ['sodium', 'sodium_100g', 1000],
  ['vitA', 'vitamin-a_100g', 1e6], ['vitC', 'vitamin-c_100g', 1000], ['vitD', 'vitamin-d_100g', 1e6],
  ['vitE', 'vitamin-e_100g', 1000], ['vitK', 'vitamin-k_100g', 1e6], ['vitB1', 'vitamin-b1_100g', 1000],
  ['vitB2', 'vitamin-b2_100g', 1000], ['vitB3', 'vitamin-pp_100g', 1000], ['vitB5', 'pantothenic-acid_100g', 1000],
  ['vitB6', 'vitamin-b6_100g', 1000], ['vitB7', 'biotin_100g', 1e6], ['vitB9', 'vitamin-b9_100g', 1e6],
  ['vitB12', 'vitamin-b12_100g', 1e6], ['calcium', 'calcium_100g', 1000], ['iron', 'iron_100g', 1000],
  ['magnesium', 'magnesium_100g', 1000], ['zinc', 'zinc_100g', 1000], ['potassium', 'potassium_100g', 1000],
  ['phosphorus', 'phosphorus_100g', 1000], ['selenium', 'selenium_100g', 1e6], ['copper', 'copper_100g', 1000],
  ['manganese', 'manganese_100g', 1000], ['iodine', 'iodine_100g', 1e6], ['omega3', 'omega-3-fat_100g', 1000],
];
const OFF_CATS = [
  [/fish|seafood|fisch/, 'Fisch'], [/dair|milk|cheese|yogurt|quark|skyr|milch|kase/, 'Milchprodukte'],
  [/meat|poultry|sausage|fleisch|wurst|protein/, 'Protein'], [/legume|bean|lentil|chickpea|hulsen/, 'Hülsenfrüchte'],
  [/nut|seed|nuss/, 'Nüsse & Samen'], [/fruit|obst/, 'Obst'], [/vegetable|gemuse/, 'Gemüse'],
  [/cereal|bread|pasta|rice|grain|oat|getreide|brot/, 'Getreide'], [/beverage|drink|getrank/, 'Getränke'],
  [/meal|dish|pizza|sandwich|gericht/, 'Gerichte'], [/snack|sweet|chocolate|biscuit|candy|chip|confection/, 'Snacks'],
];

export async function fetchProduct(code) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length < 8) throw new LookupError('Ungültiger Barcode', 'code');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new LookupError('Du bist offline', 'offline');
  let res;
  try {
    const fields = 'code,product_name,product_name_de,generic_name_de,brands,quantity,serving_size,serving_quantity,nutriments,categories_tags,image_front_small_url';
    res = await fetch(`${OFF_URL}${code}.json?fields=${fields}`);
  } catch (e) {
    throw new LookupError('Keine Verbindung zu Open Food Facts', 'network');
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new LookupError(`Open Food Facts antwortet nicht (${res.status})`, 'api');
  const data = await res.json();
  if (!data || data.status === 0 || !data.product) return null;
  const p = data.product;
  const nm = p.nutriments || {};
  const per100 = Object.fromEntries(NUT_KEYS.map(k => [k, 0]));
  const known = new Set();
  for (const [key, field, f] of OFF_MAP) {
    const v = Number(nm[field]);
    if (nm[field] !== undefined && nm[field] !== '' && isFinite(v)) { per100[key] = Math.round(v * f * 100) / 100; known.add(key); }
  }
  if (!known.has('kcal') && isFinite(Number(nm.energy_100g))) { per100.kcal = Math.round(Number(nm.energy_100g) / 4.184); known.add('kcal'); }
  if (!known.has('sodium') && isFinite(Number(nm.salt_100g))) { per100.sodium = Math.round(Number(nm.salt_100g) * 400); known.add('sodium'); }
  const name = String(p.product_name_de || p.product_name || p.generic_name_de || '').trim() || `Produkt ${code}`;
  const brand = String(p.brands || '').split(',')[0].trim();
  const tags = (p.categories_tags || []).join(' ').toLowerCase();
  const cat = (OFF_CATS.find(([re]) => re.test(tags)) || [null, 'Sonstiges'])[1];
  const serving = Number(p.serving_quantity) > 0 ? Math.round(Number(p.serving_quantity)) : null;
  const food = {
    id: null,
    name: brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name,
    cat, whole: false,
    servings: serving ? [{ label: `Portion (${serving} g)`, grams: serving }] : [{ label: '100 g', grams: 100 }],
    aliases: [name.toLowerCase()],
    per100, barcode: code, source: 'off', brand, quantity: p.quantity || '',
    image: p.image_front_small_url || '',
  };
  return { food, known, hasMacros: ['kcal', 'protein', 'carbs', 'fat'].every(k => known.has(k)) };
}
