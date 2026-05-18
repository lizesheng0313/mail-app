<template>
  <div class="space-y-6">
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-sm text-slate-500">邮件触达账号</p>
          <h2 class="mt-2 text-2xl font-semibold text-slate-900">{{ statusLabel }}</h2>
          <p class="mt-3 text-sm text-slate-600">{{ access.reason }}</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          当前邮箱：{{ access.email || '-' }}
        </div>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">邮件状态</p>
        <p class="mt-3 text-xl font-semibold text-slate-900">{{ access.enabled ? '已开通' : '未开通' }}</p>
      </div>
      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">单次批量上限</p>
        <p class="mt-3 text-xl font-semibold text-slate-900">{{ access.single_batch_limit || 0 }}</p>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">当前套餐</p>
        <p class="mt-3 text-xl font-semibold text-slate-900">{{ access.plan_name || '未配置' }}</p>
      </div>
      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">套餐月费</p>
        <p class="mt-3 text-xl font-semibold text-slate-900">{{ access.monthly_fee || 0 }} 奶片</p>
      </div>
      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">当前邮件量</p>
        <p class="mt-3 text-xl font-semibold text-slate-900">{{ Number(access.included_quota || 0).toLocaleString() }} 封</p>
      </div>
    </div>

    <AdminDataTable title="计费说明" :column-count="2">
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">项目</th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">说明</th>
        </tr>
      </template>
      <template #tbody>
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-slate-900">计费货币</td>
          <td class="px-6 py-4 text-sm text-slate-700">{{ access.billing_currency === 'milk_coin' ? '奶片' : '-' }}</td>
        </tr>
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-slate-900">邮件补量</td>
          <td class="px-6 py-4 text-sm text-slate-700">{{ access.supports_credit_topup ? '支持单独购买邮件数' : '暂未开通' }}</td>
        </tr>
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-slate-900">补量单价</td>
          <td class="px-6 py-4 text-sm text-slate-700">{{ access.overage_price_per_10000 || 0 }} 奶片 / 万封</td>
        </tr>
      </template>
    </AdminDataTable>

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'
import AdminDataTable from '@/components/AdminDataTable/index.vue'

const access = ref({
  status: 'pending',
  reason: '加载中...',
  email: '',
  enabled: false,
  single_batch_limit: 0,
  plan_name: '',
  monthly_fee: 0,
  included_quota: 0,
  overage_price_per_10000: 0,
  billing_currency: 'milk_coin',
  supports_credit_topup: true,
  package_configured: false
})

const statusLabel = computed(() => {
  if (access.value.status === 'approved') return '已开通'
  if (access.value.status === 'trial') return '试用中'
  if (access.value.status === 'blocked') return '已限制'
  return '待开通'
})

onMounted(async () => {
  const res = await emailReachApi.getAccessSummary()
  if (res.code === 0) {
    access.value = res.data
  } else {
    showMessage(res.message || '加载失败', 'error')
  }
})
</script>
