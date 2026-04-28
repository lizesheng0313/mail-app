<template>
  <div class="min-h-screen bg-gray-50">
    <PageHeader />

    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[220px,1fr]">
        <aside class="self-start rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div class="border-b border-gray-100 px-3 pb-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{{ t('openPlatform.sidebarCatalog') }}</p>
            <h2 class="mt-2 text-base font-semibold text-gray-900">{{ t('openPlatform.externalApis') }}</h2>
          </div>

          <div class="space-y-5 px-1 pt-4">
            <div>
              <p class="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{{ t('openPlatform.accessGuide') }}</p>
              <div class="mt-2 space-y-1">
                <a
                  href="#doc-auth"
                  class="block rounded-xl px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  {{ t('openPlatform.howToCall') }}
                </a>
              </div>
            </div>

            <div v-if="docEndpointGroups.length">
              <p class="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{{ t('openPlatform.sidebarCatalog') }}</p>
              <div class="mt-2 space-y-3">
                <div
                  v-for="group in docEndpointGroups"
                  :key="group.name"
                  class="space-y-2"
                >
                  <a
                    :href="`#${getDocAnchor(group.name)}`"
                    class="block rounded-xl px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  >
                    {{ group.label }}
                  </a>
                  <div class="space-y-2 pl-3">
                    <div
                      v-for="subgroup in group.groups"
                      :key="subgroup.name"
                      class="space-y-1"
                    >
                      <a
                        :href="`#${getDocSubgroupAnchor(group.name, subgroup.name)}`"
                        class="block rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                      >
                        {{ subgroup.label }}
                      </a>
                      <div class="space-y-1 pl-3">
                        <a
                          v-for="endpoint in subgroup.items"
                          :key="`${endpoint.method}-${endpoint.path}`"
                          :href="`#${getEndpointAnchor(getEndpointAnchorGroup(endpoint, subgroup.name), endpoint)}`"
                          class="block rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
                        >
                          {{ getEndpointLabel(endpoint) }}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="errorGroups.length">
              <p class="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{{ t('openPlatform.appendix') }}</p>
              <div class="mt-2 space-y-1">
                <a
                  href="#doc-errors"
                  class="block rounded-xl px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  {{ t('openPlatform.errorCodes') }}
                </a>
              </div>
            </div>
          </div>
        </aside>

        <main class="space-y-6">
          <section id="doc-auth" class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h2 class="text-xl font-semibold text-gray-900">{{ t('openPlatform.title') }}</h2>
                <p class="mt-2 text-sm text-gray-600">{{ t('openPlatform.intro') }}</p>
              </div>
              <div v-if="loading" class="text-sm text-gray-500">{{ t('common.loading') }}</div>
            </div>

            <div class="mt-6 flex flex-wrap gap-3">
              <span class="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                {{ t('openPlatform.protocol') }} {{ (meta?.version || 'v1').toUpperCase() }}
              </span>
              <span class="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                {{ t('openPlatform.basePath') }} /open/v1
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
                <p class="text-sm font-semibold text-gray-900">{{ t('openPlatform.step1Title') }}</p>
                <p class="mt-2 text-sm leading-6 text-gray-600">
                  {{ t('openPlatform.step1DescPrefix') }}
                  <router-link to="/user/developer/api-keys" class="text-primary-600 hover:text-primary-700">
                    {{ t('openPlatform.step1DescLink') }}
                  </router-link>
                  {{ t('openPlatform.step1DescSuffix') }}
                </p>
              </div>
              <div class="rounded-2xl bg-gray-50 p-5">
                <p class="text-sm font-semibold text-gray-900">{{ t('openPlatform.step2Title') }}</p>
                <p class="mt-2 text-sm leading-6 text-gray-600">{{ t('openPlatform.step2Desc') }}</p>
              </div>
              <div class="rounded-2xl bg-gray-50 p-5">
                <p class="text-sm font-semibold text-gray-900">{{ t('openPlatform.step3Title') }}</p>
                <p class="mt-2 text-sm leading-6 text-gray-600">{{ t('openPlatform.step3Desc') }}</p>
              </div>
            </div>

            <div class="mt-6 overflow-hidden rounded-xl border border-gray-200">
              <div class="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900">{{ t('openPlatform.commonHeadersTitle') }}</div>
              <div class="divide-y divide-gray-100">
                <div
                  v-for="header in commonHeaders"
                  :key="header.name"
                  class="grid grid-cols-1 gap-2 px-4 py-3 lg:grid-cols-[220px,1fr]"
                >
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <code class="text-sm text-primary-700">{{ header.name }}</code>
                      <span
                        :class="header.required ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'"
                        class="rounded-full px-2 py-0.5 text-xs"
                      >
                        {{ header.required ? t('common.required') : t('common.optional') }}
                      </span>
                    </div>
                    <div class="mt-1 text-xs text-gray-500">{{ header.type }}</div>
                  </div>
                  <div class="text-sm leading-6 text-gray-600">{{ header.description }}</div>
                </div>
              </div>
            </div>

            <div class="mt-6 rounded-2xl bg-gray-900 p-5 text-gray-100">
              <p class="text-sm font-medium">{{ t('openPlatform.requestSample') }}</p>
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
                <h3 class="text-base font-semibold text-gray-900">{{ group.label }}</h3>
              </div>
              <p class="mt-2 text-sm text-gray-600">{{ group.description }}</p>
            </div>

            <div class="divide-y divide-gray-100">
              <div
                v-for="subgroup in group.groups"
                :key="subgroup.name"
                :id="getDocSubgroupAnchor(group.name, subgroup.name)"
                class="scroll-mt-28"
              >
                <div class="border-b border-gray-100 px-5 py-4">
                  <h4 class="text-sm font-semibold text-gray-900">{{ subgroup.label }}</h4>
                  <p v-if="subgroup.description" class="mt-1 text-sm text-gray-600">{{ subgroup.description }}</p>
                </div>

                <div class="divide-y divide-gray-100">
                  <div
                    v-for="endpoint in subgroup.items"
                    :key="endpoint.method + endpoint.path"
                    :id="getEndpointAnchor(getEndpointAnchorGroup(endpoint, subgroup.name), endpoint)"
                    class="scroll-mt-28 space-y-3 px-5 py-4"
                  >
                    <div class="space-y-2">
                      <div class="flex flex-wrap items-center gap-3">
                        <span class="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">{{ endpoint.method }}</span>
                        <h4 class="text-sm font-semibold text-gray-900">{{ endpoint.title || getEndpointLabel(endpoint) }}</h4>
                      </div>
                      <div class="space-y-2">
                        <div class="space-y-1.5">
                          <div
                            v-for="target in getEndpointTargets(endpoint)"
                            :key="`${endpoint.method}-${endpoint.path}-${target.url}`"
                            class="flex flex-col gap-1 rounded-xl bg-gray-50 px-3 py-2 md:flex-row md:items-center md:gap-3"
                          >
                            <span
                              :class="target.kind === 'desktop' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'"
                              class="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium"
                            >
                              {{ target.label }}
                            </span>
                            <code class="block text-sm text-primary-700 break-all">{{ target.url }}</code>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="flex flex-wrap gap-2 text-xs text-gray-500">
                      <span v-if="endpoint.scope" class="rounded-full bg-primary-50 px-3 py-1 text-primary-700">
                        {{ t('openPlatform.scopeLabel') }}: {{ getScopeLabel(endpoint.scope) }}
                      </span>
                      <span v-if="endpoint.auth" class="rounded-full bg-gray-100 px-3 py-1">
                        {{ t('openPlatform.authLabel') }}: {{ endpoint.auth }}
                      </span>
                    </div>

                    <pre
                      v-if="endpoint.sample"
                      class="overflow-x-auto whitespace-pre-wrap rounded-xl bg-gray-900 px-4 py-3 text-xs leading-6 text-gray-100"
                    >{{ endpoint.sample }}</pre>

                    <div v-if="shouldRenderRequestParams(endpoint) && getEndpointParameters(endpoint).length" class="overflow-hidden rounded-xl border border-gray-200">
                      <div class="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900">{{ t('openPlatform.requestParams') }}</div>
                      <div class="divide-y divide-gray-100">
                        <div
                          v-for="param in getEndpointParameters(endpoint)"
                          :key="param.name"
                          class="grid grid-cols-1 gap-2 px-4 py-3 lg:grid-cols-[220px,1fr]"
                        >
                          <div>
                            <div class="flex flex-wrap items-center gap-2">
                              <code class="text-sm text-primary-700">{{ param.name }}</code>
                              <span
                                :class="param.required ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'"
                                class="rounded-full px-2 py-0.5 text-xs"
                              >
                                {{ param.required ? t('common.required') : t('common.optional') }}
                              </span>
                            </div>
                            <div class="mt-1 text-xs text-gray-500">
                              {{ param.type }}
                              <span v-if="param.enumText"> · {{ param.enumText }}</span>
                            </div>
                          </div>
                          <div class="text-sm leading-6 text-gray-600">{{ param.description || '-' }}</div>
                        </div>
                      </div>
                    </div>

                    <div v-if="hasRenderableExample(endpoint.request_example) || hasRenderableExample(endpoint.response_example)" class="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <pre
                        v-if="hasRenderableExample(endpoint.request_example)"
                        class="overflow-x-auto whitespace-pre-wrap rounded-xl bg-gray-50 px-4 py-3 text-xs leading-6 text-gray-700"
                      >{{ t('openPlatform.requestExample') }}
{{ formatJson(endpoint.request_example) }}</pre>
                      <pre
                        v-if="hasRenderableExample(endpoint.response_example)"
                        class="overflow-x-auto whitespace-pre-wrap rounded-xl bg-gray-50 px-4 py-3 text-xs leading-6 text-gray-700"
                      >{{ t('openPlatform.responseExample') }}
{{ formatJson(endpoint.response_example) }}</pre>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </section>

          <section v-if="!loading && !docEndpointGroups.length" class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h3 class="text-base font-semibold text-gray-900">{{ t('openPlatform.noDocsTitle') }}</h3>
            <p class="mt-2 text-sm text-gray-600">{{ t('openPlatform.noDocsDesc') }}</p>
          </section>

          <section v-if="errorGroups.length" id="doc-errors" class="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-200 bg-gray-50 px-5 py-4">
              <h3 class="text-base font-semibold text-gray-900">{{ t('openPlatform.errorCatalogTitle') }}</h3>
              <p class="mt-1 text-sm text-gray-600">{{ t('openPlatform.errorCatalogDesc') }}</p>
            </div>
            <div class="divide-y divide-gray-100">
              <div
                v-for="group in errorGroups"
                :key="group.group"
                class="px-5 py-4"
              >
                <p class="text-sm font-semibold uppercase tracking-wide text-gray-900">{{ group.group }}</p>
                <div class="mt-3 overflow-hidden rounded-xl border border-gray-200">
                  <div
                    v-for="item in group.items"
                    :key="item.code"
                    class="grid grid-cols-1 gap-2 border-b border-gray-100 px-4 py-3 last:border-b-0 lg:grid-cols-[220px,1fr]"
                  >
                    <div>
                      <code class="text-sm text-red-700">{{ item.code }}</code>
                      <div class="mt-1 text-xs text-gray-500">{{ item.message_key }}</div>
                    </div>
                    <div class="text-sm leading-6 text-gray-600">{{ item.message }}</div>
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
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import PageHeader from '@/components/PageHeader/index.vue'
import openPlatformApi from '@/services/openPlatformApi'

const { t, locale } = useI18n()

type EndpointItem = {
  title?: string
  method: string
  path: string
  description: string
  auth?: string
  scope?: string
  sample?: string
  execution_mode?: string
  request_schema?: any
  request_example?: any
  response_example?: any
  error_codes?: Array<number | string>
}

type EndpointGroup = {
  name: string
  description: string
  items: EndpointItem[]
}

type DocEndpointSubgroup = {
  name: string
  label: string
  description?: string
  items: EndpointItem[]
}

type DocEndpointGroup = {
  name: string
  label: string
  description: string
  groups: DocEndpointSubgroup[]
}

type ErrorItem = {
  code: number | string
  message_key: string
  message: string
}

type ErrorGroup = {
  group: string
  items: ErrorItem[]
}

type EndpointTarget = {
  label: string
  url: string
  kind: 'desktop' | 'online'
}

type CommonHeaderItem = {
  name: string
  required: boolean
  type: string
  description: string
}

const loading = ref(false)
const meta = ref<any>(null)
const docsData = ref<any>(null)

const scopeLabelMap: Record<string, string> = {
  'mailbox.read': 'openPlatform.scopes.mailboxRead',
  'mailbox.write': 'openPlatform.scopes.mailboxWrite',
  'external_mailbox.read': 'openPlatform.scopes.externalRead',
  'external_mailbox.write': 'openPlatform.scopes.externalWrite',
  'smtp_account.read': 'openPlatform.scopes.smtpRead',
  'email.read': 'openPlatform.scopes.emailRead',
  'email.body.read': 'openPlatform.scopes.emailBodyRead',
  'email.delete': 'openPlatform.scopes.emailDelete',
  'verification_code.read': 'openPlatform.scopes.codeRead',
  'workflow.execute': 'openPlatform.scopes.workflowExecute'
}

const endpointLabelMap: Record<string, string> = {
  'POST /open/v1/mailboxes': 'openPlatform.endpoints.createMailbox',
  'GET /open/v1/mailboxes': 'openPlatform.endpoints.listMailboxes',
  'DELETE /open/v1/mailboxes/{mailbox_id}': 'openPlatform.endpoints.deleteMailbox',
  'GET /open/v1/external-mailboxes': 'openPlatform.endpoints.listExternalMailboxes',
  'DELETE /open/v1/external-mailboxes/{mailbox_id}': 'openPlatform.endpoints.deleteExternalMailbox',
  'GET /open/v1/smtp-accounts': 'openPlatform.endpoints.listSmtpAccounts',
  'GET /open/v1/emails': 'openPlatform.endpoints.listEmails',
  'GET /open/v1/emails/{email_id}': 'openPlatform.endpoints.emailDetail',
  'DELETE /open/v1/emails/{email_id}': 'openPlatform.endpoints.deleteEmail',
  'GET /open/v1/verification-codes/latest': 'openPlatform.endpoints.latestCode',
  'GET /open/v1/verification-codes/{email_id}': 'openPlatform.endpoints.emailCode',
  'POST /open/v1/workflow-executions': 'openPlatform.endpoints.runWorkflow',
  'GET /open/v1/workflow-executions/{execution_id}': 'openPlatform.endpoints.workflowResult'
}

const endpointGroups = computed<EndpointGroup[]>(() => {
  const groups = docsData.value?.groups || []
  return groups.filter((group: EndpointGroup) => group?.name && group.name !== 'overview' && group.name !== 'tools')
})

const isVisibleDocEndpoint = (groupName: string, item: EndpointItem) => {
  const path = String(item.path || '')
  const method = String(item.method || '').toUpperCase()
  if (groupName === 'desktop-local' || item.execution_mode === 'desktop_local') return true
  if (path.startsWith('desktop://')) return true
  if (!path.startsWith('/open/v1')) return false
  if (path.startsWith('/open/v1/hosted-domains')) return false
  if (method === 'POST' && path === '/open/v1/external-mailboxes') return false
  return true
}

const endpointPathIncludes = (value: string) => (item: EndpointItem) => String(item.path || '').includes(value)

const docEndpointGroups = computed<DocEndpointGroup[]>(() => {
  const groups = endpointGroups.value
    .map((group) => ({
      ...group,
      items: (group.items || []).filter((item) => isVisibleDocEndpoint(group.name, item))
    }))
    .filter((group) => group.items.length > 0 && !['api-keys', 'logs'].includes(group.name))

  const groupMap = new Map(groups.map((group) => [group.name, group]))
  const getItems = (name: string) => groupMap.get(name)?.items || []
  const desktopItems = getItems('desktop-local')

  const desktopSendItems = desktopItems.filter(endpointPathIncludes('/local-api/v1/smtp/send'))
  const desktopExternalItems = desktopItems.filter((item) => {
    const path = String(item.path || '')
    return path.includes('/local-api/v1/external-mailboxes/verify')
      || path.includes('/local-api/v1/external-mailboxes/fetch')
  })

  const sections: DocEndpointGroup[] = [
    {
      name: 'mailbox',
      label: '临时邮箱',
      description: '临时邮箱和域名邮箱账号管理接口。',
      groups: [
        {
          name: 'mailboxes',
          label: '邮箱账号',
          description: getItems('mailboxes')[0] ? groupMap.get('mailboxes')?.description : '',
          items: getItems('mailboxes')
        }
      ]
    },
    {
      name: 'external',
      label: '第三方邮箱',
      description: '第三方邮箱、发信账号和桌面端本地能力。',
      groups: [
        {
          name: 'external-mailboxes',
          label: '邮箱账号',
          description: groupMap.get('external-mailboxes')?.description || '',
          items: getItems('external-mailboxes')
        },
        {
          name: 'desktop-local',
          label: '桌面端本地',
          description: '以下接口只能在桌面应用启动后，通过 127.0.0.1 调用。',
          items: desktopExternalItems
        },
        {
          name: 'send',
          label: '发信',
          description: '发信账号查询和桌面端本地发信。',
          items: [...getItems('smtp-accounts'), ...desktopSendItems]
        }
      ]
    },
    {
      name: 'common',
      label: '通用',
      description: '第三方邮箱和临时邮箱都可以调用。',
      groups: [
        {
          name: 'emails',
          label: '邮件列表与邮件详情',
          description: groupMap.get('emails')?.description || '',
          items: getItems('emails')
        },
        {
          name: 'verification-codes',
          label: '验证码',
          description: groupMap.get('verification-codes')?.description || '',
          items: getItems('verification-codes')
        },
        {
          name: 'workflow-executions',
          label: '工作流',
          description: groupMap.get('workflow-executions')?.description || '',
          items: getItems('workflow-executions')
        }
      ]
    }
  ]

  return sections
    .map((section) => ({
      ...section,
      groups: section.groups.filter((group) => group.items.length > 0)
    }))
    .filter((section) => section.groups.length > 0)
})

const errorGroups = computed<ErrorGroup[]>(() => {
  const groups = docsData.value?.errors || []
  return groups.filter((group: ErrorGroup) => Array.isArray(group.items) && group.items.length > 0)
})

const getDocAnchor = (name: string) => `doc-${name}`
const getDocSubgroupAnchor = (groupName: string, subgroupName: string) => `doc-${groupName}-${subgroupName}`
const getEndpointAnchorGroup = (endpoint: EndpointItem, fallback: string) => {
  const path = String(endpoint.path || '')
  if (path.includes('/local-api/') || path.startsWith('http://127.0.0.1:19199')) return 'desktop-local'
  if (path.startsWith('/open/v1/smtp-accounts')) return 'smtp-accounts'
  if (path.startsWith('/open/v1/external-mailboxes')) return 'external-mailboxes'
  if (path.startsWith('/open/v1/emails')) return 'emails'
  if (path.startsWith('/open/v1/verification-codes')) return 'verification-codes'
  if (path.startsWith('/open/v1/workflow-executions')) return 'workflow-executions'
  if (path.startsWith('/open/v1/mailboxes')) return 'mailboxes'
  return fallback
}
const getEndpointAnchor = (groupName: string, endpoint: EndpointItem) =>
  `doc-${groupName}-${endpoint.method.toLowerCase()}-${String(endpoint.path || '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()}`
const getDesktopLocalTitle = (endpoint: EndpointItem) => {
  const path = String(endpoint.path || '')
  if (path.includes('/local-api/v1/smtp/send') || path.includes('desktop://smtp/send')) return '本地发信'
  if (path.includes('/local-api/v1/external-mailboxes/verify') || path.includes('desktop://external-mailboxes/verify')) return '本地验号'
  if (path.includes('/local-api/v1/external-mailboxes/fetch') || path.includes('desktop://external-mailboxes/fetch')) return '本地收信'
  return '本地接口'
}
const getEndpointLabel = (endpoint: EndpointItem) => {
  if (endpoint.execution_mode === 'desktop_local') return getDesktopLocalTitle(endpoint)
  const key = `${String(endpoint.method || '').toUpperCase()} ${String(endpoint.path || '')}`
  if (endpoint.title) return endpoint.title
  return endpointLabelMap[key] ? t(endpointLabelMap[key]) : endpoint.description || `${endpoint.method} ${endpoint.path}`
}
const getRuntimeOrigin = () => (typeof window !== 'undefined' ? window.location.origin : '')
const getEndpointTargets = (endpoint: EndpointItem): EndpointTarget[] => {
  const path = String(endpoint.path || '')
  if (endpoint.execution_mode === 'desktop_local' || path.startsWith('http://127.0.0.1:19199')) {
    return [
      {
        label: '桌面端地址',
        url: path.startsWith('http') ? path : `http://127.0.0.1:19199${path}`,
        kind: 'desktop'
      }
    ]
  }

  if (path.startsWith('/open/v1')) {
    return [
      {
        label: '线上地址',
        url: `${getRuntimeOrigin()}${path}`,
        kind: 'online'
      }
    ]
  }

  return [
    {
      label: '线上地址',
      url: path,
      kind: 'online'
    }
  ]
}
const getAuthModeLabel = (mode?: string) => {
  if (mode === 'api_key') return t('openPlatform.authApiKey')
  if (mode === 'bearer_token') return t('openPlatform.authBearer')
  return mode || '-'
}

const commonHeaders = computed<CommonHeaderItem[]>(() => [
  {
    name: 'X-API-Key',
    required: true,
    type: 'string',
    description: t('openPlatform.commonApiKeyDesc')
  }
])

const sampleCurl = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `curl -X GET '${origin}/open/v1/verification-codes/latest?mailbox_type=system' \\\n  -H 'X-API-Key: sk_live_xxx'`
})

const getScopeLabel = (scope?: string) => {
  if (!scope) return '-'
  return scope
    .split('+')
    .map((item) => {
      const key = scopeLabelMap[item.trim()]
      return key ? t(key) : item.trim()
    })
    .join(' + ')
}

const shouldRenderRequestParams = (endpoint: EndpointItem) => {
  const schema = endpoint.request_schema
  return Boolean(schema && schema.properties && Object.keys(schema.properties).length)
}

const getSchemaTypeLabel = (schema: any) => {
  const type = String(schema?.type || 'string')
  if (type === 'integer') return 'integer'
  if (type === 'boolean') return 'boolean'
  if (type === 'array') return 'array'
  if (type === 'object') return 'object'
  return 'string'
}

const getEndpointParameters = (endpoint: EndpointItem) => {
  const schema = endpoint.request_schema
  const properties = schema?.properties || {}
  const requiredSet = new Set(Array.isArray(schema?.required) ? schema.required : [])
  return Object.entries(properties)
    .filter(([name]) => String(name).toLowerCase() !== 'x-api-key')
    .map(([name, item]: [string, any]) => ({
      name,
      required: requiredSet.has(name),
      type: getSchemaTypeLabel(item),
      enumText: Array.isArray(item?.enum) && item.enum.length ? item.enum.join(' / ') : '',
      description: String(item?.description || '').trim()
    }))
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

watch(
  () => locale.value,
  async (next, prev) => {
    if (!prev || next === prev) return
    await loadPageData()
  }
)
</script>
