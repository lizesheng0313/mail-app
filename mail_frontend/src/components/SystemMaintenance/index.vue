<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div class="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl relative">
          <!-- 关闭按钮 -->
          <button
            @click="close"
            class="absolute right-4 top-4 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="关闭"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div class="mb-6 flex justify-center">
            <div class="rounded-full bg-primary-50 p-4">
              <svg class="h-16 w-16 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          
          <h2 class="mb-3 text-center text-2xl font-bold text-gray-800">
            系统维护中
          </h2>
          
          <p class="mb-6 text-center text-gray-600">
            系统正在进行版本更新，请稍后再试
          </p>
          
          <div class="mb-6 rounded-lg bg-primary-50 border border-primary-200 p-4">
            <div class="flex items-start">
              <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              <div class="ml-3 text-sm text-primary-800">
                <p class="font-medium">预计维护时间：5-10分钟</p>
                <p class="mt-1">如有紧急问题，请查看帮助中心页面</p>
              </div>
            </div>
          </div>
          
          <div class="flex gap-3">
            <button
              @click="retry"
              class="flex-1 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-3 font-medium text-white shadow-md transition-all hover:from-primary-600 hover:to-primary-700 hover:shadow-lg active:scale-95"
            >
              <span class="flex items-center justify-center">
                <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重试
              </span>
            </button>
            <button
              @click="goToAbout"
              class="flex-1 rounded-lg border-2 border-primary-500 px-6 py-3 font-medium text-primary-600 shadow-md transition-all hover:bg-primary-50 hover:shadow-lg active:scale-95"
            >
              <span class="flex items-center justify-center">
                <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                帮助中心
              </span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const visible = ref(false)
const dismissed = ref(false) // 用户是否已关闭
const router = useRouter()

// 显示维护页面
const show = () => {
  // 如果用户已经关闭过，本次会话不再显示
  if (dismissed.value) {
    return
  }
  visible.value = true
}

// 隐藏维护页面
const hide = () => {
  visible.value = false
}

// 关闭维护页面（用户主动关闭，本次会话不再显示）
const close = () => {
  visible.value = false
  dismissed.value = true
}

// 重试
const retry = () => {
  window.location.reload()
}

// 跳转到帮助中心页面
const goToAbout = () => {
  visible.value = false
  router.push('/about')
}

defineExpose({
  show,
  hide
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
