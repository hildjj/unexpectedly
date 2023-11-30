import bar from './bar.js';

export default async function foo(baz) {
  return (await bar()) * baz;
}
