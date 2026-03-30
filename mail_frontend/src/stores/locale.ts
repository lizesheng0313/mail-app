import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { LOCALE_STORAGE_KEY, detectInitialLocale, normalizeLocale, setI18nLocale, type SupportedLocale } from '@/i18n'

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref<SupportedLocale>(detectInitialLocale())
  const initialized = ref(false)

  const initialize = () => {
    if (initialized.value) return
    const next = detectInitialLocale()
    locale.value = next
    setI18nLocale(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
    }
    initialized.value = true
  }

  const setLocale = (value: string) => {
    const next = normalizeLocale(value)
    locale.value = next
    setI18nLocale(next)
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
