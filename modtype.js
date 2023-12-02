import fs from 'node:fs/promises';
import path from 'node:path';

export class ModType {
  static #cache = new Map(); // Filename => 'commonjs', 'module', 'unknown'

  static async #readPkg(dir) {
    const pkg = path.join(dir, 'package.json');
    try {
      const {type = 'commonjs'} = JSON.parse(await fs.readFile(pkg, 'utf8'));
      return type;
    } catch {
      return undefined;
    }
  }

  static async find(name, dir = false, root = undefined) {
    const prev = this.#cache.get(name);
    if (prev) {
      return prev;
    }
    let res = 'unknown';

    if (!root) {
      const p = path.parse(name);
      switch (p.ext) {
        case '.mjs':
          res = 'module';
          this.#cache.set(name, res);
          return res;
        case '.cjs':
          res = 'commonjs';
          this.#cache.set(name, res);
          return res;
      }
      ({root} = p);
      try {
        // Avoid problems if an existing directory name is passed in originally.
        dir = (await fs.stat(name)).isDirectory();
      } catch {
        // File doesn't exist.  Safe to assume it's file-ish, keep dir = false.
      }
    }

    if (name !== root) { // Never go all the way to the root directory.
      const t = dir ? await this.#readPkg(name) : undefined;
      res = t ?? this.find(path.dirname(name), true, root);
    }
    this.#cache.set(name, res);
    return res;
  }

  static clear() {
    this.#cache.clear();
  }

  static get cacheSize() {
    return this.#cache.size;
  }
}
