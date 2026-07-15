/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel and linuxmuster-ui contributors
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * A copy of the license can be found at: https://www.gnu.org/licenses/agpl-3.0.html
 */

import configuration from './configuration';

describe('configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.APP_VERSION;
    delete process.env.COMMIT_SHA;
    delete process.env.BUILD_DATE;
    delete process.env.BUILD_NUMBER;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reads build metadata from the environment when set', () => {
    process.env.APP_VERSION = '2.0.0-test';
    process.env.COMMIT_SHA = 'deadbeef';
    process.env.BUILD_DATE = '2026-07-15';
    process.env.BUILD_NUMBER = '42';

    const config = configuration();

    expect(config.version).toBe('2.0.0-test');
    expect(config.commitSha).toBe('deadbeef');
    expect(config.buildDate).toBe('2026-07-15');
    expect(config.buildNumber).toBe('42');
  });

  it("falls back to 'unknown' when the metadata environment variables are missing", () => {
    const config = configuration();

    expect(config.commitSha).toBe('unknown');
    expect(config.buildDate).toBe('unknown');
    expect(config.buildNumber).toBe('unknown');
  });

  it('falls back to the package.json version when APP_VERSION is missing', () => {
    const config = configuration();

    expect(config.version).toBeTruthy();
    expect(config.version).not.toBe('unknown');
  });
});
