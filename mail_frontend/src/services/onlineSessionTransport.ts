import type { Socket } from 'socket.io-client'
import { handleSessionUnauthorized } from '@/services/api'

export type OnlineSessionPayload = {
  session_id: string
  browser_instance_id: string
  page_path: string
  client_platform: string
  device_type: string
  user_agent: string
  user_id?: number
}

let transport: { socket: Socket; userId: number; token: string } | null = null
const readyListeners = new Set<() => void>()

export const bindOnlineSessionSocket = (socket: Socket, userId: number, token = localStorage.getItem('token') || '') => {
  transport = { socket, userId, token }
  for (const listener of readyListeners) listener()
}

export const unbindOnlineSessionSocket = (socket: Socket) => {
  if (transport?.socket === socket) transport = null
}

export const onOnlineSessionSocketReady = (listener: () => void) => {
  readyListeners.add(listener)
  if (transport?.socket.connected) listener()
  return () => { readyListeners.delete(listener) }
}

export const sendOnlineSessionHeartbeat = async (payload: OnlineSessionPayload): Promise<boolean> => {
  const current = transport
  if (!current?.socket.connected || current.userId !== payload.user_id) return false
  try {
    // 心跳仅使用现有连接；失败后等待下一次心跳或重连。
    const result = await current.socket.timeout(5000).emitWithAck('online_session_heartbeat', payload)
    if (result?.status === 401) handleSessionUnauthorized(result, current.token)
    return result?.ok === true
  } catch {
    return false
  }
}
