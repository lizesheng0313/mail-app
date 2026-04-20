<template>
  <div class="flex h-full min-h-0 flex-col gap-4">
    <div class="rounded-lg border bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4 overflow-x-auto pb-1">
          <BaseInput
            v-model="queryForm.from_email"
            placeholder="发件人"
            class="w-56 flex-shrink-0"
            size="sm"
            @enter="handleSearch"
          >
            <template #left-icon>
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </template>
          </BaseInput>

          <BaseInput
            v-model="queryForm.to_email"
            placeholder="收件人"
            class="w-56 flex-shrink-0"
            size="sm"
            @enter="handleSearch"
          />

          <BaseInput
            v-model="queryForm.subject"
            placeholder="标题"
            class="w-56 flex-shrink-0"
            size="sm"
            @enter="handleSearch"
          />

          <BaseInput
            v-model="queryForm.content"
            placeholder="正文"
            class="w-56 flex-shrink-0"
            size="sm"
            @enter="handleSearch"
          />

          <button
            type="button"
            class="flex-shrink-0 rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="handleSearch"
          >
            查询
          </button>
        </div>
      </div>
    </div>

    <div class="min-h-0 flex-1">
      <AdminDataTable
        :loading="loading"
        :pagination="pagination"
        :show-page-size-selector="true"
        :column-count="7"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-black">发件人</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black">收件人</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black">标题</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black">正文摘要</th>
            <th class="w-28 px-6 py-3 text-left text-xs font-medium text-black">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black">发送时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black">操作</th>
          </tr>
        </template>

        <template #tbody>
          <tr
            v-for="record in records"
            :key="record.id"
            class="hover:bg-gray-50"
          >
            <td class="px-6 py-4 text-sm text-black">
              <p class="max-w-[180px] truncate font-medium" :title="record.from_email">{{ record.from_email || '-' }}</p>
            </td>

            <td class="px-6 py-4 text-sm text-black">
              <p class="max-w-[220px] truncate" :title="record.to_email">{{ record.to_email || '-' }}</p>
            </td>

            <td class="px-6 py-4 text-sm text-black">
              <p class="max-w-[240px] truncate font-medium" :title="record.subject">{{ record.subject || '（无主题）' }}</p>
            </td>

            <td class="px-6 py-4 text-sm text-slate-600">
              <p class="max-w-[180px] truncate" :title="contentPreview(record)">{{ contentPreview(record) || '-' }}</p>
            </td>

            <td class="w-28 whitespace-nowrap px-6 py-4 text-sm">
              <span
                class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium"
                :class="resolveStatusClass(record.status)"
              >
                {{ record.status_label || resolveStatusLabel(record.status) }}
              </span>
            </td>

            <td class="px-6 py-4 text-sm text-black">
              {{ formatTimestamp(record.created_at, 'datetime') }}
            </td>

            <td class="px-6 py-4 text-sm font-medium">
              <div class="flex items-center gap-2">
                <ActionButton
                  icon="eye"
                  tooltip="查看详情"
                  variant="view"
                  @click="openDetail(record)"
                />
                <ActionButton
                  icon="edit"
                  tooltip="重新编辑"
                  variant="edit"
                  @click="handleReedit(record)"
                />
              </div>
            </td>
          </tr>

          <tr v-if="!loading && records.length === 0">
            <td colspan="7" class="px-6 py-12 text-center text-black">暂无发件记录</td>
          </tr>
        </template>
      </AdminDataTable>
    </div>

    <BaseModal
      v-model="showDetailModal"
      title="发件详情"
      size="xl"
      :show-footer="false"
    >
      <div class="h-[72vh] min-h-0">
        <OutboxDetailPanel
          :record="selectedRecord"
        />
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import OutboxDetailPanel from '@/components/Mail/OutboxDetailPanel.vue'
import { smtpAccountsAPI } from '@/api/smtpAccounts'
import { formatTimestamp } from '@/utils/timeUtils'
import type { SentEmailRecord } from '@/components/Mail/OutboxListPanel.vue'

const router = useRouter()
const DRAFT_STORAGE_KEY = 'external-bulk-send-draft'

const loading = ref(false)
const records = ref<SentEmailRecord[]>([])
const selectedRecord = ref<SentEmailRecord | null>(null)
const showDetailModal = ref(false)

const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const queryForm = reactive({
  from_email: '',
  to_email: '',
  subject: '',
  content: ''
})

const pagination = computed(() => ({
  page: page.value,
  currentPage: page.value,
  page_size: pageSize.value,
  pageSize: pageSize.value,
  total: total.value,
  total_pages: Math.max(1, Math.ceil(total.value / pageSize.value)),
  totalPages: Math.max(1, Math.ceil(total.value / pageSize.value))
}))

const loadRecords = async () => {
  loading.value = true
  try {
    const response = await smtpAccountsAPI.getSentEmails({
      page: page.value,
      page_size: pageSize.value,
      from_email: queryForm.from_email.trim(),
      to_email: queryForm.to_email.trim(),
      subject: queryForm.subject.trim(),
      content: queryForm.content.trim()
    })

    if (response?.code === 0) {
      records.value = response.data?.records || []
      total.value = response.data?.pagination?.total || 0
    }
  } catch {
    records.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  loadRecords()
}

const handlePageChange = (nextPage: number) => {
  page.value = nextPage
  loadRecords()
}

const handlePageSizeChange = (nextPageSize: number) => {
  pageSize.value = nextPageSize
  page.value = 1
  loadRecords()
}

const openDetail = (record: SentEmailRecord) => {
  selectedRecord.value = record
  showDetailModal.value = true
}

const handleReedit = async (record: SentEmailRecord) => {
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(record))
  await router.push('/user/external-bulk-send')
}

const contentPreview = (record: SentEmailRecord) => {
  const text = record.content_text || record.content_html || ''
  return String(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

const resolveStatusClass = (status?: string) => {
  if (status === 'failed') return 'bg-rose-50 text-rose-700'
  if (status === 'bounced') return 'bg-rose-50 text-rose-700'
  return 'bg-primary-50 text-primary-700'
}

const resolveStatusLabel = (status?: string) => {
  if (status === 'failed') return '发送失败'
  if (status === 'bounced') return '已退信'
  return '已发送'
}

onMounted(loadRecords)
</script>
