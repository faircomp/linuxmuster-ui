# linuxmuster UI

[![Node](https://img.shields.io/badge/node-22.x-brightgreen?style=for-the-badge)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-18.x-blue?style=for-the-badge)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/nestjs-%E2%9D%A4-red?style=for-the-badge)](https://nestjs.com)
[![NX Monorepo](https://img.shields.io/badge/nx-monorepo-blue?style=for-the-badge)](https://nx.dev)
[![License](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=for-the-badge)](https://github.com/faircomp/linuxmuster-ui/blob/main/LICENSE)
[![Community Forum](https://img.shields.io/discourse/users?style=for-the-badge&logo=discourse&logoColor=white&server=https%3A%2F%2Fask.linuxmuster.net)](https://ask.linuxmuster.net)

## Overview

linuxmuster UI is a comprehensive, all-in-one web platform for schools running [linuxmuster.net](https://linuxmuster.net) — a modular, scalable package for multi-school environments that covers the day-to-day of educational operations.

> **Fork notice.** linuxmuster UI is an independent **fork** of edulution (Community Edition) by
> Netzint GmbH / edulution-io. The original is dual-licensed (AGPL-3.0-or-later **or** a Netzint
> commercial license); this fork is distributed **exclusively under the AGPL-3.0-or-later** arm and
> does **not** use the name or logo "edulution". See [`NOTICE`](./NOTICE) for attribution and
> [`TRADEMARK.md`](./TRADEMARK.md) for the trademark statement.

## Development

### Description

A full-stack application built with Vite + React (frontend) and NestJS (API). NX organises the monorepo.

### Maintenance Details

| [Community support](https://ask.linuxmuster.net) | ✅ YES |
| :----------------------------------------------: | :----: |
|                Actively developed                | ✅ YES |

### Getting Started

#### Prerequisites

- Node.js 22 LTS
- Running MongoDB
- Running Redis

#### Public Key

Read the public key and certificate from the OIDC provider (Keycloak >> realm settings >> keys). Then add an `edulution.pem` file to the project root. Insert the key/cert as follows:

```
-----BEGIN CERTIFICATE-----
<CERTIFICATE CONTENT>
-----END CERTIFICATE-----
-----BEGIN PUBLIC KEY-----
<PUBLIC KEY CONTENT>
-----END PUBLIC KEY----
```

#### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Place a `.env` file in apps/api and a `.env.development` file in apps/frontend (`.env.default` as template)

3. Setup redis and mongoDB via `docker-compose.yml`

   ```bash
   docker compose pull
   docker compose up -d
   ```

4. Start API

   ```bash
   npm run api
   ```

   The API will be served on http://localhost:3001/

5. Start Frontend

   ```bash
   npm run dev
   ```

   The frontend will be served on http://localhost:5173/

6. Production build

   ```bash
   npm run build:all
   ```

## Documentation

Project documentation lives in [`docs/`](./docs) and in the [faircomp/linuxmuster-ui](https://github.com/faircomp/linuxmuster-ui) repository.

## Build

#### Build local

```bash
npm run build:all && \
docker build -t ghcr.io/faircomp/linuxmuster-ui -f apps/frontend/Dockerfile . && \
docker build -t ghcr.io/faircomp/linuxmuster-api -f apps/api/Dockerfile . && \
docker compose up -d
```

## Deploy

Use the companion installer [faircomp/linuxmuster-ui-installer](https://github.com/faircomp/linuxmuster-ui-installer) to provision a full stack.

## Operations & DR

Backup/restore and the recurring restore-drill live under `scripts/ops/` (`npm run dr:backup` / `dr:restore` / `dr:drill`); the procedure is in [`docs/ops/dr-runbook.md`](docs/ops/dr-runbook.md). **The DB dump and the master key (`MASTER_ENCRYPT_KEY` / `./data/master.key`) must be backed up together — a restart without persistent `./data` and the key means total, irreversible loss of every stored password.**
