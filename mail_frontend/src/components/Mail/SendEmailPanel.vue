<template>
  <div class="h-full overflow-y-auto pr-1">
    <div class="mx-auto max-w-4xl pb-1">
      <div
        v-if="!isDesktop"
        class="mb-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-700"
      >
        <svg class="h-5 w-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        <span class="text-sm">批量发送邮件功能仅支持桌面客户端，请下载并使用桌面端。</span>
      </div>

      <div class="mb-3 flex flex-col gap-2 rounded-xl bg-slate-50 px-3 py-2.5 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-sm font-medium text-slate-800">批量发送提示</p>
          <p class="mt-0.5 text-sm leading-5 text-slate-600">
            仅使用左侧选中且已配置 SMTP 的邮箱发件；单个邮箱固定发送，多个邮箱按选择顺序轮流发送。
          </p>
          <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span class="text-sm text-slate-500">发件邮箱</span>
            <span
              v-for="account in selectedExternalAccounts"
              :key="account.id"
              class="rounded-full border px-2 py-0.5 text-sm leading-5"
              :class="activeSmtpEmailMap.has(account.email) ? 'border-primary-200 bg-white text-primary-700' : 'border-gray-200 bg-gray-100 text-gray-400'"
            >
              {{ account.email }}
            </span>
            <span v-if="selectedExternalAccounts.length === 0" class="text-sm text-gray-400">
              暂未选择
            </span>
          </div>
        </div>
        <button
          @click="openSentModal"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          已发送列表
        </button>
      </div>

      <div
        v-if="selectedAccountIds.length === 0"
        class="flex min-h-[320px] flex-col items-center justify-center text-center text-gray-400"
      >
        <svg class="mb-4 h-12 w-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p class="text-sm">请从左侧邮箱列表选择发件账号以开始写信</p>
      </div>

      <div v-else class="space-y-4">
        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="block text-sm font-medium text-gray-700">
              收件人 <span class="text-red-500">*</span>
            </label>
            <div class="flex items-center gap-2">
              <button
                @click="downloadTemplate"
                class="flex items-center gap-1 rounded px-2.5 py-1 text-sm text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary-600"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                下载模板
              </button>
              <button
                @click="triggerImport"
                class="flex items-center gap-1 rounded px-2.5 py-1 text-sm text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                导入Excel
              </button>
              <input
                ref="fileInput"
                type="file"
                accept=".xlsx,.xls"
                class="hidden"
                @change="handleFileImport"
              />
            </div>
          </div>
          <div
            class="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 px-2 py-1.5 transition-colors focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500"
            @click="recipientInputRef?.focus()"
          >
            <span
              v-for="(email, index) in recipients"
              :key="index"
              class="inline-flex items-center gap-1 rounded-full bg-primary-50 border border-primary-200 px-2.5 py-0.5 text-sm text-primary-700"
            >
              {{ email }}
              <button
                type="button"
                class="ml-0.5 text-primary-400 hover:text-red-500 transition-colors"
                @click.stop="removeRecipient(index)"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
            <input
              ref="recipientInputRef"
              v-model="recipientInput"
              type="text"
              :placeholder="recipients.length === 0 ? '输入邮箱后按回车添加' : ''"
              class="min-w-[120px] flex-1 border-none bg-transparent p-0 text-sm outline-none focus:ring-0"
              @keydown="handleRecipientKeydown"
              @blur="commitRecipientInput"
              @paste="handleRecipientPaste"
            />
          </div>
          <p v-if="importCount > 0" class="mt-1 text-sm text-green-600">
            已导入 {{ importCount }} 个收件人
          </p>
        </div>

        <div v-if="showCcBcc" class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">抄送</label>
            <input
              v-model="form.cc"
              type="text"
              placeholder="CC"
              class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">密送</label>
            <input
              v-model="form.bcc"
              type="text"
              placeholder="BCC"
              class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <button
          v-else
          @click="showCcBcc = true"
          class="text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          + 添加抄送/密送
        </button>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            主题 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.subject"
            type="text"
            placeholder="请输入邮件主题"
            class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="block text-sm font-medium text-gray-700">附件</label>
            <div class="flex items-center gap-2">
              <button
                @click="triggerAttachmentSelect"
                class="flex items-center gap-1 rounded px-2.5 py-1 text-sm text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828a4 4 0 10-5.656-5.656L4.929 11.586a6 6 0 108.485 8.485L20 13" />
                </svg>
                添加附件
              </button>
              <input
                ref="attachmentInput"
                type="file"
                multiple
                class="hidden"
                @change="handleAttachmentSelect"
              />
            </div>
          </div>
          <div v-if="attachments.length > 0" class="flex flex-wrap gap-2">
            <div
              v-for="(attachment, index) in attachments"
              :key="`${attachment.name}-${attachment.size}-${index}`"
              class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-600"
            >
              <span class="max-w-[220px] truncate">{{ attachment.name }}</span>
              <span class="text-gray-400">{{ formatFileSize(attachment.size) }}</span>
              <button
                @click="removeAttachment(index)"
                class="text-gray-400 transition-colors hover:text-red-500"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <p v-else class="text-sm text-gray-400">未添加附件</p>
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between gap-3">
            <label class="block text-sm font-medium text-gray-700">
              正文 <span class="text-red-500">*</span>
            </label>
            <button
              @click="polishContent"
              :disabled="polishing || !form.content.trim()"
              :class="[
                'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm transition-colors',
                form.content.trim() && !polishing
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              ]"
            >
              {{ polishing ? 'AI润色中...' : 'AI润色' }}
            </button>
          </div>
          <textarea
            v-model="form.content"
            placeholder="请输入邮件正文..."
            class="min-h-[140px] w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm leading-6 resize-y focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          ></textarea>
        </div>

        <div class="flex flex-col gap-2.5 border-t border-gray-100 pt-3 md:flex-row md:items-center md:justify-between">
          <div class="text-sm text-gray-500">
            当前共 {{ recipientCount }} 位收件人，发件账号可用 {{ activeSmtpAccounts.length }} 个
          </div>
          <button
            @click="sendEmail"
            :disabled="sending || !canSend"
            :class="[
              'rounded-lg px-6 py-2 text-sm font-medium transition-colors',
              canSend && !sending
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'cursor-not-allowed bg-gray-300 text-gray-500'
            ]"
          >
            {{ sending ? '发送中...' : '批量发送邮件' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="showSentModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      @click.self="showSentModal = false"
    >
      <div class="flex max-h-[82vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">已发送列表</h3>
            <p class="mt-1 text-sm text-gray-500">最近 {{ sentEmailTotal || sentEmails.length }} 条发送记录</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="showSentModal = false"
              class="rounded-lg px-2 py-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div v-if="sentEmailsLoading && sentEmails.length === 0" class="py-20 text-center text-sm text-gray-400">
            正在加载发送记录...
          </div>
          <div v-else-if="sentEmails.length === 0" class="py-20 text-center text-sm text-gray-400">
            暂无已发送记录
          </div>
          <div v-else class="space-y-3">
            <article
              v-for="record in sentEmails"
              :key="record.id"
              class="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4"
            >
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-gray-800">
                    {{ record.subject || '（无主题）' }}
                  </p>
                  <p class="mt-1 text-sm leading-5 text-gray-500">
                    {{ record.from_email }} → {{ record.to_email }}
                  </p>
                </div>
                <span class="shrink-0 text-sm text-gray-400">
                  {{ formatTimestamp(record.created_at, 'datetime') }}
                </span>
              </div>
              <p
                v-if="record.content_text"
                class="mt-3 whitespace-pre-wrap break-all text-sm leading-6 text-gray-600"
              >
                {{ record.content_text }}
              </p>
            </article>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import * as XLSX from 'xlsx'
import { batchLoginAPI } from '@/api/batchLogin'
import smtpAccountsAPI from '@/api/smtpAccounts'
import { showMessage } from '@/utils/message'
import { isTauri } from '@/services/api'
import api from '@/services/api'
import { formatTimestamp } from '@/utils/timeUtils'

async function getTauriInvoke() {
  if (!isTauri()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke
  } catch {
    return null
  }
}

interface SmtpAccount {
  id: number
  email: string
  password?: string
  smtp_host?: string
  smtp_port?: number
  status: string
}

interface ExternalAccount {
  id: number
  email: string
  password?: string
  smtp_verified?: boolean
}

interface ActiveSmtpAccount extends ExternalAccount {
  smtp_host?: string
  smtp_port?: number
  smtp_password?: string
  smtp_id: number
}

interface EmailAttachment {
  name: string
  size: number
  contentType: string
  dataBase64: string
}

interface SentEmailRecord {
  id: number | string
  from_email: string
  to_email: string
  subject: string
  content_text?: string
  created_at: number
}

const props = defineProps<{
  selectedMailboxIds?: number[]
}>()

const loading = ref(false)
const smtpAccounts = ref<SmtpAccount[]>([])
const externalAccounts = ref<ExternalAccount[]>([])
const sending = ref(false)
const showCcBcc = ref(false)
const polishing = ref(false)
const importCount = ref(0)
const fileInput = ref<HTMLInputElement | null>(null)
const attachmentInput = ref<HTMLInputElement | null>(null)
const sentEmailsLoading = ref(false)
const sentEmails = ref<SentEmailRecord[]>([])
const sentEmailTotal = ref(0)
const sentEmailTableMissing = ref(false)
const showSentModal = ref(false)
const attachments = ref<EmailAttachment[]>([])
const recipients = ref<string[]>([])
const recipientInput = ref('')
const recipientInputRef = ref<HTMLInputElement | null>(null)

const selectedAccountIds = computed(() => props.selectedMailboxIds || [])
const isDesktop = computed(() => isTauri())

const activeSmtpEmailMap = computed(() => {
  return new Map(
    smtpAccounts.value
      .filter((account) => account.status === 'active')
      .map((account) => [account.email, account])
  )
})

const externalAccountMap = computed(() => {
  return new Map(externalAccounts.value.map((account) => [account.id, account]))
})

const selectedExternalAccounts = computed(() => {
  return selectedAccountIds.value
    .map((id) => externalAccountMap.value.get(id))
    .filter(Boolean) as ExternalAccount[]
})

// 发件能力以独立 smtp_accounts 表为准：
// 只要该邮箱在 smtp_accounts 里是 active，就视为“可发件”。
const activeSmtpAccounts = computed<ActiveSmtpAccount[]>(() => {
  return selectedExternalAccounts.value
    .filter((account) => activeSmtpEmailMap.value.has(account.email))
    .map((account) => {
      const smtp = activeSmtpEmailMap.value.get(account.email)!
      return {
        ...account,
        smtp_host: smtp.smtp_host,
        smtp_port: smtp.smtp_port,
        smtp_password: smtp.password,
        smtp_id: smtp.id,
      }
    })
})

const form = ref({
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  content: '',
})

const recipientCount = computed(() => recipients.value.length)

const canSend = computed(() => {
  return isDesktop.value &&
    activeSmtpAccounts.value.length > 0 &&
    recipients.value.length > 0 &&
    form.value.subject.trim() &&
    form.value.content.trim()
})

const addRecipients = (text: string) => {
  const emails = text
    .split(/[,;，；\s\n]+/)
    .map((e) => e.trim())
    .filter((e) => e.includes('@') && !recipients.value.includes(e))
  if (emails.length > 0) {
    recipients.value.push(...emails)
  }
  return emails.length
}

const commitRecipientInput = () => {
  const text = recipientInput.value.trim()
  if (text) {
    addRecipients(text)
    recipientInput.value = ''
  }
}

const handleRecipientKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === 'Tab' || event.key === ',' || event.key === '，') {
    event.preventDefault()
    commitRecipientInput()
  }
  if (event.key === 'Backspace' && !recipientInput.value && recipients.value.length > 0) {
    recipients.value.pop()
  }
}

const handleRecipientPaste = (event: ClipboardEvent) => {
  const text = event.clipboardData?.getData('text')
  if (text && text.includes('@')) {
    event.preventDefault()
    addRecipients(text)
  }
}

const removeRecipient = (index: number) => {
  recipients.value.splice(index, 1)
}

const loadData = async () => {
  loading.value = true
  try {
    const [extRes, smtpRes] = await Promise.all([
      batchLoginAPI.getAccounts(1, 100),
      smtpAccountsAPI.getAccounts(),
    ])

    if (extRes.code === 0) {
      externalAccounts.value = extRes.data.accounts || []
    }

    if (smtpRes.code === 0) {
      smtpAccounts.value = smtpRes.data.accounts || []
    }
  } catch (error) {
    console.error('加载账号失败', error)
  } finally {
    loading.value = false
  }
}

const loadSentEmails = async () => {
  sentEmailsLoading.value = true
  try {
    const response = await smtpAccountsAPI.getSentEmails({ page: 1, page_size: 20 })
    if (response.code === 0) {
      sentEmails.value = response.data?.records || []
      sentEmailTotal.value = response.data?.pagination?.total || 0
      sentEmailTableMissing.value = Boolean(response.data?.table_missing)
    } else {
      sentEmails.value = []
      sentEmailTotal.value = 0
      sentEmailTableMissing.value = false
      showMessage(response.message || '加载已发送记录失败', 'error')
    }
  } catch (error: any) {
    console.error('加载已发送记录失败', error)
    const msg = error.response?.data?.message || error.message || '加载已发送记录失败'
    showMessage(msg, 'error')
    sentEmails.value = []
    sentEmailTotal.value = 0
    sentEmailTableMissing.value = false
  } finally {
    sentEmailsLoading.value = false
  }
}

const syncLocalSentEmails = (records: Array<{
  from_email: string
  to_email: string
  subject: string
  content: string
}>) => {
  const createdAt = Date.now()
  const nextRecords = records
    .slice()
    .reverse()
    .map((record, index) => ({
      id: `local-${createdAt}-${index}`,
      from_email: record.from_email,
      to_email: record.to_email,
      subject: record.subject,
      content_text: record.content,
      created_at: createdAt + index,
    }))

  sentEmails.value = [...nextRecords, ...sentEmails.value].slice(0, 20)
  sentEmailTotal.value += nextRecords.length
}

const openSentModal = () => {
  showSentModal.value = true
  loadSentEmails()
}

const triggerImport = () => {
  fileInput.value?.click()
}

const triggerAttachmentSelect = () => {
  attachmentInput.value?.click()
}

const readFileAsBase64 = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error || new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

const handleAttachmentSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length === 0) return

  try {
    const nextAttachments = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        dataBase64: await readFileAsBase64(file),
      }))
    )

    attachments.value = [...attachments.value, ...nextAttachments]
  } catch (error) {
    console.error('读取附件失败', error)
    showMessage('读取附件失败，请重试', 'error')
  } finally {
    target.value = ''
  }
}

const removeAttachment = (index: number) => {
  attachments.value.splice(index, 1)
}

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}

const handleFileImport = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

      const emails: string[] = []
      for (const row of rows) {
        if (!row || row.length === 0) continue
        const cell = String(row[0] || '').trim()
        if (!cell || cell === '邮箱' || cell === 'email' || cell === 'Email') continue
        if (cell.includes('@')) {
          emails.push(cell)
        }
      }

      if (emails.length === 0) {
        showMessage('未在Excel中找到有效邮箱地址', 'warning')
        return
      }

      const added = addRecipients(emails.join(','))
      importCount.value = added || emails.length
      showMessage(`成功导入 ${emails.length} 个收件人`, 'success')
    } catch (error) {
      showMessage('Excel文件解析失败，请检查文件格式', 'error')
    }
  }

  reader.readAsArrayBuffer(file)
  target.value = ''
}

const downloadTemplate = () => {
  const wsData = [['邮箱'], ['example1@mail.com'], ['example2@mail.com']]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = [{ wch: 30 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '收件人')
  XLSX.writeFile(wb, '收件人导入模板.xlsx')
}

const sendEmail = async () => {
  if (!canSend.value) return

  const accounts = activeSmtpAccounts.value
  if (accounts.length === 0) {
    showMessage('没有可用的发件账号', 'error')
    return
  }

  sending.value = true
  try {
    const recipientList = [...recipients.value]

    const tauriInvoke = await getTauriInvoke()
    if (!tauriInvoke) {
      showMessage('批量发送邮件仅支持桌面端', 'error')
      sending.value = false
      return
    }

    let successCount = 0
    let failCount = 0
    let saveRecordFailed = false
    let sentRecordTableMissing = false
    const sentRecords = []

    for (let i = 0; i < recipientList.length; i++) {
      const account = accounts[i % accounts.length]
      try {
        await tauriInvoke('send_smtp_email', {
          fromEmail: account.email,
          password: account.smtp_password || account.password,
          smtpHost: account.smtp_host || '',
          smtpPort: account.smtp_port || 465,
          toEmail: recipientList[i],
          subject: form.value.subject,
          content: form.value.content,
          attachments: attachments.value.map((attachment) => ({
            name: attachment.name,
            size: attachment.size,
            contentType: attachment.contentType,
            dataBase64: attachment.dataBase64,
          })),
        })

        successCount++
        sentRecords.push({
          smtp_account_id: account.smtp_id,
          external_mailbox_id: account.id,
          from_email: account.email,
          to_email: recipientList[i],
          subject: form.value.subject,
          content: form.value.content,
        })
      } catch (error: any) {
        failCount++
        console.error(`发送到 ${recipientList[i]} 失败:`, error)
      }
    }

    if (sentRecords.length > 0) {
      try {
        const response = await smtpAccountsAPI.saveSentEmails({ records: sentRecords })
        if (response.code !== 0) {
          saveRecordFailed = true
        } else {
          sentEmailTableMissing.value = false
          syncLocalSentEmails(sentRecords)
        }
      } catch (error) {
        console.error('保存已发送记录失败', error)
        saveRecordFailed = true
      }
    }

    if (failCount === 0) {
      showMessage(`发送成功，共 ${successCount} 封`, 'success')
      form.value = { to: '', cc: '', bcc: '', subject: '', content: '' }
      recipients.value = []
      recipientInput.value = ''
      showCcBcc.value = false
      importCount.value = 0
      attachments.value = []
    } else {
      showMessage(`发送完成：成功 ${successCount} 封，失败 ${failCount} 封`, 'warning')
    }

    if (saveRecordFailed) {
      showMessage('邮件已发送，但发送列表同步失败', 'warning')
    }
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || error.toString()
    showMessage(`发送失败: ${message}`, 'error')
  } finally {
    sending.value = false
  }
}

const polishContent = async () => {
  if (!form.value.content.trim() || polishing.value) return

  polishing.value = true
  try {
    const response: any = await api.post('/ai/polish-email', {
      content: form.value.content,
      subject: form.value.subject || null,
    })

    if (response.code === 0 && response.data?.content) {
      form.value.content = response.data.content
      if (response.data.subject) {
        form.value.subject = response.data.subject
      }
      showMessage('AI 润色完成', 'success')
    } else {
      showMessage(response.message || 'AI 润色失败', 'error')
    }
  } catch (error) {
    showMessage('AI 润色失败，请稍后重试', 'error')
  } finally {
    polishing.value = false
  }
}

defineExpose({
  smtpAccounts,
  loadData,
  loadSentEmails,
})

onMounted(() => {
  loadData()
})
</script>
