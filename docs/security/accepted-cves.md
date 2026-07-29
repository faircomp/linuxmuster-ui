<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# Accepted CVEs register

Human-readable register of vulnerabilities that the security gates deliberately
accept (unfixable, base-image-only, or not exploitable in our context). Each
accepted CVE MUST appear both here **and** in the matching machine-readable
allowlist:

- container-image CVEs → [`.trivyignore`](../../.trivyignore)
- npm advisories → `scripts/security/npmAuditAllowlist.ts` (added by the npm-audit gate)

## Process

- A newly accepted CVE gets **one entry here and one in the matching allowlist, added
  together** — never one without the other.
- Every entry carries a **review-by** date. An expired review-by date forces
  re-evaluation: the CVE is no longer silently ignored and the gate goes red until the
  entry is renewed or removed.
- Removing a fixed CVE means deleting both entries.

## Register

### Container images (Trivy)

None accepted yet — [`.trivyignore`](../../.trivyignore) is intentionally empty (strictest gate).

### npm advisories (npm audit)

**Inherited baseline from the v1.6.266 fork base — review-by 2026-10-15.** The npm-audit gate
(`scripts/security/checkNpmAudit.ts`) starts from a snapshot of the high/critical advisories that
already existed in the fork base, so the gate begins green and only **new** advisories block CI.
The authoritative, machine-readable list of the 30 accepted packages (26 high, 4 critical) lives in
[`scripts/security/npmAuditAllowlist.ts`](../../scripts/security/npmAuditAllowlist.ts).

> ⚠️ This is real, inherited security debt — not a clean bill of health. It is accepted **only as a
> baseline**: the `2026-10-15` review-by date makes every entry re-surface the advisory (gate red)
> unless it has been remediated or explicitly renewed by then. Remediation is driven by the weekly
> Dependabot updates (`.github/dependabot.yml`); prefer fixing over renewing.

| Scope | CVE | Severity | Reason | Review-by | Owner |
| --- | --- | --- | --- | --- | --- |
| npm baseline (30 packages, see allowlist) | multiple | high / critical | Inherited from v1.6.266 base; tracked for Dependabot remediation | 2026-10-15 | maintainer |
