export const safeDeliveryUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

export const normalizeResourceDelivery = (execution = {}) => {
  let result = execution?.result || {}
  if (typeof result === 'string') {
    try {
      result = JSON.parse(result)
    } catch {
      result = {}
    }
  }
  if (result?.market_delivery_result) result = result.market_delivery_result
  const delivery = execution?.delivery || result?.delivery || {}
  return {
    orderNo: execution?.order_no || result?.order_no || '',
    providerOrderNo: execution?.provider_order_no || result?.provider_order_no || '',
    providerStatus: Number(execution?.order_status ?? result?.order_status ?? 0),
    failReason: execution?.fail_reason || result?.fail_reason || '',
    delivery: delivery && typeof delivery === 'object' ? delivery : {},
  }
}

export const getDeliveryLink = (delivery = {}) => {
  for (const key of ['order_link', 'pickup_link', 'delivery_link', 'jump_link']) {
    const url = safeDeliveryUrl(delivery?.[key])
    if (url) return url
  }
  return ''
}

export const getCardLink = (card = {}) =>
  safeDeliveryUrl(card?.jumpLink) || safeDeliveryUrl(card?.cardNo)

export const hasResourceDelivery = (delivery = {}) => Boolean(
  getDeliveryLink(delivery)
  || delivery?.pickup_code
  || (Array.isArray(delivery?.cards) && delivery.cards.length)
)
