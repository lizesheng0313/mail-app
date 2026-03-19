<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <PageHeader />

    <div class="flex-1">
      <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="overflow-hidden rounded-2xl bg-white shadow-xl">
          <div class="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-10 text-white">
            <h1 class="text-3xl font-bold">服务条款</h1>
            <p class="mt-2 text-primary-100">最后更新日期：2026-03-19</p>
          </div>

          <div class="space-y-8 px-8 py-10 text-sm leading-7 text-gray-700">
            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">1. 条款适用</h2>
              <p>
                欢迎使用本平台服务。您访问、注册或使用本平台功能，即表示您已阅读并同意遵守本服务条款及相关页面规则。
              </p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">2. 账号与安全</h2>
              <p>
                您应对账号下的操作和后果负责，并妥善保管账号凭证。若发现账号异常或被盗用，请及时联系平台处理。
              </p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">3. 服务使用规范</h2>
              <p>
                您不得利用平台从事违法违规、侵犯他人权益、破坏系统安全或干扰正常运行的行为。平台有权对违规内容和行为采取处置措施。
              </p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">4. 第三方服务说明</h2>
              <p>
                平台部分能力依赖第三方邮箱与 OAuth 服务。第三方服务策略变化、账号限制或网络异常可能影响功能可用性。
              </p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">5. 免责声明</h2>
              <p>
                在法律允许范围内，平台按“现状”提供服务，不对因不可抗力、网络故障、第三方原因等导致的中断或数据延迟承担无限责任。
              </p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">6. 条款变更与生效</h2>
              <p>
                平台可根据运营需要对条款进行更新，更新后将在页面公示。您继续使用服务的，视为接受更新后的条款。
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
