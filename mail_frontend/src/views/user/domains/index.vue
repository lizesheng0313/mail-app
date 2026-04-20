<template>
  <div class="space-y-6">
    <div class="bg-white rounded-lg shadow-sm border p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center space-x-4">
          <BaseInput
            v-model="searchQuery"
            :placeholder="t('domainsPage.searchPlaceholder')"
            class="w-64"
            size="sm"
            @enter="applyFilters"
          >
            <template #left-icon>
              <svg
                class="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
            @click="applyFilters"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
          >
            {{ t('domainsPage.query') }}
          </button>
        </div>

        <button
          @click="openCreateModal"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
        >
          {{ t('domainsPage.addDomain') }}
        </button>
      </div>
    </div>

    <AdminDataTable :title="t('domainsPage.listTitle')" :loading="loading" :column-count="6">
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
            {{ t('domainsPage.domain') }}
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
            {{ t('domainsPage.description') }}
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
            {{ t('domainsPage.status') }}
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
            {{ t('domainsPage.createdAt') }}
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
            {{ t('domainsPage.expiresAt') }}
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
            {{ t('domainsPage.actions') }}
          </th>
        </tr>
      </template>

      <template #tbody>
        <tr v-for="domain in filteredDomains" :key="domain.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div v-if="isDomainDeleted(domain) || isDomainExpired(domain)" class="mr-2">
                <svg
                  class="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div
                :class="
                  isDomainDeleted(domain) || isDomainExpired(domain)
                    ? 'text-red-600 line-through'
                    : 'text-black'
                "
                class="text-sm font-medium"
              >
                {{ domain.domain_name }}
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
            {{ domain.display_name || '-' }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex flex-col space-y-1">
              <span
                v-if="isDomainDeleted(domain)"
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit bg-red-100 text-red-800"
              >
                {{ t('domainsPage.deleted') }}
              </span>
              <span
                v-else-if="String(domain.status || '').toLowerCase() === 'verified'"
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit bg-primary-100 text-success-800"
              >
                {{ t('domainsPage.verified') }}
              </span>
              <span
                v-else-if="String(domain.status || '').toLowerCase() === 'disabled'"
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit bg-red-100 text-red-800"
              >
                {{ t('domainsPage.disabled') }}
              </span>
              <span
                v-else
                :class="getVerificationClass(domain.status)"
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit"
              >
                {{ getVerificationLabel(domain.status) }}
              </span>
              <span
                v-if="Boolean(domain.is_public)"
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800 w-fit"
              >
                {{ t('domainsPage.publicDomainBadge') }}
              </span>
              <span
                v-if="!isDomainDeleted(domain) && isDomainExpired(domain)"
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800 w-fit"
              >
                {{ t('domainsPage.expired') }}
              </span>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
            {{ formatDate(domain.created_at) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <span
              v-if="domain.expires_at"
              :class="isDomainExpired(domain) ? 'text-red-600 font-medium' : 'text-black'"
            >
              {{ formatDateOnly(domain.expires_at) }}
            </span>
            <span v-else class="text-black">-</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <div class="flex items-center space-x-2">
              <ActionButton
                v-if="
                  !isDomainDeleted(domain) &&
                  String(domain.status || '').toLowerCase() !== 'verified'
                "
                icon="eye"
                tooltip="详情"
                variant="view"
                @click="openVerifyModal(domain)"
              />
              <ActionButton
                v-if="
                  !isDomainDeleted(domain) &&
                  String(domain.status || '').toLowerCase() === 'verified'
                "
                icon="edit"
                :tooltip="t('domainsPage.edit')"
                variant="edit"
                @click="openEditModal(domain)"
              />
              <ActionButton
                :icon="String(domain.status || '').toLowerCase() === 'verified' ? 'disable' : 'enable'"
                :tooltip="String(domain.status || '').toLowerCase() === 'verified' ? t('domainsPage.disable') : t('domainsPage.enable')"
                :variant="String(domain.status || '').toLowerCase() === 'verified' ? 'disable' : 'enable'"
                v-if="
                  !isDomainDeleted(domain) &&
                  ['verified', 'disabled'].includes(String(domain.status || '').toLowerCase())
                "
                @click="toggleDomain(domain)"
              />
              <ActionButton
                icon="delete"
                :tooltip="t('domainsPage.delete')"
                variant="delete"
                @click="openDeleteDialog(domain)"
              />
            </div>
          </td>
        </tr>

        <tr v-if="!filteredDomains.length">
          <td colspan="6" class="px-6 py-12 text-center text-black">
            {{ t('domainsPage.empty') }}
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <BaseModal
      v-model="showDomainModal"
      :title="domainModalTitle"
      :show-close="true"
      :show-footer="!domainModalDetail"
      :show-confirm="!domainModalDetail"
      :show-cancel="!domainModalDetail"
      :confirm-text="creatingDomain ? t('domainsPage.creating') : t('domainsPage.addDomain')"
      :confirm-loading="creatingDomain"
      :confirm-disabled="creatingDomain || !createForm.domain_name.trim()"
      size="lg"
      @confirm="handleCreateDomain"
      @close="closeDomainModal"
      @cancel="closeDomainModal"
    >
      <div v-if="!domainModalDetail" class="space-y-4">
        <div class="rounded-lg bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600">
          {{ t('domainsPage.createHint') }}
        </div>
        <BaseInput
          v-model="createForm.domain_name"
          :label="t('domainsPage.domain')"
          placeholder="example.com"
        />
        <BaseInput
          v-model="createForm.display_name"
          :label="t('domainsPage.description')"
          :placeholder="t('domainsPage.optional')"
        />
        <BaseInput
          v-model="createForm.expires_at"
          :label="t('domainsPage.expiresAt')"
          type="date"
          size="lg"
          auto-show-picker
        />
        <CatchAllSettingCard
          :domain-name="createForm.domain_name"
          :enabled="createForm.catch_all_enabled"
          @update:enabled="createForm.catch_all_enabled = $event"
        />
        <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <input
            v-model="createForm.is_public"
            type="checkbox"
            class="mt-1 h-4 w-4 accent-primary-600"
          />
          <div class="min-w-0">
            <div class="text-sm font-medium text-black">{{ t('domainsPage.publicDomainLabel') }}</div>
            <p class="mt-1 text-xs leading-5 text-gray-500">
              {{ t('domainsPage.publicDomainHelp') }}
            </p>
          </div>
        </label>
      </div>

      <div v-else class="space-y-6">
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="text-base font-semibold text-black">
                  {{ domainModalDetail.domain.domain_name }}
                </div>
                <span
                  :class="getVerificationClass(domainModalDetail.domain.status)"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ getVerificationLabel(domainModalDetail.domain.status) }}
                </span>
              </div>
            </div>
            <button
              v-if="String(domainModalDetail.domain.status || '').toLowerCase() !== 'verified'"
              class="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm disabled:opacity-50"
              :disabled="refreshingDomainId === domainModalDetail.domain.id"
              @click="refreshDns(domainModalDetail.domain.id)"
            >
              <span
                v-if="refreshingDomainId === domainModalDetail.domain.id"
                class="inline-flex items-center gap-2"
              >
                验证中
                <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
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
                  <th class="pb-3 pr-4 font-medium">状态</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  v-for="record in domainModalDetail.dns_instructions || []"
                  :key="[
                    record.record_type,
                    record.record_host,
                    record.record_name,
                    record.record_value,
                    record.priority
                  ].join('|')"
                >
                  <td class="py-3 pr-4 align-top">
                    <div class="flex items-center gap-2">
                      <div class="max-w-[240px] break-all text-gray-700">
                        {{ formatRecordHost(record) }}
                      </div>
                      <ActionButton
                        icon="copy"
                        tooltip="复制主机记录"
                        variant="copy"
                        size="sm"
                        @click="copyDnsValue(formatRecordHost(record))"
                      />
                    </div>
                  </td>
                  <td class="py-3 pr-4 align-top text-black">{{ record.record_type }}</td>
                  <td class="py-3 pr-4 align-top">
                    <div class="flex items-center gap-2">
                      <div class="max-w-[420px] break-all text-gray-700">{{ record.record_value }}</div>
                      <ActionButton
                        icon="copy"
                        tooltip="复制记录值"
                        variant="copy"
                        size="sm"
                        @click="copyDnsValue(record.record_value)"
                      />
                    </div>
                  </td>
                  <td class="py-3 pr-4 align-top text-gray-700">
                    {{ record.priority ?? '-' }}
                  </td>
                  <td class="py-3 pr-4 align-top">
                    <span
                      :class="getDnsStatusClass(record.status)"
                      class="px-2 py-1 text-xs font-medium rounded-full"
                    >
                      {{ getDnsStatusLabel(record.status) }}
                    </span>
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
      :title="t('domainsPage.editTitle')"
      :show-close="true"
      :show-footer="true"
      :show-confirm="true"
      :show-cancel="true"
      :confirm-text="t('domainsPage.save')"
      :confirm-loading="savingEdit"
      :confirm-disabled="savingEdit"
      size="md"
      @confirm="saveEditDomain"
      @close="closeEditModal"
      @cancel="closeEditModal"
    >
      <div class="space-y-4">
        <BaseInput v-model="editForm.domain_name" :label="t('domainsPage.domain')" disabled />
        <BaseInput
          v-model="editForm.display_name"
          :label="t('domainsPage.description')"
          :placeholder="t('domainsPage.optional')"
        />
        <BaseInput
          v-model="editForm.expires_at"
          :label="t('domainsPage.expiresAt')"
          type="date"
          size="lg"
          auto-show-picker
        />
        <CatchAllSettingCard
          :domain-name="editForm.domain_name"
          :enabled="editForm.catch_all_enabled"
          :show-mailbox-line="true"
          @update:enabled="editForm.catch_all_enabled = $event"
        />
        <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <input
            v-model="editForm.is_public"
            type="checkbox"
            class="mt-1 h-4 w-4 accent-primary-600"
          />
          <div class="min-w-0">
            <div class="text-sm font-medium text-black">{{ t('domainsPage.publicDomainLabel') }}</div>
            <p class="mt-1 text-xs leading-5 text-gray-500">
              {{ t('domainsPage.publicDomainHelp') }}
            </p>
          </div>
        </label>
      </div>
    </BaseModal>

    <ConfirmDialog
      :visible="showDeleteConfirm"
      :mask="false"
      :title="t('domainsPage.deleteTitle')"
      :message="t('domainsPage.deleteMessage', { name: domainToDelete?.domain_name || '' })"
      :loading="deleting"
      @confirm="confirmDeleteDomain"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import CatchAllSettingCard from '@/views/user/domains/components/CatchAllSettingCard.vue'
import { hostedDomainAPI } from '@/api/hostedDomain'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils.js'

const { t } = useI18n()

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

const createForm = ref({
  domain_name: '',
  display_name: '',
  expires_at: '',
  catch_all_enabled: true,
  is_public: false
})

const editForm = ref({
  id: 0,
  domain_name: '',
  display_name: '',
  expires_at: '',
  catch_all_enabled: false,
  is_public: false
})

const filteredDomains = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return domains.value
  return domains.value.filter((item) =>
    String(item.domain_name || '')
      .toLowerCase()
      .includes(keyword)
  )
})

const domainModalTitle = computed(() =>
  domainModalDetail.value ? 'DNS 验证' : t('domainsPage.addTitle')
)

const getVerificationLabel = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'verified') return t('domainsPage.verified')
  if (normalized === 'disabled') return t('domainsPage.disabled')
  if (normalized === 'failed') return t('domainsPage.verifyFailed')
  return t('domainsPage.pendingVerify')
}

const getVerificationClass = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'verified') return 'bg-green-100 text-green-700'
  if (normalized === 'disabled') return 'bg-red-100 text-red-700'
  if (normalized === 'failed') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}

const loadDomains = async () => {
  loading.value = true
  try {
    const response: any = await hostedDomainAPI.listDomains()
    if (response.code === 0 && response.data) {
      domains.value = (response.data.items || []).filter((item: any) => !item?.is_deleted)
    }
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  showDomainModal.value = true
  domainModalDetail.value = null
  createForm.value = {
    domain_name: '',
    display_name: '',
    expires_at: '',
    catch_all_enabled: true,
    is_public: false
  }
}

const closeDomainModal = () => {
  showDomainModal.value = false
  domainModalDetail.value = null
  createForm.value = {
    domain_name: '',
    display_name: '',
    expires_at: '',
    catch_all_enabled: true,
    is_public: false
  }
}

const handleCreateDomain = async () => {
  if (!createForm.value.domain_name.trim()) return

  creatingDomain.value = true
  try {
    const response: any = await hostedDomainAPI.createDomain({
      domain_name: createForm.value.domain_name.trim(),
      display_name: createForm.value.display_name.trim() || undefined,
      expires_at_ms: createForm.value.expires_at
        ? toEndOfDayMs(createForm.value.expires_at)
        : undefined,
      catch_all_enabled: createForm.value.catch_all_enabled,
      is_public: createForm.value.is_public
    })
    if (response.code === 0) {
      showMessage(t('domainsPage.createSuccess'), 'success')
      applyDomainDetailToModal(response.data, true)
      await loadDomains()
    }
  } finally {
    creatingDomain.value = false
  }
}

const getDnsStatusClass = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'verified' || normalized === 'valid') return 'bg-green-100 text-green-700'
  if (normalized === 'invalid' || normalized === 'failed' || normalized === 'error') return 'bg-red-100 text-red-700'
  if (normalized === 'not_found') return 'bg-amber-100 text-amber-700'
  return 'bg-gray-200 text-gray-600'
}

const getDnsStatusLabel = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'verified') return '已验证'
  if (normalized === 'valid') return '已生效'
  if (normalized === 'invalid') return '不匹配'
  if (normalized === 'failed') return '检查失败'
  if (normalized === 'error') return '查询失败'
  if (normalized === 'not_found') return '未找到'
  return '待检查'
}

const applyDomainDetailToModal = (detail: any, _created = false) => {
  domainModalDetail.value = detail || null
  showDomainModal.value = true
}

const openVerifyModal = async (domain: any) => {
  const domainId = Number(domain?.id || 0)
  if (!domainId) return
  loading.value = true
  try {
    const response: any = await hostedDomainAPI.getDomainDetail(domainId)
    if (response.code === 0 && response.data) {
      applyDomainDetailToModal(response.data)
    }
  } finally {
    loading.value = false
  }
}

const formatRecordHost = (record: any) => {
  const value = String(record?.record_host || '').trim()
  return value || '@'
}

const refreshDns = async (domainId: number | string) => {
  const numericId = Number(domainId || 0)
  if (!numericId) return
  refreshingDomainId.value = numericId
  try {
    const response: any = await hostedDomainAPI.refreshDns(numericId)
    if (response.code === 0 && response.data) {
      applyDomainDetailToModal(response.data)
      await loadDomains()
    }
  } finally {
    refreshingDomainId.value = null
  }
}

const copyDnsValue = async (value: string) => {
  await navigator.clipboard.writeText(String(value || ''))
  showMessage(t('mail.copied'), 'success')
}

const openEditModal = (domain: any) => {
  editForm.value = {
    id: Number(domain.id),
    domain_name: domain.domain_name || '',
    display_name: domain.display_name || '',
    expires_at: domain.expires_at ? toDateInputValue(domain.expires_at) : '',
    catch_all_enabled: Boolean(domain.catch_all_enabled),
    is_public: Boolean(domain.is_public)
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editForm.value = {
    id: 0,
    domain_name: '',
    display_name: '',
    expires_at: '',
    catch_all_enabled: false,
    is_public: false
  }
}

const saveEditDomain = async () => {
  if (!editForm.value.id) return
  savingEdit.value = true
  try {
    const response: any = await hostedDomainAPI.updateDomain(editForm.value.id, {
      display_name: editForm.value.display_name.trim() || null,
      expires_at_ms: editForm.value.expires_at ? toEndOfDayMs(editForm.value.expires_at) : null,
      catch_all_enabled: editForm.value.catch_all_enabled,
      is_public: editForm.value.is_public
    })
    if (response.code === 0) {
      showMessage(t('domainsPage.updateSuccess'), 'success')
      closeEditModal()
      await loadDomains()
    }
  } finally {
    savingEdit.value = false
  }
}

const toggleDomain = async (domain: any) => {
  loading.value = true
  try {
    const currentStatus = String(domain.status || '').toLowerCase()
    const nextStatus = currentStatus === 'verified' ? 'disabled' : 'verified'
    const response: any = await hostedDomainAPI.updateDomain(domain.id, {
      status: nextStatus
    })
    if (response.code === 0) {
      showMessage(
        currentStatus === 'verified' ? t('domainsPage.toggledDisabled') : t('domainsPage.toggledEnabled'),
        'success'
      )
      await loadDomains()
    }
  } finally {
    loading.value = false
  }
}

const toEndOfDayMs = (dateValue: string) => new Date(`${dateValue}T23:59:59`).getTime()
const toDateInputValue = (timestamp: number | string) =>
  new Date(Number(timestamp)).toISOString().slice(0, 10)
const formatDate = (timestamp: number | string) => formatTimestamp(timestamp)
const formatDateOnly = (timestamp: number | string) => formatTimestamp(timestamp, 'date')
const isDomainDeleted = (domain: any) => Boolean(domain?.is_deleted)
const isDomainExpired = (domain: any) => {
  const expiresAt = Number(domain?.expires_at || 0)
  return expiresAt > 0 && expiresAt < Date.now()
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
      showMessage(t('domainsPage.deleteSuccess'), 'success')
      showDeleteConfirm.value = false
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

onMounted(async () => {
  await loadDomains()
})
</script>
