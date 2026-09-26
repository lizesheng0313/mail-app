<template>
  <div v-if="mailboxStore.loading" class="flex h-full flex-col">
    <div class="guest-mailbox-loading-header mb-3 flex items-center justify-between border-b border-gray-200 pb-3">
      <div>
        <h2 class="text-base font-semibold text-black">{{ t('home.temporaryMailbox') }}</h2>
        <p class="mt-1 text-xs text-gray-500">{{ guestMailboxQuotaText }}</p>
      </div>
      <slot name="header-actions"></slot>
    </div>
    <div class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <span class="ml-2 text-gray-600">{{ t('mail.loadingTempMailbox') }}</span>
    </div>
  </div>

  <MailboxList
    v-else
    :title="t('home.temporaryMailbox')"
    :subtitle="guestMailboxQuotaText"
    :empty-text="guestQuotaReached ? t('mail.guestMailboxNoAvailableToday') : t('mail.noMailbox')"
    :mailboxes="mailboxStore.guestMailboxes"
    :selected-id="mailboxStore.tempMailbox?.id || null"
    :hide-default-batch-action="true"
  >
    <template #header-actions>
      <slot name="header-actions"></slot>
    </template>

    <template #content="{ mailboxes }">
      <MailboxCard
        v-for="mailbox in mailboxes"
        :key="mailbox.id"
        :card-class="[
          'cursor-pointer transition-colors',
          Number(mailboxStore.tempMailbox?.id) === Number(mailbox.id)
            ? 'bg-primary-100 border-primary-200'
            : 'bg-gray-50 hover:bg-primary-100'
        ]"
        :address="mailbox.email"
        :created-label="t('common.createdAt')"
        :created-text="mailbox.created_at ? formatDate(mailbox.created_at) : ''"
        :expires-label="t('common.expiresAtLabel')"
        :expires-text="formatDate(mailbox.expires_at)"
        :action-menu-title="t('systemMailbox.moreActions')"
        :actions="mailboxActions"
        @click="selectMailbox(mailbox)"
        @action="handleMailboxAction($event, mailbox)"
      />
    </template>
  </MailboxList>

  <ConfirmDialog
    :visible="Boolean(pendingDeleteMailbox)"
    :title="t('systemMailbox.deleteTitle')"
    :message="t('systemMailbox.deleteSingleMessage')"
    :loading="deletingMailbox"
    @confirm="confirmDeleteMailbox"
    @cancel="pendingDeleteMailbox = null"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMailboxStore } from '@/stores/auth'
import { useMailStore } from '@/stores/mail'
import { mailboxAPI } from '@/api/mailbox'
import MailboxList from '@/components/Mail/MailboxList/MailboxList.vue'
import MailboxCard from '@/components/Mail/MailboxList/MailboxCard.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils'
import {
  countGuestMailboxesCreatedToday,
  GUEST_MAILBOX_DAILY_LIMIT
} from '@/utils/guestMailboxes'

const { t } = useI18n()
const emit = defineEmits<{ select: []; share: [mailboxes: any[]]; deleted: [ids: number[]] }>()
const mailboxStore = useMailboxStore()
const mailStore = useMailStore()
const pendingDeleteMailbox = ref<any | null>(null)
const deletingMailbox = ref(false)
const guestMailboxesCreatedToday = computed(() =>
  Math.max(
    mailboxStore.guestDailyUsed ?? 0,
    countGuestMailboxesCreatedToday(mailboxStore.guestMailboxes)
  )
)
const guestQuotaReached = computed(() => guestMailboxesCreatedToday.value >= GUEST_MAILBOX_DAILY_LIMIT)
const guestMailboxQuotaText = computed(() =>
  t('mail.guestMailboxQuota', { count: guestMailboxesCreatedToday.value, limit: GUEST_MAILBOX_DAILY_LIMIT })
)
const mailboxActions = computed(() => [
  {
    id: 'copy',
    label: t('systemMailbox.copyMailbox'),
    icon: 'copy'
  },
  {
    id: 'share',
    label: t('systemMailbox.shareMailbox'),
    icon: 'share'
  },
  {
    id: 'delete',
    label: t('systemMailbox.deleteMailbox'),
    icon: 'delete',
    tone: 'danger' as const
  }
])

const selectMailbox = (mailbox: any) => {
  mailboxStore.selectGuestMailbox(mailbox)
  emit('select')
}

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

const handleMailboxAction = (actionId: string, mailbox: any) => {
  if (actionId === 'copy') void copy(mailbox.email)
  if (actionId === 'share') emit('share', [mailbox])
  if (actionId === 'delete') pendingDeleteMailbox.value = mailbox
}

const confirmDeleteMailbox = async () => {
  const mailbox = pendingDeleteMailbox.value
  if (!mailbox || deletingMailbox.value) return
  deletingMailbox.value = true
  try {
    const result = await mailboxStore.deleteGuestMailbox(mailbox.id)
    if (!result.success) {
      showMessage(result.error || t('systemMailbox.deleteFailed'), 'error')
      return
    }
    mailStore.clearEmails()
    emit('deleted', [Number(mailbox.id)])
    showMessage(t('systemMailbox.deleteSuccess'), 'success')
    pendingDeleteMailbox.value = null
  } finally {
    deletingMailbox.value = false
  }
}

const formatDate = (date: string | number) => {
  const timestamp = typeof date === 'number' ? date : new Date(date).getTime()
  return formatTimestamp(timestamp, 'date')
}
</script>

<style scoped>
.guest-mailbox-loading-header {
  container: mailbox-header / inline-size;
}

.btn-primary {
  @apply bg-primary-600 hover:bg-primary-700 text-white rounded;
}
</style>
