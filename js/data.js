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

// --- Start-Lebensmittelbibliothek (Fokus: unverarbeitete Basics) ------------
// Werte pro 100 g. servings = schnelle Portionsgrößen.
export const SEED_FOODS = [
  { id: 'chicken_breast', name: 'Hähnchenbrust (gegart)', cat: 'Protein',
    servings: [{ label: '1 Filet (150 g)', grams: 150 }],
    per100: n({ kcal:165, protein:31, carbs:0, fat:3.6, satfat:1, sodium:74, potassium:256, phosphorus:210, selenium:24, vitB3:13.7, vitB6:0.6, zinc:1, magnesium:29 }) },

  { id: 'egg', name: 'Ei (ganz)', cat: 'Protein',
    piece: { g: 50, def: 3, name: 'Ei' },
    per100: n({ kcal:143, protein:13, carbs:0.7, fat:10, satfat:3.1, vitA:160, vitD:2, vitB12:0.9, vitB2:0.5, vitB5:1.5, selenium:30, vitB9:47, phosphorus:198, iron:1.8, zinc:1.3, iodine:24 }) },

  { id: 'salmon', name: 'Lachs (gegart)', cat: 'Fisch',
    servings: [{ label: '1 Filet (150 g)', grams: 150 }],
    per100: n({ kcal:206, protein:22, carbs:0, fat:13, satfat:3.1, vitD:11, omega3:2200, vitB12:3, selenium:36, vitB3:8, potassium:384, phosphorus:252, vitB6:0.6 }) },

  { id: 'mackerel', name: 'Makrele (gegart)', cat: 'Fisch',
    per100: n({ kcal:262, protein:24, carbs:0, fat:18, satfat:4.2, vitD:16, vitB12:16, omega3:2600, selenium:44, vitB3:9, phosphorus:236 }) },

  { id: 'sardines', name: 'Sardinen (in Öl, abgetropft)', cat: 'Fisch',
    per100: n({ kcal:208, protein:25, carbs:0, fat:11, satfat:1.5, calcium:382, vitD:4.8, vitB12:8.9, omega3:1400, selenium:52, phosphorus:490, iron:2.9 }) },

  { id: 'tuna_can', name: 'Thunfisch (in Wasser)', cat: 'Fisch',
    per100: n({ kcal:116, protein:26, carbs:0, fat:0.8, sodium:247, selenium:80, vitB12:2.5, vitB3:13, vitD:2, omega3:270, phosphorus:200 }) },

  { id: 'cod', name: 'Kabeljau (gegart)', cat: 'Fisch',
    per100: n({ kcal:105, protein:23, carbs:0, fat:0.9, vitB12:1, selenium:37, iodine:110, phosphorus:200, potassium:440, vitB6:0.4 }) },

  { id: 'beef_lean', name: 'Rinderhack (mager, gegart)', cat: 'Protein',
    per100: n({ kcal:176, protein:20, carbs:0, fat:10, satfat:4, vitB12:2.4, zinc:5.4, iron:2.4, selenium:20, vitB3:5, vitB6:0.4, phosphorus:190, potassium:290 }) },

  { id: 'beef_liver', name: 'Rinderleber (gegart)', cat: 'Protein',
    servings: [{ label: 'Portion (100 g)', grams: 100 }],
    per100: n({ kcal:175, protein:26, carbs:5, fat:5, vitA:9440, vitB12:70, copper:12, vitB9:260, iron:5.5, vitB2:3.4, selenium:40, zinc:4, vitB3:15, vitB6:1 }) },

  { id: 'chicken_thigh', name: 'Hähnchenschenkel (gegart)', cat: 'Protein',
    per100: n({ kcal:209, protein:26, carbs:0, fat:11, satfat:3, zinc:2.5, vitB3:6, selenium:22, vitB6:0.35, phosphorus:180, potassium:230 }) },

  { id: 'greek_yogurt', name: 'Griechischer Joghurt (2%)', cat: 'Milchprodukte',
    servings: [{ label: 'Becher (150 g)', grams: 150 }],
    per100: n({ kcal:73, protein:10, carbs:4, fat:2, satfat:1.3, calcium:115, vitB12:0.5, phosphorus:135, potassium:141, vitB2:0.3, iodine:30 }) },

  { id: 'cottage_cheese', name: 'Hüttenkäse (mager)', cat: 'Milchprodukte',
    per100: n({ kcal:72, protein:12, carbs:3, fat:1, calcium:61, vitB12:0.4, phosphorus:140, selenium:9, sodium:330 }) },

  { id: 'milk', name: 'Vollmilch', cat: 'Milchprodukte',
    servings: [{ label: 'Glas (250 ml)', grams: 250 }],
    per100: n({ kcal:61, protein:3.2, carbs:4.8, fat:3.3, satfat:1.9, calcium:113, vitB12:0.5, vitD:1, phosphorus:84, vitB2:0.2, potassium:132, iodine:20 }) },

  { id: 'kefir', name: 'Kefir (natur)', cat: 'Milchprodukte',
    per100: n({ kcal:41, protein:3.3, carbs:4.5, fat:1, calcium:120, vitB12:0.4, vitD:1, phosphorus:100 }) },

  { id: 'oats', name: 'Haferflocken (trocken)', cat: 'Getreide',
    servings: [{ label: 'Portion (60 g)', grams: 60 }],
    per100: n({ kcal:389, protein:17, carbs:66, fat:7, fiber:10, satfat:1.2, magnesium:177, iron:4.7, zinc:4, manganese:4.9, phosphorus:523, vitB1:0.7, potassium:429 }) },

  { id: 'brown_rice', name: 'Vollkornreis (gegart)', cat: 'Getreide',
    servings: [{ label: 'Portion (150 g)', grams: 150 }],
    per100: n({ kcal:123, protein:2.7, carbs:26, fat:1, fiber:1.6, magnesium:39, manganese:1.1, selenium:10, vitB3:1.5, phosphorus:103 }) },

  { id: 'quinoa', name: 'Quinoa (gegart)', cat: 'Getreide',
    per100: n({ kcal:120, protein:4.4, carbs:21, fat:1.9, fiber:2.8, magnesium:64, manganese:0.6, vitB9:42, iron:1.5, phosphorus:152, zinc:1.1 }) },

  { id: 'ww_bread', name: 'Vollkornbrot', cat: 'Getreide',
    servings: [{ label: '1 Scheibe (45 g)', grams: 45 }],
    per100: n({ kcal:247, protein:13, carbs:41, fat:3.4, fiber:7, magnesium:76, iron:2.5, vitB3:4, manganese:2, selenium:28, vitB9:42, zinc:1.8, sodium:450 }) },

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

  { id: 'lentils', name: 'Linsen (gegart)', cat: 'Hülsenfrüchte',
    servings: [{ label: 'Portion (150 g)', grams: 150 }],
    per100: n({ kcal:116, protein:9, carbs:20, fat:0.4, fiber:7.9, vitB9:181, iron:3.3, manganese:0.5, potassium:369, phosphorus:180, zinc:1.3, magnesium:36, vitB1:0.17 }) },

  { id: 'kidney_beans', name: 'Kidneybohnen (gegart)', cat: 'Hülsenfrüchte',
    per100: n({ kcal:127, protein:8.7, carbs:23, fat:0.5, fiber:6.4, vitB9:130, iron:2.9, potassium:405, magnesium:45, manganese:0.5, phosphorus:140, zinc:1 }) },

  { id: 'almonds', name: 'Mandeln', cat: 'Nüsse & Samen',
    servings: [{ label: 'Handvoll (30 g)', grams: 30 }],
    per100: n({ kcal:579, protein:21, carbs:22, fat:50, satfat:3.8, fiber:12.5, vitE:25.6, magnesium:270, calcium:269, manganese:2.2, vitB2:1.1, phosphorus:481, zinc:3.1, potassium:733, iron:3.7 }) },

  { id: 'walnuts', name: 'Walnüsse', cat: 'Nüsse & Samen',
    servings: [{ label: 'Handvoll (30 g)', grams: 30 }],
    per100: n({ kcal:654, protein:15, carbs:14, fat:65, satfat:6.1, fiber:6.7, omega3:9000, manganese:3.4, magnesium:158, copper:1.6, phosphorus:346 }) },

  { id: 'pumpkin_seeds', name: 'Kürbiskerne', cat: 'Nüsse & Samen',
    servings: [{ label: 'Handvoll (30 g)', grams: 30 }],
    per100: n({ kcal:559, protein:30, carbs:11, fat:49, satfat:8.7, fiber:6, magnesium:592, zinc:7.6, iron:8.8, manganese:4.5, phosphorus:1233, potassium:809, copper:1.3 }) },

  { id: 'chia', name: 'Chiasamen', cat: 'Nüsse & Samen',
    servings: [{ label: 'EL (15 g)', grams: 15 }],
    per100: n({ kcal:486, protein:17, carbs:42, fat:31, satfat:3.3, fiber:34, omega3:17800, calcium:631, magnesium:335, phosphorus:860, iron:7.7, zinc:4.6, manganese:2.7 }) },

  { id: 'peanut_butter', name: 'Erdnussbutter (natur)', cat: 'Nüsse & Samen',
    servings: [{ label: 'EL (16 g)', grams: 16 }],
    per100: n({ kcal:588, protein:25, carbs:20, fat:50, satfat:10, fiber:6, vitE:9, magnesium:154, vitB3:13, manganese:1.5, potassium:649, zinc:2.9, phosphorus:335 }) },

  { id: 'olive_oil', name: 'Olivenöl', cat: 'Fette & Öle',
    servings: [{ label: 'EL (14 g)', grams: 14 }],
    per100: n({ kcal:884, protein:0, carbs:0, fat:100, satfat:14, vitE:14, vitK:60 }) },
];
