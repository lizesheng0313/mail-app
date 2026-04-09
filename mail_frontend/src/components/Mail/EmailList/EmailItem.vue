<template>
  <div
    class="group p-3 bg-gray-50 rounded-lg hover:bg-primary-100 transition-colors cursor-pointer relative"
    :class="{ 'bg-primary-100': isSelected || isChecked }"
    @click="handleClick"
  >
    <div class="flex items-start justify-between">
      <div class="flex items-start flex-1 min-w-0">
        <!-- 未读标记 -->
        <span
          v-if="!isRead && !batchMode"
          class="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5 mr-2"
          title="未读邮件"
        ></span>
        
        <!-- 复选框（批量模式） -->
        <input
          v-if="batchMode"
          type="checkbox"
          :checked="isChecked"
          @click.stop="$emit('toggle-check')"
          class="w-4 h-4 cursor-pointer mr-3 mt-1 flex-shrink-0"
        />
        
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <p class="text-sm font-medium text-black truncate" :class="{ 'font-bold': !isRead }">
              {{ subject || '(无主题)' }}
            </p>
            <span
              v-if="isJunkEmail"
              class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200"
            >
              垃圾邮件
            </span>
            <span
              v-if="isBounceEmail"
              class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-rose-100 text-rose-700 border border-rose-200"
            >
              退信
            </span>
          </div>
          <p class="text-sm text-gray-600 truncate mt-1">
            {{ isBounceEmail && email?.bounce_reason ? `退信原因：${email.bounce_reason}` : `发件人：${email.from_addr}` }}
          </p>
          <p class="text-xs text-gray-400 mt-1">
            {{ formatDate(date) }}
          </p>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="ml-2 opacity-0 group-hover:opacity-100 transition-opacity" v-if="!batchMode">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  subject: string
  sender: string
  date: number
  email?: any
  isRead?: boolean
  isSelected?: boolean
  isChecked?: boolean
  batchMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isRead: false,
  isSelected: false,
  isChecked: false,
  batchMode: false
})

defineEmits<{
  'click': []
  'toggle-check': []
}>()

const formatDate = (timestamp: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

const handleClick = () => {
  // 点击事件由父组件处理
}

const isJunkEmail = computed(() => {
  if (Boolean(props.email?.is_spam)) {
    return true
  }
  const folder = String(props.email?.folder || '').toLowerCase()
  if (folder.includes('junk') || folder.includes('spam') || folder.includes('垃圾') || folder.includes('废件')) {
    return true
  }
  const subject = String(props.email?.subject || props.subject || '')
  return (
    subject.startsWith('[垃圾邮件]') ||
    subject.startsWith('【垃圾邮件】') ||
    subject.startsWith('[垃圾箱]') ||
    subject.startsWith('【垃圾箱】')
  )
})

const isBounceEmail = computed(() => {
  if (Boolean(props.email?.is_bounce)) {
    return true
  }
  const sender = String(props.email?.from_addr || '').toLowerCase()
  const subject = String(props.email?.subject || props.subject || '').toLowerCase()
  return (
    sender.includes('mailer-daemon') ||
    sender.includes('postmaster') ||
    subject.includes('undeliverable') ||
    subject.includes('delivery failed') ||
    subject.includes('returned mail') ||
    subject.includes('退信') ||
    subject.includes('投递失败')
  )
})
</script>
