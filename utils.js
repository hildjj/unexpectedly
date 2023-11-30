/**
 * Convert an array to an object, using a map function.  If the function
 * returns an array, it is [key, value].  Otherwise, the value returned is
 * assigned to the original key.
 *
 * @param {any[]} ar Input array.
 * @param {(key) => [key: string,value: any]|any} f Map function.
 * @returns {object} Created object.
 */
export function mapObj(ar, f) {
  return ar.reduce((last, v) => {
    const nv = f(v);
    if (Array.isArray(nv)) {
      // eslint-disable-next-line prefer-destructuring
      last[nv[0]] = nv[1];
    } else {
      last[v] = nv;
    }
    return last;
  }, {});
}

// TODO: deal with endian-ness, using DataView
/**
 * Convert a TypedArray to a hex string.
 *
 * @param {TypedArray} buf The array to convert.
 * @returns {string} Hex.
 */
export function hexlify(buf) {
  const nibbles = buf.BYTES_PER_ELEMENT * 2;
  const pad = '0'.repeat(nibbles);
  return Array.prototype.slice.call(buf)
    .map(i => (pad + i.toString(16)).slice(-nibbles))
    .join('');
}

/**
 * Convert a hex string to a TypedArray.
 *
 * @param {string} hex Hex string, may be prefixed with `0x`.
 * @param {Function} [typ=Uint8ClampedArray] Constructor for TypedArray type
 *   you want created.
 * @returns {TypedArray} Constructed arrray.
 */
export function unhexlify(hex, typ = Uint8ClampedArray) {
  hex = hex.replace(/^0x/i, '');
  const nibbles = typ.BYTES_PER_ELEMENT * 2;
  return typ.from({length: hex.length / nibbles}, (_v, i) => {
    const off = i * nibbles;
    return parseInt(hex.slice(off, off + nibbles), 16);
  });
}
