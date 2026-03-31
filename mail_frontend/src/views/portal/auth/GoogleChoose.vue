<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
    <div class="max-w-md w-full">
      <!-- Google 用户信息卡片 -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div class="flex items-center space-x-4">
          <img v-if="googleAvatar" :src="googleAvatar" :alt="t('googleAuth.avatarAlt')" class="w-16 h-16 rounded-full" />
          <div v-else class="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
            <span class="text-2xl text-primary-600">{{ googleName?.[0] || 'G' }}</span>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900">{{ googleName }}</h3>
            <p class="text-sm text-gray-600">{{ googleEmail }}</p>
          </div>
        </div>
      </div>

      <!-- 选择操作 -->
      <div class="bg-white rounded-lg shadow-lg p-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2 text-center">{{ t('googleAuth.welcomeTitle') }}</h2>
        <p class="text-gray-600 mb-8 text-center">{{ t('googleAuth.chooseAction') }}</p>

        <div class="space-y-4">
          <!-- 创建新账号 -->
          <button
            @click="createNewAccount"
            :disabled="loading"
            class="w-full flex items-center justify-between px-6 py-4 border-2 border-primary-600 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
          >
            <div class="flex items-center space-x-3">
              <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
              </svg>
              <div class="text-left">
                <div class="font-semibold text-gray-900">{{ t('googleAuth.createAccountTitle') }}</div>
                <div class="text-sm text-gray-600">{{ t('googleAuth.createAccountDesc') }}</div>
              </div>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>

          <!-- 绑定已有账号 -->
          <button
            @click="showBindForm = true"
            :disabled="loading"
            class="w-full flex items-center justify-between px-6 py-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div class="flex items-center space-x-3">
              <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
              </svg>
              <div class="text-left">
                <div class="font-semibold text-gray-900">{{ t('googleAuth.bindAccountTitle') }}</div>
                <div class="text-sm text-gray-600">{{ t('googleAuth.bindAccountDesc') }}</div>
              </div>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>

        <!-- 返回登录 -->
        <div class="mt-6 text-center">
          <button
            @click="$router.push('/login')"
            class="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {{ t('googleAuth.backToLogin') }}
          </button>
        </div>
      </div>

      <!-- 绑定表单弹窗 -->
      <div v-if="showBindForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="showBindForm = false">
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <h3 class="text-xl font-bold text-gray-900 mb-4">{{ t('googleAuth.bindExistingTitle') }}</h3>
          <p class="text-sm text-gray-600 mb-6">{{ t('googleAuth.bindExistingDesc') }}</p>

          <form @submit.prevent="bindExistingAccount" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('login.emailLabel') }}</label>
              <input
                v-model="bindForm.email"
                type="email"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                :placeholder="t('googleAuth.emailPlaceholder')"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('login.password') }}</label>
              <input
                v-model="bindForm.password"
                type="password"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                :placeholder="t('googleAuth.passwordPlaceholder')"
              />
            </div>

            <div v-if="error" class="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {{ error }}
            </div>

            <div class="flex space-x-3">
              <button
                type="button"
                @click="showBindForm = false"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {{ loading ? t('googleAuth.bindLoading') : t('googleAuth.confirmBind') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import authAPI from '@/api/auth'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const googleId = ref('')
const googleEmail = ref('')
const googleName = ref('')
const googleAvatar = ref('')
const showBindForm = ref(false)
const loading = ref(false)
const error = ref('')

const bindForm = ref({
  email: '',
  password: ''
})

onMounted(() => {
  // 从URL参数获取Google用户信息
  googleId.value = route.query.google_id as string
  googleEmail.value = route.query.google_email as string
  googleName.value = route.query.google_name as string
  googleAvatar.value = route.query.google_avatar as string

  if (!googleId.value || !googleEmail.value) {
    router.push(`/login?error=${encodeURIComponent(t('googleAuth.incompleteInfo'))}`)
  }
})

// 创建新账号
const createNewAccount = async () => {
  loading.value = true
  error.value = ''

  try {
    const result = await authAPI.createGoogleAccount({
      google_id: googleId.value,
      google_email: googleEmail.value,
      google_name: googleName.value,
      google_avatar: googleAvatar.value
    })

    if (result.code === 0 && result.data) {
      // 保存token
      localStorage.setItem('token', result.data.token)
      localStorage.setItem('isAuthenticated', 'true')

      // 跳转到成功页面
      const params = new URLSearchParams({
        token: result.data.token,
        user_id: result.data.user.id.toString(),
        username: result.data.user.username,
        email: result.data.user.email
      })
      router.push(`/auth/google/success?${params}`)
    } else {
      error.value = result.message || t('googleAuth.createFailed')
    }
  } catch (err) {
    error.value = t('common.networkErrorRetry')
  } finally {
    loading.value = false
  }
}

// 绑定已有账号
const bindExistingAccount = async () => {
  loading.value = true
  error.value = ''

  try {
    const result = await authAPI.bindExistingGoogle({
      email: bindForm.value.email,
      password: bindForm.value.password,
      google_id: googleId.value,
      google_email: googleEmail.value,
      google_name: googleName.value,
      google_avatar: googleAvatar.value
    })

    if (result.code === 0 && result.data) {
      // 保存token
      localStorage.setItem('token', result.data.token)
      localStorage.setItem('isAuthenticated', 'true')

      // 跳转到成功页面
      const params = new URLSearchParams({
        token: result.data.token,
        user_id: result.data.user.id.toString(),
        username: result.data.user.username,
        email: result.data.user.email
      })
      router.push(`/auth/google/success?${params}`)
    } else {
      error.value = result.message || t('googleAuth.bindFailed')
    }
  } catch (err) {
    error.value = t('common.networkErrorRetry')
  } finally {
    loading.value = false
  }
}
</script>
