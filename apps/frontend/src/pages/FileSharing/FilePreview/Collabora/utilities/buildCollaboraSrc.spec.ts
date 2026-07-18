/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect } from 'vitest';
import { buildWopiSrc, buildCollaboraEditorUrl } from './buildCollaboraSrc';

describe('buildCollaboraSrc', () => {
  describe('buildWopiSrc', () => {
    it('builds the WOPI source from the api base url and file id', () => {
      expect(buildWopiSrc('https://edu.example/edu-api', 'file-1')).toBe(
        'https://edu.example/edu-api/wopi/files/file-1',
      );
    });
  });

  describe('buildCollaboraEditorUrl', () => {
    it('builds the collabora editor url with an encoded WOPISrc parameter', () => {
      const wopiSrc = 'https://edu.example/edu-api/wopi/files/file-1';

      expect(buildCollaboraEditorUrl('https://collabora.example', wopiSrc)).toBe(
        `https://collabora.example/browser/dist/cool.html?WOPISrc=${encodeURIComponent(wopiSrc)}`,
      );
    });

    it('encodes reserved characters in the WOPISrc', () => {
      const url = buildCollaboraEditorUrl('https://collabora.example', 'https://edu.example/edu-api/wopi/files/a b');

      expect(url).toContain('WOPISrc=https%3A%2F%2Fedu.example');
      expect(url).not.toContain('WOPISrc=https://');
    });
  });
});
