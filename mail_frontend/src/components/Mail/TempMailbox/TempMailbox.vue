<template>
  <div class="h-full flex flex-col">
    <div class="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
      <h2 class="text-base font-semibold text-black">{{ t('mail.myMailbox') }}</h2>
      <span class="text-xs text-gray-500">
        {{ t('mail.guestMailboxQuota', { count: guestMailboxesCreatedToday, limit: GUEST_MAILBOX_DAILY_LIMIT }) }}
      </span>
    </div>

    <div v-if="mailboxStore.loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <span class="ml-2 text-gray-600">{{ t('mail.loadingTempMailbox') }}</span>
    </div>
    
    <div v-else-if="mailboxStore.guestMailboxes.length" class="space-y-2 overflow-y-auto">
      <div
        v-for="mailbox in mailboxStore.guestMailboxes"
        :key="mailbox.id"
        role="button"
        tabindex="0"
        :class="[
          'w-full rounded-lg border p-3 text-left transition-colors',
          Number(mailboxStore.tempMailbox?.id) === Number(mailbox.id)
            ? 'border-primary-300 bg-primary-50'
            : 'border-gray-200 bg-white hover:border-primary-200 hover:bg-primary-50/50'
        ]"
        @click="mailboxStore.selectGuestMailbox(mailbox)"
        @keydown.enter="mailboxStore.selectGuestMailbox(mailbox)"
      >
        <div class="flex items-center justify-between gap-2">
          <code class="min-w-0 flex-1 truncate text-sm text-gray-900">{{ mailbox.email }}</code>
          <ActionButton
            icon="copy"
            variant="copy"
            :tooltip="t('mail.copyMailboxAddress')"
            @click.stop="copy(mailbox.email)"
          />
        </div>
        <p class="mt-1 text-xs text-gray-500">
          {{ t('mail.expiresAt', { date: formatDate(mailbox.expires_at) }) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMailboxStore } from '@/stores/auth'
import { useMailStore } from '@/stores/mail'
import { mailboxAPI } from '@/api/mailbox'
import ActionButton from '@/components/ActionButton/index.vue'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils'
import {
  countGuestMailboxesCreatedToday,
  GUEST_MAILBOX_DAILY_LIMIT
} from '@/utils/guestMailboxes'

const { t } = useI18n()
const mailboxStore = useMailboxStore()
const mailStore = useMailStore()
const guestMailboxesCreatedToday = computed(() =>
  countGuestMailboxesCreatedToday(mailboxStore.guestMailboxes)
)

const loadCurrentMailboxEmails = async () => {
  const mailbox = mailboxStore.tempMailbox as any
  if (!mailbox?.id) return
  const mailboxId = Number(mailbox.id)
  try {
    const res: any = await mailboxAPI.getTempMailboxEmails(
      mailboxId,
      {},
      mailbox.claim_token || ''
    )
    if (Number(mailboxStore.tempMailbox?.id) === mailboxId && res.code === 0 && res.data) {
      mailStore.emails = res.data.emails || []
    }
  } catch (e) {
    console.error('获取邮件失败:', e)
  }
}

onMounted(async () => {
  if (!mailboxStore.tempMailbox) {
    await mailboxStore.getTempMailbox()
  }
})

watch(
  () => mailboxStore.tempMailbox?.id,
  () => {
    mailStore.clearEmails()
    void loadCurrentMailboxEmails()
  },
  { immediate: true }
)

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showMessage(t('mail.copied'))
  } catch {
    showMessage(t('mail.copyFailed'), 'error')
  }
}

const formatDate = (date: string | number) => {
  const timestamp = typeof date === 'number' ? date : new Date(date).getTime()
  return formatTimestamp(timestamp, 'date')
}
</script>

<style scoped>
.btn-primary {
  @apply bg-primary-600 hover:bg-primary-700 text-white rounded;
}
</style>
