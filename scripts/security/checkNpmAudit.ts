/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { execFileSync } from 'child_process';
import NPM_AUDIT_ALLOWLIST, { NpmAuditAllowlistEntry } from './npmAuditAllowlist';

const BLOCKING_SEVERITIES = ['high', 'critical'] as const;
type BlockingSeverity = (typeof BLOCKING_SEVERITIES)[number];

const FINDING_REASON = {
  NOT_ALLOWLISTED: 'not-allowlisted',
  REVIEW_EXPIRED: 'review-expired',
  SEVERITY_ESCALATED: 'severity-escalated',
} as const;
type FindingReason = (typeof FINDING_REASON)[keyof typeof FINDING_REASON];

const SEVERITY_RANK: Record<BlockingSeverity, number> = { high: 1, critical: 2 };

interface AuditVulnerability {
  name?: string;
  severity?: string;
}

interface NpmAuditReport {
  vulnerabilities?: Record<string, AuditVulnerability>;
}

interface AuditFinding {
  package: string;
  severity: BlockingSeverity;
  reason: FindingReason;
}

const isBlockingSeverity = (severity?: string): severity is BlockingSeverity =>
  (BLOCKING_SEVERITIES as readonly string[]).includes(severity ?? '');

const evaluateAudit = (
  report: NpmAuditReport,
  allowlist: NpmAuditAllowlistEntry[],
  today: string,
): AuditFinding[] => {
  const allowedByPackage = new Map(allowlist.map((entry) => [entry.package, entry]));

  return Object.entries(report.vulnerabilities ?? {})
    .filter(([, vulnerability]) => isBlockingSeverity(vulnerability.severity))
    .map(([packageName, vulnerability]): AuditFinding | null => {
      const severity = vulnerability.severity as BlockingSeverity;
      const allowed = allowedByPackage.get(packageName);
      if (!allowed) {
        return { package: packageName, severity, reason: FINDING_REASON.NOT_ALLOWLISTED };
      }
      if (allowed.reviewBy < today) {
        return { package: packageName, severity, reason: FINDING_REASON.REVIEW_EXPIRED };
      }
      if (SEVERITY_RANK[severity] > SEVERITY_RANK[allowed.severity]) {
        return { package: packageName, severity, reason: FINDING_REASON.SEVERITY_ESCALATED };
      }
      return null;
    })
    .filter((finding): finding is AuditFinding => finding !== null);
};

const runNpmAudit = (): string => {
  try {
    return execFileSync('npm', ['audit', '--json', '--omit=dev'], {
      encoding: 'utf-8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    const stdout = (error as { stdout?: string }).stdout;
    if (stdout) {
      return stdout;
    }
    throw error;
  }
};

const main = (): void => {
  const report = JSON.parse(runNpmAudit()) as NpmAuditReport;
  const today = new Date().toISOString().slice(0, 10);
  const findings = evaluateAudit(report, NPM_AUDIT_ALLOWLIST, today);

  if (findings.length === 0) {
    console.info('npm audit: no un-allowlisted high/critical advisories.');
    return;
  }

  console.error(`npm audit gate: ${findings.length} un-allowlisted high/critical advisory package(s):`);
  findings.forEach((finding) => {
    console.error(`  ${finding.package} (${finding.severity}) — ${finding.reason}`);
  });
  console.error('Fix the dependency, or add an entry to scripts/security/npmAuditAllowlist.ts + docs/security/accepted-cves.md.');
  process.exit(1);
};

const invokedDirectly = Boolean(process.argv[1] && process.argv[1].endsWith('checkNpmAudit.ts'));
if (invokedDirectly) main();

export { evaluateAudit };
export type { NpmAuditReport, AuditFinding };
