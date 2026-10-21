import { describe, expect, it } from 'vitest'
import { getWorkflowScreenshotFilename } from './workflowScreenshots'

describe('authenticated workflow screenshot references', () => {
  const filename = `screenshot_41_${'a'.repeat(32)}.png`
  it('supports new private and old screenshot paths without fetching external origins', () => {
    expect(getWorkflowScreenshotFilename(`/mail-api/v1/workflows/screenshots/${filename}`)).toBe(filename)
    expect(getWorkflowScreenshotFilename('https://old.example/uploads/automation_screenshots/screenshot_123_abcdef12.png')).toBe('screenshot_123_abcdef12.png')
  })
  it.each([null, '', 'javascript:alert(1)', 'https://other.example/private.png',
    '/uploads/automation_screenshots/%2e%2e%2fsecret.png', '/mail-api/v1/workflows/screenshots/%2Fsecret.png',
    '/uploads/automation_screenshots/secret.svg', `/uploads/automation_screenshots/${filename}/extra`,
  ])('rejects unrelated or unsafe paths: %s', value => {
    expect(getWorkflowScreenshotFilename(value)).toBe('')
  })
})
