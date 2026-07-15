/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { MongoClient } from 'mongodb';

const TERMINAL_SCHEMA_VERSIONS = {
  appconfigs: 13,
  globalsettings: 8,
  surveytemplates: 4,
  surveyanswers: 4,
  notifications: 2,
  publicshares: 2,
  surveys: 2,
  users: 1,
  webdavshares: 1,
  bulletincategories: 1,
  bulletins: 1,
} as const;

const WRAPPED_KEY_PREFIX = 'wrapped:';
const MAIL_IMAP_URL_KEY = 'MAIL_IMAP_URL';

type CollectionName = keyof typeof TERMINAL_SCHEMA_VERSIONS;

interface CheckResult {
  label: string;
  ok: boolean;
  detail: string;
}

const maxSchemaVersion = async (client: MongoClient, dbName: string, collection: CollectionName): Promise<number | null> => {
  const coll = client.db(dbName).collection(collection);
  if ((await coll.estimatedDocumentCount()) === 0) return null;
  const [top] = await coll.aggregate<{ v: number }>([{ $group: { _id: null, v: { $max: '$schemaVersion' } } }]).toArray();
  return top?.v ?? 0;
};

const assertTerminalVersions = async (client: MongoClient, dbName: string): Promise<CheckResult[]> => {
  const entries = Object.entries(TERMINAL_SCHEMA_VERSIONS) as [CollectionName, number][];
  return Promise.all(
    entries.map(async ([collection, expected]) => {
      const actual = await maxSchemaVersion(client, dbName, collection);
      if (actual === null) return { label: `schemaVersion ${collection}`, ok: true, detail: `leer (skip)` };
      return { label: `schemaVersion ${collection}`, ok: actual === expected, detail: `erwartet ${expected}, ist ${actual}` };
    }),
  );
};

const assertSpotChecks = async (client: MongoClient, dbName: string): Promise<CheckResult[]> => {
  const db = client.db(dbName);
  const results: CheckResult[] = [];

  const mailWithLegacyKey = await db
    .collection('appconfigs')
    .countDocuments({ [`extendedOptions.MAIL.${MAIL_IMAP_URL_KEY}`]: { $exists: true } });
  results.push({
    label: 'appConfig MAIL extendedOptions unified',
    ok: mailWithLegacyKey === 0,
    detail: `${mailWithLegacyKey} Docs mit ${MAIL_IMAP_URL_KEY}`,
  });

  const usersTotal = await db.collection('users').countDocuments({ encryptKey: { $exists: true, $ne: null } });
  const usersWrapped = await db
    .collection('users')
    .countDocuments({ encryptKey: { $regex: `^${WRAPPED_KEY_PREFIX}` } });
  results.push({
    label: 'users.encryptKey wrapped',
    ok: usersTotal === usersWrapped,
    detail: `${usersWrapped}/${usersTotal} gewrappt`,
  });

  const sharesTotal = await db.collection('publicshares').estimatedDocumentCount();
  const sharesWithoutAcl = await db.collection('publicshares').countDocuments({ acl: { $exists: false } });
  results.push({
    label: 'publicShares haben acl',
    ok: sharesTotal === 0 || sharesWithoutAcl === 0,
    detail: `${sharesWithoutAcl} ohne acl (von ${sharesTotal})`,
  });

  return results;
};

const run = async (): Promise<number> => {
  const uri = process.env.MONGO_URI ?? process.argv[2];
  const dbName = process.env.MONGO_DB ?? process.argv[3] ?? 'edulution';
  if (!uri) {
    console.error('MONGO_URI fehlt: MONGO_URI=… assert-schema-versions.ts [db]');
    return 2;
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const results = [...(await assertTerminalVersions(client, dbName)), ...(await assertSpotChecks(client, dbName))];
    results.forEach((r) => {
      const line = `${r.ok ? 'OK  ' : 'FAIL'}  ${r.label} — ${r.detail}`;
      if (r.ok) console.info(line);
      else console.error(line);
    });
    const failed = results.filter((r) => !r.ok).length;
    console.info(`\n${results.length - failed}/${results.length} grün`);
    return failed === 0 ? 0 : 1;
  } finally {
    await client.close();
  }
};

run()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
