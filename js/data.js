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

// --- Was bringt dir der Nährstoff? (für das ⓘ-Infopünktchen) ----------------
export const NUTRIENT_INFO = {
  kcal:    'Energie für Training & Alltag. Zu viel = Fettaufbau, zu wenig = Muskelverlust.',
  protein: 'Baustoff für Muskelaufbau & -erhalt. Hält satt. Dein wichtigster Makro beim Recomp.',
  carbs:   'Haupt-Treibstoff für intensives Training, Sprints & Basketball. Füllt die Glykogenspeicher.',
  fat:     'Nötig für Hormone (u.a. Testosteron) und die Aufnahme der Vitamine A, D, E, K.',
  fiber:   'Darmgesundheit, lange Sättigung, stabiler Blutzucker (weniger Heißhunger).',
  sugar:   'Schnelle Energie – in Maßen, am besten rund ums Training.',
  satfat:  'Gesättigtes Fett in Maßen halten (Herz-Kreislauf).',
  vitA:    'Augen, Haut, Immunsystem und Zellwachstum.',
  vitC:    'Immunsystem, Kollagen für Sehnen/Haut (wichtig fürs Knie!), bessere Eisenaufnahme, Antioxidans.',
  vitD:    'Kraft, Testosteron, Knochen & Immunsystem. Kaum übers Essen – dein D3-Supp deckt das.',
  vitE:    'Starkes Antioxidans: schützt Zellen & unterstützt die Regeneration.',
  vitK:    'Blutgerinnung und Knochengesundheit (arbeitet mit Vitamin D/K2 zusammen).',
  vitB1:   'Verwertung von Kohlenhydraten zu Energie, Nervenfunktion.',
  vitB2:   'Energieproduktion in den Zellen, Haut & Augen.',
  vitB3:   'Energiestoffwechsel, Haut, Nervensystem.',
  vitB5:   'Energiegewinnung und Hormonbildung.',
  vitB6:   'Protein-Stoffwechsel (wichtig bei viel Eiweiß), Nerven & Stimmung.',
  vitB7:   'Biotin: Haare, Haut, Nägel und Stoffwechsel.',
  vitB9:   'Folat: Zellteilung & Blutbildung – wichtig bei hartem Training.',
  vitB12:  'Energie, Blutbildung & Nervensystem. Kommt fast nur aus Tier/Supp.',
  calcium: 'Knochen & Muskelkontraktion. Wichtig bei viel Belastung.',
  iron:    'Sauerstofftransport im Blut → Ausdauer & Energie. Mangel macht müde.',
  magnesium:'Muskelfunktion, besserer Schlaf & Regeneration, weniger Krämpfe.',
  zinc:    'Testosteron, Immunsystem & Wundheilung/Regeneration.',
  potassium:'Muskel- & Nervenfunktion, reguliert den Blutdruck.',
  sodium:  'Flüssigkeitshaushalt & Leistung – nicht übertreiben.',
  phosphorus:'Knochen und Energiewährung der Zellen (ATP).',
  selenium:'Antioxidans, Schilddrüse & Immunsystem (1–2 Paranüsse decken den Tag).',
  copper:  'Hilft dem Körper, Eisen zu verwerten; Bindegewebe.',
  manganese:'Knochen, Stoffwechsel & Antioxidans-Schutz.',
  iodine:  'Treibstoff der Schilddrüse → steuert deinen Stoffwechsel & Energie.',
  omega3:  'Entzündungshemmend: gut für Gelenke, Herz & Regeneration nach dem Training.',
};

// --- Persönliches Profil & Zielwerte ----------------------------------------
// Berechnet für: 26 J, männlich, 181 cm, 93 kg, 5x Training/Woche,
// Ziel Recomp (Fettabbau + Muskelaufbau). Mifflin-St Jeor BMR ~1936 kcal,
// TDEE ~3000 kcal, moderates Defizit -> 2400 kcal.
export const DEFAULT_PROFILE = {
  name: '',
  sex: 'm',
  age: 26,
  height: 180,
  weight: 95,
  activity: 'high',      // Gym + Basketball + athletisches Training
  goal: 'recomp',        // Fettabbau + Muskelaufbau, All-Around-Athlet
  diet: 'omnivore',
  targets: {
    // Makros (athletischer Recomp: Protein 2,2 g/kg, Carbs als Trainings-Fuel)
    kcal: 2450, protein: 210, carbs: 210, fat: 85, fiber: 35,
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
  water: 3500,        // ml
  targetWeight: 84,   // Zielgewicht (kg) – Fettabbau-Ziel, editierbar
  targetBodyfat: 15,  // Ziel-Körperfett % (Stretch: 12 %)
  photo: null,        // Profilfoto (Data-URL) für den Tages-Ring
};

// --- Körperanalyse-Metriken (InBody & Co.) ----------------------------------
// better: 'up' = höher ist besser (Muskel), 'down' = niedriger ist besser (Fett),
// 'neutral' = keine Wertung
export const BODYCOMP_METRICS = [
  { key: 'weight',      label: 'Gewicht',              unit: 'kg',    better: 'down' },
  { key: 'bmi',         label: 'BMI',                  unit: 'kg/m²', better: 'down' },
  { key: 'bodyfat',     label: 'Körperfett',           unit: '%',     better: 'down' },
  { key: 'fatmass',     label: 'Fettmasse',            unit: 'kg',    better: 'down' },
  { key: 'fmi',         label: 'Fett-Masse-Index',     unit: 'kg/m²', better: 'down' },
  { key: 'muscle',      label: 'Skelettmuskelmasse',   unit: 'kg',    better: 'up' },
  { key: 'musclePct',   label: 'Skelettmuskel %',      unit: '%',     better: 'up' },
  { key: 'muscleTrunk', label: 'Muskeln Rumpf',        unit: 'kg',    better: 'up' },
  { key: 'muscleArmL',  label: 'Muskeln Arm links',    unit: 'kg',    better: 'up' },
  { key: 'muscleArmR',  label: 'Muskeln Arm rechts',   unit: 'kg',    better: 'up' },
  { key: 'muscleLegL',  label: 'Muskeln Bein links',   unit: 'kg',    better: 'up' },
  { key: 'muscleLegR',  label: 'Muskeln Bein rechts',  unit: 'kg',    better: 'up' },
  { key: 'water',       label: 'Körperwasser',         unit: '%',     better: 'up' },
  { key: 'waterL',      label: 'Körperwasser',         unit: 'l',     better: 'up' },
  { key: 'ecwPct',      label: 'Extrazell. Wasser',    unit: '%',     better: 'neutral' },
  { key: 'ecwL',        label: 'Extrazell. Wasser',    unit: 'l',     better: 'neutral' },
  { key: 'phase',       label: 'Phasenwinkel',         unit: '°',     better: 'up' },
  { key: 'visceral',    label: 'Viszeralfett',         unit: 'Level', better: 'down' },
  { key: 'bmr',         label: 'Grundumsatz',          unit: 'kcal',  better: 'up' },
];

// --- Start-Körpermessung (InBody, 22.08.2026) -------------------------------
export const DEFAULT_MEASUREMENTS = [
  { date: '2026-08-22', note: 'InBody-Startmessung (Gym)', values: {
    weight: 94.6, bmi: 28.7, bodyfat: 24.7, fatmass: 23.1, fmi: 7.1,
    muscle: 34.8, musclePct: 37.2, muscleTrunk: 16.1,
    muscleArmL: 2.3, muscleArmR: 2.3, muscleLegL: 7.1, muscleLegR: 7.0,
    water: 54, waterL: 51.4, ecwPct: 40.5, ecwL: 20.8, phase: 6,
  } },
];

// --- Supplemente (Start-Checkliste) -----------------------------------------
// Empfohlener Athleten-Stack. `nutrients` = Nährwerte pro Dosis; werden in die
// Tagesbilanz eingerechnet, sobald das Supplement abgehakt ist.
// time: 'morgens' | 'mittags' | 'pre' (ums Training) | 'abends' | 'egal'
// takeWith: konkreter Umsetzungs-Tipp (womit nehmen)
export const DEFAULT_SUPPLEMENTS = [
  { id: 'vitd3',       name: 'Vitamin D3',         dose: '3000 IU', time: 'morgens',
    takeWith: 'Mit etwas Fett – z.B. Eier, Avocado, Nüsse oder Olivenöl.', nutrients: { vitD: 75 } },
  { id: 'vitk2',       name: 'Vitamin K2 (MK-7)',  dose: '100 µg', time: 'morgens',
    takeWith: 'Zusammen mit D3 (beide fettlöslich – gleiche Mahlzeit).', nutrients: { vitK: 100 } },
  { id: 'vitb12',      name: 'Vitamin B12',        dose: '500 µg', time: 'morgens',
    takeWith: 'Morgens, nüchtern oder zum Frühstück.', nutrients: { vitB12: 500 } },
  { id: 'iodine',      name: 'Jod',                dose: '150 µg', time: 'morgens',
    takeWith: 'Zum Frühstück (oder jodiertes Salz übers Essen).', nutrients: { iodine: 150 } },
  { id: 'omega3',      name: 'Omega-3 (EPA+DHA)',  dose: '2 g', time: 'mittags',
    takeWith: 'Zu einer fetthaltigen Mahlzeit (bessere Aufnahme, kein Aufstoßen).', nutrients: { omega3: 2000 } },
  { id: 'creatine',    name: 'Creatin Monohydrat', dose: '5 g', time: 'egal',
    takeWith: 'Timing egal – Hauptsache jeden Tag. Z.B. in den Shake.' },
  { id: 'betaalanin',  name: 'Beta-Alanin',        dose: '4 g', time: 'pre',
    takeWith: 'Vor dem Training (leichtes Kribbeln ist harmlos).' },
  { id: 'whey',        name: 'Whey Protein',       dose: '1–2 Scoops', time: 'pre',
    takeWith: 'Nach dem Training oder als Snack, um das Protein-Ziel zu treffen.' },
  { id: 'magnesium',   name: 'Magnesium (Glycinat)', dose: '350 mg', time: 'abends',
    takeWith: 'Abends vor dem Schlaf – entspannt Muskeln & fördert den Schlaf.', nutrients: { magnesium: 350 } },
  { id: 'ashwagandha', name: 'Ashwagandha',        dose: '600 mg', time: 'abends',
    takeWith: 'Abends zum Essen – für Stress-Abbau & besseren Schlaf.' },
];

export const SUPP_TIME_LABELS = {
  morgens: '🌅 Morgens', mittags: '☀️ Mittags', pre: '🏋️ Ums Training',
  abends: '🌙 Abends', egal: '🕐 Egal wann',
};
export const SUPP_TIME_ORDER = ['morgens', 'mittags', 'pre', 'abends', 'egal'];

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

  // --- Athleten-Basics (Protein / schwer erreichbare Mikros) ---
  { id: 'egg', name: 'Ei (ganz)', cat: 'Protein',
    piece: { g: 50, def: 3, name: 'Ei' },
    per100: n({ kcal:143, protein:13, carbs:0.7, fat:10, satfat:3.1, vitA:160, vitD:2, vitB12:0.9, vitB2:0.5, vitB5:1.5, vitB7:22, selenium:30, vitB9:47, phosphorus:198, iron:1.8, zinc:1.3, iodine:24 }) },

  { id: 'magerquark', name: 'Magerquark / Skyr', cat: 'Protein',
    servings: [{ label: 'Becher (250 g)', grams: 250 }],
    per100: n({ kcal:67, protein:12, carbs:4, fat:0.3, calcium:90, vitB12:0.8, vitB2:0.3, phosphorus:140, potassium:95, selenium:10, iodine:8 }) },

  { id: 'whey', name: 'Whey Protein (Pulver)', cat: 'Protein',
    piece: { g: 30, def: 1, name: 'Scoop' },
    per100: n({ kcal:380, protein:80, carbs:8, fat:6, satfat:2, calcium:300, potassium:500, magnesium:40, phosphorus:200, vitB12:1 }) },

  { id: 'chicken_breast', name: 'Hähnchenbrust (gegart)', cat: 'Protein',
    servings: [{ label: '1 Filet (150 g)', grams: 150 }],
    per100: n({ kcal:165, protein:31, carbs:0, fat:3.6, satfat:1, sodium:74, potassium:256, phosphorus:210, selenium:24, vitB3:13.7, vitB6:0.6, zinc:1, magnesium:29 }) },

  { id: 'beef_lean', name: 'Rinderhack (mager, gegart)', cat: 'Protein',
    servings: [{ label: 'Portion (150 g)', grams: 150 }],
    per100: n({ kcal:176, protein:20, carbs:0, fat:10, satfat:4, vitB12:2.4, zinc:5.4, iron:2.4, selenium:20, vitB3:5, vitB6:0.4, phosphorus:190, potassium:290 }) },

  { id: 'beef_liver', name: 'Rinderleber (gegart)', cat: 'Protein',
    servings: [{ label: 'Portion (100 g)', grams: 100 }],
    per100: n({ kcal:175, protein:26, carbs:5, fat:5, vitA:9440, vitB12:70, copper:12, vitB9:260, iron:5.5, vitB2:3.4, selenium:40, zinc:4, vitB3:15, vitB6:1 }) },

  { id: 'salmon', name: 'Lachs (gegart)', cat: 'Fisch',
    servings: [{ label: '1 Filet (150 g)', grams: 150 }],
    per100: n({ kcal:206, protein:22, carbs:0, fat:13, satfat:3.1, vitD:11, omega3:2200, vitB12:3, selenium:36, vitB3:8, potassium:384, phosphorus:252, vitB6:0.6, iodine:20 }) },

  { id: 'sardines', name: 'Sardinen (in Öl, abgetropft)', cat: 'Fisch',
    servings: [{ label: 'Dose (100 g)', grams: 100 }],
    per100: n({ kcal:208, protein:25, carbs:0, fat:11, satfat:1.5, calcium:382, vitD:4.8, vitB12:8.9, omega3:1400, selenium:52, phosphorus:490, iron:2.9, iodine:35 }) },

  { id: 'greek_yogurt', name: 'Griechischer Joghurt (2%)', cat: 'Milchprodukte',
    servings: [{ label: 'Becher (150 g)', grams: 150 }],
    per100: n({ kcal:73, protein:10, carbs:4, fat:2, satfat:1.3, calcium:115, vitB12:0.5, phosphorus:135, potassium:141, vitB2:0.3, iodine:30 }) },

  { id: 'oats', name: 'Haferflocken (trocken)', cat: 'Getreide',
    servings: [{ label: 'Portion (60 g)', grams: 60 }],
    per100: n({ kcal:389, protein:17, carbs:66, fat:7, fiber:10, satfat:1.2, magnesium:177, iron:4.7, zinc:4, manganese:4.9, phosphorus:523, vitB1:0.7, potassium:429 }) },

  { id: 'lentils', name: 'Linsen (gegart)', cat: 'Hülsenfrüchte',
    servings: [{ label: 'Portion (150 g)', grams: 150 }],
    per100: n({ kcal:116, protein:9, carbs:20, fat:0.4, fiber:7.9, vitB9:181, iron:3.3, manganese:0.5, potassium:369, phosphorus:180, zinc:1.3, magnesium:36, vitB1:0.17 }) },

  { id: 'almonds', name: 'Mandeln', cat: 'Nüsse & Samen',
    servings: [{ label: 'Handvoll (30 g)', grams: 30 }],
    per100: n({ kcal:579, protein:21, carbs:22, fat:50, satfat:3.8, fiber:12.5, vitE:25.6, magnesium:270, calcium:269, manganese:2.2, vitB2:1.1, phosphorus:481, zinc:3.1, potassium:733, iron:3.7 }) },

  { id: 'pumpkin_seeds', name: 'Kürbiskerne', cat: 'Nüsse & Samen',
    servings: [{ label: 'Handvoll (30 g)', grams: 30 }],
    per100: n({ kcal:559, protein:30, carbs:11, fat:49, satfat:8.7, fiber:6, magnesium:592, zinc:7.6, iron:8.8, manganese:4.5, phosphorus:1233, potassium:809, copper:1.3 }) },

  { id: 'walnuts', name: 'Walnüsse', cat: 'Nüsse & Samen',
    servings: [{ label: 'Handvoll (20 g)', grams: 20 }],
    per100: n({ kcal:654, protein:15, carbs:14, fat:65, satfat:6.1, fiber:6.7, omega3:9000, manganese:3.4, magnesium:158, copper:1.6, phosphorus:346, vitB6:0.5 }) },

  // --- Abwechslung / Fallback (vom Nutzer bestätigt) ---
  { id: 'tuna_can', name: 'Thunfisch (in Wasser)', cat: 'Fisch',
    servings: [{ label: 'Dose (120 g)', grams: 120 }],
    per100: n({ kcal:116, protein:26, carbs:0, fat:0.8, sodium:247, selenium:80, vitB12:2.5, vitB3:13, vitD:2, omega3:270, phosphorus:200, iodine:12 }) },

  { id: 'chicken_thigh', name: 'Hähnchenschenkel (gegart)', cat: 'Protein',
    servings: [{ label: 'Portion (150 g)', grams: 150 }],
    per100: n({ kcal:209, protein:26, carbs:0, fat:11, satfat:3, zinc:2.5, vitB3:6, selenium:22, vitB6:0.35, phosphorus:180, potassium:230 }) },

  { id: 'tofu', name: 'Tofu (fest)', cat: 'Protein',
    servings: [{ label: 'Portion (150 g)', grams: 150 }],
    per100: n({ kcal:144, protein:17, carbs:3, fat:9, satfat:1.3, calcium:350, iron:2.7, magnesium:58, manganese:1.2, selenium:9, zinc:1.6, phosphorus:190 }) },

  { id: 'chickpeas', name: 'Kichererbsen (gegart)', cat: 'Hülsenfrüchte',
    servings: [{ label: 'Portion (150 g)', grams: 150 }],
    per100: n({ kcal:164, protein:8.9, carbs:27, fat:2.6, fiber:7.6, vitB9:172, iron:2.9, magnesium:48, zinc:1.5, copper:0.35, manganese:1, phosphorus:168, potassium:291 }) },

  { id: 'kidney_beans', name: 'Kidneybohnen (gegart)', cat: 'Hülsenfrüchte',
    servings: [{ label: 'Portion (150 g)', grams: 150 }],
    per100: n({ kcal:127, protein:8.7, carbs:23, fat:0.5, fiber:6.4, vitB9:130, iron:2.9, potassium:405, magnesium:45, manganese:0.5, phosphorus:140, zinc:1, copper:0.24 }) },

  { id: 'cheese_gouda', name: 'Käse (Gouda/Emmentaler)', cat: 'Milchprodukte',
    servings: [{ label: '2 Scheiben (60 g)', grams: 60 }],
    per100: n({ kcal:356, protein:25, carbs:2, fat:27, satfat:18, calcium:700, vitB12:1.5, vitA:165, zinc:3.9, phosphorus:520, selenium:15, sodium:820, iodine:40 }) },

  { id: 'milk', name: 'Milch', cat: 'Milchprodukte',
    servings: [{ label: 'Glas (250 ml)', grams: 250 }],
    per100: n({ kcal:61, protein:3.2, carbs:4.8, fat:3.3, satfat:1.9, calcium:113, vitB12:0.5, vitD:1, phosphorus:84, vitB2:0.2, potassium:132, iodine:20 }) },

  { id: 'kefir', name: 'Kefir', cat: 'Milchprodukte',
    servings: [{ label: 'Glas (250 ml)', grams: 250 }],
    per100: n({ kcal:41, protein:3.3, carbs:4.5, fat:1, calcium:120, vitB12:0.4, vitD:1, phosphorus:100, iodine:15 }) },

  { id: 'cottage_cheese', name: 'Körniger Frischkäse', cat: 'Milchprodukte',
    servings: [{ label: 'Becher (200 g)', grams: 200 }],
    per100: n({ kcal:98, protein:11, carbs:3.4, fat:4.3, calcium:83, vitB12:0.4, vitB2:0.16, phosphorus:160, selenium:9, sodium:330 }) },

  { id: 'kale', name: 'Grünkohl', cat: 'Gemüse',
    servings: [{ label: 'Portion (100 g)', grams: 100 }],
    per100: n({ kcal:49, protein:4.3, carbs:9, fat:0.9, fiber:3.6, vitK:390, vitC:120, vitA:500, calcium:150, vitB9:141, potassium:491, manganese:0.7, vitB6:0.3 }) },

  { id: 'feldsalat', name: 'Feldsalat', cat: 'Gemüse',
    servings: [{ label: 'Portion (60 g)', grams: 60 }],
    per100: n({ kcal:21, protein:2, carbs:3.6, fat:0.4, fiber:1.5, vitC:38, vitA:140, vitB9:145, iron:2, potassium:459, vitK:80 }) },

  { id: 'peas', name: 'Erbsen (TK, gegart)', cat: 'Gemüse',
    servings: [{ label: 'Portion (150 g)', grams: 150 }],
    per100: n({ kcal:84, protein:5.4, carbs:16, fat:0.2, fiber:5.5, vitC:14, vitK:25, vitB1:0.26, vitB9:65, iron:1.5, manganese:0.5, magnesium:36, potassium:271 }) },

  { id: 'brussels_sprouts', name: 'Rosenkohl (gegart)', cat: 'Gemüse',
    servings: [{ label: 'Portion (100 g)', grams: 100 }],
    per100: n({ kcal:43, protein:3.4, carbs:9, fat:0.3, fiber:3.8, vitC:85, vitK:140, vitB9:60, potassium:317, manganese:0.3 }) },

  { id: 'beetroot', name: 'Rote Bete (gegart)', cat: 'Gemüse',
    servings: [{ label: 'Portion (100 g)', grams: 100 }],
    per100: n({ kcal:44, protein:1.7, carbs:10, fat:0.2, fiber:2, vitB9:80, potassium:305, manganese:0.3, iron:0.8, vitC:3.6 }) },

  { id: 'strawberries', name: 'Erdbeeren', cat: 'Obst',
    servings: [{ label: 'Portion (150 g)', grams: 150 }],
    per100: n({ kcal:32, protein:0.7, carbs:7.7, fat:0.3, fiber:2, sugar:4.9, vitC:59, manganese:0.4, vitB9:24, potassium:153 }) },

  { id: 'raspberries', name: 'Himbeeren', cat: 'Obst',
    servings: [{ label: 'Portion (125 g)', grams: 125 }],
    per100: n({ kcal:52, protein:1.2, carbs:12, fat:0.7, fiber:6.5, sugar:4.4, vitC:26, manganese:0.7, vitK:7.8, magnesium:22 }) },

  { id: 'brazil_nuts', name: 'Paranüsse', cat: 'Nüsse & Samen',
    piece: { g: 5, def: 2, name: 'Paranuss' },
    per100: n({ kcal:659, protein:14, carbs:12, fat:67, satfat:16, fiber:7.5, selenium:1917, magnesium:376, phosphorus:725, copper:1.7, zinc:4, vitB1:0.6, manganese:1.2 }) },

  { id: 'sunflower_seeds', name: 'Sonnenblumenkerne', cat: 'Nüsse & Samen',
    servings: [{ label: 'Handvoll (30 g)', grams: 30 }],
    per100: n({ kcal:584, protein:21, carbs:20, fat:51, satfat:4.5, fiber:8.6, vitE:35, selenium:53, magnesium:325, copper:1.8, vitB1:1.5, vitB6:1.3, vitB9:227, zinc:5, phosphorus:660, manganese:2 }) },

  { id: 'chia', name: 'Chiasamen', cat: 'Nüsse & Samen',
    servings: [{ label: 'EL (15 g)', grams: 15 }],
    per100: n({ kcal:486, protein:17, carbs:42, fat:31, satfat:3.3, fiber:34, omega3:17800, calcium:631, magnesium:335, phosphorus:860, iron:7.7, zinc:4.6, manganese:2.7 }) },

  { id: 'flaxseed', name: 'Leinsamen (geschrotet)', cat: 'Nüsse & Samen',
    servings: [{ label: 'EL (15 g)', grams: 15 }],
    per100: n({ kcal:534, protein:18, carbs:29, fat:42, satfat:3.7, fiber:27, omega3:22800, magnesium:392, manganese:2.5, vitB1:1.6, copper:1.2, phosphorus:642, potassium:813 }) },

  // --- Snack-Zutaten ---
  { id: 'watermelon', name: 'Wassermelone', cat: 'Obst',
    servings: [{ label: 'Stück (200 g)', grams: 200 }],
    per100: n({ kcal:30, protein:0.6, carbs:8, fat:0.2, fiber:0.4, sugar:6, vitC:8, vitA:28, potassium:112 }) },

  { id: 'feta', name: 'Feta / Schafskäse', cat: 'Milchprodukte',
    servings: [{ label: 'Portion (40 g)', grams: 40 }],
    per100: n({ kcal:264, protein:14, carbs:4, fat:21, satfat:14, calcium:493, sodium:917, vitB12:1.7, phosphorus:337, zinc:2.9 }) },

  { id: 'hummus', name: 'Hummus', cat: 'Hülsenfrüchte',
    servings: [{ label: 'Portion (50 g)', grams: 50 }],
    per100: n({ kcal:166, protein:8, carbs:14, fat:10, satfat:1.4, fiber:6, iron:2.4, vitB9:83, magnesium:71, phosphorus:180, zinc:1.6, copper:0.4 }) },

  { id: 'dates', name: 'Datteln (Medjool)', cat: 'Obst',
    servings: [{ label: '2 Datteln (40 g)', grams: 40 }],
    per100: n({ kcal:277, protein:1.8, carbs:75, fat:0.2, fiber:7, sugar:66, potassium:696, magnesium:54, copper:0.4, manganese:0.3 }) },

  { id: 'rice_cakes', name: 'Reiswaffeln', cat: 'Getreide',
    servings: [{ label: '2 Waffeln (18 g)', grams: 18 }],
    per100: n({ kcal:387, protein:8, carbs:82, fat:2.8, fiber:4, manganese:3, magnesium:60 }) },

  { id: 'dark_choc', name: 'Zartbitter 85%', cat: 'Snacks',
    servings: [{ label: '2 Stück (20 g)', grams: 20 }],
    per100: n({ kcal:600, protein:8, carbs:46, fat:46, satfat:27, fiber:11, iron:8, magnesium:228, copper:1.8, manganese:2, potassium:715 }) },

  { id: 'cucumber', name: 'Gurke', cat: 'Gemüse',
    servings: [{ label: 'Portion (150 g)', grams: 150 }],
    per100: n({ kcal:15, protein:0.7, carbs:3.6, fat:0.1, fiber:0.5, vitK:16, potassium:147, vitC:2.8 }) },

];

// --- Gesunde Snack-Kombinationen (boosten 2 Bereiche auf einmal) -------------
export const SNACKS = [
  { id: 'melon_feta',   name: 'Wassermelone + Feta',        emoji: '🍉',
    items: [{ foodId: 'watermelon', grams: 200 }, { foodId: 'feta', grams: 40 }],
    why: 'Hydration & Vitamin C + Protein, Calcium und Salz – perfekt nach dem Schwitzen.' },
  { id: 'apple_pb',     name: 'Apfel + Erdnussbutter',      emoji: '🍏',
    items: [{ foodId: 'apple', grams: 180 }, { foodId: 'peanut_butter', grams: 16 }],
    why: 'Ballaststoffe & langsame Energie + Protein und gesunde Fette = lange satt.' },
  { id: 'skyr_berry',   name: 'Skyr + Beeren + Walnüsse',   emoji: '🫐',
    items: [{ foodId: 'magerquark', grams: 200 }, { foodId: 'blueberries', grams: 80 }, { foodId: 'walnuts', grams: 15 }],
    why: 'Protein + Antioxidantien + Omega-3 → Muskelaufbau & Regeneration.' },
  { id: 'pepper_cottage', name: 'Paprika + Hüttenkäse',     emoji: '🫑',
    items: [{ foodId: 'bell_pepper', grams: 120 }, { foodId: 'cottage_cheese', grams: 100 }],
    why: 'Vitamin-C-Bombe + Protein & Calcium – knackig und sättigend.' },
  { id: 'orange_brazil', name: 'Orange + Paranüsse',        emoji: '🍊',
    items: [{ foodId: 'orange', grams: 130 }, { foodId: 'brazil_nuts', grams: 10 }],
    why: 'Vitamin C + dein kompletter Selen-Tagesbedarf (2 Nüsse reichen).' },
  { id: 'banana_pb',    name: 'Banane + Erdnussbutter',     emoji: '🍌',
    items: [{ foodId: 'banana', grams: 120 }, { foodId: 'peanut_butter', grams: 16 }],
    why: 'Kalium & schnelle Carbs + Protein → ideal ums Training.' },
  { id: 'carrot_hummus', name: 'Karotten + Hummus',         emoji: '🥕',
    items: [{ foodId: 'carrot', grams: 130 }, { foodId: 'hummus', grams: 50 }],
    why: 'Vitamin A + Protein, Ballaststoffe & Eisen.' },
  { id: 'dates_almonds', name: 'Datteln + Mandeln',         emoji: '🌰',
    items: [{ foodId: 'dates', grams: 40 }, { foodId: 'almonds', grams: 20 }],
    why: 'Schnelle Energie + Magnesium & Vitamin E – guter Pre-Workout-Snack.' },
  { id: 'kiwi_skyr',    name: 'Kiwi + Skyr',                emoji: '🥝',
    items: [{ foodId: 'kiwi', grams: 150 }, { foodId: 'magerquark', grams: 150 }],
    why: 'Vitamin C + Protein für Immunsystem & Muskeln.' },
];

// ============================================================================
// LIFE PLANNER – Tagesstruktur, Training, Gewohnheiten, Ernährungs-Autopilot
// Alles nur Standard-Vorgaben; in der App (Tab „Setup") frei editierbar.
// Wochentag-Index: 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa
// ============================================================================
export const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

// block: { id, time:'HH:MM', title, icon, kind, steps?:[...] }
// kind: wake | routine | meal | work | gym | move | winddown | sleep | custom
function blk(id, time, title, icon, kind, steps) {
  const b = { id, time, title, icon, kind };
  if (steps) b.steps = steps;
  return b;
}

// --- Bausteine ---------------------------------------------------------------
// Tag mit FRÜH-Training (06:30) – Gym/Sprints/Skills
function morningTrain(px, title, icon) {
  return [
    blk(`${px}-0`, '06:15', 'Aufstehen & Wasser', '💧', 'wake',
      ['Großes Glas Wasser', 'KEIN Handy in der 1. Stunde', 'Tageslicht']),
    blk(`${px}-1`, '06:30', title, icon, 'gym'),
    blk(`${px}-2`, '08:00', 'Duschen & Frühstück', '🍳', 'meal',
      ['Kalt abduschen', 'Morgen-Supplements', 'Protein + Carbs']),
    blk(`${px}-3`, '09:00', 'Deep Work – Block 1', '💻', 'work', ['Wichtigste Aufgabe zuerst', 'Handy weg']),
    blk(`${px}-4`, '11:30', 'Pause & Bewegung', '🚶', 'move'),
    blk(`${px}-5`, '12:30', 'Mittagessen', '🥗', 'meal'),
    blk(`${px}-6`, '13:30', 'Deep Work – Block 2', '💻', 'work'),
    blk(`${px}-7`, '19:00', 'Abendessen', '🍽️', 'meal'),
    blk(`${px}-8`, '21:30', 'Wind-down', '🌙', 'winddown', ['Handy in anderen Raum', 'Licht dimmen', 'Lesen']),
    blk(`${px}-9`, '22:30', 'Schlafvorbereitung', '🛏️', 'routine', ['Abend-Supplements (Magnesium)', 'Kurz reflektieren', 'Für morgen vorbereiten']),
    blk(`${px}-10`, '23:00', 'Schlafen', '😴', 'sleep'),
  ];
}

// Tag ohne Früh-Training (Abend-Aktivität separat)
function deskMorning(px) {
  return [
    blk(`${px}-0`, '06:30', 'Aufstehen & Wasser', '💧', 'wake', ['Großes Glas Wasser', 'KEIN Handy in der 1. Stunde', 'Tageslicht']),
    blk(`${px}-1`, '06:45', 'Morgenroutine', '☀️', 'routine', ['Bett machen', 'Zähne putzen', 'Kalt duschen', 'Morgen-Supplements']),
    blk(`${px}-2`, '07:15', 'Frühstück', '🍳', 'meal'),
    blk(`${px}-3`, '08:00', 'Deep Work – Block 1', '💻', 'work', ['Wichtigste Aufgabe zuerst', 'Handy weg']),
    blk(`${px}-4`, '10:30', 'Pause & Bewegung', '🚶', 'move'),
    blk(`${px}-5`, '12:30', 'Mittagessen', '🥗', 'meal'),
    blk(`${px}-6`, '13:30', 'Deep Work – Block 2', '💻', 'work'),
  ];
}

// Wochenplan (knie-sicher): Mo Gym A · Di Basketball · Mi Yoga · Do Gym B ·
// Fr Skills/Mobility · Sa Sprints+Schwimmen · So Ruhe/Sauna. Spiele s. GAMES.
export const DEFAULT_SCHEDULE = {
  1: [...morningTrain('mo', 'Gym: Oberkörper A (frei)', '🏋️')],
  2: [
    ...deskMorning('di'),
    blk('di-7', '17:30', 'Snack (Pre-Basketball)', '🍌', 'meal'),
    blk('di-8', '19:00', 'Basketball (Training)', '🏀', 'gym'),
    blk('di-9', '21:00', 'Duschen & Heimweg', '🚿', 'routine'),
    blk('di-10', '21:30', 'Abendessen', '🍽️', 'meal'),
    blk('di-11', '22:45', 'Wind-down', '🌙', 'winddown', ['Handy weg', 'Licht dimmen']),
    blk('di-12', '23:15', 'Schlafen', '😴', 'sleep'),
  ],
  3: [
    ...deskMorning('mi'),
    blk('mi-7', '17:00', 'Schwimmen + Sauna (gelenkschonend)', '🏊', 'move'),
    blk('mi-8', '19:00', 'Yoga', '🧘', 'move'),
    blk('mi-9', '20:15', 'Abendessen', '🍽️', 'meal'),
    blk('mi-10', '21:30', 'Wind-down', '🌙', 'winddown', ['Handy weg', 'Licht dimmen']),
    blk('mi-11', '22:30', 'Schlafvorbereitung', '🛏️', 'routine', ['Abend-Supplements', 'Reflexion']),
    blk('mi-12', '23:00', 'Schlafen', '😴', 'sleep'),
  ],
  4: [
    ...deskMorning('do'),
    blk('do-7', '18:30', 'Aktiv (flexibel): Basketball / Gym / Sprints', '🔄', 'gym'),
    blk('do-8', '20:00', 'Abendessen', '🍽️', 'meal'),
    blk('do-9', '21:30', 'Wind-down', '🌙', 'winddown', ['Handy weg', 'Licht dimmen']),
    blk('do-10', '22:30', 'Schlafvorbereitung', '🛏️', 'routine'),
    blk('do-11', '23:00', 'Schlafen', '😴', 'sleep'),
  ],
  5: [...morningTrain('fr', 'Gym: Oberkörper B + Kreuzheben leicht', '🏋️')],
  6: [
    blk('sa-0', '08:00', 'Aufstehen & Wasser', '💧', 'wake', ['Wasser', 'Tageslicht']),
    blk('sa-1', '08:15', 'Morgenroutine', '☀️', 'routine', ['Zähne putzen', 'Kalt duschen', 'Morgen-Supplements']),
    blk('sa-2', '09:00', 'Frühstück', '🍳', 'meal'),
    blk('sa-3', '10:30', 'Sprints + Schwimmen + Sauna', '⚡', 'gym'),
    blk('sa-4', '12:30', 'Mittagessen', '🥗', 'meal'),
    blk('sa-5', '14:00', 'Freizeit / Erholung', '🌿', 'move'),
    blk('sa-6', '19:00', 'Abendessen', '🍽️', 'meal'),
    blk('sa-7', '21:30', 'Wind-down', '🌙', 'winddown', ['Handy weg', 'Lesen']),
    blk('sa-8', '22:30', 'Schlafvorbereitung', '🛏️', 'routine'),
    blk('sa-9', '23:00', 'Schlafen', '😴', 'sleep'),
  ],
  0: [
    blk('so-0', '08:00', 'Aufstehen & Wasser', '💧', 'wake', ['Wasser', 'Tageslicht']),
    blk('so-1', '08:15', 'Morgenroutine', '☀️', 'routine', ['Zähne putzen', 'Morgen-Supplements']),
    blk('so-2', '09:00', 'Frühstück', '🍳', 'meal'),
    blk('so-3', '10:00', 'Wochenplanung', '🗓️', 'work', ['Woche planen', 'Spiele checken', 'Einkauf / Meal-Prep']),
    blk('so-4', '12:30', 'Mittagessen', '🥗', 'meal'),
    blk('so-5', '15:00', 'Lockere Mobility / Spaziergang', '🌿', 'move'),
    blk('so-6', '19:00', 'Abendessen', '🍽️', 'meal'),
    blk('so-7', '21:30', 'Wind-down', '🌙', 'winddown', ['Handy weg', 'Lesen']),
    blk('so-8', '22:30', 'Schlafvorbereitung', '🛏️', 'routine'),
    blk('so-9', '23:00', 'Schlafen', '😴', 'sleep'),
  ],
};

// --- Trainingsplan (pro Wochentag) ------------------------------------------
// Knie-sicher: Oberkörper frei/Calisthenics, Hinge leicht, Sprints submaximal,
// KEINE Sprünge/Beinstrecker bis schmerzfrei. Viel Abwechslung, freie Übungen.
// Übungen als { n: Name, t: Zweck-Tag }
// Tags: Kraft · Funktion · Ausdauer · Explosiv · Reha · Skill · Routine · Mobility
export const DEFAULT_TRAINING = {
  1: { title: 'Oberkörper A (frei)', focus: 'Rücken · Brust · Arme · Calisthenics',
       exercises: [
         { n: 'Klimmzüge (oder Negative/assistiert)', t: 'Kraft' },
         { n: 'Schrägbankdrücken', t: 'Kraft' },
         { n: 'Inverted Rows (horizontal an der Stange)', t: 'Funktion' },
         { n: 'Dips (oder Bank-Dips)', t: 'Kraft' },
         { n: 'Face Pulls / Band Pull-Aparts', t: 'Reha' },
         { n: 'Knie-Isometrie: Wall Sit 5×30–45s', t: 'Reha' },
       ] },
  2: { title: 'Basketball (Training)', focus: '19:00 · einfach dabei sein',
       exercises: [
         { n: 'Basketballtraining – dabei gewesen', t: 'Skill' },
       ] },
  3: { title: 'Yoga & Mobility', focus: 'Beweglichkeit · Recovery',
       exercises: [
         { n: 'Yoga-Flow 45–60 min', t: 'Mobility' },
         { n: 'Hüft-/Schulter-Mobility', t: 'Mobility' },
         { n: 'Optional: Schwimmen 20–30 min', t: 'Ausdauer' },
         { n: 'Sauna', t: 'Routine' },
       ] },
  4: { title: 'Aktiv (flexibel)', focus: 'Basketball ODER Gym B ODER Sprints',
       exercises: [
         { n: 'Wenn Basketball-Training: hin (Vorrang)', t: 'Skill' },
         { n: 'Sonst A: Gym Oberkörper (frei)', t: 'Kraft' },
         { n: 'Sonst B: Sprints 6–8× submaximal', t: 'Explosiv' },
         { n: 'Hauptsache aktiv bleiben', t: 'Routine' },
       ] },
  5: { title: 'Oberkörper B + Kreuzheben', focus: 'Rücken · Schulter · Hinge (knieschonend)',
       exercises: [
         { n: 'Chin-ups / enge Klimmzüge', t: 'Kraft' },
         { n: 'Überkopfdrücken (frei)', t: 'Kraft' },
         { n: 'Australian Pull-ups / Inverted Rows', t: 'Funktion' },
         { n: 'Dips oder Liegestütz-Varianten', t: 'Kraft' },
         { n: 'Kreuzheben LEICHT (Technik, hüftdominant)', t: 'Kraft' },
         { n: 'Langsame Wadenheben + Knie-Reha', t: 'Reha' },
       ] },
  6: { title: 'Sprints + Schwimmen + Sauna', focus: 'Speed · Wachstumshormon · Gelenke · Recovery',
       exercises: [
         { n: 'Dynamisches Warm-up + Steigerungen', t: 'Mobility' },
         { n: 'Sprints 6–8× 40–60 m (submaximal → steigern)', t: 'Explosiv' },
         { n: 'Lange Pausen (voll erholen)', t: 'Routine' },
         { n: 'Schwimmen 20–30 min', t: 'Ausdauer' },
         { n: 'Sauna nach dem Schwimmen', t: 'Routine' },
       ] },
  0: { title: 'Ruhetag', focus: 'Mobility · Spaziergang · Wochenplanung',
       exercises: [
         { n: 'Lockere Mobility', t: 'Mobility' },
         { n: 'Spaziergang an der frischen Luft', t: 'Ausdauer' },
         { n: 'Woche planen', t: 'Routine' },
       ] },
};

// --- Basketball-Spielplan (TSC Münster, LL07H 2026/27) ----------------------
// home = Heimspiel. In der App bearbeitbar/erweiterbar.
export const GAMES = [
  { date: '2026-10-02', time: '20:30', opponent: 'SC Westfalia Kinderhaus 2', home: true,  hall: 'Freiherr vom Stein Gymnasium (Hauptfeld)' },
  { date: '2026-10-11', time: '18:00', opponent: 'ATV Haltern',               home: false, hall: 'Joseph Hennewig Schule' },
  { date: '2026-11-08', time: '16:00', opponent: 'CSG Bulmke',                home: false, hall: 'Halle am Wildenbruchplatz' },
  { date: '2026-11-13', time: '20:30', opponent: 'TuS Hiltrup 2',             home: true,  hall: 'Freiherr vom Stein Gymnasium (Hauptfeld)' },
  { date: '2026-11-28', time: '18:00', opponent: 'DJK Vorwärts Lette',        home: false, hall: 'Turnhalle Pictorius Berufskolleg' },
  { date: '2026-12-05', time: '16:00', opponent: 'BG Dorsten 2',              home: true,  hall: 'Juliushalle' },
  { date: '2026-12-12', time: '18:00', opponent: 'Hertener Löwen 2',          home: false, hall: 'Halle der Ludgerus-Schule' },
  { date: '2026-12-18', time: '20:30', opponent: 'TSV Bocholt',               home: true,  hall: 'Freiherr vom Stein Gymnasium (Hauptfeld)' },
  { date: '2027-01-10', time: '18:00', opponent: 'S.C. Union Lüdinghausen',   home: false, hall: 'Sporthalle der Sekundarschule' },
  { date: '2027-01-16', time: '14:00', opponent: 'Citybasket Recklinghausen 3', home: false, hall: 'Vestische Arena Alfons Schütt' },
  { date: '2027-01-22', time: '20:30', opponent: 'UBC Münster 4',             home: true,  hall: 'Freiherr vom Stein Gymnasium (Hauptfeld)' },
  { date: '2027-01-31', time: '12:00', opponent: 'SC Westfalia Kinderhaus 2', home: false, hall: '3-fach-Halle Schulzentrum Kinderhaus' },
  { date: '2027-02-12', time: '20:30', opponent: 'ATV Haltern',               home: true,  hall: 'Freiherr vom Stein Gymnasium (Hauptfeld)' },
  { date: '2027-02-19', time: '20:30', opponent: 'CSG Bulmke',                home: true,  hall: 'Freiherr vom Stein Gymnasium (Hauptfeld)' },
  { date: '2027-02-27', time: '19:00', opponent: 'TuS Hiltrup 2',             home: false, hall: 'Dreifachhalle Hiltrup Mitte' },
  { date: '2027-03-05', time: '20:30', opponent: 'DJK Vorwärts Lette',        home: true,  hall: 'Freiherr vom Stein Gymnasium (Hauptfeld)' },
  { date: '2027-03-13', time: '20:00', opponent: 'BG Dorsten 2',              home: false, hall: 'Juliushalle' },
  { date: '2027-04-09', time: '20:30', opponent: 'Hertener Löwen 2',          home: true,  hall: 'Freiherr vom Stein Gymnasium (Hauptfeld)' },
  { date: '2027-04-13', time: '19:30', opponent: 'TSV Bocholt',               home: false, hall: 'SH Jerichostraße' },
  { date: '2027-04-23', time: '20:30', opponent: 'S.C. Union Lüdinghausen',   home: true,  hall: 'Freiherr vom Stein Gymnasium (Hauptfeld)' },
];

// --- Gewohnheiten (Streaks) --------------------------------------------------
export const DEFAULT_HABITS = [
  // Die täglichen Must-Dos (füllen den Ring auf 100%)
  { id: 'h_train',      name: 'Training / Bewegung heute',      icon: '🏋️', why: 'Reiz zum Muskel-/Kraftaufbau – der Motor Richtung Athlet.' },
  // Tägliches Athletik-/Reha-Volumen (unabhängig vom Trainingstag)
  { id: 'h_knee',       name: 'Knie-Reha (Isometrie 5×30–45s)', icon: '🦵', why: 'Baut die Patellasehne wieder belastbar auf – schützt vor erneuter Verletzung.' },
  { id: 'h_core',       name: 'Core-Training',                  icon: '🧱', why: 'Verbindet Ober- & Unterkörper, Basis für Calisthenics-Skills & Explosivität.' },
  { id: 'h_cali_am',    name: 'Calisthenics morgens (Push/Pull/Dips)', icon: '🌅', why: 'Greasing the Groove: viel Volumen submaximal → stark an Klimmzug/Dip/Push-up.' },
  { id: 'h_cali_pm',    name: 'Calisthenics abends (Push/Pull/Dips)',  icon: '🌙', why: 'Zweite Volumen-Dosis am Tag, ohne dich auszubrennen.' },
  { id: 'h_weigh',      name: 'Morgens wiegen',                        icon: '⚖️', why: 'Täglich → 7-Tage-Schnitt zeigt den echten Fettabbau-Trend.' },
  // Lifestyle (Wasser & Supplements haben eigene Widgets und zählen anteilig)
  { id: 'h_nophone',   name: 'Kein Handy 1. Stunde',    icon: '📵', why: 'Startet den Tag fokussiert statt reaktiv – weniger Stress, mehr Kontrolle.' },
  { id: 'h_sun',       name: 'Morgens Tageslicht',      icon: '☀️', why: 'Stellt den Schlaf-Wach-Rhythmus ein → mehr Energie tags, besserer Schlaf nachts.' },
  { id: 'h_steps',     name: '10.000 Schritte',         icon: '👟', why: 'Grundlagen-Aktivität verbrennt Fett ohne Gelenkbelastung – gut fürs Knie.' },
  { id: 'h_read',      name: '10 Min lesen',            icon: '📖', why: 'Diszipliniert den Geist & ersetzt sinnloses Scrollen.' },
  { id: 'h_phoneoff',  name: 'Handy weg 22:30',         icon: '🌙', why: 'Blaulicht-Stopp → schnelleres Einschlafen & bessere Erholung/Testosteron.' },
];

// --- Ernährungs-Autopilot (fester Tages-Grundplan) --------------------------
// Fokus: Mikros/Vitamine über Obst & Gemüse abdecken. Protein/Carb-Basics
// fügst du selbst hinzu, sobald du sie in der Bibliothek angelegt hast.
export const DEFAULT_AUTOPILOT = [
  // Protein-Basis
  { foodId: 'egg',           grams: 150 }, // 3 Eier – Protein, Biotin, B12, Selen
  { foodId: 'magerquark',    grams: 250 }, // Protein, Calcium, B12
  { foodId: 'whey',          grams: 30 },  // 1 Scoop – Protein
  // Basis / Carbs
  { foodId: 'oats',          grams: 50 },  // Carbs, Magnesium, Zink, B1, Ballaststoffe
  // Gemüse
  { foodId: 'bell_pepper',   grams: 120 }, // 1 Paprika – Vit C
  { foodId: 'carrot',        grams: 65 },  // 1 Karotte – Vit A
  { foodId: 'tomato',        grams: 100 }, // Kalium, Vit C/K
  { foodId: 'broccoli',      grams: 100 }, // Vit C, K, Folat
  // Obst
  { foodId: 'kiwi',          grams: 150 }, // 2 Kiwi – Vit C, K, Folat
  { foodId: 'blueberries',   grams: 80 },  // Antioxidantien
  { foodId: 'orange',        grams: 130 }, // 1 Orange – Vit C, Folat
  { foodId: 'banana',        grams: 120 }, // 1 Banane – Kalium, B6
  // Fette / Nüsse
  { foodId: 'pumpkin_seeds', grams: 20 },  // Magnesium, Zink, Eisen
  { foodId: 'walnuts',       grams: 15 },  // Omega-3 (ALA), Kupfer
  { foodId: 'avocado',       grams: 70 },  // ½ – gesunde Fette, Vit E/K, Kalium
];
