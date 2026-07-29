/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import UsersModule from '../users/users.module';
import AppConfigModule from '../appconfig/appconfig.module';
import { CalendarMetadata, CalendarMetadataSchema } from './calendar-metadata.schema';
import CalendarController from './calendar.controller';
import CalendarService from './calendar.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CalendarMetadata.name, schema: CalendarMetadataSchema }]),
    UsersModule,
    AppConfigModule,
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
class CalendarModule {}

export default CalendarModule;
