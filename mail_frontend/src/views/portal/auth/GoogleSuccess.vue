<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="max-w-md w-full text-center">
      <div class="bg-white rounded-lg shadow-lg p-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">{{ t('googleAuth.successTitle') }}</h2>
        <p class="text-gray-600">{{ t('googleAuth.redirectingHome') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { t } = useI18n()

onMounted(async () => {
  // 从URL参数获取token和用户信息
  const token = route.query.token as string
  
  if (token) {
    const result = await userStore.completeLogin(token, 'google')

    if (result.success) {
      console.log('Google登录成功，用户信息:', userStore.user)
      router.push('/')
      return
    }

    console.error('Google登录后获取完整用户信息失败')
    router.push(`/login?error=${encodeURIComponent(t('googleAuth.fetchUserFailed'))}`)
  } else {
    // 没有token，返回登录页
    console.error('未获取到token')
    router.push(`/login?error=${encodeURIComponent(t('googleAuth.loginFailed'))}`)
  }
})
</script>
