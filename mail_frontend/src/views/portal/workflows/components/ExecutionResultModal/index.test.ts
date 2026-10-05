import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

import ExecutionResultModal from './index.vue'

describe('resource order result', () => {
  it('shows the returned order link and card instead of an empty account notice', () => {
    const wrapper = mount(ExecutionResultModal, {
      props: {
        visible: true,
        product: true,
        executionData: {
          order_no: 'WFX-1',
          result: {
            order_status: 20,
            delivery: {
              order_link: 'https://coffee.example/order/1',
              cards: [{ cardNo: 'CODE-1', cardPwd: 'PASS-1' }],
            },
          },
        },
      },
      global: { stubs: { ActionButton: true } },
    })

    expect(wrapper.text()).toContain('WFX-1')
    expect(wrapper.text()).toContain('https://coffee.example/order/1')
    expect(wrapper.text()).toContain('CODE-1')
    expect(wrapper.text()).not.toContain('executionResult.noAccountInfo')
    expect(wrapper.get('a[href="https://coffee.example/order/1"]').attributes('target')).toBe('_blank')
  })

  it('shows a pending state and order number when the supplier has not delivered', () => {
    const wrapper = mount(ExecutionResultModal, {
      props: {
        visible: true,
        product: true,
        executionData: { result: { order_status: 10, provider_order_no: 'TP-2' } },
      },
    })

    expect(wrapper.text()).toContain('executionResult.productProcessingTitle')
    expect(wrapper.text()).toContain('TP-2')
    expect(wrapper.text()).toContain('executionResult.processingHint')
    expect(wrapper.find('a[href^="http"]').exists()).toBe(false)
  })
})
