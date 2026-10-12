import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const socket: any = {
    connected: true,
    on: vi.fn(),
    emit: vi.fn(),
    removeAllListeners: vi.fn(),
    disconnect: vi.fn()
  }
  socket.on.mockReturnValue(socket)

  return {
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiDelete: vi.fn(),
    io: vi.fn(() => socket),
    router: { push: vi.fn() },
    socket,
    userStore: {
      user: null as any,
      isAuthenticated: false
    }
  }
})

vi.mock('@/services/api', () => ({
  default: {
    get: mocks.apiGet,
    post: mocks.apiPost,
    delete: mocks.apiDelete
  },
  getApiBaseURL: () => '/mail-api/v1'
}))

vi.mock('@/stores/user', () => ({
  useUserStore: () => mocks.userStore
}))

vi.mock('@/utils/imageUpload', () => ({
  uploadImageFile: vi.fn()
}))

vi.mock('@/utils/message', () => ({
  showMessage: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router
}))

vi.mock('socket.io-client', () => ({
  io: mocks.io
}))

import FloatingLiveChat from '../index.vue'

const conversations = [
  {
    user: {
      id: 101,
      display_name: '客户甲',
      email: 'customer-a@example.com',
      is_admin: false,
      avatar_text: '甲'
    },
    is_online: true,
    unread_count: 2,
    last_message: {
      content: '请帮我看一下这个问题',
      created_at_ms: 1710000000000
    }
  },
  {
    user: {
      id: 102,
      display_name: '客户乙',
      email: 'customer-b@example.com',
      is_admin: false,
      avatar_text: '乙'
    },
    is_online: false,
    unread_count: 0,
    last_message: {
      content: '谢谢',
      created_at_ms: 1710000000000
    }
  }
]

const configureApi = () => {
  mocks.apiGet.mockImplementation(async (url: string) => {
    if (url === '/live-chat/conversations') {
      return { code: 0, data: { items: structuredClone(conversations) } }
    }
    if (url === '/live-chat/summary') {
      return { code: 0, data: { online_count: 2, unread_count: 0 } }
    }
    return {
      code: 0,
      data: {
        items: [],
        next_before_message_id: 0,
        has_more: false,
        online_count: 2,
        unread_count: 0
      }
    }
  })
  mocks.apiPost.mockResolvedValue({ code: 0, data: {} })
  mocks.apiDelete.mockResolvedValue({ code: 0, data: {} })
}

const setViewport = (isCompact: boolean) => {
  window.matchMedia = vi.fn(() => ({
    matches: isCompact,
    media: '(max-width: 639px)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })) as any
}

const configureUnreadInbox = () => {
  const contacts = structuredClone(conversations)
  contacts[1].unread_count = 3
  const unread = () => contacts.reduce((total, contact) => total + contact.unread_count, 0)
  mocks.apiGet.mockImplementation(async (url: string, options?: any) => {
    if (url === '/live-chat/conversations') {
      return { code: 0, data: { items: structuredClone(contacts), unread_count: unread() } }
    }
    if (url === '/live-chat/messages') {
      const customerId = options?.params?.conversation_user_id || 101
      return { code: 0, data: {
        unread_count: unread(), has_more: false,
        items: [{ id: customerId + 400, content: '客户问题', created_at_ms: Date.now(), user: contacts.find(item => item.user.id === customerId)!.user }],
      } }
    }
    return { code: 0, data: { items: [], unread_count: 0 } }
  })
  mocks.apiPost.mockImplementation(async (url: string, payload: any) => {
    if (url === '/live-chat/read') {
      contacts.find(contact => contact.user.id === payload.conversation_user_id)!.unread_count = 0
    }
    return { code: 0, data: { unread_count: unread() } }
  })
  return contacts
}

describe('FloatingLiveChat admin conversation layout', () => {
  let wrapper: ReturnType<typeof mount> | null = null

  beforeEach(() => {
    localStorage.clear()
    mocks.userStore.user = {
      id: 1,
      display_name: '管理员',
      email: 'admin@example.com',
      is_admin: true,
      avatar_text: '管'
    }
    mocks.userStore.isAuthenticated = true
    mocks.socket.connected = true
    mocks.apiGet.mockReset()
    mocks.apiPost.mockReset()
    mocks.apiDelete.mockReset()
    mocks.socket.on.mockClear()
    mocks.io.mockClear()
    configureApi()
    setViewport(false)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.useRealTimers()
  })

  it('renders customer contacts on the left and the selected chat on the right', async () => {
    wrapper = mount(FloatingLiveChat)
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="admin-conversation-list"]').text()).toContain('客户甲')
    expect(wrapper.get('[data-testid="admin-conversation-list"]').text()).toContain(
      '请帮我看一下这个问题'
    )
    expect(wrapper.get('[data-testid="admin-chat-pane"]').text()).toContain('客户甲')
    expect(wrapper.get('[data-testid="admin-chat-pane"]').classes()).toContain('min-h-0')

    const customerB = wrapper.get('[data-testid="admin-conversation-item-102"]')
    await customerB.trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="admin-chat-pane"]').text()).toContain('客户乙')
  })

  it('shows the contact list first on mobile and supports returning from chat', async () => {
    setViewport(true)
    wrapper = mount(FloatingLiveChat)
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="admin-conversation-list"]').classes()).not.toContain('hidden')
    expect(wrapper.get('[data-testid="admin-chat-pane"]').classes()).toContain('hidden')

    const customerA = wrapper.get('[data-testid="admin-conversation-item-101"]')
    await customerA.trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="admin-chat-pane"]').classes()).not.toContain('hidden')
    await wrapper.get('[data-testid="admin-chat-back"]').trigger('click')
    expect(wrapper.get('[data-testid="admin-chat-pane"]').classes()).toContain('hidden')
  })

  it('searches a user for a private message without adding an empty conversation', async () => {
    mocks.apiGet.mockImplementation(async (url: string) => {
      if (url === '/live-chat/conversations') {
        return { code: 0, data: { items: conversations } }
      }
      if (url === '/live-chat/users/search') {
        return {
          code: 0,
          data: {
            items: [{
              user: {
                id: 103,
                display_name: '客户丙',
                email: 'customer-c@example.com',
                is_admin: false,
                avatar_text: '丙'
              },
              is_online: true
            }]
          }
        }
      }
      return {
        code: 0,
        data: {
          items: [],
          next_before_message_id: 0,
          has_more: false,
          online_count: 3,
          unread_count: 0
        }
      }
    })

    wrapper = mount(FloatingLiveChat)
    await wrapper.get('[data-testid="chat-launcher"]').trigger('click')
    await flushPromises()

    const searchInput = wrapper.get('[data-testid="admin-user-search-input"]')
    await searchInput.setValue('customer-c')
    await wrapper.get('[data-testid="admin-user-search-button"]').trigger('click')
    await flushPromises()

    expect(mocks.apiGet).toHaveBeenCalledWith(
      '/live-chat/users/search',
      expect.objectContaining({ params: { keyword: 'customer-c' } }),
    )
    expect(wrapper.get('[data-testid="admin-user-search-result"]').text()).toContain('客户丙')
    expect(wrapper.find('[data-testid="admin-conversation-item-103"]').exists()).toBe(false)

    await wrapper.get('[data-testid="admin-user-search-result"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="admin-chat-pane"]').text()).toContain('客户丙')
    expect(wrapper.find('[data-testid="admin-conversation-item-103"]').exists()).toBe(false)
  })

  it('keeps the ordinary user experience as a single chat pane', async () => {
    mocks.userStore.user = {
      id: 2,
      display_name: '普通用户',
      email: 'user@example.com',
      is_admin: false,
      avatar_text: '用'
    }
    setViewport(false)
    wrapper = mount(FloatingLiveChat)
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="admin-conversation-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="admin-chat-pane"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('还没有客服消息。')
    expect(wrapper.text()).not.toContain('只有你和管理员能看到这段对话。')
  })

  it('shows a launcher unread indicator when an inactive customer sends a message', async () => {
    wrapper = mount(FloatingLiveChat)
    await flushPromises()

    const chatEventRegistration = mocks.socket.on.mock.calls.find(
      ([eventName]) => eventName === 'chat_event'
    )
    expect(chatEventRegistration).toBeTruthy()

    const originalGet = mocks.apiGet.getMockImplementation()!
    mocks.apiGet.mockImplementation((url: string) => url === '/live-chat/conversations'
      ? Promise.resolve({ code: 0, data: { items: structuredClone(conversations), unread_count: 3 } })
      : originalGet(url))

    await chatEventRegistration![1]({
      type: 'message',
      message: {
        id: 501,
        content: '有新的客户问题',
        attachments: [],
        created_at_ms: 1710000000000,
        recipient_user_id: null,
        user: {
          id: 101,
          display_name: '客户甲',
          email: 'customer-a@example.com',
          is_admin: false,
          avatar_text: '甲'
        }
      }
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="chat-launcher-unread"]').text()).toBe('3')
  })

  it('keeps the launcher available and lets the user drag it', async () => {
    wrapper = mount(FloatingLiveChat)
    await flushPromises()

    expect(wrapper.find('[aria-label="隐藏在线客服入口"]').exists()).toBe(false)
    const launcher = wrapper.get('[data-testid="chat-launcher"]')
    launcher.element.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 900,
      clientY: 700
    }))
    window.dispatchEvent(new MouseEvent('pointermove', {
      clientX: 820,
      clientY: 620
    }))
    window.dispatchEvent(new MouseEvent('pointerup', {
      clientX: 820,
      clientY: 620
    }))
    await flushPromises()

    expect(launcher.attributes('style')).toContain('translate3d(-80px, -80px, 0)')
    expect(localStorage.getItem('live_chat_launcher_position')).toContain('-80')
  })

  it('keeps the message panel scrollable without jumping when the user is reading older messages', async () => {
    mocks.userStore.user = {
      id: 2,
      display_name: '普通用户',
      email: 'user@example.com',
      is_admin: false,
      avatar_text: '用'
    }
    wrapper = mount(FloatingLiveChat)
    await wrapper.get('[data-testid="chat-launcher"]').trigger('click')
    await flushPromises()

    const container = wrapper.get('[data-testid="chat-message-container"]')
    expect(container.classes()).toContain('scrollbar-stable')

    Object.defineProperties(container.element, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 900 }
    })
    container.element.scrollTop = 0

    const chatEventRegistration = mocks.socket.on.mock.calls.find(
      ([eventName]) => eventName === 'chat_event'
    )
    await chatEventRegistration![1]({
      type: 'message',
      message: {
        id: 502,
        content: '新的客服消息',
        attachments: [],
        created_at_ms: 1710000000000,
        recipient_user_id: null,
        user: {
          id: 1,
          display_name: '管理员',
          email: 'admin@example.com',
          is_admin: true,
          avatar_text: '管'
        }
      }
    })
    await flushPromises()

    expect(container.element.scrollTop).toBe(0)

    container.element.scrollTop = 500
    await chatEventRegistration![1]({
      type: 'message',
      message: {
        id: 503,
        content: '底部的新客服消息',
        attachments: [],
        created_at_ms: 1710000000000,
        recipient_user_id: null,
        user: {
          id: 1,
          display_name: '管理员',
          email: 'admin@example.com',
          is_admin: true,
          avatar_text: '管'
        }
      }
    })
    await flushPromises()

    expect(container.element.scrollTop).toBe(900)
  })

  it('opens the first chat at the bottom after history loading completes', async () => {
    mocks.userStore.user = {
      id: 2,
      display_name: '普通用户',
      email: 'user@example.com',
      is_admin: false,
      avatar_text: '用'
    }

    let resolveHistory: ((response: any) => void) | null = null
    const historyResponse = new Promise((resolve) => {
      resolveHistory = resolve
    })
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/live-chat/messages') return historyResponse
      if (url === '/live-chat/summary') {
        return Promise.resolve({ code: 0, data: { online_count: 2, unread_count: 0 } })
      }
      return Promise.resolve({ code: 0, data: {} })
    })

    wrapper = mount(FloatingLiveChat)
    const opening = wrapper.get('[data-testid="chat-launcher"]').trigger('click')
    await flushPromises()

    const container = wrapper.get('[data-testid="chat-message-container"]')
    Object.defineProperties(container.element, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 900 }
    })
    container.element.scrollTop = 0

    resolveHistory?.({
      code: 0,
      data: {
        items: [
          {
            id: 504,
            content: '历史消息',
            attachments: [],
            created_at_ms: 1710000000000,
            recipient_user_id: null,
            user: {
              id: 1,
              display_name: '管理员',
              email: 'admin@example.com',
              is_admin: true,
              avatar_text: '管'
            }
          }
        ],
        next_before_message_id: 504,
        has_more: false,
        online_count: 2,
        unread_count: 0
      }
    })
    await opening
    await flushPromises()

    expect(container.element.scrollTop).toBe(900)
  })

  it('removes a customer from the list without deleting the conversation history', async () => {
    wrapper = mount(FloatingLiveChat)
    await wrapper.get('[data-testid="chat-launcher"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="admin-remove-conversation-101"]').trigger('click')
    await flushPromises()

    expect(mocks.apiDelete).toHaveBeenCalledWith('/live-chat/conversations/101')
    expect(wrapper.find('[data-testid="admin-conversation-item-101"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="admin-conversation-list"]').text()).toContain('客户乙')
  })

  it('counts existing unread customer messages immediately after login', async () => {
    configureUnreadInbox()
    wrapper = mount(FloatingLiveChat)
    await flushPromises()
    expect(wrapper.get('[data-testid="chat-launcher-unread"]').text()).toBe('5')
    expect(mocks.apiPost).not.toHaveBeenCalled()
  })

  it('only clears the selected customer and retains other customers on the launcher', async () => {
    configureUnreadInbox()
    wrapper = mount(FloatingLiveChat)
    await flushPromises()
    await wrapper.get('[data-testid="chat-launcher"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="admin-conversation-unread-102"]').text()).toBe('3')
    await wrapper.get('[aria-label="关闭在线客服"]').trigger('click')
    expect(wrapper.get('[data-testid="chat-launcher-unread"]').text()).toBe('3')
    await wrapper.get('[data-testid="chat-launcher"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="admin-conversation-item-102"]').trigger('click')
    await flushPromises()
    await wrapper.get('[aria-label="关闭在线客服"]').trigger('click')
    expect(wrapper.find('[data-testid="chat-launcher-unread"]').exists()).toBe(false)
  })

  it('preserves unread badges when the read acknowledgement fails', async () => {
    configureUnreadInbox()
    mocks.apiPost.mockRejectedValue(new Error('offline'))
    wrapper = mount(FloatingLiveChat)
    await flushPromises()
    await wrapper.get('[data-testid="chat-launcher"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="admin-conversation-unread-101"]').text()).toBe('2')
    await wrapper.get('[aria-label="关闭在线客服"]').trigger('click')
    expect(wrapper.get('[data-testid="chat-launcher-unread"]').text()).toBe('5')
  })

  it('recovers unread counts by polling even if no socket event arrives', async () => {
    vi.useFakeTimers()
    const contacts = configureUnreadInbox()
    wrapper = mount(FloatingLiveChat)
    await flushPromises()
    contacts[1].unread_count = 4
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(wrapper.get('[data-testid="chat-launcher-unread"]').text()).toBe('6')
    expect(mocks.apiPost).not.toHaveBeenCalled()
  })

  it('does not mark messages read while only the mobile contact list is visible', async () => {
    vi.useFakeTimers()
    configureUnreadInbox()
    setViewport(true)
    wrapper = mount(FloatingLiveChat)
    await flushPromises()
    await wrapper.get('[data-testid="chat-launcher"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    await wrapper.get('[aria-label="关闭在线客服"]').trigger('click')
    expect(wrapper.get('[data-testid="chat-launcher-unread"]').text()).toBe('5')
    expect(mocks.apiPost).not.toHaveBeenCalled()
  })

  it('refreshes unread counts when the page resumes and the socket reconnects', async () => {
    const contacts = configureUnreadInbox()
    wrapper = mount(FloatingLiveChat)
    await flushPromises()
    contacts[1].unread_count = 5
    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    expect(wrapper.get('[data-testid="chat-launcher-unread"]').text()).toBe('7')
    const disconnect = mocks.socket.on.mock.calls.find(([name]) => name === 'disconnect')![1]
    const connect = mocks.socket.on.mock.calls.find(([name]) => name === 'connect')![1]
    disconnect()
    contacts[1].unread_count = 6
    connect()
    await flushPromises()
    expect(wrapper.get('[data-testid="chat-launcher-unread"]').text()).toBe('8')
    expect(mocks.io).toHaveBeenCalledTimes(1)
  })

  it('ignores a repeated socket delivery of the same customer message', async () => {
    const contacts = configureUnreadInbox()
    wrapper = mount(FloatingLiveChat)
    await flushPromises()
    contacts[0].unread_count = 3
    const event = mocks.socket.on.mock.calls.find(([name]) => name === 'chat_event')![1]
    const payload = { type: 'message', message: {
      id: 600, content: '新的问题', created_at_ms: Date.now(), user: contacts[0].user,
    } }
    event(payload)
    await flushPromises()
    const refreshes = mocks.apiGet.mock.calls.length
    event(payload)
    await flushPromises()
    expect(wrapper.get('[data-testid="chat-launcher-unread"]').text()).toBe('6')
    expect(mocks.apiGet.mock.calls).toHaveLength(refreshes)
  })

  it('keeps messages unread when they arrive while the browser page is hidden', async () => {
    configureUnreadInbox()
    wrapper = mount(FloatingLiveChat)
    await flushPromises()
    await wrapper.get('[data-testid="chat-launcher"]').trigger('click')
    await flushPromises()
    mocks.apiPost.mockClear()
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    try {
      const event = mocks.socket.on.mock.calls.find(([name]) => name === 'chat_event')![1]
      event({ type: 'message', message: {
        id: 601, content: '后台收到的新消息', created_at_ms: Date.now(), user: conversations[0].user,
      } })
      await flushPromises()
      expect(mocks.apiPost).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    }
  })

  it('distinguishes todays message from the customers June history', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-11T18:00:00'))
    configureUnreadInbox()
    const originalGet = mocks.apiGet.getMockImplementation()!
    mocks.apiGet.mockImplementation((url: string, options: any) => url === '/live-chat/messages'
      ? Promise.resolve({ code: 0, data: { items: [
          { id: 83, content: '旧消息', created_at_ms: new Date('2026-06-25T14:11:00').getTime(), user: conversations[0].user },
          { id: 167, content: '新消息', created_at_ms: new Date('2026-10-11T14:50:00').getTime(), user: conversations[0].user },
        ], unread_count: 5 } })
      : originalGet(url, options))
    wrapper = mount(FloatingLiveChat)
    await flushPromises()
    await wrapper.get('[data-testid="chat-launcher"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('2026-06-25 14:11')
    expect(wrapper.text()).toContain('今天 14:50')
  })
})
