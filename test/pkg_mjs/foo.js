import bar from './bar.js';

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
