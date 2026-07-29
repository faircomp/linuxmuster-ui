/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { Button, cn } from '@edulution-io/ui-kit';
import { WIKI_SEARCH_SCOPE } from '@libs/wiki/constants/wikiSearchScope';
import type WikiSearchScope from '@libs/wiki/constants/wikiSearchScope';
import { WIKI_SEARCH_STATUS } from '@libs/wiki/constants/wikiSearchStatus';
import useWikiStore from '@/pages/Wiki/store/useWikiStore';
import Input from '@/components/shared/Input';

const WikiSearch = () => {
  const { t } = useTranslation();
  const search = useWikiStore((state) => state.search);
  const searchResult = useWikiStore((state) => state.searchResult);
  const isSearching = useWikiStore((state) => state.isSearching);
  const currentPage = useWikiStore((state) => state.currentPage);
  const fetchPage = useWikiStore((state) => state.fetchPage);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<WikiSearchScope>(WIKI_SEARCH_SCOPE.ALL);

  const currentShareId = currentPage ? (currentPage.path.split('/')[0] ?? '') : '';
  const canSearchCurrent = currentShareId !== '';

  const submit = async () => {
    const trimmed = query.trim();
    if (trimmed === '') {
      return;
    }
    const searchInShare = scope === WIKI_SEARCH_SCOPE.SHARE && canSearchCurrent;
    await search(
      trimmed,
      searchInShare ? WIKI_SEARCH_SCOPE.SHARE : WIKI_SEARCH_SCOPE.ALL,
      searchInShare ? currentShareId : undefined,
    );
  };

  const isUnavailable = searchResult?.status === WIKI_SEARCH_STATUS.UNAVAILABLE;
  const isDegraded = searchResult?.status === WIKI_SEARCH_STATUS.DEGRADED;

  return (
    <div className={cn('flex flex-col gap-2 border-b border-muted p-2')}>
      <form
        className={cn('flex items-center gap-1')}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('wiki.search.placeholder')}
        />
        <Button
          type="submit"
          variant="btn-outline"
          size="md"
          disabled={isSearching || query.trim() === ''}
          aria-label={t('wiki.search.action')}
        >
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className={cn('h-4 w-4')}
          />
        </Button>
      </form>

      <div className={cn('flex gap-1 text-xs')}>
        <button
          type="button"
          aria-pressed={scope === WIKI_SEARCH_SCOPE.ALL}
          className={cn('rounded px-2 py-0.5', scope === WIKI_SEARCH_SCOPE.ALL ? 'bg-accent-light' : 'opacity-70')}
          onClick={() => setScope(WIKI_SEARCH_SCOPE.ALL)}
        >
          {t('wiki.search.scope.all')}
        </button>
        <button
          type="button"
          aria-pressed={scope === WIKI_SEARCH_SCOPE.SHARE}
          disabled={!canSearchCurrent}
          className={cn(
            'rounded px-2 py-0.5',
            scope === WIKI_SEARCH_SCOPE.SHARE ? 'bg-accent-light' : 'opacity-70',
            !canSearchCurrent && 'opacity-30',
          )}
          onClick={() => setScope(WIKI_SEARCH_SCOPE.SHARE)}
        >
          {t('wiki.search.scope.current')}
        </button>
      </div>

      {searchResult && (
        <div className={cn('flex flex-col gap-1 text-sm')}>
          {isUnavailable && <p className={cn('text-ciRed')}>{t('wiki.search.unavailable')}</p>}
          {isDegraded && <p className={cn('text-muted-foreground')}>{t('wiki.search.degraded')}</p>}

          {searchResult.unavailableShares.length > 0 && (
            <ul className={cn('text-xs text-muted-foreground')}>
              {searchResult.unavailableShares.map((share) => (
                <li key={share.shareId}>{`${share.shareId} — ${t(`wiki.search.reasons.${share.reason}`)}`}</li>
              ))}
            </ul>
          )}

          {!isUnavailable && searchResult.hits.length === 0 && (
            <p className={cn('text-muted-foreground')}>{t('wiki.search.empty')}</p>
          )}

          <ul className={cn('flex flex-col gap-1')}>
            {searchResult.hits.map((hit) => (
              <li key={hit.path}>
                <button
                  type="button"
                  className={cn('flex w-full flex-col rounded px-2 py-1 text-left hover:bg-accent-light')}
                  onClick={() => {
                    void fetchPage(hit.path);
                  }}
                >
                  <span className={cn('truncate font-medium')}>{hit.title}</span>
                  {hit.snippets.length > 0 && (
                    <span className={cn('truncate text-xs text-muted-foreground')}>{hit.snippets.join(' … ')}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default WikiSearch;
