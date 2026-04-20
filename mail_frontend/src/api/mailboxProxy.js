import api from '@/services/api'

const mailboxProxyApi = {
  getOptions() {
    return api.get('/unified-emails/external-mailboxes/proxy/options')
  },

  createProxy(data) {
    return api.post('/unified-emails/external-mailboxes/proxy/proxies', data)
  },

  updateProxy(proxyId, data) {
    return api.post(`/unified-emails/external-mailboxes/proxy/proxies/${proxyId}/update`, data)
  },

  deleteProxy(proxyId) {
    return api.post(`/unified-emails/external-mailboxes/proxy/proxies/${proxyId}/delete`)
  },

  saveSettings(data) {
    return api.post('/unified-emails/external-mailboxes/proxy/settings', data)
  },

  getMailboxes(params = {}) {
    return api.get('/unified-emails/external-mailboxes/proxy/mailboxes', { params })
  },

  previewRuntimeProxy(data) {
    return api.post('/unified-emails/external-mailboxes/proxy/preview', data)
  },

  getRuntimeProxy(mailboxId) {
    return api.get(`/unified-emails/external-mailboxes/${mailboxId}/proxy/runtime`)
  },

  saveBatchMailboxOverride(data) {
    return api.post('/unified-emails/external-mailboxes/proxy/batch', data)
  },

  saveMailboxOverride(mailboxId, data) {
    return api.post(`/unified-emails/external-mailboxes/${mailboxId}/proxy`, data)
  }
}

export default mailboxProxyApi
