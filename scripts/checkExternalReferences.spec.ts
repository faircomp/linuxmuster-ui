/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanForExternalReferences, hostOf } from './checkExternalReferences';
import type { ExternalReference } from './supply-chain/externalReferences';

const ALLOWLIST: ExternalReference[] = [
  {
    id: 'cookie-test-page',
    host: 'edulution-io.github.io',
    category: 'A-runtime-fetch',
    files: ['libs/src/common/constants/cookieTestUrl.ts:20'],
    breakImpact: 'x',
    policy: 'x',
    owningPackage: 'p1-rebrand',
  },
];

test('sauberes, allowlistetes Snippet erzeugt keine Fundstelle', () => {
  const files = [
    {
      path: 'libs/src/common/constants/cookieTestUrl.ts',
      content: "const COOKIE_TEST_URL = 'https://edulution-io.github.io/edulution-ui/cookie-test.html';",
    },
  ];
  assert.equal(scanForExternalReferences(files, ALLOWLIST).length, 0);
});

test('eingeschleuste, nicht-allowlistete edulution.io-Referenz schlägt fehl', () => {
  const files = [{ path: 'libs/src/foo.ts', content: 'const X = "https://foo.edulution.io/x";' }];
  const findings = scanForExternalReferences(files, ALLOWLIST);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].host, 'foo.edulution.io');
  assert.equal(findings[0].reason, 'not-allowlisted');
});

test('gleicher Host in nicht-allowlisteter Datei schlägt fehl (Datei+Host-Bindung)', () => {
  const files = [
    { path: 'libs/src/other.ts', content: 'const U = "https://edulution-io.github.io/edulution-ui/cookie-test.html";' },
  ];
  assert.equal(scanForExternalReferences(files, ALLOWLIST).length, 1);
});

test('@edulution-io/ui-kit-Import wird ausgeschlossen', () => {
  const files = [{ path: 'apps/frontend/src/x.ts', content: "import { Button } from '@edulution-io/ui-kit';" }];
  assert.equal(scanForExternalReferences(files, ALLOWLIST).length, 0);
});

test('nicht-leeres SENTRY_*_DSN-Literal schlägt fehl, leeres nicht', () => {
  const dirty = [{ path: 'apps/api/.env', content: 'SENTRY_EDU_API_DSN=https://abc@sentry.io/1' }];
  const clean = [{ path: 'apps/api/.env.default', content: 'SENTRY_EDU_API_DSN=\nENABLE_SENTRY=false' }];
  assert.equal(scanForExternalReferences(dirty, ALLOWLIST).length, 1);
  assert.equal(scanForExternalReferences(clean, ALLOWLIST).length, 0);
});

test('hostOf extrahiert Host mit und ohne Protokoll', () => {
  assert.equal(hostOf('https://license.edulution.io/api/v1'), 'license.edulution.io');
  assert.equal(hostOf('raw.githubusercontent.com/edulution-io/x'), 'raw.githubusercontent.com');
});
