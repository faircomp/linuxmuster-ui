/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Logger } from '@nestjs/common';
import { Migration } from '../../../migration/migration.type';
import { WebdavSharesDocument } from '../webdav-shares.schema';

const previousSchemaVersion = 1;
const newSchemaVersion = 2;

const migration001: Migration<WebdavSharesDocument> = {
  name: '001-add-wiki-visibility-to-webdav-shares',
  version: newSchemaVersion,
  execute: async (model) => {
    const unprocessedDocuments = await model.find({ schemaVersion: previousSchemaVersion });
    if (unprocessedDocuments.length === 0) {
      return;
    }
    Logger.log(`${unprocessedDocuments.length} webdav share(s) to update...`);

    // eslint-disable-next-line no-underscore-dangle
    const ids = unprocessedDocuments.map((doc) => doc._id);

    const result = await model.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          wikiAccessGroups: [],
          wikiDisabled: false,
          schemaVersion: newSchemaVersion,
        },
      },
    );

    Logger.log(`Migration completed: ${result.modifiedCount} webdav share(s) updated with wiki visibility defaults.`);
  },
};

export default migration001;
