import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showMessage } from './message'

vi.mock('@/i18n', () => ({ i18n: { global: { t: () => '网络错误，请稍后重试' } } }))

beforeEach(() => vi.useFakeTimers())
afterEach(() => { vi.runAllTimers(); vi.useRealTimers() })

describe('readable error messages', () => {
  it.each([
    '<!DOCTYPE html><html><body>502 Bad Gateway</body></html>',
    '<h1>503 Service Unavailable</h1>',
    '&lt;html&gt;&lt;head&gt;502 Bad Gateway&lt;/head&gt;&lt;/html&gt;',
    { detail: '<html><body>502 Bad Gateway</body></html>' },
  ])('replaces an HTML error page with a readable failure notice', input => {
    showMessage(input, 'error')
    expect(document.body.querySelector('p')?.textContent).toBe('网络错误，请稍后重试')
    expect(document.body.textContent).not.toContain('Bad Gateway')
  })

  it.each(['邮箱不存在', '数量必须 < 100', '参数 <htmlName> 无效'])('keeps normal business errors: %s', text => {
    showMessage(text, 'error')
    expect(document.body.querySelector('p')?.textContent).toBe(text)
  })

  it('replaces the previous success notice with the actual failure notice', () => {
    showMessage('保存成功', 'success')
    showMessage('<html><body>502 Bad Gateway</body></html>', 'error')
    expect(document.body.textContent).toContain('网络错误，请稍后重试')
    expect(document.body.textContent).not.toContain('保存成功')
  })
})
