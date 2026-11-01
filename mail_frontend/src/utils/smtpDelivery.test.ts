import { describe, expect, it } from 'vitest'
import { assertSmtpSubmission, sentStatusLabel, sentStatusClass } from './smtpDelivery'

describe('SMTP result evidence', () => {
  it('rejects explicit failures even when a desktop invocation resolves', () => {
    expect(() => assertSmtpSubmission({ success: false, response_code: 250 })).toThrow()
    expect(() => assertSmtpSubmission({ response_code: 550, response_message: 'User unknown' })).toThrow('User unknown')
    expect(() => assertSmtpSubmission({ success: true, response_code: 354 })).toThrow()
    expect(() => assertSmtpSubmission({ success: true, response_code: 250 })).not.toThrow()
  })
  it('shows failures and bounces as errors in sent records', () => {
    expect(sentStatusLabel({ status: 'sent', smtp_response_code: 250 })).toBe('已发送')
    expect(sentStatusLabel({ status: 'failed' })).toBe('发送失败')
    expect(sentStatusLabel({ status: 'bounced' })).toBe('已退信')
    expect(sentStatusClass('bounced')).toContain('rose')
    expect(sentStatusClass('failed')).toContain('rose')
  })
})
