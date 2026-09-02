# Mikromaxxing 🥩💊💧

Persönlicher Nährstoff-Tracker für **Makros, Mikros, Vitamine, Supplemente und Wasser** –
mit Fokus auf unverarbeitete Lebensmittel. Läuft als installierbare Web-App (PWA)
direkt am Handy, komplett offline, kostenlos über GitHub Pages. Keine Anmeldung, kein Server.

## Features

- **⚡ Schnellzugriff (Smart-Mix)** – deine Standard-Sachen mit einem Tap loggen. Sortiert automatisch nach Uhrzeit (was isst du sonst um diese Zeit?), zuletzt gegessen und Häufigkeit. Mit „Rückgängig".
- **🎯 100%-Coach** – schaut, was dir heute noch fehlt, und empfiehlt unverarbeitete Produkte, um deine Lücken zu schließen, **ohne dein Kalorienlimit zu sprengen**:
  - *Bester nächster Happen*: das Lebensmittel, das die meisten Lücken auf einmal füllt (z.B. „Lachs → +330% Omega-3, +83% Vit. D · 309 kcal")
  - *Was dir noch fehlt*: pro Nährstoff der beste Lieferant, sortiert nach größtem Defizit (z.B. „Vitamin C 0% → Paprika +116%, 31 kcal") – ein Tap fügt hinzu
- **Kalorien- & Makro-Ring** (Protein / Carbs / Fett) mit personalisierten Zielen
- **Komplettes Vitamin- & Mineralstoff-Panel** (A, C, D, E, K, alle B-Vitamine, Calcium, Eisen, Magnesium, Zink, Kalium, u.v.m.)
- **Wasser-Tracker** mit Schnell-Buttons
- **Supplement-Checkliste** (Creatin, D3, K2, Magnesium, Ashwagandha, Shilajit – anpassbar)
- **Stück-Erfassung** – Obst/Gemüse werden in Stück getrackt (1 Paprika, 2 Kiwi, 3 Eier …) mit − / + Stepper und sinnvollen Standardmengen. Der Coach rechnet zum Lückenfüllen auch auf 2–3 Stück hoch (gedeckelt). Gewogene Lebensmittel (Reis, Fleisch, Nüsse) bleiben in Gramm.
- **Eigene Lebensmittel-Bibliothek** – Startset enthält bewusst nur **Obst & Gemüse** (14 Sorten); alles andere (Protein, Fisch, Getreide, Milch, Nüsse, Öl …) legst du selbst mit vollem Nährstoffprofil + optionaler Stück-Größe an. Fertige Bowls/Mahlzeiten als eigenes Item (Flag „Mahlzeit" → zählt nicht als 100%-Empfehlung).
- **Trends** über 14 Tage (Kalorien, Protein, Wasser, Gewichtsverlauf)
- **Gewichts-Tracking** pro Tag
- **Kalorien-/Makro-Rechner** (Mifflin-St Jeor) auf Basis deiner Körperdaten
- **Backup**: Export/Import als JSON
- **Offline-fähig** & zum Homescreen hinzufügbar (fühlt sich wie eine native App an)

## Deine voreingestellten Ziele

Berechnet für: 26 J, m, 181 cm, 93 kg, 5× Training/Woche, Ziel *Recomp* (Fett ↓ / Muskel ↑).

| Wert | Ziel |
|------|------|
| Kalorien | 2400 kcal |
| Protein | 190 g |
| Kohlenhydrate | 230 g |
| Fett | 80 g |
| Ballaststoffe | 35 g |
| Wasser | 3,5 L |

Vitamine & Mineralstoffe nach DGE/DACH-Referenzwerten. **Alles im Tab „Profil" jederzeit editierbar.**

## Am Handy nutzen (GitHub Pages aktivieren)

1. Push in dieses Repo (ist schon passiert, wenn du das liest).
2. Auf GitHub: **Settings → Pages**.
3. Bei *Source* **„Deploy from a branch"** wählen.
4. Branch auf **`main`** (oder den aktuellen Branch) und Ordner **`/ (root)`** stellen, **Save**.
5. Nach ~1 Min ist die App erreichbar unter:
   `https://<dein-github-name>.github.io/Mikromaxxing/`
6. Diese URL am Handy im Browser öffnen → Menü → **„Zum Home-Bildschirm"**.

> Läuft der Code auf einem Feature-Branch statt `main`? Dann in den Pages-Einstellungen den
> entsprechenden Branch wählen, oder den Branch vorher in `main` mergen.

## Wichtig: Daten & Backup

Deine Eingaben werden **nur lokal im Browser deines Handys** gespeichert (localStorage).
Das ist privat und kostenlos, hat aber eine Kehrseite:

- Löschst du die Browser-Daten / deinstallierst die App → **Daten weg**.
- Daten synchronisieren **nicht** automatisch auf andere Geräte.

➡️ Mach daher regelmäßig ein **Backup** über *Profil → Export*. Über *Import* spielst du es
zurück (auch auf einem neuen Gerät).

## Technik

- Reines HTML/CSS/Vanilla-JS (ES-Module), **kein Build-Schritt** → GitHub-Pages-tauglich
- PWA mit Service Worker (Offline-Cache) und Web-Manifest
- Nährwerte pro 100 g, Quelle: USDA / DGE-nahe Richtwerte

## Projektstruktur

```
index.html              App-Grundgerüst + Bottom-Navigation
manifest.webmanifest    PWA-Manifest
sw.js                   Service Worker (Offline)
css/styles.css          Styles (mobile-first, dark)
js/data.js              Nährstoff-Katalog, Zielwerte, Start-Lebensmittel
js/store.js             State-Verwaltung (localStorage), Berechnungen, Backup
js/app.js               UI, Views, Charts
icons/                  App-Icons
```
