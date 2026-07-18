/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import APPS from '@libs/appconfig/constants/apps';
import DOCKER_APPLICATION_LIST from '@libs/docker/constants/dockerApplicationList';
import FILESHARING_DOCKER_CONTAINERS from '@libs/docker/constants/filesharingDockerContainers';
import ActiveDocumentEditor, { ACTIVE_DOCUMENT_EDITOR } from '@libs/filesharing/constants/activeDocumentEditor';

const resolveDockerContainerName = (applicationName: string, activeEditor?: ActiveDocumentEditor): string => {
  if (applicationName === APPS.FILE_SHARING) {
    return FILESHARING_DOCKER_CONTAINERS[activeEditor ?? ACTIVE_DOCUMENT_EDITOR.ONLY_OFFICE];
  }
  return (DOCKER_APPLICATION_LIST as Record<string, string | undefined>)[applicationName] ?? applicationName;
};

export default resolveDockerContainerName;
