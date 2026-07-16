/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type Section from '@libs/menubar/section';
import { CHAT_CLASSES_LOCATION, CHAT_PATH, CHAT_PROJECTS_LOCATION } from '@libs/chat/constants/chatPaths';
import GroupTypeLocation from '@libs/chat/types/groupTypeLocation';
import useChatStore from '@/store/useChatStore';
import useSubMenuStore from '@/store/useSubMenuStore';

const isValidGroupType = (value: string | undefined): value is GroupTypeLocation =>
  value === CHAT_CLASSES_LOCATION || value === CHAT_PROJECTS_LOCATION;

const useRegisterChatSections = () => {
  const navigate = useNavigate();
  const { groupType } = useParams<{ groupType: string; groupName: string }>();
  const { userGroups, fetchUserGroups } = useChatStore();
  const { setSections } = useSubMenuStore();

  useEffect(() => {
    if (!userGroups) {
      void fetchUserGroups();
    }
  }, [userGroups, fetchUserGroups]);

  const sections: Section[] = useMemo(() => {
    if (!userGroups || !isValidGroupType(groupType)) return [];

    const groups = groupType === CHAT_CLASSES_LOCATION ? userGroups.classes : userGroups.projects;

    return groups.map((group) => ({
      id: group.name,
      label: group.name,
      action: () => navigate(`/${CHAT_PATH}/${groupType}/${encodeURIComponent(group.name)}`),
    }));
  }, [userGroups, groupType, navigate]);

  useEffect(() => {
    setSections(sections);
    return () => setSections([]);
  }, [sections, setSections]);
};

export default useRegisterChatSections;
