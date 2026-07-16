<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
      <!-- 模态框头部 -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-black">用户详情</h3>
          <button
            @click="$emit('close')"
            type="button"
            aria-label="关闭"
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-black"
          >
            <BaseIcon name="x" size="md" />
          </button>
        </div>
      </div>

      <!-- 模态框内容 -->
      <div class="px-6 py-4">
        <!-- 用户基本信息 -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-black mb-4">基本信息</h4>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center space-x-4 mb-4">
              <div class="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white text-xl font-medium">
                {{ user.username.charAt(0).toUpperCase() }}
              </div>
              <div>
                <div class="font-medium text-black text-sm">{{ user.username }}</div>
                <div class="text-xs text-black">{{ user.email || '未设置邮箱' }}</div>
                <div class="flex items-center space-x-2 mt-1">
                  <span :class="[
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                    user.is_active ? 'bg-primary-100 text-success-800' : 'bg-red-100 text-red-800'
                  ]">
                    {{ user.is_active ? '正常' : '禁用' }}
                  </span>
                  <span v-if="user.is_admin" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    管理员
                  </span>
                </div>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span class="text-black">注册时间:</span>
                <span class="font-medium">{{ formatDate(user.created_at) }}</span>
              </div>
              <div>
                <span class="text-black">最后登录:</span>
                <span class="font-medium">{{ user.last_login ? formatDate(user.last_login) : '从未登录' }}</span>
              </div>
              <div>
                <span class="text-black">登录IP:</span>
                <span class="font-medium">{{ user.last_login_ip || '-' }}</span>
              </div>
              <div>
                <span class="text-black">登录地址:</span>
                <span class="font-medium">{{ user.last_login_location || '-' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 代理使用情况 -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-black mb-4">代理使用情况</h4>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div class="text-center">
                <div class="text-sm font-bold text-primary-600">{{ user.proxy_enabled ? '已启用' : '未启用' }}</div>
                <div class="text-xs text-black">代理权限</div>
              </div>
              <div class="text-center">
                <div class="text-sm font-bold text-primary-600">{{ user.proxy_used_today || 0 }}</div>
                <div class="text-xs text-black">今日使用</div>
              </div>
              <div class="text-center">
                <div class="text-sm font-bold text-primary-600">{{ user.proxy_quota || '无限制' }}</div>
                <div class="text-xs text-black">每日配额</div>
              </div>
            </div>

            <div v-if="user.proxy_enabled && user.proxy_quota > 0" class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-primary-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${Math.min(100, (user.proxy_used_today / user.proxy_quota) * 100)}%` }"
              ></div>
            </div>
            <div v-if="user.proxy_enabled && user.proxy_quota > 0" class="text-xs text-black mt-1 text-center">
              {{ Math.max(0, user.proxy_quota - user.proxy_used_today) }} 次剩余
            </div>
          </div>
        </div>

        <!-- 操作记录（可扩展） -->
        <div v-if="false" class="mb-6">
          <h4 class="text-sm font-medium text-black mb-4">最近活动</h4>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-black text-center py-4">
              暂无活动记录
            </div>
          </div>
        </div>
      </div>


    </div>
  </div>
</template>

<script setup>
import BaseIcon from '@/components/BaseIcon/index.vue'
import { formatTimestamp } from '@/utils/timeUtils'

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

defineEmits(['close'])

// 格式化日期
const formatDate = (timestamp) => {
  return formatTimestamp(timestamp, 'datetime')
}
</script>
