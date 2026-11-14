# Geldblick

Persönliche Finanz- und Spar-App für den Alltag: Einnahmen, Fixkosten, Ausgaben, Budgets mit Warnungen, Sparbereiche und Monatsauswertung.

**App öffnen:** https://alexanderjoergl8-cloud.github.io/geldblick/

## Am Android-Handy installieren

1. Die Adresse oben in Chrome öffnen.
2. Oben rechts die drei Punkte antippen, dann „App installieren“ oder „Zum Startbildschirm hinzufügen“.
3. Die App über das neue Symbol starten. Sie läuft danach auch ohne Internet.

## Deine Daten

- Alle Daten bleiben auf deinem Gerät. Es gibt keine Anmeldung, keinen Server und keine Bankverbindung.
- Jede Person hat ihre eigenen Daten. Niemand sonst kann sie sehen, auch nicht, wer die App bereitstellt.
- Regelmäßig unter **Mehr → Einstellungen → Sicherung speichern** eine Sicherungsdatei anlegen. Geht das Handy verloren oder werden die Browserdaten gelöscht, hilft nur diese Datei.

## Aufbau dieses Repositorys

```text
index.html, sw.js, manifest.webmanifest, icon-*.png   die fertige App (wird von GitHub Pages ausgeliefert)
quellcode/src/        Programmcode: core.js (Rechenkern), ui.js, views.js, style.css
quellcode/test/       Testfälle
quellcode/build/      Bauskript, erzeugt aus src/ die fertige index.html
```

## Für Änderungen (Entwicklung)

```bash
cd quellcode
npm install        # lädt die eingebetteten Schriften
npm test           # 37 Testfälle für den Rechenkern
npm run release    # testet, baut und legt die fertigen Dateien in den Wurzelordner
```

Bei jeder neuen Version die Nummer `APP_VERSION` in `quellcode/src/ui.js` erhöhen. Sie steuert, wann installierte Apps das Update laden.
