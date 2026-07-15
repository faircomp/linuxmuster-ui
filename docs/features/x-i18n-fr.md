# FR-Locale erstwertig aktivieren (DE+EN → DE+EN+FR) — Spec

> Kalibrierungs-Hinweis: Dies ist **kein** Rekonstruktions-Delta aus edulution 2.0, sondern eine
> **einmalige, forkeigene Konsolidierung** (Kevin pflegt FR künftig mit). Kein `main.js`-Anker.
> Die Task-Granularität ist bewusst klein; der Hauptteil ist ein **mechanischer Backfill** der
> Locale-Datei plus ein **Zwei-Zeilen-Flip** in den Guard-Skripten. Keine Produkt-Runtime ändert sich.

## Problem / Motivation
Der Fork trägt `fr` bereits **halb verdrahtet** mit sich: i18next kennt `fr`, es gibt ein
`fr/translation.json`, einen Sprachumschalter mit Frankreich-Flagge und die Nutzer-Sprach-Konstante
`FRENCH: 'fr'`. Aber:

1. `fr/translation.json` ist **unvollständig** (1765 statt 1930 Leaf-Keys → **187 fehlende** DE-Keys)
   und enthält **22 veraltete** Keys, die es in DE gar nicht mehr gibt.
2. Die Parität wird für FR **nicht erzwungen**: `scripts/checkTranslations.ts` lädt FR zwar, schreibt
   fehlende FR-Keys aber nur per `console.info` und nimmt FR **nicht** in die `process.exit(1)`-Bedingung
   auf. `scripts/checkErrorMessages.ts` prüft FR gar nicht.

Folge: FR verrottet still. Ziel dieses Pakets ist, FR **erstwertig** zu machen — vollständig
gefüllt und ab dann per Pre-Commit-Guard **gleichrangig zu DE/EN erzwungen**, sodass jeder neue Key
künftig zwingend auch in FR gepflegt wird.

## Ausgangslage — Audit (was schon da ist / was fehlt)

**Bereits erledigt (nicht anfassen, nur verifizieren):**
- `apps/frontend/src/i18n.ts` — `supportedLngs: ['en','de','fr']`, `import translationFR`, `resources.fr`. ✅
- `libs/src/user/constants/userLanguage.ts` — `FRENCH: 'fr'`. ✅ (`userLanguageType.ts` leitet ab)
- `apps/frontend/src/pages/UserSettings/Language/components/LanguageSelector.tsx` — French-Option mit
  `FranceIcon` (`apps/frontend/src/assets/icons/france.svg`). ✅
- Labels `settings.language.french` in DE/EN/FR vorhanden. ✅
- `apps/frontend/src/App.tsx` — `i18n.changeLanguage(user.language)` ist sprach-generisch, greift FR ohne Änderung. ✅
- `scripts/checkTranslations.ts` — lädt FR bereits und berechnet `missingNestedInFR`. ✅ (aber nicht erzwungen)

**Offen (dieses Paket):**
- FR-Backfill: **187** fehlende DE→FR-Keys ergänzen, **22** veraltete FR-Keys löschen (exakte DE-Key-Menge).
- `scripts/checkTranslations.ts` — FR in die Fehler-/Exit-Bedingung aufnehmen, symmetrisch zu DE↔EN
  (fehlende **und** überzählige FR-Keys → `console.error` + `exit(1)`).
- `scripts/checkErrorMessages.ts` — FR-Locale zusätzlich zu DE/EN gegen die `errorMessage.ts`-Enums prüfen.
- Konventions-Doku (AGENTS.md + Ledger-/Spec-Guardrails) von „DE+EN" auf „DE+EN+FR" nachziehen.

## Ziel & Nicht-Ziele (YAGNI)
**Ziel**
- `fr/translation.json` erreicht **Key-Parität** mit DE (und damit EN): gleiche Leaf-Key-Menge, keine
  fehlenden, keine überzähligen Keys.
- FR wird in `checkTranslations.ts` **gleichrangig erzwungen** (bidirektional zu DE) und in
  `checkErrorMessages.ts` mitgeprüft.
- `npm run check-translations` und `npm run check-error-message-translations` sind **mit** FR-Erzwingung grün.
- Konvention repo-weit auf „DE+EN+FR" umgestellt (Guardrail-Text, damit künftige Keys FR mitführen).

**Nicht-Ziele**
- **Keine** neuen Sprachen über FR hinaus.
- **Kein** Umbau des Sprachumschalters / der Detection-Logik (funktioniert bereits).
- **Keine** Backend-/Migrations-Änderung — `user.language` ist ein freier String, `'fr'` wird bereits akzeptiert.
- **Keine** inhaltliche Neuübersetzung bereits vorhandener FR-Strings (nur Lücken füllen). Maschinelle
  Erst-Übersetzung des Backfills ist akzeptabel; Kevin verfeinert danach fortlaufend.
- **Kein** `schemaVersion`-Bump (reine Frontend-Assets + Skripte).

## Betroffene Komponenten & Dateien (konkrete Pfade)
- `apps/frontend/src/locales/fr/translation.json` — Backfill (187 rein, 22 raus), FR = exakte DE-Key-Menge.
- `scripts/checkTranslations.ts` — FR in Exit-Bedingung; überzählige FR-Keys ergänzend prüfen.
- `scripts/checkErrorMessages.ts` — FR-Locale-Pfad + FR-Prüfblock analog DE/EN.
- `AGENTS.md` — i18n-Konventionszeile „DE+EN+FR" ergänzen (Guardrail für künftige Arbeit).

## Datenmodell / Contract
Keine Typänderung. `UserLanguageType` deckt `'fr'` bereits ab. Die Locale-Datei ist ein reines
JSON-Asset; „Contract" ist einzig die **Key-Parität** zwischen den drei Dateien, ab jetzt durch die
Guard-Skripte maschinell garantiert.

## Enforcement — Wie die Parität erzwungen wird (Kern-Delta)
`scripts/checkTranslations.ts` heute: `process.exit(1)` **nur** wenn `missingNestedInEN` **oder**
`missingNestedInDE` nicht leer; FR nur `console.info`. Soll:
- FR symmetrisch behandeln wie EN: `missingNestedInFR` (DE-Keys, die FR fehlen) **und**
  `extraNestedInFR` (FR-Keys, die es in DER Referenz DE nicht gibt) berechnen und in die
  Fehlerausgabe + `exit(1)`-Bedingung aufnehmen.
- Damit ist FR ab Merge **Pre-Commit-blockierend** (`.husky/pre-commit` ruft `check-translations`
  bereits auf) — jeder neue Key ohne FR-Pendant lässt den Commit scheitern.

## Verifikation (End-to-End)
- `npm run check-translations` → grün, **mit** aktiver FR-Erzwingung (Gegenprobe: einen FR-Key
  entfernen ⇒ rot).
- `npm run check-error-message-translations` → grün inkl. FR-Block.
- `npm run build` (Vite/tsc) grün — FR-JSON lädt.
- Smoke-UI (optional, `npm run dev`): Settings → Sprache → Français schaltet die Oberfläche um, keine
  rohen Key-Strings sichtbar auf den Kernseiten.

## Doku-Impact
- `AGENTS.md`: neue Konventionszeile (i18n dreisprachig, alle drei erzwungen).
- Bestehende Ledger/Specs, die „DE+EN" als DoD führen, werden **nicht rückwirkend** umgeschrieben;
  ab jetzt gilt für neue Arbeit „DE+EN+FR" (siehe Konventions-Änderungsliste in der Übergabe).

## Risiken / offene Fragen
- **Backfill-Qualität:** 187 maschinell erstübersetzte Strings können sprachlich unrund sein. Bewusst
  akzeptiert (Nicht-Ziel: perfekte Übersetzung) — Guard sichert nur *Vollständigkeit*, nicht Idiomatik.
- **Placeholder-/ICU-Integrität:** Interpolations-Platzhalter (`{{name}}`) und Tags müssen im Backfill
  1:1 aus DE übernommen werden — Verify-Task prüft das gesondert.
- **22 stale Keys:** vor dem Löschen kurz gegen `grep` im Code absichern (T3), falls ein Key nur in FR
  je genutzt wurde (unwahrscheinlich, da DE/EN ihn nicht haben).
