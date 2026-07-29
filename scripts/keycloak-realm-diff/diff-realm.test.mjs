/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffRealms } from './diff-realm.mjs';

const templateRealm = {
  realm: 'edulution',
  clients: [
    { clientId: 'edu-api', publicClient: false },
    { clientId: 'edu-ui', publicClient: false, directAccessGrantsEnabled: true },
  ],
  components: { 'org.keycloak.storage.UserStorageProvider': [{ name: 'ldap', config: { editMode: ['READ_ONLY'] } }] },
  roles: { realm: [{ name: 'default-roles-edulution' }] },
};

const baselineRealm = {
  realm: 'edulution',
  clients: [
    { clientId: 'edu-api', publicClient: false },
    { clientId: 'edu-ui', publicClient: true, directAccessGrantsEnabled: true },
  ],
  components: { 'org.keycloak.storage.UserStorageProvider': [{ name: 'ldap', config: { editMode: ['READ_ONLY'] } }] },
  roles: { realm: [{ name: 'default-roles-edulution' }, { name: 'edu-mailcow-sync-role' }] },
};

test('geänderte Client-Flag wird unter changed gemeldet', () => {
  const report = diffRealms(templateRealm, baselineRealm);
  const eduUi = report.clients.changed.find((entry) => entry.key === 'edu-ui');
  assert.ok(eduUi, 'edu-ui muss als changed erscheinen');
  const flag = eduUi.fields.find((field) => field.path === 'publicClient');
  assert.ok(flag);
  assert.equal(flag.template, false);
  assert.equal(flag.baseline, true);
});

test('neue Rolle wird unter added gemeldet, keine falschen removed/changed', () => {
  const report = diffRealms(templateRealm, baselineRealm);
  assert.deepEqual(report.roles.added, ['edu-mailcow-sync-role']);
  assert.deepEqual(report.roles.removed, []);
  assert.deepEqual(report.clients.removed, []);
  assert.deepEqual(report.clients.added, []);
});

test('identische Komponenten erzeugen keinen Diff', () => {
  const report = diffRealms(templateRealm, baselineRealm);
  assert.deepEqual(report.components.changed, []);
  assert.deepEqual(report.components.added, []);
  assert.deepEqual(report.components.removed, []);
});
