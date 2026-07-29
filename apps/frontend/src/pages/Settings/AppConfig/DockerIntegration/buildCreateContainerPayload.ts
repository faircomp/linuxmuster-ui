/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { type ContainerCreateOptions } from 'dockerode';
import type ActiveDocumentEditor from '@libs/filesharing/constants/activeDocumentEditor';
import type CreateContainerDto from '@libs/docker/types/create-container.dto';
import resolveDockerContainerName from './resolveDockerContainerName';

const buildCreateContainerPayload = (
  applicationName: string,
  activeEditor: ActiveDocumentEditor | undefined,
  containers: ContainerCreateOptions[],
  dockerComposeFiles: Record<string, string>,
): CreateContainerDto & { containerName: string } => {
  const containerName = resolveDockerContainerName(applicationName, activeEditor);
  return {
    applicationName,
    containerName,
    containers,
    originalComposeConfig: dockerComposeFiles[containerName] || '',
  };
};

export default buildCreateContainerPayload;
