import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

function preloadCurrentPage(assets) {
  const pathname = location.pathname.replace(/\/+$/, '') || '/'
  const name = pathname === '/' ? 'home'
    : pathname === '/login' ? 'login'
      : pathname === '/market' ? 'market'
        : /^\/share\/[^/]+$/.test(pathname) ? 'share' : null
  const page = assets[name]
  if (!page) return
  const load = (groups) => {
    for (const [rel, files] of groups) {
      for (const href of files) {
        if (document.head.querySelector(`link[href="${href}"]`)) continue
        const link = document.createElement('link')
        link.rel = rel
        link.href = href
        link.crossOrigin = ''
        if (rel === 'preload') link.setAttribute('as', 'style')
        document.head.appendChild(link)
      }
    }
  }
  // CSS otherwise blocks the router from importing the page. Keep larger page
  // scripts behind the app entry so they do not delay the first visible frame.
  load([['preload', page.css]])
  document.querySelector('script[type="module"][src]')?.addEventListener('load', () => load([['modulepreload', page.js]]), { once: true })
}

// Discover only the current public page's styles early, then its scripts after
// the app entry loads. Dynamic features (dialogs, Excel, editor) stay on demand.
export function createPagePreloadScript(manifest) {
  const pages = {
    home: ['src/views/portal/home/index.vue', 'src/layouts/UserLayout.vue'],
    login: ['src/views/portal/login/index.vue'],
    market: ['src/views/market/index.vue'],
    share: ['src/views/portal/share/index.vue']
  }
  function collect(keys, visited = new Set()) {
    for (const key of keys) {
      if (visited.has(key)) continue
      const entry = manifest[key]
      if (!entry) throw new Error(`Missing build entry: ${key}`)
      visited.add(key)
      collect(entry.imports || [], visited)
    }
    return visited
  }
  const app = collect(['index.html'])
  const assets = Object.fromEntries(Object.entries(pages).map(([name, roots]) => {
    const js = new Set()
    const css = new Set()
    for (const key of collect(roots, new Set(app))) {
      if (app.has(key)) continue
      const entry = manifest[key]
      if (entry.file.endsWith('.js')) js.add('/' + entry.file)
      for (const file of entry.css || []) css.add('/' + file)
    }
    return [name, { js: [...js], css: [...css] }]
  }))
  return `(${preloadCurrentPage.toString()})(${JSON.stringify(assets).replaceAll('<', '\\u003c')});`
}

export function preloadPageAssets(directory = 'dist') {
  const root = resolve(directory)
  const manifest = JSON.parse(readFileSync(resolve(root, '.vite/manifest.json'), 'utf8'))
  const file = resolve(root, 'index.html')
  const marker = '<script id="initial-page-preloads">'
  const html = readFileSync(file, 'utf8')
  if (html.includes(marker)) throw new Error('Initial page preloads already added; rebuild before running again.')
  if (!html.includes('</head>')) throw new Error('Missing HTML head')
  const prioritized = html.replace(/<script type="module" crossorigin src=/, '<script type="module" crossorigin fetchpriority="high" src=')
  writeFileSync(file, prioritized.replace('</head>', `${marker}${createPagePreloadScript(manifest)}</script>\n  </head>`))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  preloadPageAssets(process.argv[2])
}
