/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const REFERENCE_CATEGORY = {
  RUNTIME_FETCH: 'A-runtime-fetch',
  IMAGE: 'B-image',
  TELEMETRY: 'C-telemetry',
  BRANDING: 'D-branding',
} as const;

type ReferenceCategory = (typeof REFERENCE_CATEGORY)[keyof typeof REFERENCE_CATEGORY];

interface ExternalReference {
  id: string;
  host: string;
  category: ReferenceCategory;
  files: string[];
  breakImpact: string;
  policy: string;
  owningPackage: string;
}

const EXTERNAL_REFERENCES: ExternalReference[] = [
  {
    id: 'sogo-light-theme',
    host: 'raw.githubusercontent.com',
    category: REFERENCE_CATEGORY.RUNTIME_FETCH,
    files: ['libs/src/mail/constants/sogoTheme.ts', '.reference/2.0.200/api/main.js:25090'],
    breakImpact: 'SOGo-Webmail lädt Light-Theme-CSS zur Laufzeit von GitHub; Ausfall/Zensur bricht Mail-Theming',
    policy: 'Theme-CSS ins eigene Mail-Image/Asset vendoren, kein Laufzeit-Fetch von fremdem GitHub',
    owningPackage: 'p4-mail-rework',
  },
  {
    id: 'sogo-custom-theme',
    host: 'raw.githubusercontent.com',
    category: REFERENCE_CATEGORY.RUNTIME_FETCH,
    files: ['libs/src/mail/constants/sogoTheme.ts', '.reference/2.0.200/api/main.js:25094'],
    breakImpact: 'SOGo-Webmail lädt Custom-Theme-CSS zur Laufzeit von GitHub',
    policy: 'Theme-CSS vendoren (wie sogo-light-theme)',
    owningPackage: 'p4-mail-rework',
  },
  {
    id: 'plugins-appstore-fetch',
    host: 'raw.githubusercontent.com',
    category: REFERENCE_CATEGORY.RUNTIME_FETCH,
    files: ['libs/src/common/constants/urls.ts:21'],
    breakImpact: 'App-Store zieht Plugin-Compose/Apps live aus edulution-plugins; Ausfall bricht App-Installation',
    policy: 'Eigenen Plugins-Mirror/Registry setzen und EDU_PLUGINS_GITHUB_URL darauf repointen',
    owningPackage: 'p1-installer-repoint',
  },
  {
    id: 'cookie-test-page',
    host: 'edulution-io.github.io',
    category: REFERENCE_CATEGORY.RUNTIME_FETCH,
    files: ['libs/src/common/constants/cookieTestUrl.ts:20'],
    breakImpact: 'Third-Party-Cookie-Test lädt fremde HTML-Seite; Egress zu fremdem GitHub-Pages beim Login-Flow',
    policy: 'cookie-test.html selbst hosten (eigene Domain/Asset), COOKIE_TEST_URL repointen',
    owningPackage: 'p1-rebrand',
  },
  {
    id: 'license-server',
    host: 'license.edulution.io',
    category: REFERENCE_CATEGORY.RUNTIME_FETCH,
    files: ['libs/src/license/constants/licenseServerUrl.ts', '.reference/2.0.200/api/main.js:43800'],
    breakImpact: 'LicenseService ruft fremden Lizenzserver; kann Feature-Gating/Egress erzeugen',
    policy: 'Lizenzserver-Call stubben/deaktivieren (AGPL-Fork braucht kein Netzint-Lizenz-Gate)',
    owningPackage: 'p1-installer-repoint',
  },
  {
    id: 'satellite-provisioning',
    host: 'provisioning.satellite.edulution.io',
    category: REFERENCE_CATEGORY.RUNTIME_FETCH,
    files: ['.reference/2.0.200/api/main.js:64034'],
    breakImpact: 'Satellites-Modul kontaktiert fremden Provisioning-Dienst',
    policy: 'Nur inventarisiert — Satellites ist P6 deferred; bei Aktivierung eigenen Endpoint',
    owningPackage: 'p6-satellites',
  },
  {
    id: 'image-edulution-api',
    host: 'ghcr.io',
    category: REFERENCE_CATEGORY.IMAGE,
    files: ['.reference/2.0.200/api/main.js:26891'],
    breakImpact: 'Kern-API-Image aus fremdem ghcr-Namespace',
    policy: 'Aus eigenem ghcr/faircomp bauen+pullen (Pinning per Digest)',
    owningPackage: 'p1-own-ci-registry',
  },
  {
    id: 'image-edulution-ui',
    host: 'ghcr.io',
    category: REFERENCE_CATEGORY.IMAGE,
    files: ['.reference/2.0.200/api/main.js:26891'],
    breakImpact: 'Kern-UI-Image aus fremdem ghcr-Namespace',
    policy: 'Aus eigenem ghcr/faircomp bauen+pullen',
    owningPackage: 'p1-own-ci-registry',
  },
  {
    id: 'image-edulution-db',
    host: 'ghcr.io',
    category: REFERENCE_CATEGORY.IMAGE,
    files: ['.reference/2.0.200/api/main.js:26891'],
    breakImpact: 'MongoDB-Image (DOCKER_PROTECTED_CONTAINERS); Basis-Infra',
    policy: 'Upstream-Basisimage pinnen bzw. eigenes Infra-Image',
    owningPackage: 'p1-installer-repoint',
  },
  {
    id: 'image-edulution-redis',
    host: 'ghcr.io',
    category: REFERENCE_CATEGORY.IMAGE,
    files: ['.reference/2.0.200/api/main.js:26891'],
    breakImpact: 'Redis-Image (Protected-Container); Basis-Infra',
    policy: 'Upstream-Basisimage pinnen',
    owningPackage: 'p1-installer-repoint',
  },
  {
    id: 'image-edulution-traefik',
    host: 'ghcr.io',
    category: REFERENCE_CATEGORY.IMAGE,
    files: ['.reference/2.0.200/api/main.js:26891'],
    breakImpact: 'Traefik-Reverse-Proxy-Image (Protected-Container)',
    policy: 'Upstream-Basisimage pinnen',
    owningPackage: 'p1-installer-repoint',
  },
  {
    id: 'image-edulution-keycloak',
    host: 'ghcr.io',
    category: REFERENCE_CATEGORY.IMAGE,
    files: ['.reference/2.0.200/api/main.js:26891'],
    breakImpact: 'Keycloak-Image (Protected-Container); Auth-Kern',
    policy: 'Upstream-Basisimage pinnen',
    owningPackage: 'p1-installer-repoint',
  },
  {
    id: 'image-edulution-keycloak-db',
    host: 'ghcr.io',
    category: REFERENCE_CATEGORY.IMAGE,
    files: ['.reference/2.0.200/api/main.js:26891'],
    breakImpact: 'Keycloak-Postgres-Image (Protected-Container)',
    policy: 'Upstream-Basisimage pinnen',
    owningPackage: 'p1-installer-repoint',
  },
  {
    id: 'image-companion-mail',
    host: 'ghcr.io',
    category: REFERENCE_CATEGORY.IMAGE,
    files: ['libs/src/docker/constants/dockerApplicationList.ts'],
    breakImpact: 'Mailcow/SOGo-Companion-Image (edulution-mail); Mail-Feature',
    policy: 'Eigenes Companion-Image bauen bzw. pinnen',
    owningPackage: 'p4-mail-rework',
  },
  {
    id: 'image-companion-onlyoffice',
    host: 'ghcr.io',
    category: REFERENCE_CATEGORY.IMAGE,
    files: ['libs/src/docker/constants/dockerApplicationList.ts'],
    breakImpact: 'OnlyOffice/Collabora-Companion-Image; Filesharing-WOPI',
    policy: 'Eigenes Companion-Image bauen bzw. pinnen',
    owningPackage: 'p4-filesharing-wopi',
  },
  {
    id: 'image-companion-guacamole',
    host: 'ghcr.io',
    category: REFERENCE_CATEGORY.IMAGE,
    files: ['libs/src/docker/constants/dockerApplicationList.ts'],
    breakImpact: 'Guacamole-Companion-Image; VDI/Remote',
    policy: 'Eigenes Companion-Image bauen bzw. pinnen',
    owningPackage: 'p4-app-store-verify',
  },
  {
    id: 'image-companion-veyon',
    host: 'ghcr.io',
    category: REFERENCE_CATEGORY.IMAGE,
    files: ['libs/src/docker/constants/dockerApplicationList.ts'],
    breakImpact: 'Veyon-Companion-Image; Klassenraum-Steuerung',
    policy: 'Eigenes Companion-Image bauen bzw. pinnen',
    owningPackage: 'p4-app-store-verify',
  },
  {
    id: 'image-companion-wireguard',
    host: 'ghcr.io',
    category: REFERENCE_CATEGORY.IMAGE,
    files: ['libs/src/docker/constants/dockerApplicationList.ts'],
    breakImpact: 'WireGuard-Companion-Image; VPN',
    policy: 'Eigenes Companion-Image bauen bzw. pinnen',
    owningPackage: 'p4-app-store-verify',
  },
  {
    id: 'sentry-edu-ui-dsn',
    host: 'sentry.io',
    category: REFERENCE_CATEGORY.TELEMETRY,
    files: ['.reference/2.0.200/api/main.js:54486', 'apps/api/.env.default'],
    breakImpact: 'getSentryConfig setzt sendDefaultPii:true + tracesSampleRate:1.0 → PII-Egress an fremden DSN wenn gesetzt',
    policy: 'ENABLE_SENTRY=false default; nie Fremd-DSN erben; eigener DSN nur opt-in',
    owningPackage: 'p1-observability',
  },
  {
    id: 'sentry-edu-api-dsn',
    host: 'sentry.io',
    category: REFERENCE_CATEGORY.TELEMETRY,
    files: ['.reference/2.0.200/api/main.js:59762', 'apps/api/.env.default'],
    breakImpact: 'enableSentryForNest → API-Telemetrie/PII-Egress an fremden DSN wenn gesetzt',
    policy: 'ENABLE_SENTRY=false default; leerer DSN; opt-in only',
    owningPackage: 'p1-observability',
  },
  {
    id: 'branding-docs-url',
    host: 'docs.edulution.io',
    category: REFERENCE_CATEGORY.BRANDING,
    files: ['libs/src/common/constants/urls.ts:22', 'libs/src/filesharing/constants/webdavTutorialLinks.ts'],
    breakImpact: 'Doku-Link zeigt auf fremde Marke (kein Egress, nur UI-Link)',
    policy: 'Bei Rebrand auf eigene Doku umstellen',
    owningPackage: 'p1-rebrand',
  },
  {
    id: 'branding-appstore-url',
    host: 'apps.apple.com',
    category: REFERENCE_CATEGORY.BRANDING,
    files: ['libs/src/common/constants/urls.ts:20'],
    breakImpact: 'App-Store-Link zur fremden iOS-App (kein Egress, nur UI-Link)',
    policy: 'Bei Rebrand entfernen/ersetzen',
    owningPackage: 'p1-rebrand',
  },
  {
    id: 'branding-issue-352',
    host: 'github.com',
    category: REFERENCE_CATEGORY.BRANDING,
    files: ['.reference/2.0.200/api/main.js:53668'],
    breakImpact: 'Issue-Referenz-Link auf Upstream-Repo (nur Kommentar/Doku-Link)',
    policy: 'Nur inventarisiert; bei Rebrand aufräumen',
    owningPackage: 'p1-rebrand',
  },
  {
    id: 'branding-issue-396',
    host: 'github.com',
    category: REFERENCE_CATEGORY.BRANDING,
    files: ['.reference/2.0.200/api/main.js:26374'],
    breakImpact: 'Issue-Referenz-Link auf Upstream-Repo (nur Kommentar/Doku-Link)',
    policy: 'Nur inventarisiert; bei Rebrand aufräumen',
    owningPackage: 'p1-rebrand',
  },
];

export { REFERENCE_CATEGORY };
export type { ExternalReference, ReferenceCategory };
export default EXTERNAL_REFERENCES;
