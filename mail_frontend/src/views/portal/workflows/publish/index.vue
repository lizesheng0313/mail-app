<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 顶部导航栏 -->
    <div class="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <div class="flex items-center gap-3">
          <button @click="handleCancel" class="text-gray-600 hover:text-gray-900">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 class="text-sm font-medium">{{ isEditMode ? t('publishWorkflow.titleEdit') : t('publishWorkflow.titleCreate') }}</h1>
            <p class="text-xs text-gray-500">{{ formData.name || workflowName }}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            @click="generateWithAI"
            :disabled="generating"
            class="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
          >
            {{ generating ? t('publishWorkflow.generating') : t('publishWorkflow.generateWithAI') }}
          </button>
          <button
            @click="handleSubmit"
            :disabled="submitting"
            class="px-4 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
          >
            {{ submitting ? (isEditMode ? t('publishWorkflow.saving') : t('publishWorkflow.submitting')) : (isEditMode ? t('publishWorkflow.save') : t('publishWorkflow.submit')) }}
          </button>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="mx-auto max-w-5xl space-y-5 px-6 py-6">
      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div class="grid gap-6 p-6 lg:grid-cols-[300px_1fr]">
          <div>
            <label class="mb-2 block text-sm font-semibold text-gray-900">主图</label>
            <div class="mb-3 flex h-72 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
              <img v-if="formData.iconUrl" :src="formData.iconUrl" class="h-full w-full object-cover" />
              <span v-else class="text-sm text-gray-400">上传商品主图</span>
            </div>
            <input ref="iconInput" type="file" accept="image/*" class="hidden" @change="handleIconUpload" />
            <button
              @click="$refs.iconInput.click()"
              :disabled="uploadingIcon"
              class="w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
            >
              {{ uploadingIcon ? t('publishWorkflow.uploading') : formData.iconUrl ? t('publishWorkflow.replace') : t('publishWorkflow.upload') }}
            </button>
          </div>

          <div class="space-y-5">
            <div>
              <label class="mb-2 block text-sm font-semibold text-gray-900">标题 <span class="text-red-500">*</span></label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="例如：Outlook 全新邮箱 / 瑞幸咖啡代下单"
                class="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label class="mb-2 block text-sm font-semibold text-gray-900">介绍</label>
              <textarea
                v-model="formData.description"
                rows="5"
                placeholder="一句话说明这个资源是什么、怎么买、交付什么。"
                class="w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-primary-500"
              ></textarea>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-2 block text-sm font-semibold text-gray-900">一级分类 <span class="text-red-500">*</span></label>
                <CustomSelect v-model="formData.primaryCategory" :options="primaryCategoryOptions" :placeholder="t('publishWorkflow.select')" />
              </div>
              <div>
                <label class="mb-2 block text-sm font-semibold text-gray-900">二级分类 <span class="text-red-500">*</span></label>
                <CustomSelect v-model="formData.secondaryCategory" :options="secondaryCategoryOptions" :placeholder="t('publishWorkflow.select')" />
              </div>
            </div>

            <div>
              <label class="mb-2 block text-sm font-semibold text-gray-900">{{ t('publishWorkflow.tags') }}</label>
              <div class="flex gap-2">
                <input
                  v-model="tagInput"
                  type="text"
                  :placeholder="t('publishWorkflow.tagPlaceholder')"
                  class="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  @keyup.enter="addTag"
                />
                <button @click="addTag" class="rounded-lg bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200">{{ t('publishWorkflow.addTag') }}</button>
              </div>
            </div>

            <div v-if="formData.tags.length" class="flex flex-wrap gap-1.5">
              <span v-for="tag in formData.tags" :key="tag" class="inline-flex items-center rounded bg-primary-50 px-2 py-0.5 text-xs text-primary-700">
                {{ tag }}
                <button @click="removeTag(tag)" class="ml-1 text-primary-600">×</button>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div class="border-b border-gray-100 px-6 py-5">
          <h3 class="text-lg font-semibold text-gray-900">价格和规格</h3>
        </div>
        <div class="space-y-5 p-6">
          <div class="grid gap-6 lg:grid-cols-2">
            <div>
              <label class="mb-2 block text-sm font-semibold text-gray-900">{{ t('publishWorkflow.pricingMode') }}</label>
              <div class="grid gap-2">
                <label
                  v-for="option in pricingOptions"
                  :key="option.value"
                  class="flex cursor-pointer items-start rounded-lg border p-3 transition hover:bg-gray-50"
                  :class="formData.pricingModel === option.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200'"
                >
                  <input type="radio" v-model="formData.pricingModel" :value="option.value" class="mt-1 text-primary-600 focus:ring-primary-500" />
                  <div class="ml-3">
                    <div class="text-sm font-medium text-gray-900">{{ option.label }}</div>
                    <p class="mt-0.5 text-xs text-gray-500">{{ option.desc }}</p>
                  </div>
                </label>
              </div>
            </div>

            <div class="space-y-4">
              <div v-if="formData.pricingModel === 'subscription'">
                <label class="mb-2 block text-sm font-semibold text-gray-900">{{ t('publishWorkflow.subscriptionPeriod') }}</label>
                <CustomSelect v-model="formData.subscriptionPeriod" :options="periodOptions" :placeholder="t('publishWorkflow.select')" />
              </div>

              <div>
                <label class="mb-2 block text-sm font-semibold text-gray-900">交付方式</label>
                <div class="grid gap-2">
                  <label
                    v-for="option in deliveryOptions"
                    :key="option.value"
                    class="flex cursor-pointer items-start rounded-lg border p-3 transition hover:bg-gray-50"
                    :class="formData.deliveryMode === option.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200'"
                  >
                    <input
                      type="radio"
                      v-model="formData.deliveryMode"
                      :value="option.value"
                      :disabled="legacyCategory === 'outlook' && option.value !== 'inventory'"
                      class="mt-1 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                    />
                    <div class="ml-3">
                      <div class="text-sm font-medium text-gray-900">{{ option.label }}</div>
                      <p class="mt-0.5 text-xs text-gray-500">{{ option.desc }}</p>
                    </div>
                  </label>
                </div>
                <div
                  v-if="formData.deliveryMode === 'third_party_api'"
                  class="mt-3 rounded-lg bg-gray-50 p-3"
                >
                  <label class="mb-1 block text-sm font-semibold text-gray-900">下单参数</label>
                  <p class="mt-2 text-xs text-gray-500">
                    无需手动选择。绑定货源后会自动读取半方模板参数，详情页按规格展示对应输入框。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-semibold text-gray-900">规格</label>
              <button type="button" class="text-sm font-medium text-primary-700 hover:text-primary-800" @click="addSku">
                添加规格
              </button>
            </div>

            <div class="space-y-3">
              <div
                v-for="(sku, index) in formData.skus"
                :key="sku.localId"
                class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div class="grid items-center gap-3 md:grid-cols-[56px_72px_1fr_132px_156px_44px]">
                  <div class="flex h-10 items-center text-sm font-semibold text-gray-500">#{{ index + 1 }}</div>
                  <label class="group relative flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 transition hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700">
                    <img v-if="getSkuPreviewImage(sku)" :src="getSkuPreviewImage(sku)" class="h-full w-full object-cover" />
                    <span v-else class="flex flex-col items-center justify-center gap-0.5">
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m-7-7h14" />
                      </svg>
                    </span>
                    <span
                      v-if="!sku.imageUrl && formData.iconUrl"
                      class="absolute bottom-0 left-0 right-0 bg-black/45 py-0.5 text-center text-[10px] text-white"
                    >
                      主图
                    </span>
                    <input type="file" accept="image/*" class="hidden" @change="handleSkuImageUpload($event, sku)" />
                  </label>
                  <input
                    v-model="sku.name"
                    type="text"
                    placeholder="白色"
                    class="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <div v-if="formData.pricingModel !== 'free'" class="relative">
                    <input
                      v-model.number="sku.price"
                      type="number"
                      min="0"
                      placeholder="价格"
                      class="h-10 w-full rounded-lg border border-gray-200 px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span class="absolute right-3 top-2.5 text-xs text-gray-500">{{ t('publishWorkflow.coins') }}</span>
                  </div>
                  <div v-else class="flex h-10 items-center rounded-lg bg-primary-50 px-3 text-sm font-semibold text-primary-700">免费</div>
                  <div
                    v-if="formData.deliveryMode === 'third_party_api' && getSkuSourceCount(sku)"
                    class="flex h-10 items-center justify-between rounded-lg bg-gray-50 px-3 text-sm"
                  >
                    <span class="truncate text-gray-700">{{ getSkuSourceCount(sku) }} 个货源</span>
                    <button
                      type="button"
                      class="ml-2 shrink-0 font-medium text-primary-700 hover:text-primary-800"
                      @click="openSkuSourceModal(index)"
                    >
                      绑定
                    </button>
                  </div>
                  <button
                    v-else-if="formData.deliveryMode === 'third_party_api'"
                    type="button"
                    class="flex h-10 items-center justify-center rounded-lg bg-gray-50 px-4 text-sm font-medium text-primary-700 hover:bg-primary-50 hover:text-primary-800"
                    @click="openSkuSourceModal(index)"
                  >
                    绑定
                  </button>
                  <button
                    type="button"
                    class="flex h-10 w-10 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600"
                    @click="removeSku(index)"
                    title="删除规格"
                  >
                    ×
                  </button>
                </div>
                <div
                  v-if="formData.deliveryMode === 'third_party_api' && getSkuSources(sku).length"
                  class="mt-3 flex flex-wrap gap-2"
                >
                  <div
                    v-for="source in getSkuSources(sku)"
                    :key="source.key"
                    class="flex min-w-[220px] max-w-full items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 py-2"
                  >
                    <img
                      v-if="source.image"
                      :src="source.image"
                      class="h-9 w-9 shrink-0 rounded-md border border-gray-100 object-cover"
                    />
                    <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[10px] text-gray-400">无图</span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-xs font-medium text-gray-900">{{ source.title }}</span>
                      <span class="block truncate text-[11px] text-gray-500">编号 {{ source.no || '-' }}</span>
                    </span>
                    <span class="shrink-0 text-xs font-semibold text-orange-600">进货 {{ money(source.cost) }}</span>
                  </div>
                </div>
                <div
                  v-if="formData.deliveryMode === 'third_party_api' && getSkuOrderFieldSummary(sku)"
                  class="mt-1 truncate text-xs text-gray-500"
                >
                  参数：{{ getSkuOrderFieldSummary(sku) }}
                </div>
              </div>
              <div v-if="formData.skus.length === 0" class="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-500">
                暂无规格，点击右上角添加规格
              </div>
              <div
                v-if="formData.deliveryMode !== 'third_party_api'"
                class="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500"
              >
                半方这类供货商绑定在“三方接口调用”模式下使用，切过去后每个规格下面会出现“绑定货源”。
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div class="border-b border-gray-100 px-6 py-5">
          <h3 class="text-lg font-semibold text-gray-900">详情介绍</h3>
        </div>
        <editor-content :editor="editor" class="min-h-[320px] p-6" />
      </div>

      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div class="border-b border-gray-100 px-6 py-5">
          <h3 class="text-lg font-semibold text-gray-900">详情图</h3>
        </div>
        <div class="p-6">
          <div v-if="formData.screenshots.length" class="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div v-for="(url, index) in formData.screenshots" :key="index" class="group relative overflow-hidden rounded-lg bg-gray-50">
              <img :src="url" class="h-24 w-full object-cover" />
              <button
                @click="removeScreenshot(index)"
                class="absolute right-0 top-0 h-5 w-5 rounded-bl bg-red-500 text-xs text-white opacity-0 group-hover:opacity-100"
              >×</button>
            </div>
          </div>
          <input ref="screenshotInput" type="file" accept="image/*" multiple class="hidden" @change="handleScreenshotsUpload" />
          <button
            @click="$refs.screenshotInput.click()"
            :disabled="uploadingScreenshot || formData.screenshots.length >= 20"
            class="rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
          >
            {{ uploadingScreenshot ? t('publishWorkflow.uploading') : t('publishWorkflow.add') }}
          </button>
        </div>
      </div>
    </div>

    <BaseModal
      v-model="showSourceModal"
      :title="`绑定货源 - ${currentSourceSku?.name || '规格'}`"
      size="lg"
      :show-footer="false"
      body-class="overflow-y-auto"
      @close="closeSourceModal"
    >
      <div v-if="currentSourceSku" class="space-y-4">
        <div v-if="currentSourceSku.sourceBindings?.length || currentSourceSku.pendingProviderProducts?.length">
          <div class="mb-2 text-sm font-semibold text-gray-900">已绑定货源</div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="binding in currentSourceSku.sourceBindings"
              :key="`binding-${binding.id}`"
              class="inline-flex items-center gap-2 rounded-full bg-gray-100 py-1 pl-1 pr-3 text-xs text-gray-700"
            >
              <img
                v-if="binding.provider_image_url"
                :src="binding.provider_image_url"
                class="h-6 w-6 rounded-full object-cover"
              />
              <span v-else class="h-6 w-6 rounded-full bg-gray-200"></span>
              {{ binding.provider_product_title }} / {{ money(binding.cost_price) }}
              <button type="button" class="text-red-500" @click="removeSkuBinding(currentSourceSku, binding)">×</button>
            </span>
            <span
              v-for="product in currentSourceSku.pendingProviderProducts"
              :key="`pending-${product.id}`"
              class="inline-flex items-center gap-2 rounded-full bg-primary-50 py-1 pl-1 pr-3 text-xs text-primary-700"
            >
              <img
                v-if="product.provider_image_url"
                :src="product.provider_image_url"
                class="h-6 w-6 rounded-full object-cover"
              />
              <span v-else class="h-6 w-6 rounded-full bg-primary-100"></span>
              {{ product.provider_product_title }} / {{ money(product.cost_price) }}
              <button type="button" class="text-red-500" @click="removePendingProvider(currentSourceSku, product.id)">×</button>
            </span>
          </div>
        </div>

        <div class="flex gap-2">
          <input
            v-model.trim="providerKeyword"
            class="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary-500"
            placeholder="搜半方商品名 / 编号"
            @keyup.enter="resetProviderProducts"
          />
          <button type="button" class="h-10 rounded-lg bg-primary-600 px-4 text-sm text-white" @click="resetProviderProducts">查询</button>
        </div>

        <div class="max-h-[60vh] overflow-auto rounded-xl border border-gray-100" @scroll="handleProviderScroll">
          <button
            v-for="product in providerProducts"
            :key="product.id"
            type="button"
            class="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-3 text-left hover:bg-primary-50"
            @click="addPendingProvider(currentSourceSku, product)"
          >
            <span class="flex min-w-0 items-center gap-3">
              <img
                v-if="product.provider_image_url"
                :src="product.provider_image_url"
                class="h-11 w-11 shrink-0 rounded-lg border border-gray-100 object-cover"
              />
              <span v-else class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">无图</span>
              <span class="min-w-0">
                <span class="block truncate text-sm font-medium text-gray-900">{{ product.provider_product_title }}</span>
                <span class="block truncate text-xs text-gray-500">编号 {{ product.provider_product_no }} / {{ product.provider_category_path || '未分类' }}</span>
                <span v-if="getOrderFieldSummary(product.order_fields)" class="block truncate text-xs text-primary-600">
                  参数 {{ getOrderFieldSummary(product.order_fields) }}
                </span>
                <span v-else class="block truncate text-xs text-gray-400">无需填写参数</span>
              </span>
            </span>
            <span class="shrink-0 text-sm font-semibold text-orange-600">{{ money(product.cost_price) }}</span>
          </button>
          <div v-if="!providerProducts.length" class="px-3 py-8 text-center text-sm text-gray-500">
            {{ providerLoading ? '加载中...' : '暂无可用货源' }}
          </div>
          <div v-else class="px-3 py-3 text-center text-xs text-gray-400">
            {{ providerLoading ? '加载中...' : providerHasMore ? '继续下滑加载更多' : '已加载全部货源' }}
          </div>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { showMessage } from '@/utils/message'
import { workflowApi } from '@/api/workflow'
import {
  bindResourceProviderProduct,
  deleteResourceSkuMapping,
  getResourceProviderProducts,
  getResourceSkuMappings
} from '@/api/resourceMarket'
import api from '@/services/api'
import BaseModal from '@/components/BaseModal/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { t } = useI18n()
const isAdmin = computed(() => Boolean(userStore.user?.is_admin))

// Tiptap 编辑器
const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: t('publishWorkflow.editorPlaceholder')
    })
  ],
  content: '',
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none'
    }
  },
  onUpdate: ({ editor }) => {
    formData.value.longDescription = editor.getHTML()
  },
  onCreate: ({ editor }) => {
    console.log('✅ 编辑器已创建')
    // 如果表单数据中已经有内容，立即设置
    if (formData.value.longDescription) {
      editor.commands.setContent(formData.value.longDescription)
      console.log('✏️ 编辑器创建后立即设置内容')
    }
  }
})

// 标题选项
const headingLevel = ref('')
const headingOptions = [
  { label: t('publishWorkflow.body'), value: '' },
  { label: t('publishWorkflow.heading1'), value: '1' },
  { label: t('publishWorkflow.heading2'), value: '2' },
  { label: t('publishWorkflow.heading3'), value: '3' }
]

// 设置标题
const setHeading = (level) => {
  if (!editor.value) return
  if (level === '') {
    editor.value.chain().focus().setParagraph().run()
  } else {
    editor.value.chain().focus().toggleHeading({ level: parseInt(level) }).run()
  }
  headingLevel.value = level
}

// 工作流信息（从 history.state 获取）
const workflowId = ref(history.state.workflow_id || '')
const workflowName = ref(history.state.workflow_name || '')
const workflowDbId = ref(Number(history.state.workflow_db_id || 0))
const isEditMode = ref(history.state.edit_mode === true)

const resourceCategoryTree = [
  {
    label: '餐饮饮品',
    value: 'food_drink',
    legacyCategory: 'other',
    children: [
      { label: '咖啡饮品', value: 'coffee' },
      { label: '奶茶甜品', value: 'milk_tea' },
      { label: '快餐小吃', value: 'fast_food' },
      { label: '外卖代下', value: 'delivery' },
      { label: '商超餐券', value: 'meal_coupon' }
    ]
  },
  {
    label: '视频会员',
    value: 'video_member',
    legacyCategory: 'other',
    children: [
      { label: '长视频会员', value: 'long_video' },
      { label: '短视频权益', value: 'short_video' },
      { label: '音乐会员', value: 'music' },
      { label: '网盘会员', value: 'cloud_drive' },
      { label: '联合会员', value: 'bundle' }
    ]
  },
  {
    label: '出行打车',
    value: 'travel',
    legacyCategory: 'other',
    children: [
      { label: '打车券', value: 'taxi_coupon' },
      { label: '加油洗车', value: 'car_service' },
      { label: '停车权益', value: 'parking' },
      { label: '骑行权益', value: 'bike' },
      { label: '出行月卡', value: 'travel_monthly_card' }
    ]
  },
  {
    label: '娱乐游戏',
    value: 'entertainment_game',
    legacyCategory: 'other',
    children: [
      { label: '游戏点卡', value: 'game_card' },
      { label: '游戏会员', value: 'game_member' },
      { label: '直播会员', value: 'live_member' },
      { label: '电影票券', value: 'movie_ticket' },
      { label: '演出娱乐', value: 'show_entertainment' }
    ]
  },
  {
    label: '办公会员',
    value: 'office_member',
    legacyCategory: 'other',
    children: [
      { label: '文档办公', value: 'document' },
      { label: '网盘存储', value: 'storage' },
      { label: 'AI 工具', value: 'ai_tools' },
      { label: '设计工具', value: 'design' },
      { label: '开发工具', value: 'dev_tools' }
    ]
  },
  {
    label: '生活权益',
    value: 'life_rights',
    legacyCategory: 'other',
    children: [
      { label: '商超购物', value: 'shopping' },
      { label: '话费流量', value: 'phone_data' },
      { label: '本地生活', value: 'local_life' },
      { label: '充值缴费', value: 'recharge_payment' },
      { label: '生活服务', value: 'life_service' }
    ]
  },
  {
    label: '邮箱资源',
    value: 'mail_resource',
    legacyCategory: 'outlook',
    children: [
      { label: 'Outlook 邮箱', value: 'outlook_mail' },
      { label: 'Gmail 邮箱', value: 'gmail' },
      { label: '企业邮箱', value: 'enterprise_mail' },
      { label: '三方邮箱', value: 'external_mail' },
      { label: '邮箱辅助服务', value: 'mail_service' }
    ]
  },
  {
    label: '自动化工具',
    value: 'automation_tool',
    legacyCategory: 'automation',
    children: [
      { label: '工作流', value: 'workflow' },
      { label: '插件', value: 'plugin' },
      { label: '脚本工具', value: 'script' },
      { label: '邮箱自动化', value: 'mail_automation' },
      { label: '数据处理', value: 'data_processing' }
    ]
  }
]

const primaryCategoryOptions = resourceCategoryTree.map(({ label, value }) => ({ label, value }))

const selectedPrimaryCategory = computed(
  () => resourceCategoryTree.find((item) => item.value === formData.value.primaryCategory) || null
)

const secondaryCategoryOptions = computed(() => selectedPrimaryCategory.value?.children || [])

const legacyCategory = computed(() => {
  const primary = selectedPrimaryCategory.value
  if (!primary) return formData.value.category || 'other'
  if (primary.value === 'mail_resource' && formData.value.secondaryCategory === 'outlook_mail') return 'outlook'
  if (primary.value === 'automation_tool') return 'automation'
  return primary.legacyCategory || 'other'
})

const pricingOptions = [
  {
    label: t('publishWorkflow.pricingFree'),
    value: 'free',
    desc: t('publishWorkflow.pricingFreeDesc'),
    badge: t('publishWorkflow.pricingFreeBadge'),
    badgeClass: 'bg-green-100 text-green-700'
  },
  {
    label: t('publishWorkflow.pricingPerUse'),
    value: 'per_use',
    desc: t('publishWorkflow.pricingPerUseDesc')
  },
  {
    label: t('publishWorkflow.pricingSubscription'),
    value: 'subscription',
    desc: t('publishWorkflow.pricingSubscriptionDesc')
  }
]

const periodOptions = [
  { label: t('publishWorkflow.periodMonthly'), value: 'monthly' },
  { label: t('publishWorkflow.periodYearly'), value: 'yearly' },
  { label: t('publishWorkflow.periodLifetime'), value: 'lifetime' }
]

const deliveryOptions = computed(() => {
  const options = [
    {
      label: '三方接口调用',
      value: 'third_party_api',
      desc: '适合瑞幸、会员、券码这类走供货接口的商品'
    },
    {
      label: '库存发货',
      value: 'inventory',
      desc: '适合账号、卡密、兑换码，买多少出多少库存'
    },
    {
      label: '自动化执行',
      value: 'workflow',
      desc: '适合原来的自动化工具或脚本执行'
    }
  ]
  return isAdmin.value ? options : options.filter((option) => option.value !== 'third_party_api')
})

const orderFieldPresetMap = {
  phone: {
    key: 'phone',
    label: '充值手机号',
    type: 'phone',
    validation: 'phone',
    placeholder: '请输入需要充值的手机号'
  },
  qq: {
    key: 'qq',
    label: 'QQ号',
    type: 'text',
    validation: 'qq',
    placeholder: '请输入需要充值的 QQ 号'
  },
  member_account: {
    key: 'member_account',
    label: '会员账号',
    type: 'text',
    placeholder: '请输入需要充值的会员账号'
  },
  email: {
    key: 'email',
    label: '邮箱账号',
    type: 'text',
    validation: 'email',
    placeholder: '请输入需要充值的邮箱'
  },
  account: {
    key: 'account',
    label: '充值账号',
    type: 'text',
    placeholder: '请输入需要充值的账号'
  }
}

const parseArrayValue = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const normalizeProviderOrderFields = (fields = []) =>
  parseArrayValue(fields)
    .map((field, index) => {
      if (!field || typeof field !== 'object') return null
      const key = field.key || field.name || `field_${index + 1}`
      const label = field.label || field.title || field.name || key || '下单参数'
      return {
        key,
        name: field.name || key,
        label,
        type: field.type || 'text',
        placeholder: field.placeholder || field.desc || `请输入${label}`,
        validation: field.validation || '',
        required: field.required !== false,
        options: Array.isArray(field.options) ? field.options : []
      }
    })
    .filter(Boolean)

const createSku = (overrides = {}) => ({
  localId: overrides.localId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  id: overrides.id || '',
  name: overrides.name || '白色',
  imageUrl: overrides.imageUrl || '',
  price: Number(overrides.price || 0),
  allowBatchPurchase: Boolean(overrides.allowBatchPurchase),
  orderFields: normalizeProviderOrderFields(overrides.orderFields || overrides.order_fields),
  sourceBindings: Array.isArray(overrides.sourceBindings) ? overrides.sourceBindings : [],
  pendingProviderProducts: Array.isArray(overrides.pendingProviderProducts) ? overrides.pendingProviderProducts : []
})

// 表单数据
const formData = ref({
  name: workflowName.value || '',
  description: '',
  category: '',
  primaryCategory: '',
  secondaryCategory: '',
  tags: [],
  pricingModel: 'free',
  milkCoinPrice: 0,
  subscriptionPeriod: 'monthly', // monthly 或 yearly
  deliveryMode: isAdmin.value ? 'third_party_api' : 'inventory',
  orderFieldPreset: 'none',
  requiresRechargeAccount: false,
  inventoryEnabled: false, // 是否启用库存管理
  iconUrl: '',
  screenshots: [],
  skus: [createSku()],
  longDescription: ''
})

// 文件大小限制
const MAX_ICON_SIZE = 2 * 1024 * 1024 // 2MB
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_SCREENSHOTS = 20

// 输入框
const tagInput = ref('')

// 状态
const generating = ref(false)
const submitting = ref(false)
const uploadingIcon = ref(false)
const uploadingScreenshot = ref(false)
const uploadingSkuImage = ref(false)
const providerLoading = ref(false)
const providerKeyword = ref('')
const providerProducts = ref([])
const providerPage = ref(1)
const providerPageSize = 30
const providerHasMore = ref(true)
const showSourceModal = ref(false)
const activeSourceSkuIndex = ref(-1)

// Refs
const iconInput = ref(null)
const screenshotInput = ref(null)

// 添加标签
const addTag = () => {
  const tag = tagInput.value.trim()
  if (tag && !formData.value.tags.includes(tag)) {
    formData.value.tags.push(tag)
    tagInput.value = ''
  }
}

// 移除标签
const removeTag = (tag) => {
  formData.value.tags = formData.value.tags.filter(t => t !== tag)
}

// 移除截图
const removeScreenshot = (index) => {
  formData.value.screenshots.splice(index, 1)
}

const handleSkuImageUpload = async (event, sku) => {
  const file = event.target.files[0]
  if (!file) return

  if (file.size > MAX_ICON_SIZE) {
    showMessage(t('publishWorkflow.iconTooLarge', { size: MAX_ICON_SIZE / 1024 / 1024 }), 'error')
    event.target.value = ''
    return
  }

  uploadingSkuImage.value = true
  try {
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)

    const res = await api.post('/upload/image', uploadFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (res.code === 0) {
      sku.imageUrl = res.data.url
      showMessage('规格图片上传成功', 'success')
    }
  } catch (error) {
    console.error('上传规格图片失败:', error)
    showMessage(t('publishWorkflow.uploadFailed'), 'error')
  } finally {
    uploadingSkuImage.value = false
    event.target.value = ''
  }
}

const getSkuPreviewImage = (sku) => sku.imageUrl || formData.value.iconUrl || ''

const money = (value) => Number(value || 0).toFixed(2)

const getSkuId = (sku, index) => sku.id || `sku-${index + 1}`

const currentSourceSku = computed(() => {
  if (activeSourceSkuIndex.value < 0) return null
  return formData.value.skus[activeSourceSkuIndex.value] || null
})

const getSkuSourceCount = (sku) =>
  (sku.sourceBindings?.length || 0) + (sku.pendingProviderProducts?.length || 0)

const getSkuSources = (sku) => [
  ...(sku.sourceBindings || []).map((item) => ({
    key: `binding-${item.id || item.provider_product_no}`,
    title: item.provider_product_title || item.title || '未命名货源',
    no: item.provider_product_no || item.product_no || '',
    image: item.provider_image_url || item.image_url || '',
    cost: item.cost_price ?? item.cost ?? 0
  })),
  ...(sku.pendingProviderProducts || []).map((item) => ({
    key: `pending-${item.id || item.provider_product_no}`,
    title: item.provider_product_title || item.title || '未命名货源',
    no: item.provider_product_no || item.product_no || '',
    image: item.provider_image_url || item.image_url || '',
    cost: item.cost_price ?? item.cost ?? 0
  }))
]

const getOrderFieldSummary = (fields = []) => {
  const normalized = normalizeProviderOrderFields(fields)
  return normalized.map((field) => field.label || field.name).filter(Boolean).join('、')
}

const getSkuProviderOrderFields = (sku) => {
  const sources = [
    ...(sku.sourceBindings || []),
    ...(sku.pendingProviderProducts || [])
  ]
  const seen = new Set()
  const fields = []
  sources.forEach((source) => {
    normalizeProviderOrderFields(source.order_fields).forEach((field) => {
      const key = field.name || field.key || field.label
      if (!key || seen.has(key)) return
      seen.add(key)
      fields.push(field)
    })
  })
  return fields.length ? fields : normalizeProviderOrderFields(sku.orderFields)
}

const getSkuOrderFieldSummary = (sku) => getOrderFieldSummary(getSkuProviderOrderFields(sku))

const skuAllowsBatchPurchase = (sku) =>
  formData.value.deliveryMode === 'inventory' || getSkuProviderOrderFields(sku).length === 0

const loadProviderProducts = async ({ reset = false } = {}) => {
  if (providerLoading.value) return
  if (!reset && !providerHasMore.value) return
  if (reset) {
    providerPage.value = 1
    providerHasMore.value = true
  }
  providerLoading.value = true
  try {
    const res = await getResourceProviderProducts({
      keyword: providerKeyword.value || undefined,
      only_saleable: true,
      page: providerPage.value,
      page_size: providerPageSize
    })
    if (res.code === 0 && res.data) {
      const items = (res.data.items || []).map((item) => ({
        ...item,
        order_fields: normalizeProviderOrderFields(item.order_fields)
      }))
      providerProducts.value = reset ? items : [...providerProducts.value, ...items]
      providerHasMore.value = items.length >= providerPageSize
      if (providerHasMore.value) {
        providerPage.value += 1
      }
    } else {
      showMessage(res.message || '加载货源失败', 'error')
    }
  } finally {
    providerLoading.value = false
  }
}

const resetProviderProducts = () => loadProviderProducts({ reset: true })

const handleProviderScroll = (event) => {
  const target = event.target
  if (!target || providerLoading.value || !providerHasMore.value) return
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) {
    loadProviderProducts()
  }
}

const openSkuSourceModal = async (index) => {
  activeSourceSkuIndex.value = index
  showSourceModal.value = true
  if (providerProducts.value.length === 0) {
    await resetProviderProducts()
  }
}

const closeSourceModal = () => {
  showSourceModal.value = false
  activeSourceSkuIndex.value = -1
}

const addPendingProvider = (sku, product) => {
  const productNo = String(product.provider_product_no || '')
  const exists = (sku.sourceBindings || []).some(item => String(item.provider_product_no || '') === productNo)
    || (sku.pendingProviderProducts || []).some(item => Number(item.id) === Number(product.id))
  if (exists) {
    showMessage('这个货源已经在当前规格里了', 'warning')
    return
  }
  sku.pendingProviderProducts = [
    ...(sku.pendingProviderProducts || []),
    {
      ...product,
      order_fields: normalizeProviderOrderFields(product.order_fields)
    }
  ]
}

const removePendingProvider = (sku, productId) => {
  sku.pendingProviderProducts = (sku.pendingProviderProducts || []).filter(item => Number(item.id) !== Number(productId))
}

const removeSkuBinding = async (sku, binding) => {
  if (!binding?.id) return
  const res = await deleteResourceSkuMapping(binding.id)
  if (res.code === 0) {
    sku.sourceBindings = (sku.sourceBindings || []).filter(item => Number(item.id) !== Number(binding.id))
    showMessage('货源已删除', 'success')
  } else {
    showMessage(res.message || '删除货源失败', 'error')
  }
}

const loadSkuMappings = async (dbId = workflowDbId.value) => {
  if (!dbId) return
  const res = await getResourceSkuMappings({
    workflow_id: dbId,
    page: 1,
    page_size: 100
  })
  if (res.code !== 0 || !res.data) return
  const mappings = res.data.items || []
  formData.value.skus = formData.value.skus.map((sku, index) => {
    const localSkuId = getSkuId(sku, index)
    return {
      ...sku,
      sourceBindings: mappings
        .filter(item => String(item.local_sku_id) === String(localSkuId))
        .map(item => ({
          ...item,
          order_fields: normalizeProviderOrderFields(item.order_fields)
        })),
      pendingProviderProducts: sku.pendingProviderProducts || []
    }
  })
}

const saveSkuSourceBindings = async (normalizedSkus) => {
  if (formData.value.deliveryMode !== 'third_party_api' || !workflowDbId.value) return
  for (let index = 0; index < formData.value.skus.length; index += 1) {
    const sku = formData.value.skus[index]
    const localSkuId = normalizedSkus[index]?.id || getSkuId(sku, index)
    for (const product of sku.pendingProviderProducts || []) {
      const res = await bindResourceProviderProduct({
        workflow_id: workflowDbId.value,
        local_sku_id: localSkuId,
        provider_product_id: product.id,
        sell_price: normalizedSkus[index]?.sell_price || normalizedSkus[index]?.price || 0
      })
      if (res.code !== 0) {
        throw new Error(res.message || `绑定货源失败：${product.provider_product_title}`)
      }
    }
    sku.pendingProviderProducts = []
  }
}

const addSku = () => {
  formData.value.skus.push(createSku({
    name: formData.value.skus.length === 0 ? '白色' : '黑色',
    allowBatchPurchase: true
  }))
}

const removeSku = (index) => {
  formData.value.skus.splice(index, 1)
}

const normalizeSkuPayload = () =>
  formData.value.skus.map((sku, index) => {
    const price = formData.value.pricingModel === 'free' ? 0 : Number(sku.price || 0)
    const localSkuId = getSkuId(sku, index)
    const orderFields = formData.value.deliveryMode === 'third_party_api'
      ? getSkuProviderOrderFields(sku)
      : []
    sku.id = localSkuId
    const fulfillmentType = formData.value.deliveryMode === 'third_party_api'
      ? 'api'
      : formData.value.deliveryMode === 'inventory'
        ? 'account'
        : 'workflow'
    return {
      id: localSkuId,
      name: String(sku.name || '').trim(),
      spec_name: String(sku.name || '').trim(),
      image_url: getSkuPreviewImage(sku),
      price,
      sell_price: price,
      milk_coin_price: price,
      delivery_mode: formData.value.deliveryMode,
      fulfillment_type: fulfillmentType,
      order_field_preset: orderFields.length ? 'provider_attach' : 'none',
      requires_recharge_account: orderFields.length > 0,
      order_fields: orderFields,
      allow_batch_purchase: skuAllowsBatchPurchase(sku)
    }
  })

const getLowestSkuPrice = (skus) => {
  if (formData.value.pricingModel === 'free') return 0
  const prices = skus.map((sku) => Number(sku.price || 0)).filter((price) => price > 0)
  return prices.length ? Math.min(...prices) : 0
}

const inferPrimaryCategory = (category) => {
  if (category === 'outlook' || category === 'mailbox') return 'mail_resource'
  if (category === 'automation') return 'automation_tool'
  return 'food_drink'
}

const inferSecondaryCategory = (category) => {
  if (category === 'outlook') return 'outlook_mail'
  if (category === 'mailbox') return 'external_mail'
  if (category === 'automation') return 'workflow'
  return 'coffee'
}

const normalizeWorkflowSkus = (wf) => {
  const skus = Array.isArray(wf.skus) ? wf.skus : []
  if (skus.length > 0) {
    return skus.map((sku) => createSku({
      id: String(sku.id || sku.sku_id || ''),
      name: sku.name || sku.spec_name || sku.title || wf.name || '',
      imageUrl: sku.image_url || sku.imageUrl || '',
      price: Number(sku.sell_price ?? sku.price ?? sku.milk_coin_price ?? wf.milk_coin_price ?? 0),
      allowBatchPurchase: Boolean(sku.allow_batch_purchase),
      orderFields: normalizeProviderOrderFields(sku.order_fields)
    }))
  }
  return [createSku({
    name: '白色',
    price: Number(wf.milk_coin_price || 0),
    allowBatchPurchase: Boolean(wf.inventory_enabled)
  })]
}

const inferDeliveryMode = (wf) => {
  const skus = Array.isArray(wf.skus) ? wf.skus : []
  const skuMode = skus[0]?.delivery_mode || skus[0]?.fulfillment_type || ''
  if (skuMode === 'third_party_api' || skuMode === 'api') {
    return isAdmin.value ? 'third_party_api' : 'inventory'
  }
  if (skuMode === 'inventory' || skuMode === 'account' || wf.inventory_enabled) return 'inventory'
  if (skuMode === 'workflow' || wf.category === 'automation') return 'workflow'
  return isAdmin.value ? 'third_party_api' : 'inventory'
}

const inferOrderFieldPreset = (wf) => {
  const skus = Array.isArray(wf.skus) ? wf.skus : []
  const firstSku = skus[0] || {}
  if (firstSku.order_field_preset) {
    return firstSku.order_field_preset
  }
  const orderFields = Array.isArray(firstSku.order_fields) ? firstSku.order_fields : []
  const firstField = orderFields[0] || {}
  if (firstField.key && orderFieldPresetMap[firstField.key]) {
    return firstField.key
  }
  if (firstField.validation === 'phone') return 'phone'
  if (firstField.validation === 'email') return 'email'
  if (firstField.validation === 'qq') return 'qq'
  if (firstField.key || firstSku.requires_recharge_account) return 'account'
  return 'none'
}

// 添加特性
const addFeature = () => {
  formData.value.features.push({ icon: 'check', text: '' })
}

// 移除特性
const removeFeature = (index) => {
  formData.value.features.splice(index, 1)
}

// 上传图标
const handleIconUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 验证文件大小
  if (file.size > MAX_ICON_SIZE) {
    showMessage(t('publishWorkflow.iconTooLarge', { size: MAX_ICON_SIZE / 1024 / 1024 }), 'error')
    event.target.value = ''
    return
  }

  uploadingIcon.value = true
  try {
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)

    const res = await api.post('/upload/image', uploadFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (res.code === 0) {
      // 后端已返回完整URL，直接使用
      formData.value.iconUrl = res.data.url
      showMessage(t('publishWorkflow.iconUploadSuccess'), 'success')
    }
  } catch (error) {
    console.error('上传图标失败:', error)
    showMessage(t('publishWorkflow.uploadFailed'), 'error')
  } finally {
    uploadingIcon.value = false
    event.target.value = ''
  }
}

// 上传截图
const handleScreenshotsUpload = async (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  // 检查数量限制
  const remaining = MAX_SCREENSHOTS - formData.value.screenshots.length
  if (remaining <= 0) {
    showMessage(t('publishWorkflow.screenshotLimit'), 'warning')
    event.target.value = ''
    return
  }

  const filesToUpload = files.slice(0, remaining)

  // 验证文件大小
  for (const file of filesToUpload) {
    if (file.size > MAX_SCREENSHOT_SIZE) {
      showMessage(t('publishWorkflow.fileTooLarge', { name: file.name, size: MAX_SCREENSHOT_SIZE / 1024 / 1024 }), 'error')
      event.target.value = ''
      return
    }
  }

  uploadingScreenshot.value = true
  try {
    for (const file of filesToUpload) {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const res = await api.post('/upload/image', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.code === 0) {
        // 后端已返回完整URL，直接使用
        formData.value.screenshots.push(res.data.url)
      }
    }
    showMessage(t('publishWorkflow.screenshotUploadSuccess'), 'success')
  } catch (error) {
    console.error('上传截图失败:', error)
    showMessage(t('publishWorkflow.uploadFailed'), 'error')
  } finally {
    uploadingScreenshot.value = false
    event.target.value = ''
  }
}

// MD编辑器内上传图片
const handleUploadImage = async (file) => {
  // 验证文件大小
  if (file.size > MAX_SCREENSHOT_SIZE) {
    throw new Error(t('publishWorkflow.imageTooLarge', { size: MAX_SCREENSHOT_SIZE / 1024 / 1024 }))
  }

  try {
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)

    const res = await api.post('/upload/image', uploadFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (res.code === 0) {
      // 后端已返回完整URL，直接使用
      return res.data.url
    }
    throw new Error(res.message || t('publishWorkflow.uploadFailed'))
  } catch (error) {
    console.error('上传图片失败:', error)
    throw error
  }
}

// AI生成
const generateWithAI = async () => {
  if (!workflowId.value) {
    showMessage(t('publishWorkflow.workflowIdMissing'), 'error')
    return
  }

  generating.value = true
  try {
    const res = await workflowApi.generateWorkflowDescription(workflowId.value)
    if (res.code === 0 && res.data?.long_description) {
      formData.value.longDescription = res.data.long_description
      // 设置 Tiptap 编辑器内容
      if (editor.value) {
        editor.value.commands.setContent(res.data.long_description)
      }
      showMessage(t('publishWorkflow.aiSuccess'), 'success')
    } else {
      showMessage(res.message || t('publishWorkflow.aiFailed'), 'error')
    }
  } catch (error) {
    console.error('AI生成失败:', error)
    showMessage(t('publishWorkflow.aiFailed'), 'error')
  } finally {
    generating.value = false
  }
}

// 提交表单
const handleSubmit = async () => {
  // 验证
  if (!formData.value.name.trim()) {
    showMessage('请填写标题', 'warning')
    return
  }
  if (!formData.value.primaryCategory) {
    showMessage(t('publishWorkflow.selectCategoryWarning'), 'warning')
    return
  }
  if (!formData.value.secondaryCategory) {
    showMessage('请选择二级分类', 'warning')
    return
  }
  if (formData.value.deliveryMode === 'third_party_api' && !isAdmin.value) {
    showMessage('三方接口商品只有管理员可以发布', 'warning')
    return
  }
  const skus = normalizeSkuPayload()
  if (skus.length === 0) {
    showMessage('请至少添加一个规格', 'warning')
    return
  }
  if (skus.some((sku) => !sku.name)) {
    showMessage('请填写规格名称', 'warning')
    return
  }
  if (
    formData.value.deliveryMode === 'third_party_api'
    && formData.value.skus.some((sku) => !(sku.sourceBindings?.length || sku.pendingProviderProducts?.length))
  ) {
    showMessage('三方接口商品的每个规格都需要绑定至少一个货源', 'warning')
    return
  }
  const lowestSkuPrice = getLowestSkuPrice(skus)
  if (formData.value.pricingModel !== 'free' && lowestSkuPrice <= 0) {
    showMessage(t('publishWorkflow.priceWarning'), 'warning')
    return
  }
  if (formData.value.pricingModel === 'subscription' && !formData.value.subscriptionPeriod) {
    showMessage(t('publishWorkflow.periodWarning'), 'warning')
    return
  }
  if (!formData.value.longDescription) {
    showMessage(t('publishWorkflow.descriptionWarning'), 'warning')
    return
  }

  submitting.value = true
  try {
    const data = {
      name: formData.value.name.trim(),
      description: formData.value.description.trim(),
      category: legacyCategory.value,
      primary_category: formData.value.primaryCategory,
      secondary_category: formData.value.secondaryCategory,
      tags: formData.value.tags,
      milk_coin_price: lowestSkuPrice,
      pricing_model: formData.value.pricingModel,
      inventory_enabled: formData.value.deliveryMode === 'inventory',
      icon_url: formData.value.iconUrl || null,
      screenshots: formData.value.screenshots,
      skus,
      long_description: formData.value.longDescription
    }

    // 如果是订阅模式，添加订阅周期
    if (formData.value.pricingModel === 'subscription') {
      data.subscription_period = formData.value.subscriptionPeriod
    }

    // 根据是否编辑模式调用不同API
    let res
    if (isEditMode.value) {
      // 编辑模式：直接更新市场信息，不需要审核
      res = await workflowApi.updateWorkflowMarketInfo(workflowId.value, data)
    } else {
      // 新发布：提交审核
      res = await workflowApi.publishWorkflowToMarket(workflowId.value, data)
    }

    if (res.code === 0) {
      await saveSkuSourceBindings(skus)
      const message = isEditMode.value ? t('publishWorkflow.updateSuccess') : t('publishWorkflow.publishSuccess')
      showMessage(message, 'success')
      setTimeout(() => {
        router.push('/automation/workflows')
      }, 1500)
    }
  } catch (error) {
    console.error('发布失败:', error)
  } finally {
    submitting.value = false
  }
}

// 取消
const handleCancel = () => {
  router.push('/automation/workflows')
}

watch(() => formData.value.primaryCategory, (newValue, oldValue) => {
  if (oldValue && newValue !== oldValue) {
    formData.value.secondaryCategory = ''
  }
})

watch(legacyCategory, (category) => {
  formData.value.category = category
  if (category === 'outlook') {
    formData.value.deliveryMode = 'inventory'
    formData.value.inventoryEnabled = true
  }
})

watch(isAdmin, (value) => {
  if (!value && formData.value.deliveryMode === 'third_party_api') {
    formData.value.deliveryMode = 'inventory'
  }
})

watch(() => formData.value.deliveryMode, (mode) => {
  if (!isAdmin.value && mode === 'third_party_api') {
    formData.value.deliveryMode = 'inventory'
    return
  }
  if (legacyCategory.value === 'outlook' && mode !== 'inventory') {
    formData.value.deliveryMode = 'inventory'
    return
  }
  if (mode !== 'third_party_api') {
    formData.value.orderFieldPreset = 'none'
    formData.value.requiresRechargeAccount = false
    closeSourceModal()
  }
  formData.value.inventoryEnabled = mode === 'inventory'
})


// 加载工作流信息
const loadWorkflowInfo = async () => {
  if (!workflowId.value) {
    console.warn('⚠️ workflowId 为空，无法加载工作流信息')
    return
  }

  console.log('📥 开始加载工作流信息:', workflowId.value)

  try {
    const res = await workflowApi.getWorkflow(workflowId.value)
    console.log('📦 获取工作流信息响应:', res)
    
    if (res.code === 0 && res.data) {
      const wf = res.data
      workflowDbId.value = Number(wf.id || workflowDbId.value || 0)
      console.log('✅ 成功获取工作流数据:', wf)
      
      // 回显表单数据
      formData.value = {
        name: wf.name || workflowName.value || '',
        description: wf.description || '',
        category: wf.category || '',
        primaryCategory: wf.primary_category || inferPrimaryCategory(wf.category),
        secondaryCategory: wf.secondary_category || inferSecondaryCategory(wf.category),
        tags: wf.keywords || [],
        pricingModel: wf.pricing_model || 'free',
        milkCoinPrice: wf.milk_coin_price || 0,
        subscriptionPeriod: wf.subscription_period || 'monthly',
        deliveryMode: inferDeliveryMode(wf),
        orderFieldPreset: inferOrderFieldPreset(wf),
        requiresRechargeAccount: inferOrderFieldPreset(wf) !== 'none',
        inventoryEnabled: Boolean(wf.inventory_enabled),
        iconUrl: wf.icon_url || '',
        screenshots: wf.screenshots || [],
        skus: normalizeWorkflowSkus(wf),
        longDescription: wf.long_description || ''
      }

      console.log('📝 表单数据已设置:', formData.value)

      // 设置富文本编辑器内容（需要等待编辑器初始化完成）
      if (wf.long_description) {
        // 使用 nextTick 确保编辑器已经初始化
        await new Promise(resolve => setTimeout(resolve, 100))
        if (editor.value) {
          editor.value.commands.setContent(wf.long_description)
          console.log('✏️ 编辑器内容已设置')
        } else {
          console.warn('⚠️ 编辑器尚未初始化，稍后重试')
          // 如果编辑器还未初始化，等待一段时间后重试
          setTimeout(() => {
            if (editor.value) {
              editor.value.commands.setContent(wf.long_description)
              console.log('✏️ 编辑器内容已设置（延迟）')
            }
          }, 500)
        }
      }
      await loadSkuMappings(workflowDbId.value)
      
      // 如果已有市场信息且已发布，进入编辑模式
      // 被拒绝的工作流需要重新提交审核，不进入编辑模式
      if (wf.market_status && wf.market_status !== 'draft' && wf.market_status !== 'rejected') {
        isEditMode.value = true
        console.log('📝 已切换到编辑模式')
      }
    } else {
      console.error('❌ 获取工作流信息失败:', res.message)
      showMessage(res.message || t('publishWorkflow.workflowInfoFailed'), 'error')
    }
  } catch (error) {
    console.error('❌ 加载工作流信息异常:', error)
    showMessage(t('publishWorkflow.workflowInfoFailed'), 'error')
  }
}

onMounted(async () => {
  console.log('🔍 发布页面挂载，检查参数:')
  console.log('  - history.state:', history.state)
  console.log('  - workflowId:', workflowId.value)
  console.log('  - workflowName:', workflowName.value)
  console.log('  - isEditMode:', isEditMode.value)

  if (!workflowId.value) {
    showMessage(t('publishWorkflow.workflowIdMissing'), 'error')
    setTimeout(() => {
      router.push('/automation/workflows')
    }, 2000)
    return
  }

  // 加载工作流数据
  await loadWorkflowInfo()
})

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})
</script>

<style>
/* Tiptap 编辑器基础样式 */
.ProseMirror {
  min-height: 100%;
}

.ProseMirror:focus {
  outline: none;
}

/* placeholder 样式 */
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

/* 基本排版样式 */
.ProseMirror h1 {
  font-size: 1.875rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.ProseMirror h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.75rem;
  line-height: 1.3;
}

.ProseMirror h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.ProseMirror p {
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

.ProseMirror ul,
.ProseMirror ol {
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.ProseMirror li {
  margin-bottom: 0.25rem;
}

.ProseMirror strong {
  font-weight: 600;
}

.ProseMirror em {
  font-style: italic;
}

.ProseMirror code {
  background-color: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}

.ProseMirror pre {
  background-color: #1f2937;
  color: #e5e7eb;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
  overflow-x: auto;
}

.ProseMirror pre code {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.ProseMirror blockquote {
  border-left: 3px solid #d1d5db;
  padding-left: 1rem;
  margin-left: 0;
  margin-bottom: 0.75rem;
  color: #6b7280;
}
</style>
