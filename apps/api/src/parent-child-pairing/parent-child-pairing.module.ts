/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import LmnApiModule from '../lmnApi/lmnApi.module';
import ParentChildPairingController from './parent-child-pairing.controller';
import ParentChildPairingService from './parent-child-pairing.service';
import { ParentChildPairing, ParentChildPairingSchema } from './parent-child-pairing.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ParentChildPairing.name, schema: ParentChildPairingSchema }]),
    LmnApiModule,
  ],
  controllers: [ParentChildPairingController],
  providers: [ParentChildPairingService],
  exports: [ParentChildPairingService],
})
class ParentChildPairingModule {}

export default ParentChildPairingModule;
