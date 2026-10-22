type Invoke = <T = any>(command: string, args?: any) => Promise<T>

const collections = new Map<string, Promise<any>>()
const listeners = new Set<(mailboxId: number, token: string) => void>()

export const onMailboxCollected = (listener: (mailboxId: number, token: string) => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Manual collection and automatic collection join the same operation. */
export function collectMailbox<T>(mailboxId: number, transport: string, action: () => Promise<T>,
  token = localStorage.getItem('token') || '', server = window.location.origin): Promise<T> {
  const key = JSON.stringify([server, token, Number(mailboxId), transport])
  const current = collections.get(key)
  if (current) return current
  const request = Promise.resolve().then(action).then(result => {
    if ((result as any)?.code === undefined || (result as any).code === 0) {
      for (const listener of listeners) listener(Number(mailboxId), token)
    }
    return result
  })
  collections.set(key, request)
  void request.finally(() => { if (collections.get(key) === request) collections.delete(key) }).catch(() => {})
  return request
}

export const invokeDesktopMailboxFetch = (invoke: Invoke, args: Record<string, any>) =>
  collectMailbox(args.mailboxId, 'local', () => invoke('fetch_emails', args), args.token, args.serverUrl)
