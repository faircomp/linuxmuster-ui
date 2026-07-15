/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalize, findUnscrubbed } from './normalize-realm.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(readFileSync(join(here, 'fixtures', 'realm.sample.json'), 'utf8'));

test('Secrets werden zu REDACTED redigiert', () => {
  const normalized = normalize(sample);
  const clients = Object.fromEntries(normalized.clients.map((c) => [c.clientId, c]));
  assert.equal(clients['edu-api'].secret, 'REDACTED');
  assert.equal(clients['edu-api'].clientSecret, 'REDACTED');
  assert.equal(clients['edu-ui'].secret, 'REDACTED');
  const ldap = normalized.components['org.keycloak.storage.UserStorageProvider'][0];
  assert.deepEqual(ldap.config.bindCredential, ['REDACTED']);
  const key = normalized.components['org.keycloak.keys.KeyProvider'][0];
  assert.deepEqual(key.config.privateKey, ['REDACTED']);
  assert.deepEqual(key.config.certificate, ['REDACTED']);
});

test('volatile Felder id/notBefore/lastSync werden entfernt', () => {
  const normalized = normalize(sample);
  assert.equal('id' in normalized, false);
  assert.equal('notBefore' in normalized, false);
  normalized.clients.forEach((client) => assert.equal('id' in client, false));
  const ldap = normalized.components['org.keycloak.storage.UserStorageProvider'][0];
  assert.equal('id' in ldap, false);
  assert.equal('lastSync' in ldap.config, false);
});

test('Normalisierung ist idempotent', () => {
  const once = normalize(sample);
  const twice = normalize(once);
  assert.equal(JSON.stringify(twice), JSON.stringify(once));
});

test('findUnscrubbed meldet Klartext-Secrets vor, keine nach der Normalisierung', () => {
  assert.ok(findUnscrubbed(sample).length > 0);
  assert.equal(findUnscrubbed(normalize(sample)).length, 0);
});

test('smtpServer.password wird redigiert', () => {
  const normalized = normalize(sample);
  assert.equal(normalized.smtpServer.password, 'REDACTED');
  assert.equal(normalized.smtpServer.host, 'smtp.example.org');
});

test('unabhängiger Assert fängt unbekannte Secret-Namen und PEM-Material', () => {
  assert.equal(findUnscrubbed({ config: { apiToken: 'plain-value' } }).length, 0);
  assert.equal(findUnscrubbed({ smtpServer: { password: 'leak' } }).length, 1);
  assert.equal(findUnscrubbed({ misc: { blob: '-----BEGIN PRIVATE KEY-----\nMIIE' } }).length, 1);
  assert.equal(findUnscrubbed({ passwordPolicy: 'length(8)' }).length, 0);
});
