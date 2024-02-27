import fromMem from '@peggyjs/from-mem';
import path from 'node:path';

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
  #type;

  constructor({
    filename = null, // Fully-qualified
    lineOffset = 0,
    columnOffset = 0,
    context = null,
    env = {},
    type = 'guess',
  } = {}) {
    if (typeof filename !== 'string') {
      throw new TypeError('filename not specified')
    }
    this.#filename = filename;
    this.#dirname = path.dirname(filename);
    this.#env = env;
    this.#context = context;
    this.#columnOffset = columnOffset;
    this.#lineOffset = lineOffset;
    this.#type = type;
  }

  async parse(text, extra = {}) {
    const format = this.#type === 'guess' ?
      await fromMem.guessModuleType(this.#filename) :
      this.#type;

    if (format === 'es') {
      if (text.indexOf('export') === -1) {
        text = `export default ${text}`; // Most common case
      }
    } else if (text.indexOf('exports') === -1) {
      text = `module.exports = ${text}`; // Most common case
    }

    return await fromMem(text, {
      filename: this.#filename,
      format,
      env: this.#env,
      lineOffset: this.#lineOffset,
      columnOffset: this.#columnOffset,
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
    if (typeof f !== 'function') {
      f = f?.test ?? f?.default;
      if (typeof f !== 'function') {
        throw new Error('Must export function or {test}');
      }
    }
    return f(...params);
  }
}
