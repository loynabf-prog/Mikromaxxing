// ============================================================================
// Onboarding – Erststart in 4 Schritten
// ============================================================================
import * as store from '../store.js';
import { icon } from '../icons.js';
import { $, $$, esc, router, ringsSVG, downscalePhoto, pickFile, toast } from '../ui.js';

export function openOnboarding() {
  let step = 0;
  const host = document.createElement('div');
  host.className = 'ob';
  document.body.appendChild(host);

  const steps = () => {
    const p = store.getState().profile;
    return [
      `<div class="ob-art">${ringsSVG({ nutrition: 85, sport: 100 }, { photo: p.photo })}</div>
       <div class="ob-title">Hey ${esc(p.name || 'du')}.<br>Diese App gibt's nur einmal.</div>
       <p class="ob-text">Gebaut für deinen Alltag, dein Training und dein Essen. Zwei Ringe – Essen und Sport. Und ein Coach, mit dem du einfach redest.</p>`,
      `<div class="ob-art">${ringsSVG({ nutrition: 0, sport: 0 }, { photo: p.photo })}</div>
       <div class="ob-title">Dein Gesicht<br>in der Mitte</div>
       <p class="ob-text">Ein Foto von dir im Ring macht's persönlich. Kannst du jederzeit ändern.</p>
       <button class="btn ghost" id="ob-photo">${icon('camera')}${p.photo ? 'Foto ändern' : 'Foto wählen'}</button>`,
      `<div class="ob-title">Deine Ziele</div>
       <p class="ob-text">Schon sinnvoll vorbelegt – passe sie an, wenn du willst.</p>
       <div style="max-width:320px;margin:0 auto;text-align:left">
         <label class="field"><span>Zielgewicht (kg)</span><input type="text" inputmode="decimal" id="ob-tw" value="${p.targetWeight ?? ''}"></label>
         <label class="field"><span>Ziel-Körperfett (%)</span><input type="text" inputmode="decimal" id="ob-tbf" value="${p.targetBodyfat ?? ''}"></label>
         <label class="field"><span>Schlafziel (Stunden)</span><input type="text" inputmode="decimal" id="ob-sl" value="${p.sleepTarget ?? 8}"></label>
       </div>`,
      `<div class="ob-title">Einfach sagen,<br>was war</div>
       <p class="ob-text">Unten auf jeder Seite: schreib oder sprich es einfach hin.</p>
       <div class="ob-list">
         <div><span class="fico c-protein">Ei</span><span><b>„3 Eier und 200 g Skyr"</b><br>wird erkannt und gezählt</span></div>
         <div><span class="fico c-meal">${icon('bowl')}</span><span><b>„Poke Bowl"</b><br>deine gespeicherten Gerichte</span></div>
         <div><span class="fico c-supp">${icon('pill')}</span><span><b>„D3 und Kreatin genommen"</b><br>hakt Supplements ab</span></div>
         <div><span class="fico c-water">${icon('barcode')}</span><span><b>Barcode scannen</b><br>Packungswerte von Open Food Facts</span></div>
       </div>
       <p class="ob-text" style="margin-top:16px;font-size:13.5px">Tipp fürs iPhone: In Safari auf <b>Teilen</b> → <b>Zum Home-Bildschirm</b>, dann läuft's wie eine echte App.</p>`,
    ];
  };

  const commitGoals = () => {
    const tw = $('#ob-tw', host), tbf = $('#ob-tbf', host), sl = $('#ob-sl', host);
    const patch = {};
    if (tw && tw.value) patch.targetWeight = Number(tw.value.replace(',', '.'));
    if (tbf && tbf.value) patch.targetBodyfat = Number(tbf.value.replace(',', '.'));
    if (sl && sl.value) patch.sleepTarget = Number(sl.value.replace(',', '.'));
    if (Object.keys(patch).length) store.updateProfile(patch);
  };
  const finish = () => { commitGoals(); store.setOnboarded(true); store.getState()._seenV4 = true; store.save(); host.remove(); router.go('today'); };

  const draw = () => {
    const list = steps();
    const last = step === list.length - 1;
    host.innerHTML = `<div class="ob-card">
      <div class="ob-body">${list[step]}</div>
      <div class="ob-dots">${list.map((_, i) => `<span class="ob-dot ${i === step ? 'on' : ''}"></span>`).join('')}</div>
      <div class="ob-nav">
        <button class="btn ghost" id="ob-back">${step ? 'Zurück' : 'Überspringen'}</button>
        <button class="btn" id="ob-next">${last ? 'Los geht\'s' : 'Weiter'}</button>
      </div></div>`;
    $('#ob-back', host).onclick = () => { if (!step) return finish(); commitGoals(); step--; draw(); };
    $('#ob-next', host).onclick = () => { commitGoals(); if (last) finish(); else { step++; draw(); } };
    const ph = $('#ob-photo', host);
    if (ph) ph.onclick = async () => {
      const f = await pickFile();
      if (!f) return;
      store.updateProfile({ photo: await downscalePhoto(f, { size: 360 }) });
      draw(); toast('Foto gesetzt');
    };
  };
  draw();
}

// Einmalig nach dem Persona-Update: was ist neu
export function openWhatsNew(onDone) {
  let step = 0;
  const p = store.getState().profile;
  const host = document.createElement('div');
  host.className = 'ob';
  document.body.appendChild(host);
  const slides = [
    { ic: 'user', t: `Gebaut für ${esc(p.name || 'dich')}`, x: 'Deine Zeiten, dein Training, dein Essen: Kalorien je Tagestyp (Basketball-Tag mehr, Ruhetag weniger), Essfenster ab Mittag, Lidl-, Imbiss- und Bowl-Ideen.' },
    { ic: 'mic', t: 'Erzähl einfach', x: 'Unten ins Feld oder im Coach: „Mittags Bowl, 90 Min Basketball, 7 h geschlafen, Knie 3" – alles landet an der richtigen Stelle.' },
    { ic: 'clock', t: 'Dein Tag', x: 'Ein Fahrplan, wann du was isst – rund um Training und Spiele. Tipp auf eine Mahlzeit: „Was soll ich essen?"' },
    { ic: 'trophy', t: 'Level & Missionen', x: 'Jeden Tag 3 Missionen, jede Woche eine Challenge. Ich lerne, was dich wirklich antreibt – und stelle die Missionen darauf ein.' },
  ];
  const draw = () => {
    const s = slides[step], last = step === slides.length - 1;
    host.innerHTML = `<div class="ob-card">
      <div class="ob-body"><div class="new-ic">${icon(s.ic)}</div><div class="ob-title">${s.t}</div><p class="ob-text">${s.x}</p></div>
      <div class="ob-dots">${slides.map((_, i) => `<span class="ob-dot ${i === step ? 'on' : ''}"></span>`).join('')}</div>
      <div class="ob-nav"><button class="btn ghost" id="wn-skip">${step ? 'Zurück' : 'Überspringen'}</button><button class="btn volt" id="wn-next">${last ? "Los geht's" : 'Weiter'}</button></div></div>`;
    $('#wn-skip', host).onclick = () => { if (!step) return done(); step--; draw(); };
    $('#wn-next', host).onclick = () => { if (last) done(); else { step++; draw(); } };
  };
  const done = () => { store.getState()._seenV4 = true; store.save(); host.remove(); if (onDone) onDone(); };
  draw();
}
