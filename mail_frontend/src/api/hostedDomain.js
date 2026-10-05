import api from '@/services/api'

export const hostedDomainAPI = {
  listDomains: (params = {}) => api.get('/hosted-domains', { params }),
  listAllDomains: async () => {
    const items = []
    let page = 1
    let response
    do {
      response = await api.get('/hosted-domains', { params: { page, limit: 100 } })
      if (response.code !== 0) return response
      items.push(...(response.data?.items || []))
      page += 1
    } while (page <= Number(response.data?.pagination?.pages || 0))
    return { ...response, data: { ...response.data, items } }
  },
  getDomainDetail: (domainId) => api.get(`/hosted-domains/${domainId}`),
  createAdminQuickBindSession: (data) => api.post('/hosted-domains/admin-quick-bind-session', data),
  getSharedEarningsSummary: () =>
    api.get('/hosted-domains/shared-earnings/summary', { suppressErrorMessage: true }),
  createDomain: (data) => api.post('/hosted-domains', data),
  updateDomain: (domainId, data) => api.put(`/hosted-domains/${domainId}`, data),
  deleteDomain: (domainId) => api.delete(`/hosted-domains/${domainId}`),
  transferToAdmin: (data) => api.post('/hosted-domains/transfer-to-admin', data),
  refreshDns: (domainId) => api.post(`/hosted-domains/${domainId}/refresh-dns`),
  createMailbox: (domainId, data) => api.post(`/hosted-domains/${domainId}/mailboxes`, data),
  updateMailbox: (domainId, mailboxId, data) =>
    api.put(`/hosted-domains/${domainId}/mailboxes/${mailboxId}`, data),
  deleteMailbox: (domainId, mailboxId) =>
    api.delete(`/hosted-domains/${domainId}/mailboxes/${mailboxId}`)
}

export default hostedDomainAPI
