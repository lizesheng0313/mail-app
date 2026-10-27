// Native language names let visitors find their language from any current locale.
export const localeOptions = [
  { value: 'zh-CN', label: '简体中文', shortLabel: '简中', ogLocale: 'zh_CN', aiLanguage: '简体中文' },
  { value: 'zh-TW', label: '繁體中文', shortLabel: '繁中', ogLocale: 'zh_TW', aiLanguage: '繁體中文' },
  { value: 'en', label: 'English', shortLabel: 'EN', ogLocale: 'en_US', aiLanguage: 'English' },
  { value: 'ja', label: '日本語', shortLabel: 'JA', ogLocale: 'ja_JP', aiLanguage: '日本語' },
  { value: 'ko', label: '한국어', shortLabel: 'KO', ogLocale: 'ko_KR', aiLanguage: '한국어' },
  { value: 'de', label: 'Deutsch', shortLabel: 'DE', ogLocale: 'de_DE', aiLanguage: 'Deutsch' },
  { value: 'fr', label: 'Français', shortLabel: 'FR', ogLocale: 'fr_FR', aiLanguage: 'Français' },
  { value: 'es', label: 'Español', shortLabel: 'ES', ogLocale: 'es_ES', aiLanguage: 'Español' },
  { value: 'pt', label: 'Português', shortLabel: 'PT', ogLocale: 'pt_BR', aiLanguage: 'Português' }
] as const

export type SupportedLocale = typeof localeOptions[number]['value']

export const getLocaleOption = (locale: string) => (
  localeOptions.find(option => option.value === locale) ?? localeOptions[2]
)
