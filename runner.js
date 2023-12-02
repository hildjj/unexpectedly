import {createRequire} from 'node:module';
import fs from 'fs/promises';
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
  #text;

  constructor({
    text = null, // Required
    filename = null, // Resolved
    lineOffset = 0,
    columnOffset = 0,
    sandbox = null,
    env = {},
  } = {}) {
    this.#text = text;
    this.#filename = filename;
    this.#dirname = path.dirname(filename);
    this.#env = env;
    this.#sandbox = sandbox;
    this.#columnOffset = columnOffset;
    this.#lineOffset = lineOffset;
  }

  async run(extra = {}, ...params) {
    // Find package.json relative to test, decide whether we're commonjs or
    // module.
    let dir = this.#dirname;
    let type = 'commonjs';
    if (this.#filename.endsWith('.mjs')) {
      type = 'module';
    } else if (!this.#filename.endsWith('.cjs')) {
      const dirset = new Set();
      while (dir) {
        // Avoid symlink loops and c:\.
        if (dirset.has(dir)) {
          break;
        }
        dirset.add(dir);
        try {
          const pkg = path.join(dir, 'package.json');
          if ((await fs.stat(pkg)).isFile()) {
            ({type = 'commonjs'} = JSON.parse(await fs.readFile(pkg, 'utf8')));
            break;
          }
        } catch (er) {
          if (er.code !== 'ENOENT') {
            throw er;
          }
        }

        dir = path.dirname(dir);
      }
    }

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

    if (type === 'module') {
      if (this.#text.indexOf('export') === -1) {
        this.#text = `export default ${this.#text}`; // Most common case
      }

      const mod = new vm.SourceTextModule(this.#text, {
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
      if (typeof f.test === 'function') {
        f = f.test;
      } else {
        f = f.default;
      }
    } else {
      if (this.#text.indexOf('exports') === -1) {
        this.#text = `module.exports= ${this.#text}`; // Most common case
      }

      const script = new vm.Script(this.#text, {
        filename: this.#filename,
        lineOffset: this.#lineOffset,
        columnOffset: this.#columnOffset,
      });
      f = script.runInContext(context);
    }
    if (typeof f !== 'function') {
      f = f?.test;
      if (typeof f !== 'function') {
        throw new Error('Must export function or {test}');
      }
    }
    return f(...params);
  }
}
