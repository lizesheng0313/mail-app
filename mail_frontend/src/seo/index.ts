import { watch } from 'vue'
import type { I18n } from 'vue-i18n'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

export interface PageSeo {
  title: string
  description: string
  keywords?: string
  canonicalPath?: string
  robots?: string
  ogType?: string
  lang?: string
}

const SITE_URL = 'https://zjkdongao.cn'
const SITE_NAME = 'FeiMao Mail'

const DEFAULT_SEO: PageSeo = {
  title: '',
  description: '',
  keywords: '',
  canonicalPath: '/',
  robots: 'index, follow',
  ogType: 'website',
  lang: 'zh-CN'
}

const ROUTE_SEO_KEY_MAP: Record<string, string> = {
  login: 'login',
  dashboard: 'dashboard',
  'open-platform': 'openPlatform',
  about: 'about',
  'privacy-policy': 'privacyPolicy',
  'terms-of-service': 'termsOfService',
  'workflow-market': 'workflowMarket',
  'workflow-detail': 'workflowDetail',
  download: 'download'
}

const NOINDEX_PREFIXES = ['/auth/google', '/share/', '/payment', '/purchase']

const normalizePath = (path: string) => {
  if (!path || path === '/') return '/'
  return path.replace(/\/+$/, '')
}

const buildCanonicalUrl = (path: string) => {
  if (!path || path === '/') return `${SITE_URL}/`
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

const shouldNoIndex = (route: RouteLocationNormalizedLoaded) => {
  if (route.name === 'login') {
    return true
  }

  if (NOINDEX_PREFIXES.some(prefix => route.path === prefix || route.path.startsWith(prefix))) {
    return true
  }

  return route.matched.some(record => Boolean(record.meta.requiresAuth || record.meta.requiresAdmin))
}

const upsertMeta = (selector: string, attributes: Record<string, string>) => {
  let meta = document.head.querySelector(selector) as HTMLMetaElement | null

  if (!meta) {
    meta = document.createElement('meta')
    document.head.appendChild(meta)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    meta?.setAttribute(key, value)
  })
}

const upsertLink = (rel: string, href: string) => {
  let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null

  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', rel)
    document.head.appendChild(link)
  }

  link.setAttribute('href', href)
}

export const applyPageSeo = (seo: PageSeo) => {
  const canonicalUrl = buildCanonicalUrl(seo.canonicalPath || '/')
  const locale = seo.lang === 'en' ? 'en_US' : seo.lang === 'zh-TW' ? 'zh_TW' : 'zh_CN'

  document.documentElement.setAttribute('lang', seo.lang || DEFAULT_SEO.lang || 'zh-CN')
  document.title = seo.title

  upsertMeta('meta[name="description"]', { name: 'description', content: seo.description })
  upsertMeta('meta[name="keywords"]', {
    name: 'keywords',
    content: seo.keywords || DEFAULT_SEO.keywords || ''
  })
  upsertMeta('meta[name="robots"]', {
    name: 'robots',
    content: seo.robots || DEFAULT_SEO.robots || 'index, follow'
  })
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title })
  upsertMeta('meta[property="og:description"]', {
    property: 'og:description',
    content: seo.description
  })
  upsertMeta('meta[property="og:type"]', {
    property: 'og:type',
    content: seo.ogType || DEFAULT_SEO.ogType || 'website'
  })
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl })
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME })
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: locale })
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary' })
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title })
  upsertMeta('meta[name="twitter:description"]', {
    name: 'twitter:description',
    content: seo.description
  })

  upsertLink('canonical', canonicalUrl)
}

export const resolveRouteSeo = (route: RouteLocationNormalizedLoaded, i18n?: I18n): PageSeo => {
  const t = i18n?.global?.t?.bind(i18n.global)
  const routeSeo = (route.meta.seo || {}) as Partial<PageSeo>
  const routeKey = ROUTE_SEO_KEY_MAP[String(route.name || '')]
  const lang = (i18n?.global.locale.value as string) || 'zh-CN'
  const translatedDefault = {
    title: t ? String(t('seo.default.title')) : routeSeo.title || DEFAULT_SEO.title,
    description: t ? String(t('seo.default.description')) : routeSeo.description || DEFAULT_SEO.description,
    keywords: t ? String(t('seo.default.keywords')) : routeSeo.keywords || DEFAULT_SEO.keywords,
    lang
  }
  const translatedRouteSeo = routeKey && t
    ? {
        title: String(t(`seo.routes.${routeKey}.title`)),
        description: String(t(`seo.routes.${routeKey}.description`)),
        keywords: String(t(`seo.routes.${routeKey}.keywords`))
      }
    : {}

  return {
    ...DEFAULT_SEO,
    ...translatedDefault,
    ...routeSeo,
    ...translatedRouteSeo,
    canonicalPath: routeSeo.canonicalPath || normalizePath(route.path),
    robots: routeSeo.robots || (shouldNoIndex(route) ? 'noindex, nofollow' : DEFAULT_SEO.robots),
    lang
  }
}

export const setPageSeo = (seo: Partial<PageSeo>) => {
  applyPageSeo({
    ...DEFAULT_SEO,
    canonicalPath: normalizePath(window.location.pathname),
    ...seo
  })
}

export const setupSeo = (router: Router, i18n?: I18n) => {
  router.afterEach(to => {
    applyPageSeo(resolveRouteSeo(to, i18n))
  })

  if (i18n) {
    watch(
      () => i18n.global.locale.value,
      () => {
        applyPageSeo(resolveRouteSeo(router.currentRoute.value, i18n))
      }
    )
  }

  router
    .isReady()
    .then(() => {
      applyPageSeo(resolveRouteSeo(router.currentRoute.value, i18n))
    })
    .catch(() => {})
}
