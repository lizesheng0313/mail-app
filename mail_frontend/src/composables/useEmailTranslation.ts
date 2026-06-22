import { computed, ref, watch, type ComputedRef } from 'vue'
import { emailAPI } from '@/api/email'
import { showMessage } from '@/utils/message'

type EmailLike = {
  id?: number | string
  message_id?: string
  received_at?: string | number
  subject?: string
  content?: string
  content_text?: string
  contentHtml?: string
  content_html?: string
  [key: string]: any
}

type TranslationResult = {
  subject: string
  content: string
}

const translationCache = new Map<string, TranslationResult>()
const translationCacheVersion = ref(0)
const translatingKeys = ref(new Set<string>())
const showingTranslationKeys = ref(new Set<string>())

export const normalizeTranslationText = (value: string) => {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const normalizeLanguageFamily = (language: string) => {
  const lang = language.trim().toLowerCase()
  if (lang.startsWith('zh')) return 'zh'
  if (lang.startsWith('en')) return 'en'
  if (lang.startsWith('ja')) return 'ja'
  if (lang.startsWith('ko')) return 'ko'
  return lang.split(/[-_]/)[0] || 'unknown'
}

const detectContentLanguageFamily = (text: string) => {
  const value = text.trim()
  if (!value) return 'unknown'
  const zhCount = (value.match(/[\u3400-\u9fff]/g) || []).length
  const jaCount = (value.match(/[\u3040-\u30ff]/g) || []).length
  const koCount = (value.match(/[\uac00-\ud7af]/g) || []).length
  const latinCount = (value.match(/[a-zA-Z]/g) || []).length
  const maxCount = Math.max(zhCount, jaCount, koCount, latinCount)

  if (maxCount < 8) return 'unknown'
  if (zhCount === maxCount) return 'zh'
  if (jaCount === maxCount) return 'ja'
  if (koCount === maxCount) return 'ko'
  return 'en'
}

const extractPlainText = (raw: string) => {
  if (!raw) return ''
  if (!/<[^>]+>/.test(raw)) return normalizeTranslationText(raw)
  if (typeof DOMParser === 'undefined') {
    return normalizeTranslationText(raw.replace(/<[^>]+>/g, ' '))
  }

  const doc = new DOMParser().parseFromString(raw, 'text/html')
  return normalizeTranslationText(doc.body?.innerText || doc.body?.textContent || '')
}

const setTranslating = (cacheKey: string, value: boolean) => {
  const next = new Set(translatingKeys.value)
  if (value) {
    next.add(cacheKey)
  } else {
    next.delete(cacheKey)
  }
  translatingKeys.value = next
}

const setShowingTranslation = (cacheKey: string, value: boolean) => {
  if (!cacheKey) return
  const next = new Set(showingTranslationKeys.value)
  if (value) {
    next.add(cacheKey)
  } else {
    next.delete(cacheKey)
  }
  showingTranslationKeys.value = next
}

export const useEmailTranslation = (
  emailRef: ComputedRef<EmailLike | null | undefined>,
  t: (key: string, params?: any) => string
) => {
  const textContent = computed(() => {
    const email = emailRef.value
    if (!email) return ''
    return (
      email.content ||
      email.content_text ||
      email.contentHtml ||
      email.content_html ||
      ''
    ).trim()
  })

  const htmlContent = computed(() => {
    const email = emailRef.value
    return email?.contentHtml || email?.content_html || email?.content || email?.content_text || ''
  })

  const plainEmailContent = computed(() => extractPlainText(htmlContent.value || textContent.value))

  const browserLanguage = computed(() => {
    if (typeof navigator === 'undefined') return 'zh-CN'
    return (navigator.languages?.[0] || navigator.language || 'zh-CN').trim()
  })

  const browserLanguageFamily = computed(() => normalizeLanguageFamily(browserLanguage.value))
  const emailLanguageFamily = computed(() =>
    detectContentLanguageFamily(`${emailRef.value?.subject || ''}\n${plainEmailContent.value}`)
  )
  const isCurrentBrowserLanguage = computed(() => {
    return emailLanguageFamily.value !== 'unknown' && emailLanguageFamily.value === browserLanguageFamily.value
  })
  const canTranslate = computed(() => {
    return Boolean(emailRef.value && plainEmailContent.value && !isCurrentBrowserLanguage.value)
  })
  const translationCacheKey = computed(() => {
    const email = emailRef.value
    if (!email) return ''
    return `${email.id || email.message_id || email.received_at || ''}:${browserLanguage.value}`
  })
  const isTranslatingCurrent = computed(() => {
    return Boolean(translationCacheKey.value && translatingKeys.value.has(translationCacheKey.value))
  })
  const showingTranslation = computed(() => {
    return Boolean(translationCacheKey.value && showingTranslationKeys.value.has(translationCacheKey.value))
  })
  const cachedTranslation = computed(() => {
    translationCacheVersion.value
    const cacheKey = translationCacheKey.value
    return cacheKey ? translationCache.get(cacheKey) || null : null
  })
  const translatedSubject = computed(() => cachedTranslation.value?.subject || '')
  const translatedContent = computed(() => cachedTranslation.value?.content || '')
  const displaySubject = computed(() => {
    return showingTranslation.value && translatedSubject.value
      ? translatedSubject.value
      : emailRef.value?.subject || ''
  })

  const applyCachedTranslation = () => {
    const cacheKey = translationCacheKey.value
    if (!cacheKey) return false
    const cached = translationCache.get(cacheKey)
    if (!cached) return false
    return true
  }

  const showOriginal = () => {
    setShowingTranslation(translationCacheKey.value, false)
  }

  const translateEmail = async () => {
    const currentEmail = emailRef.value
    const cacheKey = translationCacheKey.value
    const content = plainEmailContent.value
    if (!currentEmail || !content || !cacheKey || translatingKeys.value.has(cacheKey)) return

    if (applyCachedTranslation()) {
      setShowingTranslation(cacheKey, true)
      return
    }

    setTranslating(cacheKey, true)
    try {
      const res: any = await emailAPI.translateEmail({
        subject: currentEmail.subject || '',
        content,
        target_language: browserLanguage.value,
      })
      if (res?.code !== 0) {
        showMessage(t('emailDetail.translateFailed'), 'error')
        return
      }

      const nextSubject = String(res?.data?.subject || currentEmail.subject || '').trim()
      const nextContent = normalizeTranslationText(String(res?.data?.content || ''))
      if (!nextContent) {
        showMessage(t('emailDetail.translateFailed'), 'error')
        return
      }
      translationCache.set(cacheKey, {
        subject: nextSubject,
        content: nextContent,
      })
      translationCacheVersion.value++

      if (translationCacheKey.value === cacheKey) {
        setShowingTranslation(cacheKey, true)
        showMessage(t('emailDetail.translateSuccess'), 'success')
      }
    } catch (error) {
      console.error('翻译邮件失败:', error)
      showMessage(t('emailDetail.translateFailed'), 'error')
    } finally {
      setTranslating(cacheKey, false)
    }
  }

  return {
    canTranslate,
    displaySubject,
    htmlContent,
    isTranslatingCurrent,
    plainEmailContent,
    showOriginal,
    showingTranslation,
    textContent,
    translateEmail,
    translatedContent,
  }
}
