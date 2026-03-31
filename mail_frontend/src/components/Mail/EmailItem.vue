<template>
  <div
    class="group p-3 bg-gray-50 rounded-lg hover:bg-primary-100 cursor-pointer"
    :class="{ 'bg-primary-100': isSelected || isChecked }"
    @click="handleClick"
  >
    <div class="flex items-start justify-between">
      <div class="flex items-start flex-1 min-w-0">
        <input
          v-if="batchMode"
          type="checkbox"
          :checked="isChecked"
          @click.stop="$emit('toggle')"
          class="w-4 h-4 mr-3 mt-1 cursor-pointer flex-shrink-0"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <p class="text-sm font-medium text-black truncate" :class="{ 'font-bold': !email.is_read }">
              {{ email.subject || t('emailItem.noSubject') }}
            </p>
            <span
              v-if="isJunkEmail(email)"
              class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200"
            >
              {{ t('emailItem.spam') }}
            </span>
          </div>
          <p class="text-xs text-gray-600 mt-1 truncate">{{ t('emailItem.sender') }}{{ email.from_addr }}</p>

          <!-- 附件提示 -->
          <div v-if="email.has_attachments" class="flex items-center gap-1 mt-1">
            <svg class="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span class="text-xs text-blue-500">{{ t('emailItem.attachment') }}</span>
          </div>
          
          <!-- 验证码显示 -->
          <div v-if="email.verification_code" class="mt-2 mb-1">
            <div class="inline-flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md px-3 py-1.5">
              <span class="text-xs font-medium text-green-700">{{ t('emailItem.verificationCode') }}</span>
              <code class="text-base font-bold text-green-900 tracking-wider select-all">
                {{ email.verification_code }}
              </code>
              <ActionButton
                icon="copy"
                variant="success"
                size="xs"
                :tooltip="t('emailItem.copyCode')"
                @click.stop="$emit('copy-code', email.verification_code)"
              />
            </div>
          </div>
          
          <p class="text-xs text-gray-400 mt-1 truncate">{{ formatDate(resolveEmailTimestamp(email)) }}</p>
        </div>
      </div>
      <div class="ml-2 flex items-center space-x-2 flex-shrink-0">
        <div 
          v-if="!batchMode" 
          class="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          @click.stop
        >
          <ActionButton icon="delete" variant="delete" @click="$emit('delete')" />
        </div>
        <span
          v-if="!email.is_read"
          class="inline-block w-2 h-2 bg-primary-600 rounded-full"
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ActionButton from '@/components/ActionButton/index.vue'
import { getCurrentLocale } from '@/i18n'

interface Props {
  email: any
  isSelected: boolean
  isChecked: boolean
  batchMode: boolean
}

const props = defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  'click': []
  'toggle': []
  'delete': []
  'copy-code': [code: string]
}>()

const handleClick = () => {
  if (props.batchMode) {
    emit('toggle')
  } else {
    emit('click')
  }
}

const isJunkEmail = (email: any) => {
  if (Boolean(email?.is_spam)) {
    return true
  }
  const folder = String(email?.folder || '').toLowerCase()
  if (folder.includes('junk') || folder.includes('spam') || folder.includes('垃圾') || folder.includes('废件')) {
    return true
  }
  const subject = String(email?.subject || '')
  return (
    subject.startsWith('[垃圾邮件]') ||
    subject.startsWith('【垃圾邮件】') ||
    subject.startsWith('[垃圾箱]') ||
    subject.startsWith('【垃圾箱】')
  )
}

const resolveEmailTimestamp = (email: any) => {
  const candidates = [email?.received_at, email?.email_date]
  for (const value of candidates) {
    if (value === null || value === undefined || value === '') {
      continue
    }

    const numericValue = Number(value)
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue
    }

    const timestamp = new Date(value).getTime()
    if (!Number.isNaN(timestamp) && timestamp > 0) {
      return timestamp
    }
  }

  return 0
}

const formatDate = (timestamp: number) => {
  // 处理空值、0值或无效时间戳
  if (!timestamp || timestamp <= 0) {
    return t('common.justNow')
  }

  const date = new Date(timestamp)

  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return t('common.unknownTime')
  }

  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  // 处理未来时间（时间戳错误）
  if (diff < 0) {
    return t('common.justNow')
  }

  if (days === 0) {
    return date.toLocaleTimeString(getCurrentLocale(), { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return t('common.yesterday')
  } else if (days < 7) {
    return t('common.daysAgo', { count: days })
  } else {
    return date.toLocaleDateString(getCurrentLocale(), { month: 'short', day: 'numeric' })
  }
}
</script>
