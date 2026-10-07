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
      `<div class="ob-art">${ringsSVG({ nutrition: 85, sport: 100, regen: 62 }, { photo: p.photo })}</div>
       <div class="ob-title">Drei Ringe.<br>Jeden Tag.</div>
       <p class="ob-text">Ernährung, Sport und Regeneration. Mach alle drei voll – dann hast du dir den Schlaf verdient.</p>`,
      `<div class="ob-art">${ringsSVG({ nutrition: 0, sport: 0, regen: 0 }, { photo: p.photo })}</div>
       <div class="ob-title">Dein Gesicht<br>in der Mitte</div>
       <p class="ob-text">Ein Foto von dir im Ring macht's persönlich. Kannst du jederzeit ändern.</p>
       <button class="btn ghost" id="ob-photo">${icon('camera')}${p.photo ? 'Foto ändern' : 'Foto wählen'}</button>`,
      `<div class="ob-title">Deine Ziele</div>
       <p class="ob-text">Schon sinnvoll vorbelegt – passe sie an, wenn du willst.</p>
       <div style="max-width:320px;margin:0 auto;text-align:left">
         <label class="field"><span>Zielgewicht (kg)</span><input type="number" inputmode="decimal" id="ob-tw" value="${p.targetWeight ?? ''}"></label>
         <label class="field"><span>Ziel-Körperfett (%)</span><input type="number" inputmode="decimal" id="ob-tbf" value="${p.targetBodyfat ?? ''}"></label>
         <label class="field"><span>Schlafziel (Stunden)</span><input type="number" inputmode="decimal" id="ob-sl" value="${p.sleepTarget ?? 8}"></label>
       </div>`,
      `<div class="ob-title">Einfach sagen,<br>was war</div>
       <p class="ob-text">Unten auf jeder Seite: schreib oder sprich es einfach hin.</p>
       <div class="ob-list">
         <div><span class="fico c-protein">Ei</span><span><b>„3 Eier und 200 g Skyr"</b><br>wird erkannt und gezählt</span></div>
         <div><span class="fico c-meal">${icon('bowl')}</span><span><b>„Poke Bowl"</b><br>deine gespeicherten Gerichte</span></div>
         <div><span class="fico c-supp">${icon('pill')}</span><span><b>„D3 und Kreatin genommen"</b><br>hakt Supplements ab</span></div>
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
  const finish = () => { commitGoals(); store.setOnboarded(true); host.remove(); router.go('today'); };

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
