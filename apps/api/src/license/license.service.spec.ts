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

import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import LicenseService from './license.service';

jest.mock('@libs/license/constants/licenseServerUrl', () => ({ __esModule: true, default: '' }));
jest.mock('axios');

describe('LicenseService — AGPL community mode (empty LICENSE_SERVER_URL)', () => {
  const licenseModel = {
    findOne: jest.fn().mockReturnValue({ lean: () => Promise.resolve(null) }),
    updateOne: jest.fn().mockReturnValue({ lean: () => Promise.resolve({}) }),
    countDocuments: jest.fn().mockResolvedValue(1),
  };
  const connection = {};
  const cacheManager = { del: jest.fn() };
  const jwtService = { decode: jest.fn() };

  let service: LicenseService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LicenseService(
      connection as never,
      licenseModel as never,
      cacheManager as never,
      jwtService as never,
    );
  });

  it('never builds an axios client in community mode', () => {
    expect(axios.create).not.toHaveBeenCalled();
  });

  it('signLicense refuses with HTTP 409 without any outbound call', async () => {
    expect.assertions(2);
    try {
      await service.signLicense({ licenseKey: 'irrelevant' } as never);
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(HttpStatus.CONFLICT);
    }
    expect(axios.create).not.toHaveBeenCalled();
  });

  it('getLicenseDetails reports isCommunity = true', async () => {
    const details = await service.getLicenseDetails();
    expect(details.isCommunity).toBe(true);
  });

  it('checkLicenseValidity is a no-op (no model read, no outbound call)', async () => {
    await service.checkLicenseValidity();
    expect(licenseModel.findOne).not.toHaveBeenCalled();
    expect(axios.create).not.toHaveBeenCalled();
  });
});
