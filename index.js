'use strict'

const assert = require('assert')
const fs = require('fs').promises
const path = require('path')
const Mocha = require('mocha')
const parser = require('./testFile.peg')

const EXCEPTION = Symbol('EXCEPTION')

function addTest (suite, lt, js) {
  suite.addTest(new Mocha.Test(`line ${lt.line}`, async () => {
    let res = null
    try {
      res = await js(...lt.inputs, lt)
    } catch (e) {
      assert.strictEqual(lt.expected, EXCEPTION)
      return
    }
    assert.notStrictEqual(lt.expected, EXCEPTION)
    if (typeof res === 'string') {
      assert.strictEqual(res, lt.expected)
    } else {
      const expected = JSON.parse(lt.expected, reviver)
      assert.deepStrictEqual(res, expected)
    }
  }))
}

function reviver (key, value) {
  const match = typeof value === 'string'
    ? value.match(/^0xBuffer \[([a-fA-F0-9]+)\]/)
    : false
  if (!match) {
    return value
  }
  return Buffer.from(match[1], 'hex')
}

async function suite (target = '.', defaultScript = '../$1.js') {
  let dir = target
  let files = [target]

  const stats = await fs.stat(target)
  if (stats.isDirectory()) {
    files = (await fs.readdir(target))
      .filter(f => f.endsWith('.tests'))
      .map(f => path.join(dir, f))
  } else if (stats.isFile()) {
    const p = path.parse(target)
    dir = p.dir
  }
  const mocha = new Mocha()

  for (const f of files) {
    const suite = Mocha.Suite.create(mocha.suite, f)
    const contents = await fs.readFile(f, 'utf8')
    const parsed = parser.parse(contents, { EXCEPTION })

    const jsFile = parsed.vars.script
      ? path.resolve(dir, parsed.vars.script)
      : path.resolve(dir, f.replace(/([^./]*)\.tests?$/, defaultScript))
    const js = require(jsFile)
    suite.addTest(new Mocha.Test('has JS', () => {
      assert.strictEqual(typeof js, 'function')
    }))
    for (const pt of parsed.tests) {
      addTest(suite, pt, js)
    }
  }

  return new Promise((resolve, reject) => {
    mocha.run(resolve)
  })
}

suite.EXCEPTION = EXCEPTION
module.exports = suite
