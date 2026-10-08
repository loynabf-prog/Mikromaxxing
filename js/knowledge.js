// ============================================================================
// Mikromaxxing – Wissen: Nährstoffe, Supplements, was ein Lebensmittel bringt
// Kurz, ehrlich, auf einen Athleten mit Patellasehnen-Problemen zugeschnitten.
// ============================================================================
import { NUTRIENTS } from './data.js';

// --- Nährstoffe ---------------------------------------------------------------
// short: wenige Worte für Listen · why: wofür · you: für dich als Athlet ·
// low: so merkst du zu wenig · tip: Aufnahme & Kombinationen
export const NUTRIENT_DETAILS = {
  kcal: { short: 'Energie',
    why: 'Energie für alles – Training, Gehirn, Regeneration.',
    you: 'Für die Recomposition zählt ein moderates Defizit: zu wenig kostet Muskeln und Sprungkraft, zu viel bremst den Fettabbau.',
    low: 'Dauerhaft zu wenig: schlappe Einheiten, schlechter Schlaf, Heißhunger, Kraft stagniert.',
    tip: 'Kalorien rund ums Training (vorher Carbs, danach Protein + Carbs) bringen am meisten.' },
  protein: { short: 'Muskelaufbau & Sättigung',
    why: 'Baustoff für Muskeln, Sehnen, Enzyme und Immunzellen. Hält am längsten satt.',
    you: 'Im Defizit schützt viel Protein (ca. 2 g pro kg) deine Muskeln. Auf 4–5 Mahlzeiten à 30–50 g verteilt wirkt es am besten.',
    low: 'Muskelkater hält lange an, Kraft geht im Defizit verloren, ständiger Hunger.',
    tip: 'Vor dem Schlafen 30–40 g langsames Protein (Magerquark, Skyr) versorgt die Muskeln über Nacht.' },
  carbs: { short: 'Treibstoff fürs Training',
    why: 'Schnellste Energiequelle; füllt die Glykogenspeicher in Muskeln und Leber.',
    you: 'Basketball und Sprints laufen fast nur über Kohlenhydrate. An Trainingstagen mehr, an Ruhetagen weniger.',
    low: 'Schwere Beine, Leistungseinbruch in der 2. Halbzeit, Konzentration lässt nach.',
    tip: '2–3 h vor dem Training eine Carb-Mahlzeit, direkt davor etwas Schnelles (Banane, Datteln).' },
  fat: { short: 'Hormone & Vitaminaufnahme',
    why: 'Baustein für Hormone (u. a. Testosteron) und Zellwände; nötig, um die Vitamine A, D, E und K aufzunehmen.',
    you: 'Nicht unter ca. 0,8 g pro kg gehen – sonst leiden Hormone und Regeneration.',
    low: 'Trockene Haut, Libido und Stimmung sinken, fettlösliche Vitamine kommen schlechter an.',
    tip: 'Vor allem aus Fisch, Nüssen, Olivenöl, Avocado und Eiern.' },
  fiber: { short: 'Darm & Sättigung',
    why: 'Füttert die Darmbakterien, hält den Blutzucker stabil und macht lange satt.',
    you: 'Im Defizit dein bester Freund gegen Hunger. Direkt vor dem Training aber eher wenig.',
    low: 'Verstopfung, schneller wieder hungrig, Heißhunger auf Süßes.',
    tip: 'Hülsenfrüchte, Haferflocken, Gemüse, Beeren, Leinsamen. Dazu genug trinken.' },
  sugar: { short: 'Schnelle Energie',
    why: 'Schnell verfügbare Energie – sinnvoll rund ums Training, sonst eher sparsam.',
    you: 'Direkt vor oder nach intensiven Einheiten völlig okay, im Alltag Heißhunger-Falle.',
    low: 'Kein Mangel möglich – der Körper braucht keinen zugesetzten Zucker.',
    tip: 'Obst zählt mit, liefert aber gleichzeitig Vitamine und Ballaststoffe.' },
  satfat: { short: 'In Maßen halten',
    why: 'Gesättigte Fette – in größeren Mengen ungünstig für Blutfette und Herz.',
    you: 'Kein Problem in normalen Mengen; Wurst, Butter und Frittiertes begrenzen.',
    low: 'Kein Mangel möglich.',
    tip: 'Lieber Fisch, Nüsse und Olivenöl als Butter, Sahne und Wurst.' },
  vitA: { short: 'Augen, Haut, Immunsystem',
    why: 'Sehen (vor allem im Dunkeln), Haut und Schleimhäute, Immunabwehr, Zellwachstum.',
    you: 'Gesunde Schleimhäute halten bei viel Training Infekte fern.',
    low: 'Schlechtes Sehen in der Dämmerung, trockene Haut, häufige Infekte.',
    tip: 'Fettlöslich: Karotten, Süßkartoffel oder Spinat mit etwas Öl oder Fett essen.' },
  vitC: { short: 'Immunsystem & Kollagen für Sehnen',
    why: 'Starkes Antioxidans; nötig, um Kollagen zu bilden (Sehnen, Bänder, Haut). Verbessert die Eisenaufnahme.',
    you: 'Wichtig für deine Patellasehne: Vitamin C + Kollagen/Gelatine ca. 45 Min. vor der Reha unterstützt den Sehnenaufbau.',
    low: 'Häufige Infekte, Zahnfleischbluten, langsame Wundheilung, Müdigkeit.',
    tip: 'Paprika, Kiwi, Brokkoli, Zitrusfrüchte – roh oder kurz gegart, Hitze zerstört es teilweise.' },
  vitD: { short: 'Kraft, Knochen, Immunsystem',
    why: 'Steuert Calcium-Einbau in die Knochen, Muskelkraft, Immunsystem und Hormone.',
    you: 'In Deutschland bildet die Haut von Oktober bis März praktisch kein Vitamin D – dein D3-Supplement deckt das.',
    low: 'Müdigkeit, Infektanfälligkeit, Muskelschwäche, schlechtere Knochendichte.',
    tip: 'Fettlöslich: immer mit einer fetthaltigen Mahlzeit, ideal zusammen mit K2.' },
  vitE: { short: 'Zellschutz & Regeneration',
    why: 'Antioxidans, schützt Zellwände vor Schäden durch intensiven Stoffwechsel.',
    you: 'Unterstützt die Erholung nach harten Einheiten.',
    low: 'Selten; eher Muskelschwäche und Nervenprobleme bei starkem Mangel.',
    tip: 'Nüsse, Samen, Pflanzenöle – fettlöslich, also mit Fett.' },
  vitK: { short: 'Blutgerinnung & Knochen',
    why: 'Nötig für die Blutgerinnung und den Einbau von Calcium in die Knochen.',
    you: 'Arbeitet mit Vitamin D zusammen – starke Knochen bei viel Sprung- und Laufbelastung.',
    low: 'Blaue Flecken, Nasenbluten, langfristig schwächere Knochen.',
    tip: 'Blattgemüse (Spinat, Grünkohl), Brokkoli – mit etwas Fett. K2 steckt in Käse und Fermentiertem.' },
  vitB1: { short: 'Carbs → Energie',
    why: 'Wandelt Kohlenhydrate in Energie um, wichtig für Nerven und Muskeln.',
    you: 'Bei viel Carbs und Training steigt der Bedarf.',
    low: 'Müdigkeit, Reizbarkeit, Konzentrationsprobleme, Wadenkrämpfe.',
    tip: 'Vollkorn, Haferflocken, Hülsenfrüchte, Schweinefleisch. Wasserlöslich – geht teils ins Kochwasser.' },
  vitB2: { short: 'Energie in den Zellen',
    why: 'Zentral für die Energiegewinnung in den Mitochondrien; Haut und Augen.',
    you: 'Wer viel trainiert, verbraucht mehr.',
    low: 'Rissige Mundwinkel, Hautprobleme, lichtempfindliche Augen.',
    tip: 'Milchprodukte, Eier, Fleisch, Mandeln.' },
  vitB3: { short: 'Energiestoffwechsel',
    why: 'Niacin – Energiegewinnung aus allen Makros, Haut und Nerven.',
    you: 'Bei viel Fleisch, Fisch und Geflügel meist gut gedeckt.',
    low: 'Selten; Müdigkeit, Hautprobleme.',
    tip: 'Hähnchen, Thunfisch, Erdnüsse, Vollkorn.' },
  vitB5: { short: 'Energie & Hormone',
    why: 'Pantothensäure – Energiegewinnung und Bildung von Stresshormonen.',
    you: 'Steckt in fast allem; Mangel ist bei abwechslungsreicher Ernährung selten.',
    low: 'Selten; Müdigkeit, Kribbeln.',
    tip: 'Eier, Pilze, Avocado, Fleisch, Vollkorn.' },
  vitB6: { short: 'Protein-Stoffwechsel & Nerven',
    why: 'Verarbeitet Aminosäuren, wichtig für Nerven, Stimmung und Blutbildung.',
    you: 'Bei viel Protein steigt der Bedarf – passt gut zu deiner Ernährung.',
    low: 'Gereiztheit, Hautprobleme, Kribbeln.',
    tip: 'Kartoffeln, Bananen, Hähnchen, Fisch, Kichererbsen.' },
  vitB7: { short: 'Haut, Haare, Stoffwechsel',
    why: 'Biotin – Fett- und Zuckerstoffwechsel, Haut, Haare und Nägel.',
    you: 'Bei Eiern und Nüssen meist kein Thema.',
    low: 'Selten; brüchige Nägel, Haarausfall, Hautausschlag.',
    tip: 'Eier (gegart), Nüsse, Haferflocken, Leber.' },
  vitB9: { short: 'Zellteilung & Blutbildung',
    why: 'Folat – nötig für neue Zellen und rote Blutkörperchen.',
    you: 'Viel Training bedeutet viel Zellerneuerung – Folat unterstützt Reparatur und Blutbildung.',
    low: 'Müdigkeit, Blässe, schlechtere Ausdauer.',
    tip: 'Grünes Blattgemüse, Hülsenfrüchte, Brokkoli. Hitzeempfindlich – auch roh essen.' },
  vitB12: { short: 'Energie, Blut, Nerven',
    why: 'Blutbildung, Nervensystem und Energiestoffwechsel.',
    you: 'Kommt fast nur aus tierischen Lebensmitteln – dein B12-Supp sichert ab.',
    low: 'Erschöpfung, Konzentrationsprobleme, Kribbeln in Händen und Füßen.',
    tip: 'Fleisch, Fisch, Eier, Milchprodukte. Wasserlöslich – braucht kein Fett.' },
  calcium: { short: 'Knochen & Muskelkontraktion',
    why: 'Hauptbaustein der Knochen; jede Muskelkontraktion braucht Calcium.',
    you: 'Viel Springen und Sprinten belastet die Knochen – genug Calcium + Vitamin D halten sie stark.',
    low: 'Muskelkrämpfe, langfristig geringere Knochendichte, höheres Ermüdungsbruch-Risiko.',
    tip: 'Milchprodukte, Käse, calciumreiches Mineralwasser, Brokkoli. Nicht gleichzeitig mit Eisen.' },
  iron: { short: 'Sauerstoff im Blut → Ausdauer',
    why: 'Transportiert Sauerstoff im Blut und in den Muskeln.',
    you: 'Ausdauer und Erholung zwischen Sprints hängen direkt daran. Schwitzen kostet zusätzlich Eisen.',
    low: 'Müdigkeit, Kurzatmigkeit, schlechte Ausdauer, Blässe.',
    tip: 'Mit Vitamin C kombinieren (z. B. Paprika zu Linsen). Kaffee, Tee und Milch erst 1 h später.' },
  magnesium: { short: 'Muskeln, Krämpfe, Schlaf',
    why: 'An über 300 Enzymen beteiligt: Muskelentspannung, Nerven, Energie, Schlaf.',
    you: 'Geht beim Schwitzen verloren. Hilft gegen Krämpfe und verbessert Schlaf und Erholung.',
    low: 'Wadenkrämpfe, Zucken (z. B. Augenlid), Unruhe, schlechter Schlaf.',
    tip: 'Kürbiskerne, Haferflocken, Nüsse, Hülsenfrüchte. Abends als Supplement ideal.' },
  zinc: { short: 'Testosteron, Immunsystem, Heilung',
    why: 'Immunsystem, Wundheilung, Testosteron und Geschmackssinn.',
    you: 'Wird beim Schwitzen ausgeschieden; wichtig für Regeneration und Hormone.',
    low: 'Häufige Infekte, langsame Heilung, weiße Flecken auf Nägeln.',
    tip: 'Rindfleisch, Haferflocken, Kürbiskerne, Käse. Nicht zeitgleich mit hochdosiertem Magnesium oder Calcium.' },
  potassium: { short: 'Muskeln, Nerven, Blutdruck',
    why: 'Steuert mit Natrium den Wasserhaushalt, Muskel- und Nervensignale und den Blutdruck.',
    you: 'Geht beim Schwitzen verloren – wichtig gegen Krämpfe in langen Einheiten.',
    low: 'Muskelschwäche, Krämpfe, Herzstolpern.',
    tip: 'Kartoffeln, Bananen, Hülsenfrüchte, Spinat, Avocado.' },
  sodium: { short: 'Wasserhaushalt',
    why: 'Hält Flüssigkeit im Körper und leitet Nervenimpulse.',
    you: 'Bei viel Schweiß darf es an Trainingstagen etwas mehr sein; sonst meist eher zu viel.',
    low: 'Kopfschmerzen, Krämpfe, Schwindel nach viel Schwitzen.',
    tip: 'Fertigprodukte und Wurst liefern viel – Obergrenze im Blick behalten.' },
  phosphorus: { short: 'Knochen & ATP',
    why: 'Mit Calcium Baustein der Knochen; Teil von ATP, der Energiewährung der Zellen.',
    you: 'Bei proteinreicher Ernährung praktisch immer gedeckt.',
    low: 'Sehr selten.',
    tip: 'Milchprodukte, Fleisch, Fisch, Hülsenfrüchte, Vollkorn.' },
  selenium: { short: 'Zellschutz & Schilddrüse',
    why: 'Antioxidans, wichtig für Schilddrüse und Immunsystem.',
    you: 'Schützt bei hoher Trainingsbelastung vor oxidativem Stress.',
    low: 'Infektanfälligkeit, Müdigkeit.',
    tip: '1–2 Paranüsse decken den Tagesbedarf – nicht mehr, sonst zu viel. Auch Fisch und Eier.' },
  copper: { short: 'Eisenverwertung & Bindegewebe',
    why: 'Hilft, Eisen zu verwerten; Bindegewebe, Nerven, Immunsystem.',
    you: 'Bindegewebe = auch Sehnen und Bänder.',
    low: 'Selten; Blutarmut trotz genug Eisen.',
    tip: 'Nüsse, Kakao, Vollkorn, Hülsenfrüchte.' },
  manganese: { short: 'Knochen & Stoffwechsel',
    why: 'Knochen- und Knorpelbildung, Stoffwechsel, Antioxidans-Schutz.',
    you: 'Unterstützt Knorpel und Bindegewebe.',
    low: 'Sehr selten.',
    tip: 'Haferflocken, Vollkorn, Nüsse, Tee.' },
  iodine: { short: 'Schilddrüse → Stoffwechsel',
    why: 'Baustein der Schilddrüsenhormone, die Stoffwechsel und Energie steuern.',
    you: 'Deutschland ist Jodmangelgebiet – ohne Fisch und Jodsalz wird es schnell knapp.',
    low: 'Müdigkeit, Frieren, Gewichtszunahme, langfristig Kropf.',
    tip: 'Seefisch, Jodsalz, Milchprodukte, Algen (vorsichtig – teils extrem viel).' },
  omega3: { short: 'Entzündungshemmend: Gelenke & Sehnen',
    why: 'EPA und DHA aus Fisch wirken entzündungshemmend; gut für Herz, Gehirn und Gelenke.',
    you: 'Für deine Patellasehne und die Regeneration nach Basketball eines der wichtigsten Fette.',
    low: 'Steife Gelenke, langsamere Erholung, trockene Haut.',
    tip: '2× pro Woche fetter Fisch (Lachs, Hering, Makrele). Leinsamen und Walnüsse liefern die Pflanzenform (ALA).' },
};

export function nutrientShort(key) { return (NUTRIENT_DETAILS[key] && NUTRIENT_DETAILS[key].short) || ''; }

// --- Supplements -------------------------------------------------------------
// how: 'fat' = mit Fett · 'empty' = nüchtern · 'meal' = zu einer Mahlzeit · 'any' = egal
export const HOW_LABELS = { fat: 'Mit Fett', empty: 'Nüchtern', meal: 'Zu einer Mahlzeit', any: 'Mit oder ohne Essen' };

export const SUPP_INFO = {
  vitd3: { when: 'Morgens oder mittags', how: 'fat',
    why: 'Die Haut bildet in Deutschland von Oktober bis März praktisch kein Vitamin D. Wichtig für Kraft, Knochen, Immunsystem und Testosteron.',
    tip: 'Fettlöslich – zur fetthaltigsten Mahlzeit des Vormittags, zusammen mit K2.',
    avoid: 'Nicht spät abends – kann bei manchen den Schlaf stören.' },
  vitk2: { when: 'Morgens, zusammen mit D3', how: 'fat',
    why: 'Lenkt Calcium in die Knochen statt in die Gefäße – das ideale Team mit Vitamin D3.',
    tip: 'Gleiche Mahlzeit wie D3, beide brauchen Fett.',
    avoid: 'Bei Blutverdünnern (z. B. Marcumar) nur nach Rücksprache mit dem Arzt.' },
  vitb12: { when: 'Morgens', how: 'any',
    why: 'Blutbildung, Nerven und Energie. Kommt fast nur aus tierischen Lebensmitteln.',
    tip: 'Wasserlöslich – braucht kein Fett. Nüchtern oder zum Frühstück, beides passt.',
    avoid: 'Nicht abends – wirkt bei manchen leicht anregend.' },
  iodine: { when: 'Morgens', how: 'meal',
    why: 'Treibstoff der Schilddrüse, die deinen Stoffwechsel und deine Energie steuert. In Deutschland oft knapp.',
    tip: 'Zum Frühstück – mit Essen gut verträglich.',
    avoid: 'Bei Schilddrüsenerkrankungen nur nach Rücksprache mit dem Arzt.' },
  omega3: { when: 'Mittags zur Hauptmahlzeit', how: 'fat',
    why: 'EPA und DHA wirken entzündungshemmend – gut für Sehnen, Gelenke, Herz und Regeneration.',
    tip: 'Zur fettreichsten Mahlzeit: bessere Aufnahme und kein fischiges Aufstoßen. Kapseln kühl und dunkel lagern.',
    avoid: '' },
  creatine: { when: 'Egal wann – Hauptsache täglich', how: 'any',
    why: 'Mehr Kraft und Sprintleistung, schnellere Erholung zwischen Sätzen und Sprints – das am besten belegte Supplement überhaupt.',
    tip: 'Gern nach dem Training in den Shake oder zu einer Mahlzeit mit Kohlenhydraten. Viel trinken.',
    avoid: 'Keine Ladephase nötig: 5 g täglich, auch an Ruhetagen.' },
  betaalanin: { when: 'Egal wann – wirkt über den Speicher', how: 'meal',
    why: 'Puffert Säure im Muskel → du hältst intensive Belastungen von 1–4 Minuten länger durch (Sprints, Basketball).',
    tip: 'Auf 2 Portionen à 2 g zu Mahlzeiten verteilen – dann kribbelt es kaum. Muss nicht direkt vors Training.',
    avoid: 'Das Kribbeln (Parästhesie) ist harmlos.' },
  whey: { when: 'Nach dem Training oder wenn Protein fehlt', how: 'any',
    why: 'Schnell verdauliches Protein, ca. 25 g pro Scoop – hilft, dein Protein-Ziel zu treffen.',
    tip: 'Mit Wasser geht es am schnellsten ins Blut, mit Milch sättigt es länger.',
    avoid: 'Abends lieber Magerquark oder Skyr – die wirken langsamer über die Nacht.' },
  magnesium: { when: 'Abends, 30–60 Min. vor dem Schlafen', how: 'any',
    why: 'Muskelentspannung, weniger Krämpfe, besserer Schlaf und Regeneration. Geht beim Schwitzen verloren.',
    tip: 'Glycinat ist sehr gut verträglich und wirkt zusätzlich beruhigend.',
    avoid: 'Nicht gleichzeitig mit Zink, Eisen oder Calcium in hoher Dosis – die konkurrieren um die Aufnahme.' },
  ashwagandha: { when: 'Abends', how: 'meal',
    why: 'Kann Stress (Cortisol) senken und Schlaf und Erholung verbessern.',
    tip: 'Zum Abendessen. Zyklisch nehmen, z. B. 8 Wochen, dann 2–4 Wochen Pause.',
    avoid: 'Bei Schilddrüsen-Medikamenten, Autoimmunerkrankungen oder Beruhigungsmitteln vorher Arzt fragen.' },
};

// Für selbst angelegte Supplements: Infos anhand des Namens
const SUPP_KEYWORDS = [
  [/zink|zinc/, { when: 'Abends', how: 'meal', why: 'Immunsystem, Testosteron und Heilung. Geht beim Schwitzen verloren.', tip: 'Zu einer Mahlzeit – nüchtern wird vielen übel.', avoid: 'Nicht zusammen mit Magnesium, Calcium oder Eisen.' }],
  [/eisen|iron/, { when: 'Morgens', how: 'empty', why: 'Sauerstofftransport im Blut – Ausdauer und Energie.', tip: 'Nüchtern mit Vitamin C (z. B. O-Saft) wird am meisten aufgenommen.', avoid: 'Kaffee, Tee, Milch und Calcium 1–2 h Abstand. Nur bei nachgewiesenem Mangel nehmen.' }],
  [/kollagen|collagen|gelatine/, { when: '30–60 Min. vor Training oder Reha', how: 'empty', why: 'Liefert Bausteine für Sehnen und Bänder – interessant für deine Patellasehne.', tip: '10–15 g mit ca. 50 mg Vitamin C, dann belasten (z. B. Reha-Übungen).', avoid: '' }],
  [/vitamin c|vit c|ascorbin/, { when: 'Egal wann', how: 'meal', why: 'Immunsystem, Kollagenbildung für Sehnen, bessere Eisenaufnahme.', tip: 'Zu einer Mahlzeit; mit Eisen-reichen Lebensmitteln kombinieren.', avoid: 'Hohe Dosen direkt nach dem Training können Anpassungen bremsen.' }],
  [/calcium|kalzium/, { when: 'Zu einer Mahlzeit', how: 'meal', why: 'Knochen und Muskelkontraktion.', tip: 'Höchstens 500 mg auf einmal.', avoid: 'Nicht zusammen mit Eisen oder Zink.' }],
  [/multi/, { when: 'Morgens', how: 'fat', why: 'Breite Absicherung gegen Lücken.', tip: 'Zum Frühstück mit etwas Fett – enthält fettlösliche Vitamine.', avoid: '' }],
  [/koffein|caffeine|pre.?workout|booster/, { when: '30–45 Min. vor dem Training', how: 'any', why: 'Mehr Wachheit, Kraft und Ausdauer.', tip: 'Ca. 3 mg pro kg reichen.', avoid: 'Nicht nach ca. 14–15 Uhr – stört sonst deinen Schlaf.' }],
  [/melatonin/, { when: '30–60 Min. vor dem Schlafen', how: 'any', why: 'Hilft beim Einschlafen.', tip: 'Niedrig dosieren (0,5–1 mg reicht oft).', avoid: 'Nicht dauerhaft ohne Grund.' }],
  [/kurkuma|curcum/, { when: 'Zu einer Mahlzeit', how: 'fat', why: 'Entzündungshemmend – Gelenke und Regeneration.', tip: 'Mit Fett und schwarzem Pfeffer (Piperin) wird es deutlich besser aufgenommen.', avoid: 'Bei Blutverdünnern vorher Arzt fragen.' }],
  [/elektrolyt|salz/, { when: 'Rund ums Training', how: 'any', why: 'Ersetzt, was du ausschwitzt – gegen Krämpfe in langen Einheiten.', tip: 'Ins Trinkwasser während oder nach dem Training.', avoid: '' }],
  [/casein/, { when: 'Abends vor dem Schlafen', how: 'any', why: 'Langsames Protein für die Nacht.', tip: 'Mit Milch oder Wasser als Pudding.', avoid: '' }],
  [/probiot/, { when: 'Morgens', how: 'meal', why: 'Unterstützt die Darmflora.', tip: 'Zum Frühstück.', avoid: '' }],
];

const TIME_TEXT = { morgens: 'Morgens', mittags: 'Mittags', pre: 'Rund ums Training', abends: 'Abends', egal: 'Egal wann' };
function guessHow(text) {
  const t = String(text || '').toLowerCase();
  if (/fett|öl|avocado|nüsse|eier/.test(t)) return 'fat';
  if (/nüchtern/.test(t)) return 'empty';
  if (/zum essen|mahlzeit|frühstück|mittagessen|abendessen/.test(t)) return 'meal';
  return 'any';
}

// Zusammengeführte Infos: eigene Angaben > Standardwissen > Name-Erkennung
export function suppInfo(supp) {
  const base = SUPP_INFO[supp.id] || (SUPP_KEYWORDS.find(([re]) => re.test(String(supp.name || '').toLowerCase())) || [])[1] || null;
  return {
    when: (base && base.when) || TIME_TEXT[supp.time || 'egal'],
    how: supp.how || (base && base.how) || guessHow(supp.takeWith),
    why: supp.why || (base && base.why) || '',
    tip: (base && base.tip) || supp.takeWith || '',
    avoid: (base && base.avoid) || '',
    known: !!base,
  };
}

// Fettquellen aus der eigenen Bibliothek (für „mit Fett nehmen")
export function fatPartners(foods, servingGrams, limit = 4) {
  const prefer = new Set(['Nüsse & Samen', 'Fisch', 'Protein', 'Milchprodukte', 'Obst', 'Gemüse']);
  return foods
    .filter(f => f.whole !== false && prefer.has(f.cat))
    .map(f => { const g = servingGrams(f); return { food: f, grams: g, fat: (f.per100.fat || 0) * g / 100, o3: (f.per100.omega3 || 0) * g / 100 }; })
    .filter(x => x.fat >= 6)
    .sort((a, b) => (b.fat + b.o3 / 400) - (a.fat + a.o3 / 400))
    .slice(0, limit);
}

// --- Was bringt dir ein Lebensmittel? -----------------------------------------
// Liste der Nährstoffe, die diese Menge nennenswert zum Tagesziel beiträgt
export function foodBenefits(food, grams, targets, { min = 10, limit = 6 } = {}) {
  const x = grams / 100;
  const good = [], warn = [];
  for (const n of NUTRIENTS) {
    if (n.key === 'kcal' || !targets[n.key]) continue;
    const pct = (food.per100[n.key] || 0) * x / targets[n.key] * 100;
    if (n.limit) { if (pct >= 25) warn.push({ key: n.key, label: n.label, pct, limit: true }); continue; }
    if (['carbs', 'fat'].includes(n.key)) continue; // Makros zeigt die Kopfzeile
    if (pct >= min) good.push({ key: n.key, label: n.label, pct, short: nutrientShort(n.key) });
  }
  good.sort((a, b) => b.pct - a.pct);
  return { good: good.slice(0, limit), warn };
}

// Ein-Satz-Fazit, falls kein eigener Text vorliegt
export function foodSummary(food, grams, targets) {
  if (food.benefit) return food.benefit;
  const { good } = foodBenefits(food, grams, targets, { min: 15, limit: 3 });
  const kcal = (food.per100.kcal || 0) * grams / 100;
  const prot = (food.per100.protein || 0) * grams / 100;
  const density = kcal > 0 ? prot * 4 / kcal : 0;
  const parts = [];
  if (density >= 0.3 && prot >= 10) parts.push('sehr viel Protein pro Kalorie');
  if (good.length) parts.push(good.filter(g => g.key !== 'protein').map(g => g.label).slice(0, 2).join(' und '));
  if (!parts.filter(Boolean).length) return kcal > 150 ? 'Liefert vor allem Energie.' : 'Leicht – wenig Kalorien, wenig drin.';
  return 'Bringt dir ' + parts.filter(Boolean).join(', dazu ') + '.';
}
