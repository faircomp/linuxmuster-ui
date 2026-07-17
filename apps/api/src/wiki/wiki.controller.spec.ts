/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { WIKI_SEARCH_SCOPE } from '@libs/wiki/constants/wikiSearchScope';
import type WikiSearchRequestDto from '@libs/wiki/types/wikiSearchRequestDto';
import controllerContractReflection from '../common/controllerContractReflection';
import ThrottleGuard from '../common/throttle/throttle.guard';
import WebdavEtagConflictError from '../webdav/errors/WebdavEtagConflictError';
import WikiEtagConflictHttpException from './WikiEtagConflictHttpException';
import WebdavSharesService from '../webdav/shares/webdav-shares.service';
import WikiTreeService from './wiki-tree.service';
import WikiPageService from './wiki-page.service';
import WikiFolderService from './wiki-folder.service';
import WikiSearchService from './wiki-search.service';
import WikiController from './wiki.controller';

const USERNAME = 'alice';
const GROUPS = ['/teachers'];

const webdavSharesService = { findAllWikiShares: jest.fn() };
const treeService = { listChildren: jest.fn() };
const pageService = { getPage: jest.fn(), createPage: jest.fn(), updatePage: jest.fn(), deletePage: jest.fn() };
const folderService = { createFolder: jest.fn(), deleteFolder: jest.fn() };
const searchService = { search: jest.fn() };

const makeResponse = () => ({ setHeader: jest.fn() }) as unknown as Response;

const ALL_ROUTES = [
  'listShares',
  'getTree',
  'getPage',
  'createPage',
  'updatePage',
  'deletePage',
  'createFolder',
  'deleteFolder',
  'search',
] as const;

describe('WikiController', () => {
  let controller: WikiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WikiController],
      providers: [
        { provide: WebdavSharesService, useValue: webdavSharesService },
        { provide: WikiTreeService, useValue: treeService },
        { provide: WikiPageService, useValue: pageService },
        { provide: WikiFolderService, useValue: folderService },
        { provide: WikiSearchService, useValue: searchService },
      ],
    }).compile();

    controller = module.get<WikiController>(WikiController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegation', () => {
    it('listShares passes the user groups to findAllWikiShares', async () => {
      await controller.listShares(GROUPS);
      expect(webdavSharesService.findAllWikiShares).toHaveBeenCalledWith(GROUPS);
    });

    it('getTree delegates to the tree service', async () => {
      await controller.getTree('MyShare/sub', USERNAME, GROUPS);
      expect(treeService.listChildren).toHaveBeenCalledWith(USERNAME, GROUPS, 'MyShare/sub');
    });

    it('createPage defaults asIndex to false when omitted', async () => {
      await controller.createPage({ parentPath: 'MyShare', title: 'Hello' } as never, USERNAME, GROUPS);
      expect(pageService.createPage).toHaveBeenCalledWith(USERNAME, GROUPS, 'MyShare', 'Hello', false);
    });

    it('createPage forwards asIndex when provided', async () => {
      await controller.createPage({ parentPath: 'MyShare', title: 'Idx', asIndex: true } as never, USERNAME, GROUPS);
      expect(pageService.createPage).toHaveBeenCalledWith(USERNAME, GROUPS, 'MyShare', 'Idx', true);
    });

    it('deletePage returns success and delegates', async () => {
      const result = await controller.deletePage('MyShare/page', USERNAME, GROUPS);
      expect(pageService.deletePage).toHaveBeenCalledWith(USERNAME, GROUPS, 'MyShare/page');
      expect(result).toEqual({ success: true });
    });

    it('createFolder delegates to the folder service', async () => {
      await controller.createFolder({ parentPath: 'MyShare', name: 'New' } as never, USERNAME, GROUPS);
      expect(folderService.createFolder).toHaveBeenCalledWith(USERNAME, GROUPS, 'MyShare', 'New');
    });

    it('deleteFolder returns success and delegates', async () => {
      const result = await controller.deleteFolder('MyShare/sub', USERNAME, GROUPS);
      expect(folderService.deleteFolder).toHaveBeenCalledWith(USERNAME, GROUPS, 'MyShare/sub');
      expect(result).toEqual({ success: true });
    });

    it('search delegates to the search service', async () => {
      const request = { query: 'q', scope: WIKI_SEARCH_SCOPE.ALL, page: 0, size: 10 } as WikiSearchRequestDto;
      await controller.search(request, USERNAME, GROUPS);
      expect(searchService.search).toHaveBeenCalledWith(request, USERNAME, GROUPS);
    });
  });

  describe('getPage ETag emission', () => {
    it('sets the ETag response header when the page has an etag', async () => {
      pageService.getPage.mockResolvedValue({ path: 'MyShare/p', title: 'P', content: 'c', etag: 'v1' });
      const response = makeResponse();

      await controller.getPage('MyShare/p', response, USERNAME, GROUPS);

      expect(response.setHeader).toHaveBeenCalledWith('ETag', 'v1');
    });

    it('does not set the ETag header when the page has no etag', async () => {
      pageService.getPage.mockResolvedValue({ path: 'MyShare/p', title: 'P', content: 'c', etag: null });
      const response = makeResponse();

      await controller.getPage('MyShare/p', response, USERNAME, GROUPS);

      expect(response.setHeader).not.toHaveBeenCalled();
    });
  });

  describe('updatePage optimistic concurrency', () => {
    it('prefers the If-Match header over the body etag', async () => {
      await controller.updatePage('MyShare/p', 'header-etag', { content: 'x', etag: 'body-etag' } as never, USERNAME, GROUPS);
      expect(pageService.updatePage).toHaveBeenCalledWith(USERNAME, GROUPS, 'MyShare/p', 'x', 'header-etag');
    });

    it('falls back to the body etag when no If-Match header is present', async () => {
      await controller.updatePage('MyShare/p', undefined, { content: 'x', etag: 'body-etag' } as never, USERNAME, GROUPS);
      expect(pageService.updatePage).toHaveBeenCalledWith(USERNAME, GROUPS, 'MyShare/p', 'x', 'body-etag');
    });

    it('translates a WebdavEtagConflictError into a 409 WikiEtagConflictHttpException', async () => {
      pageService.updatePage.mockRejectedValue(
        new WebdavEtagConflictError({ currentEtag: 'v2', serverContent: 'server text' }),
      );
      expect.assertions(2);
      try {
        await controller.updatePage('MyShare/p', 'v1', { content: 'x' } as never, USERNAME, GROUPS);
      } catch (error) {
        expect(error).toBeInstanceOf(WikiEtagConflictHttpException);
        expect((error as WikiEtagConflictHttpException).getStatus()).toBe(HttpStatus.CONFLICT);
      }
    });

    it('rethrows unrelated errors unchanged', async () => {
      const boom = new Error('boom');
      pageService.updatePage.mockRejectedValue(boom);
      await expect(
        controller.updatePage('MyShare/p', 'v1', { content: 'x' } as never, USERNAME, GROUPS),
      ).rejects.toBe(boom);
    });
  });

  describe('security contract', () => {
    it.each(ALL_ROUTES)('keeps %s behind the global JWT guard (not public)', (route) => {
      expect(controllerContractReflection.isRoutePublic(WikiController, route)).toBe(false);
    });

    it('guards only the search route with the ThrottleGuard', () => {
      expect(controllerContractReflection.getRouteGuards(WikiController, 'search')).toContain(ThrottleGuard);
      expect(controllerContractReflection.getRouteGuards(WikiController, 'getPage')).not.toContain(ThrottleGuard);
      expect(controllerContractReflection.getRouteGuards(WikiController, 'updatePage')).not.toContain(ThrottleGuard);
    });
  });
});
