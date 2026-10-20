import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { LOCALE_STORAGE_KEY, detectInitialLocale, normalizeLocale, setI18nLocale, type SupportedLocale } from '@/i18n'

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref<SupportedLocale>(detectInitialLocale())
  const initialized = ref(false)
  let initialization: Promise<void> | null = null
  let localeChangeId = 0

  const initialize = () => {
    if (initialized.value) return Promise.resolve()
    initialization ||= setLocale(detectInitialLocale()).then(() => {
      initialized.value = true
    }).finally(() => { initialization = null })
    return initialization
  }

  const setLocale = async (value: string) => {
    const changeId = ++localeChangeId
    const next = normalizeLocale(value)
    await setI18nLocale(next)
    if (changeId !== localeChangeId) return
    locale.value = next
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
    }
  }

  const isEnglish = computed(() => locale.value === 'en')

  return {
    locale,
    isEnglish,
    initialize,
    setLocale
  }
})
