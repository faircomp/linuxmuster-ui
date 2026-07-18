/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import FilesharingService from './filesharing.service';

describe('FilesharingService.getCollaboraToken', () => {
  const tokenResponse = { accessToken: 'token', accessTokenTTL: 123 };
  const mockCollaboraService = { generateWopiToken: jest.fn().mockResolvedValue(tokenResponse) };

  const buildService = () =>
    new FilesharingService(
      null as never,
      null as never,
      null as never,
      null as never,
      null as never,
      null as never,
      null as never,
      mockCollaboraService as never,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to the collabora service and returns the WOPI token response', async () => {
    const service = buildService();

    const result = await service.getCollaboraToken('jane', '/webdav/doc.odt', 'share-1');

    expect(mockCollaboraService.generateWopiToken).toHaveBeenCalledWith('jane', '/webdav/doc.odt', 'share-1', true);
    expect(result).toBe(tokenResponse);
  });

  it('forwards an explicit read-only flag', async () => {
    const service = buildService();

    await service.getCollaboraToken('jane', '/webdav/doc.odt', 'share-1', false);

    expect(mockCollaboraService.generateWopiToken).toHaveBeenCalledWith('jane', '/webdav/doc.odt', 'share-1', false);
  });
});
