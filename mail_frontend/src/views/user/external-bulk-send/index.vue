<template>
  <div class="flex h-full min-h-0 gap-4">
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
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import ExternalMailboxList from '@/components/Mail/ExternalMailbox/MailboxList.vue'
import SendEmailPanel from '@/components/Mail/SendEmailPanel.vue'
import smtpAccountsAPI from '@/api/smtpAccounts'

const smtpAccounts = ref<any[]>([])
const selectedMailboxIds = ref<number[]>([])
const sendEmailPanelRef = ref<any>(null)
const externalMailboxListRef = ref<any>(null)

const DRAFT_STORAGE_KEY = 'external-bulk-send-draft'

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
