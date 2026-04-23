<template>
  <div class="space-y-2">
    <PluginActionParams
      v-if="isPlugin"
      :action="action"
      :params="params"
      @update="update"
    />
    <BrowserActionParams
      v-else-if="isBrowser"
      :action="action"
      :params="params"
      :element-context="elementContext"
      @update="update"
      @strategy-update="onStrategyUpdate"
    />
    <DataActionParams
      v-else
      :action="action"
      :params="params"
      @update="update"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PluginActionParams from './params/PluginActionParams.vue'
import BrowserActionParams from './params/BrowserActionParams.vue'
import DataActionParams from './params/DataActionParams.vue'

const PLUGIN_ACTIONS = new Set([
  'allocate_email', 'wait_email_code', 'solve_captcha', 'get_phone_number', 'wait_sms_code'
])
const BROWSER_ACTIONS = new Set([
  'navigate', 'click', 'fill', 'select', 'check', 'hover',
  'wait_for', 'screenshot', 'extract_text', 'extract_attr', 'keyboard', 'javascript', 'scroll',
  'dismiss_dialog', 'switch_to_frame', 'switch_to_main', 'upload_file',
  'handle_new_tab', 'close_tab', 'wait_for_navigation', 'close_overlay', 'wait_for_url', 'drag_and_drop',
])

const props = defineProps({
  action: { type: String, required: true },
  params: { type: Object, default: () => ({}) },
  elementContext: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:params'])

const isPlugin = computed(() => PLUGIN_ACTIONS.has(props.action))
const isBrowser = computed(() => BROWSER_ACTIONS.has(props.action))

const update = (key, value) => {
  emit('update:params', { ...props.params, [key]: value })
}

const onStrategyUpdate = (strategy) => {
  const newParams = { ...props.params }
  if (strategy) {
    newParams.value_strategy = strategy
  } else {
    delete newParams.value_strategy
  }
  emit('update:params', newParams)
}
</script>
