import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  showMessage: vi.fn(),
  socket: {
    connected: false,
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({ default: mocks, getApiBaseURL: () => '/mail-api/v1' }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ isAuthenticated: true, user: { id: 1, is_admin: true } }) }))
vi.mock('@/utils/message', () => ({ showMessage: mocks.showMessage }))
vi.mock('@/utils/imageUpload', () => ({ uploadImageFile: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('socket.io-client', () => ({ io: () => mocks.socket }))

import FloatingLiveChat from './index.vue'

describe('admin support conversation list', () => {
  beforeEach(() => {
    mocks.get.mockReset().mockImplementation((path: string) => {
      if (path === '/live-chat/conversations') {
        return Promise.resolve({ code: 0, data: { items: [{
          user: { id: 23, display_name: '注册用户', avatar_text: '注', email: '', is_admin: false },
          is_online: false,
          unread_count: 0,
          last_message: { content: '普通消息', created_at_ms: 1000 },
        }] } })
      }
      if (path === '/live-chat/guest/conversations') {
        return Promise.resolve({ code: 0, data: {
          items: [{ id: 4, last_message: '游客消息', updated_at_ms: 2000, unread_count: 2 }],
          unread_count: 2,
        } })
      }
      if (path === '/live-chat/guest/conversations/4/messages') {
        return Promise.resolve({ code: 0, data: { items: [{ id: 9, sender_type: 'guest', content: '游客消息', created_at_ms: 2000 }] } })
      }
      return Promise.resolve({ code: 0, data: { items: [], unread_count: 0, online_count: 0 } })
    })
    mocks.post.mockReset().mockResolvedValue({ code: 0, data: { item: { id: 10 } } })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() }),
    })
  })

  it('shows guest and registered users together and replies from the same pane', async () => {
    const wrapper = mount(FloatingLiveChat)
    await flushPromises()
    expect(wrapper.get('[data-testid="chat-launcher-unread"]').text()).toBe('2')
    await wrapper.get('[data-testid="chat-launcher"]').trigger('click')
    await flushPromises()

    const items = wrapper.findAll('[data-testid^="admin-conversation-item-"]')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('游客 #4')
    expect(items[0].text()).toContain('游客')
    expect(items[1].text()).toContain('注册用户')
    expect(wrapper.text()).toContain('游客消息')
    expect(wrapper.findAll('button').some(button => button.text().trim() === '游客会话')).toBe(false)
    expect(mocks.post).toHaveBeenCalledWith(
      '/live-chat/guest/conversations/4/read',
      null,
      expect.anything(),
    )
    expect(wrapper.find('[data-testid="admin-conversation-unread--4"]').exists()).toBe(false)

    await wrapper.get('textarea').setValue('收到')
    await wrapper.get('[data-testid="chat-send-button"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith(
      '/live-chat/guest/conversations/4/reply',
      { content: '收到' },
      expect.anything(),
    )

    await items[1].trigger('click')
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledWith(
      '/live-chat/messages',
      expect.objectContaining({ params: { limit: 60, conversation_user_id: 23 } }),
    )
    wrapper.unmount()
  })

  it('keeps the red unread badge on an unselected guest conversation', async () => {
    const originalGet = mocks.get.getMockImplementation()!
    mocks.get.mockImplementation((path: string, ...args: unknown[]) => {
      if (path === '/live-chat/guest/conversations') {
        return Promise.resolve({ code: 0, data: {
          items: [{ id: 4, last_message: '游客消息', updated_at_ms: 2000, unread_count: 2 }],
          unread_count: 2,
        } })
      }
      if (path === '/live-chat/conversations') {
        return Promise.resolve({ code: 0, data: { items: [{
          user: { id: 23, display_name: '注册用户', avatar_text: '注', email: '', is_admin: false },
          is_online: false,
          unread_count: 0,
          last_message: { content: '普通消息', created_at_ms: 3000 },
        }] } })
      }
      return originalGet(path, ...args)
    })

    const wrapper = mount(FloatingLiveChat)
    await flushPromises()
    await wrapper.get('[data-testid="chat-launcher"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="admin-conversation-unread--4"]').text()).toBe('2')
    wrapper.unmount()
  })
})
