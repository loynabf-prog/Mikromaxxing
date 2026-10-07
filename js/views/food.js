// ============================================================================
// Essen – Tagesbilanz, Vorschläge, Einträge, Mahlzeiten, Nährstoffe
// ============================================================================
import * as store from '../store.js';
import { NUTRIENTS, NUTRIENT_BY_KEY, NUTRIENT_INFO, MEAL_SLOTS, SUPP_TIME_LABELS, SUPP_TIME_ORDER } from '../data.js';
import { amountLabel, defaultGrams, fold } from '../parser.js';
import { icon } from '../icons.js';
import { $, $$, esc, de, short, router, openSheet, closeSheet, sheetHead, toast, haptic, foodIcon, longDate } from '../ui.js';
import { openQuickAdd } from './quickadd.js';
import { afterChange } from './today.js';

let foodDate = null;       // null = heute
let slotSel = null;        // gewählte Tageszeit für Vorschläge
let nutrMode = 'day';      // 'day' | 'week'
let nutrOpen = false;

export function getFoodDate() { return foodDate || store.todayKey(); }
const LIMIT_KEYS = new Set(NUTRIENTS.filter(n => n.limit).map(n => n.key));

function nut(food, grams, k) { return (food.per100[k] || 0) * grams / 100; }

export function renderFood(app) {
  const key = getFoodDate();
  const today = store.todayKey();
  const isToday = key === today;
  const s = store.getState();
  const t = s.profile.targets;
  const p = store.dayPillars(key);
  const day = store.getDay(key);
  const tot = p.totals;
  if (!slotSel) {
    const h = new Date().getHours();
    slotSel = (MEAL_SLOTS.find(x => h >= x.from && h < x.to) || MEAL_SLOTS[0]).id;
  }

  app.innerHTML = `<div class="view">
    <div class="datebar">
      <button class="icon-btn" id="d-prev" aria-label="Vorheriger Tag">${icon('chevL')}</button>
      <div class="dl"><b>${esc(store.formatDateLabel(key))}</b><span>${esc(longDate(store.dateOf(key)))}</span></div>
      <button class="icon-btn" id="d-next" aria-label="Nächster Tag" ${isToday ? 'disabled style="opacity:.35"' : ''}>${icon('chev')}</button>
    </div>

    <div class="card">
      <div class="ch"><span class="chip nut">${icon('leaf')}Ernährung</span><span class="mid num" style="color:var(--nut)">${p.nutrition}<small>%</small></span></div>
      <div class="big-row">
        <div><div class="big num">${de(tot.protein)}<small>/ ${de(t.protein)} g</small></div><div class="lbl" style="margin-top:6px">Protein</div></div>
        <div style="text-align:right"><div class="mid num">${de(tot.kcal)}</div><div class="lbl" style="margin-top:5px">kcal · ${tot.kcal <= t.kcal ? `noch ${de(t.kcal - tot.kcal)}` : `${de(tot.kcal - t.kcal)} drüber`}</div></div>
      </div>
      <div class="parts4">
        ${p4('Protein', p.parts.protein)}${p4('Mikros', p.parts.micros, 'nutr-open')}${p4('Wasser', p.parts.water, 'water')}${p4('Supps', p.parts.supps, 'supps')}
      </div>
      <div class="macros"><span>Carbs <b>${de(tot.carbs)} g</b></span><span>Fett <b>${de(tot.fat)} g</b></span><span>Ballaststoffe <b>${de(tot.fiber)} g</b></span></div>
    </div>

    <div class="grid2" style="margin-bottom:12px">
      <button class="btn" id="f-add">${icon('plus')}Eintragen</button>
      <button class="btn white" id="f-search">${icon('search')}Suchen</button>
    </div>

    ${suggestionCard(key)}
    ${eatenCard(key, day)}

    <div class="sec-title">Meine Mahlzeiten<button id="meal-new">+ Neu</button></div>
    <div class="meal-grid" style="margin-bottom:12px">
      ${store.getMeals().map(m => { const mt = store.mealTotals(m); return `
        <div class="meal-card" style="position:relative">
          <button data-logmeal="${m.id}" style="text-align:left;display:flex;flex-direction:column;gap:8px;flex:1">
            <span class="fico c-meal">${icon('bowl')}</span>
            <span class="mn">${esc(m.name)}</span>
            <span class="mm">${de(mt.kcal)} kcal · ${de(mt.protein)} g Protein</span>
          </button>
          <button data-editmeal="${m.id}" aria-label="Bearbeiten" style="position:absolute;top:10px;right:10px;color:var(--faint)">${icon('edit')}</button>
        </div>`; }).join('')}
      <button class="meal-card new" id="meal-new2">${icon('plus')}Mahlzeit anlegen</button>
    </div>

    ${suppCard(key, day)}
    ${gapsCard(key)}
    ${nutrientsCard(key)}

    <button class="btn white block" id="f-lib" style="margin-top:4px">${icon('book')}Lebensmittel-Bibliothek</button>
  </div>`;

  wire(app, key);
}

function p4(label, v, act) {
  return `<button class="p4" ${act ? `data-p4="${act}"` : ''}><div class="v num">${v}<small style="font-size:11px;color:var(--faint)">%</small></div><div class="l">${label}</div><div class="bar"><i style="width:${Math.min(100, v)}%"></i></div></button>`;
}

function suggestionCard(key) {
  const sl = MEAL_SLOTS.find(x => x.id === slotSel) || MEAL_SLOTS[0];
  const foods = sl.foods.map(store.foodById).filter(Boolean).slice(0, 6);
  const snacks = (sl.snacks || []).map(id => store.getSnacks().find(x => x.id === id)).filter(Boolean);
  return `<div class="card">
    <div class="ch"><span class="ch-title">Was jetzt passt</span><span class="sub">${esc(sl.time)}</span></div>
    <div class="hscroll slot-tabs">${MEAL_SLOTS.map(x => `<button class="chipbtn ${x.id === sl.id ? 'on' : ''}" data-slot="${x.id}">${esc(x.label.replace(' / vor dem Schlafen', ''))}</button>`).join('')}</div>
    <div class="slot-why">${esc(sl.why)}</div>
    ${sl.note ? `<div class="slot-note">${esc(sl.note)}</div>` : ''}
    ${foods.map(f => { const g = store.servingGrams(f); return `
      <button class="sugg" data-quick="${f.id}" data-grams="${g}">
        ${foodIcon(f)}<span class="qa-main"><b>${esc(short(f.name))}</b><div class="qa-am">${esc(amountLabel(f, g))} · ${de(nut(f, g, 'protein'))} g P · ${de(nut(f, g, 'kcal'))} kcal</div></span>
        <span class="plus">${icon('plus')}</span>
      </button>`; }).join('')}
    ${snacks.map(sn => `
      <button class="sugg" data-snack="${sn.id}">
        <span class="fico c-snack">${icon('spark')}</span><span class="qa-main"><b>${esc(sn.name)}</b><div class="qa-am">${esc(sn.why)}</div></span>
        <span class="plus">${icon('plus')}</span>
      </button>`).join('')}
  </div>`;
}

function eatenCard(key, day) {
  const s = store.getState();
  const groups = store.DAY_PARTS.map(pt => ({ pt, items: [] }));
  day.entries.forEach((e, i) => {
    const h = e.ts ? new Date(e.ts).getHours() : 12;
    groups.find(g => g.pt.id === store.partOfHour(h).id).items.push({ e, i });
  });
  const body = groups.filter(g => g.items.length).map(g => {
    let prot = 0, kcal = 0;
    for (const { e } of g.items) { const f = store.foodById(e.foodId); if (f) { prot += nut(f, e.grams, 'protein'); kcal += nut(f, e.grams, 'kcal'); } }
    return `<div class="part-head"><b>${g.pt.label === 'Nachm.' ? 'Nachmittag' : g.pt.label}</b><span>${de(prot)} g Protein · ${de(kcal)} kcal</span></div>
      ${g.items.map(({ e, i }) => {
        const f = store.foodById(e.foodId);
        if (!f) return '';
        return `<button class="entry" data-entry="${i}">${foodIcon(f)}
          <span class="qa-main"><div class="qa-nm">${esc(short(f.name))}</div><div class="qa-am">${esc(amountLabel(f, e.grams))}</div></span>
          <span class="qa-kv"><b class="num">${de(nut(f, e.grams, 'protein'))} g</b><span>${de(nut(f, e.grams, 'kcal'))} kcal</span></span></button>`;
      }).join('')}`;
  }).join('');
  return `<div class="card">
    <div class="ch"><span class="ch-title">Gegessen</span><span class="sub">${day.entries.length} Einträge</span></div>
    ${body || '<div class="empty">Noch nichts eingetragen.<br>Tipp unten auf „Was hast du gegessen?" und schreib es einfach hin.</div>'}
    ${day.entries.length ? `<div class="chips" style="margin-top:12px"><button class="chipbtn" id="tpl-save">${icon('pin')}Als Standardtag merken</button></div>` : ''}
  </div>`;
}

function suppCard(key, day) {
  const supps = store.getState().supplements;
  const taken = supps.filter(x => day.supps[x.id]).length;
  return `<div class="card">
    <div class="ch"><span class="chip" style="background:#FCE7F3;color:var(--pill)">${icon('pill')}Supplements</span><span class="sub">${taken} / ${supps.length}</span></div>
    ${suppRows(supps, day)}
  </div>`;
}
function suppRows(supps, day) {
  return SUPP_TIME_ORDER.map(tk => {
    const g = supps.filter(x => (x.time || 'egal') === tk);
    if (!g.length) return '';
    return `<div class="part-head"><b>${SUPP_TIME_LABELS[tk]}</b>${g.some(x => !day.supps[x.id]) ? `<button class="sub" data-suppall="${tk}" style="color:var(--spo);font-weight:800">alle abhaken</button>` : ''}</div>
      ${g.map(x => `<button class="supp-row ${day.supps[x.id] ? 'on' : ''}" data-supp="${x.id}">
        <span class="box">${day.supps[x.id] ? icon('check') : ''}</span>
        <span style="flex:1"><b>${esc(x.name)}${x.dose ? `<em>${esc(x.dose)}</em>` : ''}</b>${x.takeWith ? `<span>${esc(x.takeWith)}</span>` : ''}</span>
      </button>`).join('')}`;
  }).join('');
}

function gapsCard(key) {
  const rec = store.getRecommendations(key);
  const gaps = rec.gaps.filter(g => g.best && g.nutKey !== 'protein').slice(0, 4);
  if (!gaps.length) return '';
  return `<div class="card">
    <div class="ch"><span class="ch-title">Lücken schließen</span><span class="sub">größte zuerst</span></div>
    ${gaps.map(g => { const nt = NUTRIENT_BY_KEY[g.nutKey]; const f = g.best.food; return `
      <button class="sugg" data-quick="${f.id}" data-grams="${g.best.grams}">
        ${foodIcon(f)}<span class="qa-main"><b>${esc(nt.label)} · ${g.currentPct}%</b>
        <div class="qa-am">${esc(short(f.name))} ${esc(amountLabel(f, g.best.grams))} → ${g.best.addedPct >= 100 ? 'deckt den Tag' : '+' + g.best.addedPct + ' %'}</div></span>
        <span class="plus">${icon('plus')}</span></button>`; }).join('')}
  </div>`;
}

function nutrientsCard(key) {
  const t = store.getState().profile.targets;
  const data = nutrMode === 'week' ? store.averageTotals(key, 7) : { totals: store.computeTotals(key), days: 1 };
  const groups = [
    ['Vitamine', NUTRIENTS.filter(n => n.group === 'vitamin')],
    ['Mineralstoffe', NUTRIENTS.filter(n => n.group === 'mineral')],
    ['Weitere', NUTRIENTS.filter(n => ['fiber', 'sugar', 'satfat', 'omega3'].includes(n.key))],
  ];
  const row = (n) => {
    const v = data.totals[n.key] || 0, tg = t[n.key] || 0;
    const pc = tg ? Math.round(v / tg * 100) : 0;
    const limit = LIMIT_KEYS.has(n.key);
    const cls = limit ? (pc > 100 ? 'low' : 'limit') : pc >= 100 ? '' : pc >= 50 ? 'mid' : 'low';
    return `<button class="nrow" data-nutr="${n.key}">
      <span class="nn">${esc(n.label)}</span>
      <span class="nv num ${!limit && pc >= 100 ? 'done' : pc < 50 && !limit ? 'low' : ''}">${pc}%</span>
      <span class="nbar"><i class="${cls}" style="width:${Math.min(100, pc)}%"></i></span>
      <span class="nd">${de(v, v < 10 ? 1 : 0)} / ${de(tg, tg < 10 ? 1 : 0)} ${n.unit}${limit ? ' · Obergrenze' : ''}</span>
    </button>`;
  };
  return `<div class="card">
    <div class="ch"><span class="ch-title">Alle Nährstoffe</span>
      <button class="more" id="nutr-toggle">${nutrOpen ? 'Weniger' : 'Anzeigen'}${icon(nutrOpen ? 'chevD' : 'chev')}</button></div>
    ${nutrOpen ? `
      <div class="seg" style="margin-bottom:10px"><button data-nm="day" class="${nutrMode === 'day' ? 'on' : ''}">Heute</button><button data-nm="week" class="${nutrMode === 'week' ? 'on' : ''}">Ø 7 Tage</button></div>
      ${nutrMode === 'week' ? `<p class="hint">Durchschnitt aus ${data.days} Tag${data.days === 1 ? '' : 'en'} mit Einträgen. Für Vitamin D, B12 oder Omega-3 zählt der Wochenschnitt, nicht der einzelne Tag.</p>` : ''}
      ${groups.map(([title, list]) => `<div class="part-head"><b>${title}</b></div>${list.map(row).join('')}`).join('')}` : `<p class="hint" style="margin:0">Vitamine, Mineralstoffe und Wochen-Durchschnitt. Tipp auf einen Nährstoff, um zu sehen, woher er kommt.</p>`}
  </div>`;
}

function wire(app, key) {
  $('#d-prev', app).onclick = () => { foodDate = store.shiftDate(key, -1); router.rerender(); };
  $('#d-next', app).onclick = () => { const n = store.shiftDate(key, 1); foodDate = n >= store.todayKey() ? null : n; router.rerender(); };
  $('#f-add', app).onclick = () => openQuickAdd({ key });
  $('#f-search', app).onclick = () => openFoodPicker({ key });
  $('#f-lib', app).onclick = () => openLibrary();
  $$('[data-slot]', app).forEach(b => b.onclick = () => { slotSel = b.dataset.slot; router.rerender(); });
  $$('[data-quick]', app).forEach(b => b.onclick = () => quickAdd(key, b.dataset.quick, Number(b.dataset.grams)));
  $$('[data-snack]', app).forEach(b => b.onclick = () => {
    const before = store.getDay(key).entries.length;
    const sn = store.getSnacks().find(x => x.id === b.dataset.snack);
    const n = store.addEntries(key, sn.items);
    afterChange(key);
    toast(`${sn.name} eingetragen (${n})`, 'Rückgängig', () => { store.truncateEntries(key, before); router.rerender(); });
  });
  $$('[data-entry]', app).forEach(b => b.onclick = () => openAmountSheet({ key, index: Number(b.dataset.entry) }));
  $$('[data-logmeal]', app).forEach(b => b.onclick = () => {
    const before = store.getDay(key).entries.length;
    const m = store.mealById(b.dataset.logmeal);
    store.logMeal(key, m.id);
    haptic(); afterChange(key);
    toast(`${m.name} eingetragen`, 'Rückgängig', () => { store.truncateEntries(key, before); router.rerender(); });
  });
  $$('[data-editmeal]', app).forEach(b => b.onclick = (e) => { e.stopPropagation(); openMealEditor(b.dataset.editmeal); });
  ['#meal-new', '#meal-new2'].forEach(id => { const el = $(id, app); if (el) el.onclick = () => openMealEditor(null); });
  $$('[data-supp]', app).forEach(b => b.onclick = () => { store.toggleSupp(key, b.dataset.supp); haptic(5); afterChange(key); });
  $$('[data-suppall]', app).forEach(b => b.onclick = () => {
    for (const x of store.getState().supplements) if ((x.time || 'egal') === b.dataset.suppall) store.setSupp(key, x.id, true);
    haptic(); afterChange(key);
  });
  $$('[data-p4]', app).forEach(b => b.onclick = () => {
    const a = b.dataset.p4;
    if (a === 'supps') openSuppsSheet(key);
    else if (a === 'water') { store.addWater(key, 250); haptic(); afterChange(key); toast('+250 ml Wasser'); }
    else { nutrOpen = true; router.rerender(); setTimeout(() => { const el = $('#nutr-toggle'); el && el.scrollIntoView({ behavior: 'smooth' }); }, 50); }
  });
  $('#nutr-toggle', app).onclick = () => { nutrOpen = !nutrOpen; router.rerender(); };
  $$('[data-nm]', app).forEach(b => b.onclick = () => { nutrMode = b.dataset.nm; router.rerender(); });
  $$('[data-nutr]', app).forEach(b => b.onclick = () => openNutrientSheet(key, b.dataset.nutr));
  const tpl = $('#tpl-save', app);
  if (tpl) tpl.onclick = () => { const n = store.saveDayTemplate(key); toast(`Standardtag gemerkt (${n} Einträge)`); };
}

function quickAdd(key, foodId, grams) {
  const before = store.getDay(key).entries.length;
  store.addEntry(key, foodId, grams);
  const f = store.foodById(foodId);
  haptic(); afterChange(key);
  toast(`${short(f.name)} · ${amountLabel(f, grams)}`, 'Rückgängig', () => { store.truncateEntries(key, before); router.rerender(); });
}

// --- Menge wählen (neu oder bestehenden Eintrag ändern) ---------------------
export function openAmountSheet({ key, index = null, foodId = null, grams = null, onDone }) {
  const entry = index != null ? store.getDay(key).entries[index] : null;
  const f = store.foodById(entry ? entry.foodId : foodId);
  if (!f) return;
  let g = entry ? entry.grams : grams || store.servingGrams(f);
  const step = f.piece ? f.piece.g : 10;
  const servings = [...(f.servings || [])];
  const sheet = openSheet(`
    <div class="sheet-head"><div style="display:flex;gap:12px;align-items:center">${foodIcon(f)}<div><div class="sheet-title" style="font-size:20px">${esc(short(f.name))}</div><div class="sheet-sub">${esc(f.cat || '')}</div></div></div>
      <div style="display:flex;gap:8px"><button class="sheet-x" id="fav" aria-label="Favorit" style="color:${store.isFavorite(f.id) ? '#F59E0B' : 'var(--dim)'}">${icon('star')}</button><button class="sheet-x" data-close>${icon('x')}</button></div></div>
    <div class="stepper"><button class="st-btn" data-d="-1">${icon('minus')}</button><div class="st-val num" id="av"></div><button class="st-btn" data-d="1">${icon('plus')}</button></div>
    <div class="chips" style="margin-top:10px">
      ${f.piece ? [1, 2, 3, 4].map(n => `<button class="chipbtn" data-g="${n * f.piece.g}">${n} ${esc(f.piece.name)}</button>`).join('') : ''}
      ${servings.map(sv => `<button class="chipbtn" data-g="${sv.grams}">${esc(sv.label)}</button>`).join('')}
      ${[50, 100, 150, 200].map(x => `<button class="chipbtn" data-g="${x}">${x} g</button>`).join('')}
    </div>
    <div class="grid3" id="anut" style="margin-top:14px"></div>
    <div class="sheet-foot">
      ${entry ? `<button class="btn danger" id="del" style="flex:0 0 auto;width:56px">${icon('trash')}</button>` : ''}
      <button class="btn" id="ok">${icon('check')}${entry ? 'Speichern' : 'Hinzufügen'}</button>
    </div>`);
  const show = () => {
    $('#av', sheet).innerHTML = f.piece ? `${de(g / f.piece.g, (g / f.piece.g) % 1 ? 1 : 0)}<small>${esc(f.piece.name.toUpperCase())} · ${g} G</small>` : `${g}<small>GRAMM</small>`;
    $('#anut', sheet).innerHTML = [['kcal', 'kcal', ''], ['protein', 'Protein', ' g'], ['carbs', 'Carbs', ' g']]
      .map(([k, l, u]) => `<div class="wk-tile"><div class="v num" style="font-size:18px">${de(nut(f, g, k))}${u}</div><div class="l">${l}</div></div>`).join('');
  };
  $$('[data-d]', sheet).forEach(b => b.onclick = () => { g = Math.max(step, g + Number(b.dataset.d) * step); haptic(4); show(); });
  $$('[data-g]', sheet).forEach(b => b.onclick = () => { g = Number(b.dataset.g); show(); });
  $('#fav', sheet).onclick = () => { const on = store.toggleFavorite(f.id); $('#fav', sheet).style.color = on ? '#F59E0B' : 'var(--dim)'; toast(on ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt'); };
  $('#ok', sheet).onclick = () => {
    if (entry) store.updateEntry(key, index, g); else store.addEntry(key, f.id, g);
    closeSheet(); haptic(); afterChange(key);
    if (onDone) onDone();
    if (!entry) toast(`${short(f.name)} · ${amountLabel(f, g)} eingetragen`);
  };
  const del = $('#del', sheet);
  if (del) del.onclick = () => {
    const removed = { ...entry };
    store.removeEntry(key, index); closeSheet(); afterChange(key);
    toast(`${short(f.name)} gelöscht`, 'Rückgängig', () => { store.getDay(key).entries.splice(index, 0, removed); store.save(); router.rerender(); });
  };
  show();
}

// --- Suche ------------------------------------------------------------------
export function openFoodPicker({ key = getFoodDate(), onPick = null, title = 'Lebensmittel suchen' } = {}) {
  const sheet = openSheet(`${sheetHead(title)}
    <div class="field" style="margin-bottom:8px"><input type="search" id="fp-q" placeholder="z. B. Skyr, Lachs, Haferflocken" autocomplete="off"></div>
    <div class="sheet-body" id="fp-list"></div>`, { tall: true });
  const listEl = $('#fp-list', sheet);
  const draw = () => {
    const q = fold($('#fp-q', sheet).value);
    const favs = new Set(store.getState().favorites);
    const recent = new Map(store.getQuickPicks(12).map((x, i) => [x.food.id, i]));
    let foods = store.getState().foods.filter(f => !q || fold(f.name).includes(q) || fold(f.cat || '').includes(q) || (f.aliases || []).some(a => fold(a).includes(q)));
    foods.sort((a, b) => (favs.has(b.id) - favs.has(a.id)) || ((recent.has(a.id) ? recent.get(a.id) : 99) - (recent.has(b.id) ? recent.get(b.id) : 99)) || a.name.localeCompare(b.name));
    listEl.innerHTML = foods.slice(0, 80).map(f => { const g = store.servingGrams(f); return `
      <button class="entry" data-pick="${f.id}">${foodIcon(f)}
        <span class="qa-main"><div class="qa-nm">${favs.has(f.id) ? '★ ' : ''}${esc(short(f.name))}</div><div class="qa-am">${esc(amountLabel(f, g))} · ${de(nut(f, g, 'protein'))} g P · ${de(nut(f, g, 'kcal'))} kcal</div></span>
        ${icon('chev')}</button>`; }).join('') +
      `<button class="btn ghost block" id="fp-new" style="margin:12px 0">${icon('plus')}${q ? `„${esc($('#fp-q', sheet).value)}" neu anlegen` : 'Neues Lebensmittel anlegen'}</button>`;
    $$('[data-pick]', listEl).forEach(b => b.onclick = () => {
      if (onPick) { onPick(b.dataset.pick); closeSheet(); }
      else openAmountSheet({ key, foodId: b.dataset.pick, onDone: () => closeSheet() });
    });
    $('#fp-new', listEl).onclick = () => {
      const raw = $('#fp-q', sheet).value.trim();
      openFoodEditor(null, { name: raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '', onSave: food => { draw(); if (onPick) { onPick(food.id); closeSheet(); } } });
    };
  };
  $('#fp-q', sheet).oninput = draw;
  draw();
  if (!onPick) setTimeout(() => $('#fp-q', sheet).focus(), 60);
}

// --- Lebensmittel anlegen/bearbeiten ----------------------------------------
const CATS = ['Protein', 'Fisch', 'Milchprodukte', 'Getreide', 'Hülsenfrüchte', 'Obst', 'Gemüse', 'Nüsse & Samen', 'Snacks', 'Gerichte', 'Sonstiges'];
export function openFoodEditor(foodId, { name = '', onSave } = {}) {
  const existing = foodId ? store.foodById(foodId) : null;
  const f = existing ? structuredClone(existing) : {
    id: null, name, cat: 'Sonstiges', whole: true, servings: [], aliases: [],
    per100: Object.fromEntries(NUTRIENTS.map(n => [n.key, 0])),
  };
  const unit = f.piece ? 'piece' : 'gram';
  const main = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar'];
  const micros = NUTRIENTS.filter(n => !main.includes(n.key));
  const sheet = openSheet(`${sheetHead(existing ? 'Lebensmittel bearbeiten' : 'Neues Lebensmittel', 'Werte pro 100 g – stehen auf jeder Packung')}
    <div class="sheet-body">
      <label class="field"><span>Name</span><input id="fe-name" value="${esc(f.name)}" placeholder="z. B. Döner Box"></label>
      <div class="grid2">
        <label class="field"><span>Kategorie</span><select id="fe-cat">${CATS.map(c => `<option ${c === f.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label class="field"><span>Portion</span><select id="fe-unit"><option value="gram" ${unit === 'gram' ? 'selected' : ''}>in Gramm</option><option value="piece" ${unit === 'piece' ? 'selected' : ''}>in Stück</option></select></label>
      </div>
      <div class="grid3" id="fe-piece" ${unit === 'piece' ? '' : 'style="display:none"'}>
        <label class="field"><span>Stück heißt</span><input id="fe-pn" value="${esc(f.piece ? f.piece.name : 'Stück')}"></label>
        <label class="field"><span>g pro Stück</span><input id="fe-pg" type="number" inputmode="decimal" value="${f.piece ? f.piece.g : 100}"></label>
        <label class="field"><span>Standard</span><input id="fe-pd" type="number" inputmode="decimal" value="${f.piece ? f.piece.def || 1 : 1}"></label>
      </div>
      <label class="field" id="fe-serv" ${unit === 'gram' ? '' : 'style="display:none"'}><span>Übliche Portion (g)</span><input id="fe-sg" type="number" inputmode="decimal" value="${f.servings && f.servings[0] ? f.servings[0].grams : 100}"></label>
      <div class="grid3">${main.map(k => `<label class="field"><span>${NUTRIENT_BY_KEY[k].label} (${NUTRIENT_BY_KEY[k].unit})</span><input type="number" inputmode="decimal" step="any" data-n="${k}" value="${f.per100[k] || 0}"></label>`).join('')}</div>
      <label class="field"><span>Weitere Namen (für Eintragen per Satz, mit Komma)</span><input id="fe-al" value="${esc((f.aliases || []).join(', '))}" placeholder="z. B. döner, dönerbox"></label>
      <button class="more" id="fe-mtog" style="margin:4px 0 10px">Mikronährstoffe ${icon('chevD')}</button>
      <div class="grid3" id="fe-micros" style="display:none">${micros.map(n => `<label class="field"><span>${esc(n.label)} (${n.unit})</span><input type="number" inputmode="decimal" step="any" data-n="${n.key}" value="${f.per100[n.key] || 0}"></label>`).join('')}</div>
    </div>
    <div class="sheet-foot">
      ${existing ? `<button class="btn danger" id="fe-del" style="flex:0 0 auto;width:56px">${icon('trash')}</button>` : ''}
      <button class="btn" id="fe-save">${icon('check')}Speichern</button>
    </div>`, { tall: true });
  $('#fe-unit', sheet).onchange = (e) => {
    $('#fe-piece', sheet).style.display = e.target.value === 'piece' ? '' : 'none';
    $('#fe-serv', sheet).style.display = e.target.value === 'gram' ? '' : 'none';
  };
  $('#fe-mtog', sheet).onclick = () => { const el = $('#fe-micros', sheet); el.style.display = el.style.display === 'none' ? '' : 'none'; };
  $('#fe-save', sheet).onclick = () => {
    const nm = $('#fe-name', sheet).value.trim();
    if (!nm) { toast('Bitte einen Namen eingeben'); return; }
    f.name = nm;
    f.cat = $('#fe-cat', sheet).value;
    if (!f.id) f.id = store.newFoodId(nm);
    $$('[data-n]', sheet).forEach(inp => { f.per100[inp.dataset.n] = Number(String(inp.value).replace(',', '.')) || 0; });
    if ($('#fe-unit', sheet).value === 'piece') {
      f.piece = { name: $('#fe-pn', sheet).value.trim() || 'Stück', g: Number($('#fe-pg', sheet).value) || 100, def: Number($('#fe-pd', sheet).value) || 1 };
      f.servings = [];
    } else {
      delete f.piece;
      const sg = Number($('#fe-sg', sheet).value) || 100;
      f.servings = [{ label: `Portion (${sg} g)`, grams: sg }];
    }
    f.aliases = $('#fe-al', sheet).value.split(',').map(x => x.trim()).filter(Boolean);
    store.upsertFood(f);
    closeSheet(); router.rerender(); toast(`${nm} gespeichert`);
    if (onSave) onSave(f);
  };
  const del = $('#fe-del', sheet);
  if (del) del.onclick = () => { if (confirm(`${f.name} wirklich löschen?`)) { store.deleteFood(f.id); closeSheet(); router.rerender(); } };
}

// --- Bibliothek ---------------------------------------------------------------
export function openLibrary() {
  const sheet = openSheet(`${sheetHead('Bibliothek', `${store.getState().foods.length} Lebensmittel · Werte pro 100 g`)}
    <div class="field" style="margin-bottom:8px"><input type="search" id="lb-q" placeholder="Suchen" autocomplete="off"></div>
    <div class="sheet-body" id="lb-list"></div>
    <div class="sheet-foot"><button class="btn block" id="lb-new">${icon('plus')}Neues Lebensmittel</button></div>`, { tall: true });
  const draw = () => {
    const q = fold($('#lb-q', sheet).value);
    const foods = store.getState().foods.filter(f => !q || fold(f.name).includes(q) || fold(f.cat || '').includes(q))
      .sort((a, b) => (a.cat || '').localeCompare(b.cat || '') || a.name.localeCompare(b.name));
    let cat = null;
    $('#lb-list', sheet).innerHTML = foods.map(f => {
      const head = f.cat !== cat ? `<div class="part-head"><b>${esc(f.cat || 'Sonstiges')}</b></div>` : '';
      cat = f.cat;
      return head + `<button class="entry" data-ed="${f.id}">${foodIcon(f)}<span class="qa-main"><div class="qa-nm">${esc(f.name)}</div>
        <div class="qa-am">${de(f.per100.kcal)} kcal · ${de(f.per100.protein, 1)} P · ${de(f.per100.carbs, 1)} C · ${de(f.per100.fat, 1)} F</div></span>${icon('chev')}</button>`;
    }).join('');
    $$('[data-ed]', sheet).forEach(b => b.onclick = () => openFoodEditor(b.dataset.ed, { onSave: draw }));
  };
  $('#lb-q', sheet).oninput = draw;
  $('#lb-new', sheet).onclick = () => openFoodEditor(null, { onSave: draw });
  draw();
}

// --- Mahlzeit anlegen/bearbeiten ----------------------------------------------
export function openMealEditor(mealId) {
  const existing = mealId ? store.mealById(mealId) : null;
  const meal = existing ? structuredClone(existing) : { id: 'meal_' + Date.now().toString(36), name: '', items: [] };
  const sheet = openSheet(`${sheetHead(existing ? 'Mahlzeit bearbeiten' : 'Neue Mahlzeit', 'Ein Tap trägt später alle Zutaten ein')}
    <div class="sheet-body">
      <label class="field"><span>Name</span><input id="me-name" value="${esc(meal.name)}" placeholder="z. B. Overnight Oats"></label>
      <div id="me-items"></div>
      <button class="btn ghost block" id="me-add" style="margin-top:6px">${icon('plus')}Zutat hinzufügen</button>
    </div>
    <div class="sheet-foot">
      ${existing ? `<button class="btn danger" id="me-del" style="flex:0 0 auto;width:56px">${icon('trash')}</button>` : ''}
      <button class="btn" id="me-save">${icon('check')}Speichern</button>
    </div>`, { tall: true });
  const draw = () => {
    const tot = store.mealTotals(meal);
    $('#me-items', sheet).innerHTML = (meal.items.length ? meal.items.map((it, i) => {
      const f = store.foodById(it.foodId);
      return `<div class="entry">${foodIcon(f)}<span class="qa-main"><div class="qa-nm">${esc(f ? short(f.name) : '?')}</div></span>
        <input type="number" inputmode="numeric" data-mg="${i}" value="${it.grams}" style="width:72px;background:var(--fill);border:none;border-radius:10px;padding:8px;text-align:right"> g
        <button class="qa-rm" data-mr="${i}">${icon('x')}</button></div>`;
    }).join('') : '<div class="empty">Noch keine Zutaten.</div>') +
      `<p class="hint" style="margin-top:10px">Gesamt: <b>${de(tot.kcal)} kcal · ${de(tot.protein)} g Protein</b></p>`;
    $$('[data-mg]', sheet).forEach(inp => inp.onchange = () => { meal.items[+inp.dataset.mg].grams = Number(inp.value) || 0; draw(); });
    $$('[data-mr]', sheet).forEach(b => b.onclick = () => { meal.items.splice(+b.dataset.mr, 1); draw(); });
  };
  $('#me-add', sheet).onclick = () => openFoodPicker({ title: 'Zutat wählen', onPick: (id) => { meal.items.push({ foodId: id, grams: store.servingGrams(store.foodById(id)) }); draw(); } });
  $('#me-save', sheet).onclick = () => {
    meal.name = $('#me-name', sheet).value.trim();
    if (!meal.name) return toast('Bitte einen Namen eingeben');
    if (!meal.items.length) return toast('Mindestens eine Zutat');
    store.upsertMeal(meal); closeSheet(); router.rerender(); toast('Mahlzeit gespeichert');
  };
  const del = $('#me-del', sheet);
  if (del) del.onclick = () => { if (confirm('Mahlzeit löschen?')) { store.deleteMeal(meal.id); closeSheet(); router.rerender(); } };
  draw();
}

// --- Supplements --------------------------------------------------------------
export function openSuppsSheet(key) {
  const sheet = openSheet(`${sheetHead('Supplements', 'Abhaken, wenn genommen')}<div class="sheet-body" id="sp-body"></div>`);
  const draw = () => {
    const day = store.getDay(key);
    $('#sp-body', sheet).innerHTML = suppRows(store.getState().supplements, day);
    $$('[data-supp]', sheet).forEach(b => b.onclick = () => { store.toggleSupp(key, b.dataset.supp); haptic(5); draw(); afterChange(key); });
    $$('[data-suppall]', sheet).forEach(b => b.onclick = () => {
      for (const x of store.getState().supplements) if ((x.time || 'egal') === b.dataset.suppall) store.setSupp(key, x.id, true);
      haptic(); draw(); afterChange(key);
    });
  };
  draw();
}

// --- Nährstoff-Detail: Nutzen, Woher, Wochen-Ø, beste Quellen -----------------
export function openNutrientSheet(key, nutKey) {
  const n = NUTRIENT_BY_KEY[nutKey];
  const t = store.getState().profile.targets[nutKey] || 0;
  const v = store.computeTotals(key)[nutKey] || 0;
  const wk = store.averageTotals(key, 7);
  const src = store.sourcesFor(key, nutKey);
  const best = store.getState().foods.filter(f => f.whole !== false && (f.per100[nutKey] || 0) > 0)
    .map(f => ({ f, g: store.servingGrams(f), amt: (f.per100[nutKey] || 0) * store.servingGrams(f) / 100 }))
    .sort((a, b) => b.amt - a.amt).slice(0, 4);
  const fmt = (x) => de(x, x < 10 ? 1 : 0);
  const sheet = openSheet(`${sheetHead(esc(n.label), esc(NUTRIENT_INFO[nutKey] || ''))}
    <div class="sheet-body">
      <div class="grid2" style="margin-bottom:12px">
        <div class="wk-tile"><div class="v num">${t ? Math.round(v / t * 100) : 0}%</div><div class="l">heute · ${fmt(v)} / ${fmt(t)} ${n.unit}</div></div>
        <div class="wk-tile"><div class="v num">${t ? Math.round(wk.totals[nutKey] / t * 100) : 0}%</div><div class="l">Ø 7 Tage</div></div>
      </div>
      <div class="part-head"><b>Woher heute</b></div>
      ${src.length ? src.map(x => `<div class="entry"><span class="qa-main"><div class="qa-nm">${esc(short(x.name))}</div></span><span class="qa-kv"><b class="num">${fmt(x.amount)} ${n.unit}</b><span>${x.pct}%</span></span></div>`).join('') : '<div class="empty">Heute noch nichts davon.</div>'}
      <div class="part-head"><b>Beste Quellen</b></div>
      ${best.map(x => `<button class="sugg" data-q="${x.f.id}" data-g="${x.g}">${foodIcon(x.f)}<span class="qa-main"><b>${esc(short(x.f.name))}</b><div class="qa-am">${esc(amountLabel(x.f, x.g))} → ${fmt(x.amt)} ${n.unit}${t ? ` (${Math.round(x.amt / t * 100)}%)` : ''}</div></span><span class="plus">${icon('plus')}</span></button>`).join('')}
    </div>`, { tall: true });
  $$('[data-q]', sheet).forEach(b => b.onclick = () => { closeSheet(); quickAdd(key, b.dataset.q, Number(b.dataset.g)); });
}
