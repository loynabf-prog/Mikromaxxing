// ============================================================================
// Essen – Tagesbilanz, Vorschläge, Einträge, Mahlzeiten, Nährstoffe
// ============================================================================
import * as store from '../store.js';
import { NUTRIENTS, NUTRIENT_BY_KEY, NUTRIENT_INFO, MEAL_SLOTS, SUPP_TIME_LABELS, SUPP_TIME_ORDER, FOOD_CATS } from '../data.js';
import { amountLabel, defaultGrams, fold } from '../parser.js';
import { icon } from '../icons.js';
import { $, $$, esc, de, short, router, openSheet, closeSheet, sheetHead, toast, haptic, foodIcon, longDate } from '../ui.js';
import { openQuickAdd } from './quickadd.js';
import { afterChange } from './today.js';
import { scanAndAdd, openProductSheet } from './scan.js';
import { openAiSetup } from './aisetup.js';
import { estimateFoods, hasAI } from '../lookup.js';
import { recommend, recipeById, dayPlan, currentSlot, PLACES, SLOT_LABELS, fmtH } from '../planner.js';
import { NUTRIENT_DETAILS, HOW_LABELS, suppInfo, fatPartners, foodBenefits, foodSummary } from '../knowledge.js';

let foodDate = null;       // null = heute
let slotSel = null;        // gewählte Tageszeit für Vorschläge
let placeSel = null;       // Ort-Filter für Vorschläge
let nutrMode = 'day';      // 'day' | 'week'
let nutrOpen = false;

export function getFoodDate() { return foodDate || store.todayKey(); }
const LIMIT_KEYS = new Set(NUTRIENTS.filter(n => n.limit).map(n => n.key));

const num = (v) => Number(String(v ?? '').trim().replace(',', '.'));
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
  const mt = store.macroTargets(key);

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
        <div style="text-align:right"><div class="mid num">${de(tot.kcal)}</div><div class="lbl" style="margin-top:5px">kcal · ${tot.kcal <= mt.kcal ? `noch ${de(mt.kcal - tot.kcal)}` : `${de(tot.kcal - mt.kcal)} drüber`}</div></div>
      </div>
      <div class="parts4">
        ${p4('Protein', p.parts.protein)}${p4('Mikros', p.parts.micros, 'nutr-open')}${p4('Wasser', p.parts.water, 'water')}${p4('Supps', p.parts.supps, 'supps')}
      </div>
      <div class="macros"><span>Carbs <b>${de(tot.carbs)}/${de(mt.carbs)} g</b></span><span>Fett <b>${de(tot.fat)}/${de(mt.fat)} g</b></span><span>Ballaststoffe <b>${de(tot.fiber)} g</b></span></div>
    </div>

    <div class="grid3 f-actions" style="margin-bottom:12px">
      <button class="btn" id="f-add">${icon('plus')}Eintragen</button>
      <button class="btn white" id="f-scan">${icon('barcode')}Scannen</button>
      <button class="btn white" id="f-search">${icon('search')}Suchen</button>
    </div>

    ${eatCard(key)}
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

// --- Was soll ich essen? --------------------------------------------------------
function slotsFor(key) {
  const plan = dayPlan(key);
  const meals = plan.slots.filter(x => x.type === 'meal');
  const list = meals.map(x => ({ slot: x.slot, label: SLOT_LABELS[x.slot] || x.title, t: x.t, status: x.status }));
  if (!list.some(x => x.slot === 'snack')) list.push({ slot: 'snack', label: 'Snack', t: null });
  return list;
}
function recRows(key, res) {
  return res.list.map(r => `<div class="rec">
    <button class="rec-main" data-rec="${r.recipe.id}">
      <span class="rec-top"><b>${esc(r.recipe.name)}</b>${r.rating > 0 ? `<i class="rec-fav">${icon('thumbUp')}</i>` : ''}</span>
      <span class="rec-nums num"><b>${de(r.totals.protein)} g P</b> · ${de(r.totals.kcal)} kcal · ${esc(PLACES[r.recipe.place] || '')}${r.recipe.prep ? ` · ${r.recipe.prep} Min` : ''}</span>
      <span class="rec-why">${esc(r.recipe.why)}${r.labels.length ? ` Deckt ${esc(r.labels.join(' & '))}.` : ''}</span>
      <span class="rec-fit ${r.over ? 'over' : ''}">${esc(r.fit)}</span>
    </button>
    <div class="rec-act">
      <button class="rec-b" data-rate="${r.recipe.id}" data-v="1" aria-label="Mag ich">${icon('thumbUp')}</button>
      <button class="rec-b" data-rate="${r.recipe.id}" data-v="-1" aria-label="Nicht mehr vorschlagen">${icon('thumbDown')}</button>
      <button class="plus" data-eat="${r.recipe.id}" aria-label="Eintragen">${icon('plus')}</button>
    </div>
  </div>`).join('') || '<div class="empty">Für diesen Filter habe ich gerade nichts Passendes.</div>';
}
function eatCard(key) {
  const slots = slotsFor(key);
  if (!slotSel || !slots.some(x => x.slot === slotSel)) slotSel = currentSlot(key);
  if (!slots.some(x => x.slot === slotSel)) slotSel = slots[0].slot;
  const res = recommend(key, slotSel, { place: placeSel, limit: 4 });
  return `<div class="card">
    <div class="ch"><span class="ch-title">Was soll ich essen?</span><span class="sub num">~${de(res.kcalB)} kcal · ${de(res.protB)} g P</span></div>
    <div class="hscroll slot-tabs">${slots.map(x => `<button class="chipbtn ${x.slot === slotSel ? 'on' : ''}" data-rslot="${x.slot}">${esc(x.label)}${x.t != null ? ` <small>${fmtH(x.t)}</small>` : ''}</button>`).join('')}</div>
    <div class="hscroll place-tabs"><button class="chipbtn sm ${!placeSel ? 'on' : ''}" data-place="">Überall</button>${['home', 'lidl', 'imbiss', 'out'].map(pl => `<button class="chipbtn sm ${placeSel === pl ? 'on' : ''}" data-place="${pl}">${esc(PLACES[pl])}</button>`).join('')}</div>
    ${recRows(key, res)}
  </div>`;
}
function wireRecs(root, key, onChange) {
  $$('[data-rec]', root).forEach(b => b.onclick = () => openRecipe(key, b.dataset.rec, onChange));
  $$('[data-eat]', root).forEach(b => b.onclick = () => eatRecipe(key, b.dataset.eat, 1, onChange));
  $$('[data-rate]', root).forEach(b => b.onclick = () => {
    const v = store.rateRecipe(b.dataset.rate, Number(b.dataset.v));
    haptic(5);
    toast(v > 0 ? 'Gemerkt – schlage ich öfter vor' : v < 0 ? 'Okay, kommt nicht mehr' : 'Bewertung entfernt');
    onChange();
  });
}
function eatRecipe(key, id, portions = 1, onDone) {
  const r = recipeById(id);
  if (!r) return;
  const before = store.getDay(key).entries.length;
  store.logRecipe(key, r, portions);
  haptic(10); afterChange(key);
  if (onDone) onDone(true);
  toast(`${r.name} eingetragen`, 'Rückgängig', () => { store.truncateEntries(key, before); router.rerender(); });
}
export function openRecipe(key, id, onChange) {
  const r = recipeById(id);
  if (!r) return;
  let portions = 1;
  const sheet = openSheet(`${sheetHead(esc(r.name), esc([PLACES[r.place], r.prep ? r.prep + ' Min' : 'ohne Kochen'].filter(Boolean).join(' · ')))}
    <div class="sheet-body">
      <p class="hint" style="font-size:14.5px">${esc(r.why)}</p>
      <div class="seg" id="rp-seg" style="margin-bottom:12px">${[0.5, 1, 1.5, 2].map(x => `<button data-por="${x}">${String(x).replace('.', ',')}×</button>`).join('')}</div>
      <div class="grid3" id="rp-nut" style="margin-bottom:10px"></div>
      <div id="rp-items"></div>
      <div id="rp-bring"></div>
    </div>
    <div class="sheet-foot"><button class="btn volt block" id="rp-eat">${icon('plus')}Eintragen</button></div>`, { tall: true });
  const draw = () => {
    $$('[data-por]', sheet).forEach(b => b.classList.toggle('on', Number(b.dataset.por) === portions));
    const tot = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const rows = r.items.map(([fid, g]) => {
      const f = store.foodById(fid); if (!f) return '';
      const gg = Math.round(g * portions);
      for (const k in tot) tot[k] += (f.per100[k] || 0) * gg / 100;
      return `<div class="entry">${foodIcon(f)}<span class="qa-main"><div class="qa-nm">${esc(short(f.name))}</div><div class="qa-am">${esc(amountLabel(f, gg))}</div></span><span class="qa-kv"><b class="num">${de(nut(f, gg, 'protein'))} g</b><span>${de(nut(f, gg, 'kcal'))} kcal</span></span></div>`;
    }).join('');
    $('#rp-nut', sheet).innerHTML = [['kcal', 'kcal', ''], ['protein', 'Protein', ' g'], ['carbs', 'Carbs', ' g']].map(([k, l, u]) => `<div class="wk-tile"><div class="v num" style="font-size:18px">${de(tot[k])}${u}</div><div class="l">${l}</div></div>`).join('');
    $('#rp-items', sheet).innerHTML = `<div class="part-head"><b>Zutaten</b><span class="sub">Fett ${de(tot.fat)} g</span></div>${rows}`;
  };
  $$('[data-por]', sheet).forEach(b => b.onclick = () => { portions = Number(b.dataset.por); draw(); });
  $('#rp-eat', sheet).onclick = () => { closeSheet(); eatRecipe(key, id, portions, onChange); };
  draw();
}
// Vorschläge für einen Slot (aus „Dein Tag")
export function openRecommendSheet(key, slot) {
  let place = null;
  const sheet = openSheet(`${sheetHead(esc(SLOT_LABELS[slot] || 'Was soll ich essen?'), 'Passend zu deinem Budget, deinen Lücken und dem, was du magst')}
    <div class="hscroll place-tabs" id="rs-places"></div>
    <div class="sheet-body" id="rs-body"></div>`, { tall: true });
  const draw = () => {
    const res = recommend(key, slot, { place, limit: 6 });
    $('#rs-places', sheet).innerHTML = `<button class="chipbtn sm ${!place ? 'on' : ''}" data-pl="">Überall</button>${['home', 'lidl', 'imbiss', 'out'].map(pl => `<button class="chipbtn sm ${place === pl ? 'on' : ''}" data-pl="${pl}">${esc(PLACES[pl])}</button>`).join('')}`;
    $('#rs-body', sheet).innerHTML = `<p class="hint">Plan für jetzt: ~${de(res.kcalB)} kcal und ${de(res.protB)} g Protein.</p>${recRows(key, res)}`;
    $$('[data-pl]', sheet).forEach(b => b.onclick = () => { place = b.dataset.pl || null; draw(); });
    wireRecs(sheet, key, (ate) => { if (ate === true) closeSheet(); else draw(); });
  };
  draw();
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
    ${body || '<div class="empty">Noch nichts eingetragen.<br>Unten einfach erzählen, was du gegessen hast – oder „Was soll ich essen?" fragen.</div>'}
    ${day.entries.length ? `<div class="chips" style="margin-top:12px"><button class="chipbtn" id="tpl-save">${icon('pin')}Als Standardtag merken</button></div>` : ''}
  </div>`;
}

function suppCard(key, day) {
  const supps = store.getState().supplements;
  const taken = supps.filter(x => day.supps[x.id]).length;
  return `<div class="card">
    <div class="ch"><span class="chip" style="background:rgba(255,111,181,.14);color:var(--pill)">${icon('pill')}Supplements</span><span class="sub">${taken} / ${supps.length}</span></div>
    ${suppRows(supps, day)}
  </div>`;
}
function suppRows(supps, day) {
  return SUPP_TIME_ORDER.map(tk => {
    const g = supps.filter(x => (x.time || 'egal') === tk);
    if (!g.length) return '';
    return `<div class="part-head"><b>${SUPP_TIME_LABELS[tk]}</b>${g.some(x => !day.supps[x.id]) ? `<button class="sub" data-suppall="${tk}" style="color:var(--spo);font-weight:800">alle abhaken</button>` : ''}</div>
      ${g.map(x => { const inf = suppInfo(x); return `<div class="supp-line"><button class="supp-row ${day.supps[x.id] ? 'on' : ''}" data-supp="${x.id}">
        <span class="box">${day.supps[x.id] ? icon('check') : ''}</span>
        <span style="flex:1"><b>${esc(x.name)}${x.dose ? `<em>${esc(x.dose)}</em>` : ''}</b><span>${esc(HOW_LABELS[inf.how] || '')}</span></span>
      </button><button class="info-btn" data-suppinfo="${x.id}" aria-label="Infos zu ${esc(x.name)}">${icon('info')}</button></div>`; }).join('')}`;
  }).join('');
}

function gapsCard(key) {
  const rec = store.getRecommendations(key);
  const gaps = rec.gaps.filter(g => g.best && g.nutKey !== 'protein').slice(0, 4);
  if (!gaps.length) return '';
  return `<div class="card">
    <div class="ch"><span class="ch-title">Lücken schließen</span><span class="sub">größte zuerst</span></div>
    ${gaps.map(g => { const nt = NUTRIENT_BY_KEY[g.nutKey]; const f = g.best.food; return `
      <div class="sugg"><button class="sugg-main" data-nutr="${g.nutKey}">
        ${foodIcon(f)}<span class="qa-main"><b>${esc(nt.label)} · ${g.currentPct}%</b>
        <div class="qa-am">${esc(short(f.name))} ${esc(amountLabel(f, g.best.grams))} → ${g.best.addedPct >= 100 ? 'deckt den Tag' : '+' + g.best.addedPct + ' %'}</div></span></button>
        <button class="plus" data-quick="${f.id}" data-grams="${g.best.grams}" aria-label="Eintragen">${icon('plus')}</button></div>`; }).join('')}
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
  $('#f-scan', app).onclick = () => scanAndAdd({ title: 'Eintragen', onAdd: ({ foodId, grams }) => quickAdd(key, foodId, grams) });
  $('#f-lib', app).onclick = () => openLibrary();
  $$('[data-rslot]', app).forEach(b => b.onclick = () => { slotSel = b.dataset.rslot; router.rerender(); });
  $$('[data-place]', app).forEach(b => b.onclick = () => { placeSel = b.dataset.place || null; router.rerender(); });
  wireRecs(app, key, () => router.rerender());
  $$('[data-quick]', app).forEach(b => b.onclick = () => quickAdd(key, b.dataset.quick, Number(b.dataset.grams)));
  $$('[data-info]', app).forEach(b => b.onclick = () => openAmountSheet({ key, foodId: b.dataset.info, grams: Number(b.dataset.grams) }));
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
  $$('[data-suppinfo]', app).forEach(b => b.onclick = () => openSuppInfo(key, b.dataset.suppinfo));
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
      <div style="display:flex;gap:8px"><button class="sheet-x" id="fav" aria-label="Favorit" style="color:${store.isFavorite(f.id) ? '#FFC93C' : 'var(--dim)'}">${icon('star')}</button><button class="sheet-x" data-close>${icon('x')}</button></div></div>
    <div class="sheet-body">
    <div class="stepper"><button class="st-btn" data-d="-1">${icon('minus')}</button><div class="st-val num" id="av"></div><button class="st-btn" data-d="1">${icon('plus')}</button></div>
    <div class="chips" style="margin-top:10px">
      ${f.piece ? [1, 2, 3, 4].map(n => `<button class="chipbtn" data-g="${n * f.piece.g}">${n} ${esc(f.piece.name)}</button>`).join('') : ''}
      ${servings.map(sv => `<button class="chipbtn" data-g="${sv.grams}">${esc(sv.label)}</button>`).join('')}
      ${[50, 100, 150, 200].map(x => `<button class="chipbtn" data-g="${x}">${x} g</button>`).join('')}
    </div>
    <div class="grid3" id="anut" style="margin-top:14px"></div>
    <div id="abring"></div>
    </div>
    <div class="sheet-foot">
      ${entry ? `<button class="btn danger" id="del" style="flex:0 0 auto;width:56px">${icon('trash')}</button>` : ''}
      <button class="btn" id="ok">${icon('check')}${entry ? 'Speichern' : 'Hinzufügen'}</button>
    </div>`);
  const show = () => {
    $('#av', sheet).innerHTML = f.piece ? `${de(g / f.piece.g, (g / f.piece.g) % 1 ? 1 : 0)}<small>${esc(f.piece.name.toUpperCase())} · ${g} G</small>` : `${g}<small>GRAMM</small>`;
    $('#anut', sheet).innerHTML = [['kcal', 'kcal', ''], ['protein', 'Protein', ' g'], ['carbs', 'Carbs', ' g']]
      .map(([k, l, u]) => `<div class="wk-tile"><div class="v num" style="font-size:18px">${de(nut(f, g, k))}${u}</div><div class="l">${l}</div></div>`).join('');
    $('#abring', sheet).innerHTML = bringHtml(f, g);
    $$('[data-bring]', sheet).forEach(b => b.onclick = () => openNutrientSheet(key, b.dataset.bring));
  };
  sheet.classList.add('tall');
  $$('[data-d]', sheet).forEach(b => b.onclick = () => { g = Math.max(step, g + Number(b.dataset.d) * step); haptic(4); show(); });
  $$('[data-g]', sheet).forEach(b => b.onclick = () => { g = Number(b.dataset.g); show(); });
  $('#fav', sheet).onclick = () => { const on = store.toggleFavorite(f.id); $('#fav', sheet).style.color = on ? '#FFC93C' : 'var(--dim)'; toast(on ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt'); };
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

// Was bringt dir diese Menge? (Anteil am Tagesziel + wofür gut)
function bringHtml(f, g) {
  const t = store.getState().profile.targets;
  const { good, warn } = foodBenefits(f, g, t);
  const rows = good.map(b => `<button class="bring" data-bring="${b.key}"><span class="pct" style="color:var(--nut)">${Math.round(b.pct)} %</span>
      <span class="bt"><b>${esc(b.label)}</b><span>${esc(b.short)}</span></span>${icon('chev')}</button>`)
    .concat(warn.map(b => `<button class="bring" data-bring="${b.key}"><span class="pct" style="color:var(--warn)">${Math.round(b.pct)} %</span>
      <span class="bt"><b>${esc(b.label)}</b><span>der Obergrenze – in Maßen</span></span>${icon('chev')}</button>`));
  return `<div class="part-head" style="margin-top:16px"><b>Was bringt dir das</b><span class="sub">vom Tagesziel</span></div>
    <p class="hint" style="margin:0 0 4px">${esc(foodSummary(f, g, t))}</p>
    ${rows.length ? rows.join('') : '<div class="empty" style="padding:8px">Keine Vitamine oder Mineralstoffe in nennenswerter Menge.</div>'}`;
}

// --- Suche ------------------------------------------------------------------
export function openFoodPicker({ key = getFoodDate(), onPick = null, title = 'Lebensmittel suchen' } = {}) {
  const sheet = openSheet(`${sheetHead(title)}
    <div class="fp-row"><div class="field" style="margin:0;flex:1"><input type="search" id="fp-q" placeholder="z. B. Skyr, Lachs, Haferflocken" autocomplete="off"></div>
      <button class="icon-btn" id="fp-scan" aria-label="Barcode scannen">${icon('barcode')}</button></div>
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
      (q ? `<button class="btn block" id="fp-ai" style="margin:12px 0 0">${icon('spark')}„${esc($('#fp-q', sheet).value.trim())}" mit Claude nachschlagen</button>` : '') +
      `<button class="btn ghost block" id="fp-new" style="margin:10px 0 12px">${icon('plus')}${q ? 'Selbst anlegen' : 'Neues Lebensmittel anlegen'}</button>`;
    $$('[data-pick]', listEl).forEach(b => b.onclick = () => {
      if (onPick) { onPick(b.dataset.pick); closeSheet(); }
      else openAmountSheet({ key, foodId: b.dataset.pick, onDone: () => closeSheet() });
    });
    const aiBtn = $('#fp-ai', listEl);
    if (aiBtn) aiBtn.onclick = () => lookupAndPick($('#fp-q', sheet).value.trim(), aiBtn);
    $('#fp-new', listEl).onclick = () => {
      const raw = $('#fp-q', sheet).value.trim();
      openFoodEditor(null, { name: raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '', onSave: food => { draw(); if (onPick) { onPick(food.id); closeSheet(); } } });
    };
  };
  // Ergebnis von Claude/Scan: Vorschau → übernehmen
  const picked = ({ foodId, grams }) => {
    if (onPick) { closeSheet(); onPick(foodId); return; }
    closeSheet(); quickAdd(key, foodId, grams);
  };
  async function lookupAndPick(text, btn) {
    if (!hasAI()) return openAiSetup(() => { if (hasAI()) draw(); });
    btn.disabled = true; btn.innerHTML = `${icon('loader', 'spin')}Claude schätzt die Werte …`;
    try {
      const r = (await estimateFoods([text])).get(text);
      if (!r || r.notFood) throw new Error('Das klingt nicht nach einem Lebensmittel');
      openProductSheet({ food: r.food, ai: true, title: onPick ? 'Übernehmen' : 'Eintragen', onAdd: picked });
    } catch (e) { toast(e.message || 'Nachschlagen fehlgeschlagen'); }
    if (btn.isConnected) draw();
  }
  $('#fp-scan', sheet).onclick = () => scanAndAdd({ title: onPick ? 'Übernehmen' : 'Eintragen', onAdd: picked });
  $('#fp-q', sheet).oninput = draw;
  $('#fp-q', sheet).onkeydown = (e) => { if (e.key === 'Enter') { const b = $('#fp-ai', sheet); if (b && !$('[data-pick]', sheet)) b.click(); } };
  draw();
  if (!onPick) setTimeout(() => $('#fp-q', sheet).focus(), 60);
}

// --- Lebensmittel anlegen/bearbeiten ----------------------------------------
const CATS = FOOD_CATS;
export function openFoodEditor(foodId, { name = '', draft = null, onSave } = {}) {
  const existing = foodId ? store.foodById(foodId) : null;
  const f = existing ? structuredClone(existing) : draft ? { servings: [], aliases: [], ...structuredClone(draft), id: null, ...(name ? { name } : {}) } : {
    id: null, name, cat: 'Sonstiges', whole: true, servings: [], aliases: [],
    per100: Object.fromEntries(NUTRIENTS.map(n => [n.key, 0])),
  };
  const unit = f.piece ? 'piece' : 'gram';
  const main = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar'];
  const micros = NUTRIENTS.filter(n => !main.includes(n.key));
  const sheet = openSheet(`${sheetHead(existing ? 'Lebensmittel bearbeiten' : 'Neues Lebensmittel', 'Werte pro 100 g – stehen auf jeder Packung')}
    <div class="sheet-body">
      ${f.source === 'ai' ? `<div class="prod-src"><span>${icon('spark')}Von Claude geschätzt – passe an, was du besser weißt</span></div>` : f.source === 'off' ? `<div class="prod-src"><span>${icon('barcode')}Packungswerte von Open Food Facts${f.barcode ? ` · ${esc(f.barcode)}` : ''}</span></div>` : ''}
      <label class="field"><span>Name</span><input id="fe-name" value="${esc(f.name)}" placeholder="z. B. Döner Box"></label>
      <div class="grid2">
        <label class="field"><span>Kategorie</span><select id="fe-cat">${CATS.map(c => `<option ${c === f.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label class="field"><span>Portion</span><select id="fe-unit"><option value="gram" ${unit === 'gram' ? 'selected' : ''}>in Gramm</option><option value="piece" ${unit === 'piece' ? 'selected' : ''}>in Stück</option></select></label>
      </div>
      <div class="grid3" id="fe-piece" ${unit === 'piece' ? '' : 'style="display:none"'}>
        <label class="field"><span>Stück heißt</span><input id="fe-pn" value="${esc(f.piece ? f.piece.name : 'Stück')}"></label>
        <label class="field"><span>g pro Stück</span><input id="fe-pg" type="text" inputmode="decimal" value="${f.piece ? f.piece.g : 100}"></label>
        <label class="field"><span>Standard</span><input id="fe-pd" type="text" inputmode="decimal" value="${f.piece ? f.piece.def || 1 : 1}"></label>
      </div>
      <label class="field" id="fe-serv" ${unit === 'gram' ? '' : 'style="display:none"'}><span>Übliche Portion (g)</span><input id="fe-sg" type="text" inputmode="decimal" value="${f.servings && f.servings[0] ? f.servings[0].grams : 100}"></label>
      <div class="grid3">${main.map(k => `<label class="field"><span>${NUTRIENT_BY_KEY[k].label} (${NUTRIENT_BY_KEY[k].unit})</span><input type="text" inputmode="decimal" step="any" data-n="${k}" value="${f.per100[k] || 0}"></label>`).join('')}</div>
      <label class="field"><span>Weitere Namen (für Eintragen per Satz, mit Komma)</span><input id="fe-al" value="${esc((f.aliases || []).join(', '))}" placeholder="z. B. döner, dönerbox"></label>
      <button class="more" id="fe-mtog" style="margin:4px 0 10px">Mikronährstoffe ${icon('chevD')}</button>
      <div class="grid3" id="fe-micros" style="display:none">${micros.map(n => `<label class="field"><span>${esc(n.label)} (${n.unit})</span><input type="text" inputmode="decimal" step="any" data-n="${n.key}" value="${f.per100[n.key] || 0}"></label>`).join('')}</div>
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
    $$('[data-n]', sheet).forEach(inp => { f.per100[inp.dataset.n] = num(inp.value) || 0; });
    if ($('#fe-unit', sheet).value === 'piece') {
      f.piece = { name: $('#fe-pn', sheet).value.trim() || 'Stück', g: num($('#fe-pg', sheet).value) || 100, def: num($('#fe-pd', sheet).value) || 1 };
      f.servings = [];
    } else {
      delete f.piece;
      const sg = num($('#fe-sg', sheet).value) || 100;
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
    $$('[data-suppinfo]', sheet).forEach(b => b.onclick = () => openSuppInfo(key, b.dataset.suppinfo, draw));
    $$('[data-suppall]', sheet).forEach(b => b.onclick = () => {
      for (const x of store.getState().supplements) if ((x.time || 'egal') === b.dataset.suppall) store.setSupp(key, x.id, true);
      haptic(); draw(); afterChange(key);
    });
  };
  draw();
}

// --- Supplement-Infos: wann, wie, wofür, was dazu essen --------------------------
export function openSuppInfo(key, id, onChange) {
  const sp = store.getState().supplements.find(x => x.id === id);
  if (!sp) return;
  const inf = suppInfo(sp);
  const day = store.getDay(key);
  const knRow = (ic, title, text) => text ? `<div class="kn-row"><span class="kn-ic">${icon(ic)}</span><div><b>${title}</b><p>${esc(text)}</p></div></div>` : '';
  let partners = '';
  if (inf.how === 'fat') {
    const eatenFat = day.entries.map(e => ({ e, f: store.foodById(e.foodId) }))
      .filter(x => x.f && (x.f.per100.fat || 0) * x.e.grams / 100 >= 6);
    const list = fatPartners(store.getState().foods, store.servingGrams);
    partners = `<div class="part-head"><b>Dazu passt</b><span class="sub">mind. 6 g Fett</span></div>
      ${eatenFat.length ? `<p class="hint" style="margin:0 0 8px">Heute schon gegessen: ${eatenFat.slice(0, 3).map(x => `${esc(short(x.f.name))} (${new Date(x.e.ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})`).join(', ')} – nimm's am besten dazu.</p>` : ''}
      ${list.map(x => `<div class="sugg"><button class="sugg-main" data-info="${x.food.id}" data-grams="${x.grams}">${foodIcon(x.food)}<span class="qa-main"><b>${esc(short(x.food.name))}</b><div class="qa-am">${esc(amountLabel(x.food, x.grams))} · ${de(x.fat)} g Fett${x.o3 >= 300 ? ' · Omega-3' : ''}</div></span></button>
        <button class="plus" data-quick="${x.food.id}" data-grams="${x.grams}" aria-label="Eintragen">${icon('plus')}</button></div>`).join('')}`;
  }
  const taken = () => !!store.getDay(key).supps[id];
  const sheet = openSheet(`${sheetHead(esc(sp.name), esc(sp.dose || ''))}
    <div class="sheet-body">
      <div class="kn-tags"><span class="kn-tag time">${icon('clock')} ${esc(inf.when)}</span><span class="kn-tag ${inf.how}">${esc(HOW_LABELS[inf.how])}</span></div>
      <div class="kn">
        ${knRow('target', 'Wofür', inf.why)}
        ${knRow('bulb', 'So nimmst du es', inf.tip)}
        ${knRow('alert', 'Beachten', inf.avoid)}
        ${!inf.known && !inf.why ? knRow('info', 'Eigene Infos', 'Trag unter Einstellungen → Supplements ein, wofür es ist und womit du es nimmst.') : ''}
      </div>
      ${partners}
    </div>
    <div class="sheet-foot"><button class="btn block" id="si-take"></button></div>`, { tall: inf.how === 'fat' });
  const btn = $('#si-take', sheet);
  const showBtn = () => { btn.className = `btn block ${taken() ? 'ghost' : ''}`; btn.innerHTML = taken() ? `${icon('check')}Genommen – rückgängig` : `${icon('check')}Als genommen abhaken`; };
  btn.onclick = () => { store.toggleSupp(key, id); haptic(8); showBtn(); afterChange(key); if (onChange) onChange(); };
  $$('[data-quick]', sheet).forEach(b => b.onclick = () => { closeSheet(); quickAdd(key, b.dataset.quick, Number(b.dataset.grams)); });
  $$('[data-info]', sheet).forEach(b => b.onclick = () => openAmountSheet({ key, foodId: b.dataset.info, grams: Number(b.dataset.grams) }));
  showBtn();
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
  const kd = NUTRIENT_DETAILS[nutKey] || {};
  const knRow = (ic, title, text) => text ? `<div class="kn-row"><span class="kn-ic">${icon(ic)}</span><div><b>${title}</b><p>${esc(text)}</p></div></div>` : '';
  const sheet = openSheet(`${sheetHead(esc(n.label), esc(kd.short || NUTRIENT_INFO[nutKey] || ''))}
    <div class="sheet-body">
      <div class="kn">
        ${knRow('info', 'Wofür', kd.why || NUTRIENT_INFO[nutKey])}
        ${knRow('dumbbell', 'Für dich', kd.you)}
        ${knRow('alert', 'Zu wenig merkst du an', kd.low)}
        ${knRow('bulb', 'Tipp', kd.tip)}
      </div>
      <div class="grid2" style="margin-bottom:12px">
        <div class="wk-tile"><div class="v num">${t ? Math.round(v / t * 100) : 0}%</div><div class="l">heute · ${fmt(v)} / ${fmt(t)} ${n.unit}</div></div>
        <div class="wk-tile"><div class="v num">${t ? Math.round(wk.totals[nutKey] / t * 100) : 0}%</div><div class="l">Ø 7 Tage</div></div>
      </div>
      <div class="part-head"><b>Woher heute</b></div>
      ${src.length ? src.map(x => `<div class="entry"><span class="qa-main"><div class="qa-nm">${esc(short(x.name))}</div></span><span class="qa-kv"><b class="num">${fmt(x.amount)} ${n.unit}</b><span>${x.pct}%</span></span></div>`).join('') : '<div class="empty">Heute noch nichts davon.</div>'}
      <div class="part-head"><b>Beste Quellen</b></div>
      ${best.map(x => `<div class="sugg"><button class="sugg-main" data-fi="${x.f.id}" data-g="${x.g}">${foodIcon(x.f)}<span class="qa-main"><b>${esc(short(x.f.name))}</b><div class="qa-am">${esc(amountLabel(x.f, x.g))} → ${fmt(x.amt)} ${n.unit}${t ? ` (${Math.round(x.amt / t * 100)}%)` : ''}</div></span></button><button class="plus" data-q="${x.f.id}" data-g="${x.g}" aria-label="Eintragen">${icon('plus')}</button></div>`).join('')}
    </div>`, { tall: true });
  $$('[data-q]', sheet).forEach(b => b.onclick = () => { closeSheet(); quickAdd(key, b.dataset.q, Number(b.dataset.g)); });
  $$('[data-fi]', sheet).forEach(b => b.onclick = () => openAmountSheet({ key, foodId: b.dataset.fi, grams: Number(b.dataset.g) }));
}
