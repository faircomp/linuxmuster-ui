/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import compareSecretsConstantTime from '@libs/common/utils/compareSecretsConstantTime';

describe('compareSecretsConstantTime', () => {
  it('accepts two identical secrets', () => {
    expect(compareSecretsConstantTime('s3cr3t-token', 's3cr3t-token')).toBe(true);
  });

  it('rejects two different secrets of the same length', () => {
    expect(compareSecretsConstantTime('s3cr3t-token', 's3cr3t-tokeN')).toBe(false);
  });

  it('rejects secrets of different lengths instead of throwing, which would leak the length', () => {
    expect(() => compareSecretsConstantTime('short', 'a-considerably-longer-secret')).not.toThrow();
    expect(compareSecretsConstantTime('short', 'a-considerably-longer-secret')).toBe(false);
  });

  it('treats two empty strings as equal', () => {
    expect(compareSecretsConstantTime('', '')).toBe(true);
  });

  it('rejects an empty string against a non-empty secret', () => {
    expect(compareSecretsConstantTime('', 'secret')).toBe(false);
  });
});
