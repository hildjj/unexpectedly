// One of each kind of import, for testing.
import {fileURLToPath} from 'url';
import fs from 'fs/promises';
const path = await import('path');

export default async function bar() {
  const m = await fs.readFile(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'mult')
  );

  return parseInt(m, 10);
}
