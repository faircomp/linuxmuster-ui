/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel and linuxmuster-ui contributors
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * A copy of the license can be found at: https://www.gnu.org/licenses/agpl-3.0.html
 */

import { describe, it, expect, vi } from 'vitest';
import { MOBILE_ACCESS_PATH } from '@libs/userSettings/constants/user-settings-endpoints';
import getPrivateRoutes from './getPrivateRoutes';

vi.mock('plotly.js-dist-min', () => ({ default: {} }));
vi.mock('survey-analytics', () => ({}));

interface ReactElementLike {
  props?: { path?: string; children?: unknown };
}

const collectRoutePaths = (node: unknown, paths: string[] = []): string[] => {
  if (Array.isArray(node)) {
    node.forEach((child) => collectRoutePaths(child, paths));
    return paths;
  }
  const element = node as ReactElementLike;
  if (element && element.props) {
    if (typeof element.props.path === 'string') paths.push(element.props.path);
    if (element.props.children) collectRoutePaths(element.props.children, paths);
  }
  return paths;
};

describe('getPrivateRoutes — MOBILE_APP_ENABLED gate', () => {
  it('MOBILE_APP_ENABLED=false (Default): keine Mobile-Access-Route registriert', () => {
    const paths = collectRoutePaths(getPrivateRoutes([]));
    expect(paths.length).toBeGreaterThan(0);
    expect(paths).not.toContain(MOBILE_ACCESS_PATH);
  });
});
