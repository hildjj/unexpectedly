import {hexlify, mapObj} from './utils.js';
import Mocha from 'mocha';
import {Runner} from './runner.js';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import {parse} from './testFile.peg.js';
import path from 'node:path';

const EXCEPTION = Symbol('EXCEPTION');

async function coerce(actual, pt, runner) {
  const {expected} = pt;
  if (typeof actual === 'string') {
    return [actual, expected];
  }
  if (actual && (typeof actual === 'object') && actual.constructor) {
    if (/^0x/.test(expected)) {
      const {name} = actual.constructor;

      switch (name) {
        case 'Buffer':
          return [`0x${actual.toString('hex')}`, expected];
        case 'Float32Array':
        case 'Float64Array':
        case 'Int16Array':
        case 'Int32Array':
        case 'Int8Array':
        case 'Uint16Array':
        case 'Uint32Array':
        case 'Uint8Array':
        case 'Uint8ClampedArray':
          return [`0x${hexlify(actual)}`, expected];
      }
    }
  }

  const exp = await runner.parse(expected, {
    __line: pt.line,
    __column: pt.column,
  });
  const def = Object.hasOwn(exp, 'default') ? exp.default : exp;
  return [actual, def];
}

/**
 * Run a test suite from a file or directory.
 *
 * @param {string} [target='.'] The file or directory to read.  If a
 *   directory, reads all files ending in `.tests`.
 * @param {string} [defaultScript='../$<base>.js'] Find the script from the
 *   file name.  Replace $1 with the basename of the file.  For example,
 *   "foo.test" will use "../foo.js" by default.
 * @returns {Promise<number>} Promise fulfills on completion, with number of
 *   test failures.
 */
export async function suite(target = '.', defaultScript = '../$<base>.js') {
  let dir = path.resolve(target);
  let files = [dir];
  const mocha = new Mocha();
  mocha.suite.title = dir;

  const stats = await fs.stat(dir);
  if (stats.isDirectory()) {
    files = (await fs.readdir(target))
      .filter(f => /\.tests?$/.test(f))
      .map(f => path.join(dir, f));
  } else if (stats.isFile()) {
    // eslint-disable-next-line require-atomic-updates
    ({dir} = path.parse(target));
  } else {
    throw new Error(`Unknown file type: "${target}"`);
  }

  for (const f of files) {
    const msuite = Mocha.Suite.create(mocha.suite, f);
    const contents = await fs.readFile(f, 'utf8');

    let parsed = null;
    try {
      parsed = parse(contents, {EXCEPTION, grammarSource: f});
    } catch (er) {
      if (typeof er.format === 'function') {
        er.message = er.format([{
          source: f,
          text: contents,
        }]);
        delete er.expected;
        delete er.location;
      }
      throw er;
    }

    const opts = {};
    let text = '';
    if (parsed.vars.inline) {
      opts.filename = f;
      text = parsed.vars.inline.value;
      opts.lineOffset = parsed.vars.inline.line - 1;
      opts.columnOffset = parsed.vars.inline.column;
    } else {
      opts.filename = parsed.vars.script ?
        path.resolve(dir, parsed.vars.script.value) :
        path.resolve(dir, f.replace(/(?<base>[^./]*)\.tests?$/, defaultScript));
      text = await fs.readFile(opts.filename, 'utf8');
    }
    if (parsed.vars.timeout) {
      msuite.timeout(parseInt(parsed.vars.timeout.value, 10));
    }
    opts.sandbox = mapObj(
      Object.entries(parsed.vars).filter(([k, v]) => !v.env),
      ([key, value]) => [key, value.value]
    );
    opts.env = mapObj(
      Object.entries(parsed.vars).filter(([k, v]) => v.env),
      ([key, value]) => [key, value.value]
    );
    const runner = new Runner(opts);

    for (const pt of parsed.tests) {
      const firstLine = (pt.expected === EXCEPTION) ? '!' : pt.expected.split(/\n/)[0];
      const t = new Mocha.Test(`line ${pt.line}: ${firstLine || '""'}`, async() => {
        let actual = null;
        try {
          actual = await runner.run(text, {
            __expected: pt.expected,
            __line: pt.line,
            __column: pt.column,
          }, ...pt.inputs);
        } catch (e) {
          if (pt.expected !== EXCEPTION) {
            throw e;
          }
          return;
        }
        assert.notStrictEqual(pt.expected, EXCEPTION);
        assert.deepEqual.apply(null, await coerce(actual, pt, runner));
      });
      msuite.addTest(t);
    }
  }

  return new Promise((resolve, reject) => {
    mocha.run(resolve);
  });
}

suite.EXCEPTION = EXCEPTION;
