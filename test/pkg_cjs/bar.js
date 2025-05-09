const fs = require('node:fs').promises;

module.exports = async function bar() {
  const path = await import('node:path');
  const m = await fs.readFile(
    path.resolve(__dirname, 'mult')
  );

  return parseInt(m, 10);
};
