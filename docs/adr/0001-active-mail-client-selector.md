# 1. `ACTIVE_MAIL_CLIENT` selector — keep both native mail and SOGo

## Status

Accepted (fork decision, spec §9.10).

## Context

- Upstream **edulution 2.0 deleted SOGo** and moved to a fully native IMAP/SMTP
  webmail client.
- This fork wants **both**: the mature SOGo webmail (as today) **and** an optional
  native client — delivered as **one** Mail app, switched by a selector.
- Precedent already exists in 2.0: `ACTIVE_DOCUMENT_EDITOR`
  (`ONLY_OFFICE` ⟷ `COLLABORA`) uses an `extendedOption` on the app config to pick
  an implementation. `ACTIVE_MAIL_CLIENT` reuses that plumbing.

## Decision

Introduce an `ACTIVE_MAIL_CLIENT` extended option on the Mail app config, values
`sogo` ⟷ `native`, **default `sogo`**, read through a single helper
`getActiveMailClient(appConfigs)` (the only read point, for drift protection).

1. **Deliberate fork divergence.** 2.0 removed SOGo; the fork keeps both. This is an
   intentional, documented departure from upstream, not accidental drift.
2. **The selector switches only the frontend surface, never containers.** This is the
   core asymmetry to `ACTIVE_DOCUMENT_EDITOR` (which also swaps the OnlyOffice/Collabora
   *containers*). Both `native` and `sogo` are served by the **same single Mailcow
   stack**. Consequently there is **no per-route 403 access guard** for the selector
   (YAGNI — nothing container-level is gated).
3. **Two orthogonal axes.**
   - (a) End-user webmail surface = `native` ⟷ `sogo` (the selector).
   - (b) The Mailcow **admin** panel = **always native, always present**, and is **not**
     part of the selector.
4. **`ACTIVE_MAIL_CLIENT = sogo` is the documented kill-switch / rollback anchor.**

## Consequences

### Benefits

- The native client can be merged, piloted and rolled back incrementally instead of in
  one risky cut-over.
- Phase 2 (native Mailcow admin panel) delivers standalone value **even if Phase 3**
  (the native IMAP/SMTP client) is never built — SOGo cannot manage domains/mailboxes.

### Costs (unvarnished)

- The SOGo theme supply chain stays in the picture.
- A second iframe lives in memory alongside the native shell.
- State can drift between the native and SOGo views (unread counts, drafts, sessions).
- Token-rotation has an extra edge (two auth surfaces).
- Permanent maintenance load: **every** upstream 2.0 mail change must also be checked
  against the SOGo path.

### What it does **not** save

- The selector saves **no** engineering effort on the native client itself. Its only job
  is to make that client incrementally mergeable, pilotable and one-click reversible.

## Kill-switch (operations)

To revert the Mail app to the pure SOGo iframe (behaviour identical to the pre-fork
1.6 baseline): set the Mail app's `ACTIVE_MAIL_CLIENT` extended option to `sogo`, or
remove it entirely. Because `sogo` is the **default**, no action is required to stay on
SOGo — a fresh install already behaves exactly as before.

## Future hook

A **per-user** selector (a preference under `apps/api/src/user-preferences/`) is a
possible future extension. It is deliberately **out of scope** for the core selector,
which is an admin-level app-config option.
