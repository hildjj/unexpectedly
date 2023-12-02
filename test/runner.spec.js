import {Runner} from '../runner.js';
import assert from 'node:assert';

describe('runner', () => {
  it('Handles root directories', async() => {
    const r = new Runner({filename: '/'});
    const res = await r.run('module.exports = () => 4');
    assert.equal(res, 4);
  });
});
