/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { CanActivate, Type } from '@nestjs/common';
import { APP_ACCESS_KEY, PUBLIC_ROUTE_KEY } from '@libs/auth/constants/appAccessKeys';

type GuardReference = Type<CanActivate>;

const getRouteHandler = (controller: Type<unknown>, methodName: string): object =>
  (controller as unknown as { prototype: Record<string, object> }).prototype[methodName];

const getClassGuards = (controller: Type<unknown>): GuardReference[] =>
  (Reflect.getMetadata(GUARDS_METADATA, controller) as GuardReference[] | undefined) ?? [];

const getRouteGuards = (controller: Type<unknown>, methodName: string): GuardReference[] =>
  (Reflect.getMetadata(GUARDS_METADATA, getRouteHandler(controller, methodName)) as GuardReference[] | undefined) ?? [];

const isRoutePublic = (controller: Type<unknown>, methodName: string): boolean =>
  (Reflect.getMetadata(PUBLIC_ROUTE_KEY, getRouteHandler(controller, methodName)) as boolean | undefined) ?? false;

const getRequiredAppAccess = (controller: Type<unknown>, methodName: string): string | undefined =>
  Reflect.getMetadata(APP_ACCESS_KEY, getRouteHandler(controller, methodName)) as string | undefined;

const controllerContractReflection = { getClassGuards, getRouteGuards, isRoutePublic, getRequiredAppAccess };

export default controllerContractReflection;
