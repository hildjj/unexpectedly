'use strict';

module.exports = {
  root: true,
  extends: ['@cto.af', '@cto.af/eslint-config/jsdoc'],
  ignorePatterns: [
    'node_modules/',
    '*.peg.js',
  ],
};
