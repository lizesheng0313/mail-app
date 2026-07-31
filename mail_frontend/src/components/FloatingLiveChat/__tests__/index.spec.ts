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
    post: mocks.apiPost
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

    const customerB = wrapper
      .get('[data-testid="admin-conversation-list"]')
      .findAll('button')
      .find((button) => button.text().includes('客户乙'))
    expect(customerB).toBeTruthy()
    await customerB!.trigger('click')
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

    const customerA = wrapper
      .get('[data-testid="admin-conversation-list"]')
      .findAll('button')
      .find((button) => button.text().includes('客户甲'))
    await customerA!.trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="admin-chat-pane"]').classes()).not.toContain('hidden')
    await wrapper.get('[data-testid="admin-chat-back"]').trigger('click')
    expect(wrapper.get('[data-testid="admin-chat-pane"]').classes()).toContain('hidden')
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
})
