<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <PageHeader />

    <div class="flex-1">
      <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="overflow-hidden rounded-2xl bg-white shadow-xl">
          <div class="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-10 text-white">
            <h1 class="text-3xl font-bold">隐私权政策</h1>
            <p class="mt-2 text-primary-100">最后更新日期：2026-03-19</p>
          </div>

          <div class="space-y-8 px-8 py-10 text-sm leading-7 text-gray-700">
            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">1. 我们收集的信息</h2>
              <p>
                为提供邮箱管理、账号登录与自动化服务，我们可能收集您主动提供的信息（如邮箱、登录凭证、配置参数）以及使用过程中产生的日志和设备信息。
              </p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">2. 信息使用目的</h2>
              <p>
                我们将信息用于账号认证、功能实现、故障排查、安全风控、服务优化及通知沟通，不会将您的个人信息用于与本服务无关的用途。
              </p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">3. 信息共享与披露</h2>
              <p>
                除法律法规要求、获得您的授权或为实现核心功能所必需外，我们不会向无关第三方出售或共享您的个人信息。
              </p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">4. 数据存储与安全</h2>
              <p>
                我们会采取合理的技术和管理措施保护数据安全，包括访问控制、传输加密和审计机制；但互联网环境无法保证绝对安全，请您妥善保管账号信息。
              </p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">5. 您的权利</h2>
              <p>
                您可依据适用法律请求访问、更正或删除相关个人信息，也可通过注销账号等方式终止服务使用。若有疑问，请通过平台公开联系方式联系我们。
              </p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">6. 政策更新</h2>
              <p>
                我们可能根据业务变化或法律要求更新本政策。更新后将通过页面公示，更新内容自公示之日起生效。
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader/index.vue'
</script>
