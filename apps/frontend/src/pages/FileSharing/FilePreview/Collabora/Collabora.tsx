/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { FC, useEffect, useRef } from 'react';
import { cn } from '@edulution-io/ui-kit';
import useCollabora from '@/pages/FileSharing/hooks/useCollabora';

interface CollaboraProps {
  filePath: string;
  fileName: string;
}

const COLLABORA_FRAME_NAME = 'collabora-editor-frame';

const Collabora: FC<CollaboraProps> = ({ filePath, fileName }) => {
  const { editorUrl, accessToken } = useCollabora({ filePath, fileName });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (editorUrl && accessToken) {
      formRef.current?.submit();
    }
  }, [editorUrl, accessToken]);

  if (!editorUrl || !accessToken) {
    return null;
  }

  return (
    <div className={cn('h-full w-full')}>
      <form
        ref={formRef}
        action={editorUrl}
        method="post"
        target={COLLABORA_FRAME_NAME}
      >
        <input
          type="hidden"
          name="access_token"
          value={accessToken}
        />
      </form>
      <iframe
        title={fileName}
        name={COLLABORA_FRAME_NAME}
        className={cn('h-full w-full border-0')}
      />
    </div>
  );
};

export default Collabora;
