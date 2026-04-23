<template>
  <div class="flex h-full min-h-0 flex-col gap-4">
    <div
      v-if="!isDesktop"
      class="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      <svg class="h-5 w-5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 4h.01M10.29 3.86l-7.5 13A1 1 0 003.65 18h16.7a1 1 0 00.86-1.5l-7.5-13a1 1 0 00-1.72 0z" />
      </svg>
      <span>请在桌面端使用，网页端仅用于查看页面和入口。</span>
    </div>

    <div class="flex min-h-0 gap-4">
      <div class="w-[272px] flex-shrink-0 min-h-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <ExternalMailboxList
          ref="externalMailboxListRef"
          :is-send-email-view="true"
          :selected-send-ids="selectedMailboxIds"
          :smtp-accounts="smtpAccounts"
          @select="handleSelectMailbox"
        />
      </div>

      <div class="min-w-0 flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <SendEmailPanel ref="sendEmailPanelRef" :selected-mailbox-ids="selectedMailboxIds" :page-mode="true" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import ExternalMailboxList from '@/components/Mail/ExternalMailbox/MailboxList.vue'
import SendEmailPanel from '@/components/Mail/SendEmailPanel.vue'
import smtpAccountsAPI from '@/api/smtpAccounts'
import { isTauri } from '@/services/api'

const smtpAccounts = ref<any[]>([])
const selectedMailboxIds = ref<number[]>([])
const sendEmailPanelRef = ref<any>(null)
const externalMailboxListRef = ref<any>(null)

const DRAFT_STORAGE_KEY = 'external-bulk-send-draft'
const isDesktop = isTauri()

const handleExternalSmtpStatusUpdated = async () => {
  await loadSmtpAccounts()
  await externalMailboxListRef.value?.loadAccounts?.()
}

const handleSelectMailbox = (mailbox: number | { id?: number | string | null }) => {
  const normalizedId = Number(
    typeof mailbox === 'object' && mailbox !== null ? mailbox.id : mailbox
  )
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return

  if (selectedMailboxIds.value.includes(normalizedId)) {
    selectedMailboxIds.value = selectedMailboxIds.value.filter((id) => id !== normalizedId)
    return
  }

  selectedMailboxIds.value = [...selectedMailboxIds.value, normalizedId]
}

const loadSmtpAccounts = async () => {
  const response = await smtpAccountsAPI.getAccounts()
  if (response.code === 0) {
    smtpAccounts.value = response.data?.accounts || []
  }
}

const restoreDraft = async () => {
  const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY)
  if (!raw) return

  sessionStorage.removeItem(DRAFT_STORAGE_KEY)

  try {
    const draft = JSON.parse(raw)
    if (draft?.external_mailbox_id) {
      selectedMailboxIds.value = [Number(draft.external_mailbox_id)].filter((id) => Number.isFinite(id) && id > 0)
    }

    await nextTick()
    sendEmailPanelRef.value?.loadDraftFromSent?.(draft)
  } catch (error) {
    console.error('恢复发件草稿失败', error)
  }
}

onMounted(async () => {
  await loadSmtpAccounts()
  await externalMailboxListRef.value?.loadAccounts?.()
  await restoreDraft()
  window.addEventListener('external-smtp-status-updated', handleExternalSmtpStatusUpdated)
})

onBeforeUnmount(() => {
  window.removeEventListener('external-smtp-status-updated', handleExternalSmtpStatusUpdated)
})
</script>
