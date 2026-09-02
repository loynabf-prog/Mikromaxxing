// ============================================================================
// Mikromaxxing – Stammdaten
// Nährstoff-Definitionen, personalisierte Zielwerte, Start-Lebensmittelbibliothek
// Alle Lebensmittelwerte sind pro 100 g (bzw. 100 ml). Quelle: USDA / DGE-nahe
// Richtwerte. Nicht aufgeführte Mikros sind mit 0 hinterlegt ("kein relevanter
// Lieferant") und in der App jederzeit editierbar.
// ============================================================================

// --- Nährstoff-Katalog -------------------------------------------------------
// group: 'macro' | 'vitamin' | 'mineral' | 'other'
// limit: true  => Ziel ist eine Obergrenze (grün = darunter bleiben)
export const NUTRIENTS = [
  // Energie & Makros
  { key: 'kcal',      label: 'Kalorien',       unit: 'kcal', group: 'macro' },
  { key: 'protein',   label: 'Protein',        unit: 'g',    group: 'macro' },
  { key: 'carbs',     label: 'Kohlenhydrate',  unit: 'g',    group: 'macro' },
  { key: 'fat',       label: 'Fett',           unit: 'g',    group: 'macro' },
  { key: 'fiber',     label: 'Ballaststoffe',  unit: 'g',    group: 'macro' },
  { key: 'sugar',     label: 'Zucker',         unit: 'g',    group: 'macro', limit: true },
  { key: 'satfat',    label: 'ges. Fettsäuren',unit: 'g',    group: 'macro', limit: true },

  // Vitamine
  { key: 'vitA',      label: 'Vitamin A',      unit: 'µg',   group: 'vitamin' },
  { key: 'vitC',      label: 'Vitamin C',      unit: 'mg',   group: 'vitamin' },
  { key: 'vitD',      label: 'Vitamin D',      unit: 'µg',   group: 'vitamin' },
  { key: 'vitE',      label: 'Vitamin E',      unit: 'mg',   group: 'vitamin' },
  { key: 'vitK',      label: 'Vitamin K',      unit: 'µg',   group: 'vitamin' },
  { key: 'vitB1',     label: 'Vitamin B1',     unit: 'mg',   group: 'vitamin' },
  { key: 'vitB2',     label: 'Vitamin B2',     unit: 'mg',   group: 'vitamin' },
  { key: 'vitB3',     label: 'Vitamin B3',     unit: 'mg',   group: 'vitamin' },
  { key: 'vitB5',     label: 'Vitamin B5',     unit: 'mg',   group: 'vitamin' },
  { key: 'vitB6',     label: 'Vitamin B6',     unit: 'mg',   group: 'vitamin' },
  { key: 'vitB7',     label: 'Biotin (B7)',    unit: 'µg',   group: 'vitamin' },
  { key: 'vitB9',     label: 'Folat (B9)',     unit: 'µg',   group: 'vitamin' },
  { key: 'vitB12',    label: 'Vitamin B12',    unit: 'µg',   group: 'vitamin' },

  // Mineralstoffe & Spurenelemente
  { key: 'calcium',   label: 'Calcium',        unit: 'mg',   group: 'mineral' },
  { key: 'iron',      label: 'Eisen',          unit: 'mg',   group: 'mineral' },
  { key: 'magnesium', label: 'Magnesium',      unit: 'mg',   group: 'mineral' },
  { key: 'zinc',      label: 'Zink',           unit: 'mg',   group: 'mineral' },
  { key: 'potassium', label: 'Kalium',         unit: 'mg',   group: 'mineral' },
  { key: 'sodium',    label: 'Natrium',        unit: 'mg',   group: 'mineral', limit: true },
  { key: 'phosphorus',label: 'Phosphor',       unit: 'mg',   group: 'mineral' },
  { key: 'selenium',  label: 'Selen',          unit: 'µg',   group: 'mineral' },
  { key: 'copper',    label: 'Kupfer',         unit: 'mg',   group: 'mineral' },
  { key: 'manganese', label: 'Mangan',         unit: 'mg',   group: 'mineral' },
  { key: 'iodine',    label: 'Jod',            unit: 'µg',   group: 'mineral' },
  { key: 'selen_dup', label: '',               unit: '',     group: 'skip' }, // Platzhalter (ungenutzt)

  // Sonstiges
  { key: 'omega3',    label: 'Omega-3 (EPA+DHA/ALA)', unit: 'mg', group: 'other' },
].filter(n => n.group !== 'skip');

export const NUTRIENT_BY_KEY = Object.fromEntries(NUTRIENTS.map(n => [n.key, n]));

// --- Persönliches Profil & Zielwerte ----------------------------------------
// Berechnet für: 26 J, männlich, 181 cm, 93 kg, 5x Training/Woche,
// Ziel Recomp (Fettabbau + Muskelaufbau). Mifflin-St Jeor BMR ~1936 kcal,
// TDEE ~3000 kcal, moderates Defizit -> 2400 kcal.
export const DEFAULT_PROFILE = {
  name: '',
  sex: 'm',
  age: 26,
  height: 181,
  weight: 93,
  activity: 'high',      // 5 Einheiten/Woche
  goal: 'recomp',        // Fettabbau + Muskelaufbau
  diet: 'omnivore',
  targets: {
    // Makros
    kcal: 2400, protein: 190, carbs: 230, fat: 80, fiber: 35,
    sugar: 50, satfat: 25,
    // Vitamine (DGE/DACH-nahe Referenzwerte, Mann ~26 J.)
    vitA: 900, vitC: 110, vitD: 20, vitE: 15, vitK: 70,
    vitB1: 1.2, vitB2: 1.4, vitB3: 15, vitB5: 5, vitB6: 1.6,
    vitB7: 40, vitB9: 300, vitB12: 4,
    // Mineralstoffe
    calcium: 1000, iron: 10, magnesium: 350, zinc: 11, potassium: 4000,
    sodium: 2300, phosphorus: 700, selenium: 70, copper: 1.3,
    manganese: 3, iodine: 200,
    // Sonstiges
    omega3: 1000,
  },
  water: 3500, // ml
};

// --- Supplemente (Start-Checkliste) -----------------------------------------
export const DEFAULT_SUPPLEMENTS = [
  { id: 'creatine',    name: 'Creatin',      dose: '5 g' },
  { id: 'vitd3',       name: 'Vitamin D3',   dose: '' },
  { id: 'vitk2',       name: 'Vitamin K2',   dose: '' },
  { id: 'magnesium',   name: 'Magnesium',    dose: '' },
  { id: 'ashwagandha', name: 'Ashwagandha',  dose: '' },
  { id: 'shilajit',    name: 'Shilajit',     dose: '' },
];

// --- Hilfsfunktion: leeres Nährstoffobjekt ----------------------------------
function n(values) {
  const base = {};
  for (const nut of NUTRIENTS) base[nut.key] = 0;
  return Object.assign(base, values);
}

// --- Start-Lebensmittelbibliothek (nur Obst & Gemüse) -----------------------
// Werte pro 100 g. Alles andere (Protein, Getreide, Milch, Nüsse …) legt der
// Nutzer selbst an. servings/piece = schnelle Portionsgrößen.
export const SEED_FOODS = [
  { id: 'sweet_potato', name: 'Süßkartoffel (gegart)', cat: 'Gemüse',
    piece: { g: 150, def: 1, name: 'Süßkartoffel' },
    per100: n({ kcal:90, protein:2, carbs:21, fat:0.1, fiber:3.3, vitA:960, vitC:20, potassium:475, manganese:0.5, vitB6:0.3 }) },

  { id: 'potato', name: 'Kartoffel (gegart)', cat: 'Gemüse',
    piece: { g: 150, def: 1, name: 'Kartoffel' },
    per100: n({ kcal:87, protein:2, carbs:20, fat:0.1, fiber:1.8, vitC:13, potassium:379, vitB6:0.3, magnesium:22 }) },

  { id: 'broccoli', name: 'Brokkoli (gegart)', cat: 'Gemüse',
    per100: n({ kcal:35, protein:2.4, carbs:7, fat:0.4, fiber:3.3, vitC:65, vitK:140, vitB9:108, vitA:77, potassium:293, calcium:40 }) },

  { id: 'spinach', name: 'Spinat (roh)', cat: 'Gemüse',
    per100: n({ kcal:23, protein:2.9, carbs:3.6, fat:0.4, fiber:2.2, vitK:483, vitA:469, vitB9:194, iron:2.7, magnesium:79, vitC:28, potassium:558, calcium:99, manganese:0.9 }) },

  { id: 'carrot', name: 'Karotte', cat: 'Gemüse',
    piece: { g: 65, def: 1, name: 'Karotte' },
    per100: n({ kcal:41, protein:0.9, carbs:10, fat:0.2, fiber:2.8, vitA:835, vitK:13, potassium:320, vitC:5.9 }) },

  { id: 'bell_pepper', name: 'Paprika (rot)', cat: 'Gemüse',
    piece: { g: 120, def: 1, name: 'Paprika' },
    per100: n({ kcal:31, protein:1, carbs:6, fat:0.3, fiber:2.1, vitC:128, vitA:157, vitB6:0.3, vitB9:46, vitE:1.6 }) },

  { id: 'tomato', name: 'Tomate', cat: 'Gemüse',
    piece: { g: 120, def: 1, name: 'Tomate' },
    per100: n({ kcal:18, protein:0.9, carbs:3.9, fat:0.2, fiber:1.2, vitC:14, vitA:42, potassium:237, vitK:7.9, vitB9:15 }) },

  { id: 'onion', name: 'Zwiebel', cat: 'Gemüse',
    piece: { g: 110, def: 1, name: 'Zwiebel' },
    per100: n({ kcal:40, protein:1.1, carbs:9, fat:0.1, fiber:1.7, vitC:7.4, vitB6:0.12, vitB9:19 }) },

  { id: 'banana', name: 'Banane', cat: 'Obst',
    piece: { g: 120, def: 1, name: 'Banane' },
    per100: n({ kcal:89, protein:1.1, carbs:23, fat:0.3, fiber:2.6, sugar:12, potassium:358, vitB6:0.4, vitC:8.7, magnesium:27 }) },

  { id: 'apple', name: 'Apfel', cat: 'Obst',
    piece: { g: 180, def: 1, name: 'Apfel' },
    per100: n({ kcal:52, protein:0.3, carbs:14, fat:0.2, fiber:2.4, sugar:10, vitC:4.6, potassium:107 }) },

  { id: 'kiwi', name: 'Kiwi', cat: 'Obst',
    piece: { g: 75, def: 2, name: 'Kiwi' },
    per100: n({ kcal:61, protein:1.1, carbs:15, fat:0.5, fiber:3, sugar:9, vitC:93, vitK:40, vitE:1.5, potassium:312, vitB9:25, calcium:34, magnesium:17 }) },

  { id: 'blueberries', name: 'Heidelbeeren', cat: 'Obst',
    servings: [{ label: 'Portion (100 g)', grams: 100 }],
    per100: n({ kcal:57, protein:0.7, carbs:14, fat:0.3, fiber:2.4, sugar:10, vitC:9.7, vitK:19, manganese:0.3 }) },

  { id: 'orange', name: 'Orange', cat: 'Obst',
    piece: { g: 130, def: 1, name: 'Orange' },
    per100: n({ kcal:47, protein:0.9, carbs:12, fat:0.1, fiber:2.4, sugar:9, vitC:53, vitB9:30, potassium:181, calcium:40, vitB1:0.09 }) },

  { id: 'avocado', name: 'Avocado', cat: 'Obst',
    servings: [{ label: '1/2 Avocado (70 g)', grams: 70 }],
    per100: n({ kcal:160, protein:2, carbs:9, fat:15, satfat:2.1, fiber:6.7, potassium:485, vitK:21, vitB9:81, vitE:2.1, vitC:10, magnesium:29 }) },

];
