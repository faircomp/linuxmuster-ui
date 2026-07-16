/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * SPDX-FileCopyrightText: 2026 Kevin Stenzel
 */

import getLogLevels from './getLogLevels';

describe('getLogLevels', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns the production-safe subset for an empty value in production', () => {
    process.env.NODE_ENV = 'production';
    expect(getLogLevels(undefined)).toEqual(['error', 'warn', 'log']);
  });

  it('returns every level for an empty value outside production', () => {
    process.env.NODE_ENV = 'development';
    expect(getLogLevels('')).toEqual(['error', 'warn', 'log', 'debug', 'verbose', 'fatal']);
  });

  it('disables logging for "off"', () => {
    expect(getLogLevels('off')).toBeUndefined();
  });

  it('falls back to [error, warn, log] for an unknown value', () => {
    process.env.NODE_ENV = 'production';
    expect(getLogLevels('nonsense')).toEqual(['error', 'warn', 'log']);
  });

  it('includes everything up to the named level (slice boundary)', () => {
    expect(getLogLevels('debug')).toEqual(['error', 'warn', 'log', 'debug']);
  });
});
