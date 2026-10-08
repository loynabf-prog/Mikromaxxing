// ============================================================================
// Mikromaxxing – Persona: alles, was diese App über ihren einen Nutzer weiß.
// Diese Datei macht die App persönlich. Für jemand anderen wird sie komplett
// neu geschrieben (Alltag, Training, Essen, Ziele, Ton) – die App ist danach
// eine andere.
// ============================================================================

export const PERSONA = {
  id: 'fassi',
  name: 'Fassie',
  version: 2,

  // --- Wie die App spricht -----------------------------------------------------
  // Direkt, ehrlich, motivierend – kein Slang („Digga" o. Ä.), keine Floskeln.
  tone: 'Sprich Fassie direkt mit „du" an. Ton: klar, ehrlich, motivierend, wie ein guter Coach, der an ihn glaubt. Kein Jugendslang (kein „Digga", „Bro"), keine Emojis-Flut, keine Floskeln. Kurz und konkret. Wenn er schludert, sag es freundlich, aber deutlich.',

  // --- Körper & Ziel -----------------------------------------------------------
  body: { sex: 'm', age: 26, height: 180, startWeight: 94.6, targetWeight: 84, targetBodyfat: 15 },
  goal: {
    // So schnell wie möglich abnehmen – aber Muskeln und Knie schützen
    tempo: 'fast',          // 'moderate' | 'fast' | 'max'
    why: 'So schnell wie möglich Fett verlieren, dabei Muskeln und Athletik aufbauen.',
  },

  // --- Alltag ------------------------------------------------------------------
  life: {
    job: 'Selbstständig mit einer Social-Media-Agentur: dreht und schneidet Videos mit Kunden, viel unterwegs',
    workFrom: '06:00', workTo: '18:00', workDays: 'Mo–So (flexibel, außer es steht was im Kalender)',
    wake: '05:45',
    sleepTarget: 7.5,
  },

  // --- Essen -------------------------------------------------------------------
  eating: {
    breakfast: false,                 // morgens nur Kaffee
    morning: 'Kaffee',
    firstMeal: '12:30',               // erste Mahlzeit = Mittag (meist eine Bowl)
    dinnerRest: '19:00',              // Abendessen an Tagen ohne Abendtraining
    lateRisk: true,                   // spät abends kommt oft noch was rein
    habits: [
      'Frühstück: nichts, nur Kaffee',
      'Mittags meistens eine Bowl',
      'Abends oft ungesund – draußen oder zuhause',
      'Kurz vor dem Schlafen kommt manchmal noch was',
      'Mag Fast Food, stellt gerade um: statt Döner eine Portion Dönerfleisch',
      'Kein Alkohol, Süßes und Chips sind kein Problem',
    ],
    shops: ['Lidl', 'Rewe'],          // Lidl günstig, Rewe abends unterwegs
    likes: ['Bowls', 'Döner/Dönerfleisch', 'Fast Food', 'Lachs', 'Hähnchen', 'Reis'],
  },

  // --- Training ----------------------------------------------------------------
  training: {
    basketball: 'Di + Do 19–21 Uhr (TSC Münster, Landesliga) – Spiele Fr/Sa laut Spielplan, zählen wie eine weitere Einheit',
    gymWhen: ['morgens', 'abends', 'nachts'], // mittags ist es ihm zu voll
    gymDefault: 'evening',             // 'morning' | 'evening' | 'night'
    gymTimes: { morning: '06:30', evening: '18:30', night: '21:30' },
  },
  skills: ['handstand', 'backlever', 'muscleup'],
  skillWhy: 'Calisthenics: Handstand, Back Lever und Muscle-Up – dafür eine stabile Grundathletik aufbauen und Verletzungen vermeiden.',
  knee: { side: 'links', issue: 'Patellasehnen-Tendinopathie', trend: 'wird besser, macht aber noch Probleme' },
};

// --- Persönliche Lebensmittel (ergänzen die Bibliothek) ----------------------
function n(values) {
  const keys = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'satfat', 'vitA', 'vitC', 'vitD', 'vitE', 'vitK',
    'vitB1', 'vitB2', 'vitB3', 'vitB5', 'vitB6', 'vitB7', 'vitB9', 'vitB12', 'calcium', 'iron', 'magnesium', 'zinc',
    'potassium', 'sodium', 'phosphorus', 'selenium', 'copper', 'manganese', 'iodine', 'omega3'];
  return Object.assign(Object.fromEntries(keys.map(k => [k, 0])), values);
}
export const PERSONA_FOODS = [
  { id: 'peanut_butter', name: 'Erdnussbutter', cat: 'Nüsse & Samen', whole: true,
    servings: [{ label: 'EL (16 g)', grams: 16 }],
    per100: n({ kcal: 600, protein: 25, carbs: 12, fat: 50, fiber: 6, sugar: 5, satfat: 10, vitE: 9, vitB3: 13, vitB6: 0.5, vitB9: 90, magnesium: 170, potassium: 560, phosphorus: 360, zinc: 2.8, iron: 1.9, copper: 0.5, manganese: 1.6 }) },
  { id: 'doener_meat', name: 'Dönerfleisch (Portion vom Spieß)', cat: 'Protein', whole: false,
    servings: [{ label: 'Portion (250 g)', grams: 250 }], aliases: ['dönerfleisch', 'döner fleisch', 'portion dönerfleisch', 'dönerteller'],
    per100: n({ kcal: 210, protein: 20, carbs: 3, fat: 13, satfat: 5, sodium: 600, iron: 1.5, zinc: 3, vitB12: 1.2, vitB3: 5, vitB6: 0.3, selenium: 18, phosphorus: 180, potassium: 280 }) },
  { id: 'doener_bread', name: 'Döner Kebab (im Brot)', cat: 'Gerichte', whole: false,
    piece: { g: 380, def: 1, name: 'Döner' }, aliases: ['döner', 'döner kebab', 'kebab'],
    per100: n({ kcal: 215, protein: 11, carbs: 22, fat: 9, fiber: 1.5, sugar: 2, satfat: 3.5, sodium: 520, iron: 1.3, zinc: 1.6, vitB12: 0.6, vitC: 4, calcium: 50, potassium: 220 }) },
  { id: 'duerum', name: 'Dürüm', cat: 'Gerichte', whole: false,
    piece: { g: 400, def: 1, name: 'Dürüm' }, aliases: ['dürüm', 'durum', 'yufka'],
    per100: n({ kcal: 205, protein: 11, carbs: 21, fat: 8.5, fiber: 1.6, sugar: 2, satfat: 3.2, sodium: 500, iron: 1.2, zinc: 1.5, vitB12: 0.6, vitC: 4, calcium: 45 }) },
  { id: 'tzatziki', name: 'Tzatziki / Joghurtsoße', cat: 'Milchprodukte', whole: false,
    servings: [{ label: 'Portion (50 g)', grams: 50 }], aliases: ['tzatziki', 'joghurtsoße', 'knoblauchsoße', 'kräutersoße'],
    per100: n({ kcal: 110, protein: 4, carbs: 4, fat: 9, sugar: 3, satfat: 5, calcium: 100, sodium: 350, vitB12: 0.3 }) },
  { id: 'mixed_salad', name: 'Gemischter Salat', cat: 'Gemüse', whole: true,
    servings: [{ label: 'Portion (200 g)', grams: 200 }], aliases: ['salat', 'beilagensalat', 'gemischter salat'],
    per100: n({ kcal: 18, protein: 1, carbs: 3, fiber: 1.3, sugar: 2, vitC: 12, vitK: 30, vitA: 60, vitB9: 30, potassium: 200, calcium: 20 }) },
  { id: 'fries', name: 'Pommes (Imbiss)', cat: 'Snacks', whole: false,
    servings: [{ label: 'Portion (150 g)', grams: 150 }], aliases: ['pommes', 'fritten', 'pommes frites'],
    per100: n({ kcal: 300, protein: 3.5, carbs: 38, fat: 15, fiber: 3.5, satfat: 2.5, sodium: 300, potassium: 580, vitC: 5, vitB6: 0.3 }) },
  { id: 'cheeseburger', name: 'Burger (Fast Food)', cat: 'Gerichte', whole: false,
    piece: { g: 130, def: 1, name: 'Burger' }, aliases: ['burger', 'cheeseburger', 'hamburger'],
    per100: n({ kcal: 265, protein: 14, carbs: 26, fat: 12, fiber: 1.5, sugar: 5, satfat: 5.5, sodium: 600, calcium: 120, iron: 2.3, zinc: 2.4, vitB12: 1 }) },
  { id: 'pizza_marg', name: 'Pizza Margherita', cat: 'Gerichte', whole: false,
    piece: { g: 350, def: 1, name: 'Pizza' }, aliases: ['pizza', 'margherita'],
    per100: n({ kcal: 245, protein: 11, carbs: 32, fat: 8, fiber: 2, sugar: 3, satfat: 3.8, sodium: 550, calcium: 180, iron: 1.2 }) },
  { id: 'sushi_maki', name: 'Sushi (Lachs-Maki)', cat: 'Gerichte', whole: false,
    piece: { g: 25, def: 8, name: 'Stück' }, aliases: ['sushi', 'maki', 'lachs maki'],
    per100: n({ kcal: 150, protein: 6, carbs: 27, fat: 2, sugar: 4, sodium: 400, omega3: 300, vitD: 1, iodine: 20, vitB12: 0.8, selenium: 8 }) },
  { id: 'tortilla_wrap', name: 'Wrap (Weizen-Tortilla)', cat: 'Getreide', whole: false,
    piece: { g: 62, def: 1, name: 'Wrap' }, aliases: ['wrap', 'tortilla'],
    per100: n({ kcal: 300, protein: 8, carbs: 50, fat: 7, fiber: 3, sugar: 3, satfat: 3, sodium: 600, iron: 2, calcium: 100 }) },
  { id: 'chicken_strips', name: 'Hähnchen-Filetstreifen (fertig)', cat: 'Protein', whole: false,
    servings: [{ label: 'Packung (150 g)', grams: 150 }], aliases: ['hähnchenstreifen', 'filetstreifen', 'hähnchen streifen', 'chicken strips'],
    per100: n({ kcal: 125, protein: 24, carbs: 1, fat: 2.5, sodium: 600, vitB3: 10, vitB6: 0.5, phosphorus: 200, potassium: 300, selenium: 20, zinc: 0.8 }) },
];

// --- Persönliche Gerichte für „Was soll ich essen?" ----------------------------
// slots: first (erste Mahlzeit/Mittag) · pre (vor Training) · post (nach Training/Gym)
//        dinner · late (spät abends) · snack
// place: home · prep (Meal-Prep) · lidl (Supermarkt) · imbiss · out (Restaurant)
export const RECIPES = [
  // Mittag: Bowls (deine Gewohnheit)
  { id: 'r_poke', name: 'Poke Bowl Lachs', slots: ['first', 'dinner'], place: 'out', prep: 0,
    why: 'Lachs + Ei + Edamame: viel Protein und Omega-3 fürs Knie.',
    items: [['salmon', 150], ['white_rice', 200], ['egg', 55], ['sweet_potato', 80], ['broccoli', 80], ['edamame', 60], ['peanuts', 15], ['feldsalat', 40]] },
  { id: 'r_chicken_bowl', name: 'Chicken-Reis-Bowl', slots: ['first', 'dinner', 'post'], place: 'prep', prep: 15,
    why: 'Der Klassiker zum Vorkochen: 50 g Protein, Brokkoli für Vitamin C & K.',
    items: [['chicken_breast', 180], ['white_rice', 180], ['broccoli', 100], ['edamame', 50], ['avocado', 50]] },
  { id: 'r_tuna_bowl', name: 'Thunfisch-Bowl in 5 Minuten', slots: ['first', 'dinner'], place: 'lidl', prep: 5,
    why: 'Alles von Lidl, kein Kochen: Dose, Express-Reis, Gurke, Edamame.',
    items: [['tuna_can', 150], ['white_rice', 150], ['cucumber', 100], ['edamame', 60], ['tomato', 80]] },
  { id: 'r_lentil_feta', name: 'Linsen-Feta-Bowl mit Ei', slots: ['first'], place: 'prep', prep: 10,
    why: 'Eisen, Folat und Ballaststoffe – hält bis zum Abend satt.',
    items: [['lentils', 200], ['feta', 50], ['egg', 100], ['bell_pepper', 120], ['spinach', 40]] },
  { id: 'r_shrimp_quinoa', name: 'Garnelen-Quinoa-Bowl', slots: ['first', 'dinner'], place: 'home', prep: 15,
    why: 'Leicht, eiweißreich, Jod und Selen aus den Garnelen.',
    items: [['shrimp', 150], ['quinoa', 150], ['avocado', 50], ['mango', 80], ['cucumber', 80]] },

  // Abend zuhause
  { id: 'r_chicken_pan', name: 'Hähnchen-Gemüse-Pfanne mit Reis', slots: ['dinner', 'post'], place: 'home', prep: 20,
    why: 'Viel Volumen für wenig Kalorien – perfekt nach dem Basketball.',
    items: [['chicken_breast', 200], ['white_rice', 150], ['zucchini', 100], ['bell_pepper', 100], ['mushrooms', 80]] },
  { id: 'r_burrito', name: 'Burrito-Bowl mit Rinderhack', slots: ['dinner', 'post'], place: 'home', prep: 20,
    why: 'Zink und Eisen aus dem Rind, Ballaststoffe aus den Bohnen.',
    items: [['beef_lean', 180], ['white_rice', 150], ['kidney_beans', 80], ['bell_pepper', 80], ['tomato', 80], ['avocado', 40]] },
  { id: 'r_salmon_potato', name: 'Lachs mit Kartoffeln & Brokkoli', slots: ['dinner'], place: 'home', prep: 25,
    why: 'Omega-3 und Vitamin D – das Beste für Sehnen und Regeneration.',
    items: [['salmon', 160], ['potato', 250], ['broccoli', 150]] },
  { id: 'r_omelette', name: 'Omelett mit Vollkornbrot', slots: ['dinner', 'first'], place: 'home', prep: 10,
    why: 'Schnell gemacht, B12, Cholin und Selen.',
    items: [['egg', 200], ['ww_bread', 90], ['tomato', 120], ['cheese_gouda', 20]] },
  { id: 'r_turkey_sweet', name: 'Putenbrust, Süßkartoffel, Bohnen', slots: ['dinner'], place: 'home', prep: 25,
    why: 'Mageres Protein, Vitamin A und langsame Carbs.',
    items: [['turkey_breast', 200], ['sweet_potato', 250], ['green_beans', 150]] },

  // Imbiss – die smarte Variante deines Fast Foods
  { id: 'r_doener_teller', name: 'Dönerfleisch-Teller mit Salat', slots: ['dinner', 'first'], place: 'imbiss', prep: 0,
    why: 'Dein Döner-Upgrade: ohne Brot fast doppelt so viel Protein pro Kalorie.',
    items: [['doener_meat', 250], ['mixed_salad', 200], ['tzatziki', 50]] },
  { id: 'r_duerum', name: 'Dürüm mit extra Salat', slots: ['dinner'], place: 'imbiss', prep: 0,
    why: 'Wenn\'s Brot sein muss: Dürüm statt Döner + Pommes.',
    items: [['duerum', 400], ['mixed_salad', 100]] },
  { id: 'r_burger_smart', name: 'Burger + Salat statt Pommes', slots: ['dinner'], place: 'imbiss', prep: 0,
    why: 'Pommes weglassen spart ~450 kcal – der Burger bleibt.',
    items: [['cheeseburger', 260], ['mixed_salad', 150]] },
  { id: 'r_sushi', name: 'Sushi + Edamame', slots: ['first', 'dinner'], place: 'out', prep: 0,
    why: 'Lachs liefert Omega-3, Edamame das fehlende Protein.',
    items: [['sushi_maki', 200], ['edamame', 100]] },
  { id: 'r_pizza_half', name: 'Halbe Pizza + großer Salat', slots: ['dinner'], place: 'out', prep: 0,
    why: 'Pizza geht – halbe Pizza, Rest morgen, dazu Salat.',
    items: [['pizza_marg', 175], ['mixed_salad', 200]] },

  // Lidl / Rewe – auf die Hand
  { id: 'r_skyr_banana', name: 'Skyr + Banane', slots: ['snack', 'pre', 'post'], place: 'lidl', prep: 0,
    why: '30 g Protein und schnelle Energie für 2 €.',
    items: [['magerquark', 250], ['banana', 120]] },
  { id: 'r_pudding_apple', name: 'Proteinpudding + Apfel', slots: ['snack', 'late'], place: 'lidl', prep: 0,
    why: 'Süß, satt, 20 g Protein.',
    items: [['protein_pudding', 200], ['apple', 180]] },
  { id: 'r_tuna_rc', name: 'Thunfisch + Reiswaffeln + Gurke', slots: ['snack', 'first'], place: 'lidl', prep: 2,
    why: 'Unterwegs-Mittag beim Dreh: 35 g Protein, kaum Fett.',
    items: [['tuna_can', 150], ['rice_cakes', 30], ['cucumber', 150]] },
  { id: 'r_chicken_wrap', name: 'Hähnchen-Wrap', slots: ['first', 'dinner'], place: 'lidl', prep: 3,
    why: 'Filetstreifen + Wrap + Salat: in 3 Minuten fertig, 45 g Protein.',
    items: [['chicken_strips', 150], ['tortilla_wrap', 62], ['mixed_salad', 80], ['tzatziki', 30]] },
  { id: 'r_cottage_pepper', name: 'Hüttenkäse + Paprika', slots: ['snack', 'late'], place: 'lidl', prep: 0,
    why: 'Vitamin C und Casein – knackig und sättigend.',
    items: [['cottage_cheese', 200], ['bell_pepper', 120]] },

  // Rund ums Training
  { id: 'r_pre_skyr', name: 'Banane + Reiswaffeln + Skyr', slots: ['pre'], place: 'lidl', prep: 0,
    why: '1,5–2 h vor dem Training: Carbs zum Spielen, etwas Protein, nichts Schweres.',
    items: [['banana', 120], ['rice_cakes', 20], ['magerquark', 150]] },
  { id: 'r_pre_dates', name: 'Datteln + Whey', slots: ['pre'], place: 'home', prep: 1,
    why: 'Wenn\'s schnell gehen muss: 45 Min vorher.',
    items: [['dates', 40], ['whey', 30]] },
  { id: 'r_shake', name: 'Whey-Shake + Banane', slots: ['post'], place: 'home', prep: 1,
    why: 'Direkt nach dem Gym: 25 g Protein, Speicher auffüllen.',
    items: [['whey', 30], ['banana', 120]] },

  // Spät abends – deine Schwachstelle, aber mit Plan
  { id: 'r_late_quark', name: 'Magerquark mit Beeren', slots: ['late'], place: 'home', prep: 1,
    why: 'Wenn noch Hunger kommt: langsames Protein über Nacht statt Snacks.',
    items: [['magerquark', 250], ['blueberries', 80]] },
  { id: 'r_late_cottage', name: 'Hüttenkäse pur oder mit Gurke', slots: ['late'], place: 'home', prep: 0,
    why: 'Wenig Kalorien, viel Casein.',
    items: [['cottage_cheese', 200], ['cucumber', 100]] },
];

// Persönliche Supplement-Zeiten: ohne Frühstück gehören D3/K2/Jod zur ersten Mahlzeit
export const PERSONA_SUPP_TIMES = { vitd3: 'mittags', vitk2: 'mittags', iodine: 'mittags' };

// Kurze Selbstbeschreibung für den KI-Coach
export function personaBrief(p = PERSONA) {
  return [
    `Name: ${p.name}, ${p.body.age} Jahre, ${p.body.height} cm. Ziel: von ca. ${p.body.startWeight} kg auf ${p.body.targetWeight} kg (${p.body.targetBodyfat} % Körperfett) – ${p.goal.why}`,
    `Alltag: ${p.life.job}. Arbeitet meist ${p.life.workFrom}–${p.life.workTo}, ${p.life.workDays}. Steht ca. ${p.life.wake} auf.`,
    `Essen: ${p.eating.habits.join('; ')}. Kauft meist bei ${p.eating.shops.join(' und ')}.`,
    `Training: ${p.training.basketball}. Gym morgens, abends oder nachts (mittags zu voll). Ziele: ${p.skillWhy}`,
    `Knie: ${p.knee.issue} ${p.knee.side} – ${p.knee.trend}. Keine Sprünge/Belastungsspitzen ohne Aufwärmen, Isometrie täglich.`,
  ].join('\n');
}
