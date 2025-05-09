#!/usr/bin/env -S node --experimental-vm-modules --no-warnings
import {Command} from 'commander';
import {suite} from '../index.js';
import {version} from '../version.js';

let failures = 0;

async function main() {
  const program = new Command();
  const opts = program
    .version(version)
    .argument('[file...]', 'Files or directories to test', './test/')
    .option('-d,--defaultScript <replacement>', 'Find the script from the file name.  Replace `$<base>` with the basename of the file.', '../$<base>.js')
    .option('-f,--function <functionName>', 'Use this function for testing in the associated script', 'test')
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
