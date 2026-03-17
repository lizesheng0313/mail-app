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
          <p class="text-sm font-medium text-black truncate" :class="{ 'font-bold': !email.is_read }">
            {{ email.subject || '(无主题)' }}
          </p>
          <p class="text-xs text-gray-600 mt-1 truncate">发件人：{{ email.from_addr }}</p>

          <!-- 附件提示 -->
          <div v-if="email.has_attachments" class="flex items-center gap-1 mt-1">
            <svg class="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span class="text-xs text-blue-500">附件</span>
          </div>
          
          <!-- 验证码显示 -->
          <div v-if="email.verification_code" class="mt-2 mb-1">
            <div class="inline-flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md px-3 py-1.5">
              <span class="text-xs font-medium text-green-700">验证码</span>
              <code class="text-base font-bold text-green-900 tracking-wider select-all">
                {{ email.verification_code }}
              </code>
              <ActionButton
                icon="copy"
                variant="success"
                size="xs"
                tooltip="复制验证码"
                @click.stop="$emit('copy-code', email.verification_code)"
              />
            </div>
          </div>
          
          <p class="text-xs text-gray-400 mt-1 truncate">{{ formatDate(email.email_date || email.received_at) }}</p>
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
import ActionButton from '@/components/ActionButton/index.vue'
import { formatRelativeTime } from '@/utils/timeUtils'

interface Props {
  email: any
  isSelected: boolean
  isChecked: boolean
  batchMode: boolean
}

const props = defineProps<Props>()

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

const formatDate = (timestamp: number) => {
  // 处理空值、0值或无效时间戳
  if (!timestamp || timestamp <= 0) {
    return '刚刚'
  }

  const date = new Date(timestamp)

  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return '未知时间'
  }

  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  // 处理未来时间（时间戳错误）
  if (diff < 0) {
    return '刚刚'
  }

  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}
</script>
