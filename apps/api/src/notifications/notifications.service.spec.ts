/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Types } from 'mongoose';
import NOTIFICATION_SOURCE_TYPE from '@libs/notification/constants/notificationSourceType';
import NotificationsService from './notifications.service';

const SOURCE_ID = 'adminclass/07a';
const USERNAME = 'alice';

describe('NotificationsService.markNotificationReadBySource', () => {
  const notificationModel = { findOne: jest.fn() };
  const userNotificationModel = { updateOne: jest.fn() };
  const service = new NotificationsService(
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    notificationModel as never,
    userNotificationModel as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks the source notification as read for the user without bumping timestamps', async () => {
    const notificationId = new Types.ObjectId();
    notificationModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ id: notificationId.toString() }),
    });

    await service.markNotificationReadBySource(NOTIFICATION_SOURCE_TYPE.CHAT, SOURCE_ID, USERNAME);

    expect(userNotificationModel.updateOne).toHaveBeenCalledTimes(1);
    const [filter, update, options] = userNotificationModel.updateOne.mock.calls[0] as [
      { notificationId: Types.ObjectId; username: string },
      { $set: { readAt: Date } },
      { timestamps: boolean },
    ];
    expect(filter.username).toBe(USERNAME);
    expect(filter.notificationId.toString()).toBe(notificationId.toString());
    expect(update.$set.readAt).toBeInstanceOf(Date);
    expect(options.timestamps).toBe(false);
  });

  it('does nothing when no notification exists for the source', async () => {
    notificationModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await service.markNotificationReadBySource(NOTIFICATION_SOURCE_TYPE.CHAT, SOURCE_ID, USERNAME);

    expect(userNotificationModel.updateOne).not.toHaveBeenCalled();
  });
});
