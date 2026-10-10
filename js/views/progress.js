// ============================================================================
// Dashboard – Überblick, Ziel, Gewicht, Körper, Serie, Woche, Knie & Schlaf, Level, Fotos
// ============================================================================
import * as store from '../store.js';
import { BODYCOMP_METRICS } from '../data.js';
import { levelInfo, totalXP, dayXP, motivationProfile, RANKS } from '../game.js';
import { getReview } from '../assistant.js';
import { weekStart } from '../game.js';
import { icon } from '../icons.js';
import { $, $$, esc, de, router, openSheet, closeSheet, sheetHead, toast, miniRings, downscalePhoto, pickFile } from '../ui.js';
import { openPlusMenu } from './coach.js';

export function renderProgress(app) {
  const today = store.todayKey();
  app.innerHTML = `<div class="view">
    <div class="sub-h"><button class="icon-btn" id="pg-back" aria-label="Zurück">${icon('chevL')}</button><div class="vh-title">Dashboard</div></div>
    ${overview(today)}
    ${projectionCard(today)}
    <div id="sec-weight">${weightCard(today)}</div>
    <div id="sec-body">${bodyCard()}</div>
    <div id="sec-streak">${calendarCard(today)}</div>
    ${weekCard(today)}
    ${kneeSleepCard(today)}
    ${levelCard(today)}
    ${motivationCard(today)}
    ${badgesCard()}
    ${photosCard()}
  </div>`;
  wire(app, today);
}

// Auf einen Blick: Gewicht, Körperfett, Serie, Level
function overview(today) {
  const w = store.currentWeight();
  const t0 = store.weightTrend(today, 7), t1 = store.weightTrend(store.shiftDate(today, -7), 7);
  const dw = t0 != null && t1 != null ? t0 - t1 : null;
  const ms = store.getMeasurements();
  const lm = ms[ms.length - 1], fm = ms[0];
  const bf = lm && lm.values.bodyfat != null ? lm.values.bodyfat : null;
  const dbf = bf != null && ms.length > 1 && fm.values.bodyfat != null ? bf - fm.values.bodyfat : null;
  const streak = store.currentStreak(today), best = store.bestStreak();
  const lv = levelInfo(totalXP());
  const delta = (d, unit, goodDown = true) => d == null || Math.abs(d) < 0.05 ? '' : `<span class="dt ${(goodDown ? d < 0 : d > 0) ? 'good' : 'bad'}">${d > 0 ? '+' : '−'}${de(Math.abs(d), 1)} ${unit}</span>`;
  return `<div class="ov">
    <button class="ov-t" data-sec="sec-weight"><span class="ov-l">Gewicht</span><span class="ov-v num">${w != null ? de(w, 1) : '–'}<small> kg</small></span>${delta(dw, 'kg / Woche') || '<span class="dt">Trend folgt</span>'}</button>
    <button class="ov-t" data-sec="sec-body"><span class="ov-l">Körperfett</span><span class="ov-v num">${bf != null ? de(bf, 1) : '–'}<small> %</small></span>${delta(dbf, '% seit Start') || `<span class="dt">${lm ? store.dateOf(lm.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : 'Foto an den Coach'}</span>`}</button>
    <button class="ov-t" data-sec="sec-streak"><span class="ov-l">${icon('flame')}Serie</span><span class="ov-v num">${streak}<small> ${streak === 1 ? 'Tag' : 'Tage'}</small></span><span class="dt">Rekord ${best}</span></button>
    <button class="ov-t" id="ov-lv"><span class="ov-l">${icon('star')}Level ${lv.level}</span><span class="ov-v">${esc(lv.rank)}</span><span class="lvl-bar"><i style="width:${lv.pct}%"></i></span></button>
  </div>`;
}

function levelCard(today) {
  const lv = levelInfo(totalXP());
  const dx = dayXP(today);
  const rev = getReview(store.shiftDate(weekStart(today), -7));
  return `<button class="card lvl-card" id="lv-open">
    <div class="lvl-big"><span class="lvl-badge num">${lv.level}</span>
      <div style="flex:1;min-width:0"><div class="lbl">Level ${lv.level}</div><div class="lvl-rank">${esc(lv.rank)}</div>
        <span class="lvl-bar"><i style="width:${lv.pct}%"></i></span>
        <div class="sub" style="margin-top:6px">${de(lv.need - lv.into)} XP bis Level ${lv.level + 1}${lv.nextRank ? ` · ${esc(lv.nextRank.name)} ab Level ${lv.nextRank.from}` : ''}</div></div></div>
    <div class="lvl-today"><span>Heute</span><b class="num">+${dx.xp} XP</b></div>
  </button>
  ${rev ? `<button class="review-cta" id="rv-open">${icon('spark')}<span><b>${esc(rev.headline)}</b><span>Wochenrückblick ansehen</span></span>${icon('chev')}</button>` : ''}`;
}

function motivationCard(today) {
  const m = motivationProfile(today);
  if (!m.days) return '';
  return `<div class="card">
    <div class="ch"><span class="ch-title">Was dich antreibt</span><span class="sub">${m.days} Tage Missionen</span></div>
    ${m.days < 5 ? `<p class="hint">Ich lerne noch, welche Art von Mission du wirklich durchziehst. Nach 5 Tagen siehst du hier dein Profil – und ich stelle die Missionen darauf ein.</p>` : `<p class="hint">Am stärksten bei: <b style="color:var(--nut)">${esc(m.top.label)}</b>. Davon bekommst du mehr.</p>`}
    ${m.styles.map(x => `<div class="vol wide"><span>${esc(x.label)}</span><span class="bar"><i style="width:${Math.round(x.rate * 100)}%"></i></span><span>${Math.round(x.rate * 100)} %</span></div>`).join('')}
  </div>`;
}

function openLevel(today) {
  const lv = levelInfo(totalXP());
  const dx = dayXP(today);
  openSheet(`${sheetHead(`Level ${lv.level} · ${esc(lv.rank)}`, `${de(lv.xp)} XP insgesamt`)}
    <div class="sheet-body">
      <div class="part-head"><b>Heute</b><span class="sub">+${dx.xp} XP</span></div>
      ${dx.parts.length ? dx.parts.map(p => `<div class="entry"><span class="qa-main"><div class="qa-nm">${esc(p.label)}</div></span><b class="num" style="color:var(--gold)">+${p.xp}</b></div>`).join('') : '<div class="empty">Noch keine XP heute – trag was ein.</div>'}
      <div class="part-head"><b>Ränge</b></div>
      ${RANKS.map(r => `<div class="entry"><span class="qa-main"><div class="qa-nm" style="${lv.level >= r.from ? 'color:var(--nut)' : ''}">${esc(r.name)}</div><div class="qa-am">ab Level ${r.from}</div></span>${lv.level >= r.from ? icon('check') : ''}</div>`).join('')}
      <p class="hint" style="margin-top:12px">XP gibt's für Einträge, volle Ringe, Tagesziel im Budget, Training, Workouts, Rekorde, Reha, Skill-Stufen, Missionen und die Wochen-Challenge.</p>
    </div>`, { tall: true });
}

function projectionCard(today) {
  const p = store.goalProjection(today);
  const prof = store.getState().profile;
  if (p.current == null) return '';
  const first = store.firstMeasurement();
  const start = first && first.values.weight != null ? first.values.weight : prof.weight || p.current;
  const pct = p.target && start !== p.target ? Math.max(0, Math.min(100, (start - p.current) / (start - p.target) * 100)) : 0;
  let line;
  if (p.date) {
    const d = store.dateOf(p.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    line = `Bei ${de(p.rate, 2)} kg pro Woche erreichst du dein Ziel ca. am <b>${d}</b> (${p.weeks} Wochen).`;
  } else if (p.target && p.current <= p.target) line = '<b>Zielgewicht erreicht.</b> Zeit, ein neues Ziel zu setzen.';
  else if (p.planDate) line = `Mit Tempo „${esc(p.tempo)}" bist du ca. am <b>${store.dateOf(p.planDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}</b> bei ${de(p.target, 0)} kg (${p.planWeeks} Wochen).`;
  else line = esc(store.kcalSuggestion(today));
  const latest = store.latestMeasurement();
  const bf = latest && latest.values.bodyfat != null ? latest.values.bodyfat : null;
  return `<div class="card">
    <div class="ch"><span class="chip spo">${icon('target')}Ziel</span><span class="sub">${de(pct)} % geschafft</span></div>
    <div class="proj-nums">
      <div class="proj-col"><div class="lbl">Start</div><div class="proj-v num" style="font-size:22px;color:var(--faint)">${de(start, 1)}</div></div>
      <div class="proj-col"><div class="lbl">Jetzt</div><div class="proj-v num">${de(p.current, 1)}<small>kg</small></div></div>
      <span class="proj-arrow">${icon('chev')}</span>
      <div class="proj-col"><div class="lbl">Ziel</div><div class="proj-v num">${de(p.target, 1)}<small>kg</small></div></div>
    </div>
    <div class="pbar"><i style="width:${pct}%"></i></div>
    <div class="proj-line">${line}</div>
    ${bf != null && prof.targetBodyfat ? `<div class="sub" style="margin-top:6px">Körperfett ${de(bf, 1)} % → Ziel ${de(prof.targetBodyfat)} %</div>` : ''}
  </div>`;
}

function calendarCard(today) {
  const hist = store.ringHistory(28, today);
  const streak = store.currentStreak(today);
  const best = Math.max(store.bestStreak(), streak);
  return `<div class="card">
    <div class="ch"><span class="ch-title">${streak} ${streak === 1 ? 'Tag' : 'Tage'} in Folge</span><span class="sub">Rekord ${best}</span></div>
    <div class="cal">${hist.map(h => `<div class="cal-day ${h.key === today ? 'today' : ''}">${miniRings(h)}<span>${store.dateOf(h.key).getDate()}</span></div>`).join('')}</div>
    <p class="hint" style="margin:10px 0 0">Ein Tag zählt ab ${store.getState().profile.dayGoal || 80} % Gesamt-Ring.</p>
  </div>`;
}

function weekCard(today) {
  const w = store.weeklySummary(today);
  const dTxt = w.delta == null ? '–' : `${w.delta > 0 ? '+' : ''}${de(w.delta, 1)}`;
  return `<div class="card">
    <div class="ch"><span class="ch-title">Diese Woche</span><span class="sub">letzte 7 Tage</span></div>
    <div class="wk-tiles">
      <div class="wk-tile"><div class="v num">${w.avgRing}%</div><div class="l">Ø Ring</div></div>
      <div class="wk-tile"><div class="v num">${w.complete}/7</div><div class="l">Tage geschafft</div></div>
      <div class="wk-tile"><div class="v num ${w.delta == null ? '' : w.delta <= 0 ? 'good' : 'bad'}">${dTxt}</div><div class="l">kg zur Vorwoche</div></div>
    </div>
    ${(() => { const a = store.kcalAdvice(today); return `<div class="slot-note" style="margin:12px 0 0">${esc(a.text)}${a.delta ? `<button class="btn sm volt" id="kc-apply" data-delta="${a.delta}" style="margin-top:10px;width:100%">${a.delta < 0 ? 'Ziel um 150 kcal senken' : 'Ziel um 100 kcal erhöhen'}</button>` : ''}</div>`; })()}
    <p class="hint" style="margin:10px 0 0">${w.sessions} Einheit${w.sessions === 1 ? '' : 'en'} · Trainingslast ${de(w.load)}</p>
  </div>`;
}

function weightCard(today) {
  const series = store.weightSeries(today, 30);
  const vals = series.filter(x => x.w != null);
  const todayW = store.getDay(today).weight;
  const target = store.getState().profile.targetWeight;
  let chart = '<div class="empty" style="padding:10px">Wieg dich morgens nach dem Aufstehen – nach ein paar Tagen siehst du hier den Trend.</div>';
  if (vals.length >= 2) {
    const W = 320, H = 120, P = 8;
    const ws = vals.map(x => x.w);
    let lo = Math.min(...ws) - .6, hi = Math.max(...ws) + .6;
    const y = v => H - P - (v - lo) / (hi - lo) * (H - 2 * P);
    const x = i => P + i / (series.length - 1) * (W - 2 * P);
    const pts = series.map((s, i) => s.w != null ? [x(i), y(s.w)] : null).filter(Boolean);
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${path} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
    chart = `<svg class="chart" viewBox="0 0 ${W} ${H + 16}">
      <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--nut)" stop-opacity=".18"/><stop offset="1" stop-color="var(--nut)" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#wg)"/>
      <path d="${path}" fill="none" stroke="var(--nut)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" fill="var(--card)" stroke="var(--nut)" stroke-width="1.8"/>`).join('')}
      <text x="${P}" y="${H + 14}">vor 30 Tagen</text><text x="${W - P}" y="${H + 14}" text-anchor="end">heute</text>
      <text x="${W - P}" y="${y(hi - .6) - 4}" text-anchor="end">${de(hi - .6, 1)}</text>
    </svg>`;
  }
  const avg = store.weightTrend(today, 7);
  return `<div class="card">
    <div class="ch"><span class="ch-title">Gewicht</span><span class="sub">${avg != null ? `Ø 7 Tage ${de(avg, 1)} kg` : ''}${target ? ` · Ziel ${de(target, 1)} kg` : ''}</span></div>
    ${chart}
    <div style="display:flex;gap:8px;margin-top:12px">
      <input id="w-in" type="text" inputmode="decimal" step="0.1" placeholder="Heute (kg)" value="${todayW ?? ''}" style="flex:1;min-width:0;background:var(--fill-2);border:none;border-radius:12px;padding:12px 14px">
      <button class="btn sm" id="w-save" style="height:48px">${icon('check')}Speichern</button>
    </div>
  </div>`;
}

function kneeSleepCard(today) {
  const hist = store.kneeHistory(today, 28);
  const hasKnee = hist.some(h => h.knee != null), hasSleep = hist.some(h => h.sleep != null);
  if (!hasKnee && !hasSleep) return '';
  const W = 320, H = 110, P = 6, bw = (W - 2 * P) / hist.length;
  const target = store.getState().profile.sleepTarget || 8;
  const bars = hist.map((h, i) => {
    if (h.sleep == null) return '';
    const bh = Math.min(1, h.sleep / 10) * (H - 20);
    return `<rect x="${(P + i * bw + 1.5).toFixed(1)}" y="${(H - bh).toFixed(1)}" width="${(bw - 3).toFixed(1)}" height="${bh.toFixed(1)}" rx="2.5" fill="${h.sleep >= target ? 'var(--spo)' : 'var(--faint)'}"/>`;
  }).join('');
  const kp = hist.map((h, i) => h.knee != null ? [P + i * bw + bw / 2, H - 6 - h.knee / 10 * (H - 26)] : null).filter(Boolean);
  const kpath = kp.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const lastK = [...hist].reverse().find(h => h.knee != null);
  const avgSleep = (() => { const s = hist.filter(h => h.sleep != null).slice(-7); return s.length ? s.reduce((a, b) => a + b.sleep, 0) / s.length : null; })();
  return `<div class="card">
    <div class="ch"><span class="ch-title">Knie & Schlaf</span><span class="sub">28 Tage</span></div>
    <svg class="chart" viewBox="0 0 ${W} ${H + 4}">
      ${bars}
      ${kp.length > 1 ? `<path d="${kpath}" fill="none" stroke="var(--nut)" stroke-width="2" stroke-linejoin="round"/>` : ''}
      ${kp.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.4" fill="var(--nut)"/>`).join('')}
    </svg>
    <div class="macros"><span><b style="color:var(--spo)">▮</b> Schlaf${avgSleep != null ? ` · Ø ${de(avgSleep, 1)} h` : ''}</span><span><b style="color:var(--nut)">●</b> Knie${lastK ? ` · zuletzt ${lastK.knee}/10` : ''}</span></div>
  </div>`;
}

function photosCard() {
  const ph = store.getProgressPhotos();
  return `<div class="card">
    <div class="ch"><span class="ch-title">Fotos</span><button class="more" id="ph-add">${icon('camera')}Foto</button></div>
    ${ph.length ? `<div class="photos">${ph.map(p => `<button class="photo" data-ph="${p.date}"><img src="${p.url}" alt=""><span>${store.dateOf(p.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</span></button>`).join('')}</div>
      ${ph.length >= 2 ? `<button class="btn ghost block" id="ph-cmp" style="margin-top:12px">${icon('layers')}Vorher / Nachher</button>` : ''}`
    : '<div class="empty">Alle 1–2 Wochen ein Foto bei gleichem Licht und gleicher Pose. Im Vergleich siehst du, was die Waage nicht zeigt.</div>'}
  </div>`;
}

function badgesCard() {
  const b = store.getBadges();
  return `<div class="card">
    <div class="ch"><span class="ch-title">Meilensteine</span><span class="sub">${b.filter(x => x.earned).length} / ${b.length}</span></div>
    <div class="badges">${b.map(x => `<div class="badge ${x.earned ? 'on' : ''}" title="${esc(x.desc)}"><div class="bi">${icon(x.icon)}</div><div class="bl">${esc(x.label)}</div></div>`).join('')}</div>
  </div>`;
}

function bodyCard() {
  const list = store.getMeasurements();
  const latest = list[list.length - 1], first = list[0];
  const keys = ['weight', 'bodyfat', 'muscle', 'fatmass', 'musclePct', 'water'];
  return `<div class="card">
    <div class="ch"><span class="ch-title">Körperanalyse</span><span style="display:flex;gap:14px"><button class="more" id="m-photo">${icon('camera')}Foto</button><button class="more" id="m-add">${icon('plus')}Manuell</button></span></div>
    ${latest ? `<div class="sub" style="margin-bottom:10px">Letzte Messung ${store.dateOf(latest.date).toLocaleDateString('de-DE')}${list.length > 1 ? ` · Vergleich zu ${store.dateOf(first.date).toLocaleDateString('de-DE')}` : ''}</div>
      <div class="bc">${BODYCOMP_METRICS.filter(m => keys.includes(m.key) && latest.values[m.key] != null).map(m => {
        const v = latest.values[m.key];
        const b = first.values[m.key];
        let d = '';
        if (list.length > 1 && b != null && v !== b) {
          const diff = v - b;
          const good = m.better === 'neutral' ? null : (m.better === 'down' ? diff < 0 : diff > 0);
          d = `<span class="d ${good == null ? '' : good ? 'good' : 'bad'}">${diff > 0 ? '+' : ''}${de(diff, 1)}</span>`;
        }
        return `<div class="bc-t"><div class="l">${esc(m.label)}</div><div class="v num">${de(v, 1)}<small> ${m.unit}</small>${d}</div></div>`;
      }).join('')}</div>
      <button class="btn ghost block" id="m-edit" style="margin-top:12px">${icon('edit')}Alle Werte ansehen & bearbeiten</button>`
    : '<div class="empty">Schick dem Coach ein Foto deiner InBody- oder Waagen-Analyse – er liest alle Werte aus. Dann siehst du hier Fett und Muskeln im Verlauf.</div>'}
  </div>`;
}

function wire(app, today) {
  $$('[data-go]', app).forEach(b => b.onclick = () => router.go(b.dataset.go));
  $('#pg-back', app).onclick = () => router.go(router.prev && router.prev !== 'progress' ? router.prev : 'more');
  $('#w-save', app).onclick = () => {
    const v = $('#w-in', app).value.replace(',', '.');
    store.setWeight(today, v);
    router.rerender(); toast(v ? `Gewicht ${de(Number(v), 1)} kg gespeichert` : 'Gewicht entfernt');
  };
  $('#ph-add', app).onclick = async () => {
    const f = await pickFile();
    if (!f) return;
    store.addProgressPhoto(await downscalePhoto(f, { square: false, maxW: 480, maxH: 640, quality: .76 }));
    router.rerender(); toast('Foto gespeichert');
  };
  $$('[data-ph]', app).forEach(b => b.onclick = () => openPhoto(b.dataset.ph));
  const cmp = $('#ph-cmp', app);
  if (cmp) cmp.onclick = () => {
    const ph = store.getProgressPhotos();
    const a = ph[0], z = ph[ph.length - 1];
    openSheet(`${sheetHead('Vorher / Nachher')}<div class="compare">
      <figure><img src="${a.url}" alt=""><figcaption>${store.dateOf(a.date).toLocaleDateString('de-DE')}</figcaption></figure>
      <figure><img src="${z.url}" alt=""><figcaption>${store.dateOf(z.date).toLocaleDateString('de-DE')}</figcaption></figure></div>`);
  };
  $('#m-add', app).onclick = () => openMeasurement(null);
  $('#m-photo', app).onclick = () => openPlusMenu();
  $$('[data-sec]', app).forEach(b => b.onclick = () => { const el = $('#' + b.dataset.sec, app); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('#ov-lv', app).onclick = () => openLevel(today);
  const kc = $('#kc-apply', app);
  if (kc) kc.onclick = () => { store.applyKcalOffset(Number(kc.dataset.delta)); router.rerender(); toast('Kalorienziel angepasst'); };
  const lv = $('#lv-open', app);
  if (lv) lv.onclick = () => openLevel(today);
  const rv = $('#rv-open', app);
  if (rv) rv.onclick = () => router.go('coach');
  const me = $('#m-edit', app);
  if (me) me.onclick = () => { const l = store.latestMeasurement(); openMeasurement(l ? l.date : null); };
}

function openPhoto(date) {
  const p = store.getProgressPhotos().find(x => x.date === date);
  const sheet = openSheet(`${sheetHead(store.dateOf(date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }))}
    <img src="${p.url}" alt="" style="width:100%;border-radius:18px;display:block">
    <div class="sheet-foot"><button class="btn danger block" id="ph-del">${icon('trash')}Foto löschen</button></div>`);
  $('#ph-del', sheet).onclick = () => { if (confirm('Foto löschen?')) { store.deleteProgressPhoto(date); closeSheet(); router.rerender(); } };
}

function openMeasurement(date) {
  const existing = date ? store.getMeasurements().find(m => m.date === date) : null;
  const e = existing ? structuredClone(existing) : { date: store.todayKey(), values: {}, note: '' };
  const sheet = openSheet(`${sheetHead(existing ? 'Messung bearbeiten' : 'Neue Messung', 'InBody, Waage oder Studio-Analyse')}
    <div class="sheet-body">
      <label class="field"><span>Datum</span><input type="date" id="m-date" value="${e.date}"></label>
      <div class="grid2">${BODYCOMP_METRICS.map(m => `<label class="field"><span>${esc(m.label)} (${m.unit})</span><input type="text" inputmode="decimal" step="any" data-m="${m.key}" value="${e.values[m.key] ?? ''}"></label>`).join('')}</div>
      <label class="field"><span>Notiz</span><input id="m-note" value="${esc(e.note || '')}"></label>
    </div>
    <div class="sheet-foot">${existing ? `<button class="btn danger" id="m-del" style="flex:0 0 auto;width:56px">${icon('trash')}</button>` : ''}<button class="btn" id="m-save">${icon('check')}Speichern</button></div>`, { tall: true });
  $('#m-save', sheet).onclick = () => {
    const entry = { date: $('#m-date', sheet).value || store.todayKey(), values: {}, note: $('#m-note', sheet).value.trim() };
    $$('[data-m]', sheet).forEach(inp => { if (inp.value !== '') entry.values[inp.dataset.m] = Number(String(inp.value).replace(',', '.')); });
    if (existing && existing.date !== entry.date) store.deleteMeasurement(existing.date);
    store.addMeasurement(entry);
    closeSheet(); router.rerender(); toast('Messung gespeichert');
  };
  const del = $('#m-del', sheet);
  if (del) del.onclick = () => { if (confirm('Messung löschen?')) { store.deleteMeasurement(existing.date); closeSheet(); router.rerender(); } };
}
