import {Runner} from '../runner.js';
import assert from 'node:assert';

describe('runner', async() => {
  it('Handles root directories', async () => {
    const r = new Runner({filename: '/', text: 'module.exports = () => 4'});
    const res = await r.run();
    assert.equal(res, 4);
  })
});
