import GrammarLocation from './vendor/peggy/grammar-location.cjs';
import fromMem from '@peggyjs/from-mem';
import path from 'node:path';
import semver from 'semver';

const PREFIX_MJS = 'export default ';
const PREFIX_CJS = 'module.exports = ';
const PREFIX_MJS_LEN = PREFIX_MJS.length;
const PREFIX_CJS_LEN = PREFIX_CJS.length;

const is20 = semver.satisfies(process.version, '>=20.8');

export const SKIPPED = Symbol('SKIPPED');

/**
 * Fancy "eval".  This is NOT for adding security. This is about providing:
 *
 * - Good backtraces with file/line/column information correct, even when the
 *   code was inlined into a test.
 * - A require() and import() that are relative to the source file.
 *
 * @class Runner
 */
export class Runner {
  #columnOffset;
  #context;
  #dirname;
  #env;
  #filename;
  #lineOffset;
  #silent18;
  #testFunction;
  #type;
  #skipped;

  constructor({
    filename = null, // Fully-qualified
    lineOffset = 0,
    columnOffset = 0,
    context = {},
    env = {},
    silent18 = false,
    testFunction = 'test',
    type = 'guess',
  } = {}) {
    if (typeof filename !== 'string') {
      throw new TypeError('filename not specified');
    }
    this.#filename = filename;
    this.#dirname = path.dirname(filename);
    this.#env = env;
    this.#context = context;
    this.#columnOffset = columnOffset;
    this.#lineOffset = lineOffset;
    this.#silent18 = silent18;
    this.#skipped = null;
    this.#type = type;
    this.#testFunction = testFunction;
  }

  get skipped() {
    return this.#skipped;
  }

  async parse(text, extra = {}) {
    const format = this.#type === 'guess' ?
      await fromMem.guessModuleType(this.#filename) :
      this.#type;

    let columnOffset = this.#columnOffset;
    if (format === 'es') {
      if (this.#silent18 && !is20) {
        this.#skipped = true;
        return SKIPPED;
      }

      if (text.indexOf('export') === -1) {
        text = PREFIX_MJS + text; // Most common case
        columnOffset -= PREFIX_MJS_LEN;
      }
    } else if (text.indexOf('exports') === -1) {
      text = PREFIX_CJS + text; // Most common case
      columnOffset -= PREFIX_CJS_LEN;
    }

    return await fromMem(text, {
      filename: this.#filename,
      format,
      env: this.#env,
      lineOffset: this.#lineOffset,
      columnOffset,
      context: {
        filename: this.#filename,
        id: this.#filename,
        path: this.#dirname,
        ...this.#context,
        ...extra,
      },
    });
  }

  async run(text, extra = {}, ...params) {
    let f = await this.parse(text, extra);
    if (f === SKIPPED) {
      return f;
    }

    const possibleFunctions = [
      this.#context.function,
      this.#testFunction,
      'default',
    ];

    let source = null;
    if ('peggy' in this.#context) {
      source = new GrammarLocation(this.#filename, {
        line: extra.__line,
        column: extra.__column,
        offset: extra.__offset,
      });
      const popts = {
        grammarSource: source,
      };
      if (this.#context.peggy?.length > 0) {
        popts.startRule = this.#context.peggy;
      }
      params[1] = popts;
      possibleFunctions.splice(1, 0, 'parse');
    }

    if (f && (typeof f !== 'function')) {
      for (const possible of possibleFunctions) {
        if (possible && (typeof f[possible] === 'function')) {
          f = f[possible];
          break;
        }
      }
    }
    if (typeof f !== 'function') {
      throw new Error('Must export function or {test}');
    }

    try {
      return f(...params);
    } catch (er) {
      if (source && (typeof er.format === 'function')) {
        er.message = er.format([{source, text: params[0]}]);
      }
      throw er;
    }
  }
}
