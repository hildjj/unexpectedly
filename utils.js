import {Buffer} from 'node:buffer';

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
  const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  return `${b.toString('hex')}`;
}

/**
 * Convert a hex string to a TypedArray.
 *
 * @param {string} hex Hex string, may be prefixed with `0x`.
 * @param {Function} [Typ=Uint8ClampedArray] Constructor for TypedArray type
 *   you want created.
 * @returns {TypedArray} Constructed arrray.
 */
export function unhexlify(hex, Typ = Uint8ClampedArray) {
  const buf = Buffer.from(hex.replace(/^0x/, ''), 'hex');
  return new Typ(
    buf.buffer,
    buf.byteOffset,
    buf.byteLength / Typ.BYTES_PER_ELEMENT
  );
}
