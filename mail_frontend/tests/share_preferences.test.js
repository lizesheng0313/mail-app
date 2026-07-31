import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHARE_PREFERENCES,
  readSharePreferences,
  saveSharePreferences
} from '../src/components/Mail/sharePreferences'

const createStorage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  }
}

describe('share preferences', () => {
  it('returns the default settings when no preferences have been saved', () => {
    expect(readSharePreferences(createStorage())).toEqual(DEFAULT_SHARE_PREFERENCES)
  })

  it('saves and restores the last successful share settings', () => {
    const storage = createStorage()
    const preferences = {
      expireMode: 'minutes',
      expireDays: 30,
      expireMinutes: 25,
      expireStartMode: 'created',
      shareCount: 8,
      latestOnly: true
    }

    saveSharePreferences(preferences, storage)

    expect(readSharePreferences(storage)).toEqual(preferences)
  })

  it('falls back to safe defaults for invalid saved values', () => {
    const storage = createStorage()
    saveSharePreferences(
      {
        expireMode: 'unknown',
        expireDays: 0,
        expireMinutes: -1,
        expireStartMode: 'unknown',
        shareCount: 101,
        latestOnly: 'yes'
      },
      storage
    )

    expect(readSharePreferences(storage)).toEqual(DEFAULT_SHARE_PREFERENCES)
  })
})
