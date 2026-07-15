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

| Package / Image | CVE | Severity | Reason | Review-by | Owner |
| --- | --- | --- | --- | --- | --- |
| _(none accepted yet — allowlist intentionally empty)_ | — | — | — | — | — |
