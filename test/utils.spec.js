import * as utils from '../utils.js';
import assert from 'node:assert';

describe('utils', () => {
  it('mapObj', () => {
    assert.deepEqual(utils.mapObj(['a'], () => 2), {a: 2});
  });
});
