<template>
  <div class="h-full flex flex-col">
    <div class="border-b border-gray-200 pb-4 mb-4">
      <h2 class="text-base font-semibold text-black">{{ t('mail.myMailbox') }}</h2>
    </div>
    
    <div v-if="mailboxStore.loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <span class="ml-2 text-gray-600">{{ t('mail.loadingTempMailbox') }}</span>
    </div>
    
    <div v-else-if="mailboxStore.tempMailbox" class="bg-primary-50 p-4 rounded-lg">
      <h3 class="text-primary-800 font-medium mb-2">{{ t('mail.yourTempMailbox') }}</h3>
      <div class="bg-primary-100 flex items-center justify-between px-3 py-2 rounded">
        <code class="text-primary-800 text-sm break-all flex-1">{{ mailboxStore.tempMailbox.email }}</code>
        <ActionButton 
          icon="copy" 
          variant="copy"
          :tooltip="t('mail.copyMailboxAddress')"
          @click="copy(mailboxStore.tempMailbox.email)" 
        />
      </div>
      <p class="text-primary-700 text-xs mt-2">
        {{ t('mail.expiresAt', { date: formatDate(mailboxStore.tempMailbox.expires_at) }) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMailboxStore } from '@/stores/auth'
import { useMailStore } from '@/stores/mail'
import { mailboxAPI } from '@/api/mailbox'
import ActionButton from '@/components/ActionButton/index.vue'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils'

const { t } = useI18n()
const mailboxStore = useMailboxStore()
const mailStore = useMailStore()

// 自动获取临时邮箱和邮件
onMounted(async () => {
  if (!mailboxStore.tempMailbox) {
    const result = await mailboxStore.getTempMailbox()
    if (result.success && mailboxStore.tempMailbox?.id) {
      // 使用临时邮箱专用 API 获取邮件
      try {
        const res = await mailboxAPI.getTempMailboxEmails(mailboxStore.tempMailbox.id)
        if (res.code === 0 && res.data) {
          mailStore.emails = res.data.emails || []
        }
      } catch (e) {
        console.error('获取邮件失败:', e)
      }
    }
  }
})

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
