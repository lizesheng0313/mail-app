<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
      <div class="mt-3">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-black">
            {{ isEdit ? '编辑代理' : '添加代理' }}
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-black">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <!-- 代理名称 -->
            <div>
              <label for="name" class="block text-sm font-medium text-black mb-1">代理名称</label>
              <BaseInput
                v-model="form.name"
                placeholder="输入代理名称"
                required
              />
            </div>

            <!-- API地址 -->
            <div v-if="!isEdit">
              <label for="api_url" class="block text-sm font-medium text-black mb-1">代理API地址</label>
              <BaseInput
                v-model="form.api_url"
                placeholder="输入API接口地址"
                required
              />
              <p class="text-xs text-black mt-1">
                系统会自动请求该地址获取代理IP和端口，返回格式：IP:端口（例如：192.168.1.1:8080）
              </p>
            </div>

            <!-- 编辑模式显示 API URL 和当前代理 -->
            <template v-if="isEdit">
              <!-- API 地址（只读） -->
              <div>
                <label class="block text-sm font-medium text-black mb-1">代理API地址</label>
                <div class="px-3 py-2 bg-gray-50 rounded-md text-sm text-black break-all">
                  {{ form.api_url || '未配置' }}
                </div>
              </div>
              
            </template>

            <!-- 供应商 -->
            <div>
              <label for="provider" class="block text-sm font-medium text-black mb-1">供应商</label>
              <BaseInput
                v-model="form.provider"
                placeholder="输入供应商名称（可选）"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-black mb-1">代理类型</label>
              <CustomSelect
                v-model="form.proxy_type"
                :options="proxyTypeOptions"
                placeholder="请选择代理类型"
              />
            </div>

            <!-- 总配额 -->
            <div>
              <label for="total_quota" class="block text-sm font-medium text-black mb-1">总使用数</label>
              <BaseInput
                v-model="form.total_quota"
                type="number"
                placeholder="输入总使用次数"
                :min="0"
              />
            </div>

            <!-- 是否启用 -->
            <div class="flex items-center">
              <input
                type="checkbox"
                id="is_enabled"
                v-model="form.is_enabled"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label for="is_enabled" class="ml-2 block text-sm text-black">启用代理</label>
            </div>
          </div>

          <div class="flex items-center justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-black hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ submitting ? '保存中...' : (isEdit ? '保存' : '创建') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { paidProxyApi } from '@/api/proxy'
import { showMessage } from '@/utils/message'

const props = defineProps({
  proxy: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'created', 'updated'])

const submitting = ref(false)
const proxyTypeOptions = [
  { label: '自动识别', value: 'auto' },
  { label: 'SOCKS5', value: 'socks5' },
  { label: 'HTTP', value: 'http' }
]

const form = ref({
  name: '',
  api_url: '',
  ip: '',
  port: 8080,
  proxy_type: 'auto',
  provider: '',
  total_quota: 1000,
  is_enabled: true
})

const isEdit = computed(() => !!props.proxy)

// 监听props变化，初始化表单
watch(() => props.proxy, (newProxy) => {
  if (newProxy) {
    form.value = {
      name: newProxy.name || '',
      api_url: newProxy.api_url || '',
      ip: newProxy.ip || '',
      port: newProxy.port || 8080,
      proxy_type: newProxy.proxy_type || 'auto',
      provider: newProxy.provider || '',
      total_quota: newProxy.total_quota || 1000,
      is_enabled: newProxy.is_enabled !== false
    }
  } else {
    // 重置表单
    form.value = {
      name: '',
      api_url: '',
      ip: '',
      port: 8080,
      proxy_type: 'auto',
      provider: '',
      total_quota: 1000,
      is_enabled: true
    }
  }
}, { immediate: true })

const handleSubmit = async () => {
  submitting.value = true

  try {
    if (isEdit.value) {
      // 编辑模式 - 只更新名称、供应商、配额、启用状态
      const submitData = {
        name: form.value.name,
        provider: form.value.provider,
        proxy_type: form.value.proxy_type,
        total_quota: Number(form.value.total_quota),
        is_enabled: form.value.is_enabled
      }
      
      const response = await paidProxyApi.updateProxy(props.proxy.id, submitData)
      if (response.code === 0) {
        showMessage('代理更新成功', 'success')
        emit('updated')
      } else {
        showMessage('代理更新失败', 'error')
      }
    } else {
      // 新建模式 - 通过API获取
      const submitData = {
        name: form.value.name,
        api_url: form.value.api_url,
        proxy_type: form.value.proxy_type,
        provider: form.value.provider,
        total_quota: Number(form.value.total_quota),
        is_enabled: form.value.is_enabled
      }
      
      const response = await paidProxyApi.createProxyFromApi(submitData)
      if (response.code === 0) {
        showMessage('代理创建成功', 'success')
        emit('created')
      } else {
        showMessage(response.message || '代理创建失败', 'error')
      }
    }
  } catch (error) {
    console.error('保存代理失败:', error)
    showMessage(error.response?.data?.detail || '保存代理失败', 'error')
  } finally {
    submitting.value = false
  }
}
</script>
