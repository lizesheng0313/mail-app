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
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">所有权</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">收件状态</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">邮箱数</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">更新时间</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">操作</th>
        </tr>
      </template>

      <template #tbody>
        <tr v-for="domain in filteredDomains" :key="domain.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-black">{{ domain.domain_name }}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span :class="getVerificationClass(domain.verification_status)" class="px-2 py-1 text-xs font-medium rounded-full">
              {{ getVerificationLabel(domain.verification_status) }}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span :class="getInboundClass(domain.inbound_status)" class="px-2 py-1 text-xs font-medium rounded-full">
              {{ getInboundLabel(domain.inbound_status) }}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {{ domain.mailbox_count || 0 }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {{ formatTimestamp(domain.updated_at) || '-' }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <div class="flex items-center space-x-2">
              <ActionButton
                icon="eye"
                tooltip="详情"
                variant="view"
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
      v-model="showCreateModal"
      :title="createdDomainDetail ? 'DNS 配置' : '添加域名'"
      :show-confirm="!createdDomainDetail"
      :show-cancel="true"
      :cancel-text="createdDomainDetail ? '关闭' : '取消'"
      :confirm-text="creatingDomain ? '添加中...' : '添加域名'"
      :confirm-loading="creatingDomain"
      :confirm-disabled="creatingDomain || !createForm.domain_name.trim()"
      size="lg"
      @confirm="handleCreateDomain"
      @close="closeCreateModal"
      @cancel="closeCreateModal"
    >
      <div v-if="!createdDomainDetail" class="space-y-4">
        <div class="rounded-lg bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600">
          输入域名后会立即生成需要配置的 DNS 记录。完成所有权校验后，这个域名就可以在首页生成邮箱地址。
        </div>
        <BaseInput
          v-model="createForm.domain_name"
          label="域名"
          placeholder="example.com"
        />
      </div>

      <div v-else class="space-y-6">
        <div class="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          域名已创建成功，下面是需要配置的 DNS 记录。
        </div>

        <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <div class="text-base font-semibold text-black">{{ createdDomainDetail.domain.domain_name }}</div>
            <span :class="getVerificationClass(createdDomainDetail.domain.verification_status)" class="px-2 py-1 text-xs font-medium rounded-full">
              {{ getVerificationLabel(createdDomainDetail.domain.verification_status) }}
            </span>
          </div>
          <p class="mt-2 text-sm text-gray-600">
            配置完成后可以在列表操作里点击“详情”再次查看这些记录。
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-gray-500">
                <th class="pb-3 pr-4 font-medium">类型</th>
                <th class="pb-3 pr-4 font-medium">主机记录</th>
                <th class="pb-3 pr-4 font-medium">值</th>
                <th class="pb-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="record in createdDomainDetail.dns_instructions || []" :key="record.id">
                <td class="py-3 pr-4 align-top text-black">{{ record.record_type }}</td>
                <td class="py-3 pr-4 align-top text-gray-700">{{ record.record_name }}</td>
                <td class="py-3 pr-4 align-top">
                  <div class="max-w-[480px] break-all text-gray-700">{{ record.record_value }}</div>
                </td>
                <td class="py-3 align-top">
                  <button
                    class="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
                    @click="copyText(record.record_value)"
                  >
                    复制
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      v-model="showDetailModal"
      title="域名详情"
      :show-close="true"
      :show-confirm="false"
      :show-cancel="false"
      size="lg"
      @close="closeDetailModal"
      @cancel="closeDetailModal"
    >
      <div v-if="detailLoading && !detailDomain" class="py-10 text-center text-sm text-gray-500">
        加载中...
      </div>

      <div v-else-if="detailDomain" class="space-y-6">
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="text-base font-semibold text-black">{{ detailDomain.domain.domain_name }}</div>
                <span :class="getVerificationClass(detailDomain.domain.verification_status)" class="px-2 py-1 text-xs font-medium rounded-full">
                  {{ getVerificationLabel(detailDomain.domain.verification_status) }}
                </span>
                <span :class="getInboundClass(detailDomain.domain.inbound_status)" class="px-2 py-1 text-xs font-medium rounded-full">
                  {{ getInboundLabel(detailDomain.domain.inbound_status) }}
                </span>
              </div>
            </div>
            <button
              class="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm disabled:opacity-50"
              :disabled="refreshingDomainId === detailDomain.domain.id"
              @click="refreshDns(detailDomain.domain.id, true)"
            >
              {{ refreshingDomainId === detailDomain.domain.id ? '验证中...' : '立即验证DNS' }}
            </button>
          </div>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-black mb-3">DNS 配置</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th class="pb-3 pr-4 font-medium">类型</th>
                  <th class="pb-3 pr-4 font-medium">主机记录</th>
                  <th class="pb-3 pr-4 font-medium">值</th>
                  <th class="pb-3 pr-4 font-medium">状态</th>
                  <th class="pb-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="record in detailDomain.dns_instructions || []" :key="record.id">
                  <td class="py-3 pr-4 align-top text-black">{{ record.record_type }}</td>
                  <td class="py-3 pr-4 align-top text-gray-700">{{ record.record_name }}</td>
                  <td class="py-3 pr-4 align-top">
                    <div class="max-w-[480px] break-all text-gray-700">{{ record.record_value }}</div>
                  </td>
                  <td class="py-3 pr-4 align-top">
                    <span :class="getDnsStatusClass(record.status)" class="px-2 py-1 text-xs font-medium rounded-full">
                      {{ getDnsStatusLabel(record.status) }}
                    </span>
                  </td>
                  <td class="py-3 align-top">
                    <button
                      class="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
                      @click="copyText(record.record_value)"
                    >
                      复制
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

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
const detailLoading = ref(false)
const refreshingDomainId = ref<number | null>(null)

const searchQuery = ref('')
const domains = ref<any[]>([])
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const showDeleteConfirm = ref(false)
const domainToDelete = ref<any | null>(null)
const detailDomain = ref<any | null>(null)
const createdDomainDetail = ref<any | null>(null)

const createForm = ref({
  domain_name: ''
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

const getInboundLabel = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'ready') return '已可收信'
  if (normalized === 'error') return '配置异常'
  return '待生效'
}

const getInboundClass = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'ready') return 'bg-green-100 text-green-700'
  if (normalized === 'error') return 'bg-red-100 text-red-700'
  return 'bg-gray-200 text-gray-600'
}

const getDnsStatusLabel = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'verified') return '已验证'
  if (normalized === 'valid') return '已生效'
  if (normalized === 'invalid') return '不匹配'
  if (normalized === 'not_found') return '未找到'
  return '待检查'
}

const getDnsStatusClass = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'verified') return 'bg-green-100 text-green-700'
  if (normalized === 'valid') return 'bg-green-100 text-green-700'
  if (normalized === 'invalid') return 'bg-red-100 text-red-700'
  if (normalized === 'not_found') return 'bg-amber-100 text-amber-700'
  return 'bg-gray-200 text-gray-600'
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

const openCreateModal = () => {
  showCreateModal.value = true
  createdDomainDetail.value = null
  createForm.value = { domain_name: '' }
}

const closeCreateModal = () => {
  showCreateModal.value = false
  createdDomainDetail.value = null
  createForm.value = { domain_name: '' }
}

const handleCreateDomain = async () => {
  if (!createForm.value.domain_name.trim()) return

  creatingDomain.value = true
  try {
    const response: any = await hostedDomainAPI.createDomain({
      domain_name: createForm.value.domain_name.trim()
    })
    if (response.code === 0 && response.data) {
      createdDomainDetail.value = response.data
      showMessage('域名添加成功', 'success')
      await loadDomains()
    }
  } finally {
    creatingDomain.value = false
  }
}

const openDetailModal = async (domainId: number) => {
  detailLoading.value = true
  showDetailModal.value = true
  try {
    const response: any = await hostedDomainAPI.getDomainDetail(domainId)
    if (response.code === 0 && response.data) {
      detailDomain.value = response.data
    }
  } finally {
    detailLoading.value = false
  }
}

const closeDetailModal = () => {
  showDetailModal.value = false
  detailDomain.value = null
}

const refreshDns = async (domainId: number, reloadDetail = false) => {
  refreshingDomainId.value = domainId
  try {
    const response: any = await hostedDomainAPI.refreshDns(domainId)
    if (response.code === 0) {
      showMessage('DNS 检查完成', 'success')
      await loadDomains()
      if (reloadDetail) {
        await openDetailModal(domainId)
      }
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
      if (detailDomain.value?.domain?.id === domainToDelete.value.id) {
        closeDetailModal()
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
