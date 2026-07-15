/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { readFileSync } from 'node:fs';
import { normalize } from './normalize-realm.mjs';

const indexBy = (list, keyFn) => {
  const out = {};
  (list ?? []).forEach((item) => {
    out[keyFn(item)] = item;
  });
  return out;
};

const changedFields = (left, right, trail = []) => {
  const fields = [];
  const keys = new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})]);
  keys.forEach((key) => {
    const a = left?.[key];
    const b = right?.[key];
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      fields.push(...changedFields(a, b, [...trail, key]));
    } else {
      fields.push({ path: [...trail, key].join('.'), template: a, baseline: b });
    }
  });
  return fields;
};

const diffByKey = (templateList, baselineList, keyFn) => {
  const template = indexBy(templateList, keyFn);
  const baseline = indexBy(baselineList, keyFn);
  return {
    added: Object.keys(baseline)
      .filter((key) => !(key in template))
      .sort(),
    removed: Object.keys(template)
      .filter((key) => !(key in baseline))
      .sort(),
    changed: Object.keys(template)
      .filter((key) => key in baseline && JSON.stringify(template[key]) !== JSON.stringify(baseline[key]))
      .sort()
      .map((key) => ({ key, fields: changedFields(template[key], baseline[key]) })),
  };
};

const flattenComponents = (components) => {
  const flat = [];
  Object.entries(components ?? {}).forEach(([providerType, entries]) => {
    (entries ?? []).forEach((entry) => flat.push({ ...entry, __key: `${providerType}/${entry.name ?? entry.providerId ?? ''}` }));
  });
  return flat;
};

const diffRealms = (templateRealm, baselineRealm) => {
  const template = normalize(templateRealm);
  const baseline = normalize(baselineRealm);
  return {
    clients: diffByKey(template.clients, baseline.clients, (client) => client.clientId),
    components: diffByKey(flattenComponents(template.components), flattenComponents(baseline.components), (entry) => entry.__key),
    roles: diffByKey(template.roles?.realm, baseline.roles?.realm, (role) => role.name),
  };
};

const readRealm = (file) => JSON.parse(readFileSync(file, 'utf8'));

const main = (argv) => {
  const [templateFile, baselineFile] = argv;
  if (!templateFile || !baselineFile) {
    console.error('usage: diff-realm.mjs <template.json> <baseline.json>');
    return 2;
  }
  const report = diffRealms(readRealm(templateFile), readRealm(baselineFile));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return 0;
};

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('diff-realm.mjs');
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export { diffRealms, diffByKey, changedFields };
