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
import { takeLoginRedirect } from '@/utils/loginRedirect'
import authAPI from '@/api/auth'
import { googleAuthProof, clearGoogleAuth } from '@/services/googleAuth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { t } = useI18n()

onMounted(async () => {
  const flow = route.query.flow as string
  try {
    const proof = googleAuthProof(route.query.ticket, flow)
    // 及时清理地址栏，长期会话 token 只从 POST 响应取得。
    await router.replace({ path: route.path, query: {}, hash: route.hash })
    const response = await authAPI.completeGoogleLogin(proof)
    if (response.code !== 0 || !response.data) throw new Error(response.message)
    clearGoogleAuth(flow)
    if (response.data.action === 'bind') {
      await router.replace('/user/settings?google_bind_success=1')
      return
    }
    const result = await userStore.completeLogin(response.data.token, 'google')
    if (!result.success) throw new Error(result.error)
    await router.replace(takeLoginRedirect() || '/user')
  } catch {
    await router.replace(`/login?error=${encodeURIComponent(t('googleAuth.loginFailed'))}`)
  }
})
</script>
