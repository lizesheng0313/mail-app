import batchLoginAPI from '@/api/batchLogin'
import { extractEmailDomain } from '@/utils/externalMailboxRules'

const RELAY_SUPPORTED_DOMAINS = new Set(['189.cn'])
const RELAYABLE_FAILURE_KIND = 'network'
const relayFetchPromises = new Map<number, Promise<unknown>>()

type ExternalMailboxFailure = {
  message?: string
  failure_kind?: string
  failureKind?: string
}

export const supportsExternalMailboxRelay = (email: string) =>
  RELAY_SUPPORTED_DOMAINS.has(extractEmailDomain(email))

export const isExternalMailboxNetworkFailure = (error: unknown) => {
  if (!error || typeof error !== 'object') return false
  const failure = error as ExternalMailboxFailure
  return String(failure.failure_kind || failure.failureKind || '').toLowerCase() === RELAYABLE_FAILURE_KIND
}

export const createExternalMailboxFailure = (result: ExternalMailboxFailure) => {
  const error = new Error(result?.message || '本地邮箱操作失败') as Error & ExternalMailboxFailure
  error.failure_kind = String(result?.failure_kind || result?.failureKind || 'unknown').toLowerCase()
  return error
}

export const runSerializedExternalMailboxRelayFetch = <T>(
  mailboxId: number,
  action: () => Promise<T>
): Promise<T> => {
  const normalizedMailboxId = Number(mailboxId || 0)
  if (!normalizedMailboxId) return action()

  const existing = relayFetchPromises.get(normalizedMailboxId)
  if (existing) return existing as Promise<T>

  const promise = Promise.resolve()
    .then(action)
    .finally(() => {
      if (relayFetchPromises.get(normalizedMailboxId) === promise) {
        relayFetchPromises.delete(normalizedMailboxId)
      }
    })
  relayFetchPromises.set(normalizedMailboxId, promise)
  return promise
}

export const runExternalMailboxWithRelayFallback = async <T>(options: {
  email: string
  localAction: () => Promise<T>
  relayAction: () => Promise<T>
  preferRelay?: boolean
}) => {
  if (options.preferRelay && supportsExternalMailboxRelay(options.email)) {
    return {
      source: 'relay' as const,
      result: await options.relayAction()
    }
  }

  try {
    return {
      source: 'local' as const,
      result: await options.localAction()
    }
  } catch (localError) {
    if (
      !supportsExternalMailboxRelay(options.email) ||
      !isExternalMailboxNetworkFailure(localError)
    ) {
      throw localError
    }

    return {
      source: 'relay' as const,
      result: await options.relayAction()
    }
  }
}

export const verifyExternalMailboxThroughRelay = async (account: {
  email: string
  password: string
  protocol?: string
  verifySmtp?: boolean
}) => {
  let response: any
  try {
    response = await batchLoginAPI.verifyExternalMailboxOnline(
      {
        email: account.email,
        password: account.password,
        protocol: account.protocol || 'auto',
        verify_smtp: account.verifySmtp === true
      },
      { suppressErrorMessage: true }
    )
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.message || '国内线路验证失败'
    throw new Error(String(message))
  }
  if (response.code !== 0 || !response.data?.success) {
    throw new Error(response.message || response.data?.message || '国内线路验证失败')
  }
  return response.data
}
