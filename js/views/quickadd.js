// ============================================================================
// Eintragen per Satz, Sprache oder Barcode
// Unbekanntes schlägt Claude nach – als Vorschau, gespeichert wird erst beim
// Bestätigen.
// ============================================================================
import * as store from '../store.js';
import { NUTRIENTS } from '../data.js';
import { parseEntry, buildIndex, amountLabel, defaultGrams, amountFromRaw, originalPhrase } from '../parser.js';
import { estimateFoods, hasAI } from '../lookup.js';
import { icon } from '../icons.js';
import { $, $$, esc, de, short, openSheet, closeSheet, sheetHead, toast, router, haptic, confetti, foodIcon } from '../ui.js';
import { openFoodEditor, openFoodPicker } from './food.js';
import { scanAndAdd } from './scan.js';
import { openAiSetup } from './aisetup.js';
import { localIntents, askCoach, applyItems, describe } from '../assistant.js';

import { createDictation, hasVoice } from '../voice.js';
const SR = hasVoice();
const MICRO_KEYS = NUTRIENTS.filter(n => n.group === 'vitamin' || n.group === 'mineral' || n.key === 'omega3').map(n => n.key);

export function openQuickAdd({ key = store.todayKey(), text = '', voice = false, scan = false } = {}) {
  let index = buildIndex(store.getState());
  let items = [];
  const overrides = {};   // pro Satzteil: { foodId, grams, portions, ml, removed, lookup }
  const lookups = {};     // pro unbekannter Phrase: { status: 'loading'|'done'|'error'|'none', food, error }
  const extras = [];      // gescannte Produkte
  let editing = null;     // aufgeklappter Posten (Index)
  let ai = null;          // Claude-Ergebnis: { status, items, reply, error }
  let dict = null;

  const sheet = openSheet(`
    ${sheetHead('Schnell eintragen', key === store.todayKey() ? 'Scannen, suchen oder kurz tippen' : store.formatDateLabel(key))}
    <div class="qa-input" id="qa-input">
      <textarea class="qa-text" id="qa-text" rows="2" placeholder="z. B. mittags Bowl mit Hähnchen, 90 Min Basketball, 7 h geschlafen, Knie 3" autocapitalize="sentences" enterkeyhint="done"></textarea>
      <div class="qa-bar">
        <span class="qa-status" id="qa-status"></span>
        <button class="qa-mic" id="qa-mic" aria-label="Sprechen">${icon('mic')}</button>
      </div>
    </div>
    <div class="sheet-body" id="qa-body"></div>
    <div class="sheet-foot" id="qa-foot"></div>
  `, { tall: true, onClose: stopVoice });

  const ta = $('#qa-text', sheet);
  const body = $('#qa-body', sheet);
  const foot = $('#qa-foot', sheet);
  ta.value = text;
  let t = null;
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
  ta.addEventListener('input', () => { grow(); ai = null; clearTimeout(t); t = setTimeout(update, 110); });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); update(); smartRun(); }
  });
  $('#qa-mic', sheet).onclick = () => (dict && dict.on ? dict.finish() : startVoice());

  const idleStatus = () => (SR ? 'Mikro antippen zum Sprechen' : 'Tipp: Diktieren über das Tastatur-Mikro');
  $('#qa-status', sheet).textContent = idleStatus();

  // ---------- Sprache ----------
  function setRec(on) {
    if (!sheet.isConnected) return;
    $('#qa-input', sheet).classList.toggle('listening', on);
    const mic = $('#qa-mic', sheet);
    mic.classList.toggle('on', on);
    mic.innerHTML = on ? `${icon('check')}<span>Fertig</span>` : icon('mic');
    const st = $('#qa-status', sheet);
    st.classList.toggle('listening', on);
    st.innerHTML = on ? '<i></i>Ich höre zu …' : idleStatus();
  }
  function startVoice() {
    if (!dict) dict = createDictation({
      onText: (t) => { ta.value = t; update(); },
      onState: (on) => setRec(on),
      onDone: (t) => { if (t && sheet.isConnected) smartRun(); },
      onError: (msg) => { ta.focus(); toast(msg); },
    });
    if (!SR || !dict.start(ta.value)) { ta.focus(); toast('Tippe auf das Mikrofon deiner Tastatur und sprich los'); return; }
    haptic();
  }
  function stopVoice() { if (dict) dict.cancel(); }

  // ---------- Scannen ----------
  function startScan() {
    stopVoice();
    scanAndAdd({
      title: 'Zur Liste',
      onAdd: ({ foodId, grams }) => {
        index = buildIndex(store.getState());
        extras.push({ raw: '#scan' + Date.now(), type: 'food', foodId, grams, scanned: true });
        update();
      },
    });
  }

  // ---------- Erkennen ----------
  // Claude nur, wenn's lokal nicht reicht (Unbekanntes oder lange Erzählung)
  function smartRun() {
    if (!ta.value.trim()) return;
    const long = ta.value.trim().split(/\s+/).length > 14;
    // Lange Erzählung → Claude sortiert alles; sonst nur Unbekanntes einzeln nachschlagen (mit Werte-Vorschau)
    if (hasAI() && long) runAI();
    else lookupUnknown();
  }
  async function runAI() {
    stopVoice();
    const text = ta.value.trim();
    if (!text) return;
    if (!hasAI()) return openAiSetup(() => { if (hasAI()) runAI(); });
    ai = { status: 'loading', text };
    render();
    try {
      const r = await askCoach(text, { mode: 'log' });
      if (!ai || ai.text !== text) return;
      ai = { status: 'done', text, items: r.items, reply: r.reply };
    } catch (e) {
      if (!ai || ai.text !== text) return;
      ai = { status: 'error', text, error: e.message || 'Hat nicht geklappt' };
    }
    if (sheet.isConnected) render();
  }

  function update() {
    grow();
    const li = localIntents(ta.value);
    const intents = li.items.map((it, i) => ({ raw: '#i' + it.kind + i, type: 'intent', it }));
    const parsed = [...intents, ...parseEntry(li.rest, null, index), ...extras];
    items = parsed.map(it => {
      const o = overrides[it.raw];
      if (o && o.removed) return null;
      if (o && o.foodId) return { raw: it.raw, type: 'food', foodId: o.foodId, grams: o.grams ?? defaultGrams(store.foodById(o.foodId)), estimated: false, scanned: it.scanned };
      // „Falsch erkannt? Nachschlagen" → wie unbekannt behandeln
      if (o && o.lookup) it = { raw: it.raw, type: 'unknown', phrase: o.lookup, suggestions: [] };
      if (it.type === 'unknown') {
        const lk = lookups[it.phrase];
        if (lk && lk.status === 'done') {
          const grams = o && 'grams' in o ? o.grams : amountFromRaw(lk.food, it.raw);
          return { raw: it.raw, type: 'new', phrase: it.phrase, food: lk.food, grams };
        }
        return { ...it, lookup: lk || null };
      }
      if (!o) return it;
      return { ...it, ...('grams' in o ? { grams: o.grams, estimated: false } : {}), ...('portions' in o ? { portions: o.portions } : {}), ...('ml' in o ? { ml: o.ml, estimated: false } : {}) };
    }).filter(Boolean);
    render();
  }

  // Alle offenen Unbekannten in einem Rutsch nachschlagen
  async function lookupUnknown(force = false) {
    const open = [...new Set(items.filter(it => it.type === 'unknown' && (!lookups[it.phrase] || (force && lookups[it.phrase].status === 'error'))).map(it => it.phrase))];
    if (!open.length) return;
    if (!hasAI()) {
      if (force) openAiSetup(() => { if (hasAI()) lookupUnknown(true); });
      return;
    }
    for (const p of open) lookups[p] = { status: 'loading' };
    update();
    try {
      const res = await estimateFoods(open, { context: ta.value });
      for (const p of open) {
        const r = res.get(p);
        lookups[p] = !r ? { status: 'error', error: 'Keine Antwort erhalten' }
          : r.notFood ? { status: 'none' } : { status: 'done', food: r.food };
      }
    } catch (e) {
      for (const p of open) lookups[p] = { status: 'error', error: e.message || 'Nachschlagen fehlgeschlagen' };
      if (e.code === 'auth' || e.code === 'nokey') toast('Claude-Key prüfen: Einstellungen → Nachschlagen mit Claude');
    }
    if (sheet.isConnected) update();
  }

  function itemNutrients(it) {
    if (it.type === 'food' || it.type === 'new') {
      const f = it.type === 'new' ? it.food : store.foodById(it.foodId);
      if (!f) return { kcal: 0, protein: 0 };
      return { kcal: f.per100.kcal * it.grams / 100, protein: f.per100.protein * it.grams / 100 };
    }
    if (it.type === 'meal') {
      const m = store.mealById(it.mealId);
      const tt = m ? store.mealTotals(m) : { kcal: 0, protein: 0 };
      return { kcal: tt.kcal * it.portions, protein: tt.protein * it.portions };
    }
    return { kcal: 0, protein: 0 };
  }

  function unknownHtml(it, i) {
    const lk = it.lookup;
    const shown = originalPhrase(ta.value, it.phrase);
    const sugg = (it.suggestions || []).map(store.foodById).filter(Boolean);
    if (lk && lk.status === 'loading') {
      return `<div class="qa-unknown loading"><div class="qa-uh">${icon('loader', 'spin')}<b>Schlage „${esc(shown)}" nach …</b></div></div>`;
    }
    const msg = lk && lk.status === 'none' ? `„${esc(shown)}" ist kein Lebensmittel, oder?`
      : lk && lk.status === 'error' ? `„${esc(shown)}": ${esc(lk.error)}`
        : `„${esc(shown)}" kenne ich noch nicht`;
    const canLookup = !lk || lk.status === 'error';
    return `<div class="qa-unknown">
      <div class="qa-uh"><b>${msg}</b><button class="qa-rm" data-rm="${i}" aria-label="Entfernen">${icon('x')}</button></div>
      <div class="chips">
        ${canLookup ? `<button class="chipbtn ai" data-lookup="${i}">${icon('spark')}${lk ? 'Nochmal versuchen' : 'Nachschlagen'}</button>` : ''}
        ${sugg.map(f => `<button class="chipbtn" data-assign="${i}" data-food="${f.id}">${esc(short(f.name))}</button>`).join('')}
        <button class="chipbtn" data-create="${i}">${icon('plus')}Selbst anlegen</button>
      </div>
    </div>`;
  }

  function rowHtml(it, i) {
    if (it.type === 'unknown') return unknownHtml(it, i);
    if (it.type === 'intent') {
      const d = describe(it.it);
      return `<div><div class="qa-item"><span class="fico c-${d.area === 'Sport' ? 'water' : d.area === 'Regeneration' ? 'snack' : 'zero'}">${icon(d.icon)}</span>
        <div class="qa-main"><div class="qa-nm">${esc(d.title)}</div><div class="qa-am">${esc(d.area)} · ${esc(d.sub)}${it.it.day !== key ? ' · ' + esc(store.formatDateLabel(it.it.day)) : ''}</div></div>
        <button class="qa-rm" data-rm="${i}" aria-label="Entfernen">${icon('x')}</button></div></div>`;
    }
    const open = editing === i;
    let ico, name, amount, kv = '', badge = '';
    if (it.type === 'food' || it.type === 'new') {
      const f = it.type === 'new' ? it.food : store.foodById(it.foodId);
      const n = itemNutrients(it);
      ico = foodIcon(f); name = short(f.name);
      if (it.type === 'new') badge = `<em class="qa-new">${icon('spark')}neu</em>`;
      else if (it.scanned) badge = `<em class="qa-new scanned">${icon('barcode')}Scan</em>`;
      amount = `${esc(amountLabel(f, it.grams))}${it.estimated ? '<em class="qa-est">geschätzt</em>' : ''}${it.confidence === 'low' ? '<em class="qa-est">prüfen</em>' : ''}`;
      kv = `<div class="qa-kv"><b class="num">${de(n.protein)} g</b><span>${de(n.kcal)} kcal</span></div>`;
    } else if (it.type === 'meal') {
      const m = store.mealById(it.mealId);
      const n = itemNutrients(it);
      ico = `<span class="fico c-meal">${icon('bowl')}</span>`; name = m ? m.name : 'Mahlzeit';
      amount = `${de(it.portions, it.portions % 1 ? 1 : 0)} Portion${it.portions === 1 ? '' : 'en'} · ${m ? m.items.length : 0} Zutaten`;
      kv = `<div class="qa-kv"><b class="num">${de(n.protein)} g</b><span>${de(n.kcal)} kcal</span></div>`;
    } else if (it.type === 'water') {
      ico = `<span class="fico c-water">${icon('drop')}</span>`; name = 'Wasser';
      amount = `+ ${de(it.ml)} ml${it.estimated ? '<em class="qa-est">geschätzt</em>' : ''}`;
    } else if (it.type === 'supp') {
      const sp = store.getState().supplements.find(x => x.id === it.suppId);
      const taken = !!store.getDay(key).supps[it.suppId];
      ico = `<span class="fico c-supp">${icon('pill')}</span>`; name = sp ? sp.name : it.suppId;
      amount = taken ? 'schon abgehakt' : 'wird abgehakt';
    } else {
      ico = `<span class="fico c-zero">${icon('coffee')}</span>`;
      name = it.label.charAt(0).toUpperCase() + it.label.slice(1);
      amount = '0 kcal · zählt nicht';
    }
    const editable = ['food', 'new', 'meal', 'water'].includes(it.type);
    return `<div class="${it.type === 'new' ? 'qa-newwrap' : ''}">
      <div class="qa-item">
        ${ico}
        <button class="qa-main" ${editable ? `data-edit="${i}"` : ''} style="text-align:left">
          <div class="qa-nm">${esc(name)}${badge}</div><div class="qa-am">${amount}</div>
        </button>
        ${kv}
        <button class="qa-rm" data-rm="${i}" aria-label="Entfernen">${icon('x')}</button>
      </div>
      ${open ? editorHtml(it, i) : ''}
    </div>`;
  }

  function editorHtml(it, i) {
    let label;
    if (it.type === 'food' || it.type === 'new') {
      const f = it.type === 'new' ? it.food : store.foodById(it.foodId);
      label = f.piece ? `${de(it.grams / f.piece.g, (it.grams / f.piece.g) % 1 ? 1 : 0)}<small>${esc(f.piece.name.toUpperCase())} · ${it.grams} G</small>` : `${it.grams}<small>GRAMM</small>`;
    } else if (it.type === 'meal') label = `${de(it.portions, it.portions % 1 ? 1 : 0)}<small>PORTIONEN</small>`;
    else label = `${de(it.ml)}<small>ML</small>`;
    let extra = '';
    if (it.type === 'new') {
      const f = it.food, tg = store.getState().profile.targets;
      const x = it.grams / 100;
      const top = MICRO_KEYS.map(k => ({ k, pct: tg[k] ? (f.per100[k] || 0) * x / tg[k] * 100 : 0 }))
        .filter(m => m.pct >= 8).sort((a, b) => b.pct - a.pct).slice(0, 4);
      extra = `<div class="qa-preview">
        <div class="qa-p100"><span>pro 100 g</span><b>${de(f.per100.kcal)} kcal</b><b>${de(f.per100.protein, 1)} P</b><b>${de(f.per100.carbs, 1)} C</b><b>${de(f.per100.fat, 1)} F</b></div>
        ${top.length ? `<div class="chips">${top.map(m => `<span class="chip">${esc(NUTRIENTS.find(n => n.key === m.k).label)} ${Math.round(m.pct)} %</span>`).join('')}</div>` : ''}
        ${f.benefit ? `<p class="hint" style="margin:8px 0 0">${esc(f.benefit)}</p>` : ''}
        <div class="qa-src">${icon('spark')}Von Claude geschätzt${f.confidence === 'niedrig' ? ' · stark schwankend, gern prüfen' : ''}
          <button class="more" data-refine="${i}">Werte bearbeiten${icon('chev')}</button></div>
      </div>`;
    } else if (it.type === 'food' && it.confidence === 'low' && !it.scanned) {
      extra = `<button class="chipbtn ai" data-wrong="${i}" style="margin-bottom:10px">${icon('spark')}Falsch erkannt? „${esc(it.phrase || it.raw)}" nachschlagen</button>`;
    }
    return `<div class="stepper" style="margin:2px 0 10px">
      <button class="st-btn" data-step="${i}" data-dir="-1">${icon('minus')}</button>
      <div class="st-val num">${label}</div>
      <button class="st-btn" data-step="${i}" data-dir="1">${icon('plus')}</button>
    </div>${extra}`;
  }

  function stepItem(i, dir) {
    const it = items[i];
    const o = overrides[it.raw] || (overrides[it.raw] = {});
    if (it.type === 'food' || it.type === 'new') {
      const f = it.type === 'new' ? it.food : store.foodById(it.foodId);
      const step = f.piece ? f.piece.g : (it.grams < 60 ? 5 : it.grams < 150 ? 10 : 25);
      if (it.type === 'food') o.foodId = it.foodId;
      o.grams = Math.max(step, it.grams + dir * step);
    } else if (it.type === 'meal') {
      o.portions = Math.max(0.5, (it.portions || 1) + dir * 0.5);
    } else if (it.type === 'water') {
      o.ml = Math.max(100, it.ml + dir * 250);
    }
    haptic(5);
    update();
  }

  function quickChips() {
    const yesterday = store.shiftDate(key, -1);
    const yDay = store.getState().log[yesterday];
    const tiles = `<div class="qa-tiles">
      <button data-qtile="scan">${icon('barcode')}<span>Scannen</span></button>
      <button data-qtile="search">${icon('search')}<span>Suchen</span></button>
      ${yDay && yDay.entries.length ? `<button data-copy="${yesterday}">${icon('repeat')}<span>Wie gestern</span></button>` : `<button data-qtile="meals">${icon('bowl')}<span>Mahlzeit</span></button>`}
    </div>`;
    const chips = [];
    if (store.getDayTemplate().length) chips.push(`<button class="chipbtn" data-template>${icon('pin')}Standardtag</button>`);
    for (const m of store.getMeals()) chips.push(`<button class="chipbtn" data-append="${esc(m.name)}">${icon('bowl')}${esc(m.name)}</button>`);
    const seen = new Set();
    const picks = [...store.getFavorites(), ...store.getQuickPicks(8)].filter(q => !seen.has(q.food.id) && seen.add(q.food.id)).slice(0, 6);
    for (const q of picks) chips.push(`<button class="chipbtn" data-append="${q.grams} g ${esc(short(q.food.name))}">${store.isFavorite(q.food.id) ? icon('star') : ''}${esc(short(q.food.name))}</button>`);
    return `${tiles}
      ${chips.length ? `<div class="sec-title">Zuletzt</div><div class="chips">${chips.join('')}</div>` : ''}
      <p class="hint" style="margin-top:16px">Einfach normal sagen oder schreiben – Essen, Training, Schlaf, Knie. Ich sortiere es ein.${hasAI() ? '' : ' <button class="more" id="qa-ai-setup" style="display:inline-flex">Claude einrichten →</button>'}</p>`;
  }

  function renderAI() {
    if (ai.status === 'loading') {
      body.innerHTML = `<div class="lookup-wait">${icon('loader', 'spin')}<span>Claude sortiert alles ein …</span></div>`;
      foot.innerHTML = `<button class="btn block" disabled>${icon('loader', 'spin')}Einen Moment …</button>`;
      return;
    }
    if (ai.status === 'error') {
      body.innerHTML = `<div class="qa-unknown"><div class="qa-uh"><b>${esc(ai.error)}</b></div>
        <div class="chips"><button class="chipbtn ai" id="ai-retry">${icon('refresh')}Nochmal</button><button class="chipbtn" id="ai-local">Ohne Claude weiter</button></div></div>`;
      foot.innerHTML = '';
      $('#ai-retry', body).onclick = () => runAI();
      $('#ai-local', body).onclick = () => { ai = null; update(); };
      return;
    }
    const groups = {};
    ai.items.forEach((it, i) => { const d = describe(it); (groups[d.area] = groups[d.area] || []).push({ it, d, i }); });
    body.innerHTML = `${ai.reply ? `<div class="ai-reply">${icon('spark')}<span>${esc(ai.reply)}</span></div>` : ''}
      ${ai.items.length ? Object.entries(groups).map(([area, list]) => `<div class="sec-title">${esc(area)}<span>${list.length}</span></div>
        <div class="qa-list">${list.map(({ it, d, i }) => `<div class="qa-item"><span class="fico ${area === 'Essen' ? 'c-gemuse' : area === 'Sport' ? 'c-water' : area === 'Regeneration' ? 'c-snack' : 'c-zero'}">${icon(d.icon)}</span>
          <div class="qa-main"><div class="qa-nm">${esc(d.title)}${d.isNew ? `<em class="qa-new">${icon('spark')}neu</em>` : ''}</div><div class="qa-am">${esc(d.sub)}${it.day !== key ? ' · ' + esc(store.formatDateLabel(it.day)) : ''}</div></div>
          <button class="qa-rm" data-airm="${i}" aria-label="Entfernen">${icon('x')}</button></div>`).join('')}</div>`).join('')
        : '<div class="empty">Ich habe nichts zum Eintragen gefunden.</div>'}
      <button class="more" id="ai-back" style="margin-top:12px">${icon('chevL')}Zurück zur schnellen Erkennung</button>`;
    foot.innerHTML = `<button class="btn volt block" id="ai-save" ${ai.items.length ? '' : 'disabled'}>${icon('check')}${ai.items.length === 1 ? '1 Eintrag' : ai.items.length + ' Einträge'} speichern</button>`;
    $$('[data-airm]', body).forEach(b => b.onclick = () => { ai.items.splice(Number(b.dataset.airm), 1); render(); });
    $('#ai-back', body).onclick = () => { ai = null; update(); };
    const sv = $('#ai-save', foot);
    if (sv) sv.onclick = () => {
      const before = store.dayPillars(key).overall;
      const undo = applyItems(ai.items);
      const n = ai.items.length;
      closeSheet(); router.rerender(); haptic(12);
      if (before < 100 && store.dayPillars(key).overall >= 100) confetti();
      toast(`${n === 1 ? '1 Eintrag' : n + ' Einträge'} gespeichert`, 'Rückgängig', () => { undo(); router.rerender(); });
    };
  }

  function render() {
    if (ai) { renderAI(); return; }
    if (!items.length) {
      body.innerHTML = quickChips();
      foot.innerHTML = '';
      const su = $('#qa-ai-setup', body);
      if (su) su.onclick = () => openAiSetup(() => render());
    } else {
      const known = items.filter(x => x.type !== 'unknown');
      const unknown = items.filter(x => x.type === 'unknown');
      const pending = unknown.filter(x => !x.lookup || x.lookup.status === 'error').length;
      const loading = unknown.some(x => x.lookup && x.lookup.status === 'loading');
      const foods = [];
      let waterMl = 0;
      const suppIds = [];
      let newKcal = 0, newProt = 0;
      for (const it of known) {
        if (it.type === 'food') foods.push({ foodId: it.foodId, grams: it.grams });
        if (it.type === 'new') { const n = itemNutrients(it); newKcal += n.kcal; newProt += n.protein; }
        if (it.type === 'meal') foods.push(...store.mealItems(it.mealId, it.portions));
        if (it.type === 'water') waterMl += it.ml;
        if (it.type === 'supp') suppIds.push(it.suppId);
      }
      const pv = store.nutritionPreview(key, { foods, waterMl, suppIds });
      const actionable = known.filter(x => x.type !== 'zero').length;
      const newCount = known.filter(x => x.type === 'new').length;
      body.innerHTML = `
        <div class="sec-title">Erkannt<span style="color:var(--nut)">${known.length} von ${items.length}</span></div>
        <div class="qa-list">${items.map(rowHtml).join('')}</div>
        ${pending > 1 && hasAI() ? `<button class="btn ghost block" id="qa-lookall" style="margin-top:10px">${icon('spark')}${pending} unbekannte nachschlagen</button>` : ''}
        ${hasAI() && pending <= 1 ? `<button class="more" id="qa-ai" style="margin-top:10px">${icon('spark')}Nicht richtig erkannt? Claude versteht alles${icon('chev')}</button>` : ''}
        ${actionable ? `<div class="qa-sum">
          <div class="a">Dazu kommen<b class="num">+${de(pv.protein + newProt)} g Protein · ${de(pv.kcal + newKcal)} kcal</b></div>
          ${newCount ? `<div class="d" style="font-size:12px">${newCount} neu</div>` : `<div class="d"><s>${pv.before}%</s>${icon('chev')}${pv.after}%</div>`}
        </div>` : ''}`;
      const label = loading ? 'Warte auf Claude …' : `${actionable === 1 ? '1 Eintrag' : actionable + ' Einträge'} hinzufügen`;
      foot.innerHTML = `<button class="btn block" id="qa-save" ${actionable && !loading ? '' : 'disabled'}>${icon(loading ? 'loader' : 'check', loading ? 'spin' : '')}${label}</button>`;
      $('#qa-save', sheet).onclick = () => commit(known);
      const la = $('#qa-lookall', body);
      if (la) la.onclick = () => lookupUnknown(true);
      const ab = $('#qa-ai', body);
      if (ab) ab.onclick = () => runAI();
    }
    wire();
  }

  function wire() {
    $$('[data-rm]', body).forEach(b => b.onclick = () => {
      const it = items[+b.dataset.rm];
      overrides[it.raw] = { removed: true };
      editing = null; update();
    });
    $$('[data-edit]', body).forEach(b => b.onclick = () => { editing = editing === +b.dataset.edit ? null : +b.dataset.edit; render(); });
    $$('[data-step]', body).forEach(b => b.onclick = () => stepItem(+b.dataset.step, +b.dataset.dir));
    $$('[data-lookup]', body).forEach(b => b.onclick = () => lookupUnknown(true));
    $$('[data-wrong]', body).forEach(b => b.onclick = () => {
      const it = items[+b.dataset.wrong];
      overrides[it.raw] = { lookup: it.phrase || it.raw };
      editing = null; update(); lookupUnknown(true);
    });
    $$('[data-assign]', body).forEach(b => b.onclick = () => {
      const it = items[+b.dataset.assign];
      const f = store.foodById(b.dataset.food);
      overrides[it.raw] = { foodId: f.id, grams: amountFromRaw(f, it.raw) };
      update();
    });
    $$('[data-create]', body).forEach(b => b.onclick = () => {
      const it = items[+b.dataset.create];
      const orig = originalPhrase(ta.value, it.phrase);
      const name = orig.charAt(0).toUpperCase() + orig.slice(1);
      openFoodEditor(null, {
        name,
        onSave: (food) => {
          index = buildIndex(store.getState());
          overrides[it.raw] = { foodId: food.id, grams: amountFromRaw(food, it.raw) };
          update();
        },
      });
    });
    $$('[data-refine]', body).forEach(b => b.onclick = () => {
      const it = items[+b.dataset.refine];
      openFoodEditor(null, {
        draft: it.food,
        onSave: (food) => {
          index = buildIndex(store.getState());
          overrides[it.raw] = { foodId: food.id, grams: it.grams };
          editing = null; update();
        },
      });
    });
    $$('[data-append]', body).forEach(b => b.onclick = () => {
      ta.value = (ta.value.trim() ? ta.value.trim() + ', ' : '') + b.dataset.append;
      update();
    });
    $$('[data-copy]', body).forEach(b => b.onclick = () => {
      const before = store.getDay(key).entries.length;
      const n = store.copyEntries(b.dataset.copy, key);
      closeSheet(); router.rerender();
      toast(`${n} Einträge von gestern übernommen`, 'Rückgängig', () => { store.truncateEntries(key, before); router.rerender(); });
    });
    $$('[data-qtile]', body).forEach(b => b.onclick = () => {
      const t = b.dataset.qtile;
      if (t === 'scan') startScan();
      else if (t === 'search') { closeSheet(); openFoodPicker({ key }); }
      else if (t === 'meals') { const m = store.getMeals()[0]; if (m) { ta.value = m.name; update(); } }
    });
    $$('[data-template]', body).forEach(b => b.onclick = () => {
      const before = store.getDay(key).entries.length;
      const n = store.loadDayTemplate(key);
      closeSheet(); router.rerender();
      toast(`Standardtag geladen (${n})`, 'Rückgängig', () => { store.truncateEntries(key, before); router.rerender(); });
    });
  }

  function commit(known) {
    stopVoice();
    const day = store.getDay(key);
    const before = { len: day.entries.length, water: day.water || 0, supps: { ...day.supps } };
    const overallBefore = store.dayPillars(key).overall;
    const foods = [];
    const created = [];
    const madeFor = {};
    let n = 0;
    for (const it of known) {
      if (it.type === 'new') {
        // Erst jetzt in die Bibliothek – beim nächsten Mal wird's direkt erkannt
        let id = madeFor[it.phrase];
        if (!id) { id = madeFor[it.phrase] = store.saveNewFood(it.food).id; created.push(id); }
        foods.push({ foodId: id, grams: it.grams });
        n++;
      } else if (it.type === 'food') {
        foods.push({ foodId: it.foodId, grams: it.grams });
        if (it.foodId === 'whey' && store.getState().supplements.some(s => s.id === 'whey')) store.setSupp(key, 'whey', true);
        n++;
      } else if (it.type === 'meal') { foods.push(...store.mealItems(it.mealId, it.portions)); n++; }
      else if (it.type === 'water') { store.addWater(key, it.ml); n++; }
      else if (it.type === 'supp') { store.setSupp(key, it.suppId, true); n++; }
    }
    store.addEntries(key, foods);
    const intents = known.filter(x => x.type === 'intent').map(x => x.it);
    const undoIntents = intents.length ? applyItems(intents) : null;
    n += intents.length;
    closeSheet();
    router.rerender();
    haptic(12);
    const after = store.dayPillars(key).overall;
    if (overallBefore < 100 && after >= 100) confetti();
    const msg = `${n === 1 ? '1 Eintrag' : n + ' Einträge'} gespeichert${created.length ? ` · ${created.length} neu angelegt` : ''}`;
    toast(msg, 'Rückgängig', () => {
      if (undoIntents) undoIntents();
      const d = store.getDay(key);
      store.truncateEntries(key, before.len);
      store.setWater(key, before.water);
      d.supps = before.supps; store.save();
      for (const id of created) store.deleteFood(id);
      router.rerender();
    });
  }

  update();
  if (voice) startVoice();
  else if (scan) startScan();
  else if (!text) ta.focus();
}
