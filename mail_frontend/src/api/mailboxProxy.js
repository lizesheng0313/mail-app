import api from '@/services/api'

const mailboxProxyApi = {
  getOptions() {
    return api.get('/mail-api/v1/external-mailboxes/proxy/options')
  },

  saveSettings(data) {
    return api.post('/mail-api/v1/external-mailboxes/proxy/settings', data)
  },

  getMailboxes(params = {}) {
    return api.get('/mail-api/v1/external-mailboxes/proxy/mailboxes', { params })
  },

  saveMailboxOverride(mailboxId, data) {
    return api.post(`/mail-api/v1/external-mailboxes/${mailboxId}/proxy`, data)
  }
}

export default mailboxProxyApi
