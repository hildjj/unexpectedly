import {Runner} from '../runner.js';
import assert from 'node:assert';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);

describe('runner', () => {
  it('Handles root directories', async() => {
    const r = new Runner({filename: '/'});
    const res = await r.run('module.exports = () => 4');
    assert.equal(res, 4);
  });

  it('errors without filename', () => {
    assert.throws(() => new Runner());
  });

  it('takes an explicit format', async() => {
    const r = new Runner({
      filename: __filename,
      type: 'cjs',
    });
    const ret = await r.parse('module.exports = () => 4');
    assert.equal(ret(), 4);
  });
});
