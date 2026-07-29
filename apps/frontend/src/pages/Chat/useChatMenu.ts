/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { faUsers, faUserGear } from '@fortawesome/free-solid-svg-icons';
import APPS from '@libs/appconfig/constants/apps';
import MenuBarEntry from '@libs/menubar/menuBarEntry';
import {
  CHAT_CLASSES_LOCATION,
  CHAT_CLASSES_PATH,
  CHAT_PROJECTS_LOCATION,
  CHAT_PROJECTS_PATH,
} from '@libs/chat/constants/chatPaths';
import { ContactIcon } from '@/assets/icons';

const useChatMenu = (): MenuBarEntry => {
  const navigate = useNavigate();

  const navigateToClasses = useCallback(() => navigate(`/${CHAT_CLASSES_PATH}`), [navigate]);
  const navigateToProjects = useCallback(() => navigate(`/${CHAT_PROJECTS_PATH}`), [navigate]);

  return useMemo(
    () => ({
      title: 'chat.title',
      icon: ContactIcon,
      color: 'hover:bg-ciGreenToBlue',
      appName: APPS.CHAT,
      menuItems: [
        {
          id: CHAT_CLASSES_LOCATION,
          label: 'chat.schoolClasses',
          icon: faUsers,
          action: navigateToClasses,
        },
        {
          id: CHAT_PROJECTS_LOCATION,
          label: 'chat.projects',
          icon: faUserGear,
          action: navigateToProjects,
        },
      ],
    }),
    [navigateToClasses, navigateToProjects],
  );
};

export default useChatMenu;
