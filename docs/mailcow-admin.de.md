# Mailcow-Verwaltung

Die Mailcow-Verwaltung erlaubt Administratoren, Mailcow-Postfächer direkt aus edulution heraus zu verwalten.

## Wo zu finden

Einstellungen → App-Konfiguration → Mail → „Mailcow-Verwaltung". Das Panel ist nur für Administratoren sichtbar, da der gesamte App-Konfigurationsbereich admin-geschützt ist.

## Funktionen

- Zeigt die konfigurierten Mail-Domains und alle Postfächer (Adresse, Name, Domain, Speicher, Status).
- **Anlegen** eines Postfachs: Lokaler Teil, Domain, Anzeigename, Speicherkontingent (MB) und ein Initialpasswort. Der Client validiert die Eingaben gegen dieselben Regeln, die die API erzwingt (erlaubte Zeichen im lokalen Teil, Passwortlänge und -komplexität, übereinstimmende Bestätigung, Kontingent-Grenzen).
- **Bearbeiten** eines Postfachs: Anzeigename, Kontingent und Aktiv-Status; das Passwort wird nur geändert, wenn beide Passwortfelder ausgefüllt sind.
- **Löschen** eines Postfachs nach einer Bestätigung.
- **Berechtigungen (ACL)**: verwaltet die Benutzer-Berechtigungen des Postfachs. Mailcow liefert die aktuellen Berechtigungen nicht zurück, daher kann der Editor den Ist-Zustand nicht anzeigen: alle Optionen sind vorausgewählt, und Speichern **überschreibt** die tatsächlichen Berechtigungen des Postfachs mit den ausgewählten Optionen. Vor dem Speichern die Auswahl prüfen.

## Konfiguration

Die API spricht über zwei Umgebungsvariablen des API-Dienstes mit Mailcow:

- `MAILCOW_API_URL` — Basis-URL der Mailcow-Instanz.
- `MAILCOW_API_TOKEN` — Mailcow-API-Schlüssel (diesen Wert niemals committen).

## Hinweise

- Der Aktiv-Schalter ist zweiwertig; das Bearbeiten eines Postfachs im Mailcow-Status „nur eingehend" normalisiert es auf inaktiv.
- Ein Postfach mit unbegrenztem Kontingent (0) muss vor dem Bearbeiten hier ein endliches Kontingent erhalten.
- Postfach-Delegationen und geteilte Postfächer sind noch nicht Teil dieses Panels.
