<template>
  <div class="min-h-screen bg-slate-50">
    <PageHeader />

    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[220px,1fr]">
        <aside class="self-start rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div class="border-b border-slate-100 px-3 pb-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">目录</p>
            <h2 class="mt-2 text-base font-semibold text-slate-900">{{ t('about.title') }}</h2>
          </div>

          <div class="space-y-5 px-1 pt-4">
            <div>
              <p class="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">使用指南</p>
              <div class="mt-2 space-y-3">
                <div v-for="section in sections" :key="section.anchor" class="space-y-1">
                  <a
                    :href="`#${section.anchor}`"
                    class="block rounded-xl px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    {{ section.title }}
                  </a>
                  <div class="space-y-1 pl-3">
                    <a
                      v-for="item in section.items"
                      :key="item.anchor"
                      :href="`#${item.anchor}`"
                      class="block rounded-lg px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                      {{ item.navTitle }}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p class="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">附加说明</p>
              <div class="mt-2 space-y-1">
                <a href="#help-common" class="block rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                  通用功能
                </a>
                <a href="#help-support" class="block rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                  联系支持
                </a>
              </div>
            </div>
          </div>
        </aside>

        <main class="space-y-6">
          <article
            v-for="section in sections"
            :id="section.anchor"
            :key="section.title"
            class="scroll-mt-28 rounded-2xl bg-white px-8 py-8 shadow-sm ring-1 ring-slate-200"
          >
            <h2 class="text-2xl font-semibold text-slate-900">{{ section.title }}</h2>
            <p class="mt-4 text-sm leading-7 text-slate-600">{{ section.summary }}</p>

            <div class="mt-6 space-y-6">
              <section
                v-for="item in section.items"
                :id="item.anchor"
                :key="item.anchor"
                class="scroll-mt-28"
              >
                <h3 class="text-base font-medium text-slate-900">{{ item.navTitle }}</h3>
                <p class="mt-2 text-sm leading-7 text-slate-600">{{ item.desc }}</p>
                <div v-if="item.steps?.length" class="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                  <p v-for="(step, index) in item.steps" :key="`${item.anchor}-${index}`">
                    {{ index + 1 }}. {{ step }}
                  </p>
                </div>
              </section>
            </div>
          </article>

          <section id="help-common" class="scroll-mt-28 rounded-2xl bg-white px-8 py-8 shadow-sm ring-1 ring-slate-200">
            <h2 class="text-2xl font-semibold text-slate-900">通用功能</h2>
            <p class="mt-4 text-sm leading-7 text-slate-600">通用功能覆盖所有邮箱类型共用的邮件处理能力。</p>

            <div class="mt-6 space-y-6">
              <section
                v-for="item in commonItems"
                :id="item.anchor"
                :key="item.anchor"
                class="scroll-mt-28"
              >
                <h3 class="text-base font-medium text-slate-900">{{ item.navTitle }}</h3>
                <p class="mt-2 text-sm leading-7 text-slate-600">{{ item.desc }}</p>
                <div v-if="item.steps?.length" class="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                  <p v-for="(step, index) in item.steps" :key="`${item.anchor}-${index}`">
                    {{ index + 1 }}. {{ step }}
                  </p>
                </div>
              </section>
            </div>
          </section>

          <section id="help-support" class="scroll-mt-28 rounded-2xl bg-white px-8 py-8 shadow-sm ring-1 ring-slate-200">
            <h2 class="text-2xl font-semibold text-slate-900">联系支持</h2>
            <p class="mt-4 text-sm leading-7 text-slate-600">
              账号接入、邮件收取、域名配置和授权使用过程中遇到的问题，都可以直接联系支持处理。
            </p>

            <div class="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <span class="font-medium text-slate-900">微信：</span>
              <span class="whitespace-nowrap font-semibold text-slate-900">lizesheng1234</span>
              <button
                @click="copyWechat"
                class="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
              >
                {{ t('about.copy') }}
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { showMessage } from '@/utils/message'
import PageHeader from '@/components/PageHeader/index.vue'

const { t } = useI18n()

const sections = [
  {
    anchor: 'help-desktop-client',
    title: '桌面端客户端',
    summary: '桌面端客户端用于第三方邮箱接入、本地收信和本地验号，帮助中心按实际操作路径整理使用方式，不展示接口参数。',
    items: [
      {
        anchor: 'help-desktop-client-login',
        navTitle: '登录客户端',
        desc: '桌面端客户端用于承接第三方邮箱的本地能力。',
        steps: [
          '先下载并打开桌面端客户端。',
          '使用当前账号登录客户端，保持客户端和网页端是同一个账号。',
          '登录完成后，再去做第三方邮箱接入、本地收信和本地验号。',
        ],
      },
      {
        anchor: 'help-desktop-client-fetch',
        navTitle: '本地收信',
        desc: '本地收信由桌面端直接连接邮箱服务器，再把结果同步回系统。',
        steps: [
          '在第三方邮箱列表里选择目标邮箱并执行收信。',
          '客户端会在本机完成收件，再把新增邮件同步回统一邮件列表。',
          '收信成功后，网页端和客户端都可以继续查看同步后的邮件结果。',
        ],
      },
      {
        anchor: 'help-desktop-client-verify',
        navTitle: '本地验号',
        desc: '本地验号用于检查第三方邮箱账号当前是否可用。',
        steps: [
          '进入批量验号页面后导入要检测的邮箱账号。',
          '开始验号后，客户端会按账号配置尝试协议识别和连通性校验。',
          '验号结果会回到页面里展示成功、失败、失败原因和 SMTP 校验结果。',
        ],
      },
    ],
  },
  {
    anchor: 'help-temp-mailbox',
    title: '临时邮箱',
    summary: '临时邮箱用于快速收件和验证码提取，页面能力集中在邮箱获取、邮件查看和验证码展示。',
    items: [
      {
        anchor: 'help-temp-mailbox-intro',
        navTitle: '功能说明',
        desc: '临时邮箱适合快速收验证码和短期收件。',
        steps: [
          '进入首页后切到临时邮箱标签，系统会把当前可用的临时邮箱展示在这个区域。',
          '临时邮箱生成后可以直接使用，不需要再单独做绑定或授权。',
          '收到新邮件后，邮件会进入对应邮箱的邮件列表，详情页会同步展示识别到的验证码。',
        ],
      },
      {
        anchor: 'help-temp-mailbox-entry',
        navTitle: '使用入口',
        desc: '临时邮箱入口就在首页的临时邮箱标签下。',
        steps: [
          '打开首页，点击顶部或页面里的临时邮箱标签。',
          '点击获取邮箱或生成邮箱，系统会立即创建可用邮箱地址。',
          '邮箱生成成功后，页面会刷新当前列表，新的邮箱会直接出现在列表里。',
        ],
      },
      {
        anchor: 'help-temp-mailbox-mails',
        navTitle: '邮件查看',
        desc: '临时邮箱生成后，邮件查看按邮箱列表、邮件列表、邮件详情三层展开。',
        steps: [
          '在临时邮箱列表里点击目标邮箱，进入这个邮箱的邮件列表。',
          '在邮件列表里点击任意一封邮件，继续进入邮件详情。',
          '邮件详情页会展示主题、发件人、正文内容、附件信息和验证码结果。',
        ],
      },
      {
        anchor: 'help-temp-mailbox-code',
        navTitle: '验证码提取',
        desc: '验证码提取和邮件详情是一起展示的。',
        steps: [
          '进入验证码邮件详情后，系统会自动尝试识别正文里的验证码。',
          '识别成功时，验证码会直接显示在详情页里，不需要手工再找一次。',
          '如果一封邮件里有多个数字片段，系统会按验证码场景优先返回更像验证码的结果。',
        ],
      },
    ],
  },
  {
    anchor: 'help-hosted-mailbox',
    title: '域名邮箱',
    summary: '域名邮箱用于自有域名收件和账号创建，页面能力集中在域名接入、DNS 配置、邮箱创建和邮件收取。',
    items: [
      {
        anchor: 'help-hosted-mailbox-intro',
        navTitle: '功能说明',
        desc: '域名邮箱用于把自己的域名接入系统做正式收件。',
        steps: [
          '先把自己的域名添加到平台，平台会生成后续要配置的 DNS 记录。',
          'DNS 验证通过后，这个域名才会进入可用状态。',
          '域名可用后，可以继续创建域名邮箱账号，并在统一邮件列表里收件。',
        ],
      },
      {
        anchor: 'help-hosted-mailbox-domain',
        navTitle: '域名准备',
        desc: '域名需要由你自己先持有，再接入到平台。',
        steps: [
          '进入域名邮箱或域名工作台页面。',
          '填写要接入的域名并提交，平台会创建这条域名记录。',
          '创建成功后，页面会返回这条域名后续要配置的 DNS 信息。',
        ],
      },
      {
        anchor: 'help-hosted-mailbox-dns',
        navTitle: 'DNS 配置',
        desc: 'DNS 配置完成后，平台会继续验证域名状态。',
        steps: [
          '把页面提供的 DNS 记录复制到你的域名服务商后台。',
          '保存配置后，回到平台查看这条域名的验证状态。',
          '状态通过后，域名进入可用阶段，可以继续创建邮箱和开始收件。',
        ],
      },
      {
        anchor: 'help-hosted-mailbox-create',
        navTitle: '邮箱创建',
        desc: '域名验证通过后，就可以开始创建域名邮箱。',
        steps: [
          '在可用域名下点击创建邮箱或生成邮箱。',
          '系统会按当前域名生成新的域名邮箱地址。',
          '创建成功后，邮箱会进入域名邮箱列表，并参与统一邮件查看和处理。',
        ],
      },
      {
        anchor: 'help-hosted-mailbox-receive',
        navTitle: '邮件收取',
        desc: '域名邮箱的收件结果会进入统一邮件列表。',
        steps: [
          '域名邮箱有新邮件进入后，邮件会出现在统一邮件列表中。',
          '点击目标邮件即可进入详情页查看正文、附件和验证码结果。',
          '域名邮箱和其他邮箱类型共用同一套邮件查看能力，后续处理方式保持一致。',
        ],
      },
    ],
  },
  {
    anchor: 'help-external-mailbox',
    title: '第三方邮箱',
    summary: '第三方邮箱用于接入已有邮箱账号，相关本地能力依赖桌面端客户端完成。',
    items: [
      {
        anchor: 'help-external-mailbox-intro',
        navTitle: '功能说明',
        desc: '第三方邮箱用于接入你已经在外部使用的邮箱账号。',
        steps: [
          '系统支持普通协议登录和 OAuth2 授权接入两种方式。',
          '接入成功后，账号会进入第三方邮箱列表。',
          '后续收件、邮件查看和验证码提取都会走统一邮件能力。',
        ],
      },
      {
        anchor: 'help-external-mailbox-login',
        navTitle: '账号接入',
        desc: '第三方邮箱接入时，按账号类型选择对应方式。',
        steps: [
          '先登录桌面端客户端，再进入第三方邮箱接入入口。',
          '普通协议账号填写邮箱地址、密码以及相关协议配置，系统支持 IMAP、POP3 和 SMTP 校验。',
          'Google、Microsoft 这类授权型邮箱可以走 OAuth2 接入，接入完成后账号会进入第三方邮箱列表。',
        ],
      },
      {
        anchor: 'help-external-mailbox-fetch',
        navTitle: '邮件收取',
        desc: '第三方邮箱接入成功后，可以单个收件，也可以统一收件。',
        steps: [
          '在第三方邮箱列表里选择单个账号收件，适合只同步某一个邮箱。',
          '也可以使用全部收件，一次同步当前已接入的多个邮箱。',
          '收件动作由桌面端完成，结果会进入统一邮件列表，后续查看方式和其他邮箱类型一致。',
        ],
      },
      {
        anchor: 'help-external-mailbox-verify',
        navTitle: '批量验号',
        desc: '第三方邮箱支持批量验号，用来检查账号当前是否可用。',
        steps: [
          '进入批量验号页面后，先导入要检测的邮箱账号。',
          '开始验号后，系统会按账号配置尝试协议识别和连通性校验。',
          '验号完成后，结果页会返回成功、失败、失败原因和 SMTP 校验结果。',
        ],
      },
      {
        anchor: 'help-external-mailbox-result',
        navTitle: '结果查看',
        desc: '第三方邮箱的状态和验号结果都可以在页面里直接查看。',
        steps: [
          '第三方邮箱列表会展示账号状态、最近同步结果和异常信息。',
          '批量验号页面会展示每个账号的验号结果和失败原因。',
          '根据结果页信息，可以继续处理可用账号或排查失败账号。',
        ],
      },
    ],
  },
]

const commonItems = [
  {
    anchor: 'help-common-search',
    navTitle: '邮件搜索',
    desc: '统一邮件列表支持跨邮箱搜索邮件。',
    steps: [
      '进入统一邮件列表后，可以按主题、发件人和正文关键词搜索。',
      '搜索结果会直接返回符合条件的邮件，适合在多邮箱场景下集中查找内容。',
    ],
  },
  {
    anchor: 'help-common-code',
    navTitle: '验证码提取',
    desc: '验证码提取能力在邮件详情页统一展示。',
    steps: [
      '进入任意邮箱类型的邮件详情页后，系统都会自动尝试识别验证码。',
      '临时邮箱、域名邮箱和第三方邮箱共用同一套识别逻辑。',
    ],
  },
  {
    anchor: 'help-common-delete',
    navTitle: '删除邮件',
    desc: '统一邮件能力支持单封删除和批量删除。',
    steps: [
      '在邮件列表里选择单封邮件时可以直接删除。',
      '进入批量操作模式后，也可以一次删除多封邮件。',
      '删除完成后，列表状态会同步更新。',
    ],
  },
  {
    anchor: 'help-common-share',
    navTitle: '邮箱分享',
    desc: '邮箱分享能力支持把指定邮箱开放给其他人查看。',
    steps: [
      '在支持分享的邮箱列表里选择目标邮箱并创建分享。',
      '分享创建成功后，系统会生成访问链接。',
      '访问方通过这个链接可以查看对应范围内的邮件内容。',
    ],
  },
]

const copyWechat = async () => {
  try {
    await navigator.clipboard.writeText('lizesheng1234')
    showMessage(t('about.copied'), 'success')
  } catch {
    showMessage(t('about.copyFailed'), 'error')
  }
}
</script>
