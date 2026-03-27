import api from '@/services/api'

export const hostedDomainAPI = {
  listDomains: () => api.get('/hosted-domains'),
  getDomainDetail: (domainId) => api.get(`/hosted-domains/${domainId}`),
  createDomain: (data) => api.post('/hosted-domains', data),
  updateDomain: (domainId, data) => api.put(`/hosted-domains/${domainId}`, data),
  deleteDomain: (domainId) => api.delete(`/hosted-domains/${domainId}`),
  refreshDns: (domainId) => api.post(`/hosted-domains/${domainId}/refresh-dns`),
  createMailbox: (domainId, data) => api.post(`/hosted-domains/${domainId}/mailboxes`, data),
  deleteMailbox: (domainId, mailboxId) =>
    api.delete(`/hosted-domains/${domainId}/mailboxes/${mailboxId}`)
}

export default hostedDomainAPI
