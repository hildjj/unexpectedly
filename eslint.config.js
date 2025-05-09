import base from '@cto.af/eslint-config';
import mocha from '@cto.af/eslint-config/mocha.js';
import mod from '@cto.af/eslint-config/module.js';

export default [
  {
    ignores: [
      'docs/**',
      'coverage/**',
      '**/*.peg.js',
      '**/*.d.ts',
      'test/pkg_bad/package.json',
    ],
  },
  ...base,
  ...mod,
  ...mocha,
];
