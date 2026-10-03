import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  user: { is_admin: false },
  push: vi.fn(),
  createWorkflow: vi.fn(),
  getWorkflow: vi.fn(),
  publishWorkflowToMarket: vi.fn(),
  updateWorkflowMarketInfo: vi.fn(),
  getMyStore: vi.fn(),
  showMessage: vi.fn()
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }), useRoute: () => ({}) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ user: mocks.user }) }))
vi.mock('@/api/workflow', () => ({ workflowApi: {
  createWorkflow: mocks.createWorkflow,
  getWorkflow: mocks.getWorkflow,
  publishWorkflowToMarket: mocks.publishWorkflowToMarket,
  updateWorkflowMarketInfo: mocks.updateWorkflowMarketInfo
} }))
vi.mock('@/api/workflowMarket', () => ({ getMyStore: mocks.getMyStore }))
vi.mock('@/api/resourceMarket', () => ({
  bindResourceProviderProduct: vi.fn(), deleteResourceSkuMapping: vi.fn(),
  getResourceProviderProducts: vi.fn(), getResourceSkuMappings: vi.fn()
}))
vi.mock('@/services/api', () => ({ default: { post: vi.fn() } }))
vi.mock('@/utils/message', () => ({ showMessage: mocks.showMessage }))
vi.mock('@tiptap/vue-3', () => ({
  useEditor: () => ref({ getHTML: () => '', commands: { setContent: vi.fn() }, destroy: vi.fn() }),
  EditorContent: { template: '<div />' }
}))
vi.mock('@tiptap/starter-kit', () => ({ default: {} }))
vi.mock('@tiptap/extension-placeholder', () => ({ default: { configure: () => ({}) } }))

import PublishPage from './index.vue'

const mountPage = () => shallowMount(PublishPage, {
  global: { stubs: { BaseModal: true, CustomSelect: true, EditorContent: true } }
})

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/workflows/publish')
  mocks.user.is_admin = false
  mocks.getMyStore.mockResolvedValue({ code: 0, data: { status: 'active' } })
  mocks.createWorkflow.mockResolvedValue({ code: 0, data: { workflow_id: 'wf-new' } })
  mocks.getWorkflow.mockResolvedValue({ code: 0, data: { id: 42 } })
  mocks.publishWorkflowToMarket.mockResolvedValue({ code: 0 })
})

describe('shared product publishing page', () => {
  it('creates a private-store product from the same page without a workflow ID', async () => {
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('发布商品')
    expect(wrapper.text()).not.toContain('公开到资源市场')

    const form = (wrapper.vm as any).formData
    form.name = '测试商品'
    form.primaryCategory = 'food_drink'
    form.secondaryCategory = 'coffee'
    form.longDescription = '<p>商品详情</p>'
    form.skus[0].price = 10

    await (wrapper.vm as any).handleSubmit()
    await flushPromises()

    expect(mocks.getMyStore).toHaveBeenCalledOnce()
    expect(mocks.createWorkflow).toHaveBeenCalledWith({
      name: '测试商品', description: '', steps: [], variables: {}, settings: {}
    })
    expect(mocks.publishWorkflowToMarket).toHaveBeenCalledWith('wf-new', expect.objectContaining({
      resource_type: 'product', market_visibility: 'share_only', inventory_enabled: true
    }))
    wrapper.unmount()
  })

  it('lets administrators use the same page to publish publicly', async () => {
    mocks.user.is_admin = true
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('发布到资源市场')
    expect(wrapper.text()).toContain('公开到资源市场')
    expect((wrapper.vm as any).formData.marketVisibility).toBe('public')
    wrapper.unmount()
  })

  it('does not create an orphan product when the store is not active', async () => {
    mocks.getMyStore.mockResolvedValue({ code: 0, data: { status: 'pending' } })
    const wrapper = mountPage()
    const form = (wrapper.vm as any).formData
    form.name = '测试商品'
    form.primaryCategory = 'food_drink'
    form.secondaryCategory = 'coffee'
    form.longDescription = '<p>商品详情</p>'
    form.skus[0].price = 10

    await (wrapper.vm as any).handleSubmit()
    expect(mocks.createWorkflow).not.toHaveBeenCalled()
    expect(mocks.showMessage).toHaveBeenCalledWith('请先开通店铺，再发布商品', 'error')
    wrapper.unmount()
  })

  it('reuses the same draft when a publish request is retried', async () => {
    mocks.publishWorkflowToMarket
      .mockResolvedValueOnce({ code: 1, message: '暂时无法发布' })
      .mockResolvedValueOnce({ code: 0 })
    const wrapper = mountPage()
    const form = (wrapper.vm as any).formData
    form.name = '测试商品'
    form.primaryCategory = 'food_drink'
    form.secondaryCategory = 'coffee'
    form.longDescription = '<p>商品详情</p>'
    form.skus[0].price = 10

    await (wrapper.vm as any).handleSubmit()
    await (wrapper.vm as any).handleSubmit()

    expect(mocks.createWorkflow).toHaveBeenCalledOnce()
    expect(mocks.publishWorkflowToMarket).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})
