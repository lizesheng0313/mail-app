<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-[11000] flex items-center justify-center bg-black bg-opacity-50 p-4"
    >
      <div v-if="!shareUrls.length" class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <!-- 标题栏 -->
        <div class="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg
                class="w-6 h-6 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                ></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900">{{ t('shareMailbox.title') }}</h3>
          </div>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="p-6">
          <div class="space-y-6">
            <!-- 已选择的邮箱 -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <svg
                  class="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  ></path>
                </svg>
                <label class="text-sm font-semibold text-gray-700">
                  {{ t('shareMailbox.selectedMailboxes', { count: mailboxIds.length }) }}
                </label>
              </div>
              <div
                class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 max-h-40 overflow-y-auto border border-gray-200"
              >
                <div
                  v-for="(mailbox, index) in selectedMailboxes"
                  :key="index"
                  class="flex items-center gap-2 py-2"
                >
                  <div class="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0"></div>
                  <code class="text-sm text-gray-700 font-medium">{{ mailbox.email }}</code>
                </div>
              </div>
            </div>

            <!-- 有效期选择 -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <svg
                  class="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <label class="text-sm font-semibold text-gray-700">
                  {{ t('shareMailbox.expireMode') }}
                </label>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <button
                  v-for="option in expireModeOptions"
                  :key="option.value"
                  @click="selectedExpireMode = option.value"
                  :class="[
                    'px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all duration-200',
                    selectedExpireMode === option.value
                      ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-200 scale-105'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:shadow-md'
                  ]"
                >
                  {{ option.label }}
                </button>
              </div>
              <div v-if="selectedExpireMode === 'minutes'" class="mt-3 grid grid-cols-2 gap-3">
                <label class="text-sm text-gray-600">
                  {{ t('shareMailbox.minutes') }}
                  <input
                    v-model.number="expireMinutes"
                    type="number"
                    min="1"
                    class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>
                <label class="text-sm text-gray-600">
                  {{ t('shareMailbox.startMode') }}
                  <CustomSelect
                    v-model="expireStartMode"
                    class="mt-1"
                    :options="expireStartModeOptions"
                  />
                </label>
              </div>
              <div v-else-if="selectedExpireMode === 'days'" class="mt-3">
                <label class="block text-sm text-gray-600">
                  {{ t('shareMailbox.days') }}
                  <input
                    v-model.number="selectedExpireDays"
                    type="number"
                    min="1"
                    class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-3">
                <label class="text-sm text-gray-600">
                  {{ t('shareMailbox.linkCount') }}
                  <input
                    v-model.number="shareCount"
                    type="number"
                    min="1"
                    max="100"
                    class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>
                <label class="flex items-center gap-2 self-end pb-2 text-sm text-gray-600">
                  <input v-model="latestOnly" type="checkbox" class="h-4 w-4" />
                  {{ t('shareMailbox.latestOnly') }}
                </label>
              </div>
            </div>

            <!-- 分享链接（创建后显示） -->
            <div
              v-if="shareUrls.length"
              class="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5 animate-fade-in"
            >
              <div class="flex items-center gap-2 mb-3">
                <svg
                  class="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <label class="text-sm font-semibold text-green-800">
                  {{ t('shareMailbox.linkGenerated') }}
                </label>
              </div>
              <div class="max-h-72 space-y-2 overflow-y-auto pr-1">
                <div
                  v-for="(url, index) in shareUrls"
                  :key="url"
                  class="flex min-w-0 items-center gap-2"
                >
                  <span class="w-6 shrink-0 text-center text-xs text-gray-500">{{
                    index + 1
                  }}</span>
                  <input
                    type="text"
                    :value="url"
                    readonly
                    class="min-w-0 flex-1 rounded-lg border border-green-300 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    @click="copyText(url)"
                    :title="t('common.copy')"
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="mt-2 flex justify-end">
                <button
                  @click="copyAllShareUrls"
                  class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white"
                >
                  {{ t('shareMailbox.batchCopy') }}
                </button>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                @click="$emit('close')"
                class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                {{ shareUrls.length ? t('common.close') : t('common.cancel') }}
              </button>
              <button
                v-if="!shareUrls.length"
                @click="handleCreateShare"
                :disabled="creating"
                class="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <svg
                  v-if="!creating"
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  ></path>
                </svg>
                <svg v-else class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {{ creating ? t('shareMailbox.creating') : t('shareMailbox.create') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div class="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h3 class="text-xl font-semibold text-gray-900">
              {{ t('shareMailbox.linkGenerated') }}
            </h3>
            <p class="mt-1 text-sm text-gray-500">
              {{ t('shareMailbox.generatedCount', { count: shareUrls.length }) }}
            </p>
          </div>
          <button
            @click="$emit('close')"
            class="text-gray-400 transition-colors hover:text-gray-600"
            :aria-label="t('common.close')"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="min-h-0 flex-1 p-5">
          <div class="max-h-[min(60vh,32rem)] space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-3">
            <div
              v-for="(url, index) in shareUrls"
              :key="url"
              class="flex min-w-0 items-center gap-2"
            >
              <span class="w-7 shrink-0 text-center text-xs text-gray-500">{{ index + 1 }}</span>
              <input
                type="text"
                :value="url"
                readonly
                class="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                @click="copyText(url)"
                :title="t('common.copy')"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 002 2v8a2 2 0 002 2z"
                  ></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="mt-4 flex justify-end">
            <button
              @click="copyAllShareUrls"
              class="shrink-0 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              {{ t('shareMailbox.batchCopy') }}
            </button>
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
import CustomSelect from '@/components/CustomSelect/index.vue'
import { readSharePreferences, saveSharePreferences } from './sharePreferences'

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
const expireModeOptions = computed(() => [
  { label: t('shareMailbox.minutesMode'), value: 'minutes' },
  { label: t('shareMailbox.daysMode'), value: 'days' },
  { label: t('common.permanent'), value: 'permanent' }
])
const expireStartModeOptions = computed(() => [
  { label: t('shareMailbox.startAtCreated'), value: 'created' },
  { label: t('shareMailbox.startAtFirstOpened'), value: 'first_opened' }
])

const savedPreferences = readSharePreferences()
const selectedExpireMode = ref(savedPreferences.expireMode)
const selectedExpireDays = ref(savedPreferences.expireDays)
const expireMinutes = ref(savedPreferences.expireMinutes)
const expireStartMode = ref(savedPreferences.expireStartMode)
const shareCount = ref(savedPreferences.shareCount)
const latestOnly = ref(savedPreferences.latestOnly)
const creating = ref(false)
const shareUrls = ref([])

// 完整分享链接
const fullShareUrl = computed(() => {
  if (!shareUrls.value.length) return ''
  // 桌面端用线上地址，保证分享链接可被外部访问
  const origin = isTauri() ? 'https://zjkdongao.cn' : window.location.origin
  return `${origin}${shareUrls.value[0]}`
})

// 创建分享
const handleCreateShare = async () => {
  if (props.mailboxIds.length === 0) {
    showMessage(t('shareMailbox.selectMailboxWarning'), 'warning')
    return
  }

  if (selectedExpireMode.value === 'days' && Number(selectedExpireDays.value) <= 0) {
    showMessage(t('shareMailbox.invalidDays'), 'warning')
    return
  }
  if (selectedExpireMode.value === 'minutes' && Number(expireMinutes.value) <= 0) {
    showMessage(t('shareMailbox.invalidMinutes'), 'warning')
    return
  }

  creating.value = true
  try {
    const res = await mailboxShareAPI.createShare({
      mailbox_ids: props.mailboxIds,
      mailbox_type: props.mailboxType,
      share_count: Math.max(1, Math.min(100, Number(shareCount.value) || 1)),
      expire_mode: selectedExpireMode.value,
      expire_days: selectedExpireMode.value === 'days' ? selectedExpireDays.value : 0,
      expire_minutes: selectedExpireMode.value === 'minutes' ? Number(expireMinutes.value) : null,
      expire_start_mode: selectedExpireMode.value === 'minutes' ? expireStartMode.value : 'created',
      latest_only: latestOnly.value
    })

    if (res.code === 0) {
      const shares = res.data.shares || [res.data]
      shareUrls.value = shares.map(
        (item) => `${isTauri() ? 'https://zjkdongao.cn' : window.location.origin}${item.share_url}`
      )
      saveSharePreferences({
        expireMode: selectedExpireMode.value,
        expireDays: selectedExpireDays.value,
        expireMinutes: expireMinutes.value,
        expireStartMode: expireStartMode.value,
        shareCount: shareCount.value,
        latestOnly: latestOnly.value
      })
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
const copyText = (text) => {
  navigator.clipboard.writeText(text)
  showMessage(t('shareMailbox.copied'), 'success')
}

const copyShareUrl = () => copyText(fullShareUrl.value)
const copyAllShareUrls = () => copyText(shareUrls.value.join('\n'))

const restoreSavedPreferences = () => {
  const preferences = readSharePreferences()
  selectedExpireMode.value = preferences.expireMode
  selectedExpireDays.value = preferences.expireDays
  expireMinutes.value = preferences.expireMinutes
  expireStartMode.value = preferences.expireStartMode
  shareCount.value = preferences.shareCount
  latestOnly.value = preferences.latestOnly
}

// 监听弹窗关闭，重置状态
watch(
  () => props.visible,
  (newVal) => {
    if (!newVal) {
      // 弹窗关闭时重置状态
      setTimeout(() => {
        restoreSavedPreferences()
        shareUrls.value = []
        creating.value = false
      }, 300)
    }
  }
)
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
