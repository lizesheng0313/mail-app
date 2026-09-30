<template>
  <section class="flex h-full min-h-0 flex-col gap-3">
    <div class="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <BaseInput
        v-model="searchInput"
        type="search"
        size="sm"
        class="min-w-[180px] flex-1 sm:max-w-xs"
        :placeholder="t('shareMailbox.searchPlaceholder')"
        :aria-label="t('shareMailbox.searchPlaceholder')"
        @enter="handleSearch"
      />
      <button type="button" class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50" :disabled="loadingShares" @click="handleSearch">{{ t('shareMailbox.search') }}</button>
      <button v-if="activeSearch" type="button" class="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100" @click="clearSearch">{{ t('shareMailbox.clearSearch') }}</button>
      <div v-if="selectedShareIds.length" class="ml-auto flex items-center gap-3">
        <span class="whitespace-nowrap text-sm text-gray-600">{{ t('shareMailbox.selectedCount', { count: selectedShareIds.length }) }}</span>
        <button type="button" class="inline-flex items-center gap-1 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="deletingShares || loadingShares" @click="pendingRevokeShares = selectedShares">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          {{ t('shareMailbox.batchDelete') }}
        </button>
      </div>
    </div>
    <AdminDataTable
      class="min-h-0 flex-1"
      :loading="loadingShares"
      :pagination="{ page: sharePage, pages: Math.max(1, Math.ceil(totalShares / pageSize)), total: totalShares, limit: pageSize }"
      :show-page-size-selector="false"
      :column-count="8"
      table-class="w-full min-w-[1180px] sm:min-w-[1180px] table-fixed"
      :fill-empty-height="!managedShares.length"
      @page-change="loadShares"
    >
      <template #thead>
        <tr>
          <th class="w-[4%] px-3 py-3 text-left"><input type="checkbox" class="h-4 w-4 accent-primary-600" :aria-label="t('shareMailbox.selectPage')" :checked="allPageSelected" :disabled="!managedShares.length || deletingShares || loadingShares" @change="togglePageSelection($event.target.checked)" /></th>
          <th class="w-[20%] px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.mailboxColumn') }}</th>
          <th class="w-[9%] px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.typeColumn') }}</th>
          <th class="w-[16%] px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.createdAtColumn') }}</th>
          <th class="w-[21%] px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.validityColumn') }}</th>
          <th class="w-[9%] px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.statusColumn') }}</th>
          <th class="w-[13%] px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.openCountColumn') }}</th>
          <th class="w-[8%] px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.actionColumn') }}</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="loadError">
          <td colspan="8" class="px-6 py-12 text-center text-sm text-red-600">
            {{ loadError }}
            <button type="button" class="ml-2 font-medium text-primary-700 hover:underline" @click="loadShares(sharePage)">{{ t('common.retry') }}</button>
          </td>
        </tr>
        <tr v-else-if="!managedShares.length">
          <td colspan="8" class="px-6 py-12 text-center text-sm text-gray-500">{{ activeSearch ? t('shareMailbox.noSearchResults') : t('shareMailbox.noShares') }}</td>
        </tr>
        <tr v-for="share in loadError ? [] : managedShares" :key="share.id" class="hover:bg-gray-50">
          <td class="px-3 py-3"><input type="checkbox" class="h-4 w-4 accent-primary-600" :aria-label="t('shareMailbox.selectShare', { email: share.mailbox_emails?.join('、') || `#${share.mailbox_ids}` })" :checked="selectedShareIds.includes(share.id)" :disabled="deletingShares || loadingShares" @change="toggleShareSelection(share.id, $event.target.checked)" /></td>
          <td class="px-4 py-3 text-sm font-medium text-gray-900">
            <p class="max-w-full truncate" :title="share.mailbox_emails?.join('、') || `#${share.mailbox_ids}`">{{ share.mailbox_emails?.join('、') || `#${share.mailbox_ids}` }}</p>
          </td>
          <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{{ share.miniapp_path ? t('shareMailbox.miniappShare') : t('shareMailbox.webShare') }}</td>
          <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{{ formatShareDate(share.created_at) }}</td>
          <td class="px-4 py-3 text-sm text-gray-600"><span class="block truncate" :title="shareValidity(share)">{{ shareValidity(share) }}</span></td>
          <td class="whitespace-nowrap px-4 py-3 text-sm">
            <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" :class="isShareExpired(share) ? 'bg-gray-100 text-gray-600' : isAwaitingFirstOpen(share) ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'">{{ isShareExpired(share) ? t('shareMailbox.expired') : isAwaitingFirstOpen(share) ? t('shareMailbox.awaitingFirstOpen') : t('shareMailbox.active') }}</span>
          </td>
          <td class="px-4 py-3 text-sm text-gray-700">
            <div>{{ share.open_count ? t('shareMailbox.openCountValue', { count: share.open_count }) : t('shareMailbox.notOpened') }}</div>
            <div v-if="share.last_opened_at" class="mt-1 truncate text-xs text-gray-500" :title="formatShareDate(share.last_opened_at)">{{ t('shareMailbox.lastOpened', { date: formatShareDate(share.last_opened_at) }) }}</div>
          </td>
          <td class="whitespace-nowrap px-4 py-3 text-sm">
            <div class="flex items-center gap-1">
              <ActionButton v-if="share.share_url && !isShareExpired(share)" icon="copy" variant="copy" :tooltip="t('common.copy')" @click="copyShareUrl(share.share_url)" />
              <ActionButton :icon="isShareExpired(share) ? 'delete' : 'ban'" :variant="isShareExpired(share) ? 'delete' : 'danger'" :tooltip="isShareExpired(share) ? t('shareMailbox.deleteRecord') : t('shareMailbox.revoke')" :disabled="deletingShares || loadingShares" @click="pendingRevokeShares = [share]" />
            </div>
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <ConfirmDialog
      :visible="pendingRevokeShares.length > 0"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-text="confirmTitle"
      :cancel-text="t('common.cancel')"
      :loading="deletingShares"
      :show-warning="false"
      @confirm="revokeShare"
      @cancel="pendingRevokeShares = []"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { mailboxShareAPI } from '@/api/mailboxShare'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import { isTauri } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { showMessage } from '@/utils/message'

const pageSize = 20
const { t } = useI18n()
const userStore = useUserStore()
const guestMode = computed(() => !userStore.isAuthenticated)
const managedShares = ref([])
const loadingShares = ref(false)
const loadError = ref('')
const sharePage = ref(1)
const totalShares = ref(0)
const searchInput = ref('')
const activeSearch = ref('')
const selectedShareIds = ref([])
const selectedShares = computed(() => managedShares.value.filter((share) => selectedShareIds.value.includes(share.id)))
const allPageSelected = computed(() => managedShares.value.length > 0 && selectedShareIds.value.length === managedShares.value.length)
const pendingRevokeShares = ref([])
const deletingShares = ref(false)
const isBulkAction = computed(() => pendingRevokeShares.value.length > 1)
const confirmTitle = computed(() => isBulkAction.value
  ? t('shareMailbox.batchDelete')
  : pendingRevokeShares.value[0] && isShareExpired(pendingRevokeShares.value[0])
    ? t('shareMailbox.deleteRecord')
    : t('shareMailbox.revoke'))
const confirmMessage = computed(() => isBulkAction.value
  ? t('shareMailbox.deleteSelectedConfirm', { count: pendingRevokeShares.value.length })
  : pendingRevokeShares.value[0] && isShareExpired(pendingRevokeShares.value[0])
    ? t('shareMailbox.deleteRecordConfirm')
    : t('shareMailbox.revokeConfirm'))

const formatShareDate = (value) => value
  ? new Date(value).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
  : '-'
const shareValidity = (share) => share.expire_at
  ? formatShareDate(share.expire_at)
  : share.expire_mode === 'minutes'
    ? (share.expire_minutes ? t('shareMailbox.firstOpenMinutes', { count: share.expire_minutes }) : t('shareMailbox.waitingFirstOpen'))
    : t('shareMailbox.permanentValid')
const isShareExpired = (share) => share.status !== 'active' || Boolean(share.expire_at && new Date(share.expire_at).getTime() <= Date.now())
const isAwaitingFirstOpen = (share) => share.status === 'active' && share.expire_mode === 'minutes' && !share.expire_at
const toggleShareSelection = (id, checked) => {
  selectedShareIds.value = checked
    ? [...selectedShareIds.value, id]
    : selectedShareIds.value.filter((shareId) => shareId !== id)
}
const togglePageSelection = (checked) => {
  selectedShareIds.value = checked ? managedShares.value.map((share) => share.id) : []
}
const handleSearch = () => {
  activeSearch.value = searchInput.value.trim()
  loadShares(1)
}
const clearSearch = () => {
  searchInput.value = ''
  activeSearch.value = ''
  loadShares(1)
}

const loadShares = async (page = 1) => {
  loadingShares.value = true
  loadError.value = ''
  try {
    const res = await mailboxShareAPI.getMyShares(page, pageSize, guestMode.value, activeSearch.value)
    if (res.code !== 0) throw new Error(res.message || t('shareMailbox.loadFailed'))
    managedShares.value = res.data?.shares || []
    selectedShareIds.value = []
    sharePage.value = page
    totalShares.value = Number(res.data?.pagination?.total || 0)
  } catch (error) {
    loadError.value = error?.message || t('shareMailbox.loadFailed')
  } finally {
    loadingShares.value = false
  }
}

const copyShareUrl = async (path) => {
  const origin = isTauri() ? 'https://zjkdongao.cn' : window.location.origin
  try {
    await navigator.clipboard.writeText(`${origin}${path}`)
    showMessage(t('shareMailbox.copied'), 'success')
  } catch {
    showMessage(t('common.copyFailed'), 'error')
  }
}

const revokeShare = async () => {
  const shares = pendingRevokeShares.value
  if (!shares.length || deletingShares.value) return
  const deletingExpiredRecord = shares.length === 1 && isShareExpired(shares[0])
  deletingShares.value = true
  try {
    const res = shares.length > 1
      ? await mailboxShareAPI.batchDeleteShares(shares.map((share) => share.id), guestMode.value)
      : await mailboxShareAPI.deleteShare(shares[0].id, guestMode.value)
    if (res.code !== 0) throw new Error(res.message || t('shareMailbox.revokeFailed'))
    showMessage(t(shares.length > 1 ? 'shareMailbox.selectedDeleted' : deletingExpiredRecord ? 'shareMailbox.recordDeleted' : 'shareMailbox.revoked', { count: shares.length }), 'success')
    await loadShares(managedShares.value.length === shares.length && sharePage.value > 1 ? sharePage.value - 1 : sharePage.value)
  } catch (error) {
    showMessage(error?.message || t(shares.length > 1 ? 'shareMailbox.deleteSelectedFailed' : deletingExpiredRecord ? 'shareMailbox.deleteRecordFailed' : 'shareMailbox.revokeFailed'), 'error')
  } finally {
    deletingShares.value = false
    pendingRevokeShares.value = []
  }
}

onMounted(() => loadShares())
</script>
