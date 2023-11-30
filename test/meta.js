'use strict';

const {parse} = require('../testFile.peg');

module.exports = text => parse(text).tests;
