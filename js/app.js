// ============================================================================
// Mikromaxxing – App-Logik & UI
// ============================================================================
import { NUTRIENTS, NUTRIENT_BY_KEY, NUTRIENT_INFO, WEEKDAYS, WEEKDAYS_LONG, BODYCOMP_METRICS, SUPP_TIME_LABELS, SUPP_TIME_ORDER } from './data.js';
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
// Zeigt Stück-Lebensmittel als "3× Ei", andere als "150 g".
function amountLabel(food, grams) {
  if (food.piece && food.piece.g) {
    const count = Math.max(1, Math.round(grams / food.piece.g));
    return `${count}× ${food.piece.name}`;
  }
  return `${Math.round(grams)} g`;
}

// Haupt-Boost eines Lebensmittels: welcher Essential-Nährstoff wird am meisten gedeckt
function mainBoost(food) {
  const t = store.getState().profile.targets;
  const g = food.piece ? food.piece.g * (food.piece.def || 1)
    : (food.servings && food.servings[0] ? food.servings[0].grams : 100);
  let best = null;
  for (const k of store.GAP_KEYS) {
    if (!t[k]) continue;
    const v = (food.per100[k] || 0) * g / 100;
    if (v <= 0) continue;
    const pct = Math.round((v / t[k]) * 100);
    if (!best || pct > best.pct) best = { key: k, pct };
  }
  return best;
}
function shortNutrient(key) {
  return NUTRIENT_BY_KEY[key].label
    .replace('Vitamin ', 'Vit. ').replace(' (B7)', '').replace(' (B9)', '').replace(' (EPA+DHA/ALA)', '');
}
function boostBadge(food) {
  const b = mainBoost(food);
  if (!b) return '';
  return `<span class="boost-badge">💥 ${esc(shortNutrient(b.key))} ${Math.min(999, b.pct)}%</span>`;
}

// Info-Popover: was bringt dieser Nährstoff + bester Lieferant
function openNutrientInfo(key) {
  const nt = NUTRIENT_BY_KEY[key];
  const info = NUTRIENT_INFO[key] || '';
  // bester Lieferant aus der Bibliothek
  const t = store.getState().profile.targets[key];
  let bestFood = null;
  if (t) {
    for (const f of store.getState().foods) {
      if (f.whole === false) continue;
      const g = f.piece ? f.piece.g * (f.piece.def || 1) : (f.servings && f.servings[0] ? f.servings[0].grams : 100);
      const v = (f.per100[key] || 0) * g / 100;
      if (v <= 0) continue;
      const pct = Math.round((v / t) * 100);
      if (!bestFood || pct > bestFood.pct) bestFood = { food: f, pct, g };
    }
  }
  modalRoot.innerHTML = `
    <div class="sheet-overlay"><div class="sheet info-sheet">
      <div class="sheet-head"><strong>${esc(nt.label)}</strong>
        <button class="sheet-close" id="sheet-close">✕</button></div>
      <div class="info-body">${esc(info)}</div>
      ${bestFood ? `<div class="info-best">💥 Bester Lieferant: <strong>${esc(bestFood.food.name)}</strong>
        (${esc(amountLabel(bestFood.food, bestFood.g))}) → +${Math.min(999, bestFood.pct)}%</div>` : ''}
    </div></div>`;
  $('#sheet-close').onclick = closeSheet;
  $('.sheet-overlay').onclick = (e) => { if (e.target.classList.contains('sheet-overlay')) closeSheet(); };
}

// ============================================================================
// Navigation
// ============================================================================
function render() {
  if (currentTab === 'today') renderToday();
  else if (currentTab === 'food') renderNutrition();
  else if (currentTab === 'training') renderTraining();
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

// Ansicht neu zeichnen ohne nach oben zu scrollen (für Häkchen etc.)
function rerender() {
  if (currentTab === 'today') renderToday();
  else if (currentTab === 'food') renderNutrition();
  else if (currentTab === 'training') renderTraining();
  else if (currentTab === 'library') renderLibrary();
  else if (currentTab === 'trends') renderTrends();
  else if (currentTab === 'profile') renderProfile();
  updateNav();
}

// ============================================================================
// View: HEUTE (Kommandozentrale / Tages-Timeline)
// ============================================================================
const expandedBlocks = new Set();
let planOpen = true;

function renderToday() {
  const key = store.todayKey();
  const now = new Date();
  let blocks = store.getDaySchedule(key);
  const todaysGames = store.gamesForDate(key);
  if (todaysGames.length) {
    const gameBlocks = todaysGames.map((g, i) => ({
      id: 'game' + i, time: g.time, icon: '🏀', kind: 'gym',
      title: `Spiel: ${g.home ? 'vs' : '@'} ${g.opponent}`,
    }));
    blocks = [...blocks, ...gameBlocks].sort((a, b) => a.time.localeCompare(b.time));
  }
  const { current } = store.currentBlock(key, now);
  const training = store.getTrainingFor(key);
  const habits = store.getHabits();
  const md = store.mustDoSummary(key);
  const ring = store.ringSummary(key);
  const day = store.getDay(key);
  const profile = store.getState().profile;
  const supps = store.getState().supplements;

  const hour = now.getHours();
  const greeting = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
  const allDone = ring.pct >= 100;
  const statusLine = allDone
    ? '🌙 Alles erledigt – du hast dir den Schlaf verdient.'
    : `${ring.pct}% geschafft – weiter geht's 💪`;

  app.innerHTML = `
    <div class="ring-hero">
      ${progressPhotoRing(ring.pct, profile.photo)}
      <div class="ring-hero-greet">${greeting}</div>
      <div class="ring-hero-status ${allDone ? 'done' : ''}">${statusLine}</div>
      <input type="file" id="photo-input" accept="image/*" hidden>
    </div>

    <!-- Must-Dos: der Ring füllt sich damit auf 100% -->
    <div class="card">
      <div class="card-head"><span>✅ Tägliche Must-Dos</span>
        <span class="card-head-val ${allDone ? 'good' : ''}">${md.done}/${md.total}</span></div>
      <div class="mustdo-list">
        ${habits.map(h => mustDoRow(h, key)).join('')}
      </div>
    </div>

    <!-- Wasser (hochzählen – füllt den Ring anteilig) -->
    <div class="card">
      <div class="card-head"><span>💧 Wasser</span>
        <span class="card-head-val">${(day.water/1000).toFixed(2)} / ${(profile.water/1000).toFixed(1)} L</span></div>
      <div class="progress"><div class="progress-fill water" style="width:${Math.min(100, pct(day.water, profile.water))}%"></div></div>
      <div class="water-btns">
        <button data-water="250" class="chip">+250 ml</button>
        <button data-water="500" class="chip">+500 ml</button>
        <button data-water="-250" class="chip subtle">−250 ml</button>
        <button id="water-reset" class="chip subtle">Reset</button>
      </div>
    </div>

    <!-- Supplements nach Tageszeit + womit nehmen -->
    <div class="card">
      <div class="card-head"><span>💊 Supplements</span>
        <span class="card-head-val">${supps.filter(s => day.supps[s.id]).length}/${supps.length}</span></div>
      ${suppByTime(supps, day)}
    </div>

    <!-- Tagesplan (einklappbar) -->
    <div class="card">
      <button class="plan-toggle" id="plan-toggle">
        <span>🗓️ Tagesplan${current ? ` · jetzt: ${esc(current.icon)} ${esc(current.title)}` : ''}</span>
        <span class="train-arrow">${planOpen ? '▾' : '▸'}</span>
      </button>
      ${planOpen ? `<div class="timeline">
        ${blocks.map(b => timelineBlock(b, key, current && b.id === current.id)).join('')}
      </div>` : ''}
    </div>

    ${training ? `
      <button class="card train-card" id="go-training">
        <div class="train-head"><span>🏋️ Training heute</span><span class="train-arrow">›</span></div>
        <div class="train-title">${esc(training.title)}</div>
        <div class="train-focus">${esc(training.focus || '')}</div>
      </button>` : ''}

    ${nextGameCard()}

    <button class="card nutri-mini" id="go-food">
      <div class="card-head"><span>🍽️ Ernährung</span><span class="train-arrow">›</span></div>
      <div class="nutri-sub">Essentials, Wasser & Supplements tracken</div>
    </button>

    <div class="spacer"></div>
  `;

  // Events
  app.querySelectorAll('[data-habit]').forEach(b => b.onclick = () => {
    store.toggleCheck(key, 'habit:' + b.dataset.habit); rerender();
  });
  app.querySelectorAll('[data-water]').forEach(b => b.onclick = () => {
    const d = store.getDay(key);
    store.setWater(key, d.water + Number(b.dataset.water)); rerender();
  });
  const wr = $('#water-reset'); if (wr) wr.onclick = () => { store.setWater(key, 0); rerender(); };
  app.querySelectorAll('[data-supp]').forEach(b => b.onclick = () => {
    store.toggleSupp(key, b.dataset.supp); rerender();
  });
  $('#plan-toggle').onclick = () => { planOpen = !planOpen; rerender(); };
  app.querySelectorAll('[data-block]').forEach(b => b.onclick = () => {
    store.toggleCheck(key, 'block:' + b.dataset.block); rerender();
  });
  app.querySelectorAll('[data-expand]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const id = b.dataset.expand;
    if (expandedBlocks.has(id)) expandedBlocks.delete(id); else expandedBlocks.add(id);
    rerender();
  });
  app.querySelectorAll('[data-step]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    store.toggleCheck(key, b.dataset.step); rerender();
  });
  const gt = $('#go-training'); if (gt) gt.onclick = () => setTab('training');
  const gf = $('#go-food'); if (gf) gf.onclick = () => setTab('food');
  const ringPhoto = $('#ring-photo-tap'); const photoInput = $('#photo-input');
  if (ringPhoto) ringPhoto.onclick = () => photoInput.click();
  if (photoInput) photoInput.onchange = (e) => handlePhoto(e.target.files[0]);
}

// Foto im Fortschritts-Ring (Ring füllt sich mit den Must-Dos)
function progressPhotoRing(pct, photo) {
  const r = 70, c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, pct) / 100);
  const center = photo
    ? `<image href="${photo}" x="18" y="18" width="124" height="124" clip-path="url(#ringclip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="80" cy="80" r="62" fill="var(--card-2)"/><text x="80" y="94" text-anchor="middle" font-size="34">📷</text>`;
  return `
    <button class="ring-photo" id="ring-photo-tap" aria-label="Foto ändern">
      <svg viewBox="0 0 160 160" class="ring-photo-svg">
        <defs><clipPath id="ringclip"><circle cx="80" cy="80" r="62"/></clipPath></defs>
        ${center}
        <circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--card-2)" stroke-width="9"/>
        <circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--accent)" stroke-width="9"
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
          transform="rotate(-90 80 80)"/>
      </svg>
      <div class="ring-photo-pct ${pct >= 100 ? 'full' : ''}">${pct}%</div>
    </button>`;
}

// Supplements nach Tageszeit gruppiert, mit "womit nehmen"-Tipp
function suppByTime(supps, day) {
  return SUPP_TIME_ORDER.map(tk => {
    const group = supps.filter(s => (s.time || 'egal') === tk);
    if (!group.length) return '';
    return `
      <div class="supp-time-label">${SUPP_TIME_LABELS[tk]}</div>
      ${group.map(s => `
        <button class="supp-item ${day.supps[s.id] ? 'done' : ''}" data-supp="${s.id}">
          <span class="supp-check">${day.supps[s.id] ? '✓' : ''}</span>
          <span class="supp-body">
            <span class="supp-name">${esc(s.name)}${s.dose ? ` <em>${esc(s.dose)}</em>` : ''}</span>
            ${s.takeWith ? `<span class="supp-with">${esc(s.takeWith)}</span>` : ''}
          </span>
        </button>`).join('')}`;
  }).join('');
}

function mustDoRow(h, key) {
  const done = store.isChecked(key, 'habit:' + h.id);
  const streak = store.habitStreak(h.id, key);
  return `
    <button class="mustdo ${done ? 'done' : ''}" data-habit="${h.id}">
      <span class="mustdo-check">${done ? '✓' : ''}</span>
      <span class="mustdo-ico">${esc(h.icon || '•')}</span>
      <span class="mustdo-body">
        <span class="mustdo-name">${esc(h.name)}${streak > 0 ? ` <span class="mustdo-streak">🔥 ${streak}</span>` : ''}</span>
        ${h.why ? `<span class="mustdo-why">${esc(h.why)}</span>` : ''}
      </span>
    </button>`;
}

function handlePhoto(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 360;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale, h = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      let url;
      try { url = canvas.toDataURL('image/jpeg', 0.82); } catch (e) { url = reader.result; }
      store.updateProfile({ photo: url });
      rerender();
      toast('Foto gesetzt ✓');
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function nextGameCard() {
  const ng = store.nextGame();
  if (!ng) return '';
  const { game, days } = ng;
  const [y, m, d] = game.date.split('-').map(Number);
  const wd = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(y, m - 1, d).getDay()];
  const when = days === 0 ? 'HEUTE' : days === 1 ? 'morgen' : `in ${days} Tagen`;
  return `
    <div class="card game-card">
      <div class="game-when">🏀 Nächstes Spiel · ${when}</div>
      <div class="game-main">${game.home ? 'vs' : '@'} ${esc(game.opponent)}</div>
      <div class="game-meta">${wd} ${d}.${m}. · ${esc(game.time)} · ${game.home ? '🏠 Heim' : '🚌 Auswärts'}</div>
      <div class="game-hall">${esc(game.hall)}</div>
    </div>`;
}

function nowCard(current, next, key) {
  if (!current && !next) {
    return `<div class="card now-card"><div class="now-label">Kein Plan für heute</div>
      <div class="now-hint">Leg deinen Tagesplan im Tab „Setup" an.</div></div>`;
  }
  if (!current) {
    return `<div class="card now-card">
      <div class="now-label">Gleich dran</div>
      <div class="now-title">${esc(next.icon)} ${esc(next.title)}</div>
      <div class="now-time">ab ${esc(next.time)}</div>
    </div>`;
  }
  const done = store.isChecked(key, 'block:' + current.id);
  return `<div class="card now-card ${done ? 'done' : ''}">
    <div class="now-label">Jetzt${done ? ' · erledigt ✓' : ''}</div>
    <div class="now-main">
      <div>
        <div class="now-title">${esc(current.icon)} ${esc(current.title)}</div>
        <div class="now-time">${esc(current.time)}${next ? ` · als Nächstes ${esc(next.time)} ${esc(next.title)}` : ''}</div>
      </div>
      <button class="now-check ${done ? 'on' : ''}" id="now-done">${done ? '✓' : ''}</button>
    </div>
  </div>`;
}

function timelineBlock(b, key, isCurrent) {
  const done = store.isChecked(key, 'block:' + b.id);
  const hasSteps = b.steps && b.steps.length;
  const expanded = expandedBlocks.has(b.id);
  const stepsDone = hasSteps ? b.steps.filter((_, i) => store.isChecked(key, `step:${b.id}:${i}`)).length : 0;
  return `
    <div class="tl-block ${isCurrent ? 'current' : ''} ${done ? 'done' : ''}">
      <div class="tl-time">${esc(b.time)}</div>
      <button class="tl-check ${done ? 'on' : ''}" data-block="${b.id}">${done ? '✓' : ''}</button>
      <div class="tl-body ${hasSteps ? 'has-steps' : ''}" ${hasSteps ? `data-expand="${b.id}"` : ''}>
        <div class="tl-title">${esc(b.icon)} ${esc(b.title)}
          ${hasSteps ? `<span class="tl-steps-badge">${stepsDone}/${b.steps.length} ${expanded ? '▾' : '▸'}</span>` : ''}
        </div>
        ${hasSteps && expanded ? `<div class="tl-steps">
          ${b.steps.map((st, i) => {
            const sk = `step:${b.id}:${i}`;
            const sd = store.isChecked(key, sk);
            return `<button class="tl-step ${sd ? 'on' : ''}" data-step="${sk}">
              <span class="tl-step-box">${sd ? '✓' : ''}</span>${esc(st)}</button>`;
          }).join('')}
        </div>` : ''}
      </div>
    </div>`;
}

function habitChip(h, key) {
  const done = store.isChecked(key, 'habit:' + h.id);
  const streak = store.habitStreak(h.id, key);
  return `
    <button class="habit-chip ${done ? 'done' : ''}" data-habit="${h.id}">
      <span class="habit-ico">${esc(h.icon || '•')}</span>
      <span class="habit-name">${esc(h.name)}</span>
      <span class="habit-streak">${streak > 0 ? '🔥 ' + streak : ''}</span>
    </button>`;
}

// ============================================================================
// View: ESSEN (Ernährungs-Dashboard)
// ============================================================================
function renderNutrition() {
  const profile = store.getState().profile;
  const targets = profile.targets;
  const totals = store.computeTotals(currentDate);
  const day = store.getDay(currentDate);

  const macroKeys = ['protein', 'carbs', 'fat'];
  const macroColors = { protein: 'var(--protein)', carbs: 'var(--carbs)', fat: 'var(--fat)' };

  const quickPicks = store.getQuickPicks(8);
  const rec = store.getRecommendations(currentDate);
  const ess = store.essentialsSummary(currentDate);

  app.innerHTML = `
    <div class="date-bar">
      <button class="date-nav" id="prev-day" aria-label="Vorheriger Tag">‹</button>
      <div class="date-label">${esc(store.formatDateLabel(currentDate))}</div>
      <button class="date-nav" id="next-day" aria-label="Nächster Tag">›</button>
    </div>

    <!-- Essentials-Hauptkarte -->
    <div class="card calorie-card">
      ${essentialsRing(ess)}
      <div class="macro-mini">
        ${macroBar('protein', totals.protein, targets.protein, macroColors.protein)}
      </div>
    </div>

    <!-- Kalorien/Carbs nur als Info -->
    <div class="card info-card">
      <div class="info-row">
        <div class="info-stat"><div class="info-val">${Math.round(totals.kcal)}</div><div class="info-lbl">kcal (getrackt)</div></div>
        <div class="info-stat"><div class="info-val">${Math.round(totals.carbs)} g</div><div class="info-lbl">Carbs (getrackt)</div></div>
        <div class="info-stat"><div class="info-val">${Math.round(totals.fat)} g</div><div class="info-lbl">Fett (getrackt)</div></div>
      </div>
      <div class="info-note">🍽️ Deine freie Hauptmahlzeit kommt hier oben drauf – wird nicht mitgezählt.</div>
    </div>

    <!-- Schnellzugriff -->
    <div class="card">
      <div class="card-head"><span>⚡ Schnellzugriff</span></div>
      <div class="quick-row">
        ${quickPicks.map(q => `
          <button class="quick-chip" data-quick="${q.food.id}" data-grams="${q.grams}">
            <span class="quick-name">${esc(q.food.name)}</span>
            <span class="quick-meta">${esc(amountLabel(q.food, q.grams))} · ${Math.round(q.food.per100.kcal * q.grams/100)} kcal</span>
          </button>`).join('')}
      </div>
    </div>

    <!-- 100%-Coach -->
    ${coachCard(rec)}

    <!-- Snack-Ideen -->
    ${snacksCard()}

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

    <!-- Alle Werte (eingeklappt) -->
    <div class="card">
      <button class="plan-toggle" id="nutri-details-toggle">
        <span>🔬 Alle Nährwerte im Detail</span>
        <span class="train-arrow">${nutriDetails ? '▾' : '▸'}</span>
      </button>
      ${nutriDetails ? `
        <div class="nutri-detail-group">Vitamine</div>
        <div class="micro-grid">
          ${NUTRIENTS.filter(nt => nt.group === 'vitamin').map(nt => microRow(nt, totals[nt.key], targets[nt.key])).join('')}
        </div>
        <div class="nutri-detail-group">Mineralstoffe & Spurenelemente</div>
        <div class="micro-grid">
          ${NUTRIENTS.filter(nt => nt.group === 'mineral').map(nt => microRow(nt, totals[nt.key], targets[nt.key])).join('')}
        </div>
        <div class="nutri-detail-group">Weitere Werte</div>
        <div class="micro-grid">
          ${['fiber','sugar','satfat'].map(k => microRow(NUTRIENT_BY_KEY[k], totals[k], targets[k])).join('')}
          ${microRow(NUTRIENT_BY_KEY['omega3'], totals.omega3, targets.omega3)}
        </div>
      ` : ''}
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
  $('#prev-day').onclick = () => { currentDate = store.shiftDate(currentDate, -1); rerender(); };
  $('#next-day').onclick = () => { currentDate = store.shiftDate(currentDate, 1); rerender(); };
  app.querySelectorAll('[data-water]').forEach(b => b.onclick = () => {
    const d = store.getDay(currentDate);
    store.setWater(currentDate, d.water + Number(b.dataset.water));
    rerender();
  });
  $('#water-reset').onclick = () => { store.setWater(currentDate, 0); rerender(); };
  app.querySelectorAll('[data-supp]').forEach(b => b.onclick = () => {
    store.toggleSupp(currentDate, b.dataset.supp); rerender();
  });
  app.querySelectorAll('[data-entry]').forEach(b => b.onclick = () => {
    store.removeEntry(currentDate, Number(b.dataset.entry)); rerender();
  });
  const wInput = $('#weight-input');
  wInput.onchange = () => store.setWeight(currentDate, wInput.value);
  $('#add-food-btn').onclick = openAddFoodSheet;
  app.querySelectorAll('[data-info]').forEach(b => b.onclick = (e) => {
    e.stopPropagation(); openNutrientInfo(b.dataset.info);
  });
  const ndt = $('#nutri-details-toggle');
  if (ndt) ndt.onclick = () => { nutriDetails = !nutriDetails; rerender(); };
  app.querySelectorAll('[data-snack]').forEach(b => b.onclick = () => {
    const added = store.logSnack(currentDate, b.dataset.snack);
    rerender();
    toast(`Snack geloggt (${added} Zutaten) ✓`);
  });
  const st = $('#snacks-toggle');
  if (st) st.onclick = () => { snacksOpen = !snacksOpen; rerender(); };

  // Schnellzugriff & Coach: One-Tap-Logging
  app.querySelectorAll('[data-quick]').forEach(b => b.onclick = () =>
    quickLog(b.dataset.quick, Number(b.dataset.grams)));
  app.querySelectorAll('[data-rec]').forEach(b => b.onclick = () =>
    quickLog(b.dataset.rec, Number(b.dataset.grams)));
  const coachToggle = $('#coach-toggle');
  if (coachToggle) coachToggle.onclick = () => {
    coachExpanded = !coachExpanded; rerender();
  };
}

// One-Tap-Logging mit Undo
function quickLog(foodId, grams) {
  const food = store.foodById(foodId);
  if (!food) return;
  const index = store.addEntry(currentDate, foodId, grams);
  rerender();
  toast(`${food.name} (${grams} g) hinzugefügt`, 'Rückgängig', () => {
    store.removeEntry(currentDate, index); rerender();
  });
}

// --- Snack-Ideen -------------------------------------------------------------
let snacksOpen = false;
function snacksCard() {
  const snacks = store.getSnacks();
  const shown = snacksOpen ? snacks : snacks.slice(0, 3);
  return `
    <div class="card">
      <div class="card-head"><span>🍓 Gesunde Snack-Ideen</span></div>
      <div class="snack-list">
        ${shown.map(sn => {
          let kcal = 0;
          for (const it of sn.items) { const f = store.foodById(it.foodId); if (f) kcal += (f.per100.kcal || 0) * it.grams / 100; }
          return `
            <div class="snack">
              <div class="snack-main">
                <div class="snack-name">${sn.emoji} ${esc(sn.name)} <span class="snack-kcal">${Math.round(kcal)} kcal</span></div>
                <div class="snack-why">${esc(sn.why)}</div>
              </div>
              <button class="snack-add" data-snack="${sn.id}">＋</button>
            </div>`;
        }).join('')}
      </div>
      ${snacks.length > 3 ? `<button class="coach-more" id="snacks-toggle">${snacksOpen ? 'Weniger' : `Alle ${snacks.length} Snacks`}</button>` : ''}
    </div>`;
}

// --- Autopilot-Leiste --------------------------------------------------------
function autopilotBar() {
  const list = store.getAutopilot();
  const loaded = store.isAutopilotLoaded(currentDate);
  if (!list.length) return '';
  if (loaded) {
    return `<div class="autopilot-bar done"><span>✓ Essential-Stack geladen</span>
      <button class="chip" id="autopilot-load">nochmal laden</button></div>`;
  }
  return `<button class="autopilot-btn" id="autopilot-load">
      🥗 Essential-Stack laden <em>(${list.length} feste Lebensmittel)</em></button>`;
}

// --- Coach-Karte -------------------------------------------------------------
let coachExpanded = false;
let nutriDetails = false;

function coachCard(rec) {
  if (rec.allDone) {
    return `
      <div class="card coach-card done">
        <div class="coach-done">🎉 Alle Essentials auf 100%!</div>
        <div class="coach-done-sub">Vitamine, Mineralstoffe & Protein sind gedeckt. Stark.</div>
      </div>`;
  }

  const kcalLine = `${rec.openGaps.length} offen`;

  const top = rec.topTips[0];
  const topHtml = top ? `
    <div class="coach-top">
      <div class="coach-top-label">💡 Bester nächster Happen</div>
      <button class="coach-top-card" data-rec="${top.food.id}" data-grams="${top.grams}">
        <div class="coach-top-main">
          <div class="coach-top-name">${esc(top.food.name)} <em>${esc(amountLabel(top.food, top.grams))}</em></div>
          <div class="coach-top-contribs">${contribLine(top.contribs)}</div>
        </div>
        <div class="coach-top-add">
          <div class="coach-top-kcal">${Math.round(top.kcal)} kcal</div>
          <div class="coach-add-btn">＋</div>
        </div>
      </button>
      ${rec.topTips.slice(1, 4).map(t => `
        <button class="coach-alt" data-rec="${t.food.id}" data-grams="${t.grams}">
          <span>${esc(t.food.name)} <em>${esc(amountLabel(t.food, t.grams))}</em></span>
          <span class="coach-alt-meta">${contribLine(t.contribs, 1)} · ${Math.round(t.kcal)} kcal ＋</span>
        </button>`).join('')}
    </div>` : '';

  const shown = coachExpanded ? rec.perNutrient : rec.perNutrient.slice(0, 5);
  const listHtml = `
    <div class="coach-gaps-label">Was dir noch fehlt (${rec.perNutrient.length})</div>
    ${shown.map(g => {
      const nt = NUTRIENT_BY_KEY[g.nutKey];
      return `
        <button class="coach-gap" data-rec="${g.best.food.id}" data-grams="${g.best.grams}">
          <div class="coach-gap-info">
            <div class="coach-gap-nut">${esc(nt.label)} <span class="coach-gap-pct">${g.currentPct}%</span></div>
            <div class="coach-gap-food">→ ${esc(g.best.food.name)} <em>${esc(amountLabel(g.best.food, g.best.grams))}</em></div>
          </div>
          <div class="coach-gap-add">
            <div class="coach-gap-plus">+${Math.min(999, g.best.addedPct)}%</div>
            <div class="coach-gap-kcal">${g.best.kcal} kcal</div>
          </div>
        </button>`;
    }).join('')}
    ${rec.perNutrient.length > 5 ? `<button class="coach-more" id="coach-toggle">${coachExpanded ? 'Weniger anzeigen' : `Alle ${rec.perNutrient.length} anzeigen`}</button>` : ''}`;

  // Schwer erreichbar: nur über Supplement/Hauptmahlzeit
  const hard = (rec.hardGaps || []);
  const hardHtml = hard.length ? `
    <div class="coach-hard-label">🔒 Nur über Supplement / Hauptmahlzeit</div>
    ${hard.map(g => {
      const nt = NUTRIENT_BY_KEY[g.nutKey];
      return `<div class="coach-hard-row">
        <span class="coach-hard-nut">${esc(nt.label)}</span>
        <span class="coach-hard-pct">${g.currentPct}%</span>
      </div>`;
    }).join('')}
    <div class="coach-hard-note">Diese kommen kaum aus Obst/Gemüse – deck sie über deine Supplements oder deine Hauptmahlzeit ab.</div>
  ` : '';

  return `
    <div class="card coach-card">
      <div class="card-head"><span>🎯 Essentials auf 100%</span>
        <span class="card-head-val">${kcalLine}</span></div>
      ${topHtml}
      ${rec.perNutrient.length ? listHtml : ''}
      ${hardHtml}
    </div>`;
}

function contribLine(contribs, max = 3) {
  return contribs.slice(0, max).map(c => {
    const nt = NUTRIENT_BY_KEY[c.key];
    const short = nt.label.replace('Vitamin ', 'Vit. ').replace(' (B7)', '').replace(' (B9)', '');
    return `<span class="cbadge">+${Math.min(999, c.addedPct)}% ${esc(short)}</span>`;
  }).join('');
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

function essentialsRing(ess) {
  const p = ess.coverage;
  const r = 52, c = 2 * Math.PI * r;
  const offset = c * (1 - p / 100);
  const allDone = ess.done === ess.total;
  return `
    <div class="ring-wrap">
      <svg viewBox="0 0 120 120" class="ring">
        <circle cx="60" cy="60" r="${r}" class="ring-bg"/>
        <circle cx="60" cy="60" r="${r}" class="ring-fg"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}"
          transform="rotate(-90 60 60)"/>
      </svg>
      <div class="ring-center">
        <div class="ring-value">${ess.done}<span class="ring-of">/${ess.total}</span></div>
        <div class="ring-label">Essentials auf 100%</div>
        <div class="ring-sub ${allDone ? '' : 'pending'}">
          ${allDone ? '🎉 alle erreicht' : ess.coverage + '% Abdeckung'}
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
  const hasInfo = !!NUTRIENT_INFO[nt.key];
  return `
    <div class="micro-row">
      <div class="micro-name">${esc(nt.label)}${hasInfo ? ` <button class="info-dot" data-info="${nt.key}" aria-label="Info">i</button>` : ''}</div>
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
        <div class="entry-sub">${food ? esc(amountLabel(food, entry.grams)) : entry.grams + ' g'} · ${kcal} kcal · ${prot} g P</div>
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
          ${(!query && !selected) ? quickSheetSection() : ''}
          <div class="food-results">
            ${filtered.length === 0
              ? '<div class="empty">Nichts gefunden. Neues Lebensmittel im Tab „Bibliothek" anlegen.</div>'
              : filtered.map(f => `
                <button class="food-opt ${selected && selected.id === f.id ? 'sel' : ''}" data-food="${f.id}">
                  <span class="food-opt-name">${esc(f.name)} ${f.whole !== false ? boostBadge(f) : ''}</span>
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
    modalRoot.querySelectorAll('[data-qadd]').forEach(b => b.onclick = () => {
      quickLog(b.dataset.qadd, Number(b.dataset.grams)); closeSheet();
    });
    if (selected) wireSelectedPanel(selected);
  }

  function quickSheetSection() {
    const picks = store.getQuickPicks(8);
    if (!picks.length) return '';
    return `
      <div class="quick-sheet">
        <div class="quick-sheet-label">⚡ Schnellzugriff</div>
        <div class="quick-row">
          ${picks.map(q => `
            <button class="quick-chip" data-qadd="${q.food.id}" data-grams="${q.grams}">
              <span class="quick-name">${esc(q.food.name)}</span>
              <span class="quick-meta">${esc(amountLabel(q.food, q.grams))} · ${Math.round(q.food.per100.kcal * q.grams/100)} kcal</span>
            </button>`).join('')}
        </div>
      </div>`;
  }

  function defaultGrams(food) {
    if (food.piece) return food.piece.g * (food.piece.def || 1);
    return (food.servings && food.servings[0]) ? food.servings[0].grams : 100;
  }

  function selectedPanel(food) {
    const defGrams = defaultGrams(food);
    // Stück-Lebensmittel: Anzahl-Stepper
    if (food.piece) {
      const count = Math.max(1, Math.round(defGrams / food.piece.g));
      return `
        <div class="sel-panel">
          <div class="sel-name">${esc(food.name)}</div>
          <div class="stepper">
            <button class="step-btn" id="step-minus" aria-label="weniger">−</button>
            <div class="step-count"><span id="step-num">${count}</span><em>× ${esc(food.piece.name)}</em></div>
            <button class="step-btn" id="step-plus" aria-label="mehr">＋</button>
          </div>
          <input type="hidden" id="gram-input" value="${count * food.piece.g}">
          <div class="gram-note" id="gram-note"></div>
          <div class="sel-preview" id="sel-preview"></div>
          <button class="btn-primary" id="confirm-add">Hinzufügen</button>
        </div>`;
    }
    // Gramm-Lebensmittel: Gramm-Eingabe + Portionschips
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
    const note = $('#gram-note');
    const updatePreview = () => {
      const g = Number(gramInput.value) || 0;
      const f = g / 100;
      if (note) note.textContent = `= ${Math.round(g)} g`;
      preview.innerHTML = `
        <span>${Math.round(food.per100.kcal*f)} kcal</span>
        <span>${(food.per100.protein*f).toFixed(1)} g P</span>
        <span>${(food.per100.carbs*f).toFixed(1)} g C</span>
        <span>${(food.per100.fat*f).toFixed(1)} g F</span>`;
    };

    if (food.piece) {
      const stepNum = $('#step-num');
      const setCount = (c) => {
        c = Math.max(1, Math.min(20, c));
        stepNum.textContent = c;
        gramInput.value = c * food.piece.g;
        updatePreview();
      };
      $('#step-minus').onclick = () => setCount(Number(stepNum.textContent) - 1);
      $('#step-plus').onclick = () => setCount(Number(stepNum.textContent) + 1);
    } else {
      gramInput.oninput = updatePreview;
      modalRoot.querySelectorAll('[data-serv]').forEach(b => b.onclick = () => {
        gramInput.value = b.dataset.serv; updatePreview();
      });
    }
    updatePreview();

    $('#confirm-add').onclick = () => {
      const g = Number(gramInput.value) || 0;
      if (g > 0) { store.addEntry(currentDate, food.id, g); closeSheet(); rerender(); }
    };
  }

  draw();
  setTimeout(() => { const s = $('#food-search'); if (s) s.focus(); }, 50);
}

function closeSheet() { modalRoot.innerHTML = ''; }

// ============================================================================
// View: TRAINING
// ============================================================================
let selectedTrainDay = new Date().getDay();

function renderTraining() {
  const s = store.getState();
  const todayWd = new Date().getDay();
  const t = s.training[selectedTrainDay] || { title: '—', focus: '', exercises: [] };
  const isToday = selectedTrainDay === todayWd;
  const key = store.todayKey();

  app.innerHTML = `
    <div class="view-head"><h2>Training</h2></div>

    <div class="week-strip">
      ${[1,2,3,4,5,6,0].map(wd => {
        const tt = s.training[wd] || { title: '' };
        const isGym = tt.title && !/ruhe|erholung/i.test(tt.title);
        return `<button class="week-day ${wd===selectedTrainDay?'sel':''} ${wd===todayWd?'today':''}" data-wd="${wd}">
          <span class="week-day-lbl">${WEEKDAYS[wd]}</span>
          <span class="week-day-dot ${isGym?'on':''}"></span>
        </button>`;
      }).join('')}
    </div>

    <div class="card">
      <div class="card-head">
        <span>${WEEKDAYS_LONG[selectedTrainDay]}${isToday ? ' · heute' : ''}</span>
      </div>
      <div class="train-big-title">${esc(t.title)}</div>
      ${t.focus ? `<div class="train-big-focus">${esc(t.focus)}</div>` : ''}
      ${t.exercises && t.exercises.length ? `
        <div class="ex-list">
          ${t.exercises.map((ex, i) => {
            const name = typeof ex === 'string' ? ex : ex.n;
            const tag = typeof ex === 'string' ? '' : ex.t;
            const ck = `ex:${selectedTrainDay}:${i}`;
            const dn = isToday && store.isChecked(key, ck);
            return `<button class="ex-item ${dn?'on':''}" ${isToday?`data-ex="${ck}"`:''}>
              <span class="ex-box">${dn?'✓':''}</span>
              <span class="ex-name">${esc(name)}</span>
              ${tag ? `<span class="ex-tag tag-${esc(tag.toLowerCase())}">${esc(tag)}</span>` : ''}
            </button>`;
          }).join('')}
        </div>
        ${!isToday ? '<p class="hint">Übungen abhaken kannst du am jeweiligen Tag.</p>' : ''}
      ` : '<div class="empty">Ruhetag – keine Übungen.</div>'}
    </div>

    <div class="card">
      <div class="card-head"><span>🏀 Spielplan (TSC Münster)</span></div>
      <div class="game-list">
        ${store.upcomingGames(store.todayKey(), 6).map(g => {
          const [yy, mm, dd] = g.date.split('-').map(Number);
          const wd = WEEKDAYS[new Date(yy, mm - 1, dd).getDay()];
          return `<div class="game-row">
            <div class="game-row-date">${wd}<br>${dd}.${mm}.</div>
            <div class="game-row-main">
              <div class="game-row-opp">${g.home ? 'vs' : '@'} ${esc(g.opponent)}</div>
              <div class="game-row-meta">${esc(g.time)} · ${g.home ? '🏠 Heim' : '🚌 Auswärts'}</div>
            </div>
          </div>`;
        }).join('') || '<div class="empty">Keine anstehenden Spiele.</div>'}
      </div>
    </div>

    <p class="hint">Deinen Split bearbeitest du im Tab „Setup" → Trainingsplan.</p>
    <div class="spacer"></div>
  `;

  app.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => {
    selectedTrainDay = Number(b.dataset.wd); renderTraining();
  });
  app.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => {
    store.toggleCheck(key, b.dataset.ex); renderTraining();
  });
}

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
            <span class="lib-main">
              <span class="lib-name">${esc(f.name)}${f.whole === false ? ' <span class="meal-tag">Mahlzeit</span>' : ''}</span>
              ${f.whole !== false ? boostBadge(f) : ''}
            </span>
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
    name: '', cat: 'Sonstige', whole: true, servings: [],
    per100: Object.fromEntries(NUTRIENTS.map(nt => [nt.key, 0])),
  };
  if (typeof food.whole !== 'boolean') food.whole = true;

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
          <label class="toggle-field">
            <input type="checkbox" id="ef-whole" ${food.whole ? 'checked' : ''}>
            <span>Unverarbeitetes Einzelprodukt <em>(darf als 100%-Empfehlung vorgeschlagen werden). Ausschalten für fertige Bowls/Mahlzeiten.</em></span>
          </label>
          <div class="edit-section">Stück-Größe (optional)</div>
          <p class="hint" style="margin:0 2px 8px">Wenn ausgefüllt, wird in Stück getrackt (z.B. 1 Paprika) statt in Gramm.</p>
          <div class="edit-grid">
            <label class="edit-field"><span>Name (Einzahl)</span>
              <input type="text" id="ef-piece-name" value="${esc(food.piece?.name || '')}" placeholder="z.B. Ei"></label>
            <label class="edit-field"><span>Gramm je Stück</span>
              <input type="number" inputmode="decimal" id="ef-piece-g" value="${food.piece?.g || ''}" placeholder="z.B. 50"></label>
            <label class="edit-field"><span>Standard-Anzahl</span>
              <input type="number" inputmode="numeric" id="ef-piece-def" value="${food.piece?.def || ''}" placeholder="z.B. 3"></label>
          </div>
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
    food.whole = $('#ef-whole').checked;
    const pG = Number($('#ef-piece-g').value) || 0;
    if (pG > 0) {
      food.piece = {
        g: pG,
        def: Math.max(1, Number($('#ef-piece-def').value) || 1),
        name: $('#ef-piece-name').value.trim() || 'Stück',
      };
    } else {
      delete food.piece;
    }
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

    <div class="card">
      <div class="card-head"><span>🔥 Gewohnheiten – Streaks</span></div>
      <div class="streak-list">
        ${store.getHabits().map(h => {
          const st = store.habitStreak(h.id);
          return `<div class="streak-row">
            <span class="streak-ico">${esc(h.icon||'•')}</span>
            <span class="streak-name">${esc(h.name)}</span>
            <span class="streak-val ${st>0?'on':''}">${st>0?'🔥 '+st+' Tage':'—'}</span>
          </div>`;
        }).join('')}
      </div>
    </div>

    ${bodyCompCard()}
    <div class="spacer"></div>
  `;

  app.querySelectorAll('[data-measure-edit]').forEach(b => b.onclick = () =>
    openMeasurementEditor(b.dataset.measureEdit || null));
}

function bodyCompCard() {
  const list = store.getMeasurements();
  const latest = store.latestMeasurement();
  const first = store.firstMeasurement();
  const p = store.getState().profile;

  if (!latest) {
    return `
      <div class="card">
        <div class="card-head"><span>📊 Körperanalyse</span>
          <button class="btn-primary small" data-measure-edit="">＋ Messung</button></div>
        <div class="empty">Noch keine Messung. Trag deine InBody-/Körperanalyse-Werte ein, dann siehst du hier deine Entwicklung.</div>
      </div>`;
  }

  const rows = BODYCOMP_METRICS.filter(m => latest.values[m.key] != null).map(m => {
    const cur = latest.values[m.key];
    const base = first && first.values[m.key] != null ? first.values[m.key] : null;
    let deltaHtml = '';
    if (base != null && list.length > 1) {
      const d = cur - base;
      let cls = '';
      if (d !== 0 && m.better !== 'neutral') cls = (m.better === 'down' ? d < 0 : d > 0) ? 'good' : 'bad';
      const sign = d > 0 ? '+' : '';
      deltaHtml = `<span class="bc-delta ${cls}">${sign}${d.toFixed(1)}</span>`;
    }
    return `<div class="bc-row">
      <span class="bc-label">${esc(m.label)}</span>
      <span class="bc-val">${cur}${m.unit ? ' ' + m.unit : ''}</span>
      ${deltaHtml}
    </div>`;
  }).join('');

  return `
    <div class="card">
      <div class="card-head"><span>📊 Körperanalyse</span>
        <button class="btn-primary small" data-measure-edit="">＋ Messung</button></div>
      <div class="bc-date">Letzte Messung: ${esc(latest.date)}${list.length > 1 ? ` · Δ seit ${esc(first.date)}` : ''}</div>
      <div class="bc-grid">${rows}</div>
      ${latest.note ? `<div class="hint">${esc(latest.note)}</div>` : ''}
      <button class="btn-secondary small" data-measure-edit="${esc(latest.date)}">Letzte bearbeiten</button>
    </div>`;
}

function openMeasurementEditor(date) {
  const existing = date ? store.getMeasurements().find(m => m.date === date) : null;
  const entry = existing ? structuredClone(existing) : { date: store.todayKey(), values: {}, note: '' };

  modalRoot.innerHTML = `
    <div class="sheet-overlay"><div class="sheet tall">
      <div class="sheet-head"><strong>Körperanalyse ${existing ? 'bearbeiten' : 'eintragen'}</strong>
        <button class="sheet-close" id="sheet-close">✕</button></div>
      <div class="editor-scroll">
        <label class="edit-field wide"><span>Datum</span>
          <input type="date" id="mDate" value="${esc(entry.date)}"></label>
        <div class="edit-grid">
          ${BODYCOMP_METRICS.map(m => `
            <label class="edit-field"><span>${esc(m.label)} <em>(${m.unit || '–'})</em></span>
              <input type="number" inputmode="decimal" step="any" data-m="${m.key}" value="${entry.values[m.key] ?? ''}"></label>`).join('')}
        </div>
        <label class="edit-field wide"><span>Notiz</span>
          <input type="text" id="mNote" value="${esc(entry.note || '')}" placeholder="optional"></label>
      </div>
      <div class="editor-actions">
        ${existing ? '<button class="btn-danger" id="mDel">Löschen</button>' : '<span></span>'}
        <button class="btn-primary" id="mSave">Speichern</button>
      </div>
    </div></div>`;

  $('#sheet-close').onclick = closeSheet;
  $('#mSave').onclick = () => {
    entry.date = $('#mDate').value || store.todayKey();
    entry.values = {};
    modalRoot.querySelectorAll('[data-m]').forEach(inp => {
      if (inp.value !== '') entry.values[inp.dataset.m] = Number(inp.value);
    });
    entry.note = $('#mNote').value.trim();
    store.addMeasurement(entry);
    closeSheet(); renderTrends();
  };
  const del = $('#mDel');
  if (del) del.onclick = () => {
    if (confirm('Diese Messung löschen?')) { store.deleteMeasurement(entry.date); closeSheet(); renderTrends(); }
  };
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
  const avg7 = store.weightTrend();
  const target = store.getState().profile.targetWeight;
  return `
    <div class="card">
      <div class="card-head"><span>Gewicht</span>
        <span class="card-head-val ${diff<=0?'good':'bad'}">${diff>0?'+':''}${diff} kg</span></div>
      <svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="none">
        <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2"/>
        ${dots}
      </svg>
      <div class="weight-legend"><span>${min.toFixed(1)} kg</span><span>aktuell ${last.toFixed(1)} kg</span></div>
      <div class="weight-stats">
        ${avg7 != null ? `<span>Ø 7 Tage: <strong>${avg7.toFixed(1)} kg</strong></span>` : ''}
        ${target ? `<span>Ziel: <strong>${target} kg</strong> (${(last-target).toFixed(1)} kg)</span>` : ''}
      </div>
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
    <div class="view-head"><h2>Setup</h2></div>

    <div class="card">
      <div class="card-head"><span>Bereiche einrichten</span></div>
      <div class="setup-links">
        <button class="setup-link" id="edit-schedule"><span>🗓️ Tagesplan / Timeline</span><span class="train-arrow">›</span></button>
        <button class="setup-link" id="edit-training"><span>🏋️ Trainingsplan (Split)</span><span class="train-arrow">›</span></button>
        <button class="setup-link" id="open-library"><span>📚 Lebensmittel-Bibliothek</span><span class="train-arrow">›</span></button>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span>Gewohnheiten verwalten</span></div>
      <div class="supp-manage">
        ${store.getHabits().map(h => `
          <div class="supp-manage-row">
            <input type="text" data-habit-icon="${h.id}" value="${esc(h.icon||'')}" placeholder="🔥" style="max-width:52px;text-align:center">
            <input type="text" data-habit-name="${h.id}" value="${esc(h.name)}" placeholder="Gewohnheit">
            <button class="btn-danger tiny" data-habit-del="${h.id}">✕</button>
          </div>`).join('')}
      </div>
      <button class="btn-secondary small" id="add-habit">＋ Gewohnheit</button>
    </div>

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
      <div class="card-head"><span>Ziele</span></div>
      <div class="edit-grid">
        <label class="edit-field"><span>Wasser (ml)</span><input type="number" id="p-water" value="${p.water}"></label>
        <label class="edit-field"><span>Zielgewicht (kg)</span><input type="number" step="0.1" id="p-targetweight" value="${p.targetWeight ?? ''}" placeholder="z.B. 88"></label>
      </div>
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
  $('#p-targetweight').onchange = () => {
    const v = $('#p-targetweight').value;
    store.updateProfile({ targetWeight: v === '' ? null : Number(v) });
  };

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

  // Setup-Links
  $('#edit-schedule').onclick = openScheduleEditor;
  $('#edit-training').onclick = openTrainingEditor;
  $('#open-library').onclick = () => setTab('library');

  // Gewohnheiten
  app.querySelectorAll('[data-habit-name]').forEach(inp => inp.onchange = () => {
    const h = store.getHabits().find(x => x.id === inp.dataset.habitName);
    if (h) { h.name = inp.value; store.upsertHabit(h); }
  });
  app.querySelectorAll('[data-habit-icon]').forEach(inp => inp.onchange = () => {
    const h = store.getHabits().find(x => x.id === inp.dataset.habitIcon);
    if (h) { h.icon = inp.value; store.upsertHabit(h); }
  });
  app.querySelectorAll('[data-habit-del]').forEach(b => b.onclick = () => {
    store.deleteHabit(b.dataset.habitDel); renderProfile();
  });
  $('#add-habit').onclick = () => {
    store.upsertHabit({ id: 'h_' + Date.now().toString(36), name: 'Neue Gewohnheit', icon: '✅' });
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
function toast(msg, actionLabel, actionCb) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.innerHTML = `<span class="toast-msg">${esc(msg)}</span>`;
  if (actionLabel && actionCb) {
    const btn = document.createElement('button');
    btn.className = 'toast-action';
    btn.textContent = actionLabel;
    btn.onclick = () => { actionCb(); el.classList.remove('show'); };
    el.appendChild(btn);
  }
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), actionLabel ? 4000 : 2200);
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
// Editor: Tagesplan / Timeline
// ============================================================================
function openScheduleEditor() {
  let wd = new Date().getDay();
  let blocks = structuredClone(store.getState().schedule[wd] || []);

  function draw() {
    blocks.sort((a, b) => a.time.localeCompare(b.time));
    modalRoot.innerHTML = `
      <div class="sheet-overlay"><div class="sheet tall">
        <div class="sheet-head"><strong>Tagesplan</strong>
          <button class="sheet-close" id="sheet-close">✕</button></div>
        <div class="week-strip">
          ${[1,2,3,4,5,6,0].map(d => `<button class="week-day ${d===wd?'sel':''}" data-wd="${d}">
            <span class="week-day-lbl">${WEEKDAYS[d]}</span></button>`).join('')}
        </div>
        <div class="editor-scroll">
          ${blocks.map((b, i) => `
            <div class="blk-edit">
              <div class="blk-edit-row">
                <input type="time" data-bt="${i}" value="${esc(b.time)}">
                <input type="text" data-bi="${i}" value="${esc(b.icon||'')}" class="blk-icon" placeholder="⏰">
                <input type="text" data-bn="${i}" value="${esc(b.title)}" placeholder="Titel">
                <button class="btn-danger tiny" data-bd="${i}">✕</button>
              </div>
              <textarea data-bs="${i}" class="blk-steps" placeholder="Schritte (eine Zeile pro Schritt, optional)">${esc((b.steps||[]).join('\n'))}</textarea>
            </div>`).join('')}
          <button class="btn-secondary small" id="blk-add">＋ Block</button>
          <div class="copy-row">
            <button class="chip" id="copy-week">Auf ganze Woche kopieren</button>
            <button class="chip" id="copy-workdays">Auf Mo–Fr kopieren</button>
          </div>
        </div>
        <div class="editor-actions"><span></span>
          <button class="btn-primary" id="blk-save">Speichern</button></div>
      </div></div>`;

    $('#sheet-close').onclick = closeSheet;
    modalRoot.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => {
      commit(); store.setScheduleDay(wd, blocks);
      wd = Number(b.dataset.wd); blocks = structuredClone(store.getState().schedule[wd] || []); draw();
    });
    modalRoot.querySelectorAll('[data-bd]').forEach(b => b.onclick = () => {
      commit(); blocks.splice(Number(b.dataset.bd), 1); draw();
    });
    $('#blk-add').onclick = () => {
      commit();
      blocks.push({ id: `${wd}-${Date.now().toString(36)}`, time: '12:00', title: 'Neuer Block', icon: '•', kind: 'custom' });
      draw();
    };
    $('#blk-save').onclick = () => { commit(); store.setScheduleDay(wd, blocks); closeSheet(); toast('Tagesplan gespeichert ✓'); };
    $('#copy-week').onclick = () => {
      commit();
      for (let d = 0; d < 7; d++) store.setScheduleDay(d, cloneBlocks(d));
      toast('Auf ganze Woche kopiert ✓');
    };
    $('#copy-workdays').onclick = () => {
      commit();
      for (const d of [1,2,3,4,5]) store.setScheduleDay(d, cloneBlocks(d));
      toast('Auf Mo–Fr kopiert ✓');
    };
  }

  function commit() {
    modalRoot.querySelectorAll('[data-bt]').forEach(inp => blocks[+inp.dataset.bt].time = inp.value);
    modalRoot.querySelectorAll('[data-bi]').forEach(inp => blocks[+inp.dataset.bi].icon = inp.value);
    modalRoot.querySelectorAll('[data-bn]').forEach(inp => blocks[+inp.dataset.bn].title = inp.value);
    modalRoot.querySelectorAll('[data-bs]').forEach(inp => {
      const steps = inp.value.split('\n').map(s => s.trim()).filter(Boolean);
      if (steps.length) blocks[+inp.dataset.bs].steps = steps; else delete blocks[+inp.dataset.bs].steps;
    });
  }
  function cloneBlocks(targetWd) {
    return blocks.map((b, i) => ({ ...structuredClone(b), id: `${targetWd}-${i}` }));
  }

  draw();
}

// ============================================================================
// Editor: Trainingsplan
// ============================================================================
function openTrainingEditor() {
  let wd = new Date().getDay();

  function draw() {
    const t = store.getState().training[wd] || { title: '', focus: '', exercises: [] };
    modalRoot.innerHTML = `
      <div class="sheet-overlay"><div class="sheet tall">
        <div class="sheet-head"><strong>Trainingsplan</strong>
          <button class="sheet-close" id="sheet-close">✕</button></div>
        <div class="week-strip">
          ${[1,2,3,4,5,6,0].map(d => `<button class="week-day ${d===wd?'sel':''}" data-wd="${d}">
            <span class="week-day-lbl">${WEEKDAYS[d]}</span></button>`).join('')}
        </div>
        <div class="editor-scroll">
          <label class="edit-field wide"><span>Titel</span>
            <input type="text" id="tr-title" value="${esc(t.title||'')}" placeholder="z.B. Push"></label>
          <label class="edit-field wide"><span>Fokus</span>
            <input type="text" id="tr-focus" value="${esc(t.focus||'')}" placeholder="z.B. Brust · Schulter · Trizeps"></label>
          <label class="edit-field wide"><span>Übungen (eine pro Zeile, optional „Name :: Tag")</span>
            <textarea id="tr-ex" class="blk-steps" style="min-height:160px">${esc((t.exercises||[]).map(ex => typeof ex === 'string' ? ex : (ex.t ? `${ex.n} :: ${ex.t}` : ex.n)).join('\n'))}</textarea></label>
          <p class="hint" style="margin:0 2px">Tags: Kraft · Funktion · Ausdauer · Explosiv · Reha · Skill · Routine · Mobility</p>
        </div>
        <div class="editor-actions"><span></span>
          <button class="btn-primary" id="tr-save">Speichern</button></div>
      </div></div>`;
    $('#sheet-close').onclick = closeSheet;
    modalRoot.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => { commit(); wd = Number(b.dataset.wd); draw(); });
    $('#tr-save').onclick = () => { commit(); closeSheet(); toast('Trainingsplan gespeichert ✓'); };
  }
  function commit() {
    const title = $('#tr-title').value.trim();
    const focus = $('#tr-focus').value.trim();
    const exercises = $('#tr-ex').value.split('\n').map(s => s.trim()).filter(Boolean).map(line => {
      const idx = line.indexOf('::');
      if (idx >= 0) return { n: line.slice(0, idx).trim(), t: line.slice(idx + 2).trim() };
      return { n: line, t: '' };
    });
    store.setTrainingDay(wd, { title, focus, exercises });
  }
  draw();
}

// ============================================================================
// Editor: Ernährungs-Autopilot
// ============================================================================
function openAutopilotEditor() {
  let list = structuredClone(store.getAutopilot());
  const foods = store.getState().foods.slice().sort((a, b) => a.name.localeCompare(b.name));

  function draw() {
    modalRoot.innerHTML = `
      <div class="sheet-overlay"><div class="sheet tall">
        <div class="sheet-head"><strong>Ernährungs-Autopilot</strong>
          <button class="sheet-close" id="sheet-close">✕</button></div>
        <p class="hint">Dein fester Tagesplan. „Tagesplan laden" im Essen-Tag fügt diese Lebensmittel mit einem Tap ein.</p>
        <div class="editor-scroll">
          ${list.length ? list.map((it, i) => {
            const f = store.foodById(it.foodId);
            if (!f) return '';
            const isPiece = !!f.piece;
            const val = isPiece ? Math.max(1, Math.round(it.grams / f.piece.g)) : it.grams;
            return `<div class="ap-row">
              <span class="ap-name">${esc(f.name)}</span>
              <input type="number" inputmode="decimal" data-ap="${i}" value="${val}" step="${isPiece?1:10}" min="0">
              <span class="ap-unit">${isPiece ? '× ' + esc(f.piece.name) : 'g'}</span>
              <button class="btn-danger tiny" data-apdel="${i}">✕</button>
            </div>`;
          }).join('') : '<div class="empty">Noch keine Lebensmittel im Autopilot.</div>'}
          <div class="ap-add">
            <select id="ap-food">${foods.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('')}</select>
            <button class="btn-secondary small" id="ap-add-btn">＋ Hinzufügen</button>
          </div>
        </div>
        <div class="editor-actions"><span></span>
          <button class="btn-primary" id="ap-save">Speichern</button></div>
      </div></div>`;
    $('#sheet-close').onclick = closeSheet;
    modalRoot.querySelectorAll('[data-apdel]').forEach(b => b.onclick = () => { commit(); list.splice(+b.dataset.apdel, 1); draw(); });
    $('#ap-add-btn').onclick = () => {
      commit();
      const f = store.foodById($('#ap-food').value);
      if (f) list.push({ foodId: f.id, grams: f.piece ? f.piece.g * (f.piece.def || 1) : 100 });
      draw();
    };
    $('#ap-save').onclick = () => { commit(); store.setAutopilot(list); closeSheet(); toast('Autopilot gespeichert ✓'); };
  }
  function commit() {
    modalRoot.querySelectorAll('[data-ap]').forEach(inp => {
      const i = +inp.dataset.ap;
      const f = store.foodById(list[i].foodId);
      const v = Number(inp.value) || 0;
      list[i].grams = f && f.piece ? v * f.piece.g : v;
    });
  }
  draw();
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
