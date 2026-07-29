/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

const API_SOURCE_DIR = 'apps/api/src';
const CONTROLLER_SUFFIX = '.controller.ts';
const SPEC_SUFFIX = '.controller.spec.ts';
const SPEC_NOT_REQUIRED: string[] = [];

function getControllerFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      getControllerFiles(fullPath, fileList);
    } else if (fullPath.endsWith(CONTROLLER_SUFFIX)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function main(): void {
  const controllers = getControllerFiles(API_SOURCE_DIR).filter((file) => !SPEC_NOT_REQUIRED.includes(file));
  const missing = controllers.filter((controller) => !fs.existsSync(controller.replace(CONTROLLER_SUFFIX, SPEC_SUFFIX)));

  if (missing.length === 0) {
    console.log(chalk.green(`All ${controllers.length} controllers have a co-located ${SPEC_SUFFIX} file!`));
    return;
  }

  console.log(chalk.red('Error:'), `${missing.length} controller(s) missing a co-located spec:`);
  missing.forEach((controller) => {
    console.log(`  ${chalk.underline(controller)} -> expected ${chalk.bold(controller.replace(CONTROLLER_SUFFIX, SPEC_SUFFIX))}`);
  });
  process.exit(1);
}

main();
