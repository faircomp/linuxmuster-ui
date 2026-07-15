/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

export interface NpmAuditAllowlistEntry {
  package: string;
  severity: 'high' | 'critical';
  reason: string;
  reviewBy: string;
}

const BASELINE_REASON =
  'Inherited high/critical advisory from the v1.6.266 fork base; accepted as baseline and tracked for remediation via Dependabot (see docs/security/accepted-cves.md).';
const BASELINE_REVIEW_BY = '2026-10-15';

const NPM_AUDIT_ALLOWLIST: NpmAuditAllowlistEntry[] = [
  { package: '@grpc/grpc-js', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: '@hono/node-server', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: '@nestjs/config', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: '@nestjs/core', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: '@nestjs/platform-express', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: '@nestjs/serve-static', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: '@nestjs/swagger', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'axios', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'editorconfig', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'express-rate-limit', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'fast-uri', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'fast-xml-parser', severity: 'critical', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'form-data', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'hono', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'immutable', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'js-cookie', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'jspdf', severity: 'critical', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'linkify-it', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'lodash', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'lodash-es', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'minimatch', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'mongoose', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'multer', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'nodemailer', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'path-to-regexp', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'picomatch', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'protobufjs', severity: 'critical', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'survey-pdf', severity: 'critical', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'tmp', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
  { package: 'ws', severity: 'high', reason: BASELINE_REASON, reviewBy: BASELINE_REVIEW_BY },
];

export default NPM_AUDIT_ALLOWLIST;
