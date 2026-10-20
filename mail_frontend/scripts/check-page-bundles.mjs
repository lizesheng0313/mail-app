import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

// Count every static dependency of both the app entry and the route. Lazy feature
// imports stay outside the initial budget, even if Rollup changes chunk names.
const directory = resolve(process.argv[2] || 'dist')
const manifest = JSON.parse(readFileSync(resolve(directory, '.vite/manifest.json'), 'utf8'))
const pages = [
  ['home', 'src/views/portal/home/index.vue', 300],
  ['login', 'src/views/portal/login/index.vue', 200],
  ['market', 'src/views/market/index.vue', 210],
  ['share', 'src/views/portal/share/index.vue', 240]
]

let exceeded = false
for (const [name, route, budget] of pages) {
  const visited = new Set()
  function visit(key) {
    if (visited.has(key)) return
    const entry = manifest[key]
    if (!entry) throw new Error(`Missing build entry: ${key}`)
    visited.add(key)
    for (const dependency of entry.imports || []) visit(dependency)
  }
  visit('index.html')
  visit(route)
  const bytes = [...visited].reduce((sum, key) => {
    const file = manifest[key].file
    return sum + (file.endsWith('.js') ? gzipSync(readFileSync(resolve(directory, file)), { level: 6 }).length : 0)
  }, 0)
  const size = bytes / 1024
  console.log(`${name}: ${size.toFixed(1)} KiB gzip (budget ${budget} KiB)`)
  if (size > budget) exceeded = true
}
if (exceeded) {
  console.error('Initial page JavaScript exceeds its performance budget.')
  process.exitCode = 1
}
