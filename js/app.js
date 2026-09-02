// ============================================================================
// Mikromaxxing – App-Logik & UI
// ============================================================================
import { NUTRIENTS, NUTRIENT_BY_KEY } from './data.js';
import * as store from './store.js';

// --- Zustand der Oberfläche ---------------------------------------------------
let currentTab = 'today';
let currentDate = store.todayKey();

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const modalRoot = $('#modal-root');

// --- Formatierung ------------------------------------------------------------
function fmt(value, unit) {
  if (unit === 'kcal') return Math.round(value);
  if (value >= 100) return Math.round(value);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(1);
}
function pct(value, target) {
  if (!target) return 0;
  return Math.round((value / target) * 100);
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ============================================================================
// Navigation
// ============================================================================
function render() {
  if (currentTab === 'today') renderToday();
  else if (currentTab === 'library') renderLibrary();
  else if (currentTab === 'trends') renderTrends();
  else if (currentTab === 'profile') renderProfile();
  updateNav();
  window.scrollTo(0, 0);
}

function updateNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === currentTab);
  });
}

function setTab(tab) { currentTab = tab; render(); }

// ============================================================================
// View: HEUTE (Dashboard)
// ============================================================================
function renderToday() {
  const profile = store.getState().profile;
  const targets = profile.targets;
  const totals = store.computeTotals(currentDate);
  const day = store.getDay(currentDate);

  const macroKeys = ['protein', 'carbs', 'fat'];
  const macroColors = { protein: 'var(--protein)', carbs: 'var(--carbs)', fat: 'var(--fat)' };

  app.innerHTML = `
    <div class="date-bar">
      <button class="date-nav" id="prev-day" aria-label="Vorheriger Tag">‹</button>
      <div class="date-label">${esc(store.formatDateLabel(currentDate))}</div>
      <button class="date-nav" id="next-day" aria-label="Nächster Tag">›</button>
    </div>

    <!-- Kalorien-Hauptkarte -->
    <div class="card calorie-card">
      ${calorieRing(totals.kcal, targets.kcal)}
      <div class="macro-mini">
        ${macroKeys.map(k => macroBar(k, totals[k], targets[k], macroColors[k])).join('')}
      </div>
    </div>

    <!-- Wasser -->
    <div class="card">
      <div class="card-head"><span>💧 Wasser</span>
        <span class="card-head-val">${(day.water/1000).toFixed(2)} / ${(profile.water/1000).toFixed(1)} L</span>
      </div>
      <div class="progress"><div class="progress-fill water" style="width:${Math.min(100, pct(day.water, profile.water))}%"></div></div>
      <div class="water-btns">
        <button data-water="250" class="chip">+250 ml</button>
        <button data-water="500" class="chip">+500 ml</button>
        <button data-water="-250" class="chip subtle">−250 ml</button>
        <button id="water-reset" class="chip subtle">Reset</button>
      </div>
    </div>

    <!-- Supplemente -->
    <div class="card">
      <div class="card-head"><span>💊 Supplemente</span>
        <span class="card-head-val">${suppDoneCount(day)} / ${store.getState().supplements.length}</span>
      </div>
      <div class="supp-list">
        ${store.getState().supplements.map(s => `
          <button class="supp-item ${day.supps[s.id] ? 'done' : ''}" data-supp="${s.id}">
            <span class="supp-check">${day.supps[s.id] ? '✓' : ''}</span>
            <span class="supp-name">${esc(s.name)}${s.dose ? ` <em>${esc(s.dose)}</em>` : ''}</span>
          </button>`).join('')}
      </div>
    </div>

    <!-- Mikros: Vitamine -->
    <div class="card">
      <div class="card-head"><span>Vitamine</span></div>
      <div class="micro-grid">
        ${NUTRIENTS.filter(nt => nt.group === 'vitamin').map(nt => microRow(nt, totals[nt.key], targets[nt.key])).join('')}
      </div>
    </div>

    <!-- Mikros: Mineralstoffe -->
    <div class="card">
      <div class="card-head"><span>Mineralstoffe & Spurenelemente</span></div>
      <div class="micro-grid">
        ${NUTRIENTS.filter(nt => nt.group === 'mineral').map(nt => microRow(nt, totals[nt.key], targets[nt.key])).join('')}
      </div>
    </div>

    <!-- Weitere Makros + Omega3 -->
    <div class="card">
      <div class="card-head"><span>Weitere Werte</span></div>
      <div class="micro-grid">
        ${['fiber','sugar','satfat'].map(k => microRow(NUTRIENT_BY_KEY[k], totals[k], targets[k])).join('')}
        ${microRow(NUTRIENT_BY_KEY['omega3'], totals.omega3, targets.omega3)}
      </div>
    </div>

    <!-- Heutige Einträge -->
    <div class="card">
      <div class="card-head"><span>Gegessen (${day.entries.length})</span></div>
      <div class="entry-list">
        ${day.entries.length === 0
          ? '<div class="empty">Noch nichts erfasst. Tippe auf ＋ um Essen hinzuzufügen.</div>'
          : day.entries.map((e, i) => entryRow(e, i)).join('')}
      </div>
    </div>

    <!-- Gewicht & Notiz -->
    <div class="card">
      <div class="card-head"><span>Tagesgewicht</span></div>
      <div class="weight-row">
        <input type="number" inputmode="decimal" id="weight-input" placeholder="kg" value="${day.weight ?? ''}" step="0.1">
        <span class="unit-suffix">kg</span>
      </div>
    </div>

    <div class="spacer"></div>
    <button class="fab" id="add-food-btn" aria-label="Essen hinzufügen">＋</button>
  `;

  // Events
  $('#prev-day').onclick = () => { currentDate = store.shiftDate(currentDate, -1); renderToday(); };
  $('#next-day').onclick = () => { currentDate = store.shiftDate(currentDate, 1); renderToday(); };
  app.querySelectorAll('[data-water]').forEach(b => b.onclick = () => {
    const d = store.getDay(currentDate);
    store.setWater(currentDate, d.water + Number(b.dataset.water));
    renderToday();
  });
  $('#water-reset').onclick = () => { store.setWater(currentDate, 0); renderToday(); };
  app.querySelectorAll('[data-supp]').forEach(b => b.onclick = () => {
    store.toggleSupp(currentDate, b.dataset.supp); renderToday();
  });
  app.querySelectorAll('[data-entry]').forEach(b => b.onclick = () => {
    store.removeEntry(currentDate, Number(b.dataset.entry)); renderToday();
  });
  const wInput = $('#weight-input');
  wInput.onchange = () => store.setWeight(currentDate, wInput.value);
  $('#add-food-btn').onclick = openAddFoodSheet;
}

function calorieRing(value, target) {
  const p = Math.min(100, pct(value, target));
  const r = 52, c = 2 * Math.PI * r;
  const offset = c * (1 - p / 100);
  const remaining = Math.round(target - value);
  return `
    <div class="ring-wrap">
      <svg viewBox="0 0 120 120" class="ring">
        <circle cx="60" cy="60" r="${r}" class="ring-bg"/>
        <circle cx="60" cy="60" r="${r}" class="ring-fg"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}"
          transform="rotate(-90 60 60)"/>
      </svg>
      <div class="ring-center">
        <div class="ring-value">${Math.round(value)}</div>
        <div class="ring-label">/ ${target} kcal</div>
        <div class="ring-sub ${remaining < 0 ? 'over' : ''}">
          ${remaining >= 0 ? `${remaining} übrig` : `${Math.abs(remaining)} über`}
        </div>
      </div>
    </div>`;
}

function macroBar(key, value, target, color) {
  const nt = NUTRIENT_BY_KEY[key];
  const p = Math.min(100, pct(value, target));
  return `
    <div class="macro-item">
      <div class="macro-top"><span>${nt.label}</span><span>${Math.round(value)} / ${target} g</span></div>
      <div class="progress"><div class="progress-fill" style="width:${p}%;background:${color}"></div></div>
    </div>`;
}

function microRow(nt, value, target) {
  const p = pct(value, target);
  const isLimit = nt.limit;
  let cls = 'low';
  if (isLimit) cls = value > target ? 'over' : 'ok';
  else if (p >= 100) cls = 'full';
  else if (p >= 66) cls = 'mid';
  return `
    <div class="micro-row">
      <div class="micro-name">${esc(nt.label)}</div>
      <div class="micro-bar"><div class="micro-fill ${cls}" style="width:${Math.min(100, p)}%"></div></div>
      <div class="micro-val">${fmt(value, nt.unit)}<span class="micro-unit">/${target}${nt.unit}</span></div>
    </div>`;
}

function entryRow(entry, index) {
  const food = store.foodById(entry.foodId);
  const name = food ? food.name : '⚠︎ gelöscht';
  const kcal = food ? Math.round((food.per100.kcal || 0) * entry.grams / 100) : 0;
  const prot = food ? Math.round((food.per100.protein || 0) * entry.grams / 100) : 0;
  return `
    <div class="entry-row">
      <div class="entry-main">
        <div class="entry-name">${esc(name)}</div>
        <div class="entry-sub">${entry.grams} g · ${kcal} kcal · ${prot} g P</div>
      </div>
      <button class="entry-del" data-entry="${index}" aria-label="Entfernen">✕</button>
    </div>`;
}

function suppDoneCount(day) {
  return store.getState().supplements.filter(s => day.supps[s.id]).length;
}

// ============================================================================
// Sheet: Essen hinzufügen
// ============================================================================
function openAddFoodSheet() {
  const foods = store.getState().foods;
  let query = '';
  let selected = null;

  function draw() {
    const filtered = foods
      .filter(f => f.name.toLowerCase().includes(query.toLowerCase()) || (f.cat||'').toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));

    modalRoot.innerHTML = `
      <div class="sheet-overlay">
        <div class="sheet">
          <div class="sheet-head">
            <strong>Essen hinzufügen</strong>
            <button class="sheet-close" id="sheet-close">✕</button>
          </div>
          <input type="search" id="food-search" class="search" placeholder="Suchen…" value="${esc(query)}" autocomplete="off">
          ${selected ? selectedPanel(selected) : ''}
          <div class="food-results">
            ${filtered.length === 0
              ? '<div class="empty">Nichts gefunden. Neues Lebensmittel im Tab „Bibliothek" anlegen.</div>'
              : filtered.map(f => `
                <button class="food-opt ${selected && selected.id === f.id ? 'sel' : ''}" data-food="${f.id}">
                  <span class="food-opt-name">${esc(f.name)}</span>
                  <span class="food-opt-meta">${Math.round(f.per100.kcal)} kcal · ${f.per100.protein} P <em>/100g</em></span>
                </button>`).join('')}
          </div>
        </div>
      </div>`;

    $('#sheet-close').onclick = closeSheet;
    $('.sheet-overlay').onclick = (e) => { if (e.target.classList.contains('sheet-overlay')) closeSheet(); };
    const search = $('#food-search');
    search.oninput = () => { query = search.value; const pos = search.selectionStart; draw(); const ns=$('#food-search'); ns.focus(); ns.setSelectionRange(pos,pos); };
    modalRoot.querySelectorAll('[data-food]').forEach(b => b.onclick = () => {
      selected = store.foodById(b.dataset.food); draw();
    });
    if (selected) wireSelectedPanel(selected);
  }

  function selectedPanel(food) {
    const defGrams = (food.servings && food.servings[0]) ? food.servings[0].grams : 100;
    return `
      <div class="sel-panel">
        <div class="sel-name">${esc(food.name)}</div>
        <div class="serving-chips">
          ${(food.servings||[]).map(s => `<button class="chip" data-serv="${s.grams}">${esc(s.label)}</button>`).join('')}
          <button class="chip" data-serv="100">100 g</button>
        </div>
        <div class="gram-row">
          <input type="number" inputmode="decimal" id="gram-input" value="${defGrams}" step="1" min="0">
          <span class="unit-suffix">g</span>
          <button class="btn-primary" id="confirm-add">Hinzufügen</button>
        </div>
        <div class="sel-preview" id="sel-preview"></div>
      </div>`;
  }

  function wireSelectedPanel(food) {
    const gramInput = $('#gram-input');
    const preview = $('#sel-preview');
    const updatePreview = () => {
      const g = Number(gramInput.value) || 0;
      const f = g / 100;
      preview.innerHTML = `
        <span>${Math.round(food.per100.kcal*f)} kcal</span>
        <span>${(food.per100.protein*f).toFixed(1)} g P</span>
        <span>${(food.per100.carbs*f).toFixed(1)} g C</span>
        <span>${(food.per100.fat*f).toFixed(1)} g F</span>`;
    };
    gramInput.oninput = updatePreview;
    updatePreview();
    modalRoot.querySelectorAll('[data-serv]').forEach(b => b.onclick = () => {
      gramInput.value = b.dataset.serv; updatePreview();
    });
    $('#confirm-add').onclick = () => {
      const g = Number(gramInput.value) || 0;
      if (g > 0) { store.addEntry(currentDate, food.id, g); closeSheet(); renderToday(); }
    };
  }

  draw();
  setTimeout(() => { const s = $('#food-search'); if (s) s.focus(); }, 50);
}

function closeSheet() { modalRoot.innerHTML = ''; }

// ============================================================================
// View: BIBLIOTHEK
// ============================================================================
function renderLibrary() {
  const foods = [...store.getState().foods].sort((a, b) =>
    (a.cat||'').localeCompare(b.cat||'') || a.name.localeCompare(b.name));
  const cats = [...new Set(foods.map(f => f.cat || 'Sonstige'))];

  app.innerHTML = `
    <div class="view-head">
      <h2>Bibliothek</h2>
      <button class="btn-primary small" id="new-food">＋ Neu</button>
    </div>
    <p class="hint">${foods.length} Lebensmittel · Werte pro 100 g. Tippe zum Bearbeiten.</p>
    ${cats.map(cat => `
      <div class="cat-block">
        <div class="cat-title">${esc(cat)}</div>
        ${foods.filter(f => (f.cat||'Sonstige') === cat).map(f => `
          <button class="lib-item" data-edit="${f.id}">
            <span class="lib-name">${esc(f.name)}</span>
            <span class="lib-meta">${Math.round(f.per100.kcal)} kcal · ${f.per100.protein}P/${f.per100.carbs}C/${f.per100.fat}F</span>
          </button>`).join('')}
      </div>`).join('')}
    <div class="spacer"></div>
  `;
  $('#new-food').onclick = () => openFoodEditor(null);
  app.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openFoodEditor(b.dataset.edit));
}

function openFoodEditor(foodId) {
  const existing = foodId ? store.foodById(foodId) : null;
  const food = existing ? structuredClone(existing) : {
    id: 'food_' + Date.now().toString(36),
    name: '', cat: 'Sonstige', servings: [], per100: Object.fromEntries(NUTRIENTS.map(nt => [nt.key, 0])),
  };

  function fieldRow(nt) {
    return `
      <label class="edit-field">
        <span>${esc(nt.label)} <em>(${nt.unit})</em></span>
        <input type="number" inputmode="decimal" step="any" data-nut="${nt.key}" value="${food.per100[nt.key] || 0}">
      </label>`;
  }

  modalRoot.innerHTML = `
    <div class="sheet-overlay">
      <div class="sheet tall">
        <div class="sheet-head">
          <strong>${existing ? 'Lebensmittel bearbeiten' : 'Neues Lebensmittel'}</strong>
          <button class="sheet-close" id="sheet-close">✕</button>
        </div>
        <div class="editor-scroll">
          <label class="edit-field wide"><span>Name</span>
            <input type="text" id="ef-name" value="${esc(food.name)}" placeholder="z.B. Magerquark"></label>
          <label class="edit-field wide"><span>Kategorie</span>
            <input type="text" id="ef-cat" value="${esc(food.cat||'')}" placeholder="z.B. Milchprodukte"></label>
          <div class="edit-section">Energie & Makros (pro 100 g)</div>
          <div class="edit-grid">${NUTRIENTS.filter(nt=>nt.group==='macro').map(fieldRow).join('')}</div>
          <div class="edit-section">Vitamine</div>
          <div class="edit-grid">${NUTRIENTS.filter(nt=>nt.group==='vitamin').map(fieldRow).join('')}</div>
          <div class="edit-section">Mineralstoffe</div>
          <div class="edit-grid">${NUTRIENTS.filter(nt=>nt.group==='mineral').map(fieldRow).join('')}</div>
          <div class="edit-section">Sonstiges</div>
          <div class="edit-grid">${NUTRIENTS.filter(nt=>nt.group==='other').map(fieldRow).join('')}</div>
        </div>
        <div class="editor-actions">
          ${existing ? '<button class="btn-danger" id="ef-delete">Löschen</button>' : '<span></span>'}
          <button class="btn-primary" id="ef-save">Speichern</button>
        </div>
      </div>
    </div>`;

  $('#sheet-close').onclick = closeSheet;
  $('#ef-save').onclick = () => {
    food.name = $('#ef-name').value.trim();
    food.cat = $('#ef-cat').value.trim() || 'Sonstige';
    if (!food.name) { alert('Bitte einen Namen eingeben.'); return; }
    modalRoot.querySelectorAll('[data-nut]').forEach(inp => {
      food.per100[inp.dataset.nut] = Number(inp.value) || 0;
    });
    store.upsertFood(food);
    closeSheet(); renderLibrary();
  };
  const del = $('#ef-delete');
  if (del) del.onclick = () => {
    if (confirm(`„${food.name}" wirklich löschen?`)) { store.deleteFood(food.id); closeSheet(); renderLibrary(); }
  };
}

// ============================================================================
// View: TRENDS
// ============================================================================
function renderTrends() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const key = store.shiftDate(store.todayKey(), -i);
    days.push({ key, totals: store.computeTotals(key), day: store.getState().log[key] });
  }
  const targets = store.getState().profile.targets;

  const kcalSeries = days.map(d => d.totals.kcal);
  const protSeries = days.map(d => d.totals.protein);
  const waterSeries = days.map(d => (d.day?.water || 0) / 1000);
  const weightSeries = days.map(d => d.day?.weight ?? null);

  app.innerHTML = `
    <div class="view-head"><h2>Trends</h2></div>
    <p class="hint">Letzte 14 Tage</p>

    ${trendCard('Kalorien', kcalSeries, days, targets.kcal, 'var(--carbs)', 'kcal')}
    ${trendCard('Protein', protSeries, days, targets.protein, 'var(--protein)', 'g')}
    ${trendCard('Wasser', waterSeries, days, store.getState().profile.water/1000, 'var(--water)', 'L')}
    ${weightCard(weightSeries, days)}

    <div class="card">
      <div class="card-head"><span>Ø der letzten 14 Tage</span></div>
      <div class="avg-grid">
        ${avgTile('Kalorien', avg(kcalSeries), targets.kcal, 'kcal')}
        ${avgTile('Protein', avg(protSeries), targets.protein, 'g')}
        ${avgTile('Ballaststoffe', avg(days.map(d=>d.totals.fiber)), targets.fiber, 'g')}
        ${avgTile('Wasser', avg(waterSeries), store.getState().profile.water/1000, 'L')}
      </div>
    </div>
    <div class="spacer"></div>
  `;
}

function trendCard(title, series, days, target, color, unit) {
  return `
    <div class="card">
      <div class="card-head"><span>${title}</span>
        <span class="card-head-val">Ziel ${unit==='L'?target.toFixed(1):Math.round(target)} ${unit}</span></div>
      ${barChart(series, days, target, color, unit)}
    </div>`;
}

function barChart(series, days, target, color, unit) {
  const max = Math.max(target * 1.1, ...series, 1);
  const W = 320, H = 120, pad = 4;
  const bw = (W - pad * 2) / series.length;
  const targetY = H - (target / max) * H;
  const bars = series.map((v, i) => {
    const h = (v / max) * H;
    const x = pad + i * bw;
    return `<rect x="${x + bw*0.12}" y="${H - h}" width="${bw*0.76}" height="${h}" rx="2" fill="${color}" opacity="${v>0?0.9:0.15}"/>`;
  }).join('');
  const labels = days.map((d, i) => {
    if (i % 2 !== 0) return '';
    const x = pad + i * bw + bw / 2;
    const dd = d.key.split('-')[2];
    return `<text x="${x}" y="${H+12}" class="chart-lbl">${dd}</text>`;
  }).join('');
  return `
    <svg viewBox="0 0 ${W} ${H+16}" class="chart" preserveAspectRatio="none">
      <line x1="0" y1="${targetY}" x2="${W}" y2="${targetY}" class="chart-target"/>
      ${bars}${labels}
    </svg>`;
}

function weightCard(series, days) {
  const vals = series.filter(v => v != null);
  if (vals.length < 2) {
    return `<div class="card"><div class="card-head"><span>Gewicht</span></div>
      <div class="empty">Trag dein Tagesgewicht ein (Tab „Heute"), um den Verlauf zu sehen.</div></div>`;
  }
  const W = 320, H = 120, pad = 6;
  const min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5;
  const range = max - min || 1;
  const pts = [];
  series.forEach((v, i) => {
    if (v == null) return;
    const x = pad + (i / (series.length - 1)) * (W - pad * 2);
    const y = H - ((v - min) / range) * (H - pad*2) - pad;
    pts.push({ x, y, v });
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const dots = pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="var(--accent)"/>`).join('');
  const last = vals[vals.length - 1], first = vals[0];
  const diff = (last - first).toFixed(1);
  return `
    <div class="card">
      <div class="card-head"><span>Gewicht</span>
        <span class="card-head-val ${diff<=0?'good':'bad'}">${diff>0?'+':''}${diff} kg</span></div>
      <svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="none">
        <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2"/>
        ${dots}
      </svg>
      <div class="weight-legend"><span>${min.toFixed(1)} kg</span><span>aktuell ${last.toFixed(1)} kg</span></div>
    </div>`;
}

function avg(series) {
  const vals = series.filter(v => v != null && !isNaN(v));
  const nonzero = vals.filter(v => v > 0);
  if (nonzero.length === 0) return 0;
  return nonzero.reduce((a, b) => a + b, 0) / nonzero.length;
}

function avgTile(label, value, target, unit) {
  const p = pct(value, target);
  return `
    <div class="avg-tile">
      <div class="avg-val">${unit==='L'?value.toFixed(2):Math.round(value)}<span>${unit}</span></div>
      <div class="avg-lbl">${label}</div>
      <div class="avg-pct ${p>=90?'good':p>=60?'mid':'low'}">${p}%</div>
    </div>`;
}

// ============================================================================
// View: PROFIL / EINSTELLUNGEN
// ============================================================================
function renderProfile() {
  const p = store.getState().profile;
  const t = p.targets;

  const targetField = (nt) => `
    <label class="edit-field">
      <span>${esc(nt.label)} <em>(${nt.unit})</em></span>
      <input type="number" inputmode="decimal" step="any" data-target="${nt.key}" value="${t[nt.key]}">
    </label>`;

  app.innerHTML = `
    <div class="view-head"><h2>Profil & Ziele</h2></div>

    <div class="card">
      <div class="card-head"><span>Körperdaten</span></div>
      <div class="edit-grid">
        <label class="edit-field"><span>Alter</span><input type="number" id="p-age" value="${p.age}"></label>
        <label class="edit-field"><span>Größe (cm)</span><input type="number" id="p-height" value="${p.height}"></label>
        <label class="edit-field"><span>Gewicht (kg)</span><input type="number" step="0.1" id="p-weight" value="${p.weight}"></label>
        <label class="edit-field"><span>Geschlecht</span>
          <select id="p-sex"><option value="m" ${p.sex==='m'?'selected':''}>männlich</option>
          <option value="f" ${p.sex==='f'?'selected':''}>weiblich</option></select></label>
      </div>
      <label class="edit-field wide"><span>Aktivität</span>
        <select id="p-activity">
          <option value="sedentary" ${p.activity==='sedentary'?'selected':''}>wenig (kaum Sport)</option>
          <option value="moderate" ${p.activity==='moderate'?'selected':''}>moderat (2–3x/Woche)</option>
          <option value="high" ${p.activity==='high'?'selected':''}>hoch (4–5x/Woche)</option>
          <option value="veryhigh" ${p.activity==='veryhigh'?'selected':''}>sehr hoch (6–7x/Woche)</option>
        </select></label>
      <label class="edit-field wide"><span>Ziel</span>
        <select id="p-goal">
          <option value="lose" ${p.goal==='lose'?'selected':''}>Fettabbau</option>
          <option value="recomp" ${p.goal==='recomp'?'selected':''}>Recomp (Fett ↓ / Muskel ↑)</option>
          <option value="maintain" ${p.goal==='maintain'?'selected':''}>Gewicht halten</option>
          <option value="gain" ${p.goal==='gain'?'selected':''}>Muskelaufbau</option>
        </select></label>
      <button class="btn-primary" id="recalc">Kalorien & Makros neu berechnen</button>
      <p class="hint">Überschreibt kcal/Protein/Carbs/Fett anhand deiner Angaben. Mikro-Ziele bleiben.</p>
    </div>

    <div class="card">
      <div class="card-head"><span>Wasserziel (ml)</span></div>
      <label class="edit-field"><span>Wasser</span><input type="number" id="p-water" value="${p.water}"></label>
    </div>

    <div class="card">
      <div class="card-head"><span>Supplemente verwalten</span></div>
      <div class="supp-manage">
        ${store.getState().supplements.map(s => `
          <div class="supp-manage-row">
            <input type="text" data-supp-name="${s.id}" value="${esc(s.name)}" placeholder="Name">
            <input type="text" data-supp-dose="${s.id}" value="${esc(s.dose||'')}" placeholder="Dosis">
            <button class="btn-danger tiny" data-supp-del="${s.id}">✕</button>
          </div>`).join('')}
      </div>
      <button class="btn-secondary small" id="add-supp">＋ Supplement</button>
    </div>

    <div class="card">
      <div class="card-head"><span>Zielwerte: Makros</span></div>
      <div class="edit-grid">${NUTRIENTS.filter(nt=>nt.group==='macro').map(targetField).join('')}</div>
    </div>
    <div class="card">
      <div class="card-head"><span>Zielwerte: Vitamine</span></div>
      <div class="edit-grid">${NUTRIENTS.filter(nt=>nt.group==='vitamin').map(targetField).join('')}</div>
    </div>
    <div class="card">
      <div class="card-head"><span>Zielwerte: Mineralstoffe & Sonstiges</span></div>
      <div class="edit-grid">${NUTRIENTS.filter(nt=>nt.group==='mineral'||nt.group==='other').map(targetField).join('')}</div>
    </div>
    <button class="btn-primary" id="save-targets">Ziele speichern</button>

    <div class="card danger-card">
      <div class="card-head"><span>Backup & Daten</span></div>
      <p class="hint">Deine Daten liegen nur in diesem Browser. Mach regelmäßig ein Backup!</p>
      <div class="backup-btns">
        <button class="btn-secondary" id="export-btn">⬇︎ Export (Backup)</button>
        <button class="btn-secondary" id="import-btn">⬆︎ Import</button>
        <input type="file" id="import-file" accept="application/json" hidden>
      </div>
      <button class="btn-danger" id="reset-btn">Alle Daten zurücksetzen</button>
    </div>
    <div class="spacer"></div>
  `;

  // Profil-Felder direkt speichern
  const bind = (id, key, num = false) => {
    const el = $('#' + id);
    el.onchange = () => store.updateProfile({ [key]: num ? Number(el.value) : el.value });
  };
  bind('p-age', 'age', true); bind('p-height', 'height', true);
  bind('p-weight', 'weight', true); bind('p-sex', 'sex');
  bind('p-activity', 'activity'); bind('p-goal', 'goal');
  $('#p-water').onchange = () => store.updateProfile({ water: Number($('#p-water').value) });

  $('#recalc').onclick = () => {
    const prof = store.getState().profile;
    const macros = calcMacros(prof);
    store.setTarget('kcal', macros.kcal); store.setTarget('protein', macros.protein);
    store.setTarget('carbs', macros.carbs); store.setTarget('fat', macros.fat);
    renderProfile();
    toast(`Neu berechnet: ${macros.kcal} kcal · ${macros.protein}P / ${macros.carbs}C / ${macros.fat}F`);
  };

  $('#save-targets').onclick = () => {
    app.querySelectorAll('[data-target]').forEach(inp => store.setTarget(inp.dataset.target, inp.value));
    toast('Ziele gespeichert ✓');
  };

  // Supplemente
  app.querySelectorAll('[data-supp-name]').forEach(inp => inp.onchange = () => {
    const s = store.getState().supplements.find(x => x.id === inp.dataset.suppName);
    if (s) { s.name = inp.value; store.upsertSupplement(s); }
  });
  app.querySelectorAll('[data-supp-dose]').forEach(inp => inp.onchange = () => {
    const s = store.getState().supplements.find(x => x.id === inp.dataset.suppDose);
    if (s) { s.dose = inp.value; store.upsertSupplement(s); }
  });
  app.querySelectorAll('[data-supp-del]').forEach(b => b.onclick = () => {
    store.deleteSupplement(b.dataset.suppDel); renderProfile();
  });
  $('#add-supp').onclick = () => {
    store.upsertSupplement({ id: 'supp_' + Date.now().toString(36), name: 'Neu', dose: '' });
    renderProfile();
  };

  // Backup
  $('#export-btn').onclick = doExport;
  $('#import-btn').onclick = () => $('#import-file').click();
  $('#import-file').onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { store.importJSON(reader.result); toast('Import erfolgreich ✓'); render(); }
      catch (err) { alert('Import fehlgeschlagen: ' + err.message); }
    };
    reader.readAsText(file);
  };
  $('#reset-btn').onclick = () => {
    if (confirm('Wirklich ALLE Daten löschen und auf Standard zurücksetzen? Mach vorher ein Backup!')) {
      store.resetAll(); render();
    }
  };
}

// --- Kalorien-/Makro-Berechnung ---------------------------------------------
function calcMacros(p) {
  // Mifflin-St Jeor
  const s = p.sex === 'f' ? -161 : 5;
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + s;
  const factors = { sedentary: 1.35, moderate: 1.5, high: 1.55, veryhigh: 1.7 };
  const tdee = bmr * (factors[p.activity] || 1.5);
  const goalAdj = { lose: -0.25, recomp: -0.2, maintain: 0, gain: 0.1 };
  let kcal = tdee * (1 + (goalAdj[p.goal] ?? 0));
  kcal = Math.round(kcal / 10) * 10;
  const protein = Math.round(p.weight * 2.0);   // 2 g/kg
  const fat = Math.round(p.weight * 0.9);        // 0.9 g/kg
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

// --- Toast -------------------------------------------------------------------
let toastTimer = null;
function toast(msg) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// --- Export (ohne <a download> Abhängigkeit robust) --------------------------
function doExport() {
  const data = store.exportJSON();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mikromaxxing-backup-${store.todayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Backup heruntergeladen ✓');
}

// ============================================================================
// Init
// ============================================================================
function init() {
  store.load();
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => setTab(btn.dataset.tab);
  });
  render();

  // Service Worker (Offline / installierbar)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
