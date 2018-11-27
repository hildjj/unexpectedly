'use strict'

const assert = require('assert')
const fs = require('fs').promises
const path = require('path')
const Mocha = require('mocha')
const parser = require('./testFile.peg')
const Runner = require('./runner')

const EXCEPTION = Symbol('EXCEPTION')

function hexToArray (s) {
  return Uint8ClampedArray.from(
    { length: s.length / 2 },
    (buf, off) => {
      const sof = off * 2
      return parseInt(s.slice(sof, sof + 2), 16)
    })
}

function reviver (key, value) {
  const match = (typeof value === 'string')
    ? value.match(/^0xBuffer \[((?:[a-fA-F0-0]{2})*)\]$/)
    : false
  return !match ? value : hexToArray(match[1])
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

    let filename
    let text
    let lineOffset
    let columnOffset
    if (parsed.vars.inline) {
      filename = f
      text = 'module.exports= ' + parsed.vars.inline.value
      lineOffset = parsed.vars.inline.line
      columnOffset = parsed.vars.inline.column
    } else {
      filename = parsed.vars.script
        ? path.resolve(dir, parsed.vars.script.value)
        : path.resolve(dir, f.replace(/([^./]*)\.tests?$/, defaultScript))
    }
    const sandbox = Object
      .entries(parsed.vars)
      .reduce((last, [key, value]) => {
        last[key] = value.value
        return last
      }, {})

    let runner = new Runner({
      filename,
      text,
      lineOffset,
      columnOffset,
      sandbox
    })

    for (const pt of parsed.tests) {
      suite.addTest(new Mocha.Test(`line ${pt.line}`, async () => {
        let res = null
        try {
          res = await runner.run({
            __expected: pt.expected,
            __line: pt.line,
            __column: pt.column
          }, ...pt.inputs)
        } catch (e) {
          assert.strictEqual(pt.expected, EXCEPTION, e)
          return
        }
        assert.notStrictEqual(pt.expected, EXCEPTION)
        if (typeof res === 'string') {
          assert.strictEqual(res, pt.expected)
        } else {
          const expected = JSON.parse(pt.expected, reviver)
          assert.deepStrictEqual(res, expected)
        }
      }))
    }
  }

  return new Promise((resolve, reject) => {
    mocha.run(resolve)
  })
}

suite.EXCEPTION = EXCEPTION
module.exports = suite
