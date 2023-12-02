import {ModType} from '../modtype.js';
import assert from 'node:assert';
import path from 'node:path';

describe('ModType', () => {
  it('Handles non-existent files', async() => {
    const type = await ModType.find(path.join(process.cwd(), '_____INVALID__FILE___'));
    assert.equal(type, 'module');
    assert.notEqual(ModType.cacheSize, 0);
    ModType.clear();
    assert.equal(ModType.cacheSize, 0);
  });
});
