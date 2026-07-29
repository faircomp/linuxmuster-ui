/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { readFileSync } from 'node:fs';

const REDACTED = 'REDACTED';

const REDACT_KEYS = new Set([
  'secret',
  'bindCredential',
  'clientSecret',
  'privateKey',
  'certificate',
  'password',
  'secretData',
  'salt',
]);

const DROP_KEYS = new Set(['id', 'notBefore', 'lastSync', 'creationTimestamp', 'client.secret.creation.time']);

const SENSITIVE_NAMES = new Set([
  'secret',
  'password',
  'credential',
  'bindcredential',
  'clientsecret',
  'privatekey',
  'certificate',
  'secretdata',
  'salt',
]);

const PEM_MARKER = /-----BEGIN [A-Z0-9 ]*(PRIVATE KEY|CERTIFICATE|RSA)-----/;

const isMasked = (value) => typeof value === 'string' && (value === REDACTED || /^\*{3,}$/.test(value));

const redact = (value) => (Array.isArray(value) ? value.map(() => REDACTED) : REDACTED);

const normalize = (node) => {
  if (Array.isArray(node)) {
    return node.map(normalize).sort((a, b) => {
      const left = JSON.stringify(a);
      const right = JSON.stringify(b);
      if (left < right) return -1;
      return left > right ? 1 : 0;
    });
  }
  if (node && typeof node === 'object') {
    const out = {};
    Object.keys(node)
      .sort()
      .forEach((key) => {
        if (DROP_KEYS.has(key)) return;
        if (REDACT_KEYS.has(key)) {
          out[key] = redact(node[key]);
          return;
        }
        out[key] = normalize(node[key]);
      });
    return out;
  }
  return node;
};

const isSensitiveLeak = (key, value) => {
  const byName = SENSITIVE_NAMES.has(key.toLowerCase());
  const values = Array.isArray(value) ? value : [value];
  return values.some((entry) => {
    if (typeof entry !== 'string' || entry === '' || isMasked(entry)) return false;
    return byName || PEM_MARKER.test(entry);
  });
};

const findUnscrubbed = (node, trail = []) => {
  const leaks = [];
  if (Array.isArray(node)) {
    node.forEach((item, index) => leaks.push(...findUnscrubbed(item, [...trail, String(index)])));
  } else if (node && typeof node === 'object') {
    Object.keys(node).forEach((key) => {
      const value = node[key];
      if (isSensitiveLeak(key, value)) leaks.push([...trail, key].join('.'));
      leaks.push(...findUnscrubbed(value, [...trail, key]));
    });
  }
  return leaks;
};

const readRealm = (file) => JSON.parse(readFileSync(file, 'utf8'));

const main = (argv) => {
  if (argv[0] === '--assert-scrubbed') {
    const file = argv[1];
    if (!file) {
      console.error('usage: normalize-realm.mjs --assert-scrubbed <file>');
      return 2;
    }
    const leaks = findUnscrubbed(readRealm(file));
    if (leaks.length > 0) {
      console.error(`nicht redigierte Secrets in ${file}:`);
      leaks.forEach((leak) => console.error(`  ${leak}`));
      return 2;
    }
    console.error(`${file}: alle Secret-Felder redigiert.`);
    return 0;
  }

  const file = argv[0];
  if (!file) {
    console.error('usage: normalize-realm.mjs <realm.json>  |  --assert-scrubbed <file>');
    return 2;
  }
  process.stdout.write(`${JSON.stringify(normalize(readRealm(file)), null, 2)}\n`);
  return 0;
};

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('normalize-realm.mjs');
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export { normalize, findUnscrubbed, REDACTED, REDACT_KEYS, DROP_KEYS };
