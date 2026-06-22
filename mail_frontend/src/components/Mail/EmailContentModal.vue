<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-[120] flex items-center justify-center bg-black bg-opacity-50 p-4"
        @click.self="closeModal"
      >
        <div
          class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
          @click.stop
        >
          <!-- 头部 -->
          <div class="flex items-center justify-between gap-3 p-4 border-b border-gray-200">
            <h2 class="min-w-0 flex-1 truncate text-lg font-semibold text-gray-900">
              {{ displaySubject || t('emailDetail.noSubject') }}
            </h2>
            <div class="flex flex-shrink-0 items-center gap-2">
              <button
                v-if="canTranslate"
                type="button"
                class="inline-flex h-8 items-center rounded-full border border-primary-200 px-3 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isTranslatingCurrent"
                @click="showingTranslation ? showOriginal() : translateEmail()"
              >
                {{ showingTranslation ? t('emailDetail.viewOriginal') : (isTranslatingCurrent ? t('emailDetail.translating') : t('emailDetail.translate')) }}
              </button>
              <button
                @click="closeModal"
                class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- 邮件信息 -->
          <div class="p-4 border-b border-gray-200 space-y-2 text-sm">
            <div class="flex">
              <span class="w-20 text-gray-600 flex-shrink-0">{{ t('common.sender') }}:</span>
              <span class="flex-1 text-gray-900">{{ email?.from_addr }}</span>
            </div>
            <div class="flex">
              <span class="w-20 text-gray-600 flex-shrink-0">{{ t('common.recipient') }}:</span>
              <span class="flex-1 text-gray-900">{{ email?.to_addr }}</span>
            </div>
            <div class="flex">
              <span class="w-20 text-gray-600 flex-shrink-0">{{ t('common.time') }}:</span>
              <span class="flex-1 text-gray-900">{{ formatDate(email?.received_at) }}</span>
            </div>
          </div>

          <!-- 邮件内容 -->
          <div class="flex-1 overflow-y-auto p-6">
            <div v-if="showingTranslation && translatedContent" class="whitespace-pre-wrap text-gray-900">
              {{ translatedContent }}
            </div>
            <EmailHtmlRenderer
              v-else-if="hasHtmlContent"
              :html="htmlContent"
              min-height="400px"
            />
            <div v-else-if="hasTextContent" class="whitespace-pre-wrap text-gray-900">{{ textContent }}</div>
            <div v-else class="text-gray-400 text-center py-8">{{ t('emailDetail.emptyContent') }}</div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatTimestamp } from '@/utils/timeUtils'
import EmailHtmlRenderer from '@/components/Mail/EmailHtmlRenderer.vue'
import { useEmailTranslation } from '@/composables/useEmailTranslation'
interface Email {
  id: number
  subject?: string
  sender?: string
  recipient?: string
  received_at?: string | number
  contentHtml?: string
  content?: string
  [key: string]: any
}

interface Props {
  visible: boolean
  email?: Email | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()
const { t } = useI18n()
const emailForTranslation = computed(() => props.email)
const {
  canTranslate,
  displaySubject,
  htmlContent,
  isTranslatingCurrent,
  showOriginal,
  showingTranslation,
  textContent,
  translateEmail,
  translatedContent,
} = useEmailTranslation(emailForTranslation, t)

const closeModal = () => {
  emit('update:visible', false)
}

const formatDate = (dateValue?: string | number) => {
  if (!dateValue) return ''
  
  // 统一转换为毫秒时间戳
  const timestamp = typeof dateValue === 'number' ? dateValue : new Date(dateValue).getTime()
  return formatTimestamp(timestamp, 'datetime')
}

// 检查是否有HTML内容（判断content字段是否包含HTML标签）
const hasHtmlContent = computed(() => {
  if (!props.email) return false
  const html = props.email.contentHtml || props.email.content_html || props.email.content || ''
  const trimmed = html.trim()
  // 检查是否包含HTML标签
  return /<[^>]+>/.test(trimmed)
})

// 检查是否有纯文本内容（不包含HTML标签）
const hasTextContent = computed(() => {
  const trimmed = textContent.value
  return trimmed.length > 0 && !/<[^>]+>/.test(trimmed)
})

</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
