<template>
  <div class="space-y-6">
    <section v-if="section === 'api-keys'" class="space-y-6">
      <div
        v-if="!userStore.isAuthenticated"
        class="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-800"
      >
        登录后才能创建和查看访问密钥。
      </div>

      <template v-else>
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-4">
              <BaseInput
                v-model="filters.keyword"
                placeholder="搜索密钥名称..."
                class="w-64"
                size="sm"
                @enter="applyFilters"
              >
                <template #left-icon>
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </template>
              </BaseInput>

              <CustomSelect
                v-model="filters.status"
                :options="statusOptions"
                placeholder="全部状态"
                class="w-40"
              />

              <button
                @click="applyFilters"
                class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
              >
                查询
              </button>
            </div>

            <button
              @click="openCreateKeyModal"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
            >
              新建访问密钥
            </button>
          </div>
        </div>

        <AdminDataTable
          title="访问密钥列表"
          :pagination="pagination"
          :loading="keysLoading"
          :show-page-size-selector="true"
          :column-count="7"
          @page-change="changePage"
          @page-size-change="changePageSize"
        >
          <template #thead>
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">名称</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">密钥前缀</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">权限范围</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">状态</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">最近使用</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">过期时间</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">操作</th>
            </tr>
          </template>

          <template #tbody>
            <tr v-for="item in pagedApiKeys" :key="item.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div class="max-w-xs">
                  <div class="text-sm font-medium text-black break-words">{{ item.name }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-primary-700">
                {{ item.key_preview || '-' }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">
                <div class="max-w-sm break-words">
                  {{ getScopeSummary(item) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getApiKeyStatusClass(item.status)" class="px-2 py-1 text-xs font-medium rounded-full">
                  {{ getApiKeyStatusLabel(item.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {{ formatTime(item.last_used_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {{ formatTime(item.expires_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="flex items-center space-x-2">
                  <ActionButton
                    icon="delete"
                    tooltip="删除"
                    variant="delete"
                    @click="openDeleteDialog(item)"
                  />
                </div>
              </td>
            </tr>

            <tr v-if="pagedApiKeys.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-black">
                暂无访问密钥
              </td>
            </tr>
          </template>
        </AdminDataTable>
      </template>
    </section>

    <BaseModal
      v-model="showCreateKeyFormModal"
      title="新建访问密钥"
      :confirm-text="submittingKey ? '生成中...' : '生成访问密钥'"
      :confirm-loading="submittingKey"
      :confirm-disabled="submittingKey"
      @confirm="createApiKey"
      @cancel="closeCreateKeyModal"
      @close="closeCreateKeyModal"
    >
      <div class="space-y-4">
        <div class="rounded-lg bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600">
          新密钥只会展示一次。生成后会弹出来让你复制，关掉以后就不再显示。
        </div>

        <BaseInput v-model="keyForm.name" label="密钥名称" placeholder="比如：官网接入、CRM 同步" />

        <BaseInput
          v-model="keyForm.expires_at_local"
          label="过期时间"
          type="date"
          :auto-show-picker="true"
          help-text="不填就是长期有效。"
        />

        <div>
          <div class="mb-3 flex items-center justify-between gap-3">
            <p class="text-sm font-medium text-gray-900">权限范围</p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                @click="selectRecommendedScopes"
              >
                推荐权限
              </button>
              <button
                type="button"
                class="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                @click="selectAllScopes"
              >
                全选
              </button>
            </div>
          </div>
          <p class="mb-3 text-xs text-gray-500">默认勾选推荐权限。需要删邮件时，记得勾上“删除邮件”。</p>
          <div class="grid grid-cols-1 gap-2">
            <label
              v-for="scope in availableScopes"
              :key="scope"
              class="flex items-center gap-3 rounded-lg border px-3 py-3 text-sm text-gray-700 transition-colors"
              :class="keyForm.scopes.includes(scope) ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'"
            >
              <input
                v-model="keyForm.scopes"
                :value="scope"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-green-600 accent-green-600 focus:ring-green-500"
              />
              <span class="flex-1">{{ getScopeLabel(scope) }}</span>
              <span
                v-if="recommendedScopes.includes(scope)"
                class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500"
              >
                推荐
              </span>
            </label>
          </div>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      v-model="showApiKeyModal"
      title="请立即保存访问密钥"
      :show-footer="false"
      :show-close="false"
      :close-on-click-outside="false"
      size="md"
      @close="closeCreatedKeyModal"
    >
      <div class="space-y-4">
        <div class="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm leading-6 text-yellow-800">
          这把密钥只会展示这一次。复制后页面会自动清掉，请你自己妥善保存。
        </div>

        <div class="rounded-lg bg-gray-900 px-4 py-4 font-mono text-sm break-all text-white">
          {{ createdApiKey }}
        </div>

        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            @click="closeCreatedKeyModal"
          >
            我已保存
          </button>
          <button
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
            @click="copyCreatedKey"
          >
            复制并关闭
          </button>
        </div>
      </div>
    </BaseModal>

    <ConfirmDialog
      :visible="showDeleteConfirm"
      title="删除访问密钥"
      :message="deleteConfirmMessage"
      type="danger"
      confirm-text="删除"
      :loading="deletingKey"
      @confirm="confirmDeleteApiKey"
      @cancel="closeDeleteDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import openPlatformApi from '@/services/openPlatformApi'
import { useUserStore } from '@/stores/user'
import { showMessage } from '@/utils/message'

type ApiKeyItem = {
  id: number
  name: string
  key_preview: string
  scopes: string[]
  scope_labels?: string[]
  status: string
  created_at: number
  last_used_at?: number
  expires_at?: number
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const keysLoading = ref(false)
const submittingKey = ref(false)
const showCreateKeyFormModal = ref(false)
const apiKeys = ref<ApiKeyItem[]>([])
const createdApiKey = ref('')
const showApiKeyModal = ref(false)
const showDeleteConfirm = ref(false)
const deletingKey = ref(false)
const pendingDeleteKey = ref<ApiKeyItem | null>(null)
const page = ref(1)
const pageSize = ref(20)

const filters = reactive({
  keyword: '',
  status: ''
})

const appliedFilters = reactive({
  keyword: '',
  status: ''
})

const keyForm = reactive({
  name: '',
  scopes: [] as string[],
  expires_at_local: ''
})

const fallbackAvailableScopes = [
  'mailbox.read',
  'mailbox.write',
  'external_mailbox.read',
  'external_mailbox.write',
  'smtp_account.read',
  'email.read',
  'email.delete',
  'email.body.read',
  'verification_code.read',
  'workflow.execute'
]

const section = computed(() => {
  const current = String(route.params.section || 'api-keys')
  return current === 'api-keys' ? current : 'api-keys'
})

const fallbackRecommendedScopes = [
  'mailbox.read',
  'mailbox.write',
  'external_mailbox.read',
  'external_mailbox.write',
  'smtp_account.read',
  'email.read',
  'email.body.read',
  'verification_code.read',
  'workflow.execute'
]

const availableScopes = ref<string[]>([...fallbackAvailableScopes])
const recommendedScopes = ref<string[]>([...fallbackRecommendedScopes])

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '生效中', value: 'active' },
  { label: '已失效', value: 'invalid' }
]

const scopeLabelMap: Record<string, string> = {
  'mailbox.read': '读取临时邮箱或域名邮箱',
  'mailbox.write': '管理临时邮箱或域名邮箱',
  'external_mailbox.read': '读取第三方邮箱',
  'external_mailbox.write': '管理第三方邮箱',
  'smtp_account.read': '读取发信账号',
  'email.read': '读取邮件列表',
  'email.body.read': '读取邮件正文',
  'email.delete': '删除邮件',
  'verification_code.read': '读取验证码',
  'workflow.execute': '执行工作流'
}

const filteredApiKeys = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()

  return apiKeys.value.filter((item) => {
    const matchesKeyword = !keyword
      || item.name?.toLowerCase().includes(keyword)
      || item.key_preview?.toLowerCase().includes(keyword)

    const matchesStatus = !appliedFilters.status
      || (appliedFilters.status === 'active' && isApiKeyActive(item.status))
      || (appliedFilters.status === 'invalid' && !isApiKeyActive(item.status))

    return matchesKeyword && matchesStatus
  })
})

const pagedApiKeys = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredApiKeys.value.slice(start, start + pageSize.value)
})

const pagination = computed(() => ({
  page: page.value,
  total: filteredApiKeys.value.length,
  total_pages: Math.max(1, Math.ceil(filteredApiKeys.value.length / pageSize.value)),
  page_size: pageSize.value
}))

const deleteConfirmMessage = computed(() => {
  if (!pendingDeleteKey.value) {
    return '删除后这把访问密钥会从列表移除，并且不能继续使用，确定继续吗？'
  }
  return `确定删除访问密钥【${pendingDeleteKey.value.name}】吗？删除后就不能继续使用了。`
})

const getScopeLabel = (scope: string) => scopeLabelMap[scope] || scope

const getScopeSummary = (item: ApiKeyItem) => {
  const scopes = (item.scopes || []).filter((scope) => scope !== 'ai.chat')
  const labels = item.scope_labels?.length
    ? item.scope_labels.filter((_, index) => (item.scopes || [])[index] !== 'ai.chat')
    : scopes.map(getScopeLabel)

  if (labels.length === 0) return '-'
  if (labels.length <= 2) return labels.join('、')
  return `${labels.slice(0, 2).join('、')} 等 ${labels.length} 项`
}

const getApiKeyStatusLabel = (value?: string) => {
  return isApiKeyActive(value) ? '启用中' : '已失效'
}

const getApiKeyStatusClass = (value?: string) => {
  return isApiKeyActive(value)
    ? 'bg-primary-100 text-success-800'
    : 'bg-gray-100 text-gray-600'
}

const isApiKeyActive = (value?: string) => value === 'active'

const ensureValidSection = () => {
  const current = String(route.params.section || '')
  if (current !== 'api-keys') {
    router.replace('/user/developer/api-keys')
  }
}

const syncPage = () => {
  const maxPage = Math.max(1, Math.ceil(filteredApiKeys.value.length / pageSize.value))
  if (page.value > maxPage) {
    page.value = maxPage
  }
}

const applyFilters = () => {
  appliedFilters.keyword = filters.keyword
  appliedFilters.status = filters.status
  page.value = 1
  syncPage()
}

const changePage = (nextPage: number) => {
  page.value = nextPage
  syncPage()
}

const changePageSize = (nextPageSize: number) => {
  pageSize.value = nextPageSize
  page.value = 1
  syncPage()
}

const toTimestamp = (value: string) => {
  const content = value.trim()
  if (!content) return undefined

  if (/^\d{4}-\d{2}-\d{2}$/.test(content)) {
    const localDate = new Date(`${content}T23:59:59`)
    const timestamp = localDate.getTime()
    return Number.isFinite(timestamp) ? timestamp : null
  }

  const normalized = content.replace('T', ' ')
  const matched = normalized.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/)
  if (!matched) return null
  const [, year, month, day, hour, minute] = matched
  const timestamp = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0
  ).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

const formatTime = (value?: number) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

const loadApiKeys = async () => {
  if (!userStore.isAuthenticated) {
    apiKeys.value = []
    return
  }

  keysLoading.value = true
  try {
    const response: any = await openPlatformApi.get('/api-keys')
    if (response.code === 0) {
      apiKeys.value = (response.data.items || []).slice().sort((a: ApiKeyItem, b: ApiKeyItem) => (b.created_at || 0) - (a.created_at || 0))
      syncPage()
    }
  } finally {
    keysLoading.value = false
  }
}

const loadScopeOptions = async () => {
  const response: any = await openPlatformApi.get('/meta', { suppressErrorMessage: true } as any)
  if (response.code !== 0) return

  availableScopes.value = Array.isArray(response.data?.available_scopes) && response.data.available_scopes.length
    ? response.data.available_scopes.filter((scope: string) => scope !== 'ai.chat')
    : [...fallbackAvailableScopes]

  recommendedScopes.value = Array.isArray(response.data?.recommended_scopes) && response.data.recommended_scopes.length
    ? response.data.recommended_scopes.filter((scope: string) => scope !== 'ai.chat')
    : [...fallbackRecommendedScopes]
}

const resetKeyForm = () => {
  keyForm.name = ''
  keyForm.scopes = [...recommendedScopes.value]
  keyForm.expires_at_local = ''
}

const selectRecommendedScopes = () => {
  keyForm.scopes = [...recommendedScopes.value]
}

const selectAllScopes = () => {
  keyForm.scopes = [...availableScopes.value]
}

const openCreateKeyModal = () => {
  resetKeyForm()
  showCreateKeyFormModal.value = true
}

const closeCreateKeyModal = () => {
  showCreateKeyFormModal.value = false
  resetKeyForm()
}

const createApiKey = async () => {
  if (!keyForm.name.trim()) {
    showMessage('先填密钥名称', 'warning')
    return
  }
  if (keyForm.scopes.length === 0) {
    showMessage('至少勾一个权限', 'warning')
    return
  }
  const expiresAtMs = toTimestamp(keyForm.expires_at_local)
  if (expiresAtMs === null) {
    showMessage('过期时间格式不对，请重新选择', 'warning')
    return
  }

  submittingKey.value = true
  try {
    const response: any = await openPlatformApi.post('/api-keys', {
      name: keyForm.name.trim(),
      scopes: keyForm.scopes,
      key_type: 'live',
      expires_at_ms: expiresAtMs
    })
    if (response.code === 0) {
      createdApiKey.value = response.data.api_key || ''
      showCreateKeyFormModal.value = false
      showApiKeyModal.value = true
      resetKeyForm()
      await loadApiKeys()
    }
  } finally {
    submittingKey.value = false
  }
}

const openDeleteDialog = (item: ApiKeyItem) => {
  pendingDeleteKey.value = item
  showDeleteConfirm.value = true
}

const closeDeleteDialog = () => {
  if (deletingKey.value) return
  showDeleteConfirm.value = false
  pendingDeleteKey.value = null
}

const confirmDeleteApiKey = async () => {
  if (!pendingDeleteKey.value) return

  let deleted = false
  deletingKey.value = true
  try {
    const response: any = await openPlatformApi.delete(`/api-keys/${pendingDeleteKey.value.id}`)
    if (response.code === 0) {
      deleted = true
      await loadApiKeys()
    }
  } finally {
    deletingKey.value = false
    if (deleted) {
      closeDeleteDialog()
    }
  }
}

const closeCreatedKeyModal = () => {
  showApiKeyModal.value = false
  createdApiKey.value = ''
}

const copyCreatedKey = async () => {
  if (!createdApiKey.value) return
  await navigator.clipboard.writeText(createdApiKey.value)
  closeCreatedKeyModal()
  showMessage('访问密钥已复制，请妥善保管', 'success')
}

const loadSectionData = async () => {
  await Promise.all([loadScopeOptions(), loadApiKeys()])
}

watch(
  () => route.params.section,
  async () => {
    ensureValidSection()
    if (userStore.isAuthenticated) {
      await loadSectionData()
    }
  },
  { immediate: true }
)

watch(
  () => userStore.isAuthenticated,
  async (value) => {
    if (!value) {
      apiKeys.value = []
      showCreateKeyFormModal.value = false
      createdApiKey.value = ''
      closeDeleteDialog()
      return
    }
    await loadSectionData()
  }
)
</script>
