/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const SYNTHETIC_NAMESPACE = {
  prefix: 'synth.',
  school: 'test-schule',
  domain: '@example.invalid',
} as const;

const PERSONA_ROLE = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  PARENT: 'parent',
} as const;

type PersonaRole = (typeof PERSONA_ROLE)[keyof typeof PERSONA_ROLE];

interface SyntheticPersona {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: PersonaRole;
  isMinor: boolean;
  school: string;
}

const persona = (
  slug: string,
  firstName: string,
  lastName: string,
  role: PersonaRole,
  isMinor: boolean,
): SyntheticPersona => ({
  id: `${SYNTHETIC_NAMESPACE.prefix}${role}.${slug}`,
  username: `${SYNTHETIC_NAMESPACE.prefix}${slug}`,
  email: `${SYNTHETIC_NAMESPACE.prefix}${slug}${SYNTHETIC_NAMESPACE.domain}`,
  firstName,
  lastName,
  role,
  isMinor,
  school: SYNTHETIC_NAMESPACE.school,
});

const SYNTHETIC_PERSONAS: SyntheticPersona[] = [
  persona('student01', 'Alva', 'Muster', PERSONA_ROLE.STUDENT, true),
  persona('student02', 'Bo', 'Beispiel', PERSONA_ROLE.STUDENT, true),
  persona('teacher01', 'Cleo', 'Lehrkraft', PERSONA_ROLE.TEACHER, false),
  persona('teacher02', 'Dana', 'Dozent', PERSONA_ROLE.TEACHER, false),
  persona('parent01', 'Eike', 'Eltern', PERSONA_ROLE.PARENT, false),
];

const personaViolations = (candidate: SyntheticPersona): string[] => {
  const problems: string[] = [];
  if (!candidate.id.startsWith(SYNTHETIC_NAMESPACE.prefix)) problems.push(`id: ${candidate.id}`);
  if (!candidate.username.startsWith(SYNTHETIC_NAMESPACE.prefix)) problems.push(`username: ${candidate.username}`);
  if (!candidate.email.endsWith(SYNTHETIC_NAMESPACE.domain)) problems.push(`email: ${candidate.email}`);
  if (candidate.school !== SYNTHETIC_NAMESPACE.school) problems.push(`school: ${candidate.school}`);
  return problems;
};

export { SYNTHETIC_NAMESPACE, PERSONA_ROLE, SYNTHETIC_PERSONAS, personaViolations };
export type { SyntheticPersona, PersonaRole };
export default SYNTHETIC_PERSONAS;
