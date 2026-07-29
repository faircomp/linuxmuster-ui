<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# Spec-Policy (API-Controller)

Dev-Doku für die Test-Anforderungen an `apps/api`-Controller.

## 1. Jeder Controller braucht einen Spec

Für jede `*.controller.ts` unter `apps/api/src` muss eine kolokierte
`*.controller.spec.ts` existieren. Das erzwingt der Guard **`check-spec-coverage`**
(`scripts/checkSpecCoverage.ts`): er scannt `apps/api/src` rekursiv und schlägt fehl
(`exit 1`), wenn zu einem Controller der Spec fehlt. Der Guard läuft in `.husky/pre-commit`
(ein neuer Controller ohne Spec blockt lokal) **und** im CI-Green-Gate
(`.github/workflows/build-and-test.yml`). Ausnahmen — falls je nötig — trägt man in die
Allowlist `SPEC_NOT_REQUIRED` im Guard ein (Default: leer).

Ein Spec deckt mindestens ab:

- **Smoke:** `expect(controller).toBeDefined()` (Controller lässt sich mit gemockten
  Abhängigkeiten instanziieren).
- **Auth-Contract:** die Guard-/`@Public()`-Verdrahtung des Controllers (s. §2).

## 2. Auth-Contract-Assertions via `controllerContractReflection`

Der reine (jest-freie) Helper `apps/api/src/common/controllerContractReflection.ts` liest die
NestJS-Metadaten **ohne** einen Request auszuführen:

- `getClassGuards(Controller)` — Klassen-Level-`@UseGuards(...)`.
- `getRouteGuards(Controller, methodName)` — Route-Level-`@UseGuards(...)`.
- `isRoutePublic(Controller, methodName)` — ob die Route via `@Public()` aus der globalen
  Authentifizierung ausgeklinkt ist.

Beispiel:

```ts
import controllerContractReflection from '../common/controllerContractReflection';

it('exposes only the expected routes via @Public', () => {
  expect(controllerContractReflection.isRoutePublic(AuthController, 'authenticate')).toBe(true);
  expect(controllerContractReflection.isRoutePublic(AuthController, 'getQrCode')).toBe(false);
});

it('guards mutations with the AdminGuard', () => {
  expect(controllerContractReflection.getRouteGuards(BulletinCategoryController, 'create')).toContain(AdminGuard);
});
```

Der Contract-Teil ist der **Auth-Bypass-Schutz**: jede `@Public()`-Route wird bewusst
gelistet und geprüft, damit ein versehentliches Ausklinken einer geschützten Route im Review
sichtbar wird. Da die Assertions nur Metadaten reflektieren (kein Route-Aufruf, kein
`app.init()`), genügen minimale Service-Mocks; Guards müssen nicht instanziiert/gestellt werden.

## 3. Going-forward: verhaltensbasierter Auth-Spec ab dem Chat-Pilot

Jedes **neu rekonstruierte** Modul (ab `p2-chat`) bekommt zusätzlich zum Smoke/Contract-Spec
einen **verhaltensbasierten** Auth-Spec: geschützte Routen liefern ohne gültige
Berechtigung `401`/`403`, `@Public()`-Routen bleiben erreichbar. Der Reflection-Contract
(§2) beweist die Verdrahtung, der Verhaltens-Spec beweist die Wirkung.

## 4. Ausführen

```bash
npm run test:api:ci          # deterministischer, cache-freier API-Unit-Test-Gate (jest --ci --runInBand)
npm run check-spec-coverage  # prüft, dass jeder Controller einen Spec hat
```

Remote (warme crabbox) laufen dieselben Ziele über den `iter.sh`-Harness. Der API-Unit-Test
ist im CI ein eigener benannter Step („Run API unit tests"), damit der Test-Gate einzeln
erzwingbar ist.
