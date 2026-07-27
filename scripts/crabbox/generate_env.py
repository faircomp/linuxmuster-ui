#!/usr/bin/env python3
"""Erzeugt edulution.env, patcht das Realm-Template und schreibt die Traefik-Dynamic-Configs.

Fachliche Quelle (Soll): edulution-installer/apps/webinstaller-api/app/main.py
(`createEdulutionEnvFile`). Dieses Skript ist die Test-Harness-Variante davon fuer den
crabbox-Voll-Stack-Verify; die Templates werden aus dem Installer-Repo gestaged
(scripts/crabbox/stage-templates.sh), NICHT dupliziert.

Eingaben (Env): LMN_HOST, LMN_BINDUSER_DN, LMN_BINDUSER_PW, LMN_LDAP_SCHEMA, LMN_LDAP_PORT,
EDU_EXTERNAL_DOMAIN, EDU_WORKDIR, EDU_TEMPLATES_DIR.
Geheimnisse werden nur in Dateien geschrieben, nie geloggt.
"""

import json
import os
import re
import secrets
import string
import sys

ENV_FILE_NAME = "edulution.env"
REALM_FILE_NAME = "realm-edulution.json"
MASTER_KEY_PATTERN = re.compile(r"^MASTER_ENCRYPT_KEY=([0-9a-f]{64})$")


def generate_secret(length=32):
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def generate_random(length=5):
    return "".join(secrets.choice(string.ascii_lowercase) for _ in range(length))


def resolve_master_encrypt_key(env_path):
    """Bestehenden Key erhalten (Rotation = Datenverlust), sonst neu erzeugen."""
    if os.path.exists(env_path):
        with open(env_path) as env_file:
            for line in env_file:
                match = MASTER_KEY_PATTERN.match(line.strip())
                if match:
                    return match.group(1)
    return secrets.token_hex(32)


def read_existing_env(env_path):
    """Bestehende edulution.env einlesen.

    Re-Deploys MUESSEN dieselben Secrets weiterverwenden: Postgres/Mongo uebernehmen ihr
    Passwort nur bei der Erst-Initialisierung des Datenverzeichnisses, und die Keycloak-
    Client-Secrets stehen nach dem Erst-Import im Realm. Neu gewuerfelte Werte wuerden den
    Stack beim zweiten Lauf zerlegen (FATAL: password authentication failed).
    """
    values = {}
    if not os.path.exists(env_path):
        return values
    with open(env_path) as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            values[key.strip()] = value.strip().strip('"')
    return values


def keep_or_new(existing, key, factory):
    value = existing.get(key)
    return value if value else factory()


def require_env(name):
    value = os.environ.get(name)
    if not value:
        sys.exit(f"generate_env: Pflicht-Env {name} fehlt")
    return value


def patch_realm(templates_dir, workdir, binduser_dn, binduser_pw, ldap_url, external_domain, secrets_map):
    root_dn = re.search(r"(DC=.*$)", binduser_dn, re.IGNORECASE).group(1)
    with open(os.path.join(templates_dir, REALM_FILE_NAME + ".template")) as handle:
        realm = json.load(handle)

    for client in realm["clients"]:
        if client["clientId"] == "edu-api":
            client["secret"] = secrets_map["edu_api"]
        if client["clientId"] == "edu-ui":
            client["secret"] = secrets_map["edu_ui"]
            client["rootUrl"] = f"https://{external_domain}/"
            client["adminUrl"] = f"https://{external_domain}/"
            client["redirectUris"] = [f"https://{external_domain}/*"]
            client["webOrigins"] = [f"https://{external_domain}", "+"]
        if client["clientId"] == "edu-mailcow-sync":
            client["secret"] = secrets_map["edu_mailcow_sync"]

    for comp in realm["components"]["org.keycloak.storage.UserStorageProvider"]:
        if comp["name"] == "ldap":
            for subcomp in comp["subComponents"]["org.keycloak.storage.ldap.mappers.LDAPStorageMapper"]:
                if subcomp["name"] == "global-groups":
                    subcomp["config"]["groups.dn"] = [f"OU=Groups,OU=Global,{root_dn}"]
                if subcomp["name"] == "school-groups":
                    subcomp["config"]["groups.dn"] = [f"OU=SCHOOLS,{root_dn}"]
            comp["config"]["usersDn"] = [root_dn]
            comp["config"]["bindDn"] = [binduser_dn]
            comp["config"]["bindCredential"] = [binduser_pw]
            comp["config"]["connectionUrl"] = [ldap_url]

    realm["attributes"]["frontendUrl"] = f"https://{external_domain}/auth"

    realm_path = os.path.join(workdir, REALM_FILE_NAME)
    with open(realm_path, "w") as handle:
        json.dump(realm, handle)
    os.chmod(realm_path, 0o600)
    return realm_path


def write_traefik_configs(templates_dir, workdir, lmn_host):
    config_dir = os.path.join(workdir, "data", "traefik", "config")
    os.makedirs(config_dir, exist_ok=True)

    with open(os.path.join(templates_dir, "traefik.yml.template")) as handle:
        traefik_yml = handle.read()
    with open(os.path.join(workdir, "traefik.yml"), "w") as handle:
        handle.write(traefik_yml)

    with open(os.path.join(templates_dir, "edulution-default.yml.template")) as handle:
        default_yml = handle.read()
    with open(os.path.join(config_dir, "edulution-default.yml"), "w") as handle:
        handle.write(default_yml)

    with open(os.path.join(config_dir, "lmn-api.yml"), "w") as handle:
        handle.write(
            "http:\n"
            "  routers:\n"
            "    linuxmuster-api:\n"
            '      rule: "PathPrefix(`/api`)"\n'
            "      service: linuxmuster-api\n"
            "      entryPoints:\n"
            "        - websecure\n"
            "      tls: {}\n"
            "      middlewares:\n"
            "        - strip-api-prefix\n"
            "\n"
            "  middlewares:\n"
            "    strip-api-prefix:\n"
            "      stripPrefix:\n"
            "        prefixes:\n"
            '          - "/api"\n'
            "\n"
            "  services:\n"
            "    linuxmuster-api:\n"
            "      loadBalancer:\n"
            "        servers:\n"
            f'          - url: "https://{lmn_host}:8001"\n'
        )

    with open(os.path.join(config_dir, "webdav.yml"), "w") as handle:
        handle.write(
            "http:\n"
            "  routers:\n"
            "    webdav:\n"
            '      rule: "PathPrefix(`/webdav`)"\n'
            "      service: webdav\n"
            "      entryPoints:\n"
            "        - websecure\n"
            "      tls: {}\n"
            "\n"
            "  services:\n"
            "    webdav:\n"
            "      loadBalancer:\n"
            "        servers:\n"
            f'          - url: "https://{lmn_host}/webdav"\n'
        )


def main():
    workdir = require_env("EDU_WORKDIR")
    templates_dir = require_env("EDU_TEMPLATES_DIR")
    lmn_host = require_env("LMN_HOST")
    binduser_dn = require_env("LMN_BINDUSER_DN")
    binduser_pw = require_env("LMN_BINDUSER_PW")
    external_domain = require_env("EDU_EXTERNAL_DOMAIN")
    ldap_schema = os.environ.get("LMN_LDAP_SCHEMA", "ldaps")
    ldap_port = os.environ.get("LMN_LDAP_PORT", "636")

    os.makedirs(workdir, exist_ok=True)
    env_path = os.path.join(workdir, ENV_FILE_NAME)

    existing = read_existing_env(env_path)
    secrets_map = {
        "edu_api": keep_or_new(existing, "KEYCLOAK_EDU_API_CLIENT_SECRET", generate_secret),
        "edu_ui": keep_or_new(existing, "KEYCLOAK_EDU_UI_SECRET", generate_secret),
        "edu_mailcow_sync": keep_or_new(existing, "KEYCLOAK_EDU_MAILCOW_SYNC_SECRET", generate_secret),
    }
    mongodb_secret = keep_or_new(existing, "MONGODB_PASSWORD", generate_secret)
    postgres_secret = keep_or_new(existing, "POSTGRES_PASSWORD", generate_secret)
    keycloak_admin_secret = keep_or_new(existing, "KEYCLOAK_ADMIN_PASSWORD", generate_secret)
    master_encrypt_key = resolve_master_encrypt_key(env_path)
    mailcow_api_secret = keep_or_new(
        existing, "MAILCOW_API_TOKEN", lambda: "-".join(generate_random() for _ in range(5))
    )
    if existing:
        print("generate_env: bestehende Secrets aus edulution.env uebernommen (Re-Deploy-sicher)")

    ldap_url = f"{ldap_schema}://{lmn_host}:{ldap_port}"
    patch_realm(templates_dir, workdir, binduser_dn, binduser_pw, ldap_url, external_domain, secrets_map)
    write_traefik_configs(templates_dir, workdir, lmn_host)

    environment_file = f"""EDULUTION_BASE_DOMAIN={external_domain}

# edulution-api

EDUI_ORGANIZATION_TYPE=school
EDUI_DEPLOYMENT_TARGET=linuxmuster

EDUI_WEBDAV_URL=https://{lmn_host}/webdav/

MONGODB_USERNAME=root
MONGODB_PASSWORD={mongodb_secret}
MONGODB_SERVER_URL=mongodb://root:{mongodb_secret}@edu-db:27017/

KEYCLOAK_EDU_UI_SECRET={secrets_map["edu_ui"]}
KEYCLOAK_EDU_API_CLIENT_SECRET={secrets_map["edu_api"]}

MASTER_ENCRYPT_KEY={master_encrypt_key}

LMN_API_BASE_URL=https://{lmn_host}:8001/v1/

LDAP_EDULUTION_BINDUSER_DN="{binduser_dn}"
LDAP_EDULUTION_BINDUSER_PASSWORD="{binduser_pw}"

EDUI_INITIAL_ADMIN_GROUP="role-globaladministrator"

# edulution-db

MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD={mongodb_secret}

# edulution-keycloak

KC_DB_USERNAME=keycloak
KC_DB_PASSWORD={postgres_secret}

KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD={keycloak_admin_secret}

# edulution-keycloak-db

POSTGRES_USER=keycloak
POSTGRES_PASSWORD={postgres_secret}

# edulution-mail

KEYCLOAK_EDU_MAILCOW_SYNC_SECRET={secrets_map["edu_mailcow_sync"]}
MAILCOW_API_TOKEN={mailcow_api_secret}
MAILCOW_API_URL=https://edu-traefik/sogo-mail
"""

    with open(env_path, "w") as handle:
        handle.write(environment_file)
    os.chmod(env_path, 0o600)

    print(f"generate_env: {env_path} + {REALM_FILE_NAME} + traefik-configs geschrieben")
    print(f"generate_env: ldap={ldap_url} external={external_domain} lmn={lmn_host}")


if __name__ == "__main__":
    main()
