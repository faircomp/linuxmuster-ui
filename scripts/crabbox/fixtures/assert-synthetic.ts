/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import SYNTHETIC_PERSONAS, { SYNTHETIC_NAMESPACE, personaViolations } from './synthetic-personas';
import type { SyntheticPersona } from './synthetic-personas';

const [validPersona] = SYNTHETIC_PERSONAS;

const SELF_TEST_PROBES: Record<string, SyntheticPersona> = {
  id: { ...validPersona, id: 'real.user.42' },
  username: { ...validPersona, username: 'jdoe' },
  email: { ...validPersona, email: 'john.doe@realschool.example.com' },
  school: { ...validPersona, school: 'realschule-berlin' },
};

const run = (): number => {
  const undetected = Object.entries(SELF_TEST_PROBES)
    .filter(([, probe]) => personaViolations(probe).length === 0)
    .map(([field]) => field);
  if (undetected.length > 0) {
    console.error(`Gate defekt: Nicht-synth.-Werte NICHT beanstandet in: ${undetected.join(', ')}`);
    return 1;
  }

  const offenders = SYNTHETIC_PERSONAS.flatMap((entry) => {
    const problems = personaViolations(entry);
    return problems.length > 0 ? [`${entry.id} -> ${problems.join(', ')}`] : [];
  });

  if (offenders.length > 0) {
    console.error(`Nicht-synthetische PII im Persona-Katalog (Namensraum ${SYNTHETIC_NAMESPACE.prefix}):`);
    offenders.forEach((offender) => console.error(`  ${offender}`));
    return 1;
  }

  console.error(`${SYNTHETIC_PERSONAS.length} Personas geprüft — alle im synthetischen Namensraum.`);
  return 0;
};

process.exit(run());
