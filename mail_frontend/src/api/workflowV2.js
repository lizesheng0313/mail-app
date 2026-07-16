import api, { extractFetchErrorMessage } from '@/services/api'

export const workflowV2Api = {
  generatePlanFromUrl(data) {
    return api.post('/workflow-v2/plan-from-url', data)
  },

  debugRunDraft(data) {
    return api.post('/workflow-v2/debug-run', data)
  },

  debugRunSSE(data, onEvent, onError) {
    const token = localStorage.getItem('token') || ''
    const baseURL = '/mail-api/v1'
    return fetch(`${baseURL}/workflow-v2/debug-run-sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) {
        const msg = await extractFetchErrorMessage(response, `HTTP ${response.status}`)
        throw new Error(msg)
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let eventName = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventName = line.slice(7).trim()
          } else if (line.startsWith('data: ') && eventName) {
            try {
              const d = JSON.parse(line.slice(6))
              onEvent(eventName, d)
            } catch (e) { /* ignore parse errors */ }
            eventName = ''
          }
        }
      }
    })
  },

  compileDraft(data) {
    return api.post('/workflow-v2/compile', data)
  },

  saveWorkflow(data) {
    return api.post('/workflow-v2/save', data)
  },

  interpretSmartValue(data) {
    return api.post('/workflow-v2/interpret-smart-value', data)
  },

  chatEditDraft(data) {
    return api.post('/workflow-v2/chat-edit', data)
  },

  /**
   * 流式 AI 聊天
   * @param {Object} data - {draft, message, chat_history}
   * @param {Function} onToken - 收到文本片段回调
   * @param {Function} onDraft - 收到 draft JSON 回调
   * @param {Function} onDone - 完成回调
   * @param {Function} onError - 错误回调
   */
  chatEditStream(data, { onToken, onDraft, onDone, onError }) {
    const token = localStorage.getItem('token') || ''
    fetch('/mail-api/v1/workflow-v2/chat-edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(data),
    }).then(async (resp) => {
      if (!resp.ok) {
        onError?.(await extractFetchErrorMessage(resp, `HTTP ${resp.status}`))
        return
      }
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const raw = line.slice(6)
            if (eventType === 'token') {
              try { onToken?.(JSON.parse(raw)) } catch { onToken?.(raw) }
            } else if (eventType === 'draft') {
              try { onDraft?.(JSON.parse(raw)) } catch {}
            } else if (eventType === 'error') {
              onError?.(raw)
            } else if (eventType === 'done') {
              onDone?.()
            }
            eventType = ''
          }
        }
      }
      onDone?.()
    }).catch((err) => {
      onError?.(err.message || String(err))
    })
  },
}
