<template>
  <div class="max-w-4xl">
    <!-- 个人信息卡片 -->
    <div class="bg-white rounded-lg shadow p-6 mb-4">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('settingsPage.personalInfo') }}</h3>

      <div class="space-y-4">
        <!-- 用户名（昵称） -->
        <div class="flex items-center">
          <div class="w-32 text-sm text-gray-600">{{ t('settingsPage.nickname') }}</div>
          <div class="flex-1 flex items-center space-x-2">
            <template v-if="!editingUsername">
              <span class="text-sm text-gray-900">{{ profile.username }}</span>
              <button
                @click="startEditUsername"
                class="text-primary-600 hover:text-primary-700 text-sm"
              >
                {{ t('settingsPage.edit') }}
              </button>
            </template>
            <template v-else>
              <input
                v-model="newUsername"
                type="text"
                class="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-48"
                :placeholder="t('settingsPage.nicknamePlaceholder')"
                maxlength="20"
              />
              <button
                @click="saveUsername"
                :disabled="savingUsername"
                class="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {{ savingUsername ? t('settingsPage.saving') : t('common.save') }}
              </button>
              <button
                @click="cancelEditUsername"
                class="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
              >
                {{ t('common.cancel') }}
              </button>
            </template>
          </div>
        </div>

        <p class="text-xs text-gray-500 ml-32">{{ t('settingsPage.nicknameHint') }}</p>

        <!-- 邮箱 -->
        <div class="flex items-center">
          <div class="w-32 text-sm text-gray-600">{{ t('settingsPage.emailAddress') }}</div>
          <div class="flex-1 text-sm text-gray-900">{{ profile.email }}</div>
        </div>

        <!-- 账号状态 -->
        <div class="flex items-center">
          <div class="w-32 text-sm text-gray-600">{{ t('settingsPage.accountStatus') }}</div>
          <div class="flex-1">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
            >
              {{ t('settingsPage.accountActive') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 第三方账号绑定 -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">
        {{ t('settingsPage.thirdPartyAccounts') }}
      </h3>

      <!-- Google 账号 -->
      <div class="border border-gray-200 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <!-- Google Logo -->
            <div
              class="h-10 w-10 bg-white rounded border border-gray-200 flex items-center justify-center flex-shrink-0"
            >
              <svg class="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>

            <div>
              <div class="flex items-center space-x-2">
                <span class="text-sm font-medium text-gray-900">{{
                  t('profile.googleAccount')
                }}</span>
                <span
                  v-if="googleBound"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                >
                  {{ t('profile.bound') }}
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                >
                  {{ t('profile.unbound') }}
                </span>
              </div>
              <p v-if="googleBound && googleInfo" class="text-xs text-gray-500 mt-0.5">
                {{ googleInfo.google_email }}
              </p>
              <p v-else class="text-xs text-gray-500 mt-0.5">{{ t('settingsPage.googleHint') }}</p>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div>
            <button
              v-if="!googleBound"
              @click="bindGoogle"
              :disabled="bindLoading"
              class="px-4 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ bindLoading ? t('profile.bindingRedirect') : t('profile.bindNow') }}
            </button>

            <button
              v-else
              @click="unbindGoogle"
              :disabled="unbindLoading"
              class="px-4 py-2 bg-white border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ unbindLoading ? t('profile.unbinding') : t('profile.unbind') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 提示 -->
      <div class="mt-4 text-xs text-gray-500">
        {{ t('settingsPage.thirdPartyHint') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { showMessage } from '@/utils/message'
import { showConfirm } from '@/utils/dialog'
import api from '@/services/api'

const userStore = useUserStore()
const { t } = useI18n()

// 个人信息
const profile = ref({
  username: '',
  email: ''
})

// 修改用户名相关
const editingUsername = ref(false)
const newUsername = ref('')
const savingUsername = ref(false)

const startEditUsername = () => {
  newUsername.value = profile.value.username
  editingUsername.value = true
}

const cancelEditUsername = () => {
  editingUsername.value = false
  newUsername.value = ''
}

const saveUsername = async () => {
  if (!newUsername.value.trim()) {
    showMessage(t('settingsPage.nicknameRequired'), 'error')
    return
  }

  if (newUsername.value.trim() === profile.value.username) {
    editingUsername.value = false
    return
  }

  savingUsername.value = true
  try {
    const res = await api.put('/users/me', { username: newUsername.value.trim() })
    if (res.code === 0) {
      profile.value.username = newUsername.value.trim()
      userStore.user.username = newUsername.value.trim()
      editingUsername.value = false
      showMessage(t('settingsPage.nicknameUpdated'), 'success')
    } else {
      showMessage(res.message || t('settingsPage.updateFailed'), 'error')
    }
  } catch (error) {
    console.error('修改昵称失败:', error)
    showMessage(t('settingsPage.updateFailed'), 'error')
  } finally {
    savingUsername.value = false
  }
}

// Google 绑定相关
const bindLoading = ref(false)
const unbindLoading = ref(false)
const googleBound = ref(false)
const googleInfo = ref(null)

// 加载用户信息
const loadUserProfile = async () => {
  try {
    const res = await api.get('/users/me')
    if (res.code === 0 && res.data) {
      profile.value = {
        username: res.data.username || '',
        email: res.data.email || ''
      }

      // 检查 Google 绑定状态
      googleBound.value = !!res.data.google_id
      if (googleBound.value) {
        googleInfo.value = {
          google_email: res.data.google_email,
          google_name: res.data.google_name
        }
      }
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
    showMessage(t('settingsPage.loadProfileFailed'), 'error')
  }
}

// 绑定 Google
const bindGoogle = async () => {
  bindLoading.value = true
  try {
    const res = await api.get('/auth/google/bind-url')
    if (res.code === 0 && res.data?.auth_url) {
      window.location.href = res.data.auth_url
    } else {
      showMessage(t('settingsPage.bindUrlFailed'), 'error')
      bindLoading.value = false
    }
  } catch (error) {
    console.error('绑定 Google 失败:', error)
    showMessage(t('settingsPage.bindFailed'), 'error')
    bindLoading.value = false
  }
}

// 解绑 Google
const unbindGoogle = async () => {
  const confirmed = await showConfirm(
    t('settingsPage.unbindConfirmMessage'),
    t('settingsPage.unbindConfirmTitle')
  )

  if (!confirmed) return

  unbindLoading.value = true
  try {
    const res = await api.post('/auth/google/unbind')
    if (res.code === 0) {
      showMessage(t('profile.unbindSuccess'), 'success')
      googleBound.value = false
      googleInfo.value = null
    } else {
      showMessage(res.message || t('profile.unbindFailed'), 'error')
    }
  } catch (error) {
    console.error('解绑失败:', error)
    showMessage(t('profile.unbindFailed'), 'error')
  } finally {
    unbindLoading.value = false
  }
}

onMounted(() => {
  loadUserProfile()
})
</script>
