#!/usr/bin/env -S node --experimental-vm-modules --no-warnings
/* eslint-disable no-console */

import {Command, Option} from 'commander';
import fs from 'node:fs/promises';
import {suite} from '../index.js';

let failures = 0;

async function main() {
  const pkg = JSON.parse(await fs.readFile(
    new URL('../package.json', import.meta.url),
    'utf-8'
  ));

  const program = new Command();
  const opts = program
    .version(pkg.version)
    .argument('[...file]', 'Files or directories to test', './test/')
    .option('-d,--defaultScript <replacement>', 'Find the script from the file name.  Replace `$<base>` with the basename of the file.', '../$<base>.js')
    .option('-f,--function <functionName>', 'Use this function for testing in the associated script', 'test')
    .addOption(new Option('-s,--silent18', 'Silently skip mjs tests on node 18.').hideHelp())
    .parse()
    .opts();

  const {args} = program;
  if (args.length === 0) {
    args.push('./test/');
  }

  for (const arg of args) {
    // eslint-disable-next-line require-atomic-updates
    failures += await suite(arg, opts);
  }
}

await main().catch(er => {
  console.error(er);
  process.exit(1);
});

if (failures) {
  console.error(`Total of ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(2);
}
