#!/usr/bin/env -S node --experimental-vm-modules --no-warnings
/* eslint-disable no-console */

import {suite} from '../index.js';

let failures = 0;

async function main() {
  let defaultScript = undefined;
  let nextDefault = false;
  for (const arg of process.argv.slice(2)) {
    if (nextDefault) {
      defaultScript = arg;
    } else if (arg === '--defaultScript') {
      nextDefault = true;
    } else {
      // eslint-disable-next-line require-atomic-updates
      failures += await suite(arg, defaultScript);
    }
  }
}

await main().catch(console.error);

if (failures) {
  console.error(`Total of ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
