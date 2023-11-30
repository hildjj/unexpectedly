import bar from './bar.js';

/**
 * Function that calls an imported async function.
 *
 * @param {number} baz Multiplier.
 * @returns {number} Result of baz * mult.
 */
export default async function foo(baz) {
  return (await bar()) * baz;
}
