<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <!-- 标题栏 -->
        <div class="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900">{{ t('shareMailbox.title') }}</h3>
          </div>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="p-6">
          <div class="space-y-6">
      <!-- 已选择的邮箱 -->
      <div>
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
          <label class="text-sm font-semibold text-gray-700">
            {{ t('shareMailbox.selectedMailboxes', { count: mailboxIds.length }) }}
          </label>
        </div>
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 max-h-40 overflow-y-auto border border-gray-200">
          <div v-for="(mailbox, index) in selectedMailboxes" :key="index" class="flex items-center gap-2 py-2">
            <div class="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0"></div>
            <code class="text-sm text-gray-700 font-medium">{{ mailbox.email }}</code>
          </div>
        </div>
      </div>

      <!-- 有效期选择 -->
      <div>
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <label class="text-sm font-semibold text-gray-700">
            {{ t('shareMailbox.expireDays') }}
          </label>
        </div>
        <div class="grid grid-cols-4 gap-3">
          <button
            v-for="option in expireOptions"
            :key="option.value"
            @click="selectedExpireDays = option.value"
            :class="[
              'px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all duration-200',
              selectedExpireDays === option.value
                ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-200 scale-105'
                : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:shadow-md'
            ]"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- 分享链接（创建后显示） -->
      <div v-if="shareUrl" class="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5 animate-fade-in">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <label class="text-sm font-semibold text-green-800">
            {{ t('shareMailbox.linkGenerated') }}
          </label>
        </div>
        <div class="flex items-center gap-2 mb-3">
          <input
            type="text"
            :value="fullShareUrl"
            readonly
            class="flex-1 px-4 py-2.5 border-2 border-green-300 rounded-lg text-sm bg-white text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            @click="copyShareUrl"
            class="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            {{ t('common.copy') }}
          </button>
        </div>
        <div class="flex items-center gap-2 text-xs text-green-700 mt-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>{{ expireText }}</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          @click="$emit('close')"
          class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
        >
          {{ shareUrl ? t('common.close') : t('common.cancel') }}
        </button>
        <button
          v-if="!shareUrl"
          @click="handleCreateShare"
          :disabled="creating"
          class="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
        >
          <svg v-if="!creating" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
          </svg>
          <svg v-else class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ creating ? t('shareMailbox.creating') : t('shareMailbox.create') }}
        </button>
      </div>
    </div>
  </div>
</div>
</div>
</Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { mailboxShareAPI } from '@/api/mailboxShare'
import { isTauri } from '@/services/api'
import { showMessage } from '@/utils/message'
import { getCurrentLocale } from '@/i18n'

const props = defineProps({
  visible: Boolean,
  mailboxIds: {
    type: Array,
    required: true
  },
  mailboxType: {
    type: String,
    required: true // 'system' or 'external'
  },
  selectedMailboxes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'success'])
const { t } = useI18n()

// 有效期选项
const expireOptions = computed(() => ([
  { label: t('shareMailbox.day1'), value: 1 },
  { label: t('shareMailbox.day7'), value: 7 },
  { label: t('shareMailbox.day30'), value: 30 },
  { label: t('common.permanent'), value: 0 }
]))

const selectedExpireDays = ref(7) // 默认7天
const creating = ref(false)
const shareUrl = ref('')
const expireAt = ref(null)

// 完整分享链接
const fullShareUrl = computed(() => {
  if (!shareUrl.value) return ''
  // 桌面端用线上地址，保证分享链接可被外部访问
  const origin = isTauri() ? 'https://zjkdongao.cn' : window.location.origin
  return `${origin}${shareUrl.value}`
})

// 过期时间文本
const expireText = computed(() => {
  if (!expireAt.value) return t('shareMailbox.permanentValid')
  const date = new Date(expireAt.value)
  return t('shareMailbox.validUntil', { date: date.toLocaleString(getCurrentLocale()) })
})

// 创建分享
const handleCreateShare = async () => {
  if (props.mailboxIds.length === 0) {
    showMessage(t('shareMailbox.selectMailboxWarning'), 'warning')
    return
  }

  creating.value = true
  try {
    const res = await mailboxShareAPI.createShare({
      mailbox_ids: props.mailboxIds,
      mailbox_type: props.mailboxType,
      expire_days: selectedExpireDays.value
    })

    if (res.code === 0) {
      shareUrl.value = res.data.share_url
      expireAt.value = res.data.expire_at
      showMessage(t('shareMailbox.createSuccess'), 'success')
      emit('success', res.data)
    } else {
      showMessage(res.message || t('shareMailbox.createFailed'), 'error')
    }
  } catch (error) {
    console.error('创建分享失败:', error)
    showMessage(t('shareMailbox.createFailed'), 'error')
  } finally {
    creating.value = false
  }
}

// 复制分享链接
const copyShareUrl = () => {
  navigator.clipboard.writeText(fullShareUrl.value)
  showMessage(t('shareMailbox.copied'), 'success')
}

// 监听弹窗关闭，重置状态
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    // 弹窗关闭时重置状态
    setTimeout(() => {
      selectedExpireDays.value = 7
      shareUrl.value = ''
      expireAt.value = null
      creating.value = false
    }, 300)
  }
})
</script>


<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
</style>
