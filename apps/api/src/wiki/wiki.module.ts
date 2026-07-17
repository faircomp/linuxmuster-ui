/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { Agent as HttpsAgent } from 'https';
import LmnApiModule from '../lmnApi/lmnApi.module';
import WikiController from './wiki.controller';
import WikiTreeService from './wiki-tree.service';
import WikiPageService from './wiki-page.service';
import WikiFolderService from './wiki-folder.service';
import WikiSearchService from './wiki-search.service';
import WikiFileproxyClient from './wiki-fileproxy.client';

@Module({
  imports: [
    HttpModule.register({
      httpsAgent: new HttpsAgent({
        rejectUnauthorized: false,
      }),
    }),
    LmnApiModule,
  ],
  controllers: [WikiController],
  providers: [WikiTreeService, WikiPageService, WikiFolderService, WikiSearchService, WikiFileproxyClient],
})
class WikiModule {}

export default WikiModule;
