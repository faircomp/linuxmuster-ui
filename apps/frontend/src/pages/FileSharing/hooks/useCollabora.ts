/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import getExtendedOptionsValue from '@libs/appconfig/utils/getExtendedOptionsValue';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import APPS from '@libs/appconfig/constants/apps';
import getFrontEndUrl from '@libs/common/utils/URL/getFrontEndUrl';
import EDU_API_ROOT from '@libs/common/constants/eduApiRoot';
import useAppConfigsStore from '@/pages/Settings/AppConfig/useAppConfigsStore';
import useCollaboraStore from '@/pages/FileSharing/FilePreview/Collabora/useCollaboraStore';
import {
  buildWopiSrc,
  buildCollaboraEditorUrl,
} from '@/pages/FileSharing/FilePreview/Collabora/utilities/buildCollaboraSrc';

interface UseCollaboraProps {
  filePath: string;
  fileName: string;
}

const useCollabora = ({ filePath, fileName }: UseCollaboraProps) => {
  const { webdavShare } = useParams();
  const { appConfigs } = useAppConfigsStore();
  const accessToken = useCollaboraStore((state) => state.accessToken);
  const isLoading = useCollaboraStore((state) => state.isLoading);
  const fetchCollaboraToken = useCollaboraStore((state) => state.fetchCollaboraToken);

  const collaboraUrl = getExtendedOptionsValue(appConfigs, APPS.FILE_SHARING, ExtendedOptionKeys.COLLABORA_URL) ?? '';

  const editorUrl = useMemo(() => {
    if (!collaboraUrl) {
      return '';
    }
    const apiBaseUrl = `${getFrontEndUrl()}/${EDU_API_ROOT}`;
    const wopiSrc = buildWopiSrc(apiBaseUrl, encodeURIComponent(fileName));
    return buildCollaboraEditorUrl(collaboraUrl, wopiSrc);
  }, [collaboraUrl, fileName]);

  useEffect(() => {
    void fetchCollaboraToken(filePath, webdavShare ?? '');
  }, [filePath, webdavShare, fetchCollaboraToken]);

  return { editorUrl, accessToken, isLoading };
};

export default useCollabora;
