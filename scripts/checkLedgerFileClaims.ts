/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

const TASKS_DIR = path.join(__dirname, '..', 'tasks');
const CLAIMED_PREFIXES = ['apps/', 'libs/', 'scripts/', 'docs/'];
const NEW_FILE_PATTERN = /`([a-zA-Z0-9_./-]+\.(?:ts|tsx|json|md|yml|sh|py))`\s*\((?:NEU|neu)[^)]*\)/g;
const TASK_HEADING_PATTERN = /^### (T\d+)/;
const SUPERSEDED_MARKER = 'ERSETZT';
const SECTION_HEADING_PREFIX = '## ';

interface Claim {
  ledger: string;
  task: string;
}

const collectClaims = (): Map<string, Claim[]> => {
  const claims = new Map<string, Claim[]>();

  fs.readdirSync(TASKS_DIR)
    .filter((file) => file.endsWith('.md') && !file.startsWith('PORT-'))
    .forEach((file) => {
      const ledger = path.basename(file, '.md');
      let task = '';
      let superseded = false;

      fs.readFileSync(path.join(TASKS_DIR, file), 'utf8')
        .split('\n')
        .forEach((line) => {
          if (line.startsWith(SECTION_HEADING_PREFIX)) {
            superseded = false;
          }
          if (line.includes(SUPERSEDED_MARKER)) {
            superseded = true;
          }

          const heading = TASK_HEADING_PATTERN.exec(line);
          if (heading) {
            [, task] = heading;
          }

          if (!line.startsWith('Komponente:') || !task || superseded) {
            return;
          }

          Array.from(line.matchAll(NEW_FILE_PATTERN)).forEach(([, filePath]) => {
            if (!CLAIMED_PREFIXES.some((prefix) => filePath.startsWith(prefix))) {
              return;
            }
            claims.set(filePath, [...(claims.get(filePath) ?? []), { ledger, task }]);
          });
        });
    });

  return claims;
};

const evaluate = (claims: Map<string, Claim[]>): string[] =>
  Array.from(claims.entries())
    .filter(([, owners]) => new Set(owners.map((owner) => owner.ledger)).size > 1)
    .map(
      ([filePath, owners]) =>
        `${filePath} — beansprucht von ${owners.map((owner) => `${owner.ledger}:${owner.task}`).join(', ')}`,
    );

const collisions = evaluate(collectClaims());

if (collisions.length > 0) {
  console.error(chalk.red(`${collisions.length} Datei(en) werden von mehreren Ledgern neu angelegt:`));
  collisions.forEach((collision) => console.error(chalk.red(`  ${collision}`)));
  console.error(
    chalk.yellow(
      'Ein Paket muss die Ownership abgeben. Entscheidungsgrundlage: die Wellen- und Migrationsreihenfolge in tasks/PORT-2.1.0-MASTER.md.',
    ),
  );
  process.exit(1);
}

console.info(chalk.green('Kein Ledger legt eine Datei an, die ein anderes Ledger ebenfalls anlegt.'));

export { evaluate };
