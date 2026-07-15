/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import SYNTHETIC_PERSONAS, { SYNTHETIC_NAMESPACE, personaViolations, PERSONA_ROLE } from './synthetic-personas';
import type { SyntheticPersona } from './synthetic-personas';

const REAL_PII_PROBE: SyntheticPersona = {
  id: 'real.user.42',
  username: 'jdoe',
  email: 'john.doe@realschool.example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: PERSONA_ROLE.STUDENT,
  isMinor: true,
  school: 'realschule-berlin',
};

const run = (): number => {
  if (personaViolations(REAL_PII_PROBE).length === 0) {
    console.error('Gate defekt: eine Nicht-synth.-Kennung wurde NICHT beanstandet.');
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
