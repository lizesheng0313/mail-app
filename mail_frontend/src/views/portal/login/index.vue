<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <!-- 消息提示 -->
    <div v-if="message" class="fixed top-4 right-4 z-50">
      <div :class="[
        'px-6 py-4 rounded-lg shadow-lg border-l-4 max-w-sm',
        messageType === 'success' ? 'bg-primary-50 border-success-400 text-success-800' : 'bg-red-50 border-red-400 text-red-800'
      ]">
        <div class="flex items-center">
          <svg v-if="messageType === 'success'" class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <svg v-else class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <span class="font-medium">{{ message }}</span>
        </div>
      </div>
    </div>
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <div class="mx-auto h-16 w-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
          <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 class="mt-6 text-3xl font-bold text-black">肥猫猫邮箱服务</h2>
        <p class="mt-2 text-sm text-black">
          {{ isResetMode ? '重置密码' : (isLoginMode ? '登录您的账户' : '创建新账户') }}
        </p>
      </div>
      
      <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-black mb-2">邮箱地址</label>
            <BaseInput
              id="email"
              v-model="form.email"
              type="email"
              required
              placeholder="请输入邮箱地址"
              :disabled="userStore.loading"
            >
              <template #right-icon>
                <button
                  v-if="((!isLoginMode && !isResetMode) || isResetMode) && !userStore.verificationCodeSent"
                  type="button"
                  @click="sendVerificationCode"
                  :disabled="userStore.loading || !form.email"
                  class="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors disabled:opacity-50 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 rounded"
                >
                  发送验证码
                </button>
                <button
                  v-else-if="!isLoginMode && !userStore.verificationCodeSent"
                  type="button"
                  @click="showDomainHelp = !showDomainHelp"
                  class="text-gray-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 rounded"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </button>
              </template>
            </BaseInput>

            <!-- 邮箱域名提示 -->
            <div v-if="!isLoginMode && showDomainHelp" class="mt-2 p-3 bg-primary-50 rounded-lg text-sm">
              <p class="text-primary-800 font-medium mb-2">支持的邮箱域名：</p>
              <div class="text-primary-700 space-y-1">
                <p><strong>国内：</strong>163.com, qq.com, 126.com, sina.com, 139.com</p>
                <p><strong>国外：</strong>gmail.com, outlook.com, hotmail.com, yahoo.com</p>
                <p class="text-xs text-primary-600 mt-2">更多域名请查看完整列表</p>
              </div>
            </div>
          </div>
          
          <!-- 验证码输入 -->
          <div v-if="((!isLoginMode && !isResetMode) || isResetMode) && userStore.verificationCodeSent">
            <label for="verificationCode" class="block text-sm font-medium text-black mb-2">验证码</label>
            <BaseInput
              id="verificationCode"
              v-model="form.verificationCode"
              type="text"
              required
              maxlength="6"
              placeholder="请输入6位验证码"
              :disabled="userStore.loading"
            >
              <template #right-icon>
                <button
                  type="button"
                  @click="sendVerificationCode"
                  :disabled="userStore.loading"
                  class="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors disabled:opacity-50 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 rounded"
                >
                  重发
                </button>
              </template>
            </BaseInput>
            <p class="mt-2 text-sm text-black">
              验证码已发送至 {{ userStore.verificationEmail }}
            </p>
          </div>

          <div v-if="!isResetMode || (isResetMode && userStore.verificationCodeSent)">
            <label for="password" class="block text-sm font-medium text-black mb-2">
              {{ isResetMode ? '新密码' : '密码' }}
            </label>
            <BaseInput
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              required
              :placeholder="isResetMode ? '请输入新密码' : '请输入密码'"
              :disabled="userStore.loading"
            >
              <template #right-icon>
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="text-gray-400 hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 rounded"
                >
                  <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                </button>
              </template>
            </BaseInput>

            <!-- 注册或重置密码时显示密码强度提示 -->
            <div v-if="(!isLoginMode || isResetMode) && form.password" class="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
              <p class="text-black font-medium mb-2">密码强度：</p>
              <div class="space-y-1 text-xs">
                <div :class="form.password.length >= 6 ? 'text-primary-600' : 'text-red-500'">
                  <span class="mr-1">{{ form.password.length >= 6 ? '✓' : '✗' }}</span>
                  至少6位字符 (必需)
                </div>
                <div :class="form.password.length >= 8 ? 'text-primary-600' : 'text-black'">
                  <span class="mr-1">{{ form.password.length >= 8 ? '✓' : '○' }}</span>
                  至少8位字符 (推荐)
                </div>
                <div :class="/[A-Z]/.test(form.password) ? 'text-primary-600' : 'text-black'">
                  <span class="mr-1">{{ /[A-Z]/.test(form.password) ? '✓' : '○' }}</span>
                  包含大写字母 (推荐)
                </div>
                <div :class="/[a-z]/.test(form.password) ? 'text-primary-600' : 'text-black'">
                  <span class="mr-1">{{ /[a-z]/.test(form.password) ? '✓' : '○' }}</span>
                  包含小写字母 (推荐)
                </div>
                <div :class="/[0-9]/.test(form.password) ? 'text-primary-600' : 'text-black'">
                  <span class="mr-1">{{ /[0-9]/.test(form.password) ? '✓' : '○' }}</span>
                  包含数字 (推荐)
                </div>
                <div :class="/[!@#$%^&*(),.?':{}|<>]/.test(form.password) ? 'text-primary-600' : 'text-black'">
                  <span class="mr-1">{{ /[!@#$%^&*(),.?':{}|<>]/.test(form.password) ? '✓' : '○' }}</span>
                  包含特殊字符 (推荐)
                </div>
              </div>
              <div class="mt-2 text-xs text-black">
                提示：满足更多条件可提高密码安全性
              </div>
            </div>
          </div>

          <div v-if="(!isLoginMode && !isResetMode) || (isResetMode && userStore.verificationCodeSent)">
            <label for="confirmPassword" class="block text-sm font-medium text-black mb-2">
              {{ isResetMode ? '确认新密码' : '确认密码' }}
            </label>
            <BaseInput
              id="confirmPassword"
              v-model="form.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              required
              :placeholder="isResetMode ? '请再次输入新密码' : '请再次输入密码'"
              :disabled="userStore.loading"
            >
              <template #right-icon>
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="text-gray-400 hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 rounded"
                >
                  <svg v-if="showConfirmPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                </button>
              </template>
            </BaseInput>

            <!-- 密码匹配提示 -->
            <div v-if="form.confirmPassword && form.password !== form.confirmPassword" class="mt-2 text-red-600 text-sm flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              两次输入的密码不一致
            </div>
            <div v-else-if="form.confirmPassword && form.password === form.confirmPassword" class="mt-2 text-primary-600 text-sm flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              密码匹配
            </div>
          </div>
          
          <div v-if="error" class="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            {{ error }}
          </div>

          <div v-if="isAbnormalAccountError" class="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div class="flex items-start">
              <svg class="mt-0.5 h-5 w-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div class="ml-3 flex-1">
                <p class="text-sm font-medium text-orange-900">检测到账号异常</p>
                <p class="mt-1 text-sm text-orange-800">如果确认账号未异常，请点击反馈联系管理员，或添加客服微信处理。</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <a
                    href="/user/feedback"
                    class="inline-flex items-center rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
                  >
                    提交反馈
                  </a>
                  <button
                    type="button"
                    @click="copySupportWechat"
                    class="inline-flex items-center rounded-lg border border-orange-300 bg-white px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-100"
                  >
                    复制客服微信
                  </button>
                  <span class="inline-flex items-center text-xs text-orange-700">微信号：{{ supportWechat }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            :disabled="userStore.loading || !isFormValid"
            class="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="userStore.loading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isResetMode ? '重置中...' : (isLoginMode ? '登录中...' : '注册中...') }}
            </span>
            <span v-else>{{ isResetMode ? '重置密码' : (isLoginMode ? '登录' : '完成注册') }}</span>
          </button>

          <p class="text-center text-xs leading-6 text-gray-500">
            继续操作即表示您同意
            <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:text-primary-700">
              《服务条款》
            </a>
            和
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:text-primary-700">
              《隐私权政策》
            </a>
          </p>
        </form>
        
        <!-- Google 登录分隔线 -->
        <div v-if="isLoginMode" class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">或</span>
          </div>
        </div>
        
        <!-- Google 登录按钮 -->
        <button
          v-if="isLoginMode"
          @click="loginWithGoogle"
          type="button"
          :disabled="googleLoading"
          class="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span v-if="googleLoading">登录中...</span>
          <span v-else>使用 Google 账号登录</span>
        </button>
        
        <div class="mt-6 text-center space-y-3">
          <button
            v-if="!isResetMode"
            @click="toggleMode"
            class="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
          >
            {{ isLoginMode ? '没有账户？立即注册' : '已有账户？立即登录' }}
          </button>

          <div class="flex justify-center space-x-4 text-sm">
            <button
              v-if="isLoginMode"
              @click="switchToResetMode"
              class="text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              忘记密码？
            </button>
            <button
              v-if="isResetMode"
              @click="switchToLoginMode"
              class="text-black hover:text-black font-medium transition-colors"
            >
              返回登录
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import authAPI from '@/api/auth'
import BaseInput from '@/components/BaseInput/index.vue'
import { showMessage } from '@/utils/message'
import { isTauri } from '@/services/api'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isLoginMode = ref(true)
const isResetMode = ref(false)
const error = ref('')
const showDomainHelp = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const googleLoading = ref(false)
const supportWechat = 'lizesheng1234'

// 消息提示
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const form = ref({
  email: '',
  password: '',
  confirmPassword: '',
  verificationCode: ''
})

const isFormValid = computed(() => {
  if (isLoginMode.value) {
    return form.value.email.trim() && form.value.password.trim()
  } else if (isResetMode.value) {
    if (!userStore.verificationCodeSent) {
      return form.value.email.trim()
    } else {
      const passwordValidation = validatePassword(form.value.password)
      return (
        form.value.email.trim() &&
        form.value.password.trim() &&
        passwordValidation.valid &&
        form.value.confirmPassword.trim() &&
        form.value.password === form.value.confirmPassword &&
        form.value.verificationCode.trim()
      )
    }
  } else {
    const passwordValidation = validatePassword(form.value.password)
    return (
      form.value.email.trim() &&
      form.value.password.trim() &&
      passwordValidation.valid &&
      form.value.confirmPassword.trim() &&
      form.value.password === form.value.confirmPassword &&
      userStore.verificationCodeSent &&
      form.value.verificationCode.trim()
    )
  }
})

const isAbnormalAccountError = computed(() => error.value.includes('账户已被禁用'))

const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  isResetMode.value = false
  error.value = ''
  showDomainHelp.value = false
  showPassword.value = false
  showConfirmPassword.value = false
  form.value = {
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  }
  // 重置验证码状态
  userStore.verificationCodeSent = false
  userStore.verificationEmail = ''
}

const switchToResetMode = () => {
  isResetMode.value = true
  isLoginMode.value = false
  error.value = ''
  showDomainHelp.value = false
  showPassword.value = false
  showConfirmPassword.value = false
  form.value = {
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  }
  userStore.verificationCodeSent = false
  userStore.verificationEmail = ''
}

const switchToLoginMode = () => {
  isLoginMode.value = true
  isResetMode.value = false
  error.value = ''
  showDomainHelp.value = false
  showPassword.value = false
  showConfirmPassword.value = false
  form.value = {
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  }
  userStore.verificationCodeSent = false
  userStore.verificationEmail = ''
}



const sendVerificationCode = async () => {
  if (!form.value.email.trim()) {
    error.value = '请输入邮箱地址'
    return
  }

  error.value = ''
  // 根据当前模式决定验证码用途
  const purpose = isResetMode.value ? 'reset_password' : 'register'
  const result = await userStore.sendVerificationCode(form.value.email, purpose)

  if (!result.success) {
    error.value = result.error || '发送验证码失败'
  }
}


// 密码复杂度验证
const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 6) {
    return { valid: false, message: '密码长度至少6位' }
  }

  // 计算密码强度分数
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++

  // 至少需要满足2个条件（除了长度）
  if (score >= 2) {
    return { valid: true, message: '密码强度良好' }
  } else {
    return { valid: false, message: '密码强度不够，建议包含大小写字母、数字或特殊字符' }
  }
}

const handleSubmit = async () => {
  error.value = ''

  // 注册或重置密码时验证密码复杂度
  if (!isLoginMode.value || (isResetMode.value && userStore.verificationCodeSent)) {
    const passwordValidation = validatePassword(form.value.password)
    if (!passwordValidation.valid) {
      error.value = passwordValidation.message
      return
    }

    if (form.value.password !== form.value.confirmPassword) {
      error.value = '两次输入的密码不一致'
      return
    }
  }

  let result
  if (isLoginMode.value) {
    result = await userStore.login(form.value.email, form.value.password)
  } else if (isResetMode.value) {
    result = await userStore.resetPassword(
      form.value.email,
      form.value.verificationCode,
      form.value.password
    )
  } else {
    result = await userStore.register(
      form.value.email,
      form.value.password,
      form.value.verificationCode
    )
  }

  if (result.success) {
    if (isLoginMode.value) {
      // 登录成功，直接跳转到首页
      router.push('/')
    } else if (isResetMode.value) {
      // 密码重置成功，显示提示并跳转到登录
      showMessage(result.message || '密码重置成功！请使用新密码登录', 'success')
      switchToLoginMode()
    } else {
      // 注册成功，显示提示并跳转到登录
      showMessage(result.message || '注册成功！请登录', 'success')
      isLoginMode.value = true
      isResetMode.value = false
      // 清空表单
      form.value = {
        email: '',
        password: '',
        confirmPassword: '',
        verificationCode: ''
      }
      // 重置验证码状态
      userStore.verificationCodeSent = false
      userStore.verificationEmail = ''
    }
  } else {
    error.value = result.error || (isResetMode.value ? '密码重置失败' : (isLoginMode.value ? '登录失败' : '注册失败'))
  }
}

// Google 登录
const loginWithGoogle = async () => {
  try {
    googleLoading.value = true
    error.value = ''
    
    // 获取 Google 授权 URL
    const result = await authAPI.getGoogleLoginUrl({ is_desktop: isTauri() })
    
    if (result.code === 0) {
      // 跳转到 Google 授权页面
      window.location.href = result.data.auth_url
    } else {
      error.value = result.message || '获取授权链接失败'
    }
  } catch (err: any) {
    error.value = '网络错误，请稍后重试'
  } finally {
    googleLoading.value = false
  }
}

const copySupportWechat = async () => {
  try {
    await navigator.clipboard.writeText(supportWechat)
    showMessage('客服微信已复制', 'success')
  } catch (err) {
    showMessage('复制失败，请手动复制', 'error')
  }
}

// 页面加载时检查URL参数
onMounted(() => {
  // 如果URL包含 mode=register 参数，切换到注册模式
  if (route.query.mode === 'register') {
    isLoginMode.value = false
  }

  if (typeof route.query.error === 'string' && route.query.error) {
    error.value = route.query.error
  }

  const storedLoginError = sessionStorage.getItem('login_error_message')
  if (storedLoginError) {
    error.value = storedLoginError
    sessionStorage.removeItem('login_error_message')
  }
})

watch(() => route.query.error, (queryError) => {
  if (typeof queryError === 'string') {
    error.value = queryError
  }
})
</script>
