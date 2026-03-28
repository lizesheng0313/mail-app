<template>
  <div class="space-y-6">
    <div class="bg-white rounded-lg shadow-sm border p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center space-x-4">
          <BaseInput
            v-model="searchQuery"
            placeholder="搜索域名..."
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

          <button
            @click="applyFilters"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
          >
            查询
          </button>
        </div>

        <button
          @click="openCreateModal"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
        >
          添加域名
        </button>
      </div>
    </div>

    <AdminDataTable
      title="域名列表"
      :loading="loading"
      :column-count="6"
    >
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">域名</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">描述</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">状态</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">创建时间</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">过期时间</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">操作</th>
        </tr>
      </template>

      <template #tbody>
        <tr v-for="domain in filteredDomains" :key="domain.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div v-if="isDomainDeleted(domain) || isDomainExpired(domain)" class="mr-2">
                <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div :class="isDomainDeleted(domain) || isDomainExpired(domain) ? 'text-red-600 line-through' : 'text-black'" class="text-sm font-medium">
                {{ domain.domain_name }}
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
            {{ domain.display_name || '-' }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex flex-col space-y-1">
              <span v-if="isDomainDeleted(domain)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit bg-red-100 text-red-800">
                已删除
              </span>
              <span v-else-if="String(domain.verification_status || '').toLowerCase() === 'verified'" :class="domain.is_active ? 'bg-primary-100 text-success-800' : 'bg-red-100 text-red-800'" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit">
                {{ domain.is_active ? '启用' : '禁用' }}
              </span>
              <span v-if="!isDomainDeleted(domain) && isDomainExpired(domain)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800 w-fit">
                已过期
              </span>
              <span
                v-else-if="!isDomainDeleted(domain) && String(domain.verification_status || '').toLowerCase() !== 'verified'"
                :class="getVerificationClass(domain.verification_status)"
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit"
              >
                {{ getVerificationLabel(domain.verification_status) }}
              </span>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
            {{ formatDate(domain.created_at) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <span v-if="domain.expires_at" :class="isDomainExpired(domain) ? 'text-red-600 font-medium' : 'text-black'">
              {{ formatDateOnly(domain.expires_at) }}
            </span>
            <span v-else class="text-black">-</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <div class="flex items-center space-x-2">
              <ActionButton
                icon="edit"
                tooltip="编辑"
                variant="edit"
                :disabled="isDomainDeleted(domain)"
                @click="openEditModal(domain)"
              />
              <ActionButton
                :icon="domain.is_active ? 'disable' : 'enable'"
                :tooltip="domain.is_active ? '禁用' : '启用'"
                :variant="domain.is_active ? 'disable' : 'enable'"
                v-if="!isDomainDeleted(domain) && String(domain.verification_status || '').toLowerCase() === 'verified'"
                @click="toggleDomain(domain)"
              />
              <ActionButton
                icon="eye"
                tooltip="详情"
                variant="view"
                v-if="String(domain.verification_status || '').toLowerCase() !== 'verified'"
                @click="openDetailModal(domain.id)"
              />
              <ActionButton
                icon="delete"
                tooltip="删除"
                variant="delete"
                @click="openDeleteDialog(domain)"
              />
            </div>
          </td>
        </tr>

        <tr v-if="!filteredDomains.length">
          <td colspan="6" class="px-6 py-12 text-center text-black">
            暂无域名数据
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <BaseModal
      v-model="showDomainModal"
      :title="domainModalDetail ? '域名详情' : '添加域名'"
      :show-close="Boolean(domainModalDetail)"
      :show-footer="!domainModalDetail"
      :show-confirm="!domainModalDetail"
      :show-cancel="!domainModalDetail"
      :confirm-text="creatingDomain ? '添加中...' : '添加域名'"
      :confirm-loading="creatingDomain"
      :confirm-disabled="creatingDomain || !createForm.domain_name.trim()"
      size="lg"
      @confirm="handleCreateDomain"
      @close="closeDomainModal"
      @cancel="closeDomainModal"
    >
      <div v-if="!domainModalDetail" class="space-y-4">
        <div class="rounded-lg bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600">
          输入域名后会立即生成需要配置的 DNS 记录。完成验证后，这个域名就可以在首页生成邮箱地址。
        </div>
        <BaseInput
          v-model="createForm.domain_name"
          label="域名"
          placeholder="example.com"
        />
        <BaseInput
          v-model="createForm.display_name"
          label="描述"
          placeholder="可选"
        />
        <BaseInput
          v-model="createForm.expires_at"
          label="过期时间"
          type="date"
          size="lg"
          auto-show-picker
        />
      </div>

      <div v-else class="space-y-6">
        <div
          v-if="domainModalNotice"
          :class="domainModalNotice.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'"
          class="rounded-lg border px-4 py-3 text-sm"
        >
          {{ domainModalNotice.text }}
        </div>

        <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="text-base font-semibold text-black">{{ domainModalDetail.domain.domain_name }}</div>
                <span :class="getVerificationClass(domainModalDetail.domain.verification_status)" class="px-2 py-1 text-xs font-medium rounded-full">
                  {{ getVerificationLabel(domainModalDetail.domain.verification_status) }}
                </span>
              </div>
            </div>
            <button
              v-if="String(domainModalDetail.domain.verification_status || '').toLowerCase() !== 'verified'"
              class="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm disabled:opacity-50"
              :disabled="refreshingDomainId === domainModalDetail.domain.id"
              @click="refreshDns(domainModalDetail.domain.id)"
            >
              <span v-if="refreshingDomainId === domainModalDetail.domain.id" class="inline-flex items-center gap-2">
                验证中
                <BaseIcon name="refresh" size="sm" class="animate-spin" />
              </span>
              <span v-else>立即验证DNS</span>
            </button>
          </div>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-black mb-3">DNS 配置</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th class="pb-3 pr-4 font-medium">主机记录</th>
                  <th class="pb-3 pr-4 font-medium">记录类型</th>
                  <th class="pb-3 pr-4 font-medium">值</th>
                  <th class="pb-3 pr-4 font-medium">优先级</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="record in domainModalDetail.dns_instructions || []" :key="record.id">
                  <td class="py-3 pr-4 align-top">
                    <div class="flex items-center gap-2">
                      <div class="max-w-[240px] break-all text-gray-700">{{ formatRecordHost(record) }}</div>
                      <ActionButton
                        icon="copy"
                        title="复制主机记录"
                        @click="copyText(formatRecordHost(record))"
                        tooltip="复制主机记录"
                        variant="copy"
                        size="sm"
                      />
                    </div>
                  </td>
                  <td class="py-3 pr-4 align-top text-black">{{ record.record_type }}</td>
                  <td class="py-3 pr-4 align-top">
                    <div class="flex items-center gap-2">
                      <div class="max-w-[420px] break-all text-gray-700">{{ record.record_value }}</div>
                      <ActionButton
                        icon="copy"
                        title="复制记录值"
                        @click="copyText(record.record_value)"
                        tooltip="复制记录值"
                        variant="copy"
                        size="sm"
                      />
                    </div>
                  </td>
                  <td class="py-3 pr-4 align-top text-gray-700">
                    {{ record.priority ?? '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      v-model="showEditModal"
      title="编辑域名"
      :show-close="true"
      :show-footer="true"
      :show-confirm="true"
      :show-cancel="true"
      confirm-text="保存"
      :confirm-loading="savingEdit"
      :confirm-disabled="savingEdit"
      size="md"
      @confirm="saveEditDomain"
      @close="closeEditModal"
      @cancel="closeEditModal"
    >
      <div class="space-y-4">
        <BaseInput
          v-model="editForm.domain_name"
          label="域名"
          disabled
        />
        <BaseInput
          v-model="editForm.display_name"
          label="描述"
          placeholder="可选"
        />
        <BaseInput
          v-model="editForm.expires_at"
          label="过期时间"
          type="date"
          size="lg"
          auto-show-picker
        />
      </div>
    </BaseModal>

    <ConfirmDialog
      :visible="showDeleteConfirm"
      :mask="false"
      title="删除域名"
      :message="`确定要删除域名【${domainToDelete?.domain_name || ''}】吗？`"
      :loading="deleting"
      @confirm="confirmDeleteDomain"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseIcon from '@/components/BaseIcon/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import { hostedDomainAPI } from '@/api/hostedDomain'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils.js'

const route = useRoute()

const loading = ref(false)
const deleting = ref(false)
const creatingDomain = ref(false)
const savingEdit = ref(false)
const refreshingDomainId = ref<number | null>(null)

const searchQuery = ref('')
const domains = ref<any[]>([])
const showDomainModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const domainToDelete = ref<any | null>(null)
const domainModalDetail = ref<any | null>(null)
const domainModalNotice = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const createForm = ref({
  domain_name: '',
  display_name: '',
  expires_at: ''
})

const editForm = ref({
  id: 0,
  domain_name: '',
  display_name: '',
  expires_at: ''
})

const filteredDomains = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return domains.value
  return domains.value.filter((item) => String(item.domain_name || '').toLowerCase().includes(keyword))
})

const getVerificationLabel = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'verified') return '已验证'
  if (normalized === 'failed') return '验证失败'
  return '待验证'
}

const getVerificationClass = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'verified') return 'bg-green-100 text-green-700'
  if (normalized === 'failed') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}

const getDomainNotice = (detail: any, created = false) => {
  if (String(detail?.domain?.verification_status || '').toLowerCase() === 'verified') {
    return null
  }
  const records = detail?.dns_instructions || []
  const badRecords = records.filter(
    (item: any) => !['valid', 'verified'].includes(String(item?.status || '').toLowerCase())
  )
  if (!badRecords.length) {
    return {
      type: 'success' as const,
      text: created ? '域名已创建成功，DNS 记录验证通过。' : 'DNS 记录验证通过。'
    }
  }
  return {
    type: 'error' as const,
    text: created ? '域名已创建成功，请先完成 DNS 配置。' : 'DNS 没验证通过。'
  }
}

const loadDomains = async () => {
  loading.value = true
  try {
    const response: any = await hostedDomainAPI.listDomains()
    if (response.code === 0 && response.data) {
      domains.value = response.data.items || []
    }
  } finally {
    loading.value = false
  }
}

const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value || '')
    showMessage('已复制', 'success')
  } catch {
    showMessage('复制失败', 'error')
  }
}

const formatRecordHost = (record: any) => {
  const value = String(record?.record_host || '').trim()
  return value || '@'
}

const openCreateModal = () => {
  showDomainModal.value = true
  domainModalDetail.value = null
  domainModalNotice.value = null
  createForm.value = { domain_name: '', display_name: '', expires_at: '' }
}

const closeDomainModal = () => {
  showDomainModal.value = false
  domainModalDetail.value = null
  domainModalNotice.value = null
  createForm.value = { domain_name: '', display_name: '', expires_at: '' }
}

const applyDomainDetailToModal = (detail: any, created = false) => {
  domainModalDetail.value = detail
  domainModalNotice.value = getDomainNotice(detail, created)
  showDomainModal.value = true
}

const handleCreateDomain = async () => {
  if (!createForm.value.domain_name.trim()) return

  creatingDomain.value = true
  try {
    const response: any = await hostedDomainAPI.createDomain({
      domain_name: createForm.value.domain_name.trim(),
      display_name: createForm.value.display_name.trim() || undefined,
      expires_at_ms: createForm.value.expires_at ? toEndOfDayMs(createForm.value.expires_at) : undefined
    })
    if (response.code === 0 && response.data) {
      applyDomainDetailToModal(response.data, true)
      showMessage('域名添加成功', 'success')
      await loadDomains()
    }
  } finally {
    creatingDomain.value = false
  }
}

const openEditModal = (domain: any) => {
  editForm.value = {
    id: Number(domain.id),
    domain_name: domain.domain_name || '',
    display_name: domain.display_name || '',
    expires_at: domain.expires_at ? toDateInputValue(domain.expires_at) : ''
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editForm.value = { id: 0, domain_name: '', display_name: '', expires_at: '' }
}

const saveEditDomain = async () => {
  if (!editForm.value.id) return
  savingEdit.value = true
  try {
    const response: any = await hostedDomainAPI.updateDomain(editForm.value.id, {
      display_name: editForm.value.display_name.trim() || null,
      expires_at_ms: editForm.value.expires_at ? toEndOfDayMs(editForm.value.expires_at) : null
    })
    if (response.code === 0) {
      showMessage('域名更新成功', 'success')
      closeEditModal()
      await loadDomains()
      if (domainModalDetail.value?.domain?.id === editForm.value.id) {
        await openDetailModal(editForm.value.id)
      }
    }
  } finally {
    savingEdit.value = false
  }
}

const toggleDomain = async (domain: any) => {
  loading.value = true
  try {
    const response: any = await hostedDomainAPI.updateDomain(domain.id, {
      is_active: !domain.is_active
    })
    if (response.code === 0) {
      showMessage(`域名已${domain.is_active ? '禁用' : '启用'}`, 'success')
      await loadDomains()
      if (domainModalDetail.value?.domain?.id === domain.id) {
        await openDetailModal(domain.id)
      }
    }
  } finally {
    loading.value = false
  }
}

const toEndOfDayMs = (dateValue: string) => new Date(`${dateValue}T23:59:59`).getTime()
const toDateInputValue = (timestamp: number | string) => new Date(Number(timestamp)).toISOString().slice(0, 10)
const formatDate = (timestamp: number | string) => formatTimestamp(timestamp)
const formatDateOnly = (timestamp: number | string) => formatTimestamp(timestamp, 'date')
const isDomainDeleted = (domain: any) => Boolean(domain?.is_deleted)
const isDomainExpired = (domain: any) => {
  const expiresAt = Number(domain?.expires_at || 0)
  return expiresAt > 0 && expiresAt < Date.now()
}

const openDetailModal = async (domainId: number) => {
  showDomainModal.value = true
  domainModalDetail.value = null
  domainModalNotice.value = null
  try {
    const response: any = await hostedDomainAPI.getDomainDetail(domainId)
    if (response.code === 0 && response.data) {
      applyDomainDetailToModal(response.data)
    }
  } catch {
    closeDomainModal()
  }
}

const refreshDns = async (domainId: number) => {
  refreshingDomainId.value = domainId
  domainModalNotice.value = null
  try {
    const response: any = await hostedDomainAPI.refreshDns(domainId)
    if (response.code === 0 && response.data) {
      applyDomainDetailToModal(response.data)
      await loadDomains()
    }
  } finally {
    refreshingDomainId.value = null
  }
}

const openDeleteDialog = (domain: any) => {
  domainToDelete.value = domain
  showDeleteConfirm.value = true
}

const confirmDeleteDomain = async () => {
  if (!domainToDelete.value?.id) return

  deleting.value = true
  try {
    const response: any = await hostedDomainAPI.deleteDomain(domainToDelete.value.id)
    if (response.code === 0) {
      showMessage('域名删除成功', 'success')
      showDeleteConfirm.value = false
      if (domainModalDetail.value?.domain?.id === domainToDelete.value.id) {
        closeDomainModal()
      }
      domainToDelete.value = null
      await loadDomains()
    }
  } finally {
    deleting.value = false
  }
}

const applyFilters = () => {
  // 当前仅前端筛选，保留这个方法让交互和其它列表一致
}

watch(
  () => route.query.domainId,
  async (value) => {
    const domainId = Number(value || 0)
    if (domainId > 0) {
      await openDetailModal(domainId)
    }
  }
)

onMounted(async () => {
  await loadDomains()
  const domainId = Number(route.query.domainId || 0)
  if (domainId > 0) {
    await openDetailModal(domainId)
  }
})
</script>
