import bar from './bar.js';
import fs from 'fs/promises';

/**
 * Function that calls an imported async function.
 *
 * @param {number} goo Multiplier.
 * @returns {number} Result of baz * mult.
 */
export default async function foo(goo) {
  return (await bar()) * goo;
}

/**
 * Non-default export.
 *
 * @returns {number} Constant.
 */
export function baz() {
  return 6;
}

/**
 * Wrapper around fs.promises.stat to force fs to be imported twice.
 *
 * @param {string} f File.
 * @returns {ReturnType<fs.stat>} Info on file.
 */
export function stat(f) {
  return fs.stat(f);
}
