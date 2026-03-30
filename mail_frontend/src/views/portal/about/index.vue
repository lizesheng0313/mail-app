<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- 公共头部 -->
    <PageHeader />

    <!-- 主要内容区域 -->
    <div class="flex-1">
      <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <!-- 主卡片 -->
        <div class="overflow-hidden rounded-2xl bg-white shadow-xl">
          <!-- 头部渐变背景 -->
          <div class="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-12 text-white">
            <div class="flex items-center justify-center">
              <div class="rounded-full bg-white/20 p-4 backdrop-blur-sm">
                <svg class="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h1 class="mt-6 text-center text-4xl font-bold">{{ t('about.title') }}</h1>
            <p class="mt-3 text-center text-primary-100">{{ t('about.subtitle') }}</p>
          </div>

          <!-- 内容区域 -->
          <div class="px-8 py-10">
            <!-- 简介 -->
            <div class="mb-10">
              <h2 class="mb-4 text-2xl font-bold text-gray-800">{{ t('about.introTitle') }}</h2>
              <p class="text-gray-600 leading-relaxed">
                {{ t('about.introBody') }}
              </p>
            </div>

            <!-- 联系方式 -->
            <div>
            <h2 class="mb-6 text-2xl font-bold text-gray-800">{{ t('about.contactTitle') }}</h2>
            
            <!-- 微信联系卡片 -->
            <div class="rounded-xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6 transition-all hover:border-primary-300 hover:shadow-lg">
              <div class="flex items-start">
                <div class="rounded-lg bg-primary-100 p-3">
                  <svg class="h-8 w-8 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.03-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                  </svg>
                </div>
                <div class="ml-4 flex-1">
                  <h3 class="text-lg font-semibold text-gray-800">{{ t('about.wechatTitle') }}</h3>
                  <p class="mt-2 text-sm text-gray-600">{{ t('about.wechatDesc') }}</p>
                  <div class="mt-4 flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm">
                    <div class="flex items-center">
                      <span class="text-sm font-medium text-gray-500">{{ t('about.wechatId') }}</span>
                      <span class="ml-2 font-mono text-lg font-bold text-primary-600">lizesheng1234</span>
                    </div>
                    <button
                      @click="copyWechat"
                      class="ml-4 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 active:scale-95"
                    >
                      <span class="flex items-center">
                        <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {{ t('about.copy') }}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        <!-- 底部提示 -->
        <div class="mt-8 text-center text-sm text-gray-500">
          <p>{{ t('about.thanks') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { showMessage } from '@/utils/message'
import PageHeader from '@/components/PageHeader/index.vue'

const { t } = useI18n()

const copyWechat = async () => {
  try {
    await navigator.clipboard.writeText('lizesheng1234')
    showMessage(t('about.copied'), 'success')
  } catch (err) {
    showMessage(t('about.copyFailed'), 'error')
  }
}
</script>
