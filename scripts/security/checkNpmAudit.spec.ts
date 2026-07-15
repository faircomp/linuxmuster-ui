/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAudit } from './checkNpmAudit';
import type { NpmAuditAllowlistEntry } from './npmAuditAllowlist';

const ALLOWLIST: NpmAuditAllowlistEntry[] = [
  { package: 'axios', severity: 'high', reason: 'baseline', reviewBy: '2099-01-01' },
];
const TODAY = '2026-07-15';

test('an allowlisted high advisory is suppressed', () => {
  const report = { vulnerabilities: { axios: { name: 'axios', severity: 'high' } } };
  assert.equal(evaluateAudit(report, ALLOWLIST, TODAY).length, 0);
});

test('a non-allowlisted critical advisory fails the gate', () => {
  const report = { vulnerabilities: { evilpkg: { name: 'evilpkg', severity: 'critical' } } };
  const findings = evaluateAudit(report, ALLOWLIST, TODAY);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].package, 'evilpkg');
  assert.equal(findings[0].severity, 'critical');
  assert.equal(findings[0].reason, 'not-allowlisted');
});

test('moderate and low advisories are ignored', () => {
  const report = {
    vulnerabilities: {
      modpkg: { name: 'modpkg', severity: 'moderate' },
      lowpkg: { name: 'lowpkg', severity: 'low' },
    },
  };
  assert.equal(evaluateAudit(report, ALLOWLIST, TODAY).length, 0);
});

test('a new higher severity on a baselined package is not suppressed (severity ceiling)', () => {
  const report = { vulnerabilities: { axios: { name: 'axios', severity: 'critical' } } };
  const findings = evaluateAudit(report, ALLOWLIST, TODAY);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'critical');
  assert.equal(findings[0].reason, 'severity-escalated');
});

test('an expired review-by re-surfaces the allowlisted advisory', () => {
  const report = { vulnerabilities: { axios: { name: 'axios', severity: 'high' } } };
  const findings = evaluateAudit(report, ALLOWLIST, '2099-06-01');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].reason, 'review-expired');
});

test('an empty audit report yields no findings', () => {
  assert.equal(evaluateAudit({}, ALLOWLIST, TODAY).length, 0);
});
