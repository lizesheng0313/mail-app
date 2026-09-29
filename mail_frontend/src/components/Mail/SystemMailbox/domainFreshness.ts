export interface DomainFreshnessItem {
  domain_name?: string
  created_at?: number | string | null
  public_shared_at?: number | string | null
  domain_source?: string
  is_public_domain?: boolean
}

export const NEW_DOMAIN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export const isNewDomain = (domain: DomainFreshnessItem, now = Date.now()) => {
  const cutoff = now - NEW_DOMAIN_WINDOW_MS
  const createdAt = Number(domain.created_at || 0)
  const sharedAt = Number(domain.public_shared_at || 0)
  const sharedNow = domain.domain_source !== 'owned_hosted' || domain.is_public_domain === true
  return (createdAt >= cutoff && createdAt <= now) ||
    (sharedNow && sharedAt >= cutoff && sharedAt <= now)
}

export const sortDomainsByCreatedAt = <T extends DomainFreshnessItem>(domains: T[], now = Date.now()): T[] =>
  [...domains].sort((left, right) => {
    const newCompare = Number(isNewDomain(right, now)) - Number(isNewDomain(left, now))
    if (newCompare !== 0) return newCompare
    const createdCompare = Number(right.created_at || 0) - Number(left.created_at || 0)
    if (createdCompare !== 0) return createdCompare
    return String(left.domain_name || '').toLowerCase().localeCompare(String(right.domain_name || '').toLowerCase())
  })
