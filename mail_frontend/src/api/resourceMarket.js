import api from '@/services/api'

export function getResourceSources(params = {}) {
  return api.get('/resource-market/admin/sources', { params })
}

export function getResourceSkuMappings(params = {}) {
  return api.get('/resource-market/admin/sku-mappings', { params })
}

export function bindResourceProviderProduct(data = {}) {
  return api.post('/resource-market/admin/sku-mappings/bind-provider-product', data)
}

export function deleteResourceSkuMapping(mappingId) {
  return api.delete(`/resource-market/admin/sku-mappings/${mappingId}`)
}

export function getResourceProviderProducts(params = {}) {
  return api.get('/resource-market/admin/provider-products', { params })
}

export function getResourceProviderCategories(params = {}) {
  return api.get('/resource-market/admin/provider-categories', { params })
}

export function getResourcePriceSnapshots(mappingId, params = {}) {
  return api.get(`/resource-market/admin/sku-mappings/${mappingId}/price-snapshots`, { params })
}

export function getResourceCostAlerts(params = {}) {
  return api.get('/resource-market/admin/cost-alerts', { params })
}

export function syncBanfangProducts(data = {}) {
  return api.post('/resource-market/admin/sources/banfang/sync', data)
}
