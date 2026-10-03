import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vitest'

import en from './messages/en'
import zhCN from './messages/zh-CN'
import zhTW from './messages/zh-TW'

const localeMessages = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en
}

describe('runtime i18n messages', () => {
  it.each(Object.keys(localeMessages))('renders email address examples for %s', (locale) => {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: localeMessages
    })

    expect(i18n.global.t('batchAdd.inputPlaceholder')).toContain('you@163.com')
    expect(i18n.global.t('triggerModal.placeholderSender')).toContain('admin@example.com')
    expect(i18n.global.t('triggerModal.placeholderRecipient')).toContain('user@example.com')
  })
})
