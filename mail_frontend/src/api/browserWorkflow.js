import api from '@/services/api'
import { buildWebSocketURL } from '@/services/api'

// API for the independent browser workflow platform. It never calls legacy workflow endpoints.
export const browserWorkflowApi = {
  executionSocketUrl: (executionId) => {
    const token = encodeURIComponent(localStorage.getItem('token') || '')
    return buildWebSocketURL(`/browser-workflow-executions/${executionId}/ws?token=${token}`)
  },
  saveCredential: (credentialId, payload, config = {}) => api.put(`/browser-workflows/credentials/${credentialId}`, payload, config),
  list: (config = {}) => api.get('/browser-workflows', config),
  plugins: (config = {}) => api.get('/browser-workflows/plugins', config),
  installPlugin: (pluginId, acceptedPermissions, config = {}) => api.post(`/browser-workflows/plugins/${encodeURIComponent(pluginId)}/install`, { accepted_permissions: acceptedPermissions }, config),
  setPluginEnabled: (pluginId, enabled, config = {}) => api.put(`/browser-workflows/plugins/${encodeURIComponent(pluginId)}/enabled`, { enabled }, config),
  uninstallPlugin: (pluginId, config = {}) => api.delete(`/browser-workflows/plugins/${encodeURIComponent(pluginId)}`, config),
  get: (workflowId, config = {}) => api.get(`/browser-workflows/${workflowId}`, config),
  create: (document, config = {}) => api.post('/browser-workflows', document, config),
  saveDraft: (workflowId, document, config = {}) => api.put(`/browser-workflows/${workflowId}/draft`, document, config),
  rebindCredentials: (workflowId, credentials, config = {}) => api.put(`/browser-workflows/${workflowId}/credentials`, { credentials }, config),
  publish: (workflowId, version, config = {}) => api.post(`/browser-workflows/${workflowId}/publish`, { version }, config),
  previewExecute: (document, payload = {}, config = {}) => api.post('/browser-workflows/preview-execute', { document, ...payload }, config),
  startRecordingSession: (document, payload = {}, config = {}) => api.post('/browser-workflows/recording-session', { document, ...payload }, config),
  execute: (workflowId, payload = {}, config = {}) => api.post(`/browser-workflows/${workflowId}/execute`, payload, config),
  getExecution: (executionId, config = {}) => api.get(`/browser-workflow-executions/${executionId}`, config),
  getExecutionEvents: (executionId, config = {}) => api.get(`/browser-workflow-executions/${executionId}/events`, config),
  resumeExecution: (executionId, nodeId, config = {}) => api.post(`/browser-workflow-executions/${executionId}/resume`, { node_id: nodeId }, config),
  recording: (executionId, action = 'start', payload = {}, config = {}) => api.post(`/browser-workflow-executions/${executionId}/recording`, { action, ...payload }, config),
  testStep: (executionId, document, nodeIds, anchorNodeId, config = {}) => api.post(`/browser-workflow-executions/${executionId}/test-step`, { document, node_ids: nodeIds, anchor_node_id: anchorNodeId }, config),
  export: (workflowId, config = {}) => api.get(`/browser-workflows/${workflowId}/export`, config),
  import: (document, config = {}) => api.post('/browser-workflows/import', { document }, config),
  remove: (workflowId, config = {}) => api.delete(`/browser-workflows/${workflowId}`, config),
}

export default browserWorkflowApi
