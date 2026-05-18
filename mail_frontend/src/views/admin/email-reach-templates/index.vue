<template>
  <div class="space-y-6">
    <div class="bg-white rounded-lg shadow-sm p-1 inline-flex">
      <button
        type="button"
        class="px-5 py-2 rounded-md font-medium text-sm transition-all"
        :class="activeTab === 'templates' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
        @click="switchTab('templates')"
      >
        全部模板
      </button>
      <button
        type="button"
        class="px-5 py-2 rounded-md font-medium text-sm transition-all"
        :class="activeTab === 'reviews' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
        @click="switchTab('reviews')"
      >
        审核记录
      </button>
    </div>

    <div class="rounded-lg bg-white p-5 shadow-sm">
      <div class="flex items-center gap-4">
        <BaseInput
          v-model="filters.search"
          placeholder="客户/模板/主题/原因"
          size="sm"
          class="w-72"
          @keyup.enter="loadRows(1)"
        />
        <div class="w-36">
          <CustomSelect v-model="filters.review_status" :options="reviewOptions" placeholder="全部审核" size="sm" />
        </div>
        <button type="button" class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700" @click="loadRows(1)">
          查询
        </button>
      </div>
    </div>

    <AdminDataTable
      title="模板列表"
      :loading="loading"
      :pagination="pagination"
      :column-count="5"
      @page-change="loadRows"
    >
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">客户</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">模板</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">审核</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">风险</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500">操作</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!rows.length">
          <td colspan="5" class="px-6 py-12 text-center text-sm text-gray-500">暂无模板数据</td>
        </tr>
        <tr v-for="item in rows" :key="`${activeTab}-${item.id}`" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm text-gray-700">
            <div class="font-medium text-gray-900">{{ item.user_email || '-' }}</div>
            <div class="mt-1 text-xs text-gray-500">{{ item.username || '未设置用户名' }}</div>
          </td>
          <td class="px-6 py-4 text-sm text-gray-700">
            <div class="font-medium text-gray-900">{{ item.name || '未命名模板' }}</div>
            <div class="mt-1 text-xs text-gray-500">{{ item.template_id || item.template_code || '-' }}</div>
          </td>
          <td class="px-6 py-4 text-sm whitespace-nowrap">
            <span :class="reviewClass(item.review_status)" class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium">
              {{ reviewLabel(item.review_status) }}
            </span>
          </td>
          <td class="px-6 py-4 text-sm whitespace-nowrap">
            <span :class="riskClass(item.risk_level)" class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium">
              {{ riskLabel(item.risk_level) }}
            </span>
          </td>
          <td class="px-6 py-4 text-right text-sm">
            <div class="flex items-center justify-end gap-1">
              <ActionButton
                icon="disable"
                tooltip="封禁模板"
                variant="disable"
                :disabled="blocking || item.review_status === 'rejected'"
                @click="handleBlockTemplate(item)"
              />
              <ActionButton icon="view" tooltip="查看详情" variant="view" @click="openDetail(item)" />
            </div>
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <BaseModal
      v-model="detailVisible"
      title="查看详情"
      size="xl"
      :show-footer="false"
      :show-confirm="false"
      :show-cancel="false"
      body-class="overflow-y-auto"
    >
      <div class="grid grid-cols-12 gap-6">
        <div class="col-span-4 space-y-5">
          <div>
            <div class="mb-1 text-sm text-gray-500">客户</div>
            <div class="text-base font-semibold text-gray-900">{{ detail.user_email || '-' }}</div>
            <div class="mt-1 text-sm text-gray-500">{{ detail.username || '未设置用户名' }}</div>
          </div>
          <div>
            <div class="mb-1 text-sm text-gray-500">模板名称</div>
            <div class="text-base font-semibold text-gray-900">{{ detail.name || '未命名模板' }}</div>
          </div>
          <div>
            <div class="mb-1 text-sm text-gray-500">模板编号</div>
            <div class="text-sm font-medium text-gray-900 break-all">{{ detail.template_id || detail.template_code || '-' }}</div>
          </div>
          <div>
            <div class="mb-1 text-sm text-gray-500">审核状态</div>
            <span :class="reviewClass(detail.review_status)" class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium">
              {{ reviewLabel(detail.review_status) }}
            </span>
          </div>
          <div>
            <div class="mb-1 text-sm text-gray-500">风险等级</div>
            <span :class="riskClass(detail.risk_level)" class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium">
              {{ riskLabel(detail.risk_level) }}
            </span>
          </div>
          <div>
            <div class="mb-1 text-sm text-gray-500">审核结果</div>
            <div class="text-sm leading-6 text-gray-700">{{ detail.review_reason || detail.reason || '-' }}</div>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button
              type="button"
              class="inline-flex items-center rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="blocking || detail.review_status === 'rejected'"
              @click="handleBlockTemplate(detail)"
            >
              封禁模板
            </button>
          </div>
        </div>

        <div class="col-span-8 space-y-4">
          <div>
            <div class="mb-2 text-sm font-medium text-gray-900">邮件主题</div>
            <div class="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
              {{ detail.subject || '-' }}
            </div>
          </div>
          <div>
            <div class="mb-2 text-sm font-medium text-gray-900">模板内容</div>
            <div class="rounded-lg border border-gray-200 bg-white p-4 min-h-[520px]">
              <EmailHtmlRenderer :html="detail.content || ''" />
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import EmailHtmlRenderer from '@/components/Mail/EmailHtmlRenderer.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'

const activeTab = ref('templates')
const loading = ref(false)
const blocking = ref(false)
const rows = ref([])
const pagination = reactive({ page: 1, limit: 20, total: 0, pages: 1 })
const filters = reactive({ search: '', review_status: '' })
const detailVisible = ref(false)
const detail = ref({})

const reviewOptions = [
  { label: '全部审核', value: '' },
  { label: '通过', value: 'approved' },
  { label: '拒绝', value: 'rejected' },
  { label: '草稿', value: 'draft' }
]

const reviewLabel = (value) => ({ approved: '通过', rejected: '拒绝', draft: '草稿' }[value] || value || '-')
const reviewClass = (value) => {
  if (value === 'approved') return 'bg-green-100 text-green-700'
  if (value === 'rejected') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-600'
}
const riskLabel = (value) => ({ high: '高风险', medium: '中风险', low: '低风险' }[value] || '-')
const riskClass = (value) => {
  if (value === 'high') return 'bg-red-100 text-red-700'
  if (value === 'medium') return 'bg-amber-100 text-amber-700'
  if (value === 'low') return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-600'
}

const switchTab = (tab) => {
  activeTab.value = tab
  rows.value = []
  pagination.page = 1
  loadRows(1)
}

const loadRows = async (page = pagination.page) => {
  loading.value = true
  try {
    const params = {
      page,
      limit: pagination.limit,
      search: filters.search,
      review_status: filters.review_status
    }
    const response = activeTab.value === 'templates'
      ? await emailReachApi.getAdminTemplates(params)
      : await emailReachApi.getAdminTemplateReviewLogs(params)
    rows.value = response.data?.items || []
    Object.assign(pagination, {
      page: response.data?.page || page,
      limit: response.data?.limit || pagination.limit,
      total: response.data?.total || 0,
      pages: response.data?.pages || 1
    })
  } catch (error) {
    showMessage(error?.message || '模板数据获取失败', 'error')
  } finally {
    loading.value = false
  }
}

const openDetail = (item) => {
  detail.value = item
  detailVisible.value = true
}

const handleBlockTemplate = async (item) => {
  const target = item || detail.value
  if (!target?.id || blocking.value) return
  blocking.value = true
  try {
    const res = await emailReachApi.blockAdminTemplate(target.id, { reason: '管理员手动封禁模板' })
    if (detail.value?.id === target.id) {
      detail.value = { ...detail.value, ...(res.data || {}) }
    }
    showMessage('模板已封禁', 'success')
    await loadRows(pagination.page)
  } catch (error) {
    showMessage(error?.message || '封禁失败', 'error')
  } finally {
    blocking.value = false
  }
}

onMounted(() => loadRows(1))
</script>
