/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import resolveTemplatedShareSharePath from './resolveTemplatedShareSharePath';

describe('resolveTemplatedShareSharePath', () => {
  it('returns the normalized explicit sharePath when present', () => {
    expect(resolveTemplatedShareSharePath({ sharePath: '/teams/a/' }, '')).toBe('teams/a');
  });

  it('resolves a home-directory-templated share from the LDAP home directory', () => {
    const share = { sharePath: '', pathVariables: [{ value: 'home', label: 'homeDirectory' }] };

    expect(resolveTemplatedShareSharePath(share, '\\\\server\\students\\alice')).toBe('students/alice');
  });

  it('returns an empty string for a templated share without a resolvable home directory', () => {
    const share = { sharePath: '', pathVariables: [{ value: 'home', label: 'homeDirectory' }] };

    expect(resolveTemplatedShareSharePath(share, '')).toBe('');
  });

  it('returns an empty string when no explicit path and no home-directory variable exist', () => {
    const share = { sharePath: '', pathVariables: [{ value: 'x', label: 'somethingElse' }] };

    expect(resolveTemplatedShareSharePath(share, '\\\\server\\students\\alice')).toBe('');
  });
});
