# Choosing the document editor (OnlyOffice or Collabora)

edulution can open office documents in either OnlyOffice or Collabora Online. An administrator chooses the editor per instance.

## Where to configure it

Settings → App configuration → Files → "Document editor". The section is only visible to administrators.

## What it does

- **Document editor**: selects which editor opens office documents — OnlyOffice (default) or Collabora Online. The choice takes effect for newly opened documents.
- **Collabora URL**: the base URL of your Collabora Online instance (used only when Collabora is selected).
- **Collabora WOPI secret**: the shared secret used to sign the WOPI access tokens that Collabora presents when it calls back into edulution.

## Collabora container contract

The Collabora WOPI secret must match the secret configured in the `edulution-collabora` container (rolled out through the app store). If the two differ, Collabora's WOPI callbacks are rejected and documents fail to open. The secret is never exposed to non-admin users.

## Notes

- Switching the editor only changes which viewer opens office documents; existing files are untouched.
- Selecting Collabora without a configured Collabora URL falls back to OnlyOffice.
- OnlyOffice and Collabora are configured independently in their own sections; changing one does not affect the other.
- No new environment variable default is introduced; the values live in the app configuration.
