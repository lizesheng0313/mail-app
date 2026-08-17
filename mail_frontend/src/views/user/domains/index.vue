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

    <AdminDataTable
      :title="t('domainsPage.listTitle')"
      :loading="loading"
      :column-count="6"
      :pagination="pagination"
      :show-page-size-selector="true"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    >
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
        <tr v-for="domain in domains" :key="domain.id" class="hover:bg-gray-50">
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

        <tr v-if="!domains.length">
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
      :confirm-disabled="
        creatingDomain ||
        !createForm.domain_name.trim() ||
        (createForm.admin_verification_enabled && !createForm.admin_password.trim())
      "
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
        <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-primary-100 bg-primary-50/60 px-4 py-3">
          <input
            v-model="createForm.admin_verification_enabled"
            type="checkbox"
            class="mt-1 h-4 w-4 accent-primary-600"
          />
          <span class="min-w-0">
            <span class="block text-sm font-medium text-gray-900">
              {{ t('domainsPage.adminVerificationLabel') }}
            </span>
            <span class="mt-1 block text-xs leading-5 text-gray-600">
              {{ t('domainsPage.adminVerificationHelp') }}
            </span>
          </span>
        </label>
        <BaseInput
          v-if="createForm.admin_verification_enabled"
          v-model="createForm.admin_password"
          :label="t('domainsPage.adminVerificationPassword')"
          :placeholder="t('domainsPage.adminVerificationPasswordPlaceholder')"
          type="password"
          autocomplete="current-password"
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
        <div
          v-if="String(domainModalDetail.domain.verification_mode || '').toLowerCase() === 'mx'"
          class="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm leading-6 text-primary-800"
        >
          {{ t('domainsPage.adminVerificationDetailHint') }}
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
                    <div
                      v-if="record.check_message || record.fail_reason"
                      class="mt-2 flex max-w-[560px] items-start gap-1.5 text-xs leading-5 text-gray-500"
                    >
                      <span
                        :class="getDnsDetailDotClass(record.status)"
                        class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      ></span>
                      <span class="whitespace-normal break-all">
                        {{ record.check_message || record.fail_reason }}
                      </span>
                    </div>
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

    <BaseModal
      v-model="showTransferModal"
      title="转让域名给管理员"
      :show-close="true"
      :show-footer="true"
      :show-confirm="true"
      :show-cancel="true"
      :confirm-text="transferringDomains ? '转让中...' : '确认转让'"
      :confirm-loading="transferringDomains"
      :confirm-disabled="transferringDomains || !selectedTransferDomainIds.length || !transferAdminPassword.trim()"
      size="lg"
      @confirm="confirmTransferDomains"
      @close="closeTransferModal"
      @cancel="closeTransferModal"
    >
      <div class="space-y-4">
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          只能转让已验证通过的域名；转让后，这些域名会进入管理员后台域名池，并从当前账号的我的域名中清空。
        </div>
        <label class="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
          <input
            type="checkbox"
            class="h-4 w-4 accent-primary-600"
            :checked="isAllTransferDomainsSelected"
            @change="toggleAllTransferDomains"
          />
          <span class="text-sm font-medium text-gray-900">全选当前域名</span>
          <span class="ml-auto text-sm text-gray-500">
            已选 {{ selectedTransferDomainIds.length }} / {{ transferableDomains.length }}
          </span>
        </label>
        <div class="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
          <label
            v-for="domain in transferableDomains"
            :key="domain.id"
            class="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-gray-50"
          >
            <input
              v-model="selectedTransferDomainIds"
              type="checkbox"
              class="h-4 w-4 accent-primary-600"
              :value="Number(domain.id)"
            />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-gray-900">{{ domain.domain_name }}</span>
              <span class="mt-1 block text-xs text-gray-500">
                过期时间：{{ domain.expires_at ? formatDateOnly(domain.expires_at) : '-' }}
              </span>
            </span>
          </label>
          <div v-if="!transferableDomains.length" class="px-4 py-8 text-center text-sm text-gray-500">
            暂无已验证通过的可转让域名
          </div>
        </div>
        <BaseInput
          v-model="transferAdminPassword"
          label="管理员密码"
          type="password"
          placeholder="输入管理员密码后才允许转让"
        />
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
const transferringDomains = ref(false)

const searchQuery = ref('')
const domains = ref<any[]>([])
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0
})
const showDomainModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const showTransferModal = ref(false)
const domainToDelete = ref<any | null>(null)
const domainModalDetail = ref<any | null>(null)
const selectedTransferDomainIds = ref<number[]>([])
const transferAdminPassword = ref('')

const getNextYearTodayDateInput = () => {
  const nextYearToday = new Date()
  nextYearToday.setFullYear(nextYearToday.getFullYear() + 1)
  const year = nextYearToday.getFullYear()
  const month = String(nextYearToday.getMonth() + 1).padStart(2, '0')
  const day = String(nextYearToday.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDefaultCreateForm = () => ({
  domain_name: '',
  display_name: '',
  expires_at: getNextYearTodayDateInput(),
  catch_all_enabled: true,
  is_public: false,
  admin_verification_enabled: false,
  admin_password: ''
})

const createForm = ref({
  ...getDefaultCreateForm()
})

const editForm = ref({
  id: 0,
  domain_name: '',
  display_name: '',
  expires_at: '',
  catch_all_enabled: false,
  is_public: false
})

const domainModalTitle = computed(() =>
  domainModalDetail.value
    ? String(domainModalDetail.value.domain?.verification_mode || '').toLowerCase() === 'mx'
      ? t('domainsPage.mxDetailTitle')
      : t('domainsPage.detailTitle')
    : t('domainsPage.addTitle')
)
const isDomainTransferable = (domain: any) =>
  !isDomainDeleted(domain) &&
  String(domain?.status || '').toLowerCase() === 'verified' &&
  String(domain?.verification_status || domain?.status || '').toLowerCase() === 'verified'

const transferableDomains = computed(() => domains.value.filter(isDomainTransferable))

const selectedTransferableDomainIds = computed(() => {
  const transferableIdSet = new Set(transferableDomains.value.map((item) => Number(item.id)))
  return selectedTransferDomainIds.value.filter((id) => transferableIdSet.has(Number(id)))
})

const isAllTransferDomainsSelected = computed(
  () =>
    transferableDomains.value.length > 0 &&
    selectedTransferableDomainIds.value.length === transferableDomains.value.length
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

const loadDomains = async (targetPage = pagination.value.page) => {
  loading.value = true
  try {
    const response: any = await hostedDomainAPI.listDomains({
      page: targetPage,
      limit: pagination.value.limit,
      search: searchQuery.value.trim() || undefined
    })
    if (response.code === 0 && response.data) {
      domains.value = (response.data.items || []).filter((item: any) => !item?.is_deleted)
      pagination.value = {
        page: Number(response.data.pagination?.page || targetPage || 1),
        limit: Number(response.data.pagination?.limit || pagination.value.limit || 20),
        total: Number(response.data.pagination?.total || 0),
        pages: Number(response.data.pagination?.pages || 0)
      }

      if (!domains.value.length && pagination.value.total > 0 && pagination.value.pages > 0 && pagination.value.page > pagination.value.pages) {
        await loadDomains(pagination.value.pages)
      }
    }
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  showDomainModal.value = true
  domainModalDetail.value = null
  createForm.value = getDefaultCreateForm()
}

const closeDomainModal = () => {
  showDomainModal.value = false
  domainModalDetail.value = null
  createForm.value = getDefaultCreateForm()
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
      is_public: createForm.value.is_public,
      admin_password: createForm.value.admin_verification_enabled
        ? createForm.value.admin_password.trim() || undefined
        : undefined
    })
    if (response.code === 0) {
      showMessage(t('domainsPage.createSuccess'), 'success')
      applyDomainDetailToModal(response.data, true)
      await loadDomains(1)
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

const getDnsDetailDotClass = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'not_found') return 'bg-amber-400'
  if (normalized === 'invalid' || normalized === 'failed' || normalized === 'error') {
    return 'bg-red-400'
  }
  return 'bg-gray-300'
}

const applyDomainDetailToModal = (detail: any, _created = false) => {
  domainModalDetail.value = detail || null
  showDomainModal.value = true
}

const getModalDomainId = () => Number(domainModalDetail.value?.domain?.id || 0)

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
  const value = String(record?.record_host || '@').trim() || '@'
  const domainName = String(domainModalDetail.value?.domain?.domain_name || '').trim().toLowerCase()
  const hostPrefix = getDnsZoneHostPrefix(domainName)
  if (!hostPrefix) return value
  if (value === '@') return hostPrefix
  return `${value}.${hostPrefix}`
}

const getDnsZoneHostPrefix = (domainName: string) => {
  const parts = String(domainName || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
    .split('.')
    .filter(Boolean)
  if (parts.length <= 2) return ''

  const publicSuffix2 = parts.slice(-2).join('.')
  const secondLevelPublicSuffixes = new Set([
    'com.cn',
    'net.cn',
    'org.cn',
    'gov.cn',
    'edu.cn',
    'com.tw',
    'net.tw',
    'org.tw',
    'com.hk',
    'net.hk',
    'org.hk',
    'co.uk',
    'com.au',
    'co.jp'
  ])
  const rootPartCount = secondLevelPublicSuffixes.has(publicSuffix2) ? 3 : 2
  if (parts.length <= rootPartCount) return ''
  return parts.slice(0, -rootPartCount).join('.')
}

const refreshDns = async (domainId: number | string) => {
  const numericId = Number(domainId || 0)
  if (!numericId) return
  refreshingDomainId.value = numericId
  try {
    const response: any = await hostedDomainAPI.refreshDns(numericId)
    if (response.code === 0 && response.data) {
      if (getModalDomainId() === numericId) {
        applyDomainDetailToModal(response.data)
      }
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

const openTransferModal = () => {
  selectedTransferDomainIds.value = transferableDomains.value.map((item) => Number(item.id))
  transferAdminPassword.value = ''
  showTransferModal.value = true
}

const closeTransferModal = () => {
  showTransferModal.value = false
  transferAdminPassword.value = ''
  selectedTransferDomainIds.value = []
}

const toggleAllTransferDomains = () => {
  if (isAllTransferDomainsSelected.value) {
    selectedTransferDomainIds.value = []
    return
  }
  selectedTransferDomainIds.value = transferableDomains.value.map((item) => Number(item.id))
}

const confirmTransferDomains = async () => {
  const domainIds = selectedTransferableDomainIds.value
  selectedTransferDomainIds.value = domainIds
  if (!domainIds.length || !transferAdminPassword.value.trim()) return
  transferringDomains.value = true
  try {
    const response: any = await hostedDomainAPI.transferToAdmin({
      domain_ids: domainIds,
      admin_password: transferAdminPassword.value
    })
    if (response.code === 0) {
      showMessage(`已转让 ${response.data?.transferred_count || 0} 个域名`, 'success')
      closeTransferModal()
      await loadDomains()
    }
  } finally {
    transferringDomains.value = false
  }
}

const applyFilters = () => {
  pagination.value.page = 1
  void loadDomains(1)
}

const handlePageChange = (page: number) => {
  if (page < 1 || (pagination.value.pages > 0 && page > pagination.value.pages)) return
  pagination.value.page = page
  void loadDomains(page)
}

const handlePageSizeChange = (limit: number) => {
  pagination.value.limit = limit
  pagination.value.page = 1
  void loadDomains(1)
}

onMounted(async () => {
  await loadDomains()
  ;(window as any).feimaomao = openTransferModal
})

onBeforeUnmount(() => {
  if ((window as any).feimaomao === openTransferModal) {
    delete (window as any).feimaomao
  }
})
</script>
