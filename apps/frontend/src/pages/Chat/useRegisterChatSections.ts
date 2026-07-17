/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type Section from '@libs/menubar/section';
import { CHAT_CLASSES_LOCATION, CHAT_PATH, CHAT_PROJECTS_LOCATION } from '@libs/chat/constants/chatPaths';
import GroupTypeLocation from '@libs/chat/types/groupTypeLocation';
import SOPHOMORIX_GROUP_TYPES from '@libs/lmnApi/constants/sophomorixGroupTypes';
import SSE_MESSAGE_TYPE from '@libs/common/constants/sseMessageType';
import useChatStore from '@/store/useChatStore';
import useSubMenuStore from '@/store/useSubMenuStore';
import useSseEventListener from '@/hooks/useSseEventListener';

const isValidGroupType = (value: string | undefined): value is GroupTypeLocation =>
  value === CHAT_CLASSES_LOCATION || value === CHAT_PROJECTS_LOCATION;

const useRegisterChatSections = () => {
  const navigate = useNavigate();
  const { groupType } = useParams<{ groupType: string; groupName: string }>();
  const { userGroups, fetchUserGroups, unreadCounts, fetchUnreadCounts } = useChatStore();
  const { setSections } = useSubMenuStore();

  useEffect(() => {
    if (!userGroups) {
      void fetchUserGroups();
    }
  }, [userGroups, fetchUserGroups]);

  useEffect(() => {
    void fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  const refreshUnreadCounts = useCallback(() => {
    void fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  useSseEventListener(SSE_MESSAGE_TYPE.CHAT_NEW_MESSAGE, refreshUnreadCounts, { enabled: true });
  useSseEventListener(SSE_MESSAGE_TYPE.CHAT_READ_STATUS_UPDATED, refreshUnreadCounts, { enabled: true });

  const sections: Section[] = useMemo(() => {
    if (!userGroups || !isValidGroupType(groupType)) return [];

    const groups = groupType === CHAT_CLASSES_LOCATION ? userGroups.classes : userGroups.projects;
    const conversationType =
      groupType === CHAT_CLASSES_LOCATION ? SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS : SOPHOMORIX_GROUP_TYPES.PROJECT;

    return groups.map((group) => {
      const unread = unreadCounts.find(
        (count) => count.conversationType === conversationType && count.groupName === group.name,
      );

      return {
        id: group.name,
        label: unread && unread.count > 0 ? `${group.name} (${unread.count})` : group.name,
        action: () => navigate(`/${CHAT_PATH}/${groupType}/${encodeURIComponent(group.name)}`),
      };
    });
  }, [userGroups, groupType, navigate, unreadCounts]);

  useEffect(() => {
    setSections(sections);
    return () => setSections([]);
  }, [sections, setSections]);
};

export default useRegisterChatSections;
