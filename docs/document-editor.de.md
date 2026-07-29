# Dokumenteneditor wählen (OnlyOffice oder Collabora)

edulution kann Office-Dokumente wahlweise in OnlyOffice oder Collabora Online öffnen. Ein Administrator wählt den Editor pro Instanz.

## Wo konfigurieren

Einstellungen → App-Konfiguration → Dateien → „Dokumenteneditor". Der Abschnitt ist nur für Administratoren sichtbar.

## Funktionen

- **Dokumenteneditor**: legt fest, welcher Editor Office-Dokumente öffnet — OnlyOffice (Standard) oder Collabora Online. Die Auswahl greift für neu geöffnete Dokumente.
- **Collabora-URL**: die Basis-URL deiner Collabora-Online-Instanz (nur relevant, wenn Collabora gewählt ist).
- **Collabora-WOPI-Secret**: das gemeinsame Secret, mit dem die WOPI-Zugriffstoken signiert werden, die Collabora bei Rückrufen an edulution vorweist.

## Collabora-Container-Contract

Das Collabora-WOPI-Secret muss mit dem Secret im `edulution-collabora`-Container übereinstimmen (Ausrollung über den App-Store). Weichen die beiden ab, werden Collabora WOPI-Rückrufe abgelehnt und Dokumente lassen sich nicht öffnen. Das Secret wird Nicht-Admins nie ausgegeben.

## Hinweise

- Der Editor-Wechsel ändert nur, welcher Viewer Office-Dokumente öffnet; bestehende Dateien bleiben unberührt.
- Collabora ohne konfigurierte Collabora-URL fällt auf OnlyOffice zurück.
- OnlyOffice und Collabora werden unabhängig in ihren eigenen Abschnitten konfiguriert; das eine beeinflusst das andere nicht.
- Es wird kein neuer Umgebungsvariablen-Standard eingeführt; die Werte liegen in der App-Konfiguration.
