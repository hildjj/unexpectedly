'use strict'

const assert = require('assert')
const fs = require('fs')
const util = require('util')
const path = require('path')
const Mocha = require('mocha') // TODO: just use one of the reporters
const parser = require('./testFile.peg')
const Runner = require('./runner')
const { mapObj, hexlify } = require('./utils')

const EXCEPTION = Symbol('EXCEPTION')

// TODO: once the warning goes away
// const fsp = require('fs').promises
const fsp = mapObj(['readdir', 'readFile', 'stat'],
  s => util.promisify(fs[s]))

function coerce (actual, expected) {
  if (typeof actual === 'string') {
    return [actual, expected]
  }
  if (actual && (typeof actual === 'object') && actual.constructor) {
    const name = actual.constructor.name

    switch (name) {
      case 'Buffer':
        return ['0x' + actual.toString('hex'), expected]
      // note: other Typed Array's won't work for now because vm2 doens't
      // support them
    }
  }
  return [actual, JSON.parse(expected)]
}

/**
 * Run a test suite from a file or directory
 *
 * @param {string} [target='.'] The file or directory to read.  If a diretory,
 *   reads all files ending in `.test`
 * @param {string} [defaultScript='../$1.js'] find the script from the file
 *   name.  Replace $1 with the basename of the file.  For example, "foo.test"
 *   will use "../foo.js" by default
 * @returns Promise fulfills on success
 */
async function suite (target = '.', defaultScript = '../$1.js') {
  let dir = target
  let files = [target]

  const stats = await fsp.stat(target)
  if (stats.isDirectory()) {
    files = (await fsp.readdir(target))
      .filter(f => f.endsWith('.tests'))
      .map(f => path.join(dir, f))
  } else if (stats.isFile()) {
    const p = path.parse(target)
    dir = p.dir
  }
  const mocha = new Mocha()

  for (const f of files) {
    const suite = Mocha.Suite.create(mocha.suite, f)
    const contents = await fsp.readFile(f, 'utf8')
    const parsed = parser.parse(contents, { EXCEPTION })

    const opts = {}
    if (parsed.vars.inline) {
      opts.filename = f
      opts.text = parsed.vars.inline.value
      if (opts.text.indexOf('exports') === -1) {
        opts.text = 'module.exports= ' + opts.text // most common case
      }
      opts.lineOffset = parsed.vars.inline.line
      opts.columnOffset = parsed.vars.inline.column
    } else {
      opts.filename = parsed.vars.script
        ? path.resolve(dir, parsed.vars.script.value)
        : path.resolve(dir, f.replace(/([^./]*)\.tests?$/, defaultScript))
    }
    opts.sandbox = mapObj(
      Object.entries(parsed.vars),
      ([key, value]) => [key, value.value])

    let runner = new Runner(opts)

    for (const pt of parsed.tests) {
      suite.addTest(new Mocha.Test(`line ${pt.line}`, async () => {
        let actual = null
        try {
          actual = await runner.run({
            __expected: pt.expected,
            __line: pt.line,
            __column: pt.column
          }, ...pt.inputs)
        } catch (e) {
          assert.strictEqual(pt.expected, EXCEPTION, e)
          return
        }
        assert.notStrictEqual(pt.expected, EXCEPTION)
        assert.deepStrictEqual.apply(null, coerce(actual, pt.expected))
      }))
    }
  }

  return new Promise((resolve, reject) => {
    mocha.run(resolve)
  })
}

suite.EXCEPTION = EXCEPTION
module.exports = suite
