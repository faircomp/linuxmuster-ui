/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import controllerContractReflection from '../../common/controllerContractReflection';
import LinboService from './linbo.service';
import LinboController from './linbo.controller';

jest.mock('stream/promises', () => ({ pipeline: jest.fn().mockResolvedValue(undefined) }));

const TOKEN = 'lmn-token';

const mockLinboService = {
  getHealth: jest.fn(),
  getChanges: jest.fn(),
  getServerInfo: jest.fn(),
  queryHosts: jest.fn(),
  getGrubConfigs: jest.fn(),
  getDhcpIscExport: jest.fn(),
  getDhcpDnsmasqExport: jest.fn(),
  getStartConfs: jest.fn(),
  getImagesManifest: jest.fn(),
  uploadImage: jest.fn(),
  downloadImage: jest.fn(),
};

describe('LinboController', () => {
  let controller: LinboController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinboController],
      providers: [{ provide: LinboService, useValue: mockLinboService }],
    }).compile();

    controller = module.get<LinboController>(LinboController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegation', () => {
    it('getHealth delegates the token and school', async () => {
      await controller.getHealth(TOKEN, 'default-school');
      expect(mockLinboService.getHealth).toHaveBeenCalledWith(TOKEN, 'default-school');
    });

    it('getChanges delegates the since cursor and school', async () => {
      await controller.getChanges(TOKEN, '42', 'default-school');
      expect(mockLinboService.getChanges).toHaveBeenCalledWith(TOKEN, '42', 'default-school');
    });

    it('getServerInfo delegates the token', async () => {
      await controller.getServerInfo(TOKEN);
      expect(mockLinboService.getServerInfo).toHaveBeenCalledWith(TOKEN);
    });

    it('queryHosts delegates the macs from the body', async () => {
      await controller.queryHosts(TOKEN, { macs: ['a', 'b'] } as never, 'default-school');
      expect(mockLinboService.queryHosts).toHaveBeenCalledWith(TOKEN, ['a', 'b'], 'default-school');
    });

    it('getGrubConfigs delegates the token and school', async () => {
      await controller.getGrubConfigs(TOKEN, 'default-school');
      expect(mockLinboService.getGrubConfigs).toHaveBeenCalledWith(TOKEN, 'default-school');
    });

    it('getDhcpIscExport delegates the token and school', async () => {
      await controller.getDhcpIscExport(TOKEN, 'default-school');
      expect(mockLinboService.getDhcpIscExport).toHaveBeenCalledWith(TOKEN, 'default-school');
    });

    it('getDhcpDnsmasqExport sends the text body with a text/plain content type', async () => {
      mockLinboService.getDhcpDnsmasqExport.mockResolvedValue('dnsmasq config');
      const res = { setHeader: jest.fn(), send: jest.fn() };

      await controller.getDhcpDnsmasqExport(TOKEN, res as never, 'default-school');

      expect(mockLinboService.getDhcpDnsmasqExport).toHaveBeenCalledWith(TOKEN, 'default-school');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(res.send).toHaveBeenCalledWith('dnsmasq config');
    });

    it('getStartConfs normalizes a single id into an array', async () => {
      await controller.getStartConfs(TOKEN, 'group-1', 'default-school');
      expect(mockLinboService.getStartConfs).toHaveBeenCalledWith(TOKEN, ['group-1'], 'default-school');
    });

    it('getStartConfs passes an id array through unchanged', async () => {
      await controller.getStartConfs(TOKEN, ['a', 'b'], undefined);
      expect(mockLinboService.getStartConfs).toHaveBeenCalledWith(TOKEN, ['a', 'b'], undefined);
    });

    it('getImagesManifest delegates the token', async () => {
      await controller.getImagesManifest(TOKEN);
      expect(mockLinboService.getImagesManifest).toHaveBeenCalledWith(TOKEN);
    });

    it('uploadImage forwards the minimal file shape and the body fields', async () => {
      await controller.uploadImage(
        TOKEN,
        { path: '/tmp/x', size: 100 } as never,
        {
          imageName: 'debian13',
          filename: 'debian13.qcow2',
        } as never,
      );

      expect(mockLinboService.uploadImage).toHaveBeenCalledWith(TOKEN, 'debian13', 'debian13.qcow2', {
        path: '/tmp/x',
        size: 100,
      });
    });

    it('uploadImage passes undefined when no file was provided', async () => {
      await controller.uploadImage(TOKEN, undefined, {
        imageName: 'debian13',
        filename: 'debian13.qcow2',
      } as never);

      expect(mockLinboService.uploadImage).toHaveBeenCalledWith(TOKEN, 'debian13', 'debian13.qcow2', undefined);
    });

    it('downloadImage forwards upstream headers and pipes the stream', async () => {
      const upstreamStream = { destroyed: false, destroy: jest.fn() };
      mockLinboService.downloadImage.mockResolvedValue({ headers: { 'content-length': '10' }, data: upstreamStream });
      const req = { on: jest.fn(), off: jest.fn() };
      const res = { setHeader: jest.fn(), headersSent: false, writableEnded: false, end: jest.fn() };

      await controller.downloadImage(TOKEN, 'debian13', 'debian13.qcow2', req as never, res as never);

      expect(mockLinboService.downloadImage).toHaveBeenCalledWith(
        TOKEN,
        'debian13',
        'debian13.qcow2',
        expect.anything(),
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Length', '10');
      expect(req.off).toHaveBeenCalled();
    });
  });

  describe('auth contract', () => {
    it.each([
      'getHealth',
      'getChanges',
      'getServerInfo',
      'queryHosts',
      'getGrubConfigs',
      'getDhcpIscExport',
      'getDhcpDnsmasqExport',
      'getStartConfs',
      'getImagesManifest',
      'uploadImage',
      'downloadImage',
    ])('keeps %s behind the global JWT guard (not public)', (route) => {
      expect(controllerContractReflection.isRoutePublic(LinboController, route)).toBe(false);
    });
  });
});
