<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="max-w-md w-full text-center">
      <div class="bg-white rounded-lg shadow-lg p-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">登录成功</h2>
        <p class="text-gray-600">正在跳转到首页...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

onMounted(async () => {
  // 从URL参数获取token和用户信息
  const token = route.query.token as string
  
  if (token) {
    // 保存token和认证状态到localStorage（和login方法一致）
    localStorage.setItem('token', token)
    localStorage.setItem('isAuthenticated', 'true')

    const ok = await userStore.checkAuth()

    if (ok) {
      console.log('Google登录成功，用户信息:', userStore.user)

      setTimeout(() => {
        router.push('/')
      }, 1000)
      return
    }

    console.error('Google登录后获取完整用户信息失败')
    router.push('/login?error=获取用户信息失败')
  } else {
    // 没有token，返回登录页
    console.error('未获取到token')
    router.push('/login?error=登录失败')
  }
})
</script>
