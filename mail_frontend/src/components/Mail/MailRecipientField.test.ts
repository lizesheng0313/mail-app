import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vitest'
import MailRecipientField from './MailRecipientField.vue'

const setup = () =>
  mount(MailRecipientField, {
    props: { inputId: 'to', label: 'To', draft: '', recipients: [] },
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale: 'en',
          messages: { en: {} },
          missingWarn: false,
          fallbackWarn: false
        })
      ]
    }
  })
describe('compact recipient field', () => {
  it('commits with Enter, deduplicates addresses and lets Tab move focus', async () => {
    const wrapper = setup()
    await wrapper.setProps({ draft: 'One@example.test,one@EXAMPLE.test;two@example.test' })
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:recipients')?.[0]).toEqual([
      ['One@example.test', 'two@example.test']
    ])
    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    wrapper.get('input').element.dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(false)
    wrapper.unmount()
  })
  it('accepts a pasted list and removes chips with Backspace or the remove button', async () => {
    const wrapper = setup()
    await wrapper.setProps({ recipients: ['one@example.test'] })
    await wrapper
      .get('input')
      .trigger('paste', { clipboardData: { getData: () => 'one@example.test\ntwo@example.test' } })
    expect(wrapper.emitted('update:recipients')?.[0]).toEqual([
      ['one@example.test', 'two@example.test']
    ])
    await wrapper.get('input').trigger('keydown', { key: 'Backspace' })
    expect(wrapper.emitted('update:recipients')?.[1]).toEqual([[]])
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('update:recipients')?.[2]).toEqual([[]])
    wrapper.unmount()
  })
  it('blocks editing while sending', async () => {
    const wrapper = setup()
    await wrapper.setProps({ disabled: true, draft: 'one@example.test' })
    await wrapper.get('input').trigger('blur')
    expect(wrapper.emitted('update:recipients')).toBeUndefined()
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
