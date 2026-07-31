export const SHARE_PREFERENCES_STORAGE_KEY = 'mailbox-share-preferences'

export const DEFAULT_SHARE_PREFERENCES = Object.freeze({
  expireMode: 'days',
  expireDays: 7,
  expireMinutes: 10,
  expireStartMode: 'first_opened',
  shareCount: 1,
  latestOnly: false
})

const EXPIRE_MODES = new Set(['minutes', 'days', 'permanent'])
const START_MODES = new Set(['created', 'first_opened'])

const getStorage = (storage) => {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  return window.localStorage
}

const normalizePositiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1 || number > max) return fallback
  return number
}

const normalizePreferences = (preferences = {}) => ({
  expireMode: EXPIRE_MODES.has(preferences.expireMode)
    ? preferences.expireMode
    : DEFAULT_SHARE_PREFERENCES.expireMode,
  expireDays: normalizePositiveInteger(
    preferences.expireDays,
    DEFAULT_SHARE_PREFERENCES.expireDays
  ),
  expireMinutes: normalizePositiveInteger(
    preferences.expireMinutes,
    DEFAULT_SHARE_PREFERENCES.expireMinutes,
    525600
  ),
  expireStartMode: START_MODES.has(preferences.expireStartMode)
    ? preferences.expireStartMode
    : DEFAULT_SHARE_PREFERENCES.expireStartMode,
  shareCount: normalizePositiveInteger(
    preferences.shareCount,
    DEFAULT_SHARE_PREFERENCES.shareCount,
    100
  ),
  latestOnly:
    typeof preferences.latestOnly === 'boolean'
      ? preferences.latestOnly
      : DEFAULT_SHARE_PREFERENCES.latestOnly
})

export const readSharePreferences = (storage) => {
  try {
    const raw = getStorage(storage)?.getItem(SHARE_PREFERENCES_STORAGE_KEY)
    return raw ? normalizePreferences(JSON.parse(raw)) : { ...DEFAULT_SHARE_PREFERENCES }
  } catch {
    return { ...DEFAULT_SHARE_PREFERENCES }
  }
}

export const saveSharePreferences = (preferences, storage) => {
  const normalized = normalizePreferences(preferences)
  try {
    getStorage(storage)?.setItem(SHARE_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // 本地存储不可用时不影响创建分享
  }
  return normalized
}
