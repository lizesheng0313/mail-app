import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/services/api', () => ({ default: { get } }))

import { hostedDomainAPI } from './hostedDomain'

describe('hosted domain list', () => {
  beforeEach(() => get.mockReset())

  it('shows the old 20-item first page but loads all 30 domains for the generation dialog', async () => {
    const domains = Array.from({ length: 30 }, (_, index) => ({ id: index + 1 }))
    get.mockImplementation((_url, options = {}) => {
      const page = options.params?.page || 1
      const limit = options.params?.limit || 20
      return Promise.resolve({
        code: 0,
        data: {
          items: domains.slice((page - 1) * limit, page * limit),
          pagination: { page, limit, total: domains.length, pages: Math.ceil(domains.length / limit) }
        }
      })
    })

    const firstPage = await hostedDomainAPI.listDomains()
    expect(firstPage.data.items).toHaveLength(20)

    const fullList = await hostedDomainAPI.listAllDomains()
    expect(fullList.data.items).toHaveLength(30)
    expect(fullList.data.items.at(-1)).toEqual({ id: 30 })
    expect(get).toHaveBeenNthCalledWith(2, '/hosted-domains', { params: { page: 1, limit: 100 } })
  })

  it('includes domains beyond the first page for mailbox generation', async () => {
    const domains = Array.from({ length: 154 }, (_, index) => ({ id: index + 1 }))
    get
      .mockResolvedValueOnce({
        code: 0,
        data: { items: domains.slice(0, 100), pagination: { pages: 2 } }
      })
      .mockResolvedValueOnce({
        code: 0,
        data: { items: domains.slice(100), pagination: { pages: 2 } }
      })

    const response = await hostedDomainAPI.listAllDomains()

    expect(response.data.items).toHaveLength(154)
    expect(response.data.items).toContainEqual({ id: 1 })
    expect(response.data.items).toContainEqual({ id: 154 })
    expect(get).toHaveBeenCalledTimes(2)
    expect(get).toHaveBeenNthCalledWith(1, '/hosted-domains', { params: { page: 1, limit: 100 } })
    expect(get).toHaveBeenNthCalledWith(2, '/hosted-domains', { params: { page: 2, limit: 100 } })
  })
})
