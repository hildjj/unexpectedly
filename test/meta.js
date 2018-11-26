'use strict'

const { parse } = require('../testFile.peg')

module.exports = (text) => {
  return parse(text).tests
}
