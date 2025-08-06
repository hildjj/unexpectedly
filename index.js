import {Runner, SKIPPED} from './runner.js';
import {hexlify, mapObj} from './utils.js';
import Mocha from 'mocha';
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
  if (actual === SKIPPED) {
    return [SKIPPED, SKIPPED];
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
 * @typedef {object} SuiteOptions
 * @property {string} [defaultScript='../$<base>.js'] Find the script from the
 *   file name.  Replace `$<base>` with the basename of the file.  For
 *   example, "foo.test" will use "../foo.js" by default.
 * @property {string} [function='test'] Use this function for testing in the
 *   associated script.
 */

/**
 * Run a test suite from a file or directory.
 *
 * @param {string} [target='.'] The file or directory to read.  If a
 *   directory, reads all files ending in `.tests`.
 * @param {SuiteOptions} [options={}] Options for processing the suite.
 * @returns {Promise<number>} Promise fulfills on completion, with number of
 *   test failures.
 */
export async function suite(target = '.', options = {}) {
  options = {
    defaultScript: '../$<base>.js',
    function: 'test',
    ...options,
  };
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

    for (const pt of parsed) {
      const opts = {
        testFunction: options.function,
      };
      let text = '';
      if (pt.vars.inline) {
        opts.filename = f;
        text = pt.vars.inline.value;
        opts.lineOffset = pt.vars.inline.line - 1;
        opts.columnOffset = pt.vars.inline.column;
      } else {
        if (pt.vars.script) {
          opts.filename = path.resolve(dir, pt.vars.script.value);
        } else {
          // Avoid a previous ReDOS regexp.
          const p = path.parse(f);
          if (/^\.tests?$/.test(p.ext)) {
            delete p.base;
            delete p.ext;
            p.name = p.name.replace(/^(?<base>.*)$/, options.defaultScript);
            opts.filename = path.resolve(dir, path.format(p));
          } else {
            opts.filename = path.resolve(dir, f);
          }
        }
        text = await fs.readFile(opts.filename, 'utf8');
      }
      if (pt.vars.timeout) {
        msuite.timeout(parseInt(pt.vars.timeout.value, 10));
      }
      opts.context = mapObj(
        Object.entries(pt.vars).filter(([_k, v]) => !v.env),
        ([key, value]) => [key, value.value]
      );
      opts.env = mapObj(
        Object.entries(pt.vars).filter(([_k, v]) => v.env),
        ([key, value]) => [key, value.value]
      );

      const runner = new Runner(opts);

      const firstLine = (pt.expected === EXCEPTION) ? `! ${pt.inputs[0]}` : pt.expected.split(/\n/)[0];
      const t = new Mocha.Test(`line ${pt.line}: ${firstLine || '""'}`, async () => {
        let actual = null;
        try {
          actual = await runner.run(text, {
            __expected: pt.expected,
            __line: pt.line,
            __column: pt.column,
            __offset: pt.offset,
          }, ...pt.inputs);
          if (actual === SKIPPED) {
            t.skip('Node 20.8 required');
            return;
          }
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

  return new Promise((resolve, _reject) => {
    mocha.run(resolve);
  });
}

suite.EXCEPTION = EXCEPTION;
