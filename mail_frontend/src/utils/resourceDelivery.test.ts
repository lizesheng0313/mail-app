import { describe, expect, it } from 'vitest'
import {
  getCardLink,
  getDeliveryLink,
  hasResourceDelivery,
  normalizeResourceDelivery,
  safeDeliveryUrl,
} from './resourceDelivery'

describe('resource delivery', () => {
  it('reads a third-party order result nested in the execution response', () => {
    const result = normalizeResourceDelivery({
      order_no: 'WFX-1',
      result: {
        order_status: 20,
        provider_order_no: 'TP-1',
        delivery: { cards: [{ cardNo: 'https://coffee.example/order/1' }] },
      },
    })
    expect(result.orderNo).toBe('WFX-1')
    expect(result.providerOrderNo).toBe('TP-1')
    expect(result.providerStatus).toBe(20)
    expect(hasResourceDelivery(result.delivery)).toBe(true)
    expect(getCardLink(result.delivery.cards[0])).toBe('https://coffee.example/order/1')
  })

  it('keeps a pending order visible without inventing a link', () => {
    const result = normalizeResourceDelivery({
      result: JSON.stringify({ market_delivery_result: { order_status: 10, provider_order_no: 'TP-2' } }),
    })
    expect(result.providerStatus).toBe(10)
    expect(result.providerOrderNo).toBe('TP-2')
    expect(hasResourceDelivery(result.delivery)).toBe(false)
  })

  it('only exposes safe web links', () => {
    expect(getDeliveryLink({ order_link: 'javascript:alert(1)', jump_link: 'https://coffee.example/a' }))
      .toBe('https://coffee.example/a')
    expect(getCardLink({ cardNo: 'CARD-123', jumpLink: 'javascript:alert(1)' })).toBe('')
    expect(safeDeliveryUrl('data:text/html,bad')).toBe('')
  })
})
