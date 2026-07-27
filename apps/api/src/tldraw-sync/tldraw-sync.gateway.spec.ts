/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type JwtUser from '@libs/user/types/jwt/jwtUser';

jest.mock('fs', () => ({ readFileSync: jest.fn().mockReturnValue('public-key') }));
jest.mock('@tldraw/sync-core', () => ({}));
jest.mock('./tldraw-sync.service', () => ({ __esModule: true, default: class {} }));

// eslint-disable-next-line import/first
import TLDrawSyncGateway from './tldraw-sync.gateway';

const USER = {
  preferred_username: 'alice',
  family_name: 'Doe',
  given_name: 'Alice',
  sid: 'session-id',
} as JwtUser;

describe('TLDrawSyncGateway session denylist', () => {
  const verifyAsync = jest.fn();
  const isSessionDenied = jest.fn();
  const getPermittedUsers = jest.fn();

  const buildGateway = () =>
    new TLDrawSyncGateway({ getPermittedUsers } as never, { verifyAsync } as never, { isSessionDenied } as never);

  const authenticate = (gateway: TLDrawSyncGateway, client: { close: jest.Mock }) =>
    (
      gateway as unknown as {
        authenticate: (request: unknown, client: unknown) => Promise<Record<string, unknown>>;
      }
    ).authenticate({ url: '/?token=a.token&sessionId=s1&roomId=room-1' }, client);

  beforeEach(() => {
    jest.clearAllMocks();
    verifyAsync.mockResolvedValue(USER);
    isSessionDenied.mockResolvedValue(false);
    getPermittedUsers.mockResolvedValue([{ username: 'alice' }]);
  });

  it('closes the socket and resolves nothing when the session was revoked', async () => {
    isSessionDenied.mockResolvedValue(true);
    const client = { close: jest.fn() };

    await expect(authenticate(buildGateway(), client)).resolves.toEqual({});
    expect(isSessionDenied).toHaveBeenCalledWith(USER.sid);
    expect(client.close).toHaveBeenCalledTimes(1);
    expect(getPermittedUsers).not.toHaveBeenCalled();
  });

  it('resolves the room for a session that is not revoked', async () => {
    const client = { close: jest.fn() };

    const result = await authenticate(buildGateway(), client);

    expect(client.close).not.toHaveBeenCalled();
    expect(getPermittedUsers).toHaveBeenCalled();
    expect(result.roomId).toEqual(expect.stringContaining('room-1'));
    expect(result.attendee).toEqual(expect.objectContaining({ username: 'alice' }));
  });
});
