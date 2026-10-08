// ============================================================================
// Mikromaxxing – Assistent: versteht alles, was Fassi erzählt, trägt es an der
// richtigen Stelle ein und ist sein persönlicher Coach (Chat + Wochenrückblick).
// ============================================================================
import * as store from './store.js';
import { SPORT_TYPES, FOOD_CATS } from './data.js';
import { PERSONA, personaBrief, RECIPES } from './persona.js';
import { claudeJSON, coachModel, PER100_SCHEMA, toFood, hasAI } from './lookup.js';
import { parseEntry, buildIndex, fold } from './parser.js';
import { dayPlan, fmtH } from './planner.js';
import { missionsFor, levelInfo, totalXP, weeklyChallenge } from './game.js';

const SPORT_IDS = SPORT_TYPES.map(t => t.id);

// --- Schema: alles, was man an einem Tag eintragen kann ---------------------------
function logSchema() {
  const suppIds = store.getState().supplements.map(x => x.id);
  const dayOff = { type: 'integer' };
  const obj = (props) => ({ type: 'object', additionalProperties: false, required: Object.keys(props), properties: props });
  const arr = (props) => ({ type: 'array', items: obj(props) });
  return obj({
    reply: { type: 'string' },
    foods: arr({
      query: { type: 'string' }, name: { type: 'string' }, grams: { type: 'number' }, time: { type: 'string' }, day_offset: dayOff,
      cat: { type: 'string', enum: FOOD_CATS }, whole: { type: 'boolean' }, unit: { type: 'string', enum: ['piece', 'gram'] },
      pieceName: { type: 'string' }, pieceGrams: { type: 'number' }, aliases: { type: 'array', items: { type: 'string' } },
      benefit: { type: 'string' }, per100: PER100_SCHEMA,
    }),
    water: arr({ ml: { type: 'number' }, day_offset: dayOff }),
    supplements: arr({ id: { type: 'string', enum: suppIds.length ? suppIds : ['none'] }, day_offset: dayOff }),
    sessions: arr({ type: { type: 'string', enum: SPORT_IDS }, minutes: { type: 'number' }, rpe: { type: 'integer' }, title: { type: 'string' }, day_offset: dayOff }),
    steps: arr({ count: { type: 'integer' }, day_offset: dayOff }),
    sleep: arr({ hours: { type: 'number' }, day_offset: dayOff }),
    knee: arr({ score: { type: 'integer' }, day_offset: dayOff }),
    reha: arr({ day_offset: dayOff }),
    weight: arr({ kg: { type: 'number' }, day_offset: dayOff }),
    quick: { type: 'array', items: { type: 'string' } },
  });
}

// --- Was die KI über den aktuellen Stand wissen muss -----------------------------
export function buildContext(now = new Date()) {
  const s = store.getState();
  const key = store.todayKey(now);
  const wd = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][now.getDay()];
  const tg = store.macroTargets(key);
  const tot = store.computeTotals(key);
  const d = s.log[key] || { entries: [], supps: {}, sessions: [] };
  const plan = dayPlan(key, now);
  const r = (x) => Math.round(x);
  const lines = [];
  lines.push(`Jetzt: ${wd}, ${key}, ${now.toTimeString().slice(0, 5)} Uhr. Heute ist ein ${store.DAY_TYPES[tg.type].label}.`);
  lines.push(`Ziele heute: ${tg.kcal} kcal, ${tg.protein} g Protein, ${tg.carbs} g Carbs, ${tg.fat} g Fett. Gegessen: ${r(tot.kcal)} kcal, ${r(tot.protein)} g Protein, ${r(tot.carbs)} g Carbs, ${r(tot.fat)} g Fett, ${r(tot.fiber)} g Ballaststoffe. Wasser ${d.water || 0} ml von ${s.profile.water} ml.`);
  const eaten = (d.entries || []).map(e => { const f = store.foodById(e.foodId); return f ? `${e.ts ? new Date(e.ts).toTimeString().slice(0, 5) : '?'} ${f.name} ${e.grams} g` : null; }).filter(Boolean);
  lines.push(`Heute gegessen: ${eaten.length ? eaten.join('; ') : 'noch nichts'}.`);
  const taken = s.supplements.filter(x => d.supps && d.supps[x.id]).map(x => x.name);
  const open = s.supplements.filter(x => !(d.supps && d.supps[x.id])).map(x => `${x.name} (${x.time})`);
  lines.push(`Supplements genommen: ${taken.join(', ') || 'keine'}. Offen: ${open.join(', ') || 'keine'}.`);
  lines.push(`Training heute: ${plan.train ? `${plan.train.title} ab ${fmtH(plan.train.start)}` : 'frei'}. Eingetragen: ${(d.sessions || []).map(x => `${x.title} ${x.min} Min RPE ${x.rpe}`).join(', ') || 'nichts'}.`);
  lines.push(`Fahrplan: ${plan.slots.filter(x => x.type === 'meal' && x.target).map(x => `${fmtH(x.t)} ${x.title} ~${x.target.kcal} kcal/${x.target.protein} g P`).join('; ') || 'Essfenster für heute durch'}.`);
  lines.push(`Regeneration: Schlaf ${d.sleep != null ? d.sleep + ' h' : 'nicht eingetragen'}, Knie ${d.knee != null ? d.knee + '/10' : 'nicht eingetragen'}, Reha ${d.reha ? 'erledigt' : 'offen'}.`);
  const ms = missionsFor(key, now);
  if (ms.length) lines.push(`Missionen heute: ${ms.map(m => `${m.title} (${m.done ? 'geschafft' : m.label})`).join('; ')}.`);
  const wc = weeklyChallenge(key);
  lines.push(`Wochen-Challenge: ${wc.title} – ${wc.n}/${wc.goal}.`);
  const lv = levelInfo(totalXP());
  lines.push(`Level ${lv.level} (${lv.rank}).`);
  const week = [];
  for (let i = 7; i >= 1; i--) {
    const k = store.shiftDate(key, -i), dd = s.log[k];
    if (!dd) continue;
    const t = store.computeTotals(k);
    week.push(`${k}: ${r(t.kcal)}/${store.kcalTarget(k)} kcal, ${r(t.protein)} g P, ${(dd.sessions || []).map(x => x.title).join('+') || 'kein Training'}, Schlaf ${dd.sleep ?? '–'}, Knie ${dd.knee ?? '–'}`);
  }
  lines.push(`Letzte 7 Tage:\n${week.join('\n') || 'keine Daten'}`);
  const gp = store.goalProjection(key);
  lines.push(`Gewicht: aktuell ${gp.current ?? '?'} kg, Ziel ${gp.target} kg, Tempo ${gp.tempo}${gp.rate != null ? `, Trend ${gp.rate} kg/Woche` : ''}${gp.planDate ? `, Plan-Ziel ca. ${gp.planDate}` : ''}.`);
  const ng = store.nextGame(key);
  if (ng) lines.push(`Nächstes Spiel: ${ng.game.date} ${ng.game.time} ${ng.game.home ? 'vs' : '@'} ${ng.game.opponent}.`);
  const names = [...new Set([...store.getQuickPicks(25).map(q => q.food.name), ...RECIPES.map(x => x.name)])];
  lines.push(`Seine typischen Lebensmittel/Gerichte: ${names.join(', ')}.`);
  return lines.join('\n');
}

function systemPrompt(mode, now) {
  return `Du bist der persönliche Coach in „Mikromaxxing", einer App, die nur für ${PERSONA.name} gebaut wurde. Du kennst ihn:
${personaBrief()}

${PERSONA.tone}

Was du tust:
1. Wenn ${PERSONA.name} erzählt, was er gegessen, getrunken, trainiert, geschlafen oder eingenommen hat, trägst du es strukturiert ein (Arrays foods, water, supplements, sessions, steps, sleep, knee, reha, weight). Nur Dinge, die passiert sind – keine Pläne oder Fragen. Bei Fragen bleiben die Arrays leer.
2. Mengen ohne Angabe schätzt du realistisch (deutsche Portionen; „eine Portion Dönerfleisch" ≈ 250 g). foods: query = wie er es genannt hat, name = kurzer deutscher Name, grams = Gesamtmenge, time = Uhrzeit "HH:MM" wenn erkennbar (z. B. mittags 12:30, abends 20:00), sonst "". per100 = Nährwerte pro 100 g (kcal; protein/carbs/fat/fiber/sugar/satfat in g; vitA/vitD/vitK/vitB7/vitB9/vitB12/selenium/iodine in µg; übrige Vitamine/Mineralstoffe und omega3 in mg). unit "piece" mit pieceName/pieceGrams bei Stück-Lebensmitteln, sonst "gram", pieceName "", pieceGrams 0. Kaffee/Tee schwarz und Wasser sind keine foods (Wasser → water).
3. day_offset: 0 = heute, -1 = gestern usw. Schlaf gehört zu dem Tag, an dem er aufgewacht ist („heute Nacht 7 h" → 0). sessions.type aus der Liste, rpe 1–10 (Basketball-Training meist 7, Spiel 8), minutes = Dauer.
4. reply: ${mode === 'log'
    ? 'eine kurze Bestätigung in einem Satz, was du einträgst, plus höchstens ein konkreter Hinweis (z. B. was ihm heute noch fehlt).'
    : 'deine Antwort als Coach. Konkret, mit Zahlen aus seinen Daten, max. ca. 120 Wörter, außer er will mehr. Empfiehl Essen, das zu ihm passt (Bowls, Dönerfleisch-Teller, Lidl/Rewe, seine Gerichte). Kein Markdown außer kurzen Aufzählungen mit „–".'}
5. quick: 0–3 kurze Folgefragen oder Antworten, die er antippen könnte (aus seiner Sicht formuliert).
Keine medizinischen Diagnosen; bei Knieschmerz über 5/10 oder stechendem Schmerz zum Physio raten.

# Aktueller Stand
${buildContext(now)}`;
}

// --- Fragen & Eintragen ----------------------------------------------------------
export async function askCoach(text, { mode = 'chat', history = [], now = new Date() } = {}) {
  const messages = [];
  for (const m of history.slice(-10)) messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.text || '').slice(0, 2000) });
  messages.push({ role: 'user', content: text });
  // Abwechselnde Rollen sicherstellen
  const clean = [];
  for (const m of messages) { if (clean.length && clean[clean.length - 1].role === m.role) clean[clean.length - 1].content += '\n' + m.content; else clean.push({ ...m }); }
  if (clean[0].role !== 'user') clean.shift();
  const json = await claudeJSON({
    system: systemPrompt(mode, now), messages: clean, schema: logSchema(),
    maxTokens: mode === 'log' ? 12000 : 8000, model: mode === 'log' ? 'claude-haiku-5-5' : coachModel(),
  });
  return { reply: String(json.reply || '').trim(), items: normalize(json, now), quick: (json.quick || []).slice(0, 3) };
}

// KI-Ergebnis → Vorschau-Posten (bekannte Lebensmittel aus der Bibliothek bevorzugt)
export function normalize(json, now = new Date()) {
  const today = store.todayKey(now);
  const dayKey = (o) => store.shiftDate(today, Math.max(-14, Math.min(0, Math.round(Number(o) || 0))));
  const index = buildIndex(store.getState());
  const items = [];
  let n = 0;
  const id = () => 'ai' + (n++);
  for (const f of json.foods || []) {
    const grams = Math.max(1, Math.round(Number(f.grams) || 0));
    if (!grams) continue;
    const parsed = parseEntry(f.query || f.name, null, index);
    const hit = parsed.length === 1 && parsed[0].type === 'food' && parsed[0].confidence === 'high' ? store.foodById(parsed[0].foodId) : null;
    const byName = !hit && store.getState().foods.find(x => fold(x.name) === fold(f.name));
    const known = hit || byName;
    items.push({ id: id(), kind: 'food', day: dayKey(f.day_offset), time: /^\d{1,2}:\d{2}$/.test(f.time || '') ? f.time : '', grams,
      foodId: known ? known.id : null, food: known ? null : toFood({ ...f, found: true, portionGrams: f.unit === 'piece' ? f.pieceGrams : grams }) });
  }
  for (const w of json.water || []) if (w.ml > 0) items.push({ id: id(), kind: 'water', day: dayKey(w.day_offset), ml: Math.round(w.ml) });
  for (const x of json.supplements || []) if (store.getState().supplements.some(sp => sp.id === x.id)) items.push({ id: id(), kind: 'supp', day: dayKey(x.day_offset), suppId: x.id });
  for (const x of json.sessions || []) if (x.minutes > 0) items.push({ id: id(), kind: 'session', day: dayKey(x.day_offset), type: SPORT_IDS.includes(x.type) ? x.type : 'other', min: Math.round(x.minutes), rpe: Math.max(1, Math.min(10, Math.round(x.rpe) || 6)), title: x.title || '' });
  for (const x of json.steps || []) if (x.count > 0) items.push({ id: id(), kind: 'steps', day: dayKey(x.day_offset), count: Math.round(x.count) });
  for (const x of json.sleep || []) if (x.hours > 0 && x.hours <= 14) items.push({ id: id(), kind: 'sleep', day: dayKey(x.day_offset), hours: Math.round(x.hours * 4) / 4 });
  for (const x of json.knee || []) if (x.score >= 0 && x.score <= 10) items.push({ id: id(), kind: 'knee', day: dayKey(x.day_offset), score: Math.round(x.score) });
  for (const x of json.reha || []) items.push({ id: id(), kind: 'reha', day: dayKey(x.day_offset) });
  for (const x of json.weight || []) if (x.kg > 30 && x.kg < 250) items.push({ id: id(), kind: 'weight', day: dayKey(x.day_offset), kg: Math.round(x.kg * 10) / 10 });
  return items;
}

// --- Ohne KI: einfache Muster für Schlaf, Knie, Training, Schritte, Gewicht --------------
const SPORT_WORDS = [
  [/basketball|bball|korbball/, 'basketball'], [/\bspiel\b/, 'game'], [/gym|fitness|krafttraining|workout|pumpen/, 'gym'],
  [/schwimm/, 'swim'], [/sprint/, 'sprint'], [/yoga/, 'yoga'], [/joggen|laufen|gelaufen|lauf\b/, 'run'], [/spazier/, 'walk'],
];
export function localIntents(text, now = new Date()) {
  const items = [];
  let rest = ' ' + fold(text).replace(/(\d),(\d)/g, '$1.$2') + ' ';
  const today = store.todayKey(now);
  const yest = /gestern/.test(rest);
  const day = yest ? store.shiftDate(today, -1) : today;
  let n = 0;
  const take = (re) => { const m = rest.match(re); if (m) rest = rest.replace(m[0], ' , '); return m; };
  let m;
  if ((m = take(/(\d+(?:\.\d+)?)\s*(?:h|std|stunden?)\s*(?:lang\s*)?(?:geschlafen|schlaf)/)) || (m = take(/(?:geschlafen|schlaf)\w*\s*(\d+(?:\.\d+)?)\s*(?:h|std|stunden?)?/))) {
    const h = Number(m[1]); if (h > 0 && h <= 14) items.push({ id: 'li' + n++, kind: 'sleep', day: today, hours: Math.round(h * 4) / 4 });
  }
  if ((m = take(/knie\w*\s*(?:bei|auf|ist|so|heute)?\s*(\d{1,2})(?:\s*(?:\/|von)\s*10)?/))) {
    const sc = Number(m[1]); if (sc <= 10) items.push({ id: 'li' + n++, kind: 'knee', day, score: sc });
  }
  if ((m = take(/(\d{3,6}(?:\.\d{3})?)\s*schritte/))) items.push({ id: 'li' + n++, kind: 'steps', day, count: Math.round(Number(m[1].replace('.', ''))) });
  if ((m = take(/(?:gewicht|wiege|gewogen|waage)\D{0,12}(\d{2,3}(?:\.\d)?)\s*(?:kg|kilo)?/)) || (m = take(/(\d{2,3}\.\d)\s*(?:kg|kilo)\b/))) {
    const kg = Number(m[1]); if (kg > 40 && kg < 200) items.push({ id: 'li' + n++, kind: 'weight', day, kg });
  }
  if ((m = take(/(?:knie.?)?reha\s*(?:gemacht|erledigt|fertig)?|wall\s*sit\w*|spanish\s*squat\w*/))) items.push({ id: 'li' + n++, kind: 'reha', day });
  for (const [re, type] of SPORT_WORDS) {
    const r2 = new RegExp(`(?:(\\d+(?:\\.\\d+)?)\\s*(min|minuten|h|std|stunden?)\\s*)?(?:\\w+\\s){0,2}?(${re.source})\\w*(?:\\s*(?:fur|für)?\\s*(\\d+(?:\\.\\d+)?)\\s*(min|minuten|h|std|stunden?))?`);
    const mm = rest.match(r2);
    if (!mm || !mm[3]) continue;
    rest = rest.replace(mm[0], ' , ');
    const num = mm[1] || mm[4], unit = mm[2] || mm[5];
    const min = num ? Math.round(Number(num) * (/^h|std|stund/.test(unit) ? 60 : 1)) : store.sportType(type).min;
    items.push({ id: 'li' + n++, kind: 'session', day, type, min, rpe: type === 'walk' ? 3 : type === 'game' ? 8 : 7, title: '' });
  }
  rest = rest.replace(/\bgestern\b|\bheute\b|\bnacht\b|\bgemacht\b|\bwar\b|\bhart\b|\blocker\b/g, ' ');
  return { items, rest: rest.replace(/\s+/g, ' ').trim() };
}

// --- Vorschau → Speichern (mit Rückgängig) --------------------------------------------
export function describe(it) {
  const st = store.getState();
  switch (it.kind) {
    case 'food': { const f = it.food || store.foodById(it.foodId); return { area: 'Essen', icon: 'apple', title: f ? f.name : '?', sub: `${it.grams} g${it.time ? ' · ' + it.time : ''}${f ? ` · ${Math.round((f.per100.kcal || 0) * it.grams / 100)} kcal · ${Math.round((f.per100.protein || 0) * it.grams / 100)} g P` : ''}`, isNew: !!it.food }; }
    case 'water': return { area: 'Essen', icon: 'drop', title: 'Wasser', sub: `${it.ml} ml` };
    case 'supp': { const sp = st.supplements.find(x => x.id === it.suppId); return { area: 'Essen', icon: 'pill', title: sp ? sp.name : it.suppId, sub: 'genommen' }; }
    case 'session': return { area: 'Sport', icon: store.sportType(it.type).icon, title: it.title || store.sportType(it.type).label, sub: `${it.min} Min · Intensität ${it.rpe}/10` };
    case 'steps': return { area: 'Sport', icon: 'steps', title: 'Schritte', sub: it.count.toLocaleString('de-DE') };
    case 'sleep': return { area: 'Regeneration', icon: 'moon', title: 'Schlaf', sub: `${String(it.hours).replace('.', ',')} h` };
    case 'knee': return { area: 'Regeneration', icon: 'knee', title: 'Knie-Check', sub: `${it.score}/10` };
    case 'reha': return { area: 'Regeneration', icon: 'timer', title: 'Knie-Reha', sub: 'erledigt' };
    case 'weight': return { area: 'Körper', icon: 'scale', title: 'Gewicht', sub: `${String(it.kg).replace('.', ',')} kg` };
    default: return { area: 'Sonstiges', icon: 'info', title: it.kind, sub: '' };
  }
}

export function applyItems(items, now = new Date()) {
  const s = store.getState();
  const days = [...new Set(items.map(i => i.day))];
  const snap = Object.fromEntries(days.map(k => [k, s.log[k] ? structuredClone(s.log[k]) : null]));
  const created = [];
  const madeByName = {};
  for (const it of items) {
    const k = it.day;
    switch (it.kind) {
      case 'food': {
        let fid = it.foodId;
        if (!fid && it.food) {
          const nm = fold(it.food.name);
          fid = madeByName[nm] || (store.getState().foods.find(x => fold(x.name) === nm) || {}).id;
          if (!fid) { fid = store.saveNewFood(it.food).id; created.push(fid); madeByName[nm] = fid; }
        }
        let ts = now.getTime();
        if (it.time) { const [h, m] = it.time.split(':').map(Number); const d = store.dateOf(k); d.setHours(h, m, 0, 0); ts = d.getTime(); }
        else if (k !== store.todayKey(now)) { const d = store.dateOf(k); d.setHours(13, 0, 0, 0); ts = d.getTime(); }
        store.addEntry(k, fid, it.grams, ts);
        break;
      }
      case 'water': store.addWater(k, it.ml); break;
      case 'supp': store.setSupp(k, it.suppId, true); break;
      case 'session': store.addSession(k, { type: it.type, min: it.min, rpe: it.rpe, title: it.title || undefined }); break;
      case 'steps': store.setSteps(k, Math.max(it.count, store.getSteps(k))); break;
      case 'sleep': store.setSleep(k, it.hours); break;
      case 'knee': store.setDayMeta(k, 'knee', it.score); break;
      case 'reha': if (!store.getDay(k).reha) store.toggleReha(k); break;
      case 'weight': store.setWeight(k, it.kg); break;
      default: break;
    }
  }
  return () => {
    const st = store.getState();
    for (const [k, v] of Object.entries(snap)) { if (v) st.log[k] = v; else delete st.log[k]; }
    for (const fid of created) store.deleteFood(fid);
    store.save();
  };
}

// --- Chat-Verlauf ---------------------------------------------------------------------
export function chatHistory() { return store.getState().chat || []; }
export function pushChat(msg) {
  const s = store.getState();
  s.chat.push({ ...msg, ts: Date.now() });
  if (s.chat.length > 60) s.chat.splice(0, s.chat.length - 60);
  store.save();
}
export function clearChat() { store.getState().chat = []; store.save(); }

// --- Wochenrückblick -------------------------------------------------------------------
const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['headline', 'good', 'focus', 'mission'],
  properties: { headline: { type: 'string' }, good: { type: 'array', items: { type: 'string' } }, focus: { type: 'array', items: { type: 'string' } }, mission: { type: 'string' } },
};
export function weekData(wk) {
  const s = store.getState();
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const k = store.shiftDate(wk, i), d = s.log[k];
    const t = store.computeTotals(k);
    rows.push(`${k}: ${Math.round(t.kcal)}/${store.kcalTarget(k)} kcal (${store.inBudget(k) ? 'im Budget' : 'drüber/leer'}), ${Math.round(t.protein)} g Protein, Ringe ${store.ringSummary(k).pct} %, Training: ${d ? (d.sessions || []).map(x => `${x.title} ${x.min}′`).join('+') || '–' : '–'}, Schlaf ${d && d.sleep != null ? d.sleep : '–'} h, Knie ${d && d.knee != null ? d.knee : '–'}, Reha ${d && d.reha ? 'ja' : 'nein'}, spät gegessen: ${d && d.entries.some(e => e.ts && new Date(e.ts).getHours() >= 22) ? 'ja' : 'nein'}`);
  }
  const w = store.weeklySummary(store.shiftDate(wk, 6));
  rows.push(`Gewicht Ø ${w.wNow ?? '–'} kg (Vorwoche ${w.wPrev ?? '–'}).`);
  return rows.join('\n');
}
export async function weeklyReview(wk) {
  const json = await claudeJSON({
    system: `Du bist der persönliche Coach von ${PERSONA.name}.\n${personaBrief()}\n${PERSONA.tone}\nSchreib einen Wochenrückblick: headline (ein Satz, ehrlich), good (2–3 konkrete Dinge, die gut liefen, mit Zahlen), focus (genau 3 konkrete, machbare Tipps für nächste Woche, passend zu seinem Alltag), mission (eine Wochen-Mission in einem Satz).`,
    messages: [{ role: 'user', content: `Meine Woche ab ${wk}:\n${weekData(wk)}` }],
    schema: REVIEW_SCHEMA, maxTokens: 6000, model: coachModel(),
  });
  const s = store.getState();
  s.reviews[wk] = { ...json, at: Date.now() };
  store.save();
  return s.reviews[wk];
}
export function getReview(wk) { return store.getState().reviews[wk] || null; }
export { hasAI };
