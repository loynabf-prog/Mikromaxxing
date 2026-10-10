# Mikromaxxing – Roadmap

## Jetzt (fertig)
- Zwei Bereiche: **Essen** (Ernährung + Diät + Gewicht) und **Sport** (Training + Erholung: Schlaf, Knie, Reha).
- **Coach** als persönlicher Agent: versteht Text, Sprache und Fotos (Essen, Körperanalyse, Speisekarte),
  trägt alles selbst ein, gibt klare Empfehlungen mit Ein-Tipp-Vorschlägen, merkt sich Vorlieben.
- **Spielerisch:** Level, Ränge, XP, Serie (Streak), tägliche Missionen, Wochen-Challenge, Meilensteine.
- **Dashboard:** Gewicht, Körperfett, Serie, Level, Ziel-Prognose, Körperanalyse, Woche, Knie & Schlaf.
- Training lässt sich vorab abhaken (z. B. um 15 Uhr fürs Training um 19 Uhr) – die Kalorien des Trainings
  sind ohnehin schon im Tagesbudget eingerechnet.

## Später: Freunde & Challenges
Ziel: Fassie und Kollegen, die die App ebenfalls nutzen, sehen sich gegenseitig und spornen sich an.

### Funktionen
1. **Freunde verbinden** – per Einladungslink oder QR-Code, ohne öffentliches Profil.
2. **Serien sehen** – Streak, Level und ob der Tag heute schon „geschafft“ ist (nur Zusammenfassung, keine Mahlzeiten).
3. **Erinnerungen schicken** – „Stups“: kurze Push-Nachricht („Training heute nicht vergessen“).
4. **Challenges** – z. B. „5 Tage im Budget“, „3× Training diese Woche“, „7 Tage Serie“; Fortschritt beider Seiten live.
5. **Rangliste** (optional) – Wochen-XP unter Freunden.

### Was technisch dazukommt
- **Konto + Sync-Server** (z. B. Supabase oder Firebase): heute liegt alles nur lokal im Browser.
  Nur eine **öffentliche Tageszusammenfassung** wird geteilt: `{ datum, ringEssen, ringSport, geschafft, streak, level, xpWoche }`.
  Mahlzeiten, Gewicht, Körperwerte und Coach-Verlauf bleiben privat auf dem Gerät.
- **Web-Push** für Erinnerungen (iOS: ab 16.4 für zum Home-Bildschirm hinzugefügte Web-Apps).
- **Challenges** als eigene Objekte: `{ id, typ, ziel, start, ende, teilnehmer[] }`; der Fortschritt wird aus den
  geteilten Tageszusammenfassungen berechnet (gleiche Logik wie die Wochen-Challenge in `js/game.js`).

### Vorbereitet im Code
- XP, Level, Serie und Ringe werden bereits aus den Tagesdaten **berechnet** (`js/game.js`, `dayPillars` in `js/store.js`),
  d. h. die Zusammenfassung zum Teilen lässt sich ohne Umbau erzeugen.
- Alte Tage behalten ihre Wertung (`_v5Since`), damit Serien und XP stabil und vergleichbar bleiben.
