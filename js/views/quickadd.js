// ============================================================================
// Eintragen per Satz oder Sprache
// ============================================================================
import * as store from '../store.js';
import { parseEntry, buildIndex, amountLabel, defaultGrams } from '../parser.js';
import { icon } from '../icons.js';
import { $, $$, esc, de, short, openSheet, closeSheet, sheetHead, toast, router, haptic, confetti, foodIcon } from '../ui.js';
import { openFoodEditor } from './food.js';

const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export function openQuickAdd({ key = store.todayKey(), text = '', voice = false } = {}) {
  let index = buildIndex(store.getState());
  let items = [];
  const overrides = {};   // pro erkanntem Satzteil: { foodId, grams, portions, ml, removed }
  let editing = null;     // aktuell aufgeklappter Posten (Index)
  let rec = null, recBase = '';

  const sheet = openSheet(`
    ${sheetHead('Eintragen', key === store.todayKey() ? 'Schreib oder sprich, was du gegessen hast' : store.formatDateLabel(key))}
    <div class="qa-input" id="qa-input">
      <textarea class="qa-text" id="qa-text" rows="2" placeholder="z. B. 3 Eier, 200 g Skyr und eine Banane" autocapitalize="sentences" enterkeyhint="done"></textarea>
      <div class="qa-bar">
        <span class="qa-status" id="qa-status">${SR ? 'Mikro antippen zum Sprechen' : 'Tipp: Diktieren über das Tastatur-Mikro'}</span>
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
  ta.addEventListener('input', () => { grow(); clearTimeout(t); t = setTimeout(update, 110); });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); } });
  $('#qa-mic', sheet).onclick = () => (rec ? stopVoice() : startVoice());

  // ---------- Sprache ----------
  function setRec(on) {
    $('#qa-input', sheet).classList.toggle('rec', on);
    $('#qa-mic', sheet).classList.toggle('on', on);
    const st = $('#qa-status', sheet);
    st.classList.toggle('rec', on);
    st.innerHTML = on ? '<i></i>Ich höre zu …' : (SR ? 'Mikro antippen zum Sprechen' : 'Tipp: Diktieren über das Tastatur-Mikro');
  }
  function startVoice() {
    if (!SR) { ta.focus(); toast('Tippe auf das Mikrofon deiner Tastatur und sprich los'); return; }
    try {
      rec = new SR();
      rec.lang = 'de-DE'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      recBase = ta.value.trim() ? ta.value.trim() + ', ' : '';
      rec.onresult = e => {
        let out = '';
        for (const r of e.results) out += r[0].transcript;
        ta.value = recBase + out;
        update();
      };
      rec.onerror = e => {
        stopVoice();
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          ta.focus();
          toast('Mikrofon hier nicht erlaubt – nutze das Mikro auf der Tastatur');
        }
      };
      rec.onend = () => { rec = null; setRec(false); };
      rec.start();
      setRec(true);
      haptic();
    } catch (e) {
      rec = null; ta.focus();
      toast('Spracheingabe nicht verfügbar – nutze das Tastatur-Mikro');
    }
  }
  function stopVoice() {
    if (rec) { try { rec.stop(); } catch (e) { /* schon beendet */ } }
    rec = null;
    if (sheet.isConnected) setRec(false);
  }

  // ---------- Erkennen ----------
  function update() {
    grow();
    const parsed = parseEntry(ta.value, null, index);
    items = parsed.map(it => {
      const o = overrides[it.raw];
      if (!o) return it;
      if (o.removed) return null;
      if (o.foodId) return { raw: it.raw, type: 'food', foodId: o.foodId, grams: o.grams ?? defaultGrams(store.foodById(o.foodId)), estimated: false };
      return { ...it, ...('grams' in o ? { grams: o.grams, estimated: false } : {}), ...('portions' in o ? { portions: o.portions } : {}), ...('ml' in o ? { ml: o.ml, estimated: false } : {}) };
    }).filter(Boolean);
    render();
  }

  function itemNutrients(it) {
    if (it.type === 'food') {
      const f = store.foodById(it.foodId);
      if (!f) return { kcal: 0, protein: 0 };
      return { kcal: f.per100.kcal * it.grams / 100, protein: f.per100.protein * it.grams / 100 };
    }
    if (it.type === 'meal') {
      const m = store.mealById(it.mealId);
      const t = m ? store.mealTotals(m) : { kcal: 0, protein: 0 };
      return { kcal: t.kcal * it.portions, protein: t.protein * it.portions };
    }
    return { kcal: 0, protein: 0 };
  }

  function rowHtml(it, i) {
    const open = editing === i;
    if (it.type === 'unknown') {
      const sugg = (it.suggestions || []).map(store.foodById).filter(Boolean);
      return `<div class="qa-unknown">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <b>„${esc(it.phrase)}" kenne ich noch nicht</b>
          <button class="qa-rm" data-rm="${i}" aria-label="Entfernen">${icon('x')}</button>
        </div>
        <div class="chips">
          ${sugg.map(f => `<button class="chipbtn" data-assign="${i}" data-food="${f.id}">${esc(short(f.name))}</button>`).join('')}
          <button class="chipbtn" data-create="${i}">${icon('plus')}Neu anlegen</button>
        </div>
      </div>`;
    }
    let ico, name, amount, kv = '';
    if (it.type === 'food') {
      const f = store.foodById(it.foodId);
      const n = itemNutrients(it);
      ico = foodIcon(f); name = short(f.name);
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
    const editable = it.type === 'food' || it.type === 'meal' || it.type === 'water';
    return `<div>
      <div class="qa-item">
        ${ico}
        <button class="qa-main" ${editable ? `data-edit="${i}"` : ''} style="text-align:left">
          <div class="qa-nm">${esc(name)}</div><div class="qa-am">${amount}</div>
        </button>
        ${kv}
        <button class="qa-rm" data-rm="${i}" aria-label="Entfernen">${icon('x')}</button>
      </div>
      ${open ? editorHtml(it, i) : ''}
    </div>`;
  }

  function editorHtml(it, i) {
    let label;
    if (it.type === 'food') {
      const f = store.foodById(it.foodId);
      label = f.piece ? `${de(it.grams / f.piece.g, (it.grams / f.piece.g) % 1 ? 1 : 0)}<small>${esc(f.piece.name.toUpperCase())} · ${it.grams} G</small>` : `${it.grams}<small>GRAMM</small>`;
    } else if (it.type === 'meal') label = `${de(it.portions, it.portions % 1 ? 1 : 0)}<small>PORTIONEN</small>`;
    else label = `${de(it.ml)}<small>ML</small>`;
    return `<div class="stepper" style="margin:2px 0 10px">
      <button class="st-btn" data-step="${i}" data-dir="-1">${icon('minus')}</button>
      <div class="st-val num">${label}</div>
      <button class="st-btn" data-step="${i}" data-dir="1">${icon('plus')}</button>
    </div>`;
  }

  function stepItem(i, dir) {
    const it = items[i];
    const o = overrides[it.raw] || (overrides[it.raw] = {});
    if (it.type === 'food') {
      const f = store.foodById(it.foodId);
      const step = f.piece ? f.piece.g : (it.grams < 60 ? 5 : it.grams < 150 ? 10 : 25);
      o.foodId = it.foodId;
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
    const chips = [];
    const yesterday = store.shiftDate(key, -1);
    const yDay = store.getState().log[yesterday];
    if (yDay && yDay.entries.length) chips.push(`<button class="chipbtn" data-copy="${yesterday}">${icon('repeat')}Wie gestern (${yDay.entries.length})</button>`);
    if (store.getDayTemplate().length) chips.push(`<button class="chipbtn" data-template>${icon('pin')}Standardtag</button>`);
    for (const m of store.getMeals()) chips.push(`<button class="chipbtn" data-append="${esc(m.name)}">${icon('bowl')}${esc(m.name)}</button>`);
    const seen = new Set();
    const picks = [...store.getFavorites(), ...store.getQuickPicks(8)].filter(q => !seen.has(q.food.id) && seen.add(q.food.id)).slice(0, 8);
    for (const q of picks) {
      chips.push(`<button class="chipbtn" data-append="${q.grams} g ${esc(short(q.food.name))}">${store.isFavorite(q.food.id) ? icon('star') : ''}${esc(short(q.food.name))}</button>`);
    }
    return `<div class="sec-title">Schnell</div><div class="chips">${chips.join('')}</div>
      <div class="sec-title">So funktioniert's</div>
      <p class="hint">Schreib einfach normal: „2 Spiegeleier und eine Scheibe Brot", „Poke Bowl", „500 ml Wasser" oder „D3 und Kreatin genommen". Mengen ohne Angabe schätze ich – tipp auf einen Eintrag, um ihn anzupassen.</p>`;
  }

  function render() {
    if (!items.length) {
      body.innerHTML = quickChips();
      foot.innerHTML = '';
    } else {
      const known = items.filter(x => x.type !== 'unknown');
      const foods = [];
      let waterMl = 0;
      const suppIds = [];
      for (const it of known) {
        if (it.type === 'food') foods.push({ foodId: it.foodId, grams: it.grams });
        if (it.type === 'meal') foods.push(...store.mealItems(it.mealId, it.portions));
        if (it.type === 'water') waterMl += it.ml;
        if (it.type === 'supp') suppIds.push(it.suppId);
      }
      const pv = store.nutritionPreview(key, { foods, waterMl, suppIds });
      const actionable = known.filter(x => x.type !== 'zero').length;
      body.innerHTML = `
        <div class="sec-title">Erkannt<span style="color:var(--nut)">${known.length} von ${items.length}</span></div>
        <div class="qa-list">${items.map(rowHtml).join('')}</div>
        ${actionable ? `<div class="qa-sum">
          <div class="a">Dazu kommen<b class="num">+${de(pv.protein)} g Protein · ${de(pv.kcal)} kcal</b></div>
          <div class="d"><s>${pv.before}%</s>${icon('chev')}${pv.after}%</div>
        </div>` : ''}`;
      foot.innerHTML = `<button class="btn block" id="qa-save" ${actionable ? '' : 'disabled'}>${icon('check')}${actionable === 1 ? '1 Eintrag' : actionable + ' Einträge'} hinzufügen</button>`;
      $('#qa-save', sheet).onclick = () => commit(known);
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
    $$('[data-assign]', body).forEach(b => b.onclick = () => {
      const it = items[+b.dataset.assign];
      const f = store.foodById(b.dataset.food);
      overrides[it.raw] = { foodId: f.id, grams: defaultGrams(f) };
      update();
    });
    $$('[data-create]', body).forEach(b => b.onclick = () => {
      const it = items[+b.dataset.create];
      const name = it.phrase.charAt(0).toUpperCase() + it.phrase.slice(1);
      openFoodEditor(null, {
        name,
        onSave: (food) => {
          index = buildIndex(store.getState());
          overrides[it.raw] = { foodId: food.id, grams: defaultGrams(food) };
          update();
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
    let n = 0;
    for (const it of known) {
      if (it.type === 'food') {
        foods.push({ foodId: it.foodId, grams: it.grams });
        if (it.foodId === 'whey' && store.getState().supplements.some(s => s.id === 'whey')) store.setSupp(key, 'whey', true);
        n++;
      } else if (it.type === 'meal') { foods.push(...store.mealItems(it.mealId, it.portions)); n++; }
      else if (it.type === 'water') { store.addWater(key, it.ml); n++; }
      else if (it.type === 'supp') { store.setSupp(key, it.suppId, true); n++; }
    }
    store.addEntries(key, foods);
    closeSheet();
    router.rerender();
    haptic(12);
    const after = store.dayPillars(key).overall;
    if (overallBefore < 100 && after >= 100) confetti();
    toast(`${n === 1 ? '1 Eintrag' : n + ' Einträge'} gespeichert`, 'Rückgängig', () => {
      const d = store.getDay(key);
      store.truncateEntries(key, before.len);
      store.setWater(key, before.water);
      d.supps = before.supps; store.save();
      router.rerender();
    });
  }

  update();
  if (voice) startVoice();
  else if (!text) ta.focus();
}
