/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

interface ChatReadReceipt {
  username: string;
  firstName: string;
  lastName: string;
  readAt: string | null;
}

export default ChatReadReceipt;
