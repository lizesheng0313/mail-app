<template>
  <div class="min-h-screen bg-gray-50">
    <PageHeader />

    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[220px,1fr]">
        <aside class="self-start rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div class="border-b border-gray-100 px-3 pb-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">接口目录</p>
            <h2 class="mt-2 text-base font-semibold text-gray-900">对外接口</h2>
          </div>

          <div class="space-y-5 px-1 pt-4">
            <div>
              <p class="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">接入方式</p>
              <div class="mt-2 space-y-1">
                <a
                  href="#doc-auth"
                  class="block rounded-xl px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  如何调用
                </a>
              </div>
            </div>

            <div v-if="docEndpointGroups.length">
              <p class="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">接口目录</p>
              <div class="mt-2 space-y-3">
                <div
                  v-for="group in docEndpointGroups"
                  :key="group.name"
                  class="space-y-1"
                >
                  <a
                    :href="`#${getDocAnchor(group.name)}`"
                    class="block rounded-xl px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  >
                    {{ getDocGroupLabel(group.name, group.description) }}
                  </a>
                  <div class="space-y-1 pl-3">
                    <a
                      v-for="endpoint in group.items"
                      :key="`${endpoint.method}-${endpoint.path}`"
                      :href="`#${getEndpointAnchor(group.name, endpoint)}`"
                      class="block rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    >
                      {{ getEndpointLabel(endpoint) }}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="errorGroups.length">
              <p class="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">附录</p>
              <div class="mt-2 space-y-1">
                <a
                  href="#doc-errors"
                  class="block rounded-xl px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  错误码
                </a>
              </div>
            </div>
          </div>
        </aside>

        <main class="space-y-6">
          <section id="doc-auth" class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h2 class="text-xl font-semibold text-gray-900">对外接口文档</h2>
                <p class="mt-2 text-sm text-gray-600">先创建访问密钥，再按下面的接口地址直接调用。</p>
              </div>
              <div v-if="loading" class="text-sm text-gray-500">加载中...</div>
            </div>

            <div class="mt-6 flex flex-wrap gap-3">
              <span class="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                协议 {{ (meta?.version || 'v1').toUpperCase() }}
              </span>
              <span class="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                基础路径 /open/v1
              </span>
              <span
                v-for="mode in meta?.auth?.supported_modes || []"
                :key="mode"
                class="rounded-full bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700"
              >
                {{ getAuthModeLabel(mode) }}
              </span>
            </div>

            <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div class="rounded-2xl bg-gray-50 p-5">
                <p class="text-sm font-semibold text-gray-900">1. 创建访问密钥</p>
                <p class="mt-2 text-sm leading-6 text-gray-600">登录后到我的工作台创建一把访问密钥。</p>
              </div>
              <div class="rounded-2xl bg-gray-50 p-5">
                <p class="text-sm font-semibold text-gray-900">2. 带上鉴权头</p>
                <p class="mt-2 text-sm leading-6 text-gray-600">请求时用 `Authorization: Bearer sk_xxx` 或 `X-API-Key`。</p>
              </div>
              <div class="rounded-2xl bg-gray-50 p-5">
                <p class="text-sm font-semibold text-gray-900">3. 调下面接口</p>
                <p class="mt-2 text-sm leading-6 text-gray-600">系统邮箱、第三方邮箱、邮件、验证码、工作流都在下面。</p>
              </div>
            </div>

            <div class="mt-6 rounded-2xl bg-gray-900 p-5 text-gray-100">
              <p class="text-sm font-medium">请求示例</p>
              <pre class="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-gray-100">{{ sampleCurl }}</pre>
            </div>
          </section>

          <section
            v-for="group in docEndpointGroups"
            :id="getDocAnchor(group.name)"
            :key="group.name"
            class="scroll-mt-28 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200"
          >
            <div class="border-b border-gray-200 bg-gray-50 px-5 py-4">
              <div class="flex flex-wrap items-center gap-3">
                <h3 class="text-base font-semibold text-gray-900">{{ getDocGroupLabel(group.name, group.description) }}</h3>
                <code class="rounded-full bg-white px-3 py-1 text-xs text-gray-500">{{ group.name }}</code>
                <span class="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                  {{ group.items?.length || 0 }} 个接口
                </span>
              </div>
              <p class="mt-2 text-sm text-gray-600">{{ group.description }}</p>
            </div>

            <div class="divide-y divide-gray-100">
              <div
                v-for="endpoint in group.items"
                :key="endpoint.method + endpoint.path"
                :id="getEndpointAnchor(group.name, endpoint)"
                class="scroll-mt-28 space-y-3 px-5 py-4"
              >
                <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div class="flex items-center gap-3">
                    <span class="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">{{ endpoint.method }}</span>
                    <code class="text-sm text-primary-700">{{ endpoint.path }}</code>
                  </div>
                  <p class="text-sm text-gray-600">{{ endpoint.description }}</p>
                </div>

                <div class="flex flex-wrap gap-2 text-xs text-gray-500">
                  <span v-if="endpoint.scope" class="rounded-full bg-primary-50 px-3 py-1 text-primary-700">
                    权限: {{ getScopeLabel(endpoint.scope) }}
                  </span>
                  <span v-if="endpoint.auth" class="rounded-full bg-gray-100 px-3 py-1">
                    鉴权: {{ endpoint.auth }}
                  </span>
                </div>

                <pre
                  v-if="endpoint.sample"
                  class="overflow-x-auto whitespace-pre-wrap rounded-xl bg-gray-900 px-4 py-3 text-xs leading-6 text-gray-100"
                >{{ endpoint.sample }}</pre>

                <div v-if="hasRenderableExample(endpoint.request_example) || hasRenderableExample(endpoint.response_example)" class="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <pre
                    v-if="hasRenderableExample(endpoint.request_example)"
                    class="overflow-x-auto whitespace-pre-wrap rounded-xl bg-gray-50 px-4 py-3 text-xs leading-6 text-gray-700"
                  >请求示例
{{ formatJson(endpoint.request_example) }}</pre>
                  <pre
                    v-if="hasRenderableExample(endpoint.response_example)"
                    class="overflow-x-auto whitespace-pre-wrap rounded-xl bg-gray-50 px-4 py-3 text-xs leading-6 text-gray-700"
                  >返回示例
{{ formatJson(endpoint.response_example) }}</pre>
                </div>

                <div v-if="endpoint.error_codes?.length" class="flex flex-wrap gap-2 text-xs">
                  <span
                    v-for="code in endpoint.error_codes"
                    :key="code"
                    class="rounded-full bg-red-50 px-3 py-1 text-red-700"
                  >
                    错误码: {{ code }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section v-if="!loading && !docEndpointGroups.length" class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h3 class="text-base font-semibold text-gray-900">暂无接口文档</h3>
            <p class="mt-2 text-sm text-gray-600">当前没有可展示的对外接口，请检查文档数据是否返回成功。</p>
          </section>

          <section v-if="errorGroups.length" id="doc-errors" class="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-200 bg-gray-50 px-5 py-4">
              <h3 class="text-base font-semibold text-gray-900">错误码</h3>
              <p class="mt-1 text-sm text-gray-600">开放平台统一错误码目录。</p>
            </div>
            <div class="divide-y divide-gray-100">
              <div
                v-for="group in errorGroups"
                :key="group.group"
                class="px-5 py-4"
              >
                <p class="text-sm font-semibold uppercase tracking-wide text-gray-900">{{ group.group }}</p>
                <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div
                    v-for="item in group.items"
                    :key="item.code"
                    class="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700"
                  >
                    <p class="font-semibold text-gray-900">{{ item.code }} / {{ item.message_key }}</p>
                    <p class="mt-1">{{ item.message }}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import PageHeader from '@/components/PageHeader/index.vue'
import openPlatformApi from '@/services/openPlatformApi'

type EndpointItem = {
  method: string
  path: string
  description: string
  auth?: string
  scope?: string
  sample?: string
  request_example?: any
  response_example?: any
  error_codes?: Array<number | string>
}

type EndpointGroup = {
  name: string
  description: string
  items: EndpointItem[]
}

type ErrorGroup = {
  group: string
  items: Array<{
    code: number | string
    message_key: string
    message: string
  }>
}

const loading = ref(false)
const meta = ref<any>(null)
const docsData = ref<any>(null)

const fallbackDocGroups: EndpointGroup[] = [
  {
    name: 'hosted-domains',
    description: '托管域名接口',
    items: [
      {
        method: 'POST',
        path: '/open/v1/hosted-domains',
        description: '创建托管域名',
        auth: 'API Key / 登录 Token',
        scope: 'mailbox.write',
        request_example: { domain_name: 'example.com', expires_at_ms: 1770000000000 },
        response_example: { domain: { id: 11, domain_name: 'example.com', verification_status: 'pending' } },
        error_codes: [1002, 1004, 2001]
      },
      {
        method: 'GET',
        path: '/open/v1/hosted-domains',
        description: '获取托管域名列表',
        auth: 'API Key / 登录 Token',
        scope: 'mailbox.read',
        request_example: {},
        response_example: { items: [{ id: 11, domain_name: 'example.com', verification_status: 'verified' }] },
        error_codes: [1002, 1004, 2001]
      },
      {
        method: 'GET',
        path: '/open/v1/hosted-domains/{domain_id}',
        description: '获取托管域名详情',
        auth: 'API Key / 登录 Token',
        scope: 'mailbox.read',
        request_example: {},
        response_example: { domain: { id: 11, domain_name: 'example.com' }, dns_instructions: [] },
        error_codes: [1002, 1004, 2001]
      },
      {
        method: 'PUT',
        path: '/open/v1/hosted-domains/{domain_id}',
        description: '更新托管域名',
        auth: 'API Key / 登录 Token',
        scope: 'mailbox.write',
        request_example: { is_active: false, expires_at_ms: 1770000000000 },
        response_example: { domain: { id: 11, domain_name: 'example.com', is_active: false } },
        error_codes: [1002, 1004, 2001]
      },
      {
        method: 'DELETE',
        path: '/open/v1/hosted-domains/{domain_id}',
        description: '删除托管域名',
        auth: 'API Key / 登录 Token',
        scope: 'mailbox.write',
        request_example: {},
        response_example: { code: 0, message: '删除托管域名成功' },
        error_codes: [1002, 1004, 2001]
      },
      {
        method: 'POST',
        path: '/open/v1/hosted-domains/{domain_id}/refresh-dns',
        description: '立即验证托管域名 DNS',
        auth: 'API Key / 登录 Token',
        scope: 'mailbox.read',
        request_example: {},
        response_example: { domain: { id: 11, verification_status: 'verified' }, dns_instructions: [] },
        error_codes: [1002, 1004, 2001]
      }
    ]
  },
  {
    name: 'mailboxes',
    description: '系统邮箱接口',
    items: [
      {
        method: 'POST',
        path: '/open/v1/mailboxes',
        description: '生成系统邮箱',
        auth: 'API Key / 登录 Token',
        scope: 'mailbox.write',
        request_example: {},
        response_example: { item: { id: 101, email_address: 'demo@fmm.email' } },
        error_codes: [1002, 1004, 2001]
      },
      {
        method: 'GET',
        path: '/open/v1/mailboxes',
        description: '获取系统邮箱列表',
        auth: 'API Key / 登录 Token',
        scope: 'mailbox.read',
        request_example: { page: 1, page_size: 20 },
        response_example: { items: [{ id: 101, email_address: 'demo@fmm.email' }] },
        error_codes: [1002, 1004, 2001]
      },
      {
        method: 'DELETE',
        path: '/open/v1/mailboxes/{mailbox_id}',
        description: '删除系统邮箱',
        auth: 'API Key / 登录 Token',
        scope: 'mailbox.write',
        request_example: {},
        response_example: { code: 0, message: '删除邮箱成功' },
        error_codes: [1002, 1004, 2001]
      }
    ]
  },
  {
    name: 'external-mailboxes',
    description: '第三方邮箱接口',
    items: [
      {
        method: 'GET',
        path: '/open/v1/external-mailboxes',
        description: '获取第三方邮箱列表',
        auth: 'API Key / 登录 Token',
        scope: 'external_mailbox.read',
        request_example: { page: 1, page_size: 20 },
        response_example: { items: [{ id: 201, email: 'demo@qq.com', status: 'active' }] },
        error_codes: [1002, 1004, 2001]
      },
      {
        method: 'DELETE',
        path: '/open/v1/external-mailboxes/{mailbox_id}',
        description: '删除第三方邮箱',
        auth: 'API Key / 登录 Token',
        scope: 'external_mailbox.write',
        request_example: {},
        response_example: { code: 0, message: '删除第三方邮箱成功' },
        error_codes: [1002, 1004, 2001]
      }
    ]
  },
  {
    name: 'smtp-accounts',
    description: '发信账号接口，当前对外开放的是发信账号查询。',
    items: [
      {
        method: 'GET',
        path: '/open/v1/smtp-accounts',
        description: '获取发信账号列表',
        auth: 'API Key / 登录 Token',
        scope: 'smtp_account.read',
        request_example: {},
        response_example: { items: [{ id: 301, email: 'sender@example.com', can_send: true }] },
        error_codes: [1002, 1004, 2001]
      }
    ]
  },
  {
    name: 'emails',
    description: '邮件接口',
    items: [
      {
        method: 'GET',
        path: '/open/v1/emails',
        description: '获取邮件列表',
        auth: 'API Key / 登录 Token',
        scope: 'email.read',
        request_example: { mailbox_type: 'system', page: 1, page_size: 20 },
        response_example: { items: [{ id: 401, subject: '验证码', from_addr: 'no-reply@example.com' }] },
        error_codes: [1002, 1004, 2001]
      },
      {
        method: 'GET',
        path: '/open/v1/emails/{email_id}',
        description: '获取邮件详情',
        auth: 'API Key / 登录 Token',
        scope: 'email.read+email.body.read',
        request_example: {},
        response_example: { item: { id: 401, subject: '验证码', content_text: '您的验证码是 123456' } },
        error_codes: [1002, 1004, 2001]
      },
      {
        method: 'DELETE',
        path: '/open/v1/emails/{email_id}',
        description: '删除邮件',
        auth: 'API Key / 登录 Token',
        scope: 'email.delete',
        request_example: {},
        response_example: { code: 0, message: '删除邮件成功' },
        error_codes: [1002, 1004, 2001]
      }
    ]
  },
  {
    name: 'verification-codes',
    description: '验证码接口',
    items: [
      {
        method: 'GET',
        path: '/open/v1/verification-codes/latest',
        description: '获取最新验证码',
        auth: 'API Key / 登录 Token',
        scope: 'verification_code.read+email.body.read',
        request_example: { mailbox_type: 'system' },
        response_example: { code: '123456', email_id: 401, subject: '登录验证码' },
        error_codes: [1002, 1004, 2001]
      },
      {
        method: 'GET',
        path: '/open/v1/verification-codes/{email_id}',
        description: '获取指定邮件验证码',
        auth: 'API Key / 登录 Token',
        scope: 'verification_code.read+email.body.read',
        request_example: {},
        response_example: { code: '123456', email_id: 401, subject: '登录验证码' },
        error_codes: [1002, 1004, 2001]
      }
    ]
  },
  {
    name: 'workflow-executions',
    description: '工作流执行接口',
    items: [
      {
        method: 'POST',
        path: '/open/v1/workflow-executions',
        description: '执行工作流',
        auth: 'API Key / 登录 Token',
        scope: 'workflow.execute',
        request_example: { workflow_id: 'wf_xxx', email_id: 401 },
        response_example: { item: { execution_id: 'exec_xxx', status: 'queued' } },
        error_codes: [1002, 1004, 2001]
      },
      {
        method: 'GET',
        path: '/open/v1/workflow-executions/{execution_id}',
        description: '获取工作流执行结果',
        auth: 'API Key / 登录 Token',
        scope: 'workflow.execute',
        request_example: {},
        response_example: { item: { execution_id: 'exec_xxx', status: 'success' } },
        error_codes: [1002, 1004, 2001]
      }
    ]
  }
]

const docGroupLabelMap: Record<string, string> = {
  'api-keys': '访问密钥',
  logs: '调用日志',
  'hosted-domains': '托管域名',
  mailboxes: '系统邮箱',
  'external-mailboxes': '第三方邮箱',
  'smtp-accounts': '发信账号',
  emails: '邮件',
  'verification-codes': '验证码',
  'workflow-executions': '工作流执行'
}

const scopeLabelMap: Record<string, string> = {
  'mailbox.read': '读取系统邮箱',
  'mailbox.write': '管理系统邮箱',
  'external_mailbox.read': '读取第三方邮箱',
  'external_mailbox.write': '管理第三方邮箱',
  'smtp_account.read': '读取发信账号',
  'email.read': '读取邮件列表',
  'email.body.read': '读取邮件正文',
  'email.delete': '删除邮件',
  'verification_code.read': '读取验证码',
  'workflow.execute': '执行工作流'
}

const endpointLabelMap: Record<string, string> = {
  'POST /open/v1/hosted-domains': '创建托管域名',
  'GET /open/v1/hosted-domains': '托管域名列表',
  'GET /open/v1/hosted-domains/{domain_id}': '托管域名详情',
  'PUT /open/v1/hosted-domains/{domain_id}': '更新托管域名',
  'DELETE /open/v1/hosted-domains/{domain_id}': '删除托管域名',
  'POST /open/v1/hosted-domains/{domain_id}/refresh-dns': '验证 DNS',
  'POST /open/v1/mailboxes': '创建邮箱',
  'GET /open/v1/mailboxes': '邮箱列表',
  'DELETE /open/v1/mailboxes/{mailbox_id}': '删除邮箱',
  'GET /open/v1/external-mailboxes': '外部邮箱列表',
  'DELETE /open/v1/external-mailboxes/{mailbox_id}': '删除外部邮箱',
  'GET /open/v1/smtp-accounts': '发信账号列表',
  'GET /open/v1/emails': '邮件列表',
  'GET /open/v1/emails/{email_id}': '邮件详情',
  'DELETE /open/v1/emails/{email_id}': '删除邮件',
  'GET /open/v1/verification-codes/latest': '最新验证码',
  'GET /open/v1/verification-codes/{email_id}': '邮件验证码',
  'POST /open/v1/workflow-executions': '执行工作流',
  'GET /open/v1/workflow-executions/{execution_id}': '执行结果'
}

const endpointGroups = computed<EndpointGroup[]>(() => {
  const groups = docsData.value?.groups?.length ? docsData.value.groups : fallbackDocGroups
  return groups.filter((group: EndpointGroup) => group?.name && group.name !== 'overview' && group.name !== 'tools')
})

const docEndpointGroups = computed<EndpointGroup[]>(() => {
  return endpointGroups.value
    .map((group) => ({
      ...group,
      items: (group.items || []).filter((item) => {
        const path = String(item.path || '')
        const method = String(item.method || '').toUpperCase()
        if (!path.startsWith('/open/v1')) return false
        if (method === 'POST' && path === '/open/v1/external-mailboxes') return false
        return true
      })
    }))
    .filter((group) => group.items.length > 0 && !['api-keys', 'logs'].includes(group.name))
})

const errorGroups = computed<ErrorGroup[]>(() => {
  const groups = docsData.value?.errors || []
  return groups.filter((group: ErrorGroup) => Array.isArray(group.items) && group.items.length > 0)
})

const getDocAnchor = (name: string) => `doc-${name}`
const getEndpointAnchor = (groupName: string, endpoint: EndpointItem) =>
  `doc-${groupName}-${endpoint.method.toLowerCase()}-${String(endpoint.path || '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()}`
const getDocGroupLabel = (name: string, fallback?: string) => docGroupLabelMap[name] || fallback || name
const getEndpointLabel = (endpoint: EndpointItem) => {
  const key = `${String(endpoint.method || '').toUpperCase()} ${String(endpoint.path || '')}`
  return endpointLabelMap[key] || endpoint.description || `${endpoint.method} ${endpoint.path}`
}
const getAuthModeLabel = (mode?: string) => {
  if (mode === 'api_key') return 'API Key 鉴权'
  if (mode === 'bearer_token') return '登录态鉴权'
  return mode || '-'
}

const sampleCurl = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `curl -X GET '${origin}/open/v1/verification-codes/latest?mailbox_type=system' \\\n  -H 'Authorization: Bearer sk_live_xxx'`
})

const getScopeLabel = (scope?: string) => {
  if (!scope) return '-'
  return scope
    .split('+')
    .map((item) => scopeLabelMap[item.trim()] || item.trim())
    .join(' + ')
}

const hasRenderableExample = (value: any) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

const formatJson = (value: any) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

const loadMeta = async () => {
  const response: any = await openPlatformApi.get('/meta', { suppressErrorMessage: true } as any)
  if (response.code === 0) {
    meta.value = response.data
  }
}

const loadDocs = async () => {
  const response: any = await openPlatformApi.get('/docs', { suppressErrorMessage: true } as any)
  if (response.code === 0) {
    docsData.value = response.data
  }
}

const loadPageData = async () => {
  loading.value = true
  try {
    await Promise.all([loadMeta(), loadDocs()])
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadPageData()
})
</script>
