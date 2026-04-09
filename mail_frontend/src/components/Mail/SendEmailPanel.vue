<template>
  <div class="scrollbar-stable h-full overflow-y-auto pr-1">
    <div class="mx-auto max-w-4xl space-y-4 pb-6">
      <div
        v-if="!isDesktop"
        class="flex items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700 shadow-sm"
      >
        <svg class="h-5 w-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        <span class="text-sm">批量发送邮件功能仅支持桌面客户端，请下载并使用桌面端。</span>
      </div>

      <div
        v-if="selectedAccountIds.length === 0"
        class="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-gray-200 bg-white text-center text-gray-400 shadow-sm"
      >
        <svg class="mb-4 h-12 w-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p class="text-sm">请从左侧邮箱列表选择发件账号以开始写信</p>
      </div>

      <section v-else class="rounded-[28px] border border-gray-200 bg-white shadow-sm">
        <div class="border-b border-gray-100 px-5 py-4 sm:px-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-base font-semibold text-gray-900">写邮件</p>
              <p class="mt-1 text-sm text-gray-500">收件人、附件和正文都在这里一次处理完。</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                @click="downloadTemplate"
                class="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                下载模板
              </button>
              <button
                @click="triggerImport"
                class="inline-flex items-center gap-1 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
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
        </div>

        <div class="space-y-6 px-5 py-5 sm:px-6">
          <div>
            <div class="mb-1.5 flex items-center justify-between gap-3">
              <label class="block text-sm font-medium text-gray-700">发件人</label>
              <span class="text-xs text-gray-400">
                {{ activeSmtpAccounts.length > 1 ? '多个发件人会按顺序轮流发送' : '当前使用选中的发件邮箱发送' }}
              </span>
            </div>
            <div class="flex min-h-[52px] flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
              <span
                v-for="account in selectedExternalAccounts"
                :key="account.id"
                class="rounded-full border px-3 py-1 text-sm"
                :class="activeSmtpEmailMap.has(normalizeSmtpEmail(account.email)) ? 'border-primary-200 bg-white text-primary-700 shadow-sm' : 'border-gray-200 bg-gray-100 text-gray-400'"
              >
                {{ account.email }}
              </span>
              <span v-if="selectedExternalAccounts.length === 0" class="text-sm text-gray-400">
                暂未选择发件邮箱
              </span>
            </div>
          </div>

          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label class="block text-sm font-medium text-gray-700">
                收件人 <span class="text-red-500">*</span>
              </label>
              <span class="text-xs text-gray-400">回车、Tab、逗号可快速录入</span>
            </div>
            <div
              class="flex min-h-[52px] flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 transition-colors focus-within:border-primary-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary-50"
              @click="recipientInputRef?.focus()"
            >
              <span
                v-for="(email, index) in recipients"
                :key="index"
                class="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-white px-3 py-1 text-sm text-primary-700 shadow-sm"
              >
                {{ email }}
                <button
                  type="button"
                  class="ml-0.5 text-primary-400 transition-colors hover:text-red-500"
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
                class="min-w-[160px] flex-1 border-none bg-transparent p-0 text-sm outline-none focus:ring-0"
                @keydown="handleRecipientKeydown"
                @blur="commitRecipientInput"
                @paste="handleRecipientPaste"
              />
            </div>
            <p v-if="importCount > 0" class="mt-2 text-sm text-emerald-600">
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
                class="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-50"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">密送</label>
              <input
                v-model="form.bcc"
                type="text"
                placeholder="BCC"
                class="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-50"
              />
            </div>
          </div>

          <button
            v-else
            @click="showCcBcc = true"
            class="inline-flex items-center rounded-xl px-2 py-1 text-sm text-primary-700 transition-colors hover:bg-primary-50"
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
              class="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-50"
            />
          </div>

          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label class="block text-sm font-medium text-gray-700">附件</label>
              <button
                @click="triggerAttachmentSelect"
                class="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
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
            <div v-if="attachments.length > 0" class="flex flex-wrap gap-2">
              <div
                v-for="(attachment, index) in attachments"
                :key="`${attachment.name}-${attachment.size}-${index}`"
                class="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
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
            <div
              v-if="historicalAttachmentHints.length > 0 && attachments.length === 0"
              class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
            >
              <p class="text-sm font-medium text-amber-800">原邮件附件</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <span
                  v-for="(attachment, index) in historicalAttachmentHints"
                  :key="`${attachment.name}-${index}`"
                  class="rounded-full border border-amber-200 bg-white px-3 py-1 text-sm text-amber-700"
                >
                  {{ attachment.name }}<span v-if="attachment.size"> · {{ formatFileSize(attachment.size) }}</span>
                </span>
              </div>
              <p class="mt-2 text-xs text-amber-700">重新发送前需要重新选择附件文件。</p>
            </div>
            <p v-if="attachments.length === 0 && historicalAttachmentHints.length === 0" class="text-sm text-gray-400">未添加附件</p>
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
                  'inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  form.content.trim() && !polishing
                    ? 'border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                    : 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                ]"
              >
                {{ polishing ? 'AI润色中...' : 'AI润色' }}
              </button>
            </div>
            <textarea
              v-model="form.content"
              placeholder="请输入邮件正文..."
              class="min-h-[180px] w-full rounded-[24px] border border-gray-200 bg-gray-50 px-4 py-4 text-sm leading-7 resize-y focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-50"
            ></textarea>
          </div>

          <div class="flex justify-end pt-2">
            <button
              @click="sendEmail"
              :disabled="sending || !canSend"
              :class="[
                'inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold transition-colors',
                canSend && !sending
                  ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700'
                  : 'cursor-not-allowed bg-gray-300 text-gray-500'
              ]"
            >
              {{ sending ? '发送中...' : '发送邮件' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import * as XLSX from 'xlsx'
import { batchLoginAPI } from '@/api/batchLogin'
import smtpAccountsAPI from '@/api/smtpAccounts'
import { showMessage } from '@/utils/message'
import { isTauri } from '@/services/api'
import api from '@/services/api'
import { buildDesktopSendableSmtpAccountMap, normalizeSmtpEmail } from '@/utils/smtpCapability'

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

interface HistoricalAttachmentHint {
  name: string
  size?: number
  content_type?: string
}

interface SentEmailRecord {
  id: number | string
  from_email: string
  to_email: string
  subject: string
  content_text?: string
  created_at: number
  external_mailbox_id?: number | string | null
  attachments?: HistoricalAttachmentHint[]
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
const attachments = ref<EmailAttachment[]>([])
const historicalAttachmentHints = ref<HistoricalAttachmentHint[]>([])
const recipients = ref<string[]>([])
const recipientInput = ref('')
const recipientInputRef = ref<HTMLInputElement | null>(null)

const selectedAccountIds = computed(() => props.selectedMailboxIds || [])
const isDesktop = computed(() => isTauri())
const normalizeMailboxId = (value: unknown) => {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : 0
}

const activeSmtpEmailMap = computed(() => {
  return buildDesktopSendableSmtpAccountMap(smtpAccounts.value)
})

const externalAccountMap = computed(() => {
  return new Map(
    externalAccounts.value.map((account) => [normalizeMailboxId(account.id), account] as const)
  )
})

const selectedExternalAccounts = computed(() => {
  return selectedAccountIds.value
    .map((id) => externalAccountMap.value.get(normalizeMailboxId(id)))
    .filter(Boolean) as ExternalAccount[]
})

// 发件能力以独立 smtp_accounts 表为准：
// 当前桌面端只认“密码型 SMTP + active + 配置完整”为可发件。
const activeSmtpAccounts = computed<ActiveSmtpAccount[]>(() => {
  return selectedExternalAccounts.value
    .filter((account) => activeSmtpEmailMap.value.has(normalizeSmtpEmail(account.email)))
    .map((account) => {
      const smtp = activeSmtpEmailMap.value.get(normalizeSmtpEmail(account.email))!
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

const loadDraftFromSent = (record: SentEmailRecord) => {
  const nextRecipients = String(record.to_email || '')
    .split(/[,;，；\s\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)

  recipients.value = nextRecipients
  recipientInput.value = ''
  form.value.subject = String(record.subject || '')
  form.value.content = String(record.content_text || '')
  historicalAttachmentHints.value = Array.isArray(record.attachments) ? [...record.attachments] : []
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
    historicalAttachmentHints.value = []
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

const downloadTemplate = async () => {
  const wsData = [['邮箱'], ['example1@mail.com'], ['example2@mail.com']]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = [{ wch: 30 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '收件人')

  try {
    if (isDesktop.value) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')

      const savePath = await save({
        defaultPath: '收件人导入模板.xlsx',
        filters: [
          {
            name: 'Excel',
            extensions: ['xlsx'],
          },
        ],
      })

      if (!savePath) return

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      await writeFile(savePath, new Uint8Array(buffer))
      showMessage('模板已保存', 'success')
      return
    }

    XLSX.writeFile(wb, '收件人导入模板.xlsx')
  } catch (error) {
    console.error('下载模板失败', error)
    showMessage('下载模板失败，请重试', 'error')
  }
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
    const sentRecords = []
    const failedDetails: Array<{ recipient: string; message: string }> = []

    for (let i = 0; i < recipientList.length; i++) {
      const account = accounts[i % accounts.length]
      try {
        const sendResult: any = await tauriInvoke('send_smtp_email', {
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
          status: 'sent',
          smtp_response_code: sendResult?.response_code ?? null,
          smtp_response_message: sendResult?.response_message ?? '',
          attachments: attachments.value.map((attachment) => ({
            name: attachment.name,
            size: attachment.size,
            content_type: attachment.contentType,
          })),
        })
      } catch (error: any) {
        failCount++
        console.error(`发送到 ${recipientList[i]} 失败:`, error)
        const message = String(error?.message || error?.toString?.() || '未知错误').trim()
        failedDetails.push({
          recipient: recipientList[i],
          message,
        })
        sentRecords.push({
          smtp_account_id: account.smtp_id,
          external_mailbox_id: account.id,
          from_email: account.email,
          to_email: recipientList[i],
          subject: form.value.subject,
          content: form.value.content,
          status: 'failed',
          error_message: message.replace(/^发送失败:\s*/, ''),
          attachments: attachments.value.map((attachment) => ({
            name: attachment.name,
            size: attachment.size,
            content_type: attachment.contentType,
          })),
        })
      }
    }

    if (sentRecords.length > 0) {
      try {
        const response = await smtpAccountsAPI.saveSentEmails({ records: sentRecords })
        if (response.code !== 0) {
          saveRecordFailed = true
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
      historicalAttachmentHints.value = []
    } else {
      const firstFailure = failedDetails[0]
      if (recipientList.length === 1 && firstFailure) {
        showMessage(firstFailure.message.startsWith('发送失败') ? firstFailure.message : `发送失败: ${firstFailure.message}`, 'error')
      } else if (firstFailure) {
        const failedSummary = failedDetails
          .slice(0, 2)
          .map((item) => `${item.recipient}：${item.message.replace(/^发送失败:\s*/, '')}`)
          .join('；')
        showMessage(`发送完成：成功 ${successCount} 封，失败 ${failCount} 封。${failedSummary}`, 'warning')
      } else {
        showMessage(`发送完成：成功 ${successCount} 封，失败 ${failCount} 封`, 'warning')
      }
    }

    if (saveRecordFailed) {
      showMessage('发件箱同步失败，发送结果已提示但记录可能不完整', 'warning')
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
  loadDraftFromSent,
})

onMounted(() => {
  loadData()
})
</script>
