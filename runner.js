'use strict';

const vm2 = require('vm2');

/**
 * Fancy "eval".
 *
 * @class Runner
 */
class Runner {
  #env;
  #filename;
  #sandbox;
  #script;

  constructor({
    filename = null,
    text = null,
    lineOffset = 0,
    columnOffset = 0,
    sandbox = null,
    env = {},
  } = {}) {
    if (!text) {
      throw new Error('Text is required');
    }
    this.#filename = filename;
    this.#env = env;
    this.#sandbox = sandbox;
    this.#script = new vm2.VMScript(text, filename, {
      lineOffset,
      columnOffset,
    });
  }

  run(extra = {}, ...params) {
    const nvm = new vm2.NodeVM({
      console: 'inherit',
      require: { // TODO: Think about how much of this is for security?
        external: true,
        builtin: ['*'],
      },
      sandbox: {...this.#sandbox, ...extra},
      env: this.#env,
    });
    let f = nvm.run(this.#script, this.#filename);
    if (!f) {
      throw new Error('Nothing exported');
    }
    if (typeof f !== 'function') {
      f = f.test;
      if (typeof f !== 'function') {
        throw new Error('Must export function or {test}');
      }
    }
    return f(...params);
  }
}

module.exports = Runner;
