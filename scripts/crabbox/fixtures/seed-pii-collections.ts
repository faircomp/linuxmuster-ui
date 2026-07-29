/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import SYNTHETIC_PERSONAS, { personaViolations } from './synthetic-personas';

const TEST_DB_PATTERN = /^test-|[-_](test|e2e)$/i;

const byId = Object.fromEntries(SYNTHETIC_PERSONAS.map((p) => [p.id, p]));

const requirePersona = (id: string) => {
  const found = byId[id];
  if (!found) throw new Error(`Persona fehlt im Katalog: ${id}`);
  return found;
};

const student1 = requirePersona('synth.student.student01');
const student2 = requirePersona('synth.student.student02');
const teacher1 = requirePersona('synth.teacher.teacher01');
const parent1 = requirePersona('synth.parent.parent01');

const buildDocuments = () => ({
  conversations: [
    { _id: 'synth-conv-1', title: 'synth-klassenchat', participants: [student1.username, teacher1.username] },
  ],
  chatmessages: [
    { _id: 'synth-msg-1', conversationId: 'synth-conv-1', sender: teacher1.username, content: 'synthetische Testnachricht' },
    { _id: 'synth-msg-2', conversationId: 'synth-conv-1', sender: student1.username, content: 'synthetische Antwort' },
  ],
  parentchildpairings: [
    { _id: 'synth-pair-1', parent: parent1.username, child: student1.username, code: 'SYNTH-000000' },
  ],
  surveyanswers: [
    { _id: 'synth-ans-1', userId: student2.username, answers: { q1: 'synthetische Freitext-Antwort' } },
  ],
});

const assertPersonasSynthetic = (): void => {
  const offenders = SYNTHETIC_PERSONAS.flatMap((p) => (personaViolations(p).length > 0 ? [p.id] : []));
  if (offenders.length > 0) {
    console.error(`Abbruch: nicht-synthetische Personas: ${offenders.join(', ')}`);
    process.exit(1);
  }
};

const run = async (): Promise<number> => {
  assertPersonasSynthetic();
  const apply = process.argv.includes('--apply');
  const documents = buildDocuments();

  if (!apply) {
    console.info('[seed-pii] DRY-RUN (kein Schreibzugriff) — geplante Inserts:');
    Object.entries(documents).forEach(([collection, docs]) => {
      console.info(`  ${collection}: ${docs.length} Dokument(e)`);
    });
    console.info('[seed-pii] Schreiben mit --apply (nur gegen Test-DB).');
    return 0;
  }

  const dbName = process.env.MONGODB_DATABASE_NAME ?? '';
  if (!TEST_DB_PATTERN.test(dbName)) {
    console.error(`[seed-pii] VERWEIGERT: MONGODB_DATABASE_NAME='${dbName}' ist keine Test-DB (${TEST_DB_PATTERN}).`);
    return 1;
  }

  const { MongoClient } = await import('mongodb');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[seed-pii] MONGODB_URI fehlt.');
    return 1;
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    for (const [collection, docs] of Object.entries(documents)) {
      try {
        const result = await db.collection(collection).insertMany(docs, { ordered: false });
        console.info(`[seed-pii] ${collection}: ${result.insertedCount} Dokument(e) geschrieben nach '${dbName}'.`);
      } catch (error) {
        const code = (error as { code?: number }).code;
        if (code === 11000) {
          console.info(`[seed-pii] ${collection}: bereits vorhanden (idempotent übersprungen).`);
        } else {
          throw error;
        }
      }
    }
    return 0;
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
