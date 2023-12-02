import {$} from 'zx';
import assert from 'node:assert';
import os from 'node:os';

describe('CLI', () => {
  it('handles no args', async() => {
    const {exitCode, stdout} = await $`./bin/unexpectedly.js`;
    assert.equal(exitCode, 0);
    assert.equal(stdout, '');
  });

  it('handles invalid inputs', async() => {
    const {exitCode, stdout, stderr} = await $`./bin/unexpectedly.js ___INVALID__FILE___`.quiet().nothrow();
    assert.equal(exitCode, 1);
    assert.equal(stdout, '');
    assert.match(stderr, /ENOENT/);
  });

  it('handles failing test', async() => {
    const {exitCode, stdout, stderr} = await $`./bin/unexpectedly.js test/bad`.quiet().nothrow();
    assert.equal(exitCode, 2);
    assert.match(stdout, /ERR_ASSERTION/);
    assert.equal(stderr, 'Total of 1 failure\n');
  });

  it('handles failing tests', async() => {
    const {exitCode, stdout, stderr} = await $`./bin/unexpectedly.js --defaultScript '$<base>.cjs' test/badMore`.quiet().nothrow();
    assert.equal(exitCode, 2);
    assert.match(stdout, /ERR_ASSERTION/);
    assert.equal(stderr, 'Total of 3 failures\n');
  });

  it('handles invalid package.json files', async() => {
    const {exitCode} = await $`./bin/unexpectedly.js test/pkg_bad`.quiet().nothrow();
    assert.equal(exitCode, 2);
  });

  it('handles invalid exports', async() => {
    const {exitCode} = await $`./bin/unexpectedly.js test/except/nullExport.test`.quiet().nothrow();
    assert.equal(exitCode, 2);
  });

  it('handles invalid testfiles', async() => {
    const {exitCode} = await $`./bin/unexpectedly.js test/except/badTest.test`.quiet().nothrow();
    assert.equal(exitCode, 1);
  });

  if (os.platform() !== 'win32') {
    it('detects odd file types', async() => {
      const fifoName = '__testFIFO__';
      await $`mkfifo ${fifoName}`;
      const {exitCode} = await $`./bin/unexpectedly.js ${fifoName}`.quiet().nothrow();
      assert.equal(exitCode, 1);
      await $`rm ${fifoName}`;
    });
  }
});