import api from '@/services/api'

const externalVerifyPoolAPI = {
  list(params = {}) {
    return api.get('/unified-emails/external-verify-pool', { params })
  },

  getBatchResults(batchNo) {
    return api.get(`/unified-emails/external-verify-pool/batch/${encodeURIComponent(batchNo)}`)
  },

  importCandidates(data) {
    return api.post('/unified-emails/external-verify-pool/import', data)
  },

  saveVerifyResults(data) {
    return api.post('/unified-emails/external-verify-pool/verify-results', data)
  },

  verifyOAuthCandidates(data) {
    return api.post('/unified-emails/external-verify-pool/oauth-verify', data)
  },

  promoteCandidates(data) {
    return api.post('/unified-emails/external-verify-pool/promote', data)
  },

  updateCandidate(id, data) {
    return api.patch(`/unified-emails/external-verify-pool/${id}`, data)
  },

  deleteCandidates(data) {
    return api.delete('/unified-emails/external-verify-pool', { data })
  }
}

export default externalVerifyPoolAPI
