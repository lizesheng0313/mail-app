<template>
  <div class="flex h-full min-h-0 flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 class="text-base font-semibold text-slate-900">邮箱代理</h2>
        <p class="mt-1 text-sm text-slate-500">统一配置邮箱代理和绑定关系。</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700"
          @click="openCreateModal"
        >
          新增代理
        </button>

        <BaseInput
          v-model="searchKeyword"
          placeholder="搜索代理名称或地址"
          size="sm"
        >
          <template #left-icon>
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </template>
        </BaseInput>

        <button
          type="button"
          class="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700"
          @click="reloadPage"
        >
          查询
        </button>
      </div>
    </div>

    <div class="min-h-0 flex-1">
      <AdminDataTable :loading="loading" :column-count="6">
        <template #thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-black">代理名称</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black">代理地址</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black">来源</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black">已绑定邮箱</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black">操作</th>
          </tr>
        </template>

        <template #tbody>
          <tr v-for="proxy in filteredProxyRows" :key="proxy.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm text-black">
              <span class="font-medium">{{ proxy.name }}</span>
            </td>

            <td class="px-6 py-4 text-sm text-black">
              <p>{{ proxy.endpoint || '-' }}</p>
            </td>

            <td class="px-6 py-4 text-sm text-black">
              <span class="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                {{ proxy.api_url ? 'API 提取' : '固定代理' }}
              </span>
            </td>

            <td class="px-6 py-4 text-sm text-black">
              <template v-if="proxy.boundCount > 0">
                <p class="font-medium">{{ proxy.boundCount }}</p>
                <p class="mt-1 text-xs text-gray-500">{{ proxy.boundPreview }}</p>
              </template>
              <span v-else class="text-sm text-slate-500">未绑定</span>
            </td>

            <td class="px-6 py-4 text-sm text-black">
              <span
                class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                :class="proxy.is_enabled ? 'bg-primary-100 text-primary-700' : 'bg-red-100 text-red-700'"
              >
                {{ proxy.is_enabled ? '已启用' : '已停用' }}
              </span>
            </td>

            <td class="px-6 py-4 text-sm font-medium">
              <div class="flex items-center gap-2">
                <ActionButton
                  icon="settings"
                  tooltip="绑定邮箱"
                  variant="primary"
                  @click="openBindModal(proxy)"
                />
                <ActionButton
                  v-if="proxy.is_owner"
                  icon="edit"
                  tooltip="修改代理"
                  variant="edit"
                  @click="openEditModal(proxy)"
                />
                <ActionButton
                  v-if="proxy.is_owner"
                  :icon="proxy.is_enabled ? 'disable' : 'enable'"
                  :tooltip="proxy.is_enabled ? '停用代理' : '启用代理'"
                  :variant="proxy.is_enabled ? 'disable' : 'enable'"
                  @click="handleToggleProxyStatus(proxy)"
                />
                <ActionButton
                  v-if="proxy.is_owner"
                  icon="delete"
                  tooltip="删除代理"
                  variant="delete"
                  @click="handleDeleteProxy(proxy)"
                />
              </div>
            </td>
          </tr>

          <tr v-if="!loading && filteredProxyRows.length === 0">
            <td colspan="6" class="px-6 py-12 text-center text-black">暂无可用代理</td>
          </tr>
        </template>
      </AdminDataTable>
    </div>

    <BaseModal
      v-model="showCreateModal"
      :title="isEditingProxy ? '修改代理' : '新增代理'"
      size="md"
      :confirm-text="isEditingProxy ? '保存修改' : '保存代理'"
      :confirm-loading="savingCreate"
      @confirm="handleCreateProxy"
    >
      <div class="space-y-4">
        <BaseInput
          v-model="createForm.name"
          label="代理名称"
          placeholder="输入代理名称"
        />

        <div>
          <label class="mb-1 block text-sm font-medium text-black">代理来源</label>
          <CustomSelect
            v-model="createForm.source_type"
            :options="proxySourceOptions"
            placeholder="请选择代理来源"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-black">代理类型</label>
          <CustomSelect
            v-model="createForm.proxy_type"
            :options="proxyTypeOptions"
            placeholder="请选择代理类型"
          />
        </div>

        <BaseInput
          v-if="createForm.source_type === 'api'"
          v-model="createForm.api_url"
          label="代理接口地址"
          placeholder="例如 https://example.com/get-proxy"
        />

        <div v-else class="grid gap-4 sm:grid-cols-2">
          <BaseInput
            v-model="createForm.host"
            label="代理主机"
            placeholder="输入代理 IP 或域名"
          />
          <BaseInput
            v-model="createForm.port"
            type="number"
            label="代理端口"
            placeholder="输入端口"
            :min="1"
            :max="65535"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <BaseInput
            v-model="createForm.username"
            label="代理账号"
            placeholder="没有可不填"
          />
          <BaseInput
            v-model="createForm.password"
            type="password"
            label="代理密码"
            placeholder="没有可不填"
          />
        </div>

      </div>
    </BaseModal>

    <BaseModal
      v-model="showBindModal"
      title="绑定邮箱"
      size="lg"
      confirm-text="保存绑定"
      :confirm-loading="savingBind"
      @confirm="handleSaveBinding"
    >
      <div v-if="activeProxy" class="space-y-4">
        <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div class="flex items-center gap-2">
            <p class="text-sm font-medium text-slate-900">{{ activeProxy.name }}</p>
            <span class="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
              {{ formatProxyType(activeProxy.proxy_type) }}
            </span>
          </div>
          <p class="mt-1 text-xs text-slate-500">{{ activeProxy.endpoint || '暂无地址' }}</p>
        </div>

        <BaseInput
          v-model="bindSearchKeyword"
          placeholder="搜索邮箱"
          size="sm"
        >
          <template #left-icon>
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </template>
        </BaseInput>

        <div class="flex items-center justify-between text-sm text-slate-500">
          <span>已选择 {{ bindSelectedIds.length }} 个邮箱</span>
          <button
            type="button"
            class="font-medium text-primary-700 transition hover:text-primary-800"
            @click="toggleBindSelectAll"
          >
            {{ bindAllSelected ? '取消全选' : '全选当前列表' }}
          </button>
        </div>

        <div class="max-h-[420px] overflow-y-auto rounded-xl border border-slate-200">
          <div v-if="filteredBindMailboxRows.length === 0" class="px-4 py-12 text-center text-sm text-slate-500">
            暂无邮箱
          </div>
          <label
            v-for="item in filteredBindMailboxRows"
            :key="item.id"
            class="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"
          >
            <input
              :checked="bindSelectedIds.includes(item.id)"
              type="checkbox"
              class="mailbox-checkbox mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer"
              @change="toggleBindSelection(item.id)"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-slate-900">{{ item.email }}</p>
              <p class="mt-1 text-xs text-slate-500">
                {{ item.oauth_provider || item.provider || '-' }} · {{ formatMailboxBindStatus(item) }}
              </p>
            </div>
          </label>
        </div>
      </div>
    </BaseModal>

    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      title="确认删除"
      :message="`确定删除代理“${proxyToDelete?.name || ''}”吗？已绑定邮箱会改成未绑定状态。`"
      type="danger"
      confirm-text="删除"
      :loading="deleting"
      loading-text="删除中"
      @confirm="confirmDeleteProxy"
      @cancel="cancelDeleteProxy"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import mailboxProxyApi from '@/api/mailboxProxy'
import { showMessage } from '@/utils/message'

const loading = ref(false)
const savingCreate = ref(false)
const savingBind = ref(false)
const deleting = ref(false)
const searchKeyword = ref('')
const bindSearchKeyword = ref('')

const settings = ref({
  enabled: true,
  fallback_to_direct: true,
  default_proxy_id: null
})

const proxyOptionsRaw = ref([])
const mailboxRows = ref([])

const showBindModal = ref(false)
const showCreateModal = ref(false)
const showDeleteConfirm = ref(false)
const activeProxy = ref(null)
const editingProxy = ref(null)
const proxyToDelete = ref(null)
const bindSelectedIds = ref([])
const createForm = ref({
  name: '',
  source_type: 'fixed',
  proxy_type: 'auto',
  api_url: '',
  host: '',
  port: '',
  username: '',
  password: '',
  is_enabled: true
})
const isEditingProxy = computed(() => Boolean(editingProxy.value))

const proxyTypeOptions = [
  { label: '自动识别', value: 'auto' },
  { label: 'HTTP', value: 'http' },
  { label: 'SOCKS5', value: 'socks5' }
]

const proxySourceOptions = [
  { label: '固定代理', value: 'fixed' },
  { label: 'API 提取', value: 'api' }
]

const filteredProxyRows = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  const rows = proxyOptionsRaw.value.map((proxy) => {
    const boundMailboxes = mailboxRows.value.filter(
      (item) => item.proxy_mode === 'direct' && item.proxy_id === proxy.id
    )

    return {
      ...proxy,
      boundCount: boundMailboxes.length,
      boundPreview: boundMailboxes.slice(0, 2).map((item) => item.email).join('、')
    }
  })

  if (!keyword) return rows

  return rows.filter((item) => {
    const haystack = [
      item.name,
      item.endpoint,
      formatProxyType(item.proxy_type)
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(keyword)
  })
})

const filteredBindMailboxRows = computed(() => {
  const keyword = bindSearchKeyword.value.trim().toLowerCase()
  if (!keyword) return mailboxRows.value
  return mailboxRows.value.filter((item) => String(item.email || '').toLowerCase().includes(keyword))
})

const bindAllSelected = computed(() => {
  return (
    filteredBindMailboxRows.value.length > 0 &&
    filteredBindMailboxRows.value.every((item) => bindSelectedIds.value.includes(item.id))
  )
})

const loadOptions = async () => {
  const response = await mailboxProxyApi.getOptions()
  const data = response.data || {}
  settings.value = {
    enabled: Boolean(data.settings?.enabled),
    fallback_to_direct: data.settings?.fallback_to_direct !== false,
    default_proxy_id: data.settings?.default_proxy_id ?? null
  }
  proxyOptionsRaw.value = Array.isArray(data.proxies) ? data.proxies : []
}

const loadMailboxes = async () => {
  const response = await mailboxProxyApi.getMailboxes({
    page: 1,
    page_size: 100,
    search: ''
  })
  mailboxRows.value = response.data?.items || []
}

const reloadPage = async () => {
  try {
    loading.value = true
    await Promise.all([loadOptions(), loadMailboxes()])
  } finally {
    loading.value = false
  }
}

const formatMailboxBindStatus = (item) => {
  const mode = String(item.proxy_mode || 'inherit').toLowerCase()
  if (mode === 'direct') {
    if (activeProxy.value && item.proxy_id === activeProxy.value.id) return '当前已绑定'
    return '已绑其他代理'
  }
  if (mode === 'disabled') return '禁用代理'
  return '未绑定'
}

const formatProxyType = (value) => {
  if (value === 'socks5') return 'SOCKS5'
  if (value === 'http') return 'HTTP'
  return '自动识别'
}

const splitEndpoint = (endpoint) => {
  const text = String(endpoint || '').trim()
  if (!text) return { host: '', port: '' }
  const splitIndex = text.lastIndexOf(':')
  if (splitIndex <= 0) return { host: text, port: '' }
  return {
    host: text.slice(0, splitIndex),
    port: text.slice(splitIndex + 1)
  }
}

const openBindModal = (proxy) => {
  activeProxy.value = proxy
  bindSearchKeyword.value = ''
  bindSelectedIds.value = mailboxRows.value
    .filter((item) => item.proxy_mode === 'direct' && item.proxy_id === proxy.id)
    .map((item) => item.id)
  showBindModal.value = true
}

const resetCreateForm = () => {
  createForm.value = {
    name: '',
    source_type: 'fixed',
    proxy_type: 'auto',
    api_url: '',
    host: '',
    port: '',
    username: '',
    password: '',
    is_enabled: true
  }
}

const openCreateModal = () => {
  editingProxy.value = null
  resetCreateForm()
  showCreateModal.value = true
}

const openEditModal = (proxy) => {
  editingProxy.value = proxy
  const endpoint = splitEndpoint(proxy.endpoint)
  createForm.value = {
    name: proxy.name || '',
    source_type: proxy.api_url ? 'api' : 'fixed',
    proxy_type: proxy.proxy_type || 'auto',
    api_url: proxy.api_url || '',
    host: endpoint.host,
    port: endpoint.port,
    username: '',
    password: '',
    is_enabled: proxy.is_enabled !== false
  }
  showCreateModal.value = true
}

const toggleBindSelection = (mailboxId) => {
  if (bindSelectedIds.value.includes(mailboxId)) {
    bindSelectedIds.value = bindSelectedIds.value.filter((id) => id !== mailboxId)
    return
  }
  bindSelectedIds.value = [...bindSelectedIds.value, mailboxId]
}

const toggleBindSelectAll = () => {
  if (bindAllSelected.value) {
    const pageIds = filteredBindMailboxRows.value.map((item) => item.id)
    bindSelectedIds.value = bindSelectedIds.value.filter((id) => !pageIds.includes(id))
    return
  }

  const merged = new Set(bindSelectedIds.value)
  filteredBindMailboxRows.value.forEach((item) => merged.add(item.id))
  bindSelectedIds.value = Array.from(merged)
}

const handleSaveBinding = async () => {
  if (!activeProxy.value) return

  const currentBoundIds = mailboxRows.value
    .filter((item) => item.proxy_mode === 'direct' && item.proxy_id === activeProxy.value.id)
    .map((item) => item.id)

  const nextIds = bindSelectedIds.value
  const toBind = nextIds.filter((id) => !currentBoundIds.includes(id))
  const toUnbind = currentBoundIds.filter((id) => !nextIds.includes(id))

  try {
    savingBind.value = true

    if (toBind.length > 0) {
      await mailboxProxyApi.saveBatchMailboxOverride({
        mailbox_ids: toBind,
        proxy_mode: 'direct',
        proxy_id: activeProxy.value.id
      })
    }

    if (toUnbind.length > 0) {
      await mailboxProxyApi.saveBatchMailboxOverride({
        mailbox_ids: toUnbind,
        proxy_mode: 'inherit',
        proxy_id: null
      })
    }

    await mailboxProxyApi.saveSettings({
      enabled: settings.value.enabled,
      fallback_to_direct: true,
      default_proxy_id: null
    })

    showMessage('邮箱绑定已保存', 'success')
    showBindModal.value = false
    await reloadPage()
  } finally {
    savingBind.value = false
  }
}

const handleCreateProxy = async () => {
  try {
    savingCreate.value = true
    const payload = {
      name: createForm.value.name,
      source_type: createForm.value.source_type,
      proxy_type: createForm.value.proxy_type,
      api_url: createForm.value.source_type === 'api' ? createForm.value.api_url : '',
      host: createForm.value.source_type === 'fixed' ? createForm.value.host : '',
      port: createForm.value.source_type === 'fixed' && createForm.value.port !== ''
        ? Number(createForm.value.port)
        : null,
      username: createForm.value.username,
      password: createForm.value.password,
      is_enabled: createForm.value.is_enabled
    }
    const response = editingProxy.value
      ? await mailboxProxyApi.updateProxy(editingProxy.value.id, payload)
      : await mailboxProxyApi.createProxy(payload)

    if (response.code !== 0) return

    showMessage(response.message, 'success')
    showCreateModal.value = false
    editingProxy.value = null
    await reloadPage()
  } finally {
    savingCreate.value = false
  }
}

const handleDeleteProxy = (proxy) => {
  proxyToDelete.value = proxy
  showDeleteConfirm.value = true
}

const cancelDeleteProxy = () => {
  showDeleteConfirm.value = false
  proxyToDelete.value = null
}

const confirmDeleteProxy = async () => {
  if (!proxyToDelete.value?.id) return

  deleting.value = true
  const response = await mailboxProxyApi.deleteProxy(proxyToDelete.value.id)
  deleting.value = false
  if (response.code !== 0) return

  cancelDeleteProxy()
  showMessage(response.message, 'success')
  await reloadPage()
}

const handleToggleProxyStatus = async (proxy) => {
  const nextEnabled = !proxy.is_enabled
  const endpoint = splitEndpoint(proxy.endpoint)
  const response = await mailboxProxyApi.updateProxy(proxy.id, {
    name: proxy.name,
    source_type: proxy.api_url ? 'api' : 'fixed',
    proxy_type: proxy.proxy_type || 'auto',
    api_url: proxy.api_url || '',
    host: proxy.api_url ? '' : endpoint.host,
    port: proxy.api_url ? null : (endpoint.port ? Number(endpoint.port) : null),
    username: '',
    password: '',
    is_enabled: nextEnabled
  })
  if (response.code !== 0) return

  showMessage(response.message, 'success')
  await reloadPage()
}

onMounted(async () => {
  await reloadPage()
})
</script>

<style scoped>
.mailbox-checkbox {
  appearance: none;
  -webkit-appearance: none;
  border: 2px solid #d1d5db;
  border-radius: 3px;
  background-color: white;
  position: relative;
}

.mailbox-checkbox:checked {
  background-color: rgb(var(--color-primary-500));
  border-color: rgb(var(--color-primary-500));
}

.mailbox-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
</style>
