import { runPromisePool } from '@/utils/promisePool'

const GOOGLE_OAUTH_DOMAIN_SUFFIXES = ['gmail.com', 'googlemail.com']
const MICROSOFT_OAUTH_DOMAIN_SUFFIXES = ['outlook.', 'hotmail.', 'live.', 'msn.', 'live.cn']

const PASSWORD_MAILBOX_CONCURRENCY_RULES = [
  {
    key: 'ct-189',
    suffixes: ['189.cn', '21cn.com'],
    batchLoginConcurrency: 4,
    verifyConcurrency: 8
  }
] as const

export const DEFAULT_PASSWORD_BATCH_LOGIN_CONCURRENCY = 2
export const DEFAULT_BATCH_LOGIN_OAUTH_TOKEN_CONCURRENCY = 2
export const DEFAULT_PASSWORD_VERIFY_CONCURRENCY = Math.max(
  2,
  Math.min(6, Number(globalThis.navigator?.hardwareConcurrency || 6))
)

export type PasswordMailboxConcurrencyScene = 'batch-login' | 'verify'

const normalizeDomain = (value: string) => String(value || '').toLowerCase().trim()

const matchesDomainSuffix = (domain: string, suffix: string) =>
  domain === suffix || domain.endsWith(`.${suffix}`)

const matchesMicrosoftDomain = (domain: string, suffix: string) =>
  domain === suffix || domain.startsWith(suffix) || domain.endsWith(`.${suffix}`)

export const extractEmailDomain = (email: string) =>
  normalizeDomain(String(email || '').split('@')[1] || '')

export const resolveOAuthProviderByDomain = (domain: string) => {
  const normalizedDomain = normalizeDomain(domain)
  if (!normalizedDomain) return ''

  if (GOOGLE_OAUTH_DOMAIN_SUFFIXES.some((suffix) => matchesDomainSuffix(normalizedDomain, suffix))) {
    return 'google'
  }

  if (MICROSOFT_OAUTH_DOMAIN_SUFFIXES.some((suffix) => matchesMicrosoftDomain(normalizedDomain, suffix))) {
    return 'microsoft'
  }

  return ''
}

export const resolveOAuthProviderByEmail = (email: string, fallback = '') => {
  const normalizedFallback = normalizeDomain(fallback)
  if (normalizedFallback === 'google' || normalizedFallback === 'microsoft') {
    return normalizedFallback
  }

  return resolveOAuthProviderByDomain(extractEmailDomain(email))
}

export const isOAuthTokenDomain = (domain: string) => Boolean(resolveOAuthProviderByDomain(domain))

export const resolvePasswordMailboxConcurrency = (
  email: string,
  scene: PasswordMailboxConcurrencyScene,
  defaultConcurrency: number
) => {
  const domain = extractEmailDomain(email)
  if (!domain) return defaultConcurrency

  const matchedRule = PASSWORD_MAILBOX_CONCURRENCY_RULES.find((rule) =>
    rule.suffixes.some((suffix) => matchesDomainSuffix(domain, suffix))
  )

  if (!matchedRule) return defaultConcurrency

  return scene === 'verify'
    ? matchedRule.verifyConcurrency ?? defaultConcurrency
    : matchedRule.batchLoginConcurrency ?? defaultConcurrency
}

export async function runPasswordMailboxPool<TItem, TResult>(
  items: TItem[],
  options: {
    scene: PasswordMailboxConcurrencyScene
    defaultConcurrency: number
    getEmail: (item: TItem) => string
    worker: (item: TItem, index: number) => Promise<TResult>
  }
): Promise<TResult[]> {
  if (!items.length) {
    return []
  }

  const results = new Array<TResult>(items.length)
  const buckets = new Map<number, Array<{ item: TItem; index: number }>>()

  items.forEach((item, index) => {
    const concurrency = resolvePasswordMailboxConcurrency(
      options.getEmail(item),
      options.scene,
      options.defaultConcurrency
    )
    const bucket = buckets.get(concurrency)
    if (bucket) {
      bucket.push({ item, index })
      return
    }
    buckets.set(concurrency, [{ item, index }])
  })

  await Promise.all(
    Array.from(buckets.entries()).map(([concurrency, bucketItems]) =>
      runPromisePool(bucketItems, concurrency, async ({ item, index }) => {
        results[index] = await options.worker(item, index)
      })
    )
  )

  return results as TResult[]
}
