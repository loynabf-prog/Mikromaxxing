// ============================================================================
// Einstellungen – Ziele, Körper, Supplements, Trainingsplan, Daten
// ============================================================================
import * as store from '../store.js';
import { NUTRIENTS, SUPP_TIME_LABELS, SUPP_TIME_ORDER, WEEKDAYS_LONG, SPORT_TYPES } from '../data.js';
import { icon } from '../icons.js';
import { $, $$, esc, de, router, openSheet, closeSheet, sheetHead, toast, pickFile, downscalePhoto } from '../ui.js';
import { openLibrary, openMealEditor } from './food.js';
import { openOnboarding } from './onboarding.js';
import { openAiSetup } from './aisetup.js';
import { hasAI } from '../lookup.js';
import { HOW_LABELS, suppInfo } from '../knowledge.js';

const row = (id, ic, title, sub, end = '') => `<button class="row" data-row="${id}"><span class="row-ic">${icon(ic)}</span>
  <span class="row-main"><div class="row-t">${title}</div>${sub ? `<div class="row-s">${sub}</div>` : ''}</span><span class="row-end">${end}${icon('chev')}</span></button>`;

export function renderSetup(app) {
  const s = store.getState();
  const p = s.profile, t = p.targets;
  app.innerHTML = `<div class="view">
    <div class="vh"><div style="display:flex;align-items:center;gap:12px">
      <button class="icon-btn" id="back" aria-label="Zurück">${icon('chevL')}</button>
      <div class="vh-title">Einstellungen</div></div></div>

    <div class="sec-title">Ziele</div>
    <div class="rows">
      ${row('targetWeight', 'target', 'Zielgewicht', '', `${de(p.targetWeight, 1)} kg`)}
      ${row('targetBodyfat', 'chart', 'Ziel-Körperfett', '', `${de(p.targetBodyfat)} %`)}
      ${row('kcal', 'flame', 'Kalorien', 'pro Tag', `${de(t.kcal)} kcal`)}
      ${row('protein', 'dumbbell', 'Protein', 'pro Tag', `${de(t.protein)} g`)}
      ${row('water', 'drop', 'Wasser', 'pro Tag', `${de(p.water / 1000, 1)} L`)}
      ${row('sleepTarget', 'moon', 'Schlafziel', '', `${de(p.sleepTarget, 1)} h`)}
      ${row('wakeTime', 'sun', 'Übliche Aufstehzeit', 'für den Schlafenszeit-Tipp', esc(p.wakeTime || '07:00'))}
      ${row('stepGoal', 'steps', 'Schritte-Minimum', 'an Tagen ohne Einheit', de(p.stepGoal))}
      ${row('dayGoal', 'flame', 'Tag zählt ab', 'für deine Streak', `${p.dayGoal} %`)}
      ${row('targets', 'list', 'Alle Nährstoffziele', 'Vitamine, Mineralstoffe, Makros')}
    </div>

    <div class="sec-title">Körper</div>
    <div class="rows">
      ${row('photo', 'camera', 'Profilfoto im Ring', p.photo ? 'gesetzt' : 'noch keins')}
      ${row('height', 'user', 'Größe', '', `${de(p.height)} cm`)}
      ${row('weight', 'scale', 'Startgewicht', '', `${de(p.weight, 1)} kg`)}
      ${row('age', 'user', 'Alter', '', `${de(p.age)} J.`)}
    </div>

    <div class="sec-title">Inhalte</div>
    <div class="rows">
      ${row('training', 'dumbbell', 'Trainingsplan', 'Wochen-Split, Übungen, Sätze')}
      ${row('supps', 'pill', 'Supplements', `${s.supplements.length} im Stack`)}
      ${row('library', 'book', 'Lebensmittel-Bibliothek', `${s.foods.length} Lebensmittel`)}
      ${row('meals', 'bowl', 'Meine Mahlzeiten', `${s.meals.length} gespeichert`)}
      ${row('games', 'trophy', 'Spielplan TSC', `${s.games.length} Spiele`)}
    </div>

    <div class="sec-title">Nachschlagen</div>
    <div class="rows">
      ${row('ai', 'spark', 'Claude für unbekannte Lebensmittel', hasAI() ? 'Aktiv · Haiku 5.5' : 'Noch kein API-Key – tippen zum Einrichten')}
    </div>

    <div class="sec-title">Daten</div>
    <div class="rows">
      ${row('export', 'download', 'Backup exportieren', 'Alle Daten als Datei sichern')}
      ${row('import', 'upload', 'Backup importieren', '')}
      ${row('onboarding', 'spark', 'Einführung nochmal zeigen', '')}
      ${row('reset', 'trash', 'Alles zurücksetzen', 'Löscht alle Daten auf diesem Gerät')}
    </div>
    <p class="hint" style="text-align:center">Deine Daten liegen nur auf diesem Gerät. Mach ab und zu ein Backup.</p>
  </div>`;

  $('#back', app).onclick = () => router.go(router.prev || 'today');
  $$('[data-row]', app).forEach(b => b.onclick = () => onRow(b.dataset.row));
}

function onRow(id) {
  const p = store.getState().profile;
  const num = (label, val, unit, save, step = 'any') => openValueSheet(label, val, unit, save, step);
  switch (id) {
    case 'targetWeight': return num('Zielgewicht', p.targetWeight, 'kg', v => store.updateProfile({ targetWeight: v }));
    case 'targetBodyfat': return num('Ziel-Körperfett', p.targetBodyfat, '%', v => store.updateProfile({ targetBodyfat: v }));
    case 'kcal': return num('Kalorien pro Tag', p.targets.kcal, 'kcal', v => store.setTarget('kcal', v));
    case 'protein': return num('Protein pro Tag', p.targets.protein, 'g', v => store.setTarget('protein', v));
    case 'water': return num('Wasser pro Tag', p.water / 1000, 'L', v => store.updateProfile({ water: Math.round(v * 1000) }));
    case 'sleepTarget': return num('Schlafziel', p.sleepTarget, 'Stunden', v => store.updateProfile({ sleepTarget: v }));
    case 'stepGoal': return num('Schritte-Minimum', p.stepGoal, 'Schritte', v => store.updateProfile({ stepGoal: Math.round(v) }));
    case 'dayGoal': return num('Tag zählt ab', p.dayGoal, '%', v => store.updateProfile({ dayGoal: Math.max(10, Math.min(100, Math.round(v))) }));
    case 'height': return num('Größe', p.height, 'cm', v => store.updateProfile({ height: v }));
    case 'weight': return num('Startgewicht', p.weight, 'kg', v => store.updateProfile({ weight: v }));
    case 'age': return num('Alter', p.age, 'Jahre', v => store.updateProfile({ age: Math.round(v) }));
    case 'wakeTime': return openTimeSheet();
    case 'targets': return openTargetsSheet();
    case 'photo': return (async () => { const f = await pickFile(); if (!f) return; store.updateProfile({ photo: await downscalePhoto(f, { size: 360 }) }); router.rerender(); toast('Foto gesetzt'); })();
    case 'training': return openTrainingSheet();
    case 'supps': return openSuppList();
    case 'library': return openLibrary();
    case 'meals': return openMealsList();
    case 'games': return openGamesSheet();
    case 'ai': return openAiSetup(() => router.rerender());
    case 'export': return exportData();
    case 'import': return importData();
    case 'onboarding': return openOnboarding();
    case 'reset':
      if (confirm('Wirklich ALLE Daten löschen? Das lässt sich nicht rückgängig machen.') && confirm('Sicher? Am besten vorher ein Backup machen.')) {
        store.resetAll(); router.go('today'); toast('Alles zurückgesetzt');
      }
      return null;
    default: return null;
  }
}

function openValueSheet(label, value, unit, onSave) {
  const sheet = openSheet(`${sheetHead(label)}
    <div class="field"><input type="text" inputmode="decimal" step="any" id="vs-v" value="${value ?? ''}" style="font-size:28px;font-weight:850;text-align:center"></div>
    <div class="sub" style="text-align:center">${esc(unit)}</div>
    <div class="sheet-foot"><button class="btn block" id="vs-save">${icon('check')}Speichern</button></div>`);
  const inp = $('#vs-v', sheet);
  setTimeout(() => inp.focus(), 60);
  $('#vs-save', sheet).onclick = () => {
    const v = Number(String(inp.value).replace(',', '.'));
    if (!inp.value || isNaN(v)) return toast('Bitte eine Zahl eingeben');
    onSave(v); closeSheet(); router.rerender(); toast(`${label} gespeichert`);
  };
}

function openTimeSheet() {
  const sheet = openSheet(`${sheetHead('Übliche Aufstehzeit')}
    <div class="field"><input type="time" id="ts-v" value="${store.getState().profile.wakeTime || '07:00'}" style="font-size:24px;font-weight:850;text-align:center"></div>
    <div class="sheet-foot"><button class="btn block" id="ts-save">${icon('check')}Speichern</button></div>`);
  $('#ts-save', sheet).onclick = () => { store.updateProfile({ wakeTime: $('#ts-v', sheet).value || '07:00' }); closeSheet(); router.rerender(); };
}

function openTargetsSheet() {
  const t = store.getState().profile.targets;
  const sheet = openSheet(`${sheetHead('Nährstoffziele', 'Tageswerte')}
    <div class="sheet-body"><div class="grid2">${NUTRIENTS.map(n => `<label class="field"><span>${esc(n.label)} (${n.unit})${n.limit ? ' · max' : ''}</span>
      <input type="text" inputmode="decimal" step="any" data-t="${n.key}" value="${t[n.key] ?? 0}"></label>`).join('')}</div></div>
    <div class="sheet-foot"><button class="btn block" id="tg-save">${icon('check')}Speichern</button></div>`, { tall: true });
  $('#tg-save', sheet).onclick = () => {
    $$('[data-t]', sheet).forEach(inp => store.setTarget(inp.dataset.t, String(inp.value).replace(',', '.')));
    closeSheet(); router.rerender(); toast('Ziele gespeichert');
  };
}

// --- Supplements ----------------------------------------------------------------
function openSuppList() {
  const sheet = openSheet(`${sheetHead('Supplements', 'Tippen zum Bearbeiten')}<div class="sheet-body" id="sl-body"></div>
    <div class="sheet-foot"><button class="btn block" id="sl-new">${icon('plus')}Supplement hinzufügen</button></div>`, { tall: true });
  const draw = () => {
    $('#sl-body', sheet).innerHTML = store.getState().supplements.map(x => `<button class="row" data-sp="${x.id}" style="padding-left:0;padding-right:0">
      <span class="row-ic" style="background:#FCE7F3;color:var(--pill)">${icon('pill')}</span><span class="row-main"><div class="row-t">${esc(x.name)}</div>
      <div class="row-s">${esc(x.dose || '')} · ${SUPP_TIME_LABELS[x.time || 'egal']}</div></span>${icon('chev')}</button>`).join('');
    $$('[data-sp]', sheet).forEach(b => b.onclick = () => openSuppEditor(b.dataset.sp, draw));
  };
  $('#sl-new', sheet).onclick = () => openSuppEditor(null, draw);
  draw();
}
function openSuppEditor(id, onDone) {
  const ex = id ? store.getState().supplements.find(x => x.id === id) : null;
  const sp = ex ? structuredClone(ex) : { id: 'sp_' + Date.now().toString(36), name: '', dose: '', time: 'morgens', takeWith: '' };
  const sheet = openSheet(`${sheetHead(ex ? 'Supplement bearbeiten' : 'Neues Supplement')}
    <label class="field"><span>Name</span><input id="se-n" value="${esc(sp.name)}"></label>
    <div class="grid2"><label class="field"><span>Dosis</span><input id="se-d" value="${esc(sp.dose || '')}"></label>
      <label class="field"><span>Wann</span><select id="se-t">${SUPP_TIME_ORDER.map(k => `<option value="${k}" ${sp.time === k ? 'selected' : ''}>${SUPP_TIME_LABELS[k]}</option>`).join('')}</select></label></div>
    <label class="field"><span>Einnahme</span><select id="se-h">${Object.entries(HOW_LABELS).map(([k, l]) => `<option value="${k}" ${suppInfo(sp).how === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field"><span>Womit / Tipp</span><input id="se-w" value="${esc(sp.takeWith || '')}" placeholder="z. B. zum Frühstück mit Eiern"></label>
    <label class="field"><span>Wofür (eigene Notiz)</span><input id="se-why" value="${esc(sp.why || '')}" placeholder="${esc(suppInfo(sp).why ? 'Standard-Info vorhanden – optional' : 'z. B. für Haut & Haare')}"></label>
    <div class="sheet-foot">${ex ? `<button class="btn danger" id="se-del" style="flex:0 0 auto;width:56px">${icon('trash')}</button>` : ''}<button class="btn" id="se-save">${icon('check')}Speichern</button></div>`);
  $('#se-save', sheet).onclick = () => {
    sp.name = $('#se-n', sheet).value.trim();
    if (!sp.name) return toast('Name fehlt');
    sp.dose = $('#se-d', sheet).value.trim(); sp.time = $('#se-t', sheet).value; sp.takeWith = $('#se-w', sheet).value.trim();
    sp.how = $('#se-h', sheet).value; const why = $('#se-why', sheet).value.trim(); if (why) sp.why = why; else delete sp.why;
    store.upsertSupplement(sp); closeSheet(); onDone(); router.rerender();
  };
  const del = $('#se-del', sheet);
  if (del) del.onclick = () => { if (confirm('Supplement entfernen?')) { store.deleteSupplement(sp.id); closeSheet(); onDone(); router.rerender(); } };
}

function openMealsList() {
  const sheet = openSheet(`${sheetHead('Meine Mahlzeiten')}<div class="sheet-body" id="ml-body"></div>
    <div class="sheet-foot"><button class="btn block" id="ml-new">${icon('plus')}Neue Mahlzeit</button></div>`, { tall: true });
  $('#ml-body', sheet).innerHTML = store.getMeals().map(m => { const t = store.mealTotals(m); return `<button class="row" data-m="${m.id}" style="padding-left:0;padding-right:0">
    <span class="row-ic" style="background:var(--ink);color:#fff">${icon('bowl')}</span><span class="row-main"><div class="row-t">${esc(m.name)}</div><div class="row-s">${m.items.length} Zutaten · ${de(t.kcal)} kcal · ${de(t.protein)} g P</div></span>${icon('chev')}</button>`; }).join('') || '<div class="empty">Noch keine Mahlzeiten.</div>';
  $$('[data-m]', sheet).forEach(b => b.onclick = () => { closeSheet(); openMealEditor(b.dataset.m); });
  $('#ml-new', sheet).onclick = () => { closeSheet(); openMealEditor(null); };
}

// --- Trainingsplan ----------------------------------------------------------------
function openTrainingSheet() {
  const sheet = openSheet(`${sheetHead('Trainingsplan', 'Tippen zum Bearbeiten')}<div class="sheet-body" id="tr-body"></div>`, { tall: true });
  const draw = () => {
    const tr = store.getState().training;
    $('#tr-body', sheet).innerHTML = [1, 2, 3, 4, 5, 6, 0].map(wd => {
      const d = tr[wd] || { kind: 'rest', title: 'Frei' };
      const ic = d.kind === 'gym' ? 'dumbbell' : d.kind === 'sport' ? store.sportType(d.sport).icon : 'moon';
      const sub = d.kind === 'gym' ? `${(d.exercises || []).length} Übungen` : d.kind === 'sport' ? `${store.sportType(d.sport).label}${d.time ? ' · ' + d.time : ''}` : 'Ruhetag';
      return `<button class="row" data-wd="${wd}" style="padding-left:0;padding-right:0"><span class="row-ic">${icon(ic)}</span>
        <span class="row-main"><div class="row-t">${WEEKDAYS_LONG[wd]}</div><div class="row-s">${esc(d.title)} · ${sub}</div></span>${icon('chev')}</button>`;
    }).join('');
    $$('[data-wd]', sheet).forEach(b => b.onclick = () => openDayEditor(Number(b.dataset.wd), draw));
  };
  draw();
}

function openDayEditor(wd, onDone) {
  const d = structuredClone(store.getState().training[wd] || { kind: 'rest', title: 'Ruhetag', focus: '' });
  if (!d.exercises) d.exercises = [];
  const sheet = openSheet(`${sheetHead(WEEKDAYS_LONG[wd])}<div class="sheet-body" id="de-body"></div>
    <div class="sheet-foot"><button class="btn block" id="de-save">${icon('check')}Speichern</button></div>`, { tall: true });
  const commit = () => {
    const g = id => $(id, sheet);
    if (g('#de-title')) d.title = g('#de-title').value.trim() || d.title;
    if (g('#de-focus')) d.focus = g('#de-focus').value.trim();
    if (g('#de-time')) d.time = g('#de-time').value || undefined;
    if (g('#de-min')) d.min = Number(g('#de-min').value) || undefined;
    if (g('#de-sport')) d.sport = g('#de-sport').value;
    $$('[data-ex]', sheet).forEach(box => {
      const ex = d.exercises[Number(box.dataset.ex)];
      const v = sel => box.querySelector(sel);
      ex.n = v('.e-n').value.trim() || ex.n;
      ex.sets = Number(v('.e-s').value) || 3;
      ex.load = v('.e-l').value;
      ex.rest = Number(v('.e-r').value) || 90;
      if (ex.load === 'time') { ex.secs = Number(v('.e-lo').value) || 30; delete ex.reps; }
      else { ex.reps = [Number(v('.e-lo').value) || 8, Number(v('.e-hi').value) || 12]; delete ex.secs; }
      ex.inc = Number(String(v('.e-i').value).replace(',', '.')) || 0;
    });
  };
  const draw = () => {
    $('#de-body', sheet).innerHTML = `
      <div class="seg" style="margin-bottom:14px">${[['gym', 'Gym'], ['sport', 'Sport'], ['rest', 'Ruhe']].map(([k, l]) => `<button data-kind="${k}" class="${d.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <label class="field"><span>Titel</span><input id="de-title" value="${esc(d.title || '')}"></label>
      <label class="field"><span>Fokus / Notiz</span><input id="de-focus" value="${esc(d.focus || '')}"></label>
      ${d.kind === 'sport' ? `<div class="grid3">
        <label class="field"><span>Sportart</span><select id="de-sport">${SPORT_TYPES.map(t => `<option value="${t.id}" ${d.sport === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}</select></label>
        <label class="field"><span>Uhrzeit</span><input type="time" id="de-time" value="${d.time || ''}"></label>
        <label class="field"><span>Minuten</span><input type="number" inputmode="numeric" id="de-min" value="${d.min || ''}"></label></div>` : ''}
      ${d.kind === 'gym' ? `${d.exercises.map((ex, i) => `<div class="card tight" data-ex="${i}" style="background:var(--fill);box-shadow:none">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <input class="e-n" value="${esc(ex.n)}" style="flex:1;background:#fff;border:none;border-radius:11px;padding:10px;font-weight:750">
            <button class="qa-rm" data-up="${i}" aria-label="Nach unten">${icon('chevD')}</button>
            <button class="qa-rm" data-del="${i}" aria-label="Entfernen">${icon('trash')}</button>
          </div>
          <div class="grid3">
            <label class="field"><span>Sätze</span><input class="e-s" type="number" inputmode="numeric" value="${ex.sets}"></label>
            <label class="field"><span>Art</span><select class="e-l"><option value="weight" ${ex.load === 'weight' ? 'selected' : ''}>Gewicht</option><option value="bw" ${ex.load === 'bw' ? 'selected' : ''}>Körpergew.</option><option value="time" ${ex.load === 'time' ? 'selected' : ''}>Halten (s)</option></select></label>
            <label class="field"><span>Pause (s)</span><input class="e-r" type="number" inputmode="numeric" value="${ex.rest || 90}"></label>
            <label class="field"><span>${ex.load === 'time' ? 'Sekunden' : 'Wdh von'}</span><input class="e-lo" type="number" inputmode="numeric" value="${ex.load === 'time' ? ex.secs : ex.reps[0]}"></label>
            <label class="field" ${ex.load === 'time' ? 'style="visibility:hidden"' : ''}><span>Wdh bis</span><input class="e-hi" type="number" inputmode="numeric" value="${ex.reps ? ex.reps[1] : 12}"></label>
            <label class="field"><span>+ kg Schritt</span><input class="e-i" type="text" inputmode="decimal" value="${ex.inc || 0}"></label>
          </div></div>`).join('')}
        <button class="btn ghost block" id="de-add">${icon('plus')}Übung hinzufügen</button>` : ''}`;
    $$('[data-kind]', sheet).forEach(b => b.onclick = () => { commit(); d.kind = b.dataset.kind; if (d.kind === 'sport' && !d.sport) d.sport = 'basketball'; draw(); });
    $$('[data-del]', sheet).forEach(b => b.onclick = () => { commit(); d.exercises.splice(Number(b.dataset.del), 1); draw(); });
    $$('[data-up]', sheet).forEach(b => b.onclick = () => { commit(); const i = Number(b.dataset.up); if (i < d.exercises.length - 1) { [d.exercises[i], d.exercises[i + 1]] = [d.exercises[i + 1], d.exercises[i]]; } draw(); });
    $$('.e-l', sheet).forEach(s => s.onchange = () => { commit(); draw(); });
    const add = $('#de-add', sheet);
    if (add) add.onclick = () => { commit(); d.exercises.push({ id: 'ex_' + Date.now().toString(36), n: 'Neue Übung', t: 'Kraft', sets: 3, reps: [8, 12], load: 'weight', rest: 120, inc: 2.5, muscles: [] }); draw(); };
  };
  $('#de-save', sheet).onclick = () => {
    commit();
    if (d.kind !== 'gym') delete d.exercises;
    store.setTrainingDay(wd, d); closeSheet(); onDone(); router.rerender(); toast('Plan gespeichert');
  };
  draw();
}

// --- Spielplan ----------------------------------------------------------------
function openGamesSheet() {
  const sheet = openSheet(`${sheetHead('Spielplan TSC')}<div class="sheet-body" id="gm-body"></div>
    <div class="sheet-foot"><button class="btn block" id="gm-add">${icon('plus')}Spiel hinzufügen</button></div>`, { tall: true });
  const draw = () => {
    const games = store.getGames().slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    $('#gm-body', sheet).innerHTML = games.map((g, i) => `<div class="entry"><span class="qa-main"><div class="qa-nm">${g.home ? 'vs' : '@'} ${esc(g.opponent)}</div>
      <div class="qa-am">${store.dateOf(g.date).toLocaleDateString('de-DE')} · ${esc(g.time)}${g.hall ? ' · ' + esc(g.hall) : ''}</div></span>
      <button class="qa-rm" data-gd="${g.date}|${g.time}|${esc(g.opponent)}">${icon('trash')}</button></div>`).join('');
    $$('[data-gd]', sheet).forEach(b => b.onclick = () => {
      const [date, time, opp] = b.dataset.gd.split('|');
      const s = store.getState();
      s.games = s.games.filter(g => !(g.date === date && g.time === time && g.opponent === opp));
      store.save(); draw(); router.rerender();
    });
  };
  $('#gm-add', sheet).onclick = () => {
    const s2 = openSheet(`${sheetHead('Neues Spiel')}
      <div class="grid2"><label class="field"><span>Datum</span><input type="date" id="g-d"></label><label class="field"><span>Uhrzeit</span><input type="time" id="g-t" value="20:00"></label></div>
      <label class="field"><span>Gegner</span><input id="g-o"></label>
      <div class="seg" id="g-h" style="margin-bottom:12px"><button data-h="1" class="on">Heim</button><button data-h="0">Auswärts</button></div>
      <div class="sheet-foot"><button class="btn block" id="g-save">${icon('check')}Speichern</button></div>`);
    let home = true;
    $$('[data-h]', s2).forEach(b => b.onclick = () => { home = b.dataset.h === '1'; $$('[data-h]', s2).forEach(x => x.classList.toggle('on', x === b)); });
    $('#g-save', s2).onclick = () => {
      const date = $('#g-d', s2).value, opp = $('#g-o', s2).value.trim();
      if (!date || !opp) return toast('Datum und Gegner eintragen');
      store.getState().games.push({ date, time: $('#g-t', s2).value || '20:00', opponent: opp, home, hall: '' });
      store.save(); closeSheet(); draw(); router.rerender();
    };
  };
  draw();
}

// --- Backup -----------------------------------------------------------------------
function exportData() {
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  const name = `mikromaxxing-backup-${store.todayKey()}.json`;
  const file = typeof File !== 'undefined' ? new File([blob], name, { type: 'application/json' }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: 'Mikromaxxing Backup' }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Backup erstellt');
}
async function importData() {
  const f = await pickFile('application/json,.json');
  if (!f) return;
  try {
    store.importJSON(await f.text());
    router.go('today'); toast('Backup importiert');
  } catch (e) {
    toast('Datei konnte nicht gelesen werden');
  }
}
