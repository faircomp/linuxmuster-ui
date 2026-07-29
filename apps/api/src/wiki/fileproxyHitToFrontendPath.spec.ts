/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import fileproxyHitToFrontendPath from './fileproxyHitToFrontendPath';

describe('fileproxyHitToFrontendPath', () => {
  it('maps a .wiki/<page>.md hit to the frontend page path', () => {
    const result = fileproxyHitToFrontendPath('/shares/teams/a/.wiki/page.md', {
      sharePath: 'teams/a',
      displayName: 'MyShare',
    });

    expect(result).toBe('MyShare/page');
  });

  it('maps a nested folder index to its frontend path', () => {
    const result = fileproxyHitToFrontendPath('/shares/teams/a/sub/.wiki/index.md', {
      sharePath: 'teams/a',
      displayName: 'MyShare',
    });

    expect(result).toBe('MyShare/sub/index');
  });
});
