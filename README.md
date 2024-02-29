# Unexpectedly

Write a bunch of unit tests in a simple file.

## Install

```sh
npm install -g unexpectedly
```

## Usage

```
Usage: unexpectedly [options] [...file]

Arguments:
  ...file                           Files or directories to test (default:
                                    "./test/")

Options:
  -V, --version                     output the version number
  -d,--defaultScript <replacement>  Find the script from the file name.
                                    Replace `$<base>` with the basename of the
                                    file. (default: "../$<base>.js")
  -f,--function <functionName>      Use this function for testing in the
                                    associated script (default: "test")
  -h, --help                        display help for command
```

## Example

This is the easiest case, when the function that you want to test is already
exposed as the default export or exported as a function named `test`:

tests/bar.tests:
```
# "8" is the expected result, "4" and "2" are the inputs to the tested function
8 4 2
```

bar.js:
```js
// The default or `test` export from the associated .js file is the
// tested function by default
export default mult(a, b) {
  return a * b;
}

export function baz(a) {
  return a * 6;
}
```

To test the `baz` function, we needed to write a little wrapper code:

tests/baz.tests:
```
#! inline: `export {baz as test} from '../foo.js'`
6 1 # Expect 6 to result from `baz("1")`
12 2
```

run:
```sh
unexpectedly tests/
```

## API

```js
import {suite} from 'unexpectedly';

await suite(directoryOrFile, {
  defaultScript: '../$<base>.js',
  function: 'test',
}).catch(console.error)
```

## Test language

One test per line.  Expected results, followed by parameters, each
separated by spaces.  Use quotes ('single', "double", or
\`backticks\` as desired) to contain interesting results or
parameters, including newlines.

Blank lines are ok.  Extra whitespace is ok.  Comments start with `#`.

```
# one test:
some 'big things' "to
test"
```

Aggressive type coercion is used, including if the test JavaScript
returns an non-string the result string is parsed as JavaScript before
comparison.

Set file-wide globals with lines that start with `#!`, separating
the name and the value with a colon.  These globals will be made available
to your test script as global variables:

```
#! name: value
```

Special globals include:
 - "inline": the value is used as the test JavaScript instead of
   reading a file
 - "script": the value is used as the test JavaScript filename
   instead of the default
 - "timeout": If any test in the file takes longer than this (in ms),
   it fails.  Default: 2000
 - "peggy": Treat the input as a compiled peggy grammar; look for a "parse"
   function in the input script, provide better errors, and use the value
   of the peggy global (if any) as the startRule.

Environment variables can be set for the test code with `#!! name: value`.

## JavaScript to test

You can specify JavaScript to run for each test in one of three ways:

- Use the mapping from test file name to a JavaScript file.  By default, this
  takes the basename of the .tests file and looks up one directory for a .js
  file of the same basename.  So `tests/foo.tests` looks for `foo.js`.  If
  needed you can replace the mapping with something else, that uses `$<base>`
  as a placeholder for the basename.
- Specify a global in your .tests file with the name `script`.  That is the name
  of the file, relative to the directory that contains the .tests file, to look
  for JavaScript.
- Specify a global in your .tests file with the name `inline`.  That's just
  JavaScript to run per-line.

In es6 module projects, for each of the above, make sure `export default` is a
function, or that you export a function named `test`.  For inline code, if you
don't export anything, `export default` will be added to the beginning of your
code, so that you can just put in a simple function.

In commonjs projects, for each of the above, make sure `module.exports` is a
function, or that you export a function named `test`.  For inline code, if you
don't export anything, `module.exports=` will be added to the beginning of
your code, so that you can just put in a simple function.

Special globals available in all forms of the JavaScript above include:

- `__filename` and `__dirname` as normal
- `__expected` is the string form of the expected result
- `__line` is the line number where the test starts
- `__column` is the column where the test text starts

[![Tests](https://github.com/hildjj/unexpectedly/actions/workflows/node.js.yml/badge.svg)](https://github.com/hildjj/unexpectedly/actions/workflows/node.js.yml)
[![codecov](https://codecov.io/gh/hildjj/unexpectedly/graph/badge.svg?token=H8EXAJRBU1)](https://codecov.io/gh/hildjj/unexpectedly)
