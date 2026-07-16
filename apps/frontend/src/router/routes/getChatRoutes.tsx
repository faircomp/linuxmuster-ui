/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { CHAT_PATH } from '@libs/chat/constants/chatPaths';
import ChatPage from '@/pages/Chat/ChatPage';

const getChatRoutes = () => [
  <Route
    key={CHAT_PATH}
    path={CHAT_PATH}
  >
    <Route
      index
      element={<ChatPage />}
    />
    <Route
      path=":groupType"
      element={<ChatPage />}
    />
    <Route
      path=":groupType/:groupName"
      element={<ChatPage />}
    />
  </Route>,
];

export default getChatRoutes;
