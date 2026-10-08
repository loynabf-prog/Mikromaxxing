// ============================================================================
// Claude-Key einrichten (für das automatische Nachschlagen von Nährwerten)
// ============================================================================
import { getApiKey, setApiKey, testConnection, aiUsage, aiCostUSD } from '../lookup.js';
import { icon } from '../icons.js';
import { $, esc, de, openSheet, closeSheet, sheetHead, toast } from '../ui.js';

export function openAiSetup(onDone) {
  const cur = getApiKey();
  const u = aiUsage();
  const sheet = openSheet(`${sheetHead('Nachschlagen mit Claude', 'Unbekannte Lebensmittel automatisch anlegen')}
    <div class="sheet-body">
      <p class="hint">Sagst oder tippst du etwas, das die App noch nicht kennt („Döner", „Linsen-Dal vom Inder"), schätzt Claude Haiku 5.5 alle Nährwerte inklusive Vitamine und Mineralstoffe. Du siehst die Werte vorher und bestätigst sie. Danach kennt die App das Lebensmittel – es kostet also nur einmal.</p>
      <ol class="steps-list">
        <li>Auf <b>console.anthropic.com</b> anmelden und unter <b>Billing</b> ein kleines Guthaben aufladen (5 $ reichen ewig – ca. 0,1 Cent pro neuem Lebensmittel).</li>
        <li>Unter <b>Settings → API Keys</b> einen Key erstellen und hier einfügen.</li>
      </ol>
      <label class="field"><span>API-Key</span><input id="ai-key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-…" value="${esc(cur)}"></label>
      <p class="hint" style="margin-top:0">Der Key bleibt nur auf diesem iPhone und landet nicht im Backup.${u.calls ? ` Bisher ${u.calls} Abfragen · ca. ${de(aiCostUSD() * 100, 2)} Cent.` : ''}</p>
      <div id="ai-status"></div>
    </div>
    <div class="sheet-foot">
      ${cur ? `<button class="btn danger" id="ai-del" style="flex:0 0 auto;width:56px" aria-label="Key entfernen">${icon('trash')}</button>` : ''}
      <button class="btn" id="ai-save">${icon('check')}Speichern & testen</button>
    </div>`, { tall: true });
  const status = (html) => { $('#ai-status', sheet).innerHTML = html; };
  $('#ai-save', sheet).onclick = async () => {
    const key = $('#ai-key', sheet).value.trim();
    if (!key) return toast('Bitte den Key einfügen');
    if (!/^sk-ant-/.test(key)) return toast('Der Key beginnt mit „sk-ant-"');
    setApiKey(key);
    const btn = $('#ai-save', sheet);
    btn.disabled = true; btn.innerHTML = `${icon('loader', 'spin')}Teste …`;
    try {
      const r = await testConnection();
      if (!r || !r.food) throw new Error('Unerwartete Antwort');
      status(`<div class="prod-src ok"><span>${icon('check')}Verbunden – Test: ${esc(r.food.name)} · ${de(r.food.per100.kcal)} kcal / 100 g</span></div>`);
      toast('Claude ist eingerichtet');
      setTimeout(() => { if (sheet.isConnected) closeSheet(); if (onDone) onDone(); }, 900);
    } catch (e) {
      btn.disabled = false; btn.innerHTML = `${icon('check')}Speichern & testen`;
      status(`<div class="prod-src bad"><span>${icon('alert')}${esc(e.message || 'Test fehlgeschlagen')}</span></div>`);
    }
  };
  const del = $('#ai-del', sheet);
  if (del) del.onclick = () => { setApiKey(''); closeSheet(); toast('Key entfernt'); if (onDone) onDone(); };
}
