<template>
  <div class="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-12">
    <div class="mx-auto max-w-6xl">
      <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)]">
        <div class="grid lg:grid-cols-[1.02fr_1.18fr]">
          <div class="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-8 sm:px-8 lg:min-h-[760px] lg:border-b-0 lg:border-r">
            <div>
              <div class="text-sm font-medium text-primary-700">Outlook 邮箱取件</div>
              <h1 class="mt-3 text-3xl font-semibold text-slate-900">添加到第三方邮箱</h1>
              <p class="mt-3 text-sm leading-6 text-slate-600">把取件内容贴进来，或者上传文件。识别成功后，右侧会显示本次要添加的邮箱。</p>
            </div>

            <div class="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
              <div class="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div class="text-xs font-medium text-slate-500">当前状态</div>
                  <div class="mt-2 text-lg font-semibold" :class="statusTextClass">{{ statusText }}</div>
                </div>
                <div class="rounded-xl bg-slate-50 px-3 py-2 text-right">
                  <div class="text-[11px] font-medium text-slate-500">登录状态</div>
                  <div class="mt-1 text-sm font-semibold text-slate-800">{{ userStore.isAuthenticated ? '已登录' : '未登录' }}</div>
                </div>
              </div>
              <p class="mt-4 text-sm leading-6 text-slate-500">{{ statusDescription }}</p>
            </div>

            <div class="mt-6 grid grid-cols-3 gap-3">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div class="text-xs text-slate-500">取件码</div>
                <div class="mt-2 text-2xl font-semibold text-slate-900">{{ codes.length }}</div>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div class="text-xs text-slate-500">邮箱</div>
                <div class="mt-2 text-2xl font-semibold text-slate-900">{{ displayEmails.length }}</div>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div class="text-xs text-slate-500">完成</div>
                <div class="mt-2 text-2xl font-semibold text-slate-900">{{ successEmails.length }}</div>
              </div>
            </div>

            <div class="mt-8">
              <div class="text-sm font-medium text-slate-900">使用方式</div>
              <div class="mt-4 space-y-4">
                <div class="flex gap-3">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">1</div>
                  <div>
                    <div class="text-sm font-medium text-slate-800">输入取件内容</div>
                    <div class="mt-1 text-sm leading-6 text-slate-500">支持粘贴多行内容，也支持上传 `.txt`、`.csv` 文件。</div>
                  </div>
                </div>
                <div class="flex gap-3">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">2</div>
                  <div>
                    <div class="text-sm font-medium text-slate-800">确认邮箱列表</div>
                    <div class="mt-1 text-sm leading-6 text-slate-500">系统会自动识别内容，右侧显示本次要添加的邮箱。</div>
                  </div>
                </div>
                <div class="flex gap-3">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">3</div>
                  <div>
                    <div class="text-sm font-medium text-slate-800">添加到第三方邮箱</div>
                    <div class="mt-1 text-sm leading-6 text-slate-500">登录后提交，添加完成就能回到邮箱列表继续收件。</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="px-6 py-8 sm:px-8 lg:min-h-[760px]">
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-medium text-slate-900">输入内容</div>
                  <div class="mt-1 text-xs leading-5 text-slate-500">支持粘贴多行内容，也支持上传 `.txt`、`.csv` 文件。</div>
                </div>
                <button
                  type="button"
                  class="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-primary-200 bg-white px-4 text-sm font-medium text-primary-700 transition hover:border-primary-300 hover:bg-primary-50"
                  @click="openFilePicker"
                >
                  上传文件
                </button>
              </div>
              <input
                ref="fileInputRef"
                type="file"
                accept=".txt,.csv"
                class="hidden"
                @change="handleFileChange"
              />

              <textarea
                v-model="batchText"
                class="mt-4 h-44 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
                placeholder="可粘贴多行：邮箱----密码----取件链接"
                @input="preview"
              />
            </div>

            <div class="mt-5 rounded-2xl border border-slate-200 overflow-hidden">
              <div class="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <div class="text-sm font-medium text-slate-900">要提取的邮箱</div>
                  <div class="mt-1 text-xs text-slate-500">邮箱账号在左侧，处理结果放在右侧。</div>
                </div>
                <div class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                  {{ submitTargetCount }} 个
                </div>
              </div>

              <div v-if="previewLoading" class="px-4 py-8 text-center text-sm text-slate-500">正在识别邮箱...</div>
              <div v-else-if="resultRows.length" class="max-h-80 overflow-y-auto bg-white">
                <div
                  v-for="item in resultRows"
                  :key="item.key"
                  class="grid grid-cols-[minmax(0,1fr)_220px] items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
                >
                  <div class="min-w-0">
                    <div class="truncate font-mono text-sm text-slate-700" :title="item.primary">{{ item.primary }}</div>
                    <div v-if="item.secondary" class="mt-1 truncate text-xs text-slate-400" :title="item.secondary">{{ item.secondary }}</div>
                  </div>
                  <div
                    class="justify-self-end max-w-full rounded-2xl px-3 py-2 text-right text-xs font-medium leading-5"
                    :class="item.statusType === 'success'
                      ? 'bg-primary-50 text-primary-700'
                      : item.statusType === 'error'
                        ? 'bg-red-50 text-red-600'
                        : item.statusType === 'pending'
                          ? 'bg-warning-50 text-warning-700'
                        : 'bg-slate-100 text-slate-400'"
                  >
                    {{ item.statusLabel }}
                  </div>
                </div>
              </div>
              <div v-else class="px-4 py-8 text-center text-sm text-slate-400">先粘贴内容或上传文件</div>
            </div>

            <div
              v-if="successEmails.length"
              class="mt-4 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700"
            >
              已成功添加 {{ successEmails.length }} 个邮箱，请回到第三方邮箱中查看。
            </div>

            <div
              v-if="!userStore.isAuthenticated"
              class="mt-4 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700"
            >
              先登录，再添加到第三方邮箱。
            </div>

            <div class="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                class="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary-600 px-4 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                :disabled="isSubmitDisabled"
                @click="redeem"
              >
                {{ submitButtonText }}
              </button>

              <button
                v-if="!userStore.isAuthenticated"
                class="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-primary-200 bg-white px-4 text-sm font-medium text-primary-700 transition hover:bg-primary-50"
                @click="goLogin"
              >
                去登录
              </button>

              <button
                v-else-if="successEmails.length"
                class="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-primary-200 bg-white px-4 text-sm font-medium text-primary-700 transition hover:bg-primary-50"
                @click="router.push('/')"
              >
                回到首页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { workflowApi } from '@/api/workflow'
import { useUserStore } from '@/stores/user'
import { showMessage } from '@/utils/message'
import { runPromisePool } from '@/utils/promisePool'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const previewLoading = ref(false)
const previewError = ref('')
const submitError = ref('')
const emails = ref<string[]>([])
const detectedItems = ref<Array<{
  code: string
  email: string
  source: 'workflow' | 'resource' | 'unknown'
  status: null | { type: 'success' | 'error' | 'idle' | 'pending'; label: string }
}>>([])
const previewItems = ref<Array<{
  code: string
  email: string
  source: 'workflow' | 'resource' | 'unknown'
  status: null | { type: 'success' | 'error' | 'idle' | 'pending'; label: string }
}>>([])
const successEmails = ref<string[]>([])
const batchText = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const authLoading = ref(false)

const code = computed(() => String(route.query.code || '').trim())
const codePattern = /OUT-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}/gi
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const normalizeRedeemText = (value: string) => {
  return String(value || '')
    .replace(/(OUT-[A-Z0-9]{5}-[A-Z0-9]{5}-)\s*\r?\n\s*([A-Z0-9]{5})/gi, '$1$2')
    .replace(/\r/g, '')
}
const normalizedBatchText = computed(() => normalizeRedeemText(batchText.value))
const codes = computed(() => {
  const source = [code.value, normalizedBatchText.value].filter(Boolean).join('\n')
  return Array.from(new Set((source.match(codePattern) || []).map(item => item.toUpperCase())))
})
const inputEmails = computed(() => {
  const matches = normalizedBatchText.value
    .split(/\r?\n/)
    .flatMap(line => line.match(emailPattern) || [])
  return Array.from(new Set(matches.map(item => item.trim().toLowerCase())))
})
const displayEmails = computed(() => {
  if (previewItems.value.length) {
    return previewItems.value.map(item => ({
      key: `${item.code}-${item.email}`,
      email: item.email,
      code: item.code,
      source: item.source,
      status: item.status
    }))
  }
  if (detectedItems.value.length) {
    return detectedItems.value.map(item => ({
      key: `${item.code || 'detected'}-${item.email}`,
      email: item.email,
      code: item.code,
      source: item.source,
      status: item.status
    }))
  }
  return inputEmails.value.map(email => ({
    key: `input-${email}`,
    email,
    code: '',
    source: 'unknown' as const,
    status: null
  }))
})
const previewFailedItems = computed(() => {
  const detectedByCode = new Map(
    detectedItems.value.map(item => [item.code, item.email] as const)
  )
  return String(previewError.value || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const matched = line.match(/^(OUT-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5})[：:]\s*(.+)$/i)
      const codeValue = matched?.[1]?.toUpperCase() || ''
      const message = matched?.[2]?.trim() || line
      return {
        key: `failed-${codeValue || index}`,
        code: codeValue,
        email: codeValue ? (detectedByCode.get(codeValue) || '') : '',
        message
      }
    })
})
const resultRows = computed(() => {
  const statusByCode = new Map(
    displayEmails.value
      .filter(item => item.code)
      .map(item => [item.code, item.status || null] as const)
  )
  const rows = detectedItems.value.map(item => {
    const status = statusByCode.get(item.code) || item.status || null
    return {
      key: item.key || `${item.code}-${item.email}`,
      primary: item.email || item.code,
      secondary: item.code || '',
      statusType: status?.type || 'idle',
      statusLabel: status?.label || '待处理'
    }
  })
  const existingKeys = new Set(rows.map(item => item.key))
  previewFailedItems.value.forEach(item => {
    const rowKey = `${item.code}-${item.email || item.code || item.key}`
    const matchedRow = rows.find(row => row.secondary === item.code && item.email && row.primary === item.email)
    if (matchedRow) {
      matchedRow.statusType = 'error'
      matchedRow.statusLabel = item.message
      return
    }
    if (item.email) {
      if (existingKeys.has(rowKey)) return
      rows.push({
        key: rowKey,
        primary: item.email,
        secondary: item.code || '',
        statusType: 'error',
        statusLabel: item.message
      })
      existingKeys.add(rowKey)
      return
    }
    if (item.code && Array.from(statusByCode.keys()).includes(item.code)) return
    rows.push({
      key: item.key,
      primary: item.code || '未识别邮箱',
      secondary: item.code ? '' : '取件码解析失败',
      statusType: 'error',
      statusLabel: item.message
    })
  })
  return rows
})
const submitTargetCount = computed(() => {
  if (resultRows.value.length) return resultRows.value.length
  if (detectedItems.value.length) return detectedItems.value.length
  if (codes.value.length) return codes.value.length
  return 0
})
const resolvedEmails = computed(() => {
  if (emails.value.length) return emails.value
  return displayEmails.value.map(item => item.email)
})
const isSubmitDisabled = computed(
  () => loading.value || previewLoading.value || authLoading.value || !codes.value.length || !submitTargetCount.value || Boolean(successEmails.value.length)
)
const submitButtonText = computed(() => {
  if (authLoading.value) return '检查登录状态中...'
  if (loading.value) return '添加中...'
  if (!userStore.isAuthenticated) return '先登录再添加'
  return `添加到第三方邮箱${submitTargetCount.value > 1 ? `（${submitTargetCount.value}个）` : ''}`
})
const statusText = computed(() => {
  if (successEmails.value.length) return '已添加完成'
  if (loading.value) return '正在添加'
  if (previewLoading.value) return '正在识别'
  if (displayEmails.value.length) return '可以提交'
  if (!userStore.isAuthenticated) return '等待登录'
  return '等待输入'
})
const statusTextClass = computed(() => {
  if (successEmails.value.length) return 'text-green-600'
  if (loading.value || previewLoading.value) return 'text-primary-600'
  if (!userStore.isAuthenticated) return 'text-amber-600'
  return 'text-slate-900'
})
const statusDescription = computed(() => {
  if (successEmails.value.length) return '邮箱已经添加完成，可以回到第三方邮箱列表继续收件。'
  if (loading.value) return '系统正在把识别到的邮箱添加到你的第三方邮箱。'
  if (previewLoading.value) return '系统正在解析内容并识别本次要提取的邮箱。'
  if (!userStore.isAuthenticated) return '当前还没登录，识别完成后登录即可提交。'
  if (displayEmails.value.length) return '邮箱已经识别出来了，现在可以直接提交。'
  return '先把取件内容贴进来，或者上传文件。'
})

const goLogin = () => {
  router.push({
    path: '/login',
    query: { redirect: route.fullPath }
  })
}

const openFilePicker = () => {
  fileInputRef.value?.click()
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    successEmails.value = []
    submitError.value = ''
    batchText.value = await file.text()
    await preview()
  } finally {
    input.value = ''
  }
}

const formatStatusLabel = (label: string, email = '') => {
  const normalizedLabel = String(label || '').trim()
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedLabel) return '待处理'
  const lowerLabel = normalizedLabel.toLowerCase()
  if (
    normalizedEmail &&
    lowerLabel === `${normalizedEmail} 已经在你的第三方邮箱中`.toLowerCase()
  ) {
    return '已存在'
  }
  return normalizedLabel
}

const setPreviewItemStatus = (
  itemCode: string,
  status: { type: 'success' | 'error' | 'idle' | 'pending'; label: string }
) => {
  const nextItems = previewItems.value.map(item =>
    item.code === itemCode
      ? { ...item, status: { ...status, label: formatStatusLabel(status.label, item.email) } }
      : item
  )
  previewItems.value = nextItems
  detectedItems.value = detectedItems.value.map(item =>
    item.code === itemCode
      ? { ...item, status: { ...status, label: formatStatusLabel(status.label, item.email) } }
      : item
  )
}

const upsertPreviewItems = (
  itemCode: string,
  itemEmails: string[],
  status: null | { type: 'success' | 'error' | 'idle' | 'pending'; label: string } = null
) => {
  const nextMap = new Map(
    previewItems.value.map(item => [`${item.code}-${item.email}`, item] as const)
  )
  itemEmails
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
    .forEach(email => {
      const key = `${itemCode}-${email}`
      const current = nextMap.get(key)
      nextMap.set(key, {
        code: itemCode,
        email,
        source: current?.source || 'unknown',
        status: status ? { ...status, label: formatStatusLabel(status.label, email) } : current?.status || null
      })
    })
  previewItems.value = Array.from(nextMap.values())
  emails.value = previewItems.value.map(item => item.email)
}

const shouldFallbackToNextRedeemApi = (message: string) => {
  const normalized = String(message || '').trim()
  return !normalized || normalized === 'Not Found'
}
const REDEEM_CONCURRENCY = 12

const rebuildDetectedItems = () => {
  const lines = normalizedBatchText.value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
  const items: Array<{
    code: string
    email: string
    source: 'workflow' | 'resource' | 'unknown'
    status: null
  }> = []
  let pendingEmail = ''
  let pendingCode = ''
  const routeCode = String(code.value || '').toUpperCase()
  if (/^OUT-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(routeCode)) {
    pendingCode = routeCode
  }

  for (const line of lines) {
    const emailMatches = (line.match(emailPattern) || []).map(item => item.trim().toLowerCase())
    const codeMatches = (line.match(codePattern) || []).map(item => item.toUpperCase())
    const firstEmail = emailMatches[0] || ''
    const firstCode = codeMatches[0] || ''

    if (firstEmail && firstCode) {
      items.push({ code: firstCode, email: firstEmail, source: 'unknown', status: null })
      pendingEmail = ''
      pendingCode = ''
      continue
    }
    if (firstEmail) {
      pendingEmail = firstEmail
      if (pendingCode) {
        items.push({ code: pendingCode, email: pendingEmail, source: 'unknown', status: null })
        pendingEmail = ''
        pendingCode = ''
      }
      continue
    }
    if (firstCode) {
      pendingCode = firstCode
      if (pendingEmail) {
        items.push({ code: pendingCode, email: pendingEmail, source: 'unknown', status: null })
        pendingEmail = ''
        pendingCode = ''
      }
    }
  }

  const deduped = new Map<string, { code: string; email: string; source: 'workflow' | 'resource' | 'unknown'; status: null }>()
  items.forEach(item => {
    if (item.code && item.email) {
      deduped.set(`${item.code}-${item.email}`, item)
    }
  })
  detectedItems.value = Array.from(deduped.values())
}

const preview = async () => {
  successEmails.value = []
  submitError.value = ''
  rebuildDetectedItems()
  if (!codes.value.length) {
    emails.value = []
    detectedItems.value = []
    previewItems.value = []
    previewError.value = ''
    return
  }
  previewLoading.value = true
  previewError.value = ''
  emails.value = []
  previewItems.value = []
  try {
    const itemMap = new Map<string, { code: string; email: string; source: 'workflow' | 'resource' | 'unknown'; status: null }>()
    const errors: string[] = []
    await runPromisePool(codes.value, REDEEM_CONCURRENCY, async (itemCode) => {
      let lastMessage = '取件码无效'
      for (const [request, source] of [
        [workflowApi.previewOutlookCode, 'workflow'],
        [workflowApi.previewOutlookResourceCode, 'resource']
      ] as const) {
        try {
          const res = await request(itemCode, { suppressErrorMessage: true })
          if (res.code === 0) {
            const itemEmails = Array.isArray(res.data?.emails) ? res.data.emails : []
            itemEmails.forEach((email: string) => {
              const normalizedEmail = String(email || '').trim().toLowerCase()
              if (!normalizedEmail) return
              itemMap.set(`${itemCode}-${normalizedEmail}`, {
                code: itemCode,
                email: normalizedEmail,
                source,
                status: null
              })
            })
            lastMessage = ''
            break
          }
          lastMessage = res.message || lastMessage
          if (!shouldFallbackToNextRedeemApi(lastMessage)) {
            break
          }
        } catch (error: any) {
          const message = error?.response?.data?.message || error?.message || ''
          if (message && message !== 'Not Found') {
            lastMessage = message
            break
          }
        }
      }
      if (lastMessage) {
        errors.push(`${itemCode}：${lastMessage}`)
      }
    })
    const items = Array.from(itemMap.values())
    previewItems.value = items
    emails.value = items.map(item => item.email)
    previewError.value = errors.join('\n')
  } catch (error: any) {
    previewError.value = error?.response?.data?.message || error?.message || '取件码无效'
  } finally {
    previewLoading.value = false
  }
}

const ensureAuth = async () => {
  if (userStore.isAuthenticated) return
  const hasToken = localStorage.getItem('token')
  const savedAuth = localStorage.getItem('isAuthenticated')
  if (!hasToken || savedAuth !== 'true') return
  authLoading.value = true
  try {
    await userStore.checkAuth()
  } finally {
    authLoading.value = false
  }
}

const redeem = async () => {
  if (!codes.value.length || loading.value) return
  if (!userStore.isAuthenticated) {
    showMessage('请先登录后再添加到第三方邮箱', 'error')
    goLogin()
    return
  }

  loading.value = true
  submitError.value = ''
  if (!previewItems.value.length) {
    previewItems.value = detectedItems.value.map(item => ({ ...item }))
  }
  previewItems.value = previewItems.value.map(item => ({
    ...item,
    status: { type: 'pending', label: '处理中' }
  }))
  try {
    const added: string[] = []
    const codeSourceMap = new Map<string, 'workflow' | 'resource' | 'unknown'>()
    previewItems.value.forEach(item => {
      if (item.code) {
        codeSourceMap.set(item.code, item.source || 'unknown')
      }
    })
    const workflowCodes = codes.value.filter(itemCode => (codeSourceMap.get(itemCode) || 'unknown') === 'workflow')
    const resourceCodes = codes.value.filter(itemCode => (codeSourceMap.get(itemCode) || 'unknown') === 'resource')
    const unknownCodes = codes.value.filter(itemCode => !codeSourceMap.get(itemCode) || codeSourceMap.get(itemCode) === 'unknown')

    const applyBatchResult = (items: any[] = []) => {
      const fallbackCodes: string[] = []
      items.forEach((item: any) => {
        const itemCode = String(item?.code || '').trim().toUpperCase()
        if (!itemCode) return
        const itemMessage = String(item?.message || '').trim()
        const itemEmails = Array.isArray(item?.emails) ? item.emails : []
        if (item?.success) {
          added.push(...itemEmails)
          if (itemEmails.length) {
            upsertPreviewItems(itemCode, itemEmails, { type: 'success', label: '已兑换' })
          }
          setPreviewItemStatus(itemCode, { type: 'success', label: '已兑换' })
          return
        }
        if (shouldFallbackToNextRedeemApi(itemMessage)) {
          fallbackCodes.push(itemCode)
          return
        }
        setPreviewItemStatus(itemCode, { type: 'error', label: itemMessage || `${itemCode} 取件失败` })
      })
      return fallbackCodes
    }

    if (workflowCodes.length) {
      const workflowBatchRes = await workflowApi.redeemOutlookCodesBatch(workflowCodes, { suppressErrorMessage: true })
      if (workflowBatchRes.code === 0) {
        applyBatchResult(workflowBatchRes.data?.items)
      } else {
        workflowCodes.forEach(itemCode => {
          setPreviewItemStatus(itemCode, {
            type: 'error',
            label: workflowBatchRes.message || `${itemCode} 取件失败`
          })
        })
      }
    }

    if (resourceCodes.length) {
      const resourceBatchRes = await workflowApi.redeemOutlookResourceCodesBatch(resourceCodes, { suppressErrorMessage: true })
      if (resourceBatchRes.code === 0) {
        applyBatchResult(resourceBatchRes.data?.items)
      } else {
        resourceCodes.forEach(itemCode => {
          setPreviewItemStatus(itemCode, {
            type: 'error',
            label: resourceBatchRes.message || `${itemCode} 取件失败`
          })
        })
      }
    }

    if (unknownCodes.length) {
      const workflowBatchRes = await workflowApi.redeemOutlookCodesBatch(unknownCodes, { suppressErrorMessage: true })
      const fallbackCodes = workflowBatchRes.code === 0
        ? (applyBatchResult(workflowBatchRes.data?.items) || [])
        : unknownCodes

      if (fallbackCodes.length) {
        const resourceBatchRes = await workflowApi.redeemOutlookResourceCodesBatch(fallbackCodes, { suppressErrorMessage: true })
        if (resourceBatchRes.code === 0) {
          applyBatchResult(resourceBatchRes.data?.items)
        } else {
          fallbackCodes.forEach(itemCode => {
            setPreviewItemStatus(itemCode, {
              type: 'error',
              label: resourceBatchRes.message || `${itemCode} 取件失败`
            })
          })
        }
      }
    }

    previewItems.value = [...previewItems.value]
    if (!added.length) {
      return
    }
    successEmails.value = added
  } catch (error: any) {
    showMessage(error?.message || '取件失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureAuth()
  preview()
})
</script>
