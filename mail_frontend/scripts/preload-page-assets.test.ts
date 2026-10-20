import { beforeEach, describe, expect, it } from 'vitest'
import { createPagePreloadScript } from './preload-page-assets.mjs'

const manifest = {
  'index.html': { file: 'assets/app.js', imports: ['shared'], css: ['assets/app.css'] },
  shared: { file: 'assets/shared.js' },
  list: { file: 'assets/list.js', imports: ['shared'] },
  dialog: { file: 'assets/dialog.js' },
  'src/views/portal/home/index.vue': { file: 'assets/home.js', imports: ['list'], dynamicImports: ['dialog'], css: ['assets/home.css'] },
  'src/layouts/UserLayout.vue': { file: 'assets/layout.js', imports: ['list'] },
  'src/views/portal/login/index.vue': { file: 'assets/login.js' },
  'src/views/market/index.vue': { file: 'assets/market.js' },
  'src/views/portal/share/index.vue': { file: 'assets/share.js' }
}

beforeEach(() => {
  document.head.innerHTML = '<script type="module" src="/assets/app.js"></script>'
})

const start = (pathname: string) => {
  new Function('document', 'location', createPagePreloadScript(manifest))(
    document, new URL(pathname, 'https://example.test')
  )
}
const entryLoaded = () => document.querySelector('script')!.dispatchEvent(new Event('load'))
const scripts = () => [...document.querySelectorAll('link[rel="modulepreload"]')].map(link => link.getAttribute('href'))

describe('initial page resource discovery', () => {
  it('waits for the app entry and preloads only static dependencies once', () => {
    start('/')
    expect(scripts()).toEqual([])
    expect(document.querySelector('link[as="style"]')?.getAttribute('href')).toBe('/assets/home.css')
    entryLoaded()
    expect(scripts()).toEqual(['/assets/home.js', '/assets/list.js', '/assets/layout.js'])
    entryLoaded()
    expect(scripts()).toHaveLength(3)
  })

  it.each([
    ['/login?redirect=/user', '/assets/login.js'],
    ['/market/', '/assets/market.js'],
    ['/share/public-token/', '/assets/share.js']
  ])('preloads the current route without fetching other pages: %s', (pathname, expected) => {
    start(pathname)
    entryLoaded()
    expect(scripts()).toEqual([expected])
  })

  it('leaves other routes to the router', () => {
    start('/user/settings')
    entryLoaded()
    expect(scripts()).toEqual([])
  })
})
