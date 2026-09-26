<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-3">
    <div class="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl">
      <!-- 模态框头部 -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-black">设置代理权限</h3>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-black"
          >
            <BaseIcon name="close" size="sm" />
          </button>
        </div>
      </div>

      <!-- 模态框内容 -->
      <div class="px-6 py-4">
        <!-- 用户信息 -->
        <div class="mb-6">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
              {{ user.username.charAt(0).toUpperCase() }}
            </div>
            <div>
              <div class="font-medium text-black">{{ user.username }}</div>
              <div class="text-sm text-black">{{ user.email || '未设置邮箱' }}</div>
            </div>
          </div>
        </div>

        <!-- 代理权限设置 -->
        <div class="space-y-4">
          <!-- 启用代理 -->
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-black">启用代理权限</label>
              <p class="text-xs text-black">允许该用户在工作流中使用代理IP</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="form.proxy_enabled"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <!-- 代理配额 -->
          <div v-if="form.proxy_enabled">
            <label class="block text-sm font-medium text-black mb-2">
              每日代理配额
            </label>
            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <input
                  type="radio"
                  id="unlimited"
                  value="unlimited"
                  v-model="quotaType"
                  class="text-primary-600"
                />
                <label for="unlimited" class="text-sm text-black">无限制</label>
              </div>
              <div class="flex items-center space-x-2">
                <input
                  type="radio"
                  id="limited"
                  value="limited"
                  v-model="quotaType"
                  class="text-primary-600"
                />
                <label for="limited" class="text-sm text-black">限制配额</label>
                <input
                  v-if="quotaType === 'limited'"
                  type="number"
                  v-model.number="form.proxy_quota"
                  min="1"
                  max="10000"
                  class="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="1000"
                />
                <span v-if="quotaType === 'limited'" class="text-sm text-black">次/天</span>
              </div>
            </div>
            <p class="text-xs text-black mt-1">
              代理配额控制用户每日可使用的代理IP次数，0或空表示无限制
            </p>
          </div>

          <!-- 当前使用情况 -->
          <div v-if="user.proxy_enabled" class="bg-gray-50 rounded-lg p-3">
            <h4 class="text-xs font-medium text-black mb-2">当前使用情况</h4>
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span class="text-black">今日已用:</span>
                <span class="font-medium">{{ user.proxy_used_today }}</span>
              </div>
              <div>
                <span class="text-black">配额:</span>
                <span class="font-medium">{{ user.proxy_quota || '无限制' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 模态框底部 -->
      <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-black border border-gray-300 rounded-md hover:bg-gray-50"
        >
          取消
        </button>
        <button
          @click="handleSave"
          :disabled="saving"
          class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import BaseIcon from '@/components/BaseIcon/index.vue'
import { adminUsersApi } from '@/api/adminUsers'
import { showMessage } from '@/utils/message'

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'updated'])

const saving = ref(false)

// 表单数据
const form = reactive({
  proxy_enabled: false,
  proxy_quota: 1000
})

// 配额类型
const quotaType = ref('unlimited')

// 监听配额类型变化
watch(quotaType, (newType) => {
  if (newType === 'unlimited') {
    form.proxy_quota = 0
  } else if (newType === 'limited' && !form.proxy_quota) {
    form.proxy_quota = 1000
  }
})

// 监听代理启用状态
watch(() => form.proxy_enabled, (enabled) => {
  if (!enabled) {
    quotaType.value = 'unlimited'
    form.proxy_quota = 0
  }
})

// 初始化表单
const initForm = () => {
  form.proxy_enabled = props.user.proxy_enabled || false
  form.proxy_quota = props.user.proxy_quota || 0
  
  if (form.proxy_quota > 0) {
    quotaType.value = 'limited'
  } else {
    quotaType.value = 'unlimited'
  }
}

// 保存设置
const handleSave = async () => {
  try {
    saving.value = true
    
    const response = await adminUsersApi.updateUserProxyPermission(props.user.id, {
      proxy_enabled: form.proxy_enabled,
      proxy_quota: quotaType.value === 'unlimited' ? 0 : form.proxy_quota
    })
    
    if (response.code === 0) {
      showMessage('代理权限设置成功', 'success')
      emit('updated')
    } else {
      showMessage(response.message || '设置失败', 'error')
    }
  } catch (error) {
    console.error('更新用户代理权限失败:', error)
    showMessage('设置失败', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  initForm()
})
</script>
