'use strict';

const fs = require('fs');
const vm = require('vm');
const vm2 = require('vm2');

class VMScriptLines extends vm2.VMScript {
  constructor(code, {filename, lineOffset = 0, columnOffset = 0} = {}) {
    super(code, filename);
    this._lineOffset = lineOffset;
    this._columnOffset = columnOffset;
  }

  compile() {
    if (this._compiled) {
      return this;
    }

    this._compiled = new vm.Script(this.code, {
      filename: this.filename,
      displayErrors: false,
      lineOffset: this._lineOffset,
      columnOffset: this._columnOffset,
    });

    return this;
  }
}

/**
 * Fancy "eval".
 *
 * @class Runner
 */
class Runner {
  constructor({
    filename = null,
    text = null,
    lineOffset = 0,
    columnOffset = 0,
    sandbox = null,
  } = {}) {
    if (!text) {
      if (!filename) {
        throw new Error('Either file or text is required');
      }
      text = fs.readFileSync(filename, 'utf8');
    }
    this.filename = filename;
    this.sandbox = sandbox;
    this.script = new VMScriptLines(text, {
      filename,
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
      sandbox: {...this.sandbox, ...extra},
    });
    let f = nvm.run(this.script, this.filename);
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
