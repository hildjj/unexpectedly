#!/usr/bin/env -S node --experimental-vm-modules --no-warnings
/* eslint-disable no-console */

import {suite} from '../index.js';

async function main() {
  let defaultScript = undefined;
  let nextDefault = false;
  for (const arg of process.argv.slice(2)) {
    if (nextDefault) {
      defaultScript = arg;
    } else if (arg === '--defaultScript') {
      nextDefault = true;
    } else {
      await suite(arg, defaultScript).catch(console.error);
    }
  }
}

main().catch(console.error);

