#!/usr/bin/env python3
"""Modul-Verify gegen den deployten Stack: Guard-Treue + echte Route-Antworten.

Prueft je Route ZWEI Dinge:
  1. ohne Token -> muss 401 sein (kein Auth-Bypass; das ist der Guardrail aus CLAUDE.md)
  2. mit Token  -> tatsaechlicher Status/Payload gegen das echte LMN

Reines Lesen: keine Route veraendert den LMN-Zustand. Zugangsdaten kommen aus der Env
und werden nie geloggt.
"""

import json
import os
import sys
import urllib.parse
import urllib.request
import ssl

BASE = os.environ.get("EDU_BASE_URL", "https://localhost")
USER = os.environ.get("EDU_ADMIN_USER", "global-admin")
PW = os.environ.get("EDU_ADMIN_PW", "")
CLIENT_SECRET = os.environ.get("EDU_UI_SECRET", "")

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

READ_ROUTES = [
    ("chat", "/edu-api/chat/groups"),
    ("chat", "/edu-api/chat/unread-counts"),
    ("wiki", "/edu-api/wiki/shares"),
    ("calendar", "/edu-api/calendar/calendars"),
    ("parent-child-pairing", "/edu-api/parent-child-pairing/all"),
    ("linbo", "/edu-api/lmn-api/linbo/health"),
    ("linbo", "/edu-api/lmn-api/linbo/server-info"),
    ("linbo", "/edu-api/lmn-api/linbo/grub-configs"),
    ("linbo", "/edu-api/lmn-api/linbo/changes?since=0"),
    ("linbo", "/edu-api/lmn-api/linbo/images/manifest"),
]


def call(path, token=None, extra_headers=None, method="GET", body=None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    if body is not None:
        req.add_header("Content-Type", "application/json")
    for key, value in (extra_headers or {}).items():
        req.add_header(key, value)
    try:
        with urllib.request.urlopen(req, timeout=30, context=CTX) as resp:
            payload = resp.read(600).decode("utf-8", "replace")
            return resp.status, payload
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read(400).decode("utf-8", "replace")
    except Exception as exc:  # noqa: BLE001
        return None, f"{type(exc).__name__}"


def get_token():
    data = urllib.parse.urlencode(
        {
            "grant_type": "password",
            "client_id": "edu-ui",
            "client_secret": CLIENT_SECRET,
            "username": USER,
            "password": PW,
        }
    ).encode()
    req = urllib.request.Request(
        f"{BASE}/auth/realms/edulution/protocol/openid-connect/token", data=data, method="POST"
    )
    with urllib.request.urlopen(req, timeout=30, context=CTX) as resp:
        return json.loads(resp.read())["access_token"]


def main():
    if not PW or not CLIENT_SECRET:
        sys.exit("module_verify: EDU_ADMIN_PW / EDU_UI_SECRET fehlen")

    token = get_token()
    print("token: OK")

    lmn_status, lmn_body = call("/edu-api/lmn-api/auth", token=token)
    lmn_token = ""
    try:
        parsed = json.loads(lmn_body)
        lmn_token = parsed if isinstance(parsed, str) else parsed.get("token", "")
    except Exception:  # noqa: BLE001
        lmn_token = lmn_body.strip().strip('"')
    print(f"lmn-api/auth: HTTP={lmn_status} token={'ja' if lmn_token else 'nein'}")

    results = []
    for module, path in READ_ROUTES:
        unauth_status, _ = call(path)
        headers = {"x-api-key": lmn_token} if module == "linbo" and lmn_token else None
        auth_status, auth_body = call(path, token=token, extra_headers=headers)
        results.append(
            {
                "module": module,
                "path": path,
                "unauth": unauth_status,
                "guard_ok": unauth_status == 401,
                "auth": auth_status,
                "snippet": auth_body[:120].replace("\n", " "),
            }
        )

    print(f"\n{'MODUL':<22}{'ROUTE':<46}{'OHNE':<7}{'GUARD':<8}{'MIT':<6}")
    for r in results:
        guard = "OK" if r["guard_ok"] else "BYPASS!"
        print(f"{r['module']:<22}{r['path'][:44]:<46}{str(r['unauth']):<7}{guard:<8}{str(r['auth']):<6}")

    bypass = [r for r in results if not r["guard_ok"]]
    print("\n--- Details (mit Token) ---")
    for r in results:
        print(f"{r['module']}/{r['path'].rsplit('/', 1)[-1]}: {r['auth']} {r['snippet'][:100]}")

    with open(os.path.expanduser("~/edulution-shots/module-report.json"), "w") as handle:
        json.dump({"lmn_auth": lmn_status, "routes": results}, handle, indent=2)

    print(f"\nGUARD-CONTRACT: {'PASS' if not bypass else 'FAIL (' + str(len(bypass)) + ' Bypass)'}")
    sys.exit(0 if not bypass else 1)


if __name__ == "__main__":
    main()
