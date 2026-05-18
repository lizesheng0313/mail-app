<template>
  <div class="min-h-screen bg-slate-50">
    <section class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-6xl px-6 py-16">
        <div class="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <span class="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              事务通知 + 营销模板分流
            </span>
            <h1 class="mt-5 text-4xl font-semibold tracking-tight text-slate-900">
              邮件触达工作台
            </h1>
            <p class="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              统一管理事务通知、营销模板和发送权限，适合做会员通知与邮件触达。
            </p>

            <div class="mt-8 flex flex-wrap gap-3">
              <router-link
                v-if="userStore.isAuthenticated"
                to="/user/email-reach/templates"
                class="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                进入触达工作台
              </router-link>
              <router-link
                v-else
                to="/login"
                class="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                登录后申请开通
              </router-link>
              <router-link
                to="/open-platform"
                class="inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                看接入能力
              </router-link>
            </div>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl">
            <p class="text-sm text-slate-300">当前策略</p>
            <div class="mt-5 space-y-4">
              <div class="rounded-2xl bg-white/5 p-4">
                <p class="text-sm font-medium">账号开通</p>
                <p class="mt-2 text-sm text-slate-300">支持模板发送、额度管理和任务投递。</p>
              </div>
              <div class="rounded-2xl bg-white/5 p-4">
                <p class="text-sm font-medium">模板分流</p>
                <p class="mt-2 text-sm text-slate-300">事务模板与营销模板分开管理，营销模板支持退订能力。</p>
              </div>
              <div class="rounded-2xl bg-white/5 p-4">
                <p class="text-sm font-medium">模板辅助</p>
                <p class="mt-2 text-sm text-slate-300">模板支持内容辅助生成，方便快速整理发送文案。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-6 py-12">
      <div
        v-if="userStore.isAuthenticated && access"
        class="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm text-slate-500">当前账号状态</p>
            <h2 class="mt-1 text-2xl font-semibold text-slate-900">{{ statusLabel }}</h2>
            <p class="mt-2 text-sm text-slate-600">{{ access.reason }}</p>
          </div>
          <router-link
            to="/user/email-reach/templates"
            class="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            打开工作台
          </router-link>
        </div>
      </div>

      <div class="grid gap-6 md:grid-cols-3">
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-sm text-slate-500">事务模板</p>
          <h3 class="mt-3 text-lg font-semibold text-slate-900">通知链路稳定发送</h3>
          <p class="mt-3 text-sm leading-6 text-slate-600">适用于注册通知、订单通知、支付通知、售后通知等业务场景。</p>
        </div>
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-sm text-slate-500">营销模板</p>
          <h3 class="mt-3 text-lg font-semibold text-slate-900">活动触达独立管理</h3>
          <p class="mt-3 text-sm leading-6 text-slate-600">适用于活动通知、召回提醒、会员运营等场景，支持退订控制。</p>
        </div>
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-sm text-slate-500">使用边界</p>
          <h3 class="mt-3 text-lg font-semibold text-slate-900">收件人范围清晰</h3>
          <p class="mt-3 text-sm leading-6 text-slate-600">适合面向注册用户、订阅用户和已有客户进行持续触达。</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import emailReachApi from '@/api/emailReach'

const userStore = useUserStore()
const access = ref(null)

const statusLabel = computed(() => {
  if (!access.value) return '未开通'
  if (access.value.status === 'approved') return '已开通'
  if (access.value.status === 'pending') return '待开通'
  if (access.value.status === 'trial') return '试用中'
  if (access.value.status === 'blocked') return '已限制'
  return '未开通'
})

onMounted(async () => {
  if (!userStore.isAuthenticated) return
  const res = await emailReachApi.getAccessSummary()
  if (res.code === 0) {
    access.value = res.data
  }
})
</script>
