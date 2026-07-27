#!/usr/bin/env python3
"""Playwright-Login + Modul-Screenshots gegen den deployten Stack auf der crabbox.

Erfolgskriterium (hart): nach dem Login landet der Browser auf /dashboard (NICHT /login)
und `GET /edu-api/lmn-api/auth` liefert 200 — das beweist die Bindung an das echte
linuxmuster-api7. Ohne beides ist der Verify NICHT gruen.

Stolpersteine (aus dem /test-Rezept):
- Das Login-Formular ist edulutions EIGENES (input[name=username]), nicht die Keycloak-Seite.
- Nach dem Login NICHT auf `networkidle` warten: die App haelt eine SSE-Verbindung offen.
- Self-signed TLS -> ignore_https_errors.

Zugangsdaten kommen aus der Env (EDU_ADMIN_USER/EDU_ADMIN_PW) und werden nie geloggt.
"""

import json
import os
import sys

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("EDU_BASE_URL", "https://localhost")
USERNAME = os.environ.get("EDU_ADMIN_USER", "global-admin")
PASSWORD = os.environ.get("EDU_ADMIN_PW", "")
OUT_DIR = os.environ.get("EDU_SHOTS_DIR", os.path.expanduser("~/edulution-shots"))
NAV_TIMEOUT_MS = 45000
SETTLE_MS = 4000

MODULES = [
    ("dashboard", "/dashboard"),
    ("filesharing", "/filesharing"),
    ("conferences", "/conferences"),
    ("mail", "/mail"),
    ("classmanagement", "/classmanagement"),
    ("bulletinboard", "/bulletinboard"),
    ("surveys", "/surveys"),
    ("whiteboard", "/whiteboard"),
    ("settings", "/settings"),
]


def main():
    if not PASSWORD:
        sys.exit("shots: EDU_ADMIN_PW fehlt (Zugang wird nur ueber Env gereicht)")
    os.makedirs(OUT_DIR, exist_ok=True)
    report = {"base_url": BASE_URL, "login": {}, "modules": [], "lmn_api": {}}

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = browser.new_context(ignore_https_errors=True, viewport={"width": 1600, "height": 1000})
        page = context.new_page()
        page.set_default_timeout(NAV_TIMEOUT_MS)

        api_calls = {}

        def record_response(response):
            if "/edu-api/lmn-api/auth" in response.url:
                api_calls["lmn_auth_status"] = response.status

        page.on("response", record_response)

        page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
        page.wait_for_timeout(SETTLE_MS)
        page.screenshot(path=os.path.join(OUT_DIR, "00-login.png"), full_page=True)

        page.fill("input[name=username]", USERNAME)
        page.fill("input[name=password]", PASSWORD)
        page.click("button[type=submit]")
        page.wait_for_timeout(SETTLE_MS * 3)

        landed = page.url
        report["login"] = {
            "url": landed,
            "on_dashboard": "/dashboard" in landed,
            "still_on_login": landed.rstrip("/").endswith("/login") or landed.rstrip("/") == BASE_URL.rstrip("/"),
        }
        page.screenshot(path=os.path.join(OUT_DIR, "01-after-login.png"), full_page=True)

        if report["login"]["on_dashboard"]:
            for name, path in MODULES:
                entry = {"module": name, "path": path}
                try:
                    page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded")
                    page.wait_for_timeout(SETTLE_MS)
                    shot = os.path.join(OUT_DIR, f"{name}.png")
                    page.screenshot(path=shot, full_page=True)
                    body = page.inner_text("body")[:400]
                    entry.update(
                        {
                            "url": page.url,
                            "screenshot": os.path.basename(shot),
                            "rendered": len(body.strip()) > 0,
                            "kicked_to_login": "/login" in page.url,
                        }
                    )
                except Exception as exc:  # noqa: BLE001 - Report statt Abbruch
                    entry.update({"error": type(exc).__name__})
                report["modules"].append(entry)

        report["lmn_api"] = {"auth_status": api_calls.get("lmn_auth_status")}
        context.close()
        browser.close()

    with open(os.path.join(OUT_DIR, "report.json"), "w") as handle:
        json.dump(report, handle, indent=2)

    print(json.dumps(report, indent=2))
    ok = report["login"]["on_dashboard"] and report["lmn_api"].get("auth_status") == 200
    print(f"SHOTS-RESULT: {'PASS' if ok else 'FAIL'}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
