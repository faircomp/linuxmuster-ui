/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import * as fs from 'fs';
import * as path from 'path';
import EXTERNAL_REFERENCES from './supply-chain/externalReferences';

const SCAN_ROOTS = ['apps', 'libs'];
const SCAN_DIR_EXCLUDES = ['node_modules', 'dist', 'coverage', '.nx', '.git'];
const SCAN_FILE_PATTERN = /(\.tsx?|\.html|\.json)$|(^|\/)\.env(\..+)?$/;

const HOST_PATTERNS = [
  /https?:\/\/[^\s"'`]*edulution\.io[^\s"'`]*/gi,
  /raw\.githubusercontent\.com\/edulution-io[^\s"'`]*/gi,
  /edulution-io\.github\.io[^\s"'`]*/gi,
];

const MATCH_EXCLUDES = ['@edulution-io/ui-kit', 'github.com/edulution-io/edulution-ui'];

const FINDING_REASON = {
  NOT_ALLOWLISTED: 'not-allowlisted',
  NON_EMPTY_DSN: 'non-empty-dsn',
} as const;

const SENTRY_DSN_PATTERN = /SENTRY_[A-Z_]*_DSN[ \t]*[=:][ \t]*["'`]?([^\s"'`]+)/g;

interface ScanFile {
  path: string;
  content: string;
}

interface Finding {
  file: string;
  host: string;
  match: string;
  reason: string;
}

const stripLineAnchor = (file: string): string => file.replace(/:\d+$/, '');

const hostOf = (url: string): string => {
  const match = url.match(/^(?:https?:\/\/)?([a-z0-9.-]+)/i);
  return match ? match[1].toLowerCase() : url.toLowerCase();
};

const buildAllowlist = (references: typeof EXTERNAL_REFERENCES): Map<string, Set<string>> => {
  const allowed = new Map<string, Set<string>>();
  references.forEach((reference) => {
    reference.files.forEach((file) => {
      const key = stripLineAnchor(file);
      if (!allowed.has(key)) allowed.set(key, new Set());
      allowed.get(key)!.add(reference.host.toLowerCase());
    });
  });
  return allowed;
};

const scanForExternalReferences = (
  files: ScanFile[],
  references: typeof EXTERNAL_REFERENCES = EXTERNAL_REFERENCES,
): Finding[] => {
  const allowlist = buildAllowlist(references);
  const findings: Finding[] = [];

  files.forEach(({ path: filePath, content }) => {
    const allowedHosts = allowlist.get(filePath) ?? new Set<string>();

    HOST_PATTERNS.forEach((pattern) => {
      const matches = content.match(pattern) ?? [];
      matches.forEach((raw) => {
        if (MATCH_EXCLUDES.some((exclude) => raw.includes(exclude))) return;
        const host = hostOf(raw);
        if (!allowedHosts.has(host)) {
          findings.push({ file: filePath, host, match: raw, reason: FINDING_REASON.NOT_ALLOWLISTED });
        }
      });
    });

    let dsnMatch = SENTRY_DSN_PATTERN.exec(content);
    while (dsnMatch !== null) {
      const value = dsnMatch[1];
      if (value && value !== 'false' && value !== '""' && value !== "''") {
        findings.push({ file: filePath, host: 'sentry-dsn', match: dsnMatch[0], reason: FINDING_REASON.NON_EMPTY_DSN });
      }
      dsnMatch = SENTRY_DSN_PATTERN.exec(content);
    }
    SENTRY_DSN_PATTERN.lastIndex = 0;
  });

  return findings;
};

const collectFiles = (root: string): ScanFile[] => {
  const result: ScanFile[] = [];
  const walk = (dir: string) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SCAN_DIR_EXCLUDES.includes(entry.name)) walk(full);
      } else if (SCAN_FILE_PATTERN.test(entry.name)) {
        result.push({ path: full, content: fs.readFileSync(full, 'utf8') });
      }
    });
  };
  if (fs.existsSync(root)) walk(root);
  return result;
};

const main = (): void => {
  const files = SCAN_ROOTS.flatMap((root) => collectFiles(root));
  const findings = scanForExternalReferences(files);
  if (findings.length > 0) {
    console.error(`check-external-references: ${findings.length} nicht-allowlistete Referenz(en):`);
    findings.forEach((finding) => console.error(`  ${finding.file} — ${finding.host} (${finding.reason}): ${finding.match}`));
    console.error('Allowlisten in scripts/supply-chain/externalReferences.ts oder Referenz entfernen.');
    process.exit(1);
  }
  console.info(`check-external-references: ${files.length} Dateien geprüft, keine nicht-allowlistete edulution-io-Referenz.`);
};

const invokedDirectly = Boolean(process.argv[1] && process.argv[1].endsWith('checkExternalReferences.ts'));
if (invokedDirectly) main();

export { scanForExternalReferences, hostOf, buildAllowlist };
export type { ScanFile, Finding };
