<template>
  <div class="h-full min-h-0">
    <div
      v-if="selectedAccountIds.length === 0 && !pageMode"
      class="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-gray-400"
    >
      <EnvelopeIcon class="h-10 w-10 text-gray-200" aria-hidden="true" />
      <p class="text-sm">{{ tc('emptyState') }}</p>
    </div>
    <div
      v-if="useComposeOverlay"
      class="fixed inset-0 z-[70] bg-slate-950/20"
      @click="toggleComposeFullscreen"
    />
    <section
      v-if="selectedAccountIds.length || pageMode"
      ref="composeSectionRef"
      :class="composeSectionClass"
    >
      <header
        class="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-gray-200 bg-gray-50/70 px-2 py-2"
      >
        <button
          type="button"
          :disabled="sending || !canSend"
          class="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded bg-primary-600 px-3 text-xs font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          @click="sendEmail"
        >
          <PaperAirplaneIcon class="h-4 w-4" aria-hidden="true" />{{
            sending ? tc('sending') : t('sendEmail.send')
          }}
        </button>
        <button
          type="button"
          :disabled="sending"
          :title="tc('addAttachment')"
          class="inline-flex h-8 items-center gap-1 rounded px-2 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          @click="triggerAttachmentSelect"
        >
          <PaperClipIcon class="h-4 w-4" aria-hidden="true" />{{ tc('attachment') }}
        </button>
        <span class="mx-1 h-4 w-px bg-gray-200" aria-hidden="true" />
        <button
          type="button"
          :disabled="sending"
          :title="tc('importExcel')"
          class="inline-flex h-8 items-center gap-1 rounded px-2 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          @click="triggerImport"
        >
          <ArrowUpTrayIcon class="h-4 w-4" aria-hidden="true" />{{ tc('importExcel') }}
        </button>
        <button
          type="button"
          :title="tc('downloadRecipientTemplate')"
          :aria-label="tc('downloadRecipientTemplate')"
          class="inline-flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded px-2 text-xs text-gray-600 hover:bg-gray-100"
          @click="downloadTemplate"
        >
          <ArrowDownTrayIcon class="h-4 w-4" aria-hidden="true" />{{
            tc('downloadRecipientTemplate')
          }}
        </button>
        <div class="ml-auto flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            :title="showAiPanel ? tc('aiHide') : tc('aiShow')"
            :aria-label="showAiPanel ? tc('aiHide') : tc('aiShow')"
            :aria-pressed="showAiPanel"
            :disabled="sending"
            class="inline-flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            :class="{ 'bg-primary-50 text-primary-700': showAiPanel }"
            @click="showAiPanel = !showAiPanel"
          >
            <SparklesIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            :title="bodyMode === 'html' ? te('richEditor') : te('htmlSource')"
            :aria-label="bodyMode === 'html' ? te('richEditor') : te('htmlSource')"
            :aria-pressed="bodyMode === 'html'"
            :disabled="sending"
            class="inline-flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            :class="{ 'bg-primary-50 text-primary-700': bodyMode === 'html' }"
            @click="bodyMode = bodyMode === 'rich' ? 'html' : 'rich'"
          >
            <CodeBracketIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            :title="isComposeFullscreen ? tc('fullscreenExit') : tc('fullscreenEnter')"
            :aria-label="isComposeFullscreen ? tc('fullscreenExit') : tc('fullscreenEnter')"
            class="inline-flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
            @click="toggleComposeFullscreen"
          >
            <component
              :is="isComposeFullscreen ? ArrowsPointingInIcon : ArrowsPointingOutIcon"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,.xls"
          class="hidden"
          @change="handleFileImport"
        />
        <input
          ref="attachmentInput"
          type="file"
          multiple
          class="hidden"
          @change="handleAttachmentSelect"
        />
      </header>
      <div :class="composeGridClass">
        <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <MailRecipientField
            v-model:recipients="recipients"
            v-model:draft="recipientInput"
            :input-id="`${composeId}-to`"
            :label="t('sendEmail.recipient')"
            :placeholder="tc('recipientInlinePlaceholder')"
            :disabled="sending"
          >
            <button
              v-if="!showCcBcc"
              type="button"
              :disabled="sending"
              class="rounded px-1 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-primary-700"
              @click="showCcBcc = true"
            >
              {{ t('sendEmail.cc') }}/{{ t('sendEmail.bcc') }}
            </button>
          </MailRecipientField>
          <template v-if="showCcBcc">
            <MailRecipientField
              v-model:recipients="ccRecipients"
              v-model:draft="ccInput"
              :input-id="`${composeId}-cc`"
              :label="t('sendEmail.cc')"
              :placeholder="tc('ccInlinePlaceholder')"
              :disabled="sending"
            />
            <MailRecipientField
              v-model:recipients="bccRecipients"
              v-model:draft="bccInput"
              :input-id="`${composeId}-bcc`"
              :label="t('sendEmail.bcc')"
              :placeholder="tc('bccInlinePlaceholder')"
              :disabled="sending"
            />
          </template>
          <div
            class="flex min-h-10 shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-1.5"
          >
            <label
              :for="`${composeId}-subject`"
              class="w-20 shrink-0 whitespace-nowrap text-xs text-gray-500"
              >{{ t('sendEmail.subject') }}</label
            >
            <input
              :id="`${composeId}-subject`"
              v-model="form.subject"
              type="text"
              :disabled="sending"
              :aria-label="t('sendEmail.subject')"
              :placeholder="t('sendEmail.subjectPlaceholder')"
              class="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-gray-400 focus:ring-0 disabled:opacity-60"
            />
            <span v-if="importCount" class="shrink-0 text-xs text-gray-400">{{
              tc('importedRecipients', { count: importCount })
            }}</span>
          </div>
          <div
            v-if="attachments.length || historicalAttachmentHints.length"
            class="max-h-24 shrink-0 overflow-y-auto border-b border-gray-100 px-3 py-2"
          >
            <div class="flex flex-wrap gap-1.5">
              <div
                v-for="(attachment, index) in attachments"
                :key="`${attachment.name}-${index}`"
                class="inline-flex min-w-0 items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-600"
              >
                <PaperClipIcon class="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" /><span
                  class="max-w-40 truncate"
                  >{{ attachment.name }}</span
                ><span class="text-gray-400">{{ formatFileSize(attachment.size) }}</span>
                <button
                  type="button"
                  :disabled="sending"
                  :aria-label="te('removeAttachment', { name: attachment.name })"
                  class="text-gray-400 hover:text-red-500 disabled:opacity-40"
                  @click="removeAttachment(index)"
                >
                  <XMarkIcon class="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <span
                v-for="(attachment, index) in historicalAttachmentHints"
                :key="`previous-${index}`"
                class="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700"
                >{{ attachment.name }}</span
              >
            </div>
            <p
              v-if="historicalAttachmentHints.length && !attachments.length"
              class="mt-1 text-xs text-amber-700"
            >
              {{ tc('reselectAttachmentHint') }}
            </p>
          </div>
          <div :class="bodyPanelClass">
            <MailEditorToolbar
              v-if="bodyMode === 'rich' && bodyEditor"
              :editor="bodyEditor"
              :disabled="sending"
              @busy="uploadingInlineImage = $event"
            />
            <div v-if="bodyMode === 'rich'" :class="editorViewportClass">
              <EditorContent
                v-if="bodyEditor"
                :editor="bodyEditor"
                :class="['mail-body-editor', editorContentClass]"
              />
              <MailTableContextMenu v-if="bodyEditor" :editor="bodyEditor" :disabled="sending" />
            </div>
            <textarea
              v-else
              v-model="bodyHtmlSource"
              :disabled="sending"
              :aria-label="te('htmlSource')"
              :placeholder="tc('htmlPlaceholder')"
              :class="[
                'w-full border-0 bg-white px-3 py-3 font-mono text-xs leading-6 text-slate-700 outline-none focus:ring-0',
                htmlTextareaClass
              ]"
              @input="handleHtmlSourceInput"
            />
          </div>
        </div>
        <aside v-if="showAiPanel" :class="aiPanelClass">
          <div class="border-b border-slate-100 bg-white p-4">
            <div class="mb-4 flex items-center gap-3">
              <div
                class="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-50 text-primary-700"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 3l1.6 4.8L18 9.5l-4.4 1.7L12 16l-1.6-4.8L6 9.5l4.4-1.7L12 3zM19 14l.8 2.4L22 17l-2.2.6L19 20l-.8-2.4L16 17l2.2-.6L19 14z"
                  />
                </svg>
              </div>
              <div>
                <p class="text-base font-semibold text-slate-900">{{ tc('aiTitle') }}</p>
                <p v-if="!isCompactAiPanel" class="mt-1 text-xs text-slate-500">
                  {{ tc('aiSubtitle') }}
                </p>
              </div>
            </div>
            <div class="rounded-full bg-slate-100 p-1">
              <div class="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  @click="aiMode = 'compose'"
                  class="rounded-full px-3 py-2 text-sm font-semibold transition-colors"
                  :class="
                    aiMode === 'compose'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  "
                >
                  {{ tc('aiCompose') }}
                </button>
                <button
                  type="button"
                  @click="aiMode = 'polish'"
                  class="rounded-full px-3 py-2 text-sm font-semibold transition-colors"
                  :class="
                    aiMode === 'polish'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  "
                >
                  {{ tc('aiPolish') }}
                </button>
              </div>
            </div>
          </div>

          <div :class="aiPanelBodyClass">
            <div :class="aiPromptCardClass">
              <textarea
                v-model="aiPrompt"
                :placeholder="
                  aiMode === 'compose' ? tc('aiComposePlaceholder') : tc('aiPolishPlaceholder')
                "
                :class="aiPromptTextareaClass"
              ></textarea>

              <div
                v-if="visibleAiQuickOptions.length > 0"
                :class="
                  isCompactAiPanel ? 'mt-3 grid grid-cols-2 gap-2' : 'mt-3 grid grid-cols-4 gap-2'
                "
              >
                <button
                  v-for="option in visibleAiQuickOptions"
                  :key="option.label"
                  type="button"
                  @click="applyAiQuickOption(option)"
                  class="min-w-0 rounded-full bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
                >
                  {{ option.label }}
                </button>
              </div>

              <div
                class="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3"
              >
                <button
                  type="button"
                  @click="aiPrompt = ''"
                  class="text-xs font-medium text-slate-400 transition-colors hover:text-primary-700"
                >
                  {{ tc('clear') }}
                </button>
                <button
                  @click="runAiAction"
                  :disabled="
                    aiBusy ||
                    (aiMode === 'compose' && !aiPrompt.trim()) ||
                    (aiMode === 'polish' && !bodyContentText.trim())
                  "
                  :class="[
                    'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    !aiBusy &&
                    !(
                      (aiMode === 'compose' && !aiPrompt.trim()) ||
                      (aiMode === 'polish' && !bodyContentText.trim())
                    )
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'cursor-not-allowed bg-slate-200 text-slate-400'
                  ]"
                >
                  {{
                    aiBusy
                      ? tc('aiGenerating')
                      : aiMode === 'compose'
                        ? tc('aiGenerate')
                        : tc('aiRewrite')
                  }}
                </button>
              </div>
            </div>

            <div
              v-if="!isCompactAiPanel"
              class="mt-4 rounded-[22px] border border-slate-200 bg-white p-3"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-slate-500">{{ tc('aiTone') }}</span>
                <div class="flex rounded-full bg-slate-100 p-1">
                  <button
                    v-for="tone in aiToneOptions"
                    :key="tone.value"
                    type="button"
                    @click="aiTone = tone.value"
                    class="rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                    :class="
                      aiTone === tone.value
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    "
                  >
                    {{ tone.label }}
                  </button>
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-xs font-medium text-slate-500">{{ tc('aiLength') }}</span>
                <div class="flex rounded-full bg-slate-100 p-1">
                  <button
                    v-for="length in aiLengthOptions"
                    :key="length.value"
                    type="button"
                    @click="aiLength = length.value"
                    class="rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                    :class="
                      aiLength === length.value
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    "
                  >
                    {{ length.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { createMailEditorExtensions, mailHtmlToText, prepareMailHtml } from '@/utils/mailEditor'
import MailEditorToolbar from './MailEditorToolbar.vue'
import MailRecipientField from './MailRecipientField.vue'
import MailTableContextMenu from './MailTableContextMenu.vue'
import {
  EnvelopeIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  CodeBracketIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'
import { batchLoginAPI } from '@/api/batchLogin'
import mailboxProxyApi from '@/api/mailboxProxy'
import smtpAccountsAPI from '@/api/smtpAccounts'
import { showMessage } from '@/utils/message'
import { isTauri } from '@/services/api'
import api from '@/services/api'
import { buildDesktopSendableSmtpAccountMap, normalizeSmtpEmail } from '@/utils/smtpCapability'
import { getLocaleOption } from '@/i18n/locales'

const { t, locale } = useI18n()
const composeId = `mail-compose-${getCurrentInstance()?.uid}`
const tc = (key: string, params: Record<string, unknown> = {}) =>
  t(`sendEmail.compose.${key}`, params)
const te = (key: string, params: Record<string, unknown> = {}) =>
  t(`sendEmail.editor.${key}`, params)

async function getTauriInvoke() {
  if (!isTauri()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke
  } catch {
    return null
  }
}

const previewRuntimeProxy = async (email: string) => {
  try {
    const response: any = await mailboxProxyApi.previewRuntimeProxy({ email })
    if (response.code !== 0) return null
    return response?.data?.runtime_proxy || null
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
  content_html?: string
  created_at: number
  external_mailbox_id?: number | string | null
  attachments?: HistoricalAttachmentHint[]
}

interface ReplyDraftPayload {
  to?: string
  subject?: string
}

const props = defineProps<{
  selectedMailboxIds?: number[]
  pageMode?: boolean
}>()

const loading = ref(false)
const composeSectionRef = ref<HTMLElement | null>(null)
const smtpAccounts = ref<SmtpAccount[]>([])
const externalAccounts = ref<ExternalAccount[]>([])
const sending = ref(false)
const showCcBcc = ref(false)
const polishing = ref(false)
const uploadingInlineImage = ref(false)
const importCount = ref(0)
const fileInput = ref<HTMLInputElement | null>(null)
const attachmentInput = ref<HTMLInputElement | null>(null)
const attachments = ref<EmailAttachment[]>([])
const historicalAttachmentHints = ref<HistoricalAttachmentHint[]>([])
const recipients = ref<string[]>([])
const recipientInput = ref('')
const ccRecipients = ref<string[]>([])
const bccRecipients = ref<string[]>([])
const ccInput = ref('')
const bccInput = ref('')
const aiMode = ref<'compose' | 'polish'>('compose')
const aiPrompt = ref('')
const aiTone = ref<'formal' | 'friendly' | 'sales'>('formal')
const aiLength = ref<'short' | 'medium' | 'long'>('medium')
const aiGenerating = ref(false)
const pageMode = computed(() => Boolean(props.pageMode))
const showAiPanel = ref(false)
const isComposeFullscreen = ref(false)
const aiBusy = computed(() => aiGenerating.value || polishing.value)
const useComposeOverlay = computed(() => isComposeFullscreen.value)
const isCompactAiPanel = computed(() => showAiPanel.value && !isComposeFullscreen.value)
const aiToneOptions = computed(() => [
  { value: 'formal' as const, label: tc('toneFormal') },
  { value: 'friendly' as const, label: tc('toneFriendly') },
  { value: 'sales' as const, label: tc('toneSales') }
])
const aiLengthOptions = computed(() => [
  { value: 'short' as const, label: tc('lengthShort') },
  { value: 'medium' as const, label: tc('lengthMedium') },
  { value: 'long' as const, label: tc('lengthLong') }
])
const aiComposeQuickOptions = computed(() => [
  { label: tc('quickQuoteFollowup'), prompt: tc('quickQuoteFollowupPrompt') },
  { label: tc('quickOutbound'), prompt: tc('quickOutboundPrompt') },
  { label: tc('quickReminder'), prompt: tc('quickReminderPrompt') },
  { label: tc('quickMeeting'), prompt: tc('quickMeetingPrompt') }
])
const aiPolishQuickOptions = computed(() => [
  { label: tc('quickFormal'), prompt: tc('quickFormalPrompt') },
  { label: tc('quickShorter'), prompt: tc('quickShorterPrompt') },
  { label: tc('quickTranslate'), prompt: tc('quickTranslatePrompt') },
  { label: tc('quickCta'), prompt: tc('quickCtaPrompt') }
])
const visibleAiQuickOptions = computed(() => {
  const options =
    aiMode.value === 'compose' ? aiComposeQuickOptions.value : aiPolishQuickOptions.value
  return isComposeFullscreen.value ? options : options.slice(0, 2)
})
const selectedToneLabel = computed(
  () => aiToneOptions.value.find((item) => item.value === aiTone.value)?.label || ''
)
const selectedLengthLabel = computed(
  () => aiLengthOptions.value.find((item) => item.value === aiLength.value)?.label || ''
)
const bodyPanelClass = computed(() => 'flex min-h-40 flex-1 flex-col')
const editorViewportClass = computed(() => 'min-h-0 flex-1 overflow-auto bg-white')
const editorContentClass = computed(() => 'h-full min-h-0')
const htmlTextareaClass = computed(() => 'h-full min-h-0 flex-1 resize-none')

const aiPanelClass = computed(
  () =>
    'absolute inset-y-0 right-0 z-20 flex w-72 max-w-[90%] flex-col overflow-hidden border-l border-gray-200 bg-white shadow-lg xl:static xl:shrink-0 xl:shadow-none'
)

const aiPanelBodyClass = computed(() => {
  return isCompactAiPanel.value
    ? 'flex min-h-0 flex-1 flex-col overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
    : 'min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
})
const aiPromptCardClass = computed(() => {
  return isCompactAiPanel.value
    ? 'flex min-h-0 flex-1 flex-col rounded-[26px] border border-slate-200 bg-white p-3 shadow-sm'
    : 'rounded-[26px] border border-slate-200 bg-white p-3 shadow-sm'
})
const aiPromptTextareaClass = computed(() => {
  return isCompactAiPanel.value
    ? 'min-h-[150px] flex-1 w-full resize-none border-none bg-transparent px-1 py-1 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0'
    : 'min-h-[150px] w-full resize-none border-none bg-transparent px-1 py-1 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0'
})
const composeSectionClass = computed(() =>
  useComposeOverlay.value
    ? 'compose-section fixed inset-2 z-[80] flex min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl sm:inset-4'
    : 'compose-section flex h-full min-h-0 flex-col overflow-hidden bg-white'
)
const composeGridClass = computed(() => 'relative flex min-h-0 flex-1 overflow-hidden')

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
        smtp_id: smtp.id
      }
    })
})

const form = ref({
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  content: '',
  contentHtml: ''
})

const bodyMode = ref<'rich' | 'html'>('rich')
const bodyHtmlSource = ref('')
const syncingBodyState = ref(false)

const escapeHtml = (value: string) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const normalizeBodyHtml = (html: string) => {
  const value = String(html || '').trim()
  if (!value || value === '<p></p>' || value === '<p><br></p>') return ''
  return value
}

const htmlToText = mailHtmlToText

const plainTextToHtml = (text: string) => {
  const value = String(text || '').trim()
  if (!value) return ''
  return value
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

const syncBodyState = (html: string) => {
  const normalizedHtml = normalizeBodyHtml(html)
  form.value.contentHtml = normalizedHtml
  bodyHtmlSource.value = normalizedHtml
  form.value.content = htmlToText(normalizedHtml)
}

const bodyContentText = computed(() => {
  return bodyMode.value === 'html' ? htmlToText(bodyHtmlSource.value) : form.value.content
})

const setBodyFromHtml = (html: string) => {
  const normalizedHtml = normalizeBodyHtml(html)
  syncingBodyState.value = true
  syncBodyState(normalizedHtml)
  if (bodyEditor.value) {
    bodyEditor.value.commands.setContent(normalizedHtml || '<p></p>', { emitUpdate: false })
  }
  syncingBodyState.value = false
}

const setBodyFromText = (text: string) => {
  setBodyFromHtml(plainTextToHtml(text))
}

const clearBodyContent = () => {
  setBodyFromHtml('')
}

const handleHtmlSourceInput = () => {
  if (syncingBodyState.value) return
  syncBodyState(bodyHtmlSource.value)
}

const bodyEditor = useEditor({
  extensions: createMailEditorExtensions(tc('bodyEditorPlaceholder')),
  content: '',
  editorProps: {
    attributes: {
      class: 'fm-mail-editor prose prose-sm max-w-none focus:outline-none',
      role: 'textbox',
      'aria-label': t('sendEmail.body'),
      'aria-multiline': 'true'
    }
  },
  onUpdate: ({ editor }) => {
    if (syncingBodyState.value) return
    syncBodyState(editor.getHTML())
  }
})

const canSend = computed(() => {
  return (
    isDesktop.value &&
    !uploadingInlineImage.value &&
    !aiBusy.value &&
    activeSmtpAccounts.value.length > 0 &&
    recipients.value.length > 0 &&
    form.value.subject.trim() &&
    bodyContentText.value.trim()
  )
})

const addRecipients = (text: string) => {
  const emails = splitEmails(text).filter((e) => !recipients.value.includes(e))
  if (emails.length > 0) {
    recipients.value.push(...emails)
  }
  return emails.length
}

const splitEmails = (text: string) => {
  return String(text || '')
    .split(/[,;，；\s\n]+/)
    .map((e) => e.trim())
    .filter((e) => e.includes('@'))
}

const applyAiQuickOption = (option: { label: string; prompt: string }) => {
  aiPrompt.value = option.prompt
  if (aiPolishQuickOptions.value.some((item) => item.label === option.label)) {
    aiMode.value = 'polish'
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const [extRes, smtpRes] = await Promise.all([
      batchLoginAPI.getAccounts(1, 100),
      smtpAccountsAPI.getAccounts()
    ])

    if (extRes.code === 0) {
      externalAccounts.value = extRes.data.accounts || []
    }

    if (smtpRes.code === 0) {
      smtpAccounts.value = smtpRes.data.accounts || []
    }
  } catch (error) {
    console.error(tc('loadAccountsFailed'), error)
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
  ccRecipients.value = splitEmails((record as any).cc_email || '')
  bccRecipients.value = splitEmails((record as any).bcc_email || '')
  ccInput.value = ''
  bccInput.value = ''
  showCcBcc.value = ccRecipients.value.length > 0 || bccRecipients.value.length > 0
  form.value.subject = String(record.subject || '')
  if (record.content_html) {
    setBodyFromHtml(String(record.content_html || ''))
  } else {
    setBodyFromText(String(record.content_text || ''))
  }
  historicalAttachmentHints.value = Array.isArray(record.attachments) ? [...record.attachments] : []
}

const loadReplyDraft = (payload: ReplyDraftPayload) => {
  const replyTo = String(payload?.to || '').trim()
  const replySubject = String(payload?.subject || '').trim()

  recipients.value = splitEmails(replyTo)
  recipientInput.value = ''
  ccRecipients.value = []
  bccRecipients.value = []
  ccInput.value = ''
  bccInput.value = ''
  showCcBcc.value = false
  form.value.subject = /^re\s*:/i.test(replySubject)
    ? replySubject
    : replySubject
      ? `Re: ${replySubject}`
      : ''
  attachments.value = []
  historicalAttachmentHints.value = []
  aiPrompt.value = ''
  clearBodyContent()
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
    reader.onerror = () => reject(reader.error || new Error(tc('readFileFailed')))
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
        dataBase64: await readFileAsBase64(file)
      }))
    )

    attachments.value = [...attachments.value, ...nextAttachments]
    historicalAttachmentHints.value = []
  } catch (error) {
    console.error(tc('readAttachmentFailed'), error)
    showMessage(tc('readAttachmentFailed'), 'error')
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

const shouldDisableSenderByError = (message: string) => {
  const normalized = String(message || '').toLowerCase()
  return (
    normalized.includes('smtp 返回 543') ||
    normalized.includes('smtp return 543') ||
    normalized.includes('suspected spams') ||
    normalized.includes('account(ip) invalid') ||
    normalized.includes('account(ip)') ||
    normalized.includes('ip invalid')
  )
}

const handleFileImport = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const XLSX = await import('xlsx')
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

      const emails: string[] = []
      for (const row of rows) {
        if (!row || row.length === 0) continue
        const cell = String(row[0] || '').trim()
        if (!cell || cell === tc('excelHeaderEmail') || cell === 'email' || cell === 'Email')
          continue
        if (cell.includes('@')) {
          emails.push(cell)
        }
      }

      if (emails.length === 0) {
        showMessage(tc('excelNoValidRecipient'), 'warning')
        return
      }

      const added = addRecipients(emails.join(','))
      importCount.value = added || emails.length
      showMessage(tc('excelImportSuccess', { count: emails.length }), 'success')
    } catch (error) {
      showMessage(tc('excelParseFailed'), 'error')
    }
  }

  reader.readAsArrayBuffer(file)
  target.value = ''
}

const downloadTemplate = async () => {
  try {
    const XLSX = await import('xlsx')
    const wsData = [[tc('excelHeaderEmail')], ['example1@mail.com'], ['example2@mail.com']]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 30 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, tc('excelSheetName'))

    if (isDesktop.value) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')

      const savePath = await save({
        defaultPath: tc('excelTemplateName'),
        filters: [
          {
            name: 'Excel',
            extensions: ['xlsx']
          }
        ]
      })

      if (!savePath) return

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      await writeFile(savePath, new Uint8Array(buffer))
      showMessage(tc('templateSaved'), 'success')
      return
    }

    XLSX.writeFile(wb, tc('excelTemplateName'))
  } catch (error) {
    console.error(tc('templateDownloadFailed'), error)
    showMessage(tc('templateDownloadFailed'), 'error')
  }
}

const sendEmail = async () => {
  if (!canSend.value) return
  const sendFailedPrefix = t('sendEmail.sendFailed')

  const accounts = activeSmtpAccounts.value
  if (accounts.length === 0) {
    showMessage(tc('noAvailableSender'), 'error')
    return
  }

  sending.value = true
  try {
    const recipientList = [...recipients.value]
    const contentHtml = prepareMailHtml(
      form.value.contentHtml || plainTextToHtml(bodyContentText.value)
    )
    const contentText = mailHtmlToText(contentHtml)

    const tauriInvoke = await getTauriInvoke()
    if (!tauriInvoke) {
      showMessage(tc('desktopSendOnly'), 'error')
      sending.value = false
      return
    }

    let successCount = 0
    let failCount = 0
    let saveRecordFailed = false
    const sentRecords = []
    const failedDetails: Array<{ recipient: string; message: string }> = []
    const disabledSenderIds = new Set<number>()
    let senderCursor = 0

    for (let i = 0; i < recipientList.length; i++) {
      const availableAccounts = accounts.filter((account) => !disabledSenderIds.has(account.id))
      if (availableAccounts.length === 0) {
        failCount++
        failedDetails.push({
          recipient: recipientList[i],
          message: tc('noAvailableSender')
        })
        continue
      }

      const account = availableAccounts[senderCursor % availableAccounts.length]
      senderCursor += 1
      try {
        const runtimeProxy = await previewRuntimeProxy(account.email)
        const sendResult: any = await tauriInvoke('send_smtp_email', {
          fromEmail: account.email,
          password: account.smtp_password || account.password,
          smtpHost: account.smtp_host || '',
          smtpPort: account.smtp_port || 465,
          toEmail: recipientList[i],
          cc: ccRecipients.value.join(',') || null,
          bcc: bccRecipients.value.join(',') || null,
          subject: form.value.subject,
          content: contentText,
          contentHtml,
          attachments: attachments.value.map((attachment) => ({
            name: attachment.name,
            size: attachment.size,
            contentType: attachment.contentType,
            dataBase64: attachment.dataBase64
          })),
          proxy: runtimeProxy
        })

        successCount++
        sentRecords.push({
          smtp_account_id: account.smtp_id,
          external_mailbox_id: account.id,
          from_email: account.email,
          to_email: recipientList[i],
          subject: form.value.subject,
          content: contentText,
          content_html: contentHtml,
          status: 'sent',
          smtp_response_code: sendResult?.response_code ?? null,
          smtp_response_message: sendResult?.response_message ?? '',
          attachments: attachments.value.map((attachment) => ({
            name: attachment.name,
            size: attachment.size,
            content_type: attachment.contentType
          }))
        })
      } catch (error: any) {
        failCount++
        console.error(tc('sendFailedPrefix', { message: recipientList[i] }), error)
        const message = String(error?.message || error?.toString?.() || tc('unknownError')).trim()
        failedDetails.push({
          recipient: recipientList[i],
          message
        })

        if (shouldDisableSenderByError(message)) {
          disabledSenderIds.add(account.id)
          try {
            await smtpAccountsAPI.reportSendFailure({
              email: account.email,
              error_message: message,
              disable_smtp: true
            })
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('external-smtp-status-updated', {
                  detail: { email: account.email }
                })
              )
            }
          } catch (reportError) {
            console.error(tc('recordSyncFailed'), reportError)
          }
        }

        sentRecords.push({
          smtp_account_id: account.smtp_id,
          external_mailbox_id: account.id,
          from_email: account.email,
          to_email: recipientList[i],
          subject: form.value.subject,
          content: contentText,
          content_html: contentHtml,
          status: 'failed',
          error_message: message.replace(/^(发送失败|Send failed):\s*/, ''),
          attachments: attachments.value.map((attachment) => ({
            name: attachment.name,
            size: attachment.size,
            content_type: attachment.contentType
          }))
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
        console.error(tc('recordSyncFailed'), error)
        saveRecordFailed = true
      }
    }

    if (failCount === 0) {
      showMessage(tc('sendSuccessCount', { count: successCount }), 'success')
      form.value = { to: '', cc: '', bcc: '', subject: '', content: '', contentHtml: '' }
      recipients.value = []
      recipientInput.value = ''
      ccRecipients.value = []
      bccRecipients.value = []
      ccInput.value = ''
      bccInput.value = ''
      showCcBcc.value = false
      importCount.value = 0
      attachments.value = []
      historicalAttachmentHints.value = []
      aiPrompt.value = ''
      clearBodyContent()
    } else {
      const firstFailure = failedDetails[0]
      if (recipientList.length === 1 && firstFailure) {
        showMessage(
          firstFailure.message.startsWith(sendFailedPrefix)
            ? firstFailure.message
            : tc('sendFailedPrefix', { message: firstFailure.message }),
          'error'
        )
      } else if (firstFailure) {
        const failedSummary = failedDetails
          .slice(0, 2)
          .map(
            (item) =>
              `${item.recipient}: ${item.message.replace(/^(发送失败|Send failed):\s*/, '')}`
          )
          .join('；')
        showMessage(
          tc('sendCompletedSummaryWithDetail', {
            success: successCount,
            fail: failCount,
            detail: failedSummary
          }),
          'warning'
        )
      } else {
        showMessage(
          tc('sendCompletedSummary', { success: successCount, fail: failCount }),
          'warning'
        )
      }
    }

    if (saveRecordFailed) {
      console.error(tc('recordSyncFailed'))
    }
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || error.toString()
    showMessage(tc('sendFailedPrefix', { message }), 'error')
  } finally {
    sending.value = false
  }
}

const polishContent = async () => {
  if (!bodyContentText.value.trim() || polishing.value) return

  polishing.value = true
  try {
    const response: any = await api.post('/ai/polish-email', {
      content: bodyContentText.value,
      subject: form.value.subject || null
    })

    if (response.code === 0 && response.data?.content) {
      setBodyFromText(String(response.data.content || ''))
      if (response.data.subject) {
        form.value.subject = response.data.subject
      }
      showMessage(tc('aiPolishSuccess'), 'success')
    } else {
      showMessage(response.message || tc('aiPolishFailed'), 'error')
    }
  } catch (error) {
    showMessage(tc('aiPolishRetryFailed'), 'error')
  } finally {
    polishing.value = false
  }
}

const composeEmailWithAI = async () => {
  if (!aiPrompt.value.trim() || aiGenerating.value) return

  aiGenerating.value = true
  try {
    const prompt = [
      aiPrompt.value.trim(),
      tc('promptTone', { label: selectedToneLabel.value }),
      tc('promptLength', { label: selectedLengthLabel.value })
    ].join('\n')

    const response: any = await api.post('/ai/compose-email', {
      prompt,
      tone: selectedToneLabel.value,
      language: getLocaleOption(locale.value).aiLanguage,
      subject: form.value.subject || null,
      content: bodyContentText.value || null
    })

    if (response.code === 0 && response.data?.content) {
      form.value.subject = String(response.data.subject || form.value.subject || '')
      setBodyFromText(String(response.data.content || bodyContentText.value || ''))
      showMessage(tc('aiComposeSuccess'), 'success')
    } else {
      showMessage(response.message || tc('aiComposeFailed'), 'error')
    }
  } catch (error) {
    showMessage(tc('aiComposeRetryFailed'), 'error')
  } finally {
    aiGenerating.value = false
  }
}

const runAiAction = async () => {
  if (sending.value) return
  if (aiMode.value === 'polish') {
    await polishContent()
    return
  }
  await composeEmailWithAI()
}

const syncComposeOverlay = () => {
  if (typeof document === 'undefined') return
  const shouldLock = useComposeOverlay.value
  document.body.style.overflow = shouldLock ? 'hidden' : ''
  document.documentElement.style.overflow = shouldLock ? 'hidden' : ''
}

const handleComposeOverlayKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !useComposeOverlay.value) return
  isComposeFullscreen.value = false
}

const toggleComposeFullscreen = async () => {
  isComposeFullscreen.value = !isComposeFullscreen.value
}

defineExpose({
  smtpAccounts,
  loadData,
  loadDraftFromSent,
  loadReplyDraft
})

watch(bodyMode, (mode) => {
  if (mode === 'html') {
    bodyHtmlSource.value = form.value.contentHtml || plainTextToHtml(form.value.content)
    return
  }

  if (bodyEditor.value) {
    syncingBodyState.value = true
    bodyEditor.value.commands.setContent(form.value.contentHtml || '<p></p>', { emitUpdate: false })
    syncingBodyState.value = false
  }
})

watch(bodyEditor, (editor) => {
  if (!editor) return
  const initialHtml = form.value.contentHtml || plainTextToHtml(form.value.content)
  syncingBodyState.value = true
  editor.commands.setContent(initialHtml || '<p></p>', { emitUpdate: false })
  syncingBodyState.value = false
  syncBodyState(initialHtml)
})

watch(sending, (value) => bodyEditor.value?.setEditable(!value))

watch(useComposeOverlay, () => {
  syncComposeOverlay()
})

onMounted(() => {
  loadData()
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', handleComposeOverlayKeydown)
  }
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', handleComposeOverlayKeydown)
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  }
  bodyEditor.value?.destroy()
})
</script>

<style scoped>
.compose-section:fullscreen {
  width: 100vw;
  height: 100vh;
  max-width: none;
  padding: 20px 20px 16px;
  border-radius: 0;
  background: #ffffff;
}

:deep(.compose-section:fullscreen .mail-body-editor .ProseMirror) {
  min-height: 360px;
}

:deep(.mail-body-editor .ProseMirror) {
  min-height: 100%;
  box-sizing: border-box;
  padding: 12px 12px 20px;
  color: rgb(30 41 59);
  font-size: 14px;
  line-height: 1.6;
}

:deep(.mail-body-editor .ProseMirror:focus) {
  outline: none;
}

:deep(.mail-body-editor .ProseMirror p) {
  margin: 0 0 0.5rem;
}

:deep(.mail-body-editor .ProseMirror p:last-child) {
  margin-bottom: 0;
}

:deep(.mail-body-editor .ProseMirror ul),
:deep(.mail-body-editor .ProseMirror ol) {
  margin: 0.75rem 0 0.75rem 1.25rem;
}

:deep(.mail-body-editor .ProseMirror blockquote) {
  margin: 0.75rem 0;
  border-left: 3px solid rgb(187 247 208);
  padding-left: 12px;
  color: rgb(71 85 105);
}

:deep(.mail-body-editor .ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  color: rgb(148 163 184);
  pointer-events: none;
}

:deep(.mail-body-editor .ProseMirror .tableWrapper) {
  margin: 0.75rem 0;
  overflow-x: auto;
}

:deep(.mail-body-editor .ProseMirror table) {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

:deep(.mail-body-editor .ProseMirror td),
:deep(.mail-body-editor .ProseMirror th) {
  position: relative;
  min-width: 60px;
  border: 1px solid #cbd5e1;
  padding: 6px 8px;
  vertical-align: top;
}

:deep(.mail-body-editor .ProseMirror th) {
  background-color: #f1f5f9;
  font-weight: 600;
}

:deep(.mail-body-editor .ProseMirror td p),
:deep(.mail-body-editor .ProseMirror th p) {
  margin: 0;
}

:deep(.mail-body-editor .ProseMirror .selectedCell::after) {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background-color: rgb(34 197 94 / 12%);
}

:deep(.mail-body-editor .ProseMirror .column-resize-handle) {
  position: absolute;
  top: 0;
  right: -2px;
  bottom: -1px;
  width: 4px;
  pointer-events: none;
  background-color: #22c55e;
}

:deep(.mail-body-editor .ProseMirror.resize-cursor) {
  cursor: col-resize;
}

:deep(.mail-body-editor .ProseMirror img) {
  max-width: 100%;
  height: auto;
}
</style>
