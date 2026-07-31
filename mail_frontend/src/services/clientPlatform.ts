export type ClientPlatform = 'web' | 'desktop'

export const isTauri = () => {
  const hasTauriGlobal = '__TAURI__' in window || '__TAURI_INTERNALS__' in window
  const isTauriProtocol = window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost' ||
    (window.location.hostname === 'localhost' && window.location.port === '')
  return hasTauriGlobal || isTauriProtocol
}

export const getClientPlatform = (): ClientPlatform => (isTauri() ? 'desktop' : 'web')
