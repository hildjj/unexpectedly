'use strict';

module.exports = {
  root: true,
  extends: ['@cto.af/eslint-config/modules', '@cto.af/eslint-config/jsdoc'],
  ignorePatterns: [
    'node_modules/',
    '*.peg.js',
  ],
  parserOptions: {
    ecmaVersion: 13,
  },
};
