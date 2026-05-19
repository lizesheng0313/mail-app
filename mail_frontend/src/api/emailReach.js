import api from '@/services/api'

export const emailReachApi = {
  getAccessSummary() {
    return api.get('/email-reach/access-summary')
  },

  acceptAccessAgreement() {
    return api.post('/email-reach/access-agreement/accept')
  },

  getQuotaSummary() {
    return api.get('/email-reach/quota-summary')
  },

  purchaseQuota(data) {
    return api.post('/email-reach/quota-purchase', data)
  },

  getAdminOverview() {
    return api.get('/email-reach/admin/overview')
  },

  getAdminDeliveryConfig() {
    return api.get('/email-reach/admin/delivery-config')
  },

  saveAdminDeliveryConfig(data) {
    return api.put('/email-reach/admin/delivery-config', data)
  },

  updateAdminDeliverySmtpStatus(accountId, data) {
    return api.put(`/email-reach/admin/delivery-config/accounts/${accountId}/status`, data)
  },

  getAdminAuthVerificationConfig() {
    return api.get('/email-reach/admin/auth-verification-config')
  },

  saveAdminAuthVerificationConfig(data) {
    return api.put('/email-reach/admin/auth-verification-config', data)
  },

  updateAdminAuthVerificationSmtpStatus(accountId, data) {
    return api.put(`/email-reach/admin/auth-verification-config/accounts/${accountId}/status`, data)
  },

  createAdminSmtpAccount(data) {
    return api.post('/email-reach/admin/smtp-accounts', data)
  },

  deleteAdminSmtpAccount(accountId) {
    return api.delete(`/email-reach/admin/smtp-accounts/${accountId}`)
  },

  getAdminFailureStats() {
    return api.get('/email-reach/admin/failure-stats')
  },

  getAdminSendRecords(params = {}) {
    return api.get('/email-reach/admin/send-records', { params })
  },

  getAdminRecipientBlocks(params = {}) {
    return api.get('/email-reach/admin/recipient-blocks', { params })
  },

  getAdminUnsubscribes(params = {}) {
    return api.get('/email-reach/admin/unsubscribes', { params })
  },

  getAdminTemplates(params = {}) {
    return api.get('/email-reach/admin/templates', { params })
  },

  getAdminTemplateReviewLogs(params = {}) {
    return api.get('/email-reach/admin/template-review-logs', { params })
  },

  getAdminImageReviewLogs(params = {}) {
    return api.get('/email-reach/admin/image-review-logs', { params })
  },

  getAdminAccounts(params = {}) {
    return api.get('/email-reach/admin/accounts', { params })
  },

  updateAdminAccount(userId, data) {
    return api.put(`/email-reach/admin/accounts/${userId}`, data)
  },

  updateAdminAccountStatus(userId, data) {
    return api.put(`/email-reach/admin/accounts/${userId}/status`, data)
  },

  blockAdminTemplate(templateId, data = {}) {
    return api.put(`/email-reach/admin/templates/${templateId}/block`, data)
  },

  getTemplates() {
    return api.get('/email-reach/templates')
  },

  bootstrapTemplates() {
    return api.post('/email-reach/templates/bootstrap-defaults')
  },

  createTemplate(data) {
    return api.post('/email-reach/templates', data, { suppressErrorMessage: true })
  },

  updateTemplate(templateId, data) {
    return api.put(`/email-reach/templates/${templateId}`, data, { suppressErrorMessage: true })
  },

  deleteTemplate(templateId) {
    return api.delete(`/email-reach/templates/${templateId}`)
  },

  getTasks() {
    return api.get('/email-reach/tasks')
  },

  getMemberFields(params = {}) {
    return api.get('/email-reach/member-fields', { params })
  },

  saveMemberField(data) {
    return api.post('/email-reach/member-fields', data)
  },

  deleteMemberField(fieldId) {
    return api.delete(`/email-reach/member-fields/${fieldId}`)
  },

  restoreMemberField(fieldId) {
    return api.post(`/email-reach/member-fields/${fieldId}/restore`)
  },

  getMemberGroups() {
    return api.get('/email-reach/member-groups')
  },

  saveMemberGroup(data) {
    return api.post('/email-reach/member-groups', data)
  },

  deleteMemberGroup(groupId) {
    return api.delete(`/email-reach/member-groups/${groupId}`)
  },

  getMemberTags() {
    return api.get('/email-reach/member-tags')
  },

  saveMemberTag(data) {
    return api.post('/email-reach/member-tags', data)
  },

  getMembers(params = {}) {
    return api.get('/email-reach/members', { params })
  },

  importMembers(data) {
    return api.post('/email-reach/members/import', data)
  },

  deleteMember(memberId) {
    return api.delete(`/email-reach/members/${memberId}`)
  },

  exportMembers(params = {}) {
    return api.get('/email-reach/members/export', { params })
  },

  getRecipientBlocks(params = {}) {
    return api.get('/email-reach/recipient-blocks', { params })
  },

  saveRecipientBlock(data) {
    return api.post('/email-reach/recipient-blocks', data)
  },

  getSendRecords(params = {}) {
    return api.get('/email-reach/send-records', { params })
  },

  getTaskSendRecords(taskId) {
    return api.get(`/email-reach/tasks/${taskId}/send-records`)
  },

  createTask(data) {
    return api.post('/email-reach/tasks', data)
  },

  getUnsubscribes() {
    return api.get('/email-reach/unsubscribes')
  },

  saveUnsubscribe(data) {
    return api.post('/email-reach/unsubscribes', data)
  },

  generateTemplate(data) {
    return api.post('/email-reach/ai/generate-template', data)
  }
}

export default emailReachApi
