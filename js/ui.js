// ============================================================================
// Mikromaxxing – gemeinsame UI-Helfer
// ============================================================================
import { icon } from './icons.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Zahlen deutsch formatiert (1.980 · 2,5)
export function de(n, digits = 0) {
  if (n == null || isNaN(n)) return '–';
  return Number(n).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function short(name) { return String(name || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s*\/.*$/, '').trim(); }

// Router-Brücke: app.js setzt go/rerender, die Views rufen sie auf
export const router = { tab: 'today', go: () => {}, rerender: () => {} };

export function haptic(ms = 8) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* iOS: nicht verfügbar */ } }

// --- Bottom-Sheets -----------------------------------------------------------
let sheetStack = [];
export function openSheet(html, { tall = false, onClose } = {}) {
  const root = $('#modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `<div class="sheet ${tall ? 'tall' : ''}"><div class="sheet-handle"></div>${html}</div>`;
  root.appendChild(overlay);
  const sheet = overlay.firstElementChild;
  const close = () => closeSheet(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  $$('[data-close]', sheet).forEach(b => b.addEventListener('click', close));
  sheetStack.push({ overlay, onClose });
  document.body.style.overflow = 'hidden';
  document.body.classList.add('sheet-open');
  return sheet;
}
export function closeSheet(overlay) {
  const idx = overlay ? sheetStack.findIndex(s => s.overlay === overlay) : sheetStack.length - 1;
  if (idx < 0) return;
  const [entry] = sheetStack.splice(idx, 1);
  entry.overlay.remove();
  if (!sheetStack.length) { document.body.style.overflow = ''; document.body.classList.remove('sheet-open'); }
  if (entry.onClose) entry.onClose();
}
export function closeAllSheets() { while (sheetStack.length) closeSheet(); }

export function sheetHead(title, sub = '') {
  return `<div class="sheet-head"><div><div class="sheet-title">${title}</div>${sub ? `<div class="sheet-sub">${sub}</div>` : ''}</div>
    <button class="sheet-x" data-close aria-label="Schließen">${icon('x')}</button></div>`;
}

// --- Toast -------------------------------------------------------------------
let toastTimer = null;
export function toast(msg, actionLabel, actionCb) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${actionLabel ? `<button class="ta">${esc(actionLabel)}</button>` : ''}`;
  el.classList.add('show');
  if (actionLabel) {
    el.querySelector('.ta').onclick = () => { el.classList.remove('show'); actionCb && actionCb(); };
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), actionLabel ? 4200 : 2400);
}

// --- Konfetti (bei 100 %) ----------------------------------------------------
export function confetti() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.id = 'confetti';
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const colors = ['#30C46F', '#1E9E57', '#FFD60A', '#F2B705', '#8E8E93', '#D1D1D6'];
  const parts = Array.from({ length: 110 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .35,
    vx: (Math.random() - .5) * 11, vy: -Math.random() * 12 - 4,
    s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += .32; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= .99;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    }
    if (t - t0 < 2200) requestAnimationFrame(frame); else c.remove();
  })(t0);
}

// --- Zwei Ringe: Essen außen (Akzent), Sport innen (Tinte) – fein, ohne Glow ---
let ringSeq = 0;
export function ringsSVG({ nutrition = 0, sport = 0 }, { photo = null } = {}) {
  const id = 'r' + (++ringSeq);
  const SW = 16;
  const R = [{ r: 86, v: nutrition, c: 'var(--nut)' }, { r: 62, v: sport, c: 'var(--spo)' }];
  const arcs = R.map((x) => {
    const c = 2 * Math.PI * x.r;
    const off = c * (1 - Math.min(100, Math.max(0, x.v)) / 100);
    return `<circle cx="100" cy="100" r="${x.r}" fill="none" stroke="var(--track)" stroke-width="${SW}"/>
      ${x.v > 0 ? `<circle class="ring-arc" cx="100" cy="100" r="${x.r}" fill="none" stroke="${x.c}" stroke-width="${SW}" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 100 100)"/>` : ''}`;
  }).join('');
  const center = photo
    ? `<defs><clipPath id="${id}c"><circle cx="100" cy="100" r="44"/></clipPath></defs><image href="${photo}" x="56" y="56" width="88" height="88" clip-path="url(#${id}c)" preserveAspectRatio="xMidYMid slice"/>`
    : '';
  return `<svg viewBox="0 0 200 200" aria-hidden="true">${arcs}${center}</svg>`;
}

// Mini-Ringe für den Kalender
export function miniRings({ nutrition = 0, sport = 0 }) {
  const R = [[16, nutrition, 'var(--nut)'], [10, sport, 'var(--spo)']];
  return `<svg viewBox="0 0 40 40">${R.map(([r, v, col]) => {
    const c = 2 * Math.PI * r;
    return `<circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--track)" stroke-width="4"/>` +
      (v > 0 ? `<circle cx="20" cy="20" r="${r}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - Math.min(100, v) / 100)).toFixed(2)}" transform="rotate(-90 20 20)"/>` : '');
  }).join('')}</svg>`;
}

// --- Lebensmittel-Kachel (Initialen + Kategorie-Farbe) ----------------------
const CAT_CLASS = {
  'Protein': 'c-protein', 'Fisch': 'c-fisch', 'Milchprodukte': 'c-milch', 'Obst': 'c-obst', 'Gemüse': 'c-gemuse',
  'Getreide': 'c-getreide', 'Nüsse & Samen': 'c-nuss', 'Hülsenfrüchte': 'c-huelse', 'Snacks': 'c-snack',
  'Gerichte': 'c-meal', 'Getränke': 'c-water',
};
export function foodIcon(food) {
  const cls = (food && CAT_CLASS[food.cat]) || 'c-zero';
  const n = short(food ? food.name : '?');
  const ini = n.slice(0, 2);
  return `<span class="fico ${cls}">${esc(ini.charAt(0).toUpperCase() + ini.slice(1))}</span>`;
}

// --- Foto verkleinern (für localStorage) ------------------------------------
export function downscalePhoto(file, { size = 360, square = true, maxW = 480, maxH = 640, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Keine Datei'));
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (square) {
          canvas.width = canvas.height = size;
          const sc = Math.max(size / img.width, size / img.height);
          ctx.drawImage(img, (size - img.width * sc) / 2, (size - img.height * sc) / 2, img.width * sc, img.height * sc);
        } else {
          const sc = Math.min(maxW / img.width, maxH / img.height, 1);
          canvas.width = Math.round(img.width * sc); canvas.height = Math.round(img.height * sc);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        try { resolve(canvas.toDataURL('image/jpeg', quality)); } catch (e) { resolve(reader.result); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function pickFile(accept = 'image/*') {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept;
    input.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.appendChild(input);
    input.onchange = () => { resolve(input.files[0] || null); input.remove(); };
    input.click();
  });
}

// Uhrzeit-Begrüßung
export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? 'Gute Nacht' : h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';
}
export function longDate(d = new Date()) {
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
}

// --- Signalton (Pausen-/Reha-Timer). AudioContext erst bei Nutzer-Geste ----
let audioCtx = null;
export function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { audioCtx = null; }
}
export function beep(times = 1, freq = 880) {
  if (!audioCtx) return;
  for (let i = 0; i < times; i++) {
    const t = audioCtx.currentTime + i * 0.22;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(audioCtx.destination);
    o.start(t); o.stop(t + 0.2);
  }
  haptic([60, 40, 60]);
}
export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
export function fmtHours(h) {
  if (h == null) return '–';
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${hh}:${String(mm).padStart(2, '0')}`;
}
