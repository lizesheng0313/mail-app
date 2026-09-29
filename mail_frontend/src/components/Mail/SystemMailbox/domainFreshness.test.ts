import { describe, expect, it } from 'vitest'
import { isNewDomain, NEW_DOMAIN_WINDOW_MS, sortDomainsByCreatedAt } from './domainFreshness'

const now = 1_800_000_000_000

describe('custom mailbox domain freshness', () => {
  it('marks recent creations and newly shared older domains as 上新, independent of expiry', () => {
    expect(isNewDomain({ created_at: now - 1000, expires_at: now - 1 } as any, now)).toBe(true)
    expect(isNewDomain({ created_at: now - 90 * 86400000, public_shared_at: now - 1000 }, now)).toBe(true)
    expect(isNewDomain({
      created_at: now - 90 * 86400000, public_shared_at: now - 1000,
      domain_source: 'owned_hosted', is_public_domain: false
    }, now)).toBe(false)
    expect(isNewDomain({
      created_at: now - 90 * 86400000, public_shared_at: now - 60 * 86400000,
      domain_source: 'owned_hosted', is_public_domain: true
    }, now)).toBe(false)
    expect(isNewDomain({ created_at: now - NEW_DOMAIN_WINDOW_MS - 1 }, now)).toBe(false)
    expect(isNewDomain({ created_at: now + 1000 }, now)).toBe(false)
  })

  it('pins fresh domains first and sorts each group by creation time descending', () => {
    const items = [
      { domain_name: 'old', created_at: now - 100 * 86400000 },
      { domain_name: 'shared', created_at: now - 90 * 86400000, public_shared_at: now - 1000 },
      { domain_name: 'new', created_at: now - 86400000 },
      { domain_name: 'reopened', created_at: now - 120 * 86400000, public_shared_at: now - 60 * 86400000 },
      { domain_name: 'older', created_at: now - 200 * 86400000 }
    ]
    expect(sortDomainsByCreatedAt(items, now).map((item) => item.domain_name)).toEqual([
      'new', 'shared', 'old', 'reopened', 'older'
    ])
    expect(items[0].domain_name).toBe('old')
  })
})
