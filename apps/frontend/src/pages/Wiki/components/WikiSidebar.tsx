/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useEffect } from 'react';
import { cn } from '@edulution-io/ui-kit';
import { WIKI_NODE_TYPE } from '@libs/wiki/constants/wikiNodeType';
import type WikiNodeType from '@libs/wiki/constants/wikiNodeType';
import type WikiTreeChildDto from '@libs/wiki/types/wikiTreeChildDto';
import useWikiStore from '@/pages/Wiki/store/useWikiStore';
import WikiTreeNode from './WikiTreeNode';

interface WikiSidebarProps {
  onCreatePage?: (parentPath: string) => void;
  onCreateFolder?: (parentPath: string) => void;
  onDelete?: (path: string, nodeType: WikiNodeType) => void;
}

const WikiSidebar = ({ onCreatePage, onCreateFolder, onDelete }: WikiSidebarProps) => {
  const { shares, fetchShares } = useWikiStore();

  useEffect(() => {
    void fetchShares();
  }, [fetchShares]);

  return (
    <div className={cn('flex-1 overflow-y-auto p-2')}>
      <ul>
        {shares.map((share) => {
          const rootNode: WikiTreeChildDto = {
            type: WIKI_NODE_TYPE.FOLDER,
            name: share.displayName,
            path: share.displayName,
            hasChildren: true,
          };
          return (
            <WikiTreeNode
              key={share.displayName}
              node={rootNode}
              depth={0}
              onCreatePage={onCreatePage}
              onCreateFolder={onCreateFolder}
              onDelete={onDelete}
            />
          );
        })}
      </ul>
    </div>
  );
};

export default WikiSidebar;
