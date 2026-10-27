import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import { i18n, setI18nLocale } from '@/i18n'
import { useLocaleStore } from '@/stores/locale'
import { localeOptions } from '@/i18n/locales'
import LanguageSwitcher from './index.vue'

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  await setI18nLocale('zh-CN')
})

it('offers all nine native language names and persists the selected language', async () => {
  const store = useLocaleStore()
  await store.setLocale('zh-CN')
  const wrapper = mount(LanguageSwitcher, { global: { plugins: [i18n] } })
  await wrapper.get('button[aria-expanded]').trigger('click')
  expect(wrapper.findAll('[role="menuitemradio"]')).toHaveLength(9)
  for (const option of localeOptions) expect(wrapper.text()).toContain(option.label)
  await wrapper.get('[role="menuitemradio"][lang="ja"]').trigger('click')
  await flushPromises()
  await vi.waitFor(() => expect(store.locale).toBe('ja'))
  expect(localStorage.getItem('app.locale')).toBe('ja')
  expect(wrapper.get('button[aria-expanded]').text()).toBe('日本語')
  expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  wrapper.unmount()
})
