import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const at = (path) => fileURLToPath(new URL(`../node_modules/${path}`, import.meta.url))

try {
  const pkgPath = at('@kabelsalat/web/package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  if (!pkg.exports) {
    pkg.exports = {
      import: './dist/index.mjs',
      require: './dist/index.js',
    }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
    console.log('Patched @kabelsalat/web exports')
  }
} catch (e) {
  // If not installed yet or already fine, ignore
}

