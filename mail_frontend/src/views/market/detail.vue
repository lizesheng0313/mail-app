<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 顶部导航 -->
    <PageHeader />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 加载状态 -->
      <div v-if="loading" class="text-center py-12">
        <div
          class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"
        ></div>
        <p class="mt-4 text-gray-600">{{ t('marketDetail.loading') }}</p>
      </div>

      <!-- 工作流详情 -->
      <div v-else-if="workflow" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- 左侧：主要内容 -->
        <div class="lg:col-span-2 space-y-6">
          <!-- 基本信息卡片 -->
          <div class="bg-white rounded-lg shadow p-6">
            <!-- 图标 + 标题 + 作者 -->
            <div class="flex gap-4 mb-6">
              <!-- 工作流图标 - 默认图标使用主题色 -->
              <div
                class="w-20 h-20 rounded-lg flex-shrink-0 flex items-center justify-center"
                :class="workflow.icon_url ? '' : 'bg-gradient-workflow'"
              >
                <img
                  v-if="workflow.icon_url"
                  :src="workflow.icon_url"
                  class="w-full h-full rounded-lg object-cover"
                  :alt="workflow.name"
                  @error="$event.target.style.display = 'none'"
                />
                <svg
                  v-if="!workflow.icon_url"
                  class="w-10 h-10 text-white opacity-90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div class="flex-1">
                <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ workflow.name }}</h1>
                <div class="flex items-center gap-4 text-sm text-gray-600">
                  <span>{{
                    t('marketDetail.author', {
                      name: workflow.author_name || t('marketDetail.defaultAuthor')
                    })
                  }}</span>
                  <span>·</span>
                  <span>{{
                    t('marketDetail.category', { name: getCategoryText(workflow.category) })
                  }}</span>
                </div>
              </div>
            </div>

            <!-- 简短描述 -->
            <p class="text-gray-700 mb-4">{{ workflow.description }}</p>

            <!-- 标签 -->
            <div
              v-if="workflow.keywords && workflow.keywords.length > 0"
              class="flex flex-wrap gap-2"
            >
              <span
                v-for="keyword in workflow.keywords"
                :key="keyword"
                class="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                {{ keyword }}
              </span>
            </div>
          </div>

          <!-- 截图预览 - 只在有截图时显示 -->
          <div v-if="hasValidScreenshots" class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold mb-4">{{ t('marketDetail.screenshots') }}</h3>
            <div class="grid grid-cols-2 gap-4">
              <img
                v-for="(screenshot, index) in validScreenshots"
                :key="index"
                :src="screenshot"
                :alt="t('marketDetail.screenshotAlt', { index: index + 1 })"
                class="w-full rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                @click="viewImage(screenshot)"
                @error="handleImageError($event, index)"
              />
            </div>
          </div>

          <!-- 详细说明 -->
          <div v-if="workflow.long_description" class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold mb-4">{{ t('marketDetail.details') }}</h3>
            <div class="prose max-w-none" v-html="workflow.long_description"></div>
          </div>

          <!-- 用户评价 -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold mb-6">
              {{ t('marketDetail.reviewsTitle', { count: workflow.review_count || 0 }) }}
            </h3>

            <!-- 评论输入框 - 始终显示 -->
            <div class="mb-6">
              <div class="flex items-start gap-3">
                <div
                  class="w-10 h-10 rounded-full bg-gradient-workflow flex items-center justify-center text-white font-semibold"
                >
                  {{ userStore.user?.username?.charAt(0)?.toUpperCase() || 'U' }}
                </div>
                <div class="flex-1">
                  <textarea
                    v-model="newComment"
                    rows="3"
                    :placeholder="
                      canReview
                        ? t('marketDetail.reviewPlaceholder')
                        : t('marketDetail.reviewLockedPlaceholder')
                    "
                    :disabled="!canReview"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    :class="!canReview ? 'bg-gray-50 cursor-not-allowed' : ''"
                  ></textarea>
                  <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-gray-600">{{ t('marketDetail.rating') }}</span>
                      <div class="flex gap-1">
                        <button
                          v-for="i in 5"
                          :key="i"
                          @click="canReview && (newRating = i)"
                          :disabled="!canReview"
                          class="focus:outline-none"
                        >
                          <svg
                            :class="i <= newRating ? 'text-yellow-400' : 'text-gray-300'"
                            class="h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <button
                      @click="submitReview"
                      :disabled="!canReview || !newComment.trim()"
                      class="px-4 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {{ t('marketDetail.submitReview') }}
                    </button>
                  </div>
                  <p v-if="!canReview" class="text-xs text-amber-600 mt-2">
                    {{ t('marketDetail.reviewHint') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 评价列表 -->
            <div v-if="reviews && reviews.length > 0" class="space-y-4">
              <div
                v-for="review in reviews"
                :key="review.id"
                class="border-b border-gray-200 pb-4 last:border-0"
              >
                <div class="flex items-start gap-3">
                  <!-- 评论者头像 -->
                  <div
                    class="w-10 h-10 rounded-full bg-gradient-workflow flex items-center justify-center text-white font-semibold flex-shrink-0"
                  >
                    {{ review.user_name?.charAt(0)?.toUpperCase() || 'U' }}
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-gray-900">{{
                          review.user_name || t('marketDetail.anonymousUser')
                        }}</span>
                        <!-- 作者标识 -->
                        <span
                          v-if="review.user_id === workflow.author_id"
                          class="px-2 py-0.5 text-xs bg-primary-100 text-primary-600 rounded"
                          >{{ t('marketDetail.authorBadge') }}</span
                        >
                        <div v-if="review.rating" class="flex">
                          <svg
                            v-for="i in 5"
                            :key="i"
                            :class="i <= review.rating ? 'text-yellow-400' : 'text-gray-300'"
                            class="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-sm text-gray-500">{{
                          formatDate(review.created_at)
                        }}</span>
                        <!-- 删除按钮 - 只有自己能删除自己的评论 -->
                        <ActionButton
                          v-if="review.user_id === userStore.user?.id"
                          icon="delete"
                          variant="delete"
                          size="sm"
                          :tooltip="t('marketDetail.deleteReviewTooltip')"
                          @click="deleteReviewById(review.id)"
                        />
                      </div>
                    </div>
                    <p class="text-gray-700">{{ review.comment }}</p>

                    <!-- 回复按钮 -->
                    <button
                      v-if="canReview"
                      @click="replyToReview(review)"
                      class="mt-2 text-sm text-primary-600 hover:text-primary-700"
                    >
                      {{ t('marketDetail.reply') }}
                    </button>

                    <!-- 子评论（回复） -->
                    <div
                      v-if="review.replies && review.replies.length > 0"
                      class="mt-3 ml-8 space-y-3"
                    >
                      <div
                        v-for="reply in review.replies"
                        :key="reply.id"
                        class="border-l-2 border-gray-200 pl-4"
                      >
                        <div class="flex items-center justify-between mb-1">
                          <div class="flex items-center gap-2">
                            <span class="font-medium text-gray-900 text-sm">{{
                              reply.user_name || t('marketDetail.anonymousUser')
                            }}</span>
                            <!-- 作者标识 -->
                            <span
                              v-if="reply.user_id === workflow.author_id"
                              class="px-2 py-0.5 text-xs bg-primary-100 text-primary-600 rounded"
                              >{{ t('marketDetail.authorBadge') }}</span
                            >
                            <span class="text-xs text-gray-500">{{
                              formatDate(reply.created_at)
                            }}</span>
                          </div>
                          <!-- 删除回复按钮 -->
                          <ActionButton
                            v-if="reply.user_id === userStore.user?.id"
                            icon="delete"
                            variant="delete"
                            size="xs"
                            :tooltip="t('marketDetail.deleteReplyTooltip')"
                            @click="deleteReviewById(reply.id)"
                          />
                        </div>
                        <p class="text-gray-700 text-sm">{{ reply.comment }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-500">
              {{ t('marketDetail.emptyReviews') }}
            </div>
          </div>
        </div>

        <!-- 右侧：购买面板 -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow p-6 sticky top-24 space-y-3">
            <div
              v-if="workflow.inventory_enabled"
              class="rounded-lg border border-gray-200 p-4 space-y-3"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700">{{
                  t('marketDetail.quantityLabel')
                }}</span>
                <span class="text-xs text-gray-500">
                  {{
                    t('marketDetail.remainingInventory', { count: workflow.inventory_count || 0 })
                  }}
                </span>
              </div>

              <div class="flex items-center justify-between gap-3">
                <button
                  type="button"
                  class="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-lg font-medium text-gray-700 transition-colors hover:border-primary-500 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="selectedExecutionCount <= 1"
                  @click="decreaseExecutionCount"
                >
                  -
                </button>

                <input
                  v-model="executionCountInput"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  :max="maxExecutionCount"
                  class="h-10 flex-1 rounded-md border border-gray-300 px-3 text-center text-base font-semibold text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  @input="handleExecutionCountInput"
                  @blur="normalizeExecutionCount"
                />

                <button
                  type="button"
                  class="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-lg font-medium text-gray-700 transition-colors hover:border-primary-500 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="selectedExecutionCount >= maxExecutionCount"
                  @click="increaseExecutionCount"
                >
                  +
                </button>
              </div>

              <div
                v-if="workflow.pricing_model === 'per_use' && workflow.milk_coin_price > 0"
                class="text-xs text-gray-500"
              >
                {{ t('marketDetail.totalPrice', { totalPrice: totalExecutionPrice }) }}
              </div>
            </div>

            <!-- 立即执行按钮 -->
            <button
              @click="executeNow"
              :disabled="workflow.inventory_enabled && workflow.inventory_count <= 0"
              class="w-full px-6 py-3 bg-primary-600 text-white text-base font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <span v-if="workflow.inventory_enabled && workflow.inventory_count <= 0">
                {{ t('marketDetail.soldOut') }}
              </span>
              <span v-else-if="workflow.pricing_model === 'free'">
                {{ t('marketDetail.executeFree') }}
              </span>
              <span v-else-if="workflow.pricing_model === 'per_use'">
                {{ t('marketDetail.executePerUse', { price: workflow.milk_coin_price }) }}
              </span>
              <span v-else-if="workflow.pricing_model === 'subscription'">
                {{ t('marketDetail.executeSubscription') }}
              </span>
              <span v-else>
                {{ t('marketDetail.executeOneTime', { price: workflow.milk_coin_price }) }}
              </span>
            </button>

            <!-- 执行历史按钮 - 所有登录用户都能看到 -->
            <button
              @click="showExecutionHistory = true"
              class="w-full px-6 py-3 bg-white text-primary-600 text-base font-medium rounded-lg border-2 border-primary-600 hover:bg-primary-50 transition-colors"
            >
              <svg
                class="w-5 h-5 inline mr-2 -mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {{ t('marketDetail.executionHistory') }}
            </button>

            <!-- 库存信息 -->
            <div
              v-if="workflow.inventory_enabled && workflow.inventory_count !== undefined"
              class="pt-3 text-center text-sm text-gray-600"
            >
              {{ t('marketDetail.remainingInventory', { count: workflow.inventory_count }) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 确认对话框 -->
    <ConfirmDialog
      v-model:visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :type="confirmDialog.type"
      :loading="confirmDialog.loading"
      @confirm="confirmDialog.onConfirm"
      @cancel="confirmDialog.onCancel"
    />

    <!-- 执行结果弹窗 -->
    <ExecutionResultModal
      :visible="showExecutionResult"
      :execution-data="executionResultData"
      @close="showExecutionResult = false"
    />

    <!-- 执行历史弹窗 -->
    <ExecutionHistoryModal
      v-if="showExecutionHistory"
      :workflowId="workflow?.workflow_id"
      :marketStatus="workflow?.market_status"
      @close="showExecutionHistory = false"
    />

    <!-- 图片预览弹窗 -->
    <ImagePreview v-model:visible="showImagePreview" :src="previewImage" />

    <!-- 执行中的全局loading -->
    <div
      v-if="confirmDialog.loading && !confirmDialog.visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg p-6 flex flex-col items-center">
        <svg class="animate-spin h-12 w-12 text-primary-600 mb-4" fill="none" viewBox="0 0 24 24">
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
        <p class="text-lg font-medium text-gray-900">{{ t('marketDetail.executingTitle') }}</p>
        <p class="text-sm text-gray-500 mt-2">{{ t('marketDetail.executingSubtitle') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { getWorkflowDetail } from '@/api/workflowMarket'
import { createReview, deleteReview } from '@/api/workflowMarket'
import { workflowApi } from '@/api/workflow'
import { getBalance } from '@/api/milkCoin'
import { showMessage } from '@/utils/message'
import PageHeader from '@/components/PageHeader/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import ExecutionResultModal from '@/views/portal/workflows/components/ExecutionResultModal/index.vue'
import ExecutionHistoryModal from '@/views/portal/workflows/components/ExecutionHistoryModal/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import ImagePreview from '@/components/ImagePreview/index.vue'
import { useUserStore } from '@/stores/user'
import { setPageSeo } from '@/seo'
import { getCurrentLocale } from '@/i18n'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { t, te } = useI18n()

const workflowId = computed(() => parseInt(route.params.id))
const workflow = ref(null)
const loading = ref(true)
const canReview = ref(false)
const reviews = ref([])
const showExecutionResult = ref(false)
const showExecutionHistory = ref(false)
const selectedExecutionCount = ref(1)
const executionCountInput = ref('1')
const executionResultData = ref({
  execution_id: '',
  status: '',
  result: null
})

// 评论相关
const newComment = ref('')
const newRating = ref(5)

// 截图验证
const validScreenshots = ref([])
const hasValidScreenshots = computed(() => validScreenshots.value.length > 0)

const stripHtml = (value = '') =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const updateWorkflowSeo = () => {
  if (!workflow.value) {
    return
  }

  const workflowName = workflow.value.name || t('marketDetail.seoFallbackTitle')
  const workflowDescription =
    workflow.value.description ||
    stripHtml(workflow.value.long_description || '') ||
    t('marketDetail.seoFallbackDescription')
  const keywordList = Array.isArray(workflow.value.keywords)
    ? workflow.value.keywords.filter(Boolean)
    : []

  setPageSeo({
    title: `${workflowName} - ${t('marketDetail.seoTitleSuffix')} | ${t('seo.siteName')}`,
    description: workflowDescription.slice(0, 160),
    keywords: [
      t('marketDetail.seoKeywordWorkflowDetail'),
      t('marketDetail.seoKeywordEmailAutomation'),
      workflowName,
      ...keywordList
    ].join(', '),
    canonicalPath: route.path,
    ogType: 'website'
  })
}

const handleImageError = (event, index) => {
  // 图片加载失败时从有效截图列表中移除
  validScreenshots.value = validScreenshots.value.filter((_, i) => i !== index)
}

// 确认对话框
const confirmDialog = ref({
  visible: false,
  title: '',
  message: '',
  type: 'info',
  loading: false,
  onConfirm: () => {},
  onCancel: () => {}
})

const maxExecutionCount = computed(() => {
  if (!workflow.value?.inventory_enabled) {
    return 1
  }

  return Math.max(1, Number(workflow.value.inventory_count || 0))
})

const totalExecutionPrice = computed(() => {
  const price = Number(workflow.value?.milk_coin_price || 0)
  return price * selectedExecutionCount.value
})

const syncExecutionCountState = (nextCount) => {
  const normalizedCount = Math.min(Math.max(Number(nextCount) || 1, 1), maxExecutionCount.value)
  selectedExecutionCount.value = normalizedCount
  executionCountInput.value = String(normalizedCount)
  return normalizedCount
}

const getExecutionCountInputString = () => String(executionCountInput.value ?? '')

const normalizeExecutionCount = () => {
  syncExecutionCountState(getExecutionCountInputString())
}

const handleExecutionCountInput = () => {
  const sanitized = getExecutionCountInputString().replace(/[^\d]/g, '')
  executionCountInput.value = sanitized

  if (!sanitized) {
    return
  }

  syncExecutionCountState(sanitized)
}

const increaseExecutionCount = () => {
  syncExecutionCountState(selectedExecutionCount.value + 1)
}

const decreaseExecutionCount = () => {
  syncExecutionCountState(selectedExecutionCount.value - 1)
}

const refreshInventoryCount = async () => {
  if (!workflow.value?.inventory_enabled) {
    return
  }

  try {
    const inventoryRes = await workflowApi.getInventoryCount(workflow.value.workflow_id)
    if (inventoryRes.code === 0) {
      workflow.value.inventory_count = inventoryRes.data.inventory_count
      syncExecutionCountState(selectedExecutionCount.value)
    }
  } catch (error) {
    console.error('获取库存失败:', error)
  }
}

const buildExecuteConfirmMessage = (count) => {
  const model = workflow.value.pricing_model
  const price = Number(workflow.value.milk_coin_price || 0)
  const name = workflow.value.name

  if (model === 'per_use') {
    if (count > 1) {
      return t('marketDetail.confirmExecutePerUseMultiple', {
        name,
        price,
        count,
        totalPrice: price * count
      })
    }
    return t('marketDetail.confirmExecutePerUse', { name, price })
  }

  if (model === 'subscription') {
    if (count > 1) {
      return t('marketDetail.confirmExecuteSubscriptionMultiple', { name, count })
    }
    return t('marketDetail.confirmExecuteSubscription', { name })
  }

  if (count > 1) {
    return t('marketDetail.confirmExecuteDefaultMultiple', { name, count })
  }

  return t('marketDetail.confirmExecuteDefault', { name })
}

// 加载工作流详情
const loadWorkflowDetail = async (showLoading = true) => {
  if (showLoading) {
    loading.value = true
  }

  try {
    const res = await getWorkflowDetail(workflowId.value)

    if (res.code === 0) {
      workflow.value = res.data
      syncExecutionCountState(selectedExecutionCount.value)
      updateWorkflowSeo()

      // 初始化有效截图列表
      if (res.data.screenshots && Array.isArray(res.data.screenshots)) {
        validScreenshots.value = res.data.screenshots.filter((url) => url && url.trim())
      } else {
        validScreenshots.value = []
      }
      canReview.value = res.data.can_review || false

      // 加载评价
      if (res.data.reviews) {
        reviews.value = res.data.reviews
      }
    }
  } catch (error) {
    console.error('加载失败:', error)
  } finally {
    loading.value = false
  }
}

// 立即执行工作流
const executeNow = async () => {
  // 检查登录状态
  if (!userStore.isAuthenticated) {
    showMessage(t('marketDetail.loginBeforeExecute'), 'warning')
    router.push('/login')
    return
  }

  const model = workflow.value.pricing_model
  const price = workflow.value.milk_coin_price
  const currentWorkflowId = workflow.value.workflow_id
  const executionCount = workflow.value.inventory_enabled
    ? syncExecutionCountState(executionCountInput.value)
    : 1

  if (!executionCount) {
    return
  }

  // 如果是付费工作流,检查余额
  if (model === 'per_use' && price > 0) {
    try {
      const balanceRes = await getBalance()
      if (balanceRes.code === 0) {
        const userBalance = balanceRes.data.balance || 0
        const totalPrice = price * executionCount

        // 余额不足,引导充值
        if (userBalance < totalPrice) {
          confirmDialog.value = {
            visible: true,
            title: t('marketDetail.insufficientCoinsTitle'),
            message:
              executionCount > 1
                ? t('marketDetail.insufficientCoinsMessageMultiple', {
                    price,
                    count: executionCount,
                    totalPrice,
                    balance: userBalance
                  })
                : t('marketDetail.insufficientCoinsMessage', { price, balance: userBalance }),
            type: 'warning',
            loading: false,
            onConfirm: () => {
              confirmDialog.value.visible = false
              // 跳转到财务中心充值页面,带上锚点定位到充值区域
              router.push('/user/finance#recharge')
            },
            onCancel: () => {
              confirmDialog.value.visible = false
            }
          }
          return
        }
      }
    } catch (error) {
      console.error('检查余额失败:', error)
    }
  }

  let title = t('marketDetail.confirmExecuteTitle')
  let message = buildExecuteConfirmMessage(executionCount)

  confirmDialog.value = {
    visible: true,
    title,
    message,
    loading: false,
    onConfirm: async () => {
      confirmDialog.value.loading = true
      try {
        const response = await workflowApi.executeWorkflow(
          currentWorkflowId,
          {},
          { count: executionCount }
        )

        confirmDialog.value.visible = false
        await refreshInventoryCount()

        if (response.code !== 0) {
          showMessage(response.message || t('marketDetail.executionFailed'), 'error')
          return
        }

        if (executionCount === 1) {
          const status = response.data.status
          if (Array.isArray(response.data.accounts) && response.data.accounts.length > 0) {
            executionResultData.value = response.data
            showExecutionResult.value = true
            showMessage(t('marketDetail.executionSuccess'), 'success')
            return
          }
          if (status === 'completed') {
            executionResultData.value = response.data
            showExecutionResult.value = true
            showMessage(t('marketDetail.executionSuccess'), 'success')
          } else if (status === 'failed') {
            showMessage(t('marketDetail.executionFailed'), 'error')
          } else {
            showMessage(t('marketDetail.executionSubmitted'), 'info')
          }
          return
        }

        const summary = response.data.summary || {}
        if (Array.isArray(response.data.accounts) && response.data.accounts.length > 0) {
          executionResultData.value = response.data
          showExecutionResult.value = true
        }
        const processingCount =
          Number(summary.executing_count || 0) + Number(summary.pending_count || 0)
        const messageType =
          Number(summary.failed_count || 0) > 0
            ? 'warning'
            : Number(summary.completed_count || 0) > 0
              ? 'success'
              : 'info'
        showMessage(
          t('marketDetail.executionBatchSummary', {
            count: executionCount,
            completed: Number(summary.completed_count || 0),
            submitted: processingCount,
            failed: Number(summary.failed_count || 0) + Number(summary.rejected_count || 0)
          }),
          messageType
        )
      } catch (error) {
        console.error('执行失败:', error)
        showMessage(t('marketDetail.executionFailed'), 'error')
      } finally {
        confirmDialog.value.loading = false
      }
    },
    onCancel: () => {
      confirmDialog.value.visible = false
    }
  }
}

// 显示评价对话框
// 提交评论
const submitReview = async () => {
  // 检查登录状态
  if (!userStore.isAuthenticated) {
    showMessage(t('marketDetail.loginBeforeReview'), 'warning')
    router.push('/login')
    return
  }

  if (!canReview.value) {
    showMessage(t('marketDetail.purchaseBeforeReview'), 'warning')
    return
  }

  if (!newComment.value.trim()) {
    showMessage(t('marketDetail.reviewContentRequired'), 'warning')
    return
  }

  try {
    const res = await createReview(workflow.value.id, {
      rating: newRating.value,
      comment: newComment.value.trim()
    })

    if (res.code === 0) {
      showMessage(t('marketDetail.reviewSuccess'), 'success')
      newComment.value = ''
      newRating.value = 5
      // 重新加载评价
      await loadWorkflowDetail()
    } else {
      showMessage(t('marketDetail.reviewFailed'), 'error')
    }
  } catch (error) {
    console.error('评价失败:', error)
    showMessage(t('marketDetail.reviewFailed'), 'error')
  }
}

// 回复评论
const replyToReview = async (review) => {
  // 检查登录状态
  if (!userStore.isAuthenticated) {
    showMessage(t('marketDetail.loginBeforeReply'), 'warning')
    router.push('/login')
    return
  }

  const comment = await showPrompt(
    t('marketDetail.replyPromptMessage', {
      name: review.user_name || t('marketDetail.anonymousUser')
    }),
    t('marketDetail.replyPromptTitle')
  )

  if (!comment || comment.trim() === '') {
    return
  }

  try {
    const res = await createReview(workflow.value.id, {
      rating: 0,
      comment: comment,
      parent_id: review.id
    })

    if (res.code === 0) {
      showMessage(t('marketDetail.replySuccess'), 'success')
      loadWorkflowDetail()
    }
  } catch (error) {
    console.error('回复失败:', error)
    showMessage(t('marketDetail.replyFailed'), 'error')
  }
}

// 图片预览
const previewImage = ref('')
const showImagePreview = ref(false)

const viewImage = (url) => {
  previewImage.value = url
  showImagePreview.value = true
}

// 获取分类文本
const getCategoryText = (category) => {
  const key = `marketDetail.categories.${category || 'other'}`
  return te(key) ? t(key) : category
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleDateString(getCurrentLocale())
}

// 删除评论
const deleteReviewById = async (reviewId) => {
  confirmDialog.value = {
    visible: true,
    title: t('marketDetail.deleteReviewConfirmTitle'),
    message: t('marketDetail.deleteReviewConfirmMessage'),
    type: 'warning',
    loading: false,
    onConfirm: async () => {
      confirmDialog.value.loading = true
      try {
        const res = await deleteReview(workflow.value.id, reviewId)
        if (res.code === 0) {
          showMessage(t('marketDetail.reviewDeleted'), 'success')
          confirmDialog.value.visible = false
          await loadWorkflowDetail()
        } else {
          showMessage(t('marketDetail.deleteFailed'), 'error')
        }
      } catch (error) {
        console.error('删除评论失败:', error)
        showMessage(t('marketDetail.deleteFailed'), 'error')
      } finally {
        confirmDialog.value.loading = false
      }
    },
    onCancel: () => {
      confirmDialog.value.visible = false
    }
  }
}

onMounted(() => {
  loadWorkflowDetail()
})

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      loadWorkflowDetail()
    }
  }
)
</script>
