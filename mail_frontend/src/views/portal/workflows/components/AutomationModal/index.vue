<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-0 border max-w-3xl shadow-lg rounded-lg bg-white">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b">
        <h3 class="text-xl font-semibold text-black">
          {{ t('automationModal.title') }}
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-black"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 内容 -->
      <div class="p-6">
        <form @submit.prevent="handleSubmit">
          <!-- 基本信息 -->
          <div class="mb-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="name" class="block text-sm font-medium text-black mb-2">
                  {{ t('automationModal.name') }} *
                </label>
                <BaseInput
                  id="name"
                  v-model="form.name"
                  type="text"
                  required
                  :placeholder="t('automationModal.namePlaceholder')"
                />
              </div>
              <div>
                <label for="type" class="block text-sm font-medium text-black mb-2">
                  {{ t('automationModal.type') }} *
                </label>
                <CustomSelect
                  v-model="form.type"
                  :options="automationTypeOptions"
                  :placeholder="t('automationModal.selectType')"
                  @update:modelValue="handleTypeChange"
                />
              </div>
            </div>
            <div class="mt-4">
              <label for="description" class="block text-sm font-medium text-black mb-2">
                {{ t('automationModal.description') }}
              </label>
              <BaseTextarea
                id="description"
                v-model="form.description"
                rows="3"
                :placeholder="t('automationModal.descriptionPlaceholder')"
              />
            </div>
          </div>

          <!-- 类型说明 -->
          <div v-if="selectedTypeInfo" class="mb-6 p-4 bg-primary-50 rounded-lg">
            <h4 class="text-sm font-medium text-blue-900 mb-2">{{ selectedTypeInfo.name }}</h4>
            <p class="text-sm text-primary-700">{{ selectedTypeInfo.description }}</p>
          </div>

          <!-- 邮件处理配置 -->
          <div v-if="form.type === 'email_processing'" class="mb-6">
            <h4 class="text-lg font-medium text-black mb-4">{{ t('automationModal.emailProcessingConfig') }}</h4>
            
            <!-- 获取邮件配置 -->
            <div class="mb-4">
              <h5 class="text-sm font-medium text-black mb-3">{{ t('automationModal.fetchSettings') }}</h5>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-black mb-1">
                    {{ t('automationModal.folder') }}
                  </label>
                  <BaseInput
                    v-model="form.config.fetch_params.folder"
                    type="text"
                    size="sm"
                    placeholder="INBOX"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-black mb-1">
                    {{ t('automationModal.limit') }}
                  </label>
                  <BaseInput
                    v-model="form.config.fetch_params.limit"
                    type="number"
                    min="1"
                    max="100"
                    size="sm"
                    placeholder="10"
                  />
                </div>
                <div class="flex items-center">
                  <input
                    id="unread_only"
                    v-model="form.config.fetch_params.unread_only"
                    type="checkbox"
                    class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  >
                  <label for="unread_only" class="ml-2 block text-sm text-black">
                    {{ t('automationModal.unreadOnly') }}
                  </label>
                </div>
              </div>
            </div>

            <!-- 处理规则配置 -->
            <div class="mb-4">
              <h5 class="text-sm font-medium text-black mb-3">{{ t('automationModal.rules') }}</h5>
              <div class="space-y-3">
                <div
                  v-for="(rule, index) in form.config.process_params.rules"
                  :key="index"
                  class="flex items-center space-x-3 p-3 border border-gray-200 rounded-md"
                >
                  <input
                    v-model="rule.condition"
                    type="text"
                    :placeholder="t('automationModal.ruleConditionPlaceholder')"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                  >
                  <input
                    v-model="rule.action"
                    type="text"
                    :placeholder="t('automationModal.ruleActionPlaceholder')"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                  >
                  <button
                    type="button"
                    @click="removeRule(index)"
                    class="text-red-600 hover:text-red-800"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  @click="addRule"
                  class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  {{ t('automationModal.addRule') }}
                </button>
              </div>
            </div>
          </div>

          <!-- 网页爬取配置 -->
          <div v-if="form.type === 'web_crawling'" class="mb-6">
            <h4 class="text-lg font-medium text-black mb-4">{{ t('automationModal.webCrawlingConfig') }}</h4>
            
            <!-- 爬取设置 -->
            <div class="mb-4">
              <h5 class="text-sm font-medium text-black mb-3">{{ t('automationModal.crawlSettings') }}</h5>
              <div class="grid grid-cols-1 gap-4">
                <div>
                  <label class="block text-sm font-medium text-black mb-1">
                    {{ t('automationModal.targetUrls') }}
                  </label>
                  <textarea
                    v-model="urlsText"
                    rows="4"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                    :placeholder="t('automationModal.targetUrlsPlaceholder')"
                  ></textarea>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-black mb-1">
                      {{ t('automationModal.timeoutSeconds') }}
                    </label>
                    <input
                      v-model.number="form.config.crawl_params.timeout"
                      type="number"
                      min="1"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                      placeholder="30"
                    >
                  </div>
                  <div class="flex items-center">
                    <input
                      id="use_proxy"
                      v-model="form.config.use_proxy"
                      type="checkbox"
                      class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    >
                    <label for="use_proxy" class="ml-2 block text-sm text-black">
                      {{ t('automationModal.useProxy') }}
                    </label>
                  </div>
                  <div v-if="form.config.use_proxy">
                    <label class="block text-sm font-medium text-black mb-1">
                      {{ t('automationModal.proxyPool') }}
                    </label>
                    <CustomSelect
                      v-model="form.config.proxy_pool_id"
                      :options="proxyPoolOptions"
                      :placeholder="t('automationModal.selectProxyPool')"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 数据处理设置 -->
            <div class="mb-4">
              <h5 class="text-sm font-medium text-black mb-3">{{ t('automationModal.dataProcessing') }}</h5>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-black mb-1">
                    {{ t('automationModal.outputFormat') }}
                  </label>
                  <CustomSelect
                    v-model="form.config.process_params.output_format"
                    :options="outputFormatOptions"
                    :placeholder="t('automationModal.selectOutputFormat')"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-black mb-1">
                    {{ t('automationModal.extractRules') }}
                  </label>
                  <textarea
                    v-model="extractRulesText"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm font-mono"
                    :placeholder="t('automationModal.extractRulesPlaceholder')"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- 文件处理配置 -->
          <div v-if="form.type === 'file_processing'" class="mb-6">
            <h4 class="text-lg font-medium text-black mb-4">{{ t('automationModal.fileProcessingConfig') }}</h4>
            
            <div class="grid grid-cols-1 gap-4">
              <div>
                <label class="block text-sm font-medium text-black mb-1">
                  {{ t('automationModal.filePaths') }}
                </label>
                <textarea
                  v-model="filePathsText"
                  rows="4"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                  :placeholder="t('automationModal.filePathsPlaceholder')"
                ></textarea>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-black mb-1">
                    {{ t('automationModal.fileTypeFilter') }}
                  </label>
                  <input
                    v-model="fileTypesText"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                    :placeholder="t('automationModal.fileTypePlaceholder')"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-black mb-1">
                    {{ t('automationModal.outputFormat') }}
                  </label>
                  <CustomSelect
                    v-model="form.config.process_params.output_format"
                    :options="outputFormatOptions"
                    :placeholder="t('automationModal.selectOutputFormat')"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-black hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? t('automationModal.creating') : t('automationModal.create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseTextarea from '@/components/BaseTextarea/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { workflowApi } from '@/api/workflow'
import { proxyApi } from '@/api/proxy'
import { showMessage } from '@/utils/message'

const emit = defineEmits(['close', 'created'])
const { t } = useI18n()

// 响应式数据
const loading = ref(false)
const automationTypes = ref({})
const proxyPools = ref([])
const form = ref({
  name: '',
  description: '',
  type: '',
  config: {
    fetch_params: {
      folder: 'INBOX',
      limit: 10,
      unread_only: true
    },
    process_params: {
      rules: [],
      output_format: 'json'
    },
    crawl_params: {
      urls: [],
      headers: {},
      timeout: 30
    },
    use_proxy: false,
    proxy_pool_id: null,
    proxy_strategy: {
      ip_reuse_policy: 'time_based',
      reuse_interval_hours: 72,
      min_success_rate: 80.0
    }
  }
})

// 辅助文本字段
const urlsText = ref('')
const extractRulesText = ref('[]')
const filePathsText = ref('')
const fileTypesText = ref('')

// 计算属性
const localizedAutomationTypeMeta = computed(() => ({
  email_processing: {
    name: t('automationModal.typeEmailProcessingName'),
    description: t('automationModal.typeEmailProcessingDescription')
  },
  web_crawling: {
    name: t('automationModal.typeWebCrawlingName'),
    description: t('automationModal.typeWebCrawlingDescription')
  },
  file_processing: {
    name: t('automationModal.typeFileProcessingName'),
    description: t('automationModal.typeFileProcessingDescription')
  }
}))

const automationTypeOptions = computed(() => {
  return Object.keys(automationTypes.value).map(key => ({
    label: localizedAutomationTypeMeta.value[key]?.name || automationTypes.value[key].name,
    value: key
  }))
})

const selectedTypeInfo = computed(() => {
  if (!form.value.type) return null

  return {
    ...automationTypes.value[form.value.type],
    ...localizedAutomationTypeMeta.value[form.value.type]
  }
})

const outputFormatOptions = [
  { label: 'JSON', value: 'json' },
  { label: 'CSV', value: 'csv' },
  { label: 'XML', value: 'xml' },
  { label: 'TXT', value: 'txt' }
]

const proxyPoolOptions = computed(() => {
  return proxyPools.value.map(pool => ({
    label: `${pool.pool_name} (${pool.pool_type.toUpperCase()})`,
    value: pool.id
  }))
})

// 方法
const fetchAutomationTypes = async () => {
  try {
    const response = await workflowApi.getAutomationTypes()
    automationTypes.value = response.data || {}
  } catch (error) {
    showMessage(t('automationModal.fetchTypesFailed'), 'error')
  }
}

const fetchProxyPools = async () => {
  try {
    const response = await proxyApi.getProxyPools()
    proxyPools.value = response.data?.pools || []
  } catch (error) {
    // 静默处理代理池获取失败
  }
}

const handleTypeChange = (type) => {
  // 重置配置
  if (type === 'email_processing') {
    form.value.config.process_params.rules = []
  } else if (type === 'web_crawling') {
    urlsText.value = ''
    extractRulesText.value = '[]'
  } else if (type === 'file_processing') {
    filePathsText.value = ''
    fileTypesText.value = ''
  }
}

const addRule = () => {
  form.value.config.process_params.rules.push({
    condition: '',
    action: ''
  })
}

const removeRule = (index) => {
  form.value.config.process_params.rules.splice(index, 1)
}

const handleSubmit = async () => {
  try {
    loading.value = true

    // 处理不同类型的配置
    const config = { ...form.value.config }

    if (form.value.type === 'web_crawling') {
      // 处理URL列表
      config.crawl_params.urls = urlsText.value
        .split('\n')
        .map(url => url.trim())
        .filter(url => url)

      // 处理提取规则
      try {
        config.process_params.extract_rules = JSON.parse(extractRulesText.value || '[]')
      } catch (e) {
        throw new Error(t('automationModal.invalidExtractRules'))
      }
    } else if (form.value.type === 'file_processing') {
      // 处理文件路径列表
      config.read_params = {
        file_paths: filePathsText.value
          .split('\n')
          .map(path => path.trim())
          .filter(path => path),
        file_types: fileTypesText.value
          .split(',')
          .map(type => type.trim())
          .filter(type => type)
      }
    }

    const data = {
      name: form.value.name,
      description: form.value.description,
      type: form.value.type,
      config
    }

    await workflowApi.createAutomation(data)
    showMessage(t('automationModal.createSuccess'), 'success')
    emit('created')

  } catch (error) {
    showMessage(error?.message || t('automationModal.createFailed'), 'error')
  } finally {
    loading.value = false
  }
}

// 生命周期
onMounted(() => {
  fetchAutomationTypes()
  fetchProxyPools()
})
</script>
