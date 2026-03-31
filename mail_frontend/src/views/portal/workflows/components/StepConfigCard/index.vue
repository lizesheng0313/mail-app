<template>
  <div class="border border-gray-200 rounded-lg p-3 bg-white">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2 flex-1">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-black text-xs font-medium">
          {{ stepIndex + 1 }}
        </span>
        <!-- 步骤备注 -->
        <input
          v-model="step.note"
          type="text"
          :placeholder="t('workflowEditor.notePlaceholder')"
          class="flex-1 px-2 py-1 text-xs text-black border border-gray-200 rounded focus:outline-none focus:border-primary-500 placeholder-gray-400"
        />
      </div>
      <div class="flex items-center space-x-1 ml-2">
        <!-- 在此之前插入步骤 -->
        <button
          type="button"
          @click="$emit('insert-before')"
          class="text-primary-500 hover:text-primary-700"
          :title="t('workflowEditor.insertBefore')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <!-- 上移按钮 -->
        <button
          type="button"
          @click="$emit('move-up')"
          :disabled="stepIndex === 0"
          :class="stepIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-black hover:text-black'"
          :title="t('workflowEditor.moveUp')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <!-- 下移按钮 -->
        <button
          type="button"
          @click="$emit('move-down')"
          :disabled="stepIndex === totalSteps - 1"
          :class="stepIndex === totalSteps - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-black hover:text-black'"
          :title="t('workflowEditor.moveDown')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <!-- 删除按钮 -->
        <button
          type="button"
          @click="$emit('remove')"
          class="text-red-400 hover:text-red-600"
          :title="t('workflowEditor.remove')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 步骤配置 -->
    <div class="grid grid-cols-1 gap-3">
      <!-- 动作选择 -->
      <div v-if="group.plugin_id">
        <label class="block text-xs font-medium text-black mb-1">
          {{ t('workflowEditor.pluginAction') }}
        </label>
        <CustomSelect
          v-model="step.action_key"
          :options="getPluginActionOptions(group.plugin_id)"
          :placeholder="t('workflowEditor.pluginActionPlaceholder')"
          @change="$emit('action-change')"
        />
      </div>
    </div>

    <!-- 动态参数配置 -->
    <div v-if="step.action_key" class="mt-3">
      <div class="mb-2">
        <label class="block text-xs font-medium text-black">
          {{ t('workflowEditor.actionParameters') }}
        </label>
      </div>
      
      <div class="space-y-3" v-if="getSelectedActionSchema(group, step)">
        <div
          v-for="(paramSchema, paramKey) in getSortedActionSchema(group, step)"
          :key="paramKey"
        >
          <!-- 普通参数 -->
          <div v-if="isSimpleParam(paramSchema) && shouldShowParam(paramKey)" class="grid grid-cols-4 gap-2 items-start">
            <label class="text-xs text-black pt-2 flex items-center gap-1">
              <span>{{ getParamLabel(paramKey, paramSchema) }}</span>
              <div v-if="paramSchema.tooltip || paramSchema.hint" class="relative group">
                <svg 
                  class="w-3 h-3 text-gray-400 cursor-help" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <!-- Tooltip 浮层 -->
                <div class="invisible group-hover:visible absolute left-4 top-0 z-50 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  {{ paramSchema.tooltip || paramSchema.hint }}
                  <div class="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-r-4 border-r-gray-800 border-b-4 border-b-transparent"></div>
                </div>
              </div>
            </label>
            <div class="col-span-3">
              <!-- 支持数组的字符串参数（如 selector）- 使用 textarea -->
              <textarea
                v-if="isArrayOrStringParam(paramSchema) && paramKey === 'selector'"
                v-model="selectorTextInput"
                @blur="updateSelectorParam()"
                :placeholder="paramSchema.hint || t('workflowEditor.selectorPlaceholder')"
                class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows="3"
              />
              <!-- text_list 参数 - 使用 textarea -->
              <textarea
                v-else-if="isArrayOrStringParam(paramSchema) && paramKey === 'text_list'"
                v-model="textListInput"
                @blur="updateTextListParam()"
                :placeholder="paramSchema.hint || t('workflowEditor.textListPlaceholder')"
                class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows="3"
              />
              <BaseInput
                v-else-if="paramSchema.type === 'string' && !paramSchema.enum"
                v-model="step.parameters[paramKey]"
                type="text"
                :placeholder="paramSchema.default || ''"
                size="sm"
              />
              <BaseInput
                v-else-if="paramSchema.type === 'number' || paramSchema.type === 'integer'"
                v-model.number="step.parameters[paramKey]"
                type="number"
                :placeholder="paramSchema.default?.toString() || ''"
                size="sm"
              />
              <!-- Boolean 开关 -->
              <label v-else-if="paramSchema.type === 'boolean'" class="flex items-center cursor-pointer">
                <div class="relative">
                  <input 
                    type="checkbox" 
                    class="sr-only"
                    :checked="step.parameters[paramKey] ?? paramSchema.default ?? false"
                    @change="e => step.parameters[paramKey] = e.target.checked"
                  >
                  <div 
                    class="block w-10 h-6 rounded-full transition"
                    :class="(step.parameters[paramKey] ?? paramSchema.default ?? false) ? 'bg-primary-500' : 'bg-gray-300'"
                  ></div>
                  <div 
                    class="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform"
                    :class="(step.parameters[paramKey] ?? paramSchema.default ?? false) ? 'translate-x-4' : ''"
                  ></div>
                </div>
                <span class="ml-2 text-xs text-black">
                  {{ (step.parameters[paramKey] ?? paramSchema.default ?? false) ? t('workflowEditor.yes') : t('workflowEditor.no') }}
                </span>
              </label>
              <CustomSelect
                v-else-if="paramSchema.enum"
                :model-value="step.parameters[paramKey] ?? paramSchema.default ?? ''"
                :options="paramSchema.enum.map(val => ({ value: val, label: getEnumLabel(paramKey, val) }))"
                :placeholder="getEnumLabel(paramKey, paramSchema.default) || t('workflowEditor.select')"
                @update:model-value="val => step.parameters[paramKey] = val"
              />
            </div>
          </div>
          
          <!-- 对象类型参数 -->
          <div v-else-if="paramSchema.type === 'object'" class="border border-gray-200 rounded p-2 bg-gray-50">
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-medium text-black">{{ paramSchema.description || paramKey }}</label>
              <button
                type="button"
                @click="toggleObjectParam(paramKey)"
                class="text-xs text-primary-600 hover:text-primary-700"
              >
                {{ isObjectExpanded(paramKey) ? t('workflowEditor.collapse') : t('workflowEditor.expand') }}
              </button>
            </div>
            <div v-if="isObjectExpanded(paramKey)" class="space-y-2 mt-2">
              <!-- oneOf 提示 -->
              <div v-if="paramSchema.oneOf_hint" class="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded mb-2">
                {{ paramSchema.oneOf_hint }}
              </div>
              <div
                v-for="(subSchema, subKey) in paramSchema.properties"
                :key="subKey"
                v-show="shouldShowNestedParam(paramKey, subKey)"
                class="grid grid-cols-3 gap-2 items-start"
              >
                <label class="text-xs text-black pt-2">{{ subSchema.description || subKey }}</label>
                <div class="col-span-2">
                  <BaseInput
                    v-if="subSchema.type === 'string'"
                    v-model="getNestedParam(paramKey)[subKey]"
                    type="text"
                    :placeholder="subSchema.description || ''"
                    size="sm"
                  />
                  <textarea
                    v-else-if="subSchema.type === 'array' && subSchema.items?.type === 'string'"
                    v-model="arrayInputs[`${paramKey}.${subKey}`]"
                    @blur="updateArrayParam(paramKey, subKey)"
                    :placeholder="t('workflowEditor.nestedArrayPlaceholder')"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    rows="3"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输出名称 -->
    <div v-if="step.action_key && shouldShowOutputName()" class="mt-3 border-t border-gray-200 pt-3">
      <div 
        class="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-1 px-1 py-1 rounded"
        @click="toggleOutputName()"
      >
        <label class="text-xs font-medium text-black cursor-pointer flex items-center gap-1">
          <svg 
            class="w-3 h-3 transition-transform" 
            :class="{ 'rotate-90': isOutputNameExpanded }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <span>{{ t('workflowEditor.outputNameOptional') }}</span>
        </label>
        <span v-if="!isOutputNameExpanded && step.output_name" class="text-xs text-black">
          {{ step.output_name }}
        </span>
      </div>
      <div v-if="isOutputNameExpanded" class="mt-2">
        <BaseInput
          v-model="step.output_name"
          type="text"
          :placeholder="t('workflowEditor.outputNamePlaceholder')"
          size="sm"
          class="text-xs"
        />
        <p class="text-xs text-black mt-1">
          {{ t('workflowEditor.outputReference', { name: step.output_name || t('workflowEditor.outputNameFallback') }) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import CustomSelect from '@/components/CustomSelect/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'

const { t } = useI18n()

const props = defineProps({
  step: {
    type: Object,
    required: true
  },
  stepIndex: {
    type: Number,
    required: true
  },
  totalSteps: {
    type: Number,
    required: true
  },
  group: {
    type: Object,
    required: true
  },
  getPluginActionOptions: {
    type: Function,
    required: true
  },
  getSelectedActionSchema: {
    type: Function,
    required: true
  }
})

defineEmits(['remove', 'action-change', 'move-up', 'move-down', 'insert-before'])

// 展开/收起对象参数
const expandedObjects = ref(new Set())
const arrayInputs = reactive({})
const selectorTextInput = ref('')
const textListInput = ref('')
const isOutputNameExpanded = ref(false) // 输出名称是否展开

// 初始化 selector 输入框（如果参数已存在）
if (props.step.parameters.selector) {
  if (Array.isArray(props.step.parameters.selector)) {
    selectorTextInput.value = props.step.parameters.selector.join('\n')
  } else {
    selectorTextInput.value = props.step.parameters.selector
  }
}

// 初始化 text_list 输入框（如果参数已存在）
if (props.step.parameters.text_list) {
  if (Array.isArray(props.step.parameters.text_list)) {
    textListInput.value = props.step.parameters.text_list.join('\n')
  } else {
    textListInput.value = props.step.parameters.text_list
  }
}

// 如果已经设置了输出名称，则默认展开
if (props.step.output_name) {
  isOutputNameExpanded.value = true
}

// 初始化嵌套数组参数（如 filter_conditions.domain_filter）
if (props.step.parameters) {
  Object.keys(props.step.parameters).forEach(paramKey => {
    const paramValue = props.step.parameters[paramKey]
    if (paramValue && typeof paramValue === 'object' && !Array.isArray(paramValue)) {
      // 这是一个嵌套对象（如 filter_conditions）
      Object.keys(paramValue).forEach(subKey => {
        const subValue = paramValue[subKey]
        if (Array.isArray(subValue)) {
          // 将数组转成文本（每行一个）
          const inputKey = `${paramKey}.${subKey}`
          arrayInputs[inputKey] = subValue.join('\n')
        }
      })
    }
  })
}

// 判断是否为简单参数
const isSimpleParam = (schema) => {
  if (!schema || !schema.type) return false
  return schema.type !== 'object' && schema.type !== 'array'
}

// 判断是否为支持数组或字符串的参数
const isArrayOrStringParam = (schema) => {
  if (!schema || !schema.type) return false
  if (Array.isArray(schema.type)) {
    return schema.type.includes('string') && schema.type.includes('array')
  }
  return false
}

// 更新 selector 参数
const updateSelectorParam = () => {
  const text = selectorTextInput.value || ''
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  if (lines.length === 0) {
    props.step.parameters.selector = ''
  } else if (lines.length === 1) {
    props.step.parameters.selector = lines[0]
  } else {
    props.step.parameters.selector = lines
  }
}

// 更新 text_list 参数
const updateTextListParam = () => {
  const text = textListInput.value || ''
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  if (lines.length === 0) {
    props.step.parameters.text_list = ''
  } else if (lines.length === 1) {
    props.step.parameters.text_list = lines[0]
  } else {
    props.step.parameters.text_list = lines
  }
}

const toggleObjectParam = (paramKey) => {
  if (expandedObjects.value.has(paramKey)) {
    expandedObjects.value.delete(paramKey)
  } else {
    expandedObjects.value.add(paramKey)
  }
}

const isObjectExpanded = (paramKey) => {
  return expandedObjects.value.has(paramKey)
}

// 获取嵌套参数
const getNestedParam = (paramKey) => {
  if (!props.step.parameters[paramKey]) {
    props.step.parameters[paramKey] = {}
  }
  return props.step.parameters[paramKey]
}

// 更新数组参数
const updateArrayParam = (paramKey, subKey) => {
  const inputKey = `${paramKey}.${subKey}`
  const text = arrayInputs[inputKey] || ''
  const arr = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  if (!props.step.parameters[paramKey]) {
    props.step.parameters[paramKey] = {}
  }
  props.step.parameters[paramKey][subKey] = arr
}

// 获取动作名称
const getActionName = (group, step) => {
  if (!group.plugin_id || !step.action_key) return t('workflowEditor.outputNameFallback')
  
  const actionOptions = props.getPluginActionOptions(group.plugin_id)
  const action = actionOptions.find(opt => opt.value === step.action_key)
  return action ? action.label : t('workflowEditor.outputNameFallback')
}

// 枚举值中英文映射
const enumLabelMap = () => ({
  delay_type: {
    fixed: t('workflowEditor.enumDelayFixed'),
    random: t('workflowEditor.enumDelayRandom')
  },
  direction: {
    up: t('workflowEditor.enumUp'),
    down: t('workflowEditor.enumDown'),
    top: t('workflowEditor.enumTop'),
    bottom: t('workflowEditor.enumBottom')
  },
  source: {
    body: t('workflowEditor.enumBody'),
    html_body: t('workflowEditor.enumHtmlBody'),
    subject: t('workflowEditor.enumSubject'),
    all: t('workflowEditor.enumAll')
  },
  format: {
    any: t('workflowEditor.enumAny'),
    mobile: t('workflowEditor.enumMobile'),
    landline: t('workflowEditor.enumLandline')
  },
  code_type: {
    any: t('workflowEditor.enumAny'),
    digits: t('workflowEditor.enumDigits'),
    letters: t('workflowEditor.enumLetters'),
    mixed: t('workflowEditor.enumMixed')
  }
})

// 获取枚举值的中文显示
const getEnumLabel = (paramKey, value) => {
  if (!value) return value
  
  const map = enumLabelMap()
  if (map[paramKey] && map[paramKey][value]) {
    return map[paramKey][value]
  }
  
  // 没有映射则返回原值
  return value
}

// 判断参数是否应该显示（条件显示逻辑）
const shouldShowParam = (paramKey) => {
  // ========== web_crawler 插件 ==========
  
  // wait_delay 动作的条件显示逻辑
  if (props.step.action_key === 'wait_delay') {
    const delayType = props.step.parameters.delay_type || 'fixed'
    
    if (paramKey === 'seconds') {
      // 只在固定延迟时显示
      return delayType === 'fixed'
    }
    
    if (paramKey === 'min_seconds' || paramKey === 'max_seconds') {
      // 只在随机延迟时显示
      return delayType === 'random'
    }
  }
  
  // scroll_page 动作：pixels 只在 up/down 时显示
  if (props.step.action_key === 'scroll_page') {
    const direction = props.step.parameters.direction
    
    if (paramKey === 'pixels') {
      return direction === 'up' || direction === 'down'
    }
  }
  
  // ========== email_extractor 插件 ==========
  
  // extract_emails 动作：custom_pattern 只在 pattern_type=custom 时显示
  if (props.step.action_key === 'extract_emails') {
    const patternType = props.step.parameters.pattern_type || 'auto'
    
    if (paramKey === 'custom_pattern') {
      return patternType === 'custom'
    }
  }
  
  // extract_urls 动作：custom_pattern 只在 url_type=custom 时显示
  if (props.step.action_key === 'extract_urls') {
    const urlType = props.step.parameters.url_type || 'all'
    
    if (paramKey === 'custom_pattern') {
      return urlType === 'custom'
    }
  }
  
  // 默认显示所有参数
  return true
}

// 判断嵌套参数是否应该显示（用于对象类型参数）
const shouldShowNestedParam = (parentKey, childKey) => {
  // ========== email_extractor 插件 ==========
  
  // extract_structured_data 动作的 extraction_rules 参数
  if (props.step.action_key === 'extract_structured_data' && parentKey === 'extraction_rules') {
    const dataType = props.step.parameters.data_type
    
    if (childKey === 'table_pattern') {
      return dataType === 'table'
    }
    
    if (childKey === 'list_separator') {
      return dataType === 'list'
    }
    
    if (childKey === 'kv_separator') {
      return dataType === 'key_value'
    }
  }
  
  // 默认显示所有嵌套参数
  return true
}

// 获取参数标签（去掉括号提示）
const getParamLabel = (paramKey, paramSchema) => {
  const description = paramSchema.description || paramKey
  
  // 去掉括号中的提示信息
  const cleanDescription = description.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').trim()
  
  return cleanDescription
}

// 获取排序后的参数 schema（按 order 字段排序）
const getSortedActionSchema = (group, step) => {
  const schema = props.getSelectedActionSchema(group, step)
  if (!schema) return {}
  
  // 将对象转换为数组，按 order 排序，再转回对象
  const entries = Object.entries(schema)
  
  // 按 order 字段排序，没有 order 的放到最后
  entries.sort((a, b) => {
    const orderA = a[1].order !== undefined ? a[1].order : 999
    const orderB = b[1].order !== undefined ? b[1].order : 999
    return orderA - orderB
  })
  
  // 转回对象
  return Object.fromEntries(entries)
}

// 切换输出名称的展开/收起
const toggleOutputName = () => {
  isOutputNameExpanded.value = !isOutputNameExpanded.value
}

// 判断是否需要显示输出名称（基于 action_key 判断）
const shouldShowOutputName = () => {
  const actionKey = props.step.action_key
  
  // 如果没有选择动作，不显示
  if (!actionKey) {
    return false
  }
  
  // 不需要输出名称的动作（操作类动作，不产生需要引用的数据）
  const noOutputActions = [
    'navigate_to_url',    // 导航到URL
    'click_element',      // 点击元素
    'input_text',         // 输入文本
    'select_dropdown',    // 选择下拉
    'scroll_page',        // 滚动页面
    'upload_file',        // 上传文件
    'wait_element',       // 等待元素
    'wait_delay'          // 延迟等待
  ]
  
  // 如果是操作类动作，不显示输出名称
  if (noOutputActions.includes(actionKey)) {
    return false
  }
  
  // 其他动作（获取数据类）都显示输出名称
  // 包括：get_element, get_text 等
  return true
}
</script>
