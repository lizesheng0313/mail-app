<template>
  <section class="flex h-full min-h-0 flex-col gap-3">
    <div class="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <div class="w-full min-w-0 sm:w-[28rem] sm:max-w-full">
        <BaseInput v-model="searchInput" type="search" size="sm" class="w-full" :placeholder="t('shareMailbox.batchSearchPlaceholder')" :aria-label="t('shareMailbox.batchSearchPlaceholder')" @enter="handleSearch" />
      </div>
      <button type="button" class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50" :disabled="loadingShares" @click="handleSearch">{{ t('shareMailbox.search') }}</button>
      <button v-if="activeSearch" type="button" class="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100" @click="clearSearch">{{ t('shareMailbox.clearSearch') }}</button>
      <div v-if="selectedBatchKeys.length" class="ml-auto flex flex-wrap items-center gap-3">
        <span class="whitespace-nowrap text-sm text-gray-600">{{ t('shareMailbox.selectedBatchCount', { count: selectedBatchKeys.length }) }}</span>
        <button type="button" class="rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50" :disabled="deletingShares || loadingShares" @click="confirmBatchDeletion(selectedBatches)">{{ t('shareMailbox.batchDelete') }}</button>
      </div>
    </div>
    <AdminDataTable class="min-h-0 flex-1" :loading="loadingShares" :pagination="{ page: sharePage, pages: Math.max(1, Math.ceil(totalBatches / pageSize)), total: totalBatches, limit: pageSize }" :show-page-size-selector="false" :column-count="8" table-class="w-full min-w-[1120px] sm:min-w-[1120px] table-fixed" :fill-empty-height="!managedBatches.length" @page-change="loadShares">
      <template #thead>
        <tr>
          <th class="w-[4%] px-3 py-3 text-left"><input type="checkbox" class="h-4 w-4 accent-primary-600" :aria-label="t('shareMailbox.selectBatchPage')" :checked="allPageSelected" :disabled="!managedBatches.length || deletingShares || loadingShares" @change="togglePageSelection($event.target.checked)" /></th>
          <th class="w-[27%] px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.batchColumn') }}</th>
          <th class="w-[8%] px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.typeColumn') }}</th>
          <th class="w-[7%] px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.linkCountColumn') }}</th>
          <th class="w-[16%] px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.createdAtColumn') }}</th>
          <th class="w-[17%] px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.validityColumn') }}</th>
          <th class="w-[11%] px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.statusColumn') }}</th>
          <th class="sticky right-0 z-20 w-[10%] bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-600">{{ t('shareMailbox.actionColumn') }}</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="loadError"><td colspan="8" class="px-6 py-12 text-center text-sm text-red-600">{{ loadError }} <button type="button" class="ml-2 font-medium text-primary-700 hover:underline" @click="loadShares(sharePage)">{{ t('common.retry') }}</button></td></tr>
        <tr v-else-if="!managedBatches.length"><td colspan="8" class="px-6 py-12 text-center text-sm text-gray-500">{{ activeSearch ? t('shareMailbox.noSearchResults') : t('shareMailbox.noShares') }}</td></tr>
        <tr v-for="batch in loadError ? [] : managedBatches" :key="batch.batch_key" class="group hover:bg-gray-50">
          <td class="px-3 py-3"><input type="checkbox" class="h-4 w-4 accent-primary-600" :aria-label="t('shareMailbox.selectBatch', { title: batchTitle(batch) })" :checked="selectedBatchKeys.includes(batch.batch_key)" :disabled="deletingShares || loadingShares" @change="toggleBatchSelection(batch.batch_key, $event.target.checked)" /></td>
          <td class="px-4 py-3 text-sm">
            <p class="truncate font-medium text-gray-900" :title="batchTitle(batch)">{{ batchTitle(batch) }}</p>
            <p class="mt-1 truncate text-xs text-gray-500" :title="mailboxAddresses(batch).join('、')">{{ mailboxSummary(batch) }}</p>
          </td>
          <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{{ batch.miniapp_path ? t('shareMailbox.miniappShare') : t('shareMailbox.webShare') }}</td>
          <td class="px-4 py-3 text-sm text-gray-700">{{ batch.link_count }}</td>
          <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{{ formatShareDate(batch.created_at) }}</td>
          <td class="px-4 py-3 text-xs text-gray-600"><span class="block truncate" :title="batchValidity(batch)">{{ batchValidity(batch) }}</span></td>
          <td class="px-4 py-3 text-sm">
            <span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium" :class="!batch.active_count ? 'bg-red-50 text-red-700' : batch.awaiting_count === batch.link_count ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'">{{ !batch.active_count ? t('shareMailbox.expired') : batch.awaiting_count === batch.link_count ? t('shareMailbox.awaitingFirstOpen') : t('shareMailbox.active') }}</span>
            <p v-if="batch.active_count && batch.active_count < batch.link_count" class="mt-1 text-xs text-gray-500">{{ t('shareMailbox.activeLinkCount', { count: batch.active_count }) }}</p>
          </td>
          <td class="sticky right-0 z-[1] whitespace-nowrap bg-white px-4 py-3 text-sm group-hover:bg-gray-50"><div class="flex items-center gap-1">
            <ActionButton icon="eye" variant="view" :tooltip="t('shareMailbox.viewBatchLinks')" @click="openPreview(batch)" />
            <ActionButton icon="delete" variant="delete" :tooltip="t('shareMailbox.deleteBatch')" :disabled="deletingShares || loadingShares" @click="confirmBatchDeletion([batch])" />
          </div></td>
        </tr>
      </template>
    </AdminDataTable>

    <Dialog :open="Boolean(previewBatch)" :initial-focus="previewCloseButton" class="relative z-[200]" @close="previewBatch = null">
      <div class="fixed inset-0 bg-gray-900/40" aria-hidden="true" />
      <div class="fixed inset-0 flex items-center justify-center p-3 sm:p-6">
        <DialogPanel v-if="previewBatch" class="flex h-[42rem] max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:max-h-[calc(100dvh-3rem)]">
          <DialogTitle class="sr-only">{{ t('shareMailbox.viewBatchLinks') }}</DialogTitle>
          <header class="shrink-0 border-b border-gray-200 px-4 py-3 sm:px-6">
            <div class="flex items-start gap-4">
              <ShareNoteEditor class="min-w-0 flex-1" :model-value="previewBatch.batch_title" :placeholder="batchTitle(previewBatch)" :label="t('shareMailbox.batchNote')" variant="heading" :max-length="100" :save-note="(value) => saveBatchNote(previewBatch, value)" />
              <button ref="previewCloseButton" type="button" :aria-label="t('common.close')" class="-mr-1 -mt-1 shrink-0 rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500" @click="previewBatch = null"><BaseIcon name="x" size="h-5 w-5" /></button>
            </div>
            <p class="mt-2 text-xs text-gray-400">{{ t('shareMailbox.createdAtColumn') }} {{ formatShareDate(previewBatch.created_at) }}</p>
          </header>
          <div ref="previewScroll" class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div class="share-preview-columns sticky top-0 z-10 hidden border-b border-gray-100 bg-gray-50 px-6 py-2 text-xs font-medium text-gray-500 lg:grid" aria-hidden="true">
              <span>#</span><span>{{ t(previewBatch.miniapp_path ? 'shareMailbox.miniappPath' : 'shareMailbox.linkAddress') }}</span><span>{{ t('shareMailbox.noteColumn') }}</span><span>{{ t('shareMailbox.sourceColumn') }}</span><span class="text-center">{{ t('shareMailbox.openCountColumn') }}</span><span>{{ t('shareMailbox.statusAndValidity') }}</span><span class="text-right">{{ t('shareMailbox.actionColumn') }}</span>
            </div>
            <div class="divide-y divide-gray-100">
              <div v-for="(share, index) in previewShares" :key="share.id" class="share-preview-columns share-preview-row px-4 py-2.5 transition-colors hover:bg-gray-50/70 sm:px-6">
                <span class="share-row-number pt-0.5 text-xs tabular-nums text-gray-400">{{ String(previewOffset + index + 1).padStart(2, '0') }}</span>
                <div class="share-row-link min-w-0">
                  <input :aria-label="t(share.miniapp_path ? 'shareMailbox.miniappPath' : 'shareMailbox.linkAddress') + ' ' + (previewOffset + index + 1)" :title="shareLink(share)" :value="shareLink(share)" readonly class="block w-full min-w-0 truncate rounded-sm border-0 bg-transparent p-0 font-mono text-xs leading-5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-300" @focus="$event.target.select()" />
                  <ShareMailboxScope v-if="hasDistinctMailboxScope(share)" class="mt-1" :mailboxes="mailboxAddresses(share)" :label="t('shareMailbox.linkMailboxes', { index: previewOffset + index + 1 })" compact />
                </div>
                <ShareNoteEditor class="share-row-note min-w-0" :model-value="share.link_note" :label="t('shareMailbox.linkNote', { index: previewOffset + index + 1 })" :save-note="(value) => saveLinkNote(share, value)" />
                <div class="share-row-source whitespace-nowrap text-xs text-gray-600">
                  <span class="mr-1.5 text-gray-400 lg:hidden">{{ t('shareMailbox.sourceColumn') }}</span>{{ t(share.miniapp_path ? 'shareMailbox.miniappShare' : 'shareMailbox.webShare') }}
                </div>
                <div class="share-row-count text-xs lg:text-center">
                  <span class="mr-1.5 text-gray-400 lg:hidden">{{ t('shareMailbox.openCountColumn') }}</span>
                  <output class="font-medium tabular-nums text-gray-700" :aria-label="`${t('shareMailbox.openCountColumn')} ${previewOffset + index + 1}`">{{ share.open_count || 0 }}</output>
                </div>
                <div class="share-row-status flex min-w-0 items-center gap-2">
                  <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" :class="isShareExpired(share) ? 'bg-red-50 text-red-700' : 'bg-green-100 text-green-700'"><span class="h-1.5 w-1.5 rounded-full bg-current" />{{ isShareExpired(share) ? t('shareMailbox.expired') : t('shareMailbox.active') }}</span>
                  <span class="min-w-0 truncate rounded-full px-2 py-0.5 text-xs font-medium" :class="isShareExpired(share) ? 'bg-red-50 text-red-700' : share.expire_at || share.expire_mode === 'minutes' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'" :title="shareValidity(share)">{{ shareValidity(share) }}</span>
                </div>
                <div class="share-row-actions flex items-center justify-end gap-1">
                  <a v-if="share.share_url && !isShareExpired(share)" :href="shareLink(share)" target="_blank" rel="noopener noreferrer" :aria-label="t('shareMailbox.openLink')" :title="t('shareMailbox.openLink')" class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500" @click="openShareLink($event, share)"><ArrowTopRightOnSquareIcon class="h-4 w-4" aria-hidden="true" /></a>
                  <ActionButton v-if="!isShareExpired(share)" icon="copy" variant="copy" :tooltip="share.miniapp_path ? t('shareMailbox.copyPath') : t('shareMailbox.copyLink')" @click="copyText(shareLink(share))" />
                  <ActionButton icon="delete" variant="delete" :tooltip="t('shareMailbox.deleteRecord')" @click="confirmLinkDeletion(share)" />
                </div>
              </div>
            </div>
          </div>
          <footer class="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-200 bg-gray-50/60 px-4 py-2.5 sm:px-6">
            <AdminPagination class="share-detail-pagination w-full min-w-0 sm:flex-1" :current-page="previewPage" :total-pages="previewTotalPages" :total="previewBatch.shares.length" :page-size="previewPageSize" :show-page-size-selector="false" :show-page-numbers="false" @page-change="changePreviewPage" />
            <button type="button" :title="t('shareMailbox.copyActiveLinksHint')" class="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!copyableLinks(previewBatch).length" @click="copyBatchLinks(previewBatch)"><BaseIcon name="copy" size="h-4 w-4" />{{ t('shareMailbox.copyBatchCount', { count: copyableLinks(previewBatch).length }) }}</button>
          </footer>
        </DialogPanel>
      </div>
    </Dialog>

    <ConfirmDialog :visible="Boolean(pendingDeletion)" :title="confirmTitle" :message="confirmMessage" :confirm-text="confirmTitle" :cancel-text="t('common.cancel')" :loading="deletingShares" :show-warning="false" @confirm="deleteShares" @cancel="cancelDeletion" />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'
import { useI18n } from 'vue-i18n'
import { mailboxShareAPI } from '@/api/mailboxShare'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import AdminPagination from '@/components/AdminPagination/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseIcon from '@/components/BaseIcon/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import ShareNoteEditor from '@/components/Mail/ShareNoteEditor.vue'
import ShareMailboxScope from '@/components/Mail/ShareMailboxScope.vue'
import { isTauri } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { showMessage } from '@/utils/message'

const pageSize = 20
const { t } = useI18n()
const userStore = useUserStore()
const guestMode = computed(() => !userStore.isAuthenticated)
const managedBatches = ref([])
const loadingShares = ref(false)
const loadError = ref('')
const sharePage = ref(1)
const totalBatches = ref(0)
const searchInput = ref('')
const activeSearch = ref('')
const selectedBatchKeys = ref([])
const selectedBatches = computed(() => managedBatches.value.filter((batch) => selectedBatchKeys.value.includes(batch.batch_key)))
const allPageSelected = computed(() => managedBatches.value.length > 0 && selectedBatchKeys.value.length === managedBatches.value.length)
const previewBatch = ref(null)
const previewCloseButton = ref(null)
const previewPageSize = 10
const previewPage = ref(1)
const previewScroll = ref(null)
const previewTotalPages = computed(() => Math.max(1, Math.ceil((previewBatch.value?.shares.length || 0) / previewPageSize)))
const previewOffset = computed(() => (previewPage.value - 1) * previewPageSize)
const previewShares = computed(() => previewBatch.value?.shares.slice(previewOffset.value, previewOffset.value + previewPageSize) || [])
const changePreviewPage = (page) => {
  previewPage.value = Math.max(1, Math.min(page, previewTotalPages.value))
  if (previewScroll.value) previewScroll.value.scrollTop = 0
}
const openPreview = (batch) => { previewPage.value = 1; previewBatch.value = batch }
watch(() => previewBatch.value?.shares.length, () => {
  if (previewBatch.value) changePreviewPage(previewPage.value)
})
const pendingDeletion = ref(null)
const resumePreviewKey = ref('')
const deletingShares = ref(false)
const mailboxAddresses = (scope) => {
  const addresses = scope.mailbox_emails?.filter(Boolean) || []
  return [...new Set(addresses.length ? addresses : String(scope.mailbox_ids || '').split(',').map((id) => id.trim()).filter(Boolean).map((id) => `#${id}`))]
}
const previewMailboxAddresses = computed(() => previewBatch.value ? mailboxAddresses(previewBatch.value) : [])
const hasDistinctMailboxScope = (share) => mailboxAddresses(share).sort().join('\n') !== [...previewMailboxAddresses.value].sort().join('\n')
const mailboxSummary = (scope) => {
  const addresses = mailboxAddresses(scope)
  return addresses.length > 1 ? `${t('shareMailbox.scopeMailboxCount', { count: addresses.length })} · ${addresses[0]}` : addresses[0] || '-'
}
const batchTitle = (batch) => batch.batch_title?.trim() || t('shareMailbox.untitledBatch')
const shareLink = (share) => share.miniapp_path || (share.share_url ? `${isTauri() ? 'https://zjkdongao.cn' : window.location.origin}${share.share_url}` : '')
const isShareExpired = (share) => share.status !== 'active' || Boolean(share.expire_at && new Date(share.expire_at).getTime() <= Date.now())
const copyableLinks = (batch) => batch.shares.filter((share) => !isShareExpired(share)).map(shareLink).filter(Boolean)
const formatShareDate = (value) => value ? new Date(value).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'
const shareValidity = (share) => share.expire_at ? formatShareDate(share.expire_at) : share.expire_mode === 'minutes' ? (share.expire_minutes ? t('shareMailbox.firstOpenMinutes', { count: share.expire_minutes }) : t('shareMailbox.waitingFirstOpen')) : t('shareMailbox.permanentValid')
const batchValidity = (batch) => batch.expire_mode === 'minutes' && batch.expire_start_mode === 'first_opened' ? t('shareMailbox.firstOpenMinutes', { count: batch.expire_minutes }) : shareValidity(batch)
const confirmTitle = computed(() => pendingDeletion.value?.kind === 'batches' ? t(pendingDeletion.value.items.length > 1 ? 'shareMailbox.batchDelete' : 'shareMailbox.deleteBatch') : t('shareMailbox.deleteRecord'))
const confirmMessage = computed(() => pendingDeletion.value?.kind === 'batches' ? t('shareMailbox.deleteBatchesConfirm', { count: pendingDeletion.value.items.length, links: pendingDeletion.value.items.reduce((total, batch) => total + batch.link_count, 0) }) : t('shareMailbox.deleteRecordConfirm'))
const toggleBatchSelection = (key, checked) => { selectedBatchKeys.value = checked ? [...selectedBatchKeys.value, key] : selectedBatchKeys.value.filter((item) => item !== key) }
const togglePageSelection = (checked) => { selectedBatchKeys.value = checked ? managedBatches.value.map((batch) => batch.batch_key) : [] }
const handleSearch = () => { activeSearch.value = searchInput.value.trim(); loadShares(1) }
const clearSearch = () => { searchInput.value = ''; activeSearch.value = ''; loadShares(1) }

const saveBatchNote = async (batch, value) => {
  const res = await mailboxShareAPI.updateBatchNote(batch.batch_key, value, guestMode.value)
  if (res.code !== 0) throw new Error(res.message || t('shareMailbox.noteSaveFailed'))
  batch.batch_title = res.data.batch_title
  batch.shares.forEach((share) => { share.batch_title = res.data.batch_title })
  showMessage(t('shareMailbox.noteSaved'), 'success')
}
const saveLinkNote = async (share, value) => {
  const res = await mailboxShareAPI.updateLinkNote(share.id, value, guestMode.value)
  if (res.code !== 0) throw new Error(res.message || t('shareMailbox.noteSaveFailed'))
  share.link_note = res.data.link_note
  showMessage(t('shareMailbox.noteSaved'), 'success')
}

const loadShares = async (page = 1) => {
  loadingShares.value = true
  loadError.value = ''
  try {
    const res = await mailboxShareAPI.getMyShareBatches(page, pageSize, guestMode.value, activeSearch.value)
    if (res.code !== 0) throw new Error(res.message || t('shareMailbox.loadFailed'))
    totalBatches.value = Number(res.data?.pagination?.total || 0)
    const lastPage = Math.max(1, Math.ceil(totalBatches.value / pageSize))
    if (page > lastPage) return await loadShares(lastPage)
    managedBatches.value = res.data?.batches || []
    selectedBatchKeys.value = []
    sharePage.value = page
  } catch (error) {
    loadError.value = error?.message || t('shareMailbox.loadFailed')
  } finally {
    loadingShares.value = false
  }
}
const copyText = async (text) => {
  try { await navigator.clipboard.writeText(text); showMessage(t('shareMailbox.copied'), 'success') }
  catch { showMessage(t('common.copyFailed'), 'error') }
}
const copyBatchLinks = (batch) => {
  const links = copyableLinks(batch)
  if (links.length) return copyText(links.join('\n'))
}
const openShareLink = async (event, share) => {
  if (!isTauri()) return
  event.preventDefault()
  try { const { open } = await import('@tauri-apps/plugin-shell'); await open(shareLink(share)) }
  catch { showMessage(t('shareMailbox.openLinkFailed'), 'error') }
}
const confirmBatchDeletion = (batches) => { pendingDeletion.value = { kind: 'batches', items: batches } }
const confirmLinkDeletion = (share) => {
  resumePreviewKey.value = previewBatch.value.batch_key
  previewBatch.value = null
  pendingDeletion.value = { kind: 'link', items: [share] }
}
const restorePreview = () => {
  if (resumePreviewKey.value) previewBatch.value = managedBatches.value.find((batch) => batch.batch_key === resumePreviewKey.value) || null
  resumePreviewKey.value = ''
}
const cancelDeletion = () => { if (!deletingShares.value) { pendingDeletion.value = null; restorePreview() } }
const deleteShares = async () => {
  const action = pendingDeletion.value
  if (!action || deletingShares.value) return
  deletingShares.value = true
  try {
    const res = action.kind === 'batches' ? await mailboxShareAPI.deleteShareBatches(action.items.map((batch) => batch.batch_key), guestMode.value) : await mailboxShareAPI.deleteShare(action.items[0].id, guestMode.value)
    if (res.code !== 0) throw new Error(res.message || t('shareMailbox.deleteRecordFailed'))
    showMessage(t(action.kind === 'batches' ? 'shareMailbox.batchesDeleted' : 'shareMailbox.recordDeleted', { count: action.items.length }), 'success')
    await loadShares(sharePage.value)
  } catch (error) {
    showMessage(error?.message || t('shareMailbox.deleteRecordFailed'), 'error')
  } finally {
    deletingShares.value = false
    pendingDeletion.value = null
    restorePreview()
  }
}
onMounted(() => loadShares())
</script>

<style scoped>
.share-preview-row {
  display: grid;
  grid-template-columns: 1.25rem minmax(0, 1fr) auto;
  grid-template-areas: 'number link actions' '. source count' '. status status' '. note note';
  column-gap: 0.5rem;
  row-gap: 0.625rem;
  align-items: start;
}
.share-row-number { grid-area: number; }
.share-row-link { grid-area: link; }
.share-row-note { grid-area: note; }
.share-row-count { grid-area: count; }
.share-row-source { grid-area: source; }
.share-detail-pagination { border: 0; padding: 0; }
.share-row-status { grid-area: status; }
.share-row-actions { grid-area: actions; }
@media (min-width: 1024px) {
  .share-preview-columns {
    grid-template-columns: 1.25rem minmax(0, 1.4fr) minmax(0, 0.8fr) 3.5rem 3.5rem minmax(0, 1.2fr) 5.5rem;
    column-gap: 0.75rem;
  }
  .share-preview-row {
    grid-template-areas: 'number link note source count status actions';
    align-items: center;
  }
}
</style>
