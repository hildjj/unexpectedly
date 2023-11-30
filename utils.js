'use strict';

function mapObj(ar, f) {
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
function hexlify(buf) {
  const nibbles = buf.BYTES_PER_ELEMENT * 2;
  const pad = '0'.repeat(nibbles);
  return Array.prototype.slice.call(buf)
    .map(i => (pad + i.toString(16)).slice(-nibbles))
    .join('');
}

function unhexlify(str, typ = Uint8ClampedArray) {
  str = str.replace(/^0x/i, '');
  const nibbles = typ.BYTES_PER_ELEMENT * 2;
  return typ.from({length: str.length / nibbles}, (_v, i) => {
    const off = i * nibbles;
    return parseInt(str.slice(off, off + nibbles), 16);
  });
}

module.exports = {
  mapObj,
  hexlify,
  unhexlify,
};
