import {ModType} from './modtype.js';
import {createRequire} from 'node:module';
import {mapObj} from './utils.js';
import path from 'node:path';
import vm from 'node:vm';

const vmGlobals = new vm.Script('Object.getOwnPropertyNames(globalThis)')
  .runInNewContext()
  .filter(f => !f.startsWith('global'));
vmGlobals.push('process', 'Buffer');

async function linker(specifier, referencingModule, cache) {
  // Note: not convinced the cache actually does anything, due to timing.
  if (cache?.has(specifier)) {
    return cache.get(specifier);
  }
  const m = await import(specifier);
  const exportNames = Object.keys(m);
  const imported = new vm.SyntheticModule(
    exportNames,
    // eslint-disable-next-line func-names
    function() {
      // eslint-disable-next-line no-invalid-this
      exportNames.forEach(key => this.setExport(key, m[key]));
    },
    {identifier: specifier, context: referencingModule.context}
  );

  cache?.set(specifier, imported);
  return imported;
}

/**
 * Fancy "eval".  This is NOT for adding security, even though we're using
 * node:vm.  This is about providing:
 *
 * - Good backtraces with file/line/column information correct, even when the
 *   code was inlined into a test.
 * - A require() and import() that are relative to the source file.
 *
 * @class Runner
 */
export class Runner {
  #columnOffset;
  #dirname;
  #env;
  #filename;
  #lineOffset;
  #sandbox;
  #type;

  constructor({
    filename = null, // Resolved
    lineOffset = 0,
    columnOffset = 0,
    sandbox = null,
    env = {},
    type = null,
  } = {}) {
    this.#filename = filename;
    this.#dirname = path.dirname(filename);
    this.#env = env;
    this.#sandbox = sandbox;
    this.#columnOffset = columnOffset;
    this.#lineOffset = lineOffset;
    this.#type = type;
  }

  async parse(text, extra = {}) {
    if (!this.#type) {
      this.#type = await ModType.find(this.#filename);
    }
    // Find package.json relative to test, decide whether we're commonjs or
    // module.
    const exports = {};
    const context = {
      ...mapObj(vmGlobals, g => (
        (typeof globalThis[g] === 'function') ?
          globalThis[g] :
          {...globalThis[g]}
      )),
      require: createRequire(this.#filename),
      exports,
      module: {
        exports,
        filename: this.#filename,
        id: this.#filename,
        path: this.#dirname,
      },
      __filename: this.#filename,
      __dirname: this.#dirname,
      ...this.#sandbox,
      ...extra,
    };
    context.process.env = this.#env;
    context.global = context;
    context.globalThis = context;
    vm.createContext(context);

    let f = null;
    const imports = new Map();

    if (this.#type === 'module') {
      if (text.indexOf('export') === -1) {
        text = `export default ${text}`; // Most common case
      }

      const mod = new vm.SourceTextModule(text, {
        context,
        id: this.#filename,
        lineOffset: this.#lineOffset,
        columnOffset: this.#columnOffset,
      });

      await mod.link((specifier, referencingModule) => {
        if (path.isAbsolute(specifier) || !/^\.\.?\//.test(specifier)) {
          return linker(specifier, referencingModule, imports);
        }
        return linker(
          path.resolve(path.dirname(this.#filename), specifier),
          referencingModule,
          imports
        );
      });
      await mod.evaluate();
      f = mod.namespace;
    } else {
      if (text.indexOf('exports') === -1) {
        text = `module.exports= ${text}`; // Most common case
      }

      const script = new vm.Script(text, {
        filename: this.#filename,
        lineOffset: this.#lineOffset,
        columnOffset: this.#columnOffset,
      });
      f = script.runInContext(context);
    }
    return f;
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
