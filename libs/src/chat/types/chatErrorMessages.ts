/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const CHAT_ERROR_MESSAGES = {
  CONVERSATION_NOT_FOUND: 'chat.errors.conversationNotFound',
  GROUP_NOT_FOUND: 'chat.errors.groupNotFound',
  UNAUTHORIZED_ACCESS: 'chat.errors.unauthorizedAccess',
  MESSAGE_SEND_FAILED: 'chat.errors.messageSendFailed',
  INVALID_GROUP_TYPE: 'chat.errors.invalidGroupType',
} as const;

type ChatErrorMessages = (typeof CHAT_ERROR_MESSAGES)[keyof typeof CHAT_ERROR_MESSAGES];

export { CHAT_ERROR_MESSAGES };
export default ChatErrorMessages;
