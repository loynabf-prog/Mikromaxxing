// ============================================================================
// Barcode scannen → Produkt (Open Food Facts) → Vorschau → eintragen
// iPhone-Safari kennt keinen BarcodeDetector, daher ZXing als Fallback
// (wird erst beim ersten Scan geladen).
// ============================================================================
import * as store from '../store.js';
import { NUTRIENTS } from '../data.js';
import { fetchProduct, completeProduct, estimateFoods, hasAI, LookupError } from '../lookup.js';
import { icon } from '../icons.js';
import { $, $$, esc, de, short, openSheet, closeSheet, sheetHead, toast, haptic, beep, unlockAudio, foodIcon } from '../ui.js';
import { openFoodEditor } from './food.js';
import { openAiSetup } from './aisetup.js';

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

// EAN/UPC-Prüfziffer – verhindert Fehl-Lesungen
export function validEan(code) {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const d = code.split('').map(Number);
  const check = d.pop();
  const sum = d.reverse().reduce((a, x, i) => a + x * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

let zxingPromise = null;
function loadZXing() {
  if (window.ZXing) return Promise.resolve(window.ZXing);
  if (!zxingPromise) {
    zxingPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = './vendor/zxing.min.js';
      s.onload = () => (window.ZXing ? resolve(window.ZXing) : reject(new Error('ZXing fehlt')));
      s.onerror = () => { zxingPromise = null; reject(new Error('Scanner konnte nicht geladen werden')); };
      document.head.appendChild(s);
    });
  }
  return zxingPromise;
}

async function nativeDetector() {
  try {
    if (!('BarcodeDetector' in window)) return null;
    const supported = await window.BarcodeDetector.getSupportedFormats();
    const formats = FORMATS.filter(f => supported.includes(f));
    return formats.length ? new window.BarcodeDetector({ formats }) : null;
  } catch (e) { return null; }
}

// Bild (Canvas) mit ZXing dekodieren – auch für Tests nutzbar
export async function decodeCanvas(canvas) {
  const ZX = await loadZXing();
  if (!decodeCanvas.reader) {
    const hints = new Map();
    hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS, [ZX.BarcodeFormat.EAN_13, ZX.BarcodeFormat.EAN_8, ZX.BarcodeFormat.UPC_A, ZX.BarcodeFormat.UPC_E]);
    hints.set(ZX.DecodeHintType.TRY_HARDER, true);
    decodeCanvas.reader = new ZX.MultiFormatReader();
    decodeCanvas.reader.setHints(hints);
  }
  try {
    const src = new ZX.HTMLCanvasElementLuminanceSource(canvas);
    const res = decodeCanvas.reader.decodeWithState(new ZX.BinaryBitmap(new ZX.HybridBinarizer(src)));
    return res ? res.getText() : null;
  } catch (e) {
    return null; // nichts gefunden
  } finally {
    decodeCanvas.reader.reset();
  }
}

// --- Kamera-Overlay -----------------------------------------------------------
export function openScanner({ onCode }) {
  let stream = null, stopped = false, timer = null, lastCode = null;
  const el = document.createElement('div');
  el.className = 'scan';
  el.innerHTML = `
    <video playsinline muted autoplay></video>
    <div class="scan-ui">
      <div class="scan-top">
        <button class="wo-btn" id="sc-x" aria-label="Schließen">${icon('x')}</button>
        <b>Barcode scannen</b><span style="width:38px"></span>
      </div>
      <div class="scan-frame"><i></i></div>
      <div class="scan-msg" id="sc-msg">Kamera wird gestartet …</div>
      <form class="scan-manual" id="sc-form">
        <input id="sc-in" inputmode="numeric" autocomplete="off" placeholder="oder Nummer eintippen">
        <button class="btn sm" type="submit">${icon('check')}</button>
      </form>
    </div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  const video = $('video', el);
  const msg = (t) => { const m = $('#sc-msg', el); if (m) m.textContent = t; };

  const close = () => {
    stopped = true;
    clearTimeout(timer);
    if (stream) stream.getTracks().forEach(t => t.stop());
    el.remove();
    if (!document.querySelector('.sheet-overlay')) document.body.style.overflow = '';
  };
  const found = (code) => {
    if (stopped) return;
    haptic(30); beep(1, 1320);
    close();
    onCode(code);
  };
  $('#sc-x', el).onclick = close;
  $('#sc-form', el).onsubmit = (e) => {
    e.preventDefault();
    const code = $('#sc-in', el).value.replace(/\D/g, '');
    if (code.length < 8) return toast('Bitte die Zahlen unter dem Barcode eingeben');
    found(code);
  };
  unlockAudio();

  (async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      msg('Kamera nicht verfügbar – Nummer unten eintippen'); return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
    } catch (e) {
      msg(e && e.name === 'NotAllowedError'
        ? 'Kein Kamera-Zugriff. iPhone: Einstellungen → Safari → Kamera → Erlauben. Oder Nummer eintippen.'
        : 'Kamera konnte nicht gestartet werden – Nummer unten eintippen');
      return;
    }
    if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
    video.srcObject = stream;
    try { await video.play(); } catch (e) { /* autoplay */ }
    msg('Barcode in den Rahmen halten');

    const detector = await nativeDetector();
    if (!detector) {
      try { await loadZXing(); } catch (e) { msg('Scanner konnte nicht geladen werden – Nummer eintippen'); return; }
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const accept = (code) => {
      if (!code || !validEan(code)) return false;
      if (detector || code === lastCode) { found(code); return true; }
      lastCode = code; // ZXing: zweimal gleich lesen, dann gilt's
      return false;
    };
    const loop = async () => {
      if (stopped) return;
      if (video.readyState >= 2 && video.videoWidth) {
        try {
          if (detector) {
            const codes = await detector.detect(video);
            if (codes.length && accept(codes[0].rawValue)) return;
          } else {
            // Mittleren Streifen ausschneiden (schneller & genauer)
            const vw = video.videoWidth, vh = video.videoHeight;
            const cw = Math.round(vw * 0.86), ch = Math.round(vh * 0.42);
            const scale = Math.min(1, 900 / cw);
            canvas.width = Math.round(cw * scale); canvas.height = Math.round(ch * scale);
            ctx.drawImage(video, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, canvas.width, canvas.height);
            if (accept(await decodeCanvas(canvas))) return;
          }
        } catch (e) { /* nächster Versuch */ }
      }
      timer = setTimeout(loop, detector ? 120 : 60);
    };
    loop();
  })();
  return { close };
}

// --- Scannen → Produkt → Vorschau ---------------------------------------------
// onAdd({ foodId, grams }) bekommt das fertig angelegte Lebensmittel
export function scanAndAdd({ onAdd, title = 'Hinzufügen' }) {
  openScanner({ onCode: (code) => handleCode(code, { onAdd, title }) });
}

export async function handleCode(code, { onAdd, title = 'Hinzufügen' }) {
  const saved = store.foodByBarcode(code);
  if (saved) return openProductSheet({ food: saved, saved: true, onAdd, title });

  const sheet = openSheet(`${sheetHead('Produkt suchen', `Barcode ${esc(code)}`)}
    <div class="lookup-wait">${icon('loader', 'spin')}<span>Frage Open Food Facts …</span></div>`);
  let res;
  try {
    res = await fetchProduct(code);
  } catch (e) {
    if (!sheet.isConnected) return;
    closeSheet();
    return notFoundSheet(code, { onAdd, title, reason: e instanceof LookupError ? e.message : 'Fehler beim Laden' });
  }
  if (!sheet.isConnected) return;
  closeSheet();
  if (!res) return notFoundSheet(code, { onAdd, title });
  openProductSheet({ food: res.food, known: res.known, hasMacros: res.hasMacros, onAdd, title });
}

function notFoundSheet(code, { onAdd, title, reason }) {
  const sheet = openSheet(`${sheetHead('Nicht gefunden', reason ? esc(reason) : `Barcode ${esc(code)} ist nicht bei Open Food Facts`)}
    <p class="hint">${hasAI() ? 'Sag mir, was es ist – Claude schätzt die Werte, und beim nächsten Scan kenne ich das Produkt.' : 'Leg das Produkt einmal an – beim nächsten Scan kenne ich es.'}</p>
    <label class="field"><span>Was ist es?</span><input id="nf-name" placeholder="z. B. Proteinriegel Cookie Dough (Marke)"></label>
    <div class="sheet-foot">
      <button class="btn ghost" id="nf-manual">${icon('edit')}Manuell</button>
      ${hasAI() ? `<button class="btn" id="nf-ai">${icon('spark')}Schätzen</button>` : ''}
    </div>`);
  const nameOf = () => $('#nf-name', sheet).value.trim();
  $('#nf-manual', sheet).onclick = () => {
    closeSheet();
    openFoodEditor(null, { name: nameOf(), draft: { barcode: code }, onSave: (f) => openProductSheet({ food: f, saved: true, onAdd, title }) });
  };
  const ai = $('#nf-ai', sheet);
  if (ai) ai.onclick = async () => {
    const nm = nameOf();
    if (!nm) return toast('Kurz den Namen eingeben');
    ai.disabled = true; ai.innerHTML = `${icon('loader', 'spin')}Schätze …`;
    try {
      const r = (await estimateFoods([nm])).get(nm);
      if (!r || r.notFood) throw new LookupError('Das klingt nicht nach einem Lebensmittel', 'nf');
      closeSheet();
      openProductSheet({ food: { ...r.food, barcode: code }, ai: true, onAdd, title });
    } catch (e) {
      ai.disabled = false; ai.innerHTML = `${icon('spark')}Schätzen`;
      toast(e.message || 'Hat nicht geklappt');
    }
  };
  setTimeout(() => $('#nf-name', sheet).focus(), 80);
}

// Vorschau: Werte pro 100 g, Mikro-Status, Menge wählen
export function openProductSheet({ food, known = null, hasMacros = true, saved = false, ai = false, onAdd, title = 'Hinzufügen' }) {
  let f = structuredClone(food);
  const microKeys = NUTRIENTS.filter(n => !['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'satfat', 'sodium'].includes(n.key)).map(n => n.key);
  const knownMicros = known ? microKeys.filter(k => known.has(k)).length : null;
  const needMicros = !saved && !ai && known && knownMicros < 6;
  let microState = saved || ai ? 'ok' : needMicros ? (hasAI() ? 'loading' : 'missing') : 'ok';
  let g = store.servingGrams(f);
  const t = store.getState().profile.targets;

  const sheet = openSheet(`<div class="sheet-head"><div style="display:flex;gap:12px;align-items:center;min-width:0">
      ${f.image ? `<img class="prod-img" src="${esc(f.image)}" alt="">` : foodIcon(f)}
      <div style="min-width:0"><div class="sheet-title" style="font-size:19px">${esc(short(f.name))}</div><div class="sheet-sub">${esc([f.brand, f.quantity].filter(Boolean).join(' · ') || f.cat || '')}</div></div></div>
      <button class="sheet-x" data-close aria-label="Schließen">${icon('x')}</button></div>
    <div class="sheet-body">
      <div class="prod-src" id="ps-src"></div>
      <div class="stepper"><button class="st-btn" data-d="-1">${icon('minus')}</button><div class="st-val num" id="ps-v"></div><button class="st-btn" data-d="1">${icon('plus')}</button></div>
      <div class="chips" id="ps-chips" style="margin-top:10px"></div>
      <div class="grid3" id="ps-nut" style="margin-top:14px"></div>
      <div id="ps-micro"></div>
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" id="ps-edit" style="flex:0 0 auto;width:56px" aria-label="Werte bearbeiten">${icon('edit')}</button>
      <button class="btn" id="ps-ok">${icon('check')}${esc(title)}</button>
    </div>`, { tall: true });

  const step = () => (f.piece ? f.piece.g : g < 60 ? 5 : g < 200 ? 10 : 25);
  const draw = () => {
    const x = g / 100;
    $('#ps-v', sheet).innerHTML = f.piece ? `${de(g / f.piece.g, (g / f.piece.g) % 1 ? 1 : 0)}<small>${esc(f.piece.name.toUpperCase())} · ${g} G</small>` : `${g}<small>GRAMM</small>`;
    const chips = [];
    if (f.piece) [1, 2, 3].forEach(n => chips.push([n * f.piece.g, `${n} ${n === 1 ? f.piece.name : 'Stück'}`]));
    for (const sv of f.servings || []) chips.push([sv.grams, sv.label]);
    const pack = parseFloat(String(f.quantity || '').replace(',', '.'));
    if (pack > 0 && /g|ml/i.test(f.quantity) && !/kg|l\b/i.test(f.quantity)) chips.push([Math.round(pack), `Packung (${Math.round(pack)} g)`]);
    [100, 200].forEach(v => chips.push([v, `${v} g`]));
    const seen = new Set();
    $('#ps-chips', sheet).innerHTML = chips.filter(([v]) => !seen.has(v) && seen.add(v)).map(([v, l]) => `<button class="chipbtn ${v === g ? 'on' : ''}" data-g="${v}">${esc(l)}</button>`).join('');
    $('#ps-nut', sheet).innerHTML = [['kcal', 'kcal', ''], ['protein', 'Protein', ' g'], ['carbs', 'Carbs', ' g'], ['fat', 'Fett', ' g'], ['fiber', 'Ballastst.', ' g'], ['sugar', 'Zucker', ' g']]
      .map(([k, l, u]) => `<div class="wk-tile"><div class="v num" style="font-size:18px">${de((f.per100[k] || 0) * x, k === 'kcal' ? 0 : 1)}${u}</div><div class="l">${l}</div></div>`).join('');
    const src = f.source === 'off' ? `${icon('barcode')}Packungswerte · Open Food Facts` : f.source === 'ai' ? `${icon('spark')}Von Claude geschätzt – bei Bedarf anpassen` : `${icon('book')}Aus deiner Bibliothek`;
    $('#ps-src', sheet).innerHTML = `<span>${src}</span>${!hasMacros ? '<b>Makros unvollständig – bitte prüfen</b>' : ''}`;
    // Top-Mikros dieser Menge
    const top = microKeys.map(k => ({ k, pct: t[k] ? (f.per100[k] || 0) * x / t[k] * 100 : 0 }))
      .filter(m => m.pct >= 5).sort((a, b) => b.pct - a.pct).slice(0, 4);
    let micro = '';
    if (microState === 'loading') micro = `<div class="lookup-wait sm">${icon('loader', 'spin')}<span>Claude ergänzt Vitamine & Mineralstoffe …</span></div>`;
    else if (microState === 'missing') micro = `<button class="prod-hint" id="ps-ai">${icon('key')}<span>Auf der Packung stehen kaum Vitamine. Mit Claude-Key ergänze ich sie automatisch.</span></button>`;
    else if (top.length) micro = `<div class="part-head"><b>Vitamine & Mineralien</b>${f.microsBy === 'ai' ? '<span class="sub">ergänzt von Claude</span>' : ''}</div>
      <div class="chips">${top.map(m => `<span class="chip">${esc(NUTRIENTS.find(n => n.key === m.k).label)} ${Math.round(m.pct)} %</span>`).join('')}</div>`;
    if (f.benefit) micro += `<p class="hint" style="margin-top:10px">${esc(f.benefit)}</p>`;
    $('#ps-micro', sheet).innerHTML = micro;
    $$('[data-g]', sheet).forEach(b => b.onclick = () => { g = Number(b.dataset.g); draw(); });
    const aiBtn = $('#ps-ai', sheet);
    if (aiBtn) aiBtn.onclick = () => openAiSetup(() => { if (hasAI()) { microState = 'loading'; draw(); fillMicros(); } });
  };
  $$('[data-d]', sheet).forEach(b => b.onclick = () => { g = Math.max(step(), g + Number(b.dataset.d) * step()); haptic(4); draw(); });

  const fillMicros = async () => {
    try {
      f = await completeProduct(f, known || new Set());
    } catch (e) {
      toast(`Vitamine nicht ergänzt: ${e.message}`);
    }
    microState = 'ok';
    if (sheet.isConnected) draw();
  };
  if (microState === 'loading') fillMicros();

  $('#ps-edit', sheet).onclick = () => {
    openFoodEditor(saved ? f.id : null, {
      draft: saved ? null : f,
      onSave: (nf) => { f = nf; saved = true; draw(); },
    });
  };
  $('#ps-ok', sheet).onclick = () => {
    if (microState === 'loading') return toast('Einen Moment – Vitamine werden noch ergänzt');
    const food = saved ? store.foodById(f.id) || store.saveNewFood(f) : store.saveNewFood(f);
    closeSheet(); haptic(12);
    onAdd({ foodId: food.id, grams: g, food });
  };
  draw();
}
