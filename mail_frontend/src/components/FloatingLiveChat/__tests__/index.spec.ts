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
      return { code: 0, data: { items: conversations } }
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

describe('FloatingLiveChat admin conversation layout', () => {
  let wrapper: ReturnType<typeof mount> | null = null

  beforeEach(() => {
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

    expect(wrapper.get('[data-testid="chat-launcher-unread"]').text()).toBe('1')
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
})
