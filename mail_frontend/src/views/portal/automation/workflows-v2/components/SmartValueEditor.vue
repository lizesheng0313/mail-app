<template>
  <div class="space-y-2">
    <!-- Tab 切换 -->
    <div class="flex rounded-md border border-gray-200 overflow-hidden">
      <button
        @click="tab = 'ai'"
        class="flex-1 px-3 py-1 text-xs transition-colors"
        :class="tab === 'ai' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
      >
        AI 助手
      </button>
      <button
        @click="tab = 'manual'"
        class="flex-1 px-3 py-1 text-xs transition-colors"
        :class="tab === 'manual' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
      >
        直接配置
      </button>
    </div>

    <!-- Tab 1: AI 助手 -->
    <div v-if="tab === 'ai'" class="space-y-2">
      <div class="flex gap-1.5">
        <input
          v-model.trim="aiInput"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="告诉 AI 怎么填，如：从这些里随机选一个：你好,早上好"
          @keydown.enter="askAI"
        />
        <button
          @click="askAI"
          :disabled="aiLoading || !aiInput"
          class="px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 shrink-0 transition-colors"
        >
          {{ aiLoading ? '...' : '生成' }}
        </button>
      </div>
      <!-- 元素上下文提示 -->
      <div v-if="elementContext?.label || elementContext?.ariaLabel" class="text-[11px] text-gray-400">
        当前元素：{{ elementContext.label || elementContext.ariaLabel || elementContext.name || elementContext.selector }}
        <span v-if="elementContext.type">({{ elementContext.type }})</span>
      </div>
    </div>

    <!-- Tab 2: 直接配置 -->
    <div v-if="tab === 'manual'" class="space-y-2">
      <select
        :value="currentType"
        @change="onTypeChange($event.target.value)"
        class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:border-primary-400 focus:outline-none"
      >
        <option value="fixed">固定值</option>
        <option value="variable">引用变量</option>
        <option value="random_from_list">随机列表</option>
        <option value="random_name">随机姓名</option>
        <option value="random_int">随机数字</option>
        <option value="random_string">随机字符串</option>
        <option value="sequential_from_list">顺序循环</option>
      </select>

      <!-- 固定值 -->
      <template v-if="currentType === 'fixed'">
        <input
          :value="strategy?.value || value"
          @input="emitStrategy({ type: 'fixed', value: $event.target.value })"
          class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="直接输入固定值"
        />
      </template>

      <!-- 引用变量 -->
      <template v-if="currentType === 'variable'">
        <select
          :value="strategy?.var_name || ''"
          @change="emitStrategy({ type: 'variable', var_name: $event.target.value })"
          class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="">请选择变量</option>
          <option value="email">email (邮箱)</option>
          <option value="password">password (密码)</option>
          <option value="username">username (用户名)</option>
          <option value="phone">phone (手机号)</option>
          <option value="captcha_text">captcha_text (验证码)</option>
          <option value="email_code">email_code (邮件验证码)</option>
          <option value="sms_code">sms_code (短信验证码)</option>
        </select>
      </template>

      <!-- 随机列表 -->
      <template v-if="currentType === 'random_from_list' || currentType === 'sequential_from_list'">
        <textarea
          :value="(strategy?.items || []).join('\n')"
          @input="onListInput($event.target.value)"
          class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none min-h-[80px]"
          placeholder="每行一个选项&#10;你好&#10;早上好&#10;嗨"
        ></textarea>
        <p class="text-[11px] text-gray-400">{{ currentType === 'random_from_list' ? '每次随机选一个' : '按顺序依次选取' }}</p>
      </template>

      <!-- 随机姓名 -->
      <template v-if="currentType === 'random_name'">
        <select
          :value="strategy?.locale || 'en'"
          @change="emitStrategy({ type: 'random_name', locale: $event.target.value })"
          class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="en">英文名</option>
          <option value="zh">中文名</option>
        </select>
      </template>

      <!-- 随机数字 -->
      <template v-if="currentType === 'random_int'">
        <div class="flex gap-2">
          <input
            :value="strategy?.min ?? 1"
            @input="emitStrategy({ type: 'random_int', min: Number($event.target.value), max: strategy?.max ?? 100 })"
            type="number"
            class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs focus:border-primary-400 focus:outline-none"
            placeholder="最小值"
          />
          <span class="text-xs text-gray-400 self-center">~</span>
          <input
            :value="strategy?.max ?? 100"
            @input="emitStrategy({ type: 'random_int', min: strategy?.min ?? 1, max: Number($event.target.value) })"
            type="number"
            class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs focus:border-primary-400 focus:outline-none"
            placeholder="最大值"
          />
        </div>
      </template>

      <!-- 随机字符串 -->
      <template v-if="currentType === 'random_string'">
        <div class="flex gap-2">
          <input
            :value="strategy?.length ?? 8"
            @input="emitStrategy({ type: 'random_string', length: Number($event.target.value), charset: strategy?.charset || 'alphanumeric' })"
            type="number" min="1" max="64"
            class="w-20 px-2 py-1.5 border border-gray-200 rounded text-xs focus:border-primary-400 focus:outline-none"
            placeholder="长度"
          />
          <select
            :value="strategy?.charset || 'alphanumeric'"
            @change="emitStrategy({ type: 'random_string', length: strategy?.length ?? 8, charset: $event.target.value })"
            class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:border-primary-400 focus:outline-none"
          >
            <option value="alphanumeric">字母+数字</option>
            <option value="alpha">纯字母</option>
            <option value="digits">纯数字</option>
            <option value="lowercase">小写字母</option>
          </select>
        </div>
      </template>
    </div>

    <!-- 策略预览 -->
    <div v-if="strategy && strategy.type" class="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded text-[11px] text-green-700">
      <span class="font-medium">{{ strategyLabel }}</span>
      <span v-if="strategy.source === 'ai'" class="text-green-500">(AI 生成)</span>
    </div>

    <!-- select 元素的选项列表 -->
    <div v-if="elementContext?.options?.length && (currentType === 'fixed' || !strategy)" class="mt-1">
      <p class="text-[11px] text-gray-400 mb-1">页面选项：</p>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="opt in elementContext.options.slice(0, 20)"
          :key="opt.value"
          @click="emitStrategy({ type: 'fixed', value: opt.value })"
          class="px-1.5 py-0.5 text-[11px] rounded border transition-colors"
          :class="(strategy?.value || value) === opt.value
            ? 'border-primary-400 bg-primary-50 text-primary-700'
            : 'border-gray-200 text-gray-500 hover:border-primary-300'"
        >
          {{ opt.text || opt.value }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { workflowV2Api } from '@/api/workflowV2'
import { showMessage } from '@/utils/message'

const props = defineProps({
  strategy: { type: Object, default: null },
  value: { type: String, default: '' },
  elementContext: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:strategy', 'update:value'])

const tab = ref(props.strategy?.source === 'ai' ? 'ai' : 'manual')
const aiInput = ref(props.strategy?.source_prompt || '')
const aiLoading = ref(false)

const currentType = computed(() => props.strategy?.type || 'fixed')

const strategyLabel = computed(() => {
  const s = props.strategy
  if (!s) return ''
  const labels = {
    fixed: `固定: ${s.value || ''}`,
    variable: `变量: {{${s.var_name || ''}}}`,
    random_from_list: `随机: ${(s.items || []).slice(0, 3).join('/')}${(s.items || []).length > 3 ? '...' : ''}`,
    random_name: `随机${s.locale === 'zh' ? '中文' : '英文'}名`,
    random_int: `随机 ${s.min ?? 0}~${s.max ?? 100}`,
    random_string: `随机${s.length || 8}位${s.charset === 'digits' ? '数字' : '字符'}`,
    sequential_from_list: `顺序: ${(s.items || []).slice(0, 3).join('→')}`,
  }
  return labels[s.type] || s.type
})

const emitStrategy = (strategy) => {
  emit('update:strategy', strategy)
  // 同时更新显示用的 value
  if (strategy.type === 'fixed') {
    emit('update:value', strategy.value)
  } else if (strategy.type === 'variable') {
    emit('update:value', `{{${strategy.var_name}}}`)
  } else {
    emit('update:value', `[${strategyLabel.value}]`)
  }
}

const onListInput = (text) => {
  const items = text.split('\n').map(s => s.trim()).filter(Boolean)
  emitStrategy({ type: currentType.value, items })
}

const onTypeChange = (type) => {
  const defaults = {
    fixed: { type: 'fixed', value: props.value || '' },
    variable: { type: 'variable', var_name: '' },
    random_from_list: { type: 'random_from_list', items: [] },
    random_name: { type: 'random_name', locale: 'en' },
    random_int: { type: 'random_int', min: 1, max: 100 },
    random_string: { type: 'random_string', length: 8, charset: 'alphanumeric' },
    sequential_from_list: { type: 'sequential_from_list', items: [], var_counter: `_seq_${Date.now()}` },
  }
  emitStrategy(defaults[type] || { type: 'fixed', value: '' })
}

const askAI = async () => {
  if (!aiInput.value) return
  aiLoading.value = true
  try {
    const res = await workflowV2Api.interpretSmartValue({
      user_instruction: aiInput.value,
      element_context: props.elementContext,
    })
    if (res.code === 0 && res.data?.type) {
      emitStrategy(res.data)
      showMessage('策略已生成', 'success')
    } else {
      showMessage(res.message || '生成失败', 'error')
    }
  } catch (err) {
    console.error(err)
    showMessage('AI 请求失败', 'error')
  } finally {
    aiLoading.value = false
  }
}
</script>
