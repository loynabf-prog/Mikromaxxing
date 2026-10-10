// ============================================================================
// Diktieren: hört zu, bis Fassie auf „Fertig" tippt. Kurze Pausen beenden nichts –
// wenn der Browser die Erkennung nach Stille selbst stoppt, wird sie still neu
// gestartet und der bisherige Text bleibt erhalten.
// ============================================================================
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const hasVoice = () => !!SR;

const MAX_MS = 3 * 60 * 1000;   // Sicherheitsgrenze, falls „Fertig" vergessen wird

// onText(text) bei jedem Zwischenstand, onState(true|false), onDone(text) nach „Fertig",
// onError(msg) bei fehlender Berechtigung o. Ä.
export function createDictation({ onText, onState, onDone, onError }) {
  let rec = null;
  let active = false;      // wir wollen zuhören
  let finishing = false;   // „Fertig" gedrückt, warte auf letztes Ergebnis
  let base = '', committed = '', session = '';
  let startedAt = 0, doneTimer = null;

  const full = () => (base + committed + session).replace(/\s+/g, ' ').trimStart();

  function finalize(send) {
    clearTimeout(doneTimer);
    const wasActive = active || finishing;
    active = false; finishing = false;
    if (rec) { const r = rec; rec = null; try { r.onend = null; r.abort(); } catch (e) { /* schon zu */ } }
    if (wasActive) onState && onState(false);
    if (send && onDone) onDone(full().trim());
  }

  function spawn() {
    const r = new SR();
    r.lang = 'de-DE'; r.interimResults = true; r.continuous = true; r.maxAlternatives = 1;
    session = '';
    r.onresult = (e) => {
      let s = '';
      for (const res of e.results) s += res[0].transcript;
      session = s;
      onText && onText(full());
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
        finalize(false);
        onError && onError('Mikrofon hier nicht erlaubt – nutze das Mikro auf der Tastatur');
      }
      // no-speech / aborted / network: onend entscheidet über Neustart
    };
    r.onend = () => {
      if (rec !== r) return;
      if (session) committed += session.trim() + ' ';
      session = '';
      if (finishing) return finalize(true);
      if (!active) return;
      if (Date.now() - startedAt > MAX_MS) return finalize(false);
      // Browser hat nach einer Pause selbst gestoppt → weiter zuhören
      setTimeout(() => {
        if (!active || rec !== r) return;
        try { rec = spawn(); rec.start(); } catch (err) { finalize(false); }
      }, 120);
    };
    return r;
  }

  return {
    get on() { return active || finishing; },
    start(existing = '') {
      if (!SR) return false;
      if (active) return true;
      base = existing.trim() ? existing.trim() + ' ' : '';
      committed = ''; session = '';
      startedAt = Date.now();
      try {
        rec = spawn();
        rec.start();
        active = true;
        onState && onState(true);
        return true;
      } catch (e) {
        rec = null; active = false;
        return false;
      }
    },
    // Fertig: letztes Ergebnis abwarten, dann onDone
    finish() {
      if (!active) return;
      active = false; finishing = true;
      try { rec && rec.stop(); } catch (e) { return finalize(true); }
      doneTimer = setTimeout(() => finalize(true), 1200);
    },
    cancel() { finalize(false); },
  };
}
