const bar = require('./bar.js');

module.exports = async function foo(baz) {
  return (await bar()) * baz;
};
