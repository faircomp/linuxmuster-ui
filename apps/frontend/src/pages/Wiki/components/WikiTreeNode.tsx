/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faChevronRight,
  faEllipsisVertical,
  faFile,
  faFolder,
  faFolderOpen,
  faSpinner,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '@edulution-io/ui-kit';
import type WikiTreeChildDto from '@libs/wiki/types/wikiTreeChildDto';
import { WIKI_NODE_TYPE } from '@libs/wiki/constants/wikiNodeType';
import type WikiNodeType from '@libs/wiki/constants/wikiNodeType';
import DropdownMenu from '@/components/shared/DropdownMenu';
import useWikiStore from '@/pages/Wiki/store/useWikiStore';

interface WikiTreeNodeProps {
  node: WikiTreeChildDto;
  depth: number;
  onCreatePage?: (parentPath: string) => void;
  onCreateFolder?: (parentPath: string) => void;
  onDelete?: (path: string, nodeType: WikiNodeType) => void;
}

const WikiTreeNode = ({ node, depth, onCreatePage, onCreateFolder, onDelete }: WikiTreeNodeProps) => {
  const { t } = useTranslation();
  const { fetchTree, fetchPage, currentPage, treeVersion } = useWikiStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [childNodes, setChildNodes] = useState<WikiTreeChildDto[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastVersionRef = useRef(treeVersion);

  const isFolder = node.type === WIKI_NODE_TYPE.FOLDER;
  const isActive = currentPage?.path === node.path;

  const loadChildren = useCallback(async () => {
    const loaded = await fetchTree(node.path);
    setChildNodes(loaded);
  }, [fetchTree, node.path]);

  useEffect(() => {
    if (lastVersionRef.current === treeVersion) {
      return;
    }
    lastVersionRef.current = treeVersion;
    if (isExpanded && childNodes !== null) {
      void loadChildren();
    }
  }, [treeVersion, isExpanded, childNodes, loadChildren]);

  const handleToggle = async () => {
    if (isLoading) {
      return;
    }
    if (!isExpanded && childNodes === null) {
      setIsLoading(true);
      await loadChildren();
      setIsLoading(false);
    }
    setIsExpanded((prev) => !prev);
  };

  const handleSelect = () => {
    if (isFolder) {
      void handleToggle();
    } else {
      void fetchPage(node.path);
    }
  };

  let chevronIcon = faChevronRight;
  if (isLoading) {
    chevronIcon = faSpinner;
  } else if (isExpanded) {
    chevronIcon = faChevronDown;
  }

  let nodeIcon = faFile;
  if (isFolder) {
    nodeIcon = isExpanded ? faFolderOpen : faFolder;
  }

  const deleteItem = { label: t('common.delete'), icon: faTrash, onClick: () => onDelete?.(node.path, node.type) };
  const menuItems = isFolder
    ? [
        { label: t('wiki.menu.newPage'), icon: faFile, onClick: () => onCreatePage?.(node.path) },
        { label: t('wiki.menu.newFolder'), icon: faFolder, onClick: () => onCreateFolder?.(node.path) },
        deleteItem,
      ]
    : [deleteItem];

  return (
    <li>
      <div
        className={cn('group flex items-center rounded hover:bg-accent-light', isActive && 'bg-accent-light')}
        style={{ paddingLeft: `${depth * 0.75 + 0.25}rem` }}
      >
        <button
          type="button"
          className={cn('flex flex-1 items-center gap-2 truncate px-2 py-1 text-left text-sm text-muted-foreground')}
          onClick={handleSelect}
        >
          {isFolder && (
            <FontAwesomeIcon
              icon={chevronIcon}
              spin={isLoading}
              className={cn('h-3 w-3 shrink-0 opacity-60')}
            />
          )}
          <FontAwesomeIcon
            icon={nodeIcon}
            className={cn('h-4 w-4 shrink-0')}
          />
          <span className={cn('truncate')}>{node.name}</span>
        </button>
        <DropdownMenu
          trigger={
            <button
              type="button"
              aria-label={t('common.options')}
              className={cn('px-2 py-1 opacity-0 group-hover:opacity-100')}
            >
              <FontAwesomeIcon
                icon={faEllipsisVertical}
                className={cn('h-3 w-3 text-muted-foreground')}
              />
            </button>
          }
          items={menuItems}
        />
      </div>
      {isFolder && isExpanded && childNodes && childNodes.length > 0 && (
        <ul>
          {childNodes.map((child) => (
            <WikiTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onCreatePage={onCreatePage}
              onCreateFolder={onCreateFolder}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default WikiTreeNode;
