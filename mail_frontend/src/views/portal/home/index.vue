<template>
  <ThreeColumnLayout :compact-panels="!userStore.isAuthenticated">
    <!-- 顶部工具栏 -->
    <template #toolbar>
      <div v-if="userStore.isAuthenticated" class="flex flex-col gap-3">
        <!-- Tab切换 -->
        <div class="flex border-b border-gray-200">
          <button
            @click="switchMailboxType('system')"
            :class="[
              'px-6 py-2 text-sm font-medium border-b-2 transition-colors',
              mailboxType === 'system'
                ? 'text-primary-600 border-primary-600'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            临时邮箱
          </button>
          <button
            @click="switchMailboxType('external')"
            :class="[
              'px-6 py-2 text-sm font-medium border-b-2 transition-colors',
              mailboxType === 'external'
                ? 'text-primary-600 border-primary-600'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            第三方邮箱
          </button>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center gap-3">
          <!-- 申请免费邮箱按钮（临时邮箱） -->
          <button
            v-if="mailboxType === 'system'"
            @click="allocateMailbox"
            :disabled="mailboxStore.loading"
            class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ mailboxStore.loading ? '申请中' : '免费邮箱' }}
          </button>

          <!-- 添加邮箱按钮（第三方邮箱） -->
          <button
            v-if="mailboxType === 'external'"
            @click="handleBatchLogin"
            :disabled="batchLoginLoading"
            class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ batchLoginLoading ? '登录中...' : '添加邮箱' }}
          </button>

          <!-- 写邮件 / 返回 切换 -->
          <button
            v-if="mailboxType === 'external'"
            @click="currentView = currentView === 'send-email' ? 'emails' : 'send-email'"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-sm',
              currentView === 'send-email'
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            ]"
          >
            <!-- 返回图标 -->
            <svg
              v-if="currentView === 'send-email'"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              ></path>
            </svg>
            <!-- 编辑图标 -->
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              ></path>
            </svg>

            {{ currentView === 'send-email' ? '返回收件箱' : '批量发送邮件' }}
          </button>
        </div>
      </div>
      <section v-else class="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0">
            <h1 class="text-lg font-semibold text-gray-900">肥猫猫邮箱服务</h1>
            <p class="mt-1 text-sm text-gray-600">
              肥猫猫邮箱服务是一个邮箱管理平台，提供临时邮箱收件、第三方邮箱（Gmail / Outlook
              等）批量接入、邮件批量收发以及邮件自动化工作流，帮助个人和团队更高效地管理多邮箱任务。
            </p>
          </div>
          <div class="flex flex-wrap gap-2 flex-shrink-0">
            <a
              href="/market"
              class="inline-flex items-center rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
            >
              工作流市场
            </a>
            <a
              href="/download"
              class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              下载桌面端
            </a>
            <a
              href="/about"
              class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              了解产品
            </a>
          </div>
        </div>
      </section>
    </template>

    <!-- 左栏：邮箱 -->
    <template #left>
      <TempMailbox v-if="!userStore.isAuthenticated" />

      <!-- 系统邮箱和外部邮箱（两套独立组件，用v-show切换）-->
      <div v-else class="h-full">
        <div v-show="mailboxType === 'system'" class="h-full">
          <SystemMailboxList
            ref="systemMailboxListRef"
            @select="handleSelectMailbox"
            @share="handleShareMailboxes"
            @deleted="handleSystemMailboxesDeleted"
            @batch-mode-start="handleMailboxBatchStart"
          />
        </div>

        <div v-show="mailboxType === 'external'" class="h-full">
          <ExternalMailboxList
            ref="externalMailboxListRef"
            :is-send-email-view="currentView === 'send-email'"
            :active-mailbox-id="selectedExternalMailboxId"
            :selected-send-ids="selectedExternalMailboxIds"
            :smtp-accounts="smtpAccounts"
            :fetching-ids="externalMailboxFetchingIds"
            @select="handleSelectExternalMailbox"
            @share="handleShareMailboxes"
            @deleted="handleExternalMailboxesDeleted"
            @refresh="handleRefreshExternalEmails"
            @oauth-reauthorize="handleOAuthMailboxReauthorize"
            @batch-mode-start="handleMailboxBatchStart"
          />
        </div>
      </div>
    </template>

    <!-- 中栏：邮件（两套独立列表）-->
    <template #middle v-if="currentView === 'emails'">
      <!-- 临时邮箱邮件列表 -->
      <div v-show="mailboxType === 'system'" class="h-full">
        <EmailList
          ref="systemEmailListRef"
          title="收件箱"
          :emails="mailStore.emails"
          :selectedId="mailStore.selectedEmail?.id"
          :showPagination="true"
          :searchable="true"
          :autoRefresh="autoRefresh"
          @select="handleSelectEmail"
          @batch-delete="handleBatchDeleteEmails"
          @batch-mode-start="handleEmailBatchStart"
          @search="handleSearchEmails"
        >
          <template #title-extra>
            <div
              class="relative inline-flex shrink-0"
              @mouseenter="showRefreshTooltipPopover"
              @mouseleave="hideRefreshTooltip"
            >
              <button
                ref="refreshButtonRef"
                @click="handleImmediateRefreshSystemEmails"
                :disabled="refreshingSystemEmails"
                :aria-label="refreshingSystemEmails ? '刷新中' : '立即刷新'"
                class="inline-flex items-center rounded p-1 text-gray-500 transition-colors hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BaseIcon
                  name="refresh"
                  size="sm"
                  :class="{ 'animate-spin': refreshingSystemEmails }"
                />
              </button>
            </div>
            <button
              v-if="selectedMailboxId"
              @click="backToAllEmails"
              class="ml-1.5 px-2 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors whitespace-nowrap"
            >
              查看全部
            </button>
          </template>

          <template #actions>
            <button
              @click="toggleUnreadFilter"
              :class="[
                'px-2 py-1 text-xs rounded transition-colors whitespace-nowrap',
                showOnlyUnread
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
              ]"
            >
              仅未读
            </button>
          </template>

          <template
            #content="{ emails, selectedId, batchMode, selectedIds, toggleSelection, onSelect }"
          >
            <EmailItem
              v-for="email in emails"
              :key="email.id"
              :email="email"
              :isSelected="selectedId === email.id"
              :isChecked="(selectedIds?.value || []).includes(email.id)"
              :batchMode="batchMode"
              @click="onSelect(email)"
              @toggle="toggleSelection(email.id)"
              @delete="handleDeleteEmail(email.id)"
              @copy-code="copyVerificationCode"
            />
          </template>

          <template #pagination>
            <Pagination
              :current-page="mailStore.currentPage"
              :total-pages="mailStore.totalPages"
              :total="mailStore.totalEmails"
              @page-change="handlePageChange"
            />
          </template>
        </EmailList>
      </div>

      <!-- 第三方邮箱邮件列表 -->
      <div v-show="mailboxType === 'external'" class="h-full">
        <EmailList
          ref="externalEmailListRef"
          :title="selectedExternalMailboxId ? '收件箱' : '全部邮件'"
          :emails="externalEmails"
          :selectedId="selectedExternalEmailId"
          :showPagination="true"
          :searchable="true"
          :autoRefresh="false"
          @select="handleSelectExternalEmail"
          @batch-delete="handleBatchDeleteExternalEmails"
          @batch-mode-start="handleEmailBatchStart"
          @search="handleSearchExternalEmails"
        >
          <template #title-extra>
            <button
              v-if="selectedExternalMailboxId"
              @click="backToAllExternalEmails"
              class="px-2 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
            >
              查看全部
            </button>
          </template>

          <template #actions>
            <button
              v-if="canShowExternalFetchButton"
              @click="
                selectedExternalMailboxId ? fetchExternalMailboxEmails() : fetchAllExternalEmails()
              "
              :disabled="fetchingExternalEmails"
              class="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <svg
                v-if="fetchingExternalEmails"
                class="w-3 h-3 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{{ fetchingExternalEmails ? '收取中...' : '收取全部' }}</span>
            </button>
          </template>

          <!-- 完全复用EmailItem组件 -->
          <template
            #content="{ emails, selectedId, batchMode, selectedIds, toggleSelection, onSelect }"
          >
            <EmailItem
              v-for="email in emails"
              :key="email.id"
              :email="email"
              :isSelected="selectedId === email.id"
              :isChecked="(selectedIds?.value || []).includes(email.id)"
              :batchMode="batchMode"
              @click="onSelect(email)"
              @toggle="toggleSelection(email.id)"
              @delete="handleDeleteEmail(email.id)"
              @copy-code="copyVerificationCode"
            />
          </template>

          <template #pagination>
            <Pagination
              :current-page="externalEmailPage"
              :total-pages="Math.ceil(externalEmailTotal / externalEmailPageSize) || 1"
              :total="externalEmailTotal"
              @page-change="handleExternalEmailPageChange"
            />
          </template>
        </EmailList>
      </div>
    </template>

    <!-- 右栏：详情-->
    <template #right v-if="currentView === 'emails'">
      <EmailDetail
        v-if="mailStore.selectedEmail"
        :email="mailStore.selectedEmail"
        @expand="openEmailModal"
      />
    </template>

    <template #main v-if="currentView === 'send-email'">
      <SendEmailPanel ref="sendEmailPanelRef" :selected-mailbox-ids="selectedExternalMailboxIds" />
    </template>

    <template #footer v-if="!userStore.isAuthenticated">
      <div
        class="flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>服务名称：肥猫猫邮箱服务</div>
        <div class="flex items-center gap-3">
          <a href="/privacy-policy" class="hover:text-primary-600">隐私权政策</a>
          <span class="text-gray-300">|</span>
          <a href="/terms-of-service" class="hover:text-primary-600">服务条款</a>
        </div>
      </div>
    </template>
  </ThreeColumnLayout>

  <!-- Web端小程序二维码 -->
  <div
    v-if="!isTauri() && showQrPromo"
    class="fixed right-2 xl:right-1 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-30 flex flex-col items-center"
  >
    <button
      @click="showQrPromo = false"
      class="absolute top-1 right-1.5 text-gray-400 hover:text-gray-600 text-base leading-none"
    >
      &times;
    </button>
    <img :src="wxProgramImg" class="w-20 h-20 rounded-lg" alt="小程序二维码" />
    <p class="text-[11px] text-gray-500 mt-1.5">扫码使用小程序版</p>
  </div>

  <!-- 邮件内容弹窗 -->
  <div
    v-if="showRefreshTooltip && !refreshingSystemEmails"
    class="pointer-events-none fixed z-[9999] whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white shadow-sm"
    :style="refreshTooltipStyle"
  >
    立即刷新
  </div>

  <EmailContentModal
    :visible="showEmailModal"
    :email="modalEmail"
    @update:visible="showEmailModal = $event"
  />

  <!-- 删除确认弹窗 -->
  <ConfirmDialog
    :visible="showDeleteConfirm"
    :mask="false"
    :title="deletingBatch ? '批量删除' : '删除邮件'"
    :message="deletingBatch ? `确定删除 ${deletingIds.length} 封邮件？` : '确定删除这封邮件？'"
    :loading="deleting"
    @confirm="confirmDeleteEmails"
    @cancel="showDeleteConfirm = false"
  />

  <!-- 批量添加邮箱弹窗（含 OAuth2 授权） -->
  <BatchAddAccountModal
    ref="batchAddModalRef"
    :visible="showBatchAddModal"
    :loading="batchLoginLoading"
    @close="showBatchAddModal = false"
    @submit="handleBatchAddAccounts"
    @oauth-complete="handleOAuth2Complete"
  />

  <!-- 下载桌面端提示弹窗 -->
  <ConfirmDialog
    :visible="showDownloadDialog"
    :mask="false"
    :title="downloadDialogTitle"
    :message="downloadDialogMessage"
    confirm-text="下载桌面端"
    cancel-text="取消"
    @confirm="openDownloadDesktop"
    @cancel="showDownloadDialog = false"
  />

  <!-- 分享邮箱弹窗 -->
  <ShareMailboxModal
    :visible="showShareModal"
    :mailbox-ids="shareMailboxIds"
    :mailbox-type="mailboxType"
    :selected-mailboxes="shareMailboxes"
    @close="handleCloseShareModal"
    @success="handleShareSuccess"
  />

  <!-- 发送邮件弹窗 -->
  <SendEmailModal
    :visible="showSendEmailModal"
    :mailboxes="externalMailboxList"
    @update:visible="showSendEmailModal = $event"
    @sent="handleEmailSent"
  />
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useUserStore } from '@/stores/user'
import { useMailboxStore } from '@/stores/auth'
import { useMailStore } from '@/stores/mail'
import ThreeColumnLayout from '@/components/Mail/Layout/ThreeColumnLayout.vue'
import SendEmailPanel from '@/components/Mail/SendEmailPanel.vue'
import TempMailbox from '@/components/Mail/TempMailbox/TempMailbox.vue'
import SystemMailboxList from '@/components/Mail/SystemMailbox/MailboxList.vue'
import ExternalMailboxList from '@/components/Mail/ExternalMailbox/MailboxList.vue'
import EmailList from '@/components/Mail/EmailList/EmailList.vue'
import EmailItem from '@/components/Mail/EmailItem.vue'
import BatchAddAccountModal from '@/components/Mail/BatchAddAccountModal.vue'
import ShareMailboxModal from '@/components/Mail/ShareMailboxModal.vue'
import SendEmailModal from '@/components/Mail/SendEmailModal.vue'
import batchLoginAPI from '@/api/batchLogin'
import smtpAccountsAPI from '@/api/smtpAccounts'
import { mailboxAPI } from '@/api/mailbox'
import EmailDetail from '@/components/Mail/EmailDetail/EmailDetail.vue'
import EmailContentModal from '@/components/Mail/EmailContentModal.vue'
import Pagination from '@/components/Pagination/index.vue'
import BaseIcon from '@/components/BaseIcon/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { showMessage } from '@/utils/message'
import { isTauri, getServerUrl } from '@/services/api'
import { runDesktopOAuthMailboxAction } from '@/services/desktopOAuthMailbox'
import { DESKTOP_DOWNLOAD_URLS } from '@/config/desktopRelease'
import { normalizeOAuthRecoveryErrorMessage } from '@/utils/oauthRecovery'
import { runPromisePool } from '@/utils/promisePool'
import { canDesktopSmtpSend, normalizeSmtpEmail } from '@/utils/smtpCapability'
import { AI_UI_SYNC_EVENT, extractMailboxType, extractToolIds, normalizeAIToolTrace } from '@/utils/aiUiSync'
import wxProgramImg from '@/assets/img/wx_program.jpg'

// 获取 Tauri invoke（按需加载，避免竞态）
async function getTauriInvoke() {
  if (!isTauri()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke
  } catch {
    return null
  }
}
import { unifiedAPI } from '@/api/unified'
import { emailAPI } from '@/api/email'

const OAUTH2_DOMAINS: Record<string, string> = {
  'gmail.com': 'google',
  'googlemail.com': 'google',
  'outlook.com': 'microsoft',
  'hotmail.com': 'microsoft',
  'live.com': 'microsoft',
  'live.cn': 'microsoft',
  'msn.com': 'microsoft'
}

const resolveOAuthProviderByEmail = (email: string, fallback = '') => {
  const normalizedFallback = String(fallback || '').toLowerCase()
  if (normalizedFallback === 'google' || normalizedFallback === 'microsoft') {
    return normalizedFallback
  }

  const domain = (email.split('@')[1] || '').toLowerCase()
  return OAUTH2_DOMAINS[domain] || ''
}

const userStore = useUserStore()
const mailboxStore = useMailboxStore()
const mailStore = useMailStore()

const systemMailboxListRef = ref()
const externalMailboxListRef = ref()
const systemEmailListRef = ref()
const externalEmailListRef = ref()
const mailboxType = ref<'system' | 'external'>('system')
const currentView = ref<'emails' | 'send-email'>('emails')
const selectedMailboxId = ref<number | null>(null)
const externalInitialFetched = ref(false)
const showOnlyUnread = ref(false)
const refreshingSystemEmails = ref(false)
const refreshButtonRef = ref<HTMLElement | null>(null)
const showRefreshTooltip = ref(false)
const refreshTooltipStyle = ref<Record<string, string>>({})
const showEmailModal = ref(false)
const modalEmail = ref<any>(null)
const showBatchAddModal = ref(false)
const batchAddModalRef = ref<any>(null)
const pendingOAuthAccounts = ref<Array<{ email: string; provider: string }>>([])
const pendingOAuthBootstrapEmails = ref<string[]>([])
const showDownloadDialog = ref(false)
const downloadDialogTitle = ref('需要桌面端')
const downloadDialogMessage = ref('第三方邮箱仅支持桌面端添加和收取，是否下载桌面客户端？')
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const deletingIds = ref<number[]>([])
const deletingBatch = ref(false)
const batchLoginLoading = ref(false)
const showQrPromo = ref(true)

const openDownloadDesktop = () => {
  showDownloadDialog.value = false

  const userAgent = globalThis.navigator?.userAgent || ''
  const platform = globalThis.navigator?.platform || ''
  const isMac = /Mac|Macintosh|MacIntel/i.test(`${platform} ${userAgent}`)
  const isWindows = /Win/i.test(`${platform} ${userAgent}`)

  if (isMac) {
    globalThis.location.href = DESKTOP_DOWNLOAD_URLS.macos
    return
  }

  if (isWindows) {
    globalThis.location.href = DESKTOP_DOWNLOAD_URLS.windows
    return
  }

  globalThis.location.href = 'https://zjkdongao.cn/download'
}

const openDesktopDownloadDialog = (
  message = '第三方邮箱仅支持桌面端添加和收取，是否下载桌面客户端？',
  title = '需要桌面端'
) => {
  downloadDialogTitle.value = title
  downloadDialogMessage.value = message
  showDownloadDialog.value = true
}

// 分享相关状态
const showShareModal = ref(false)
const shareMailboxIds = ref<number[]>([])
const shareMailboxes = ref<any[]>([])

// 发送邮件相关状态
const showSendEmailModal = ref(false)
const externalMailboxList = ref<any[]>([])
const smtpAccounts = ref<any[]>([])

// 外部邮箱相关状态
const selectedExternalMailboxId = ref<number | null>(null)
const selectedExternalMailboxIds = ref<number[]>([])
const selectedExternalEmailId = ref<number | null>(null)
const selectedExternalAuthType = ref<string>('password')
const sendEmailPanelRef = ref<any>(null)
const externalEmails = ref<any[]>([])
const fetchingExternalEmails = ref(false)
const showOnlyUnreadExternal = ref(false)
const externalEmailPage = ref(1)
const externalEmailPageSize = ref(20)
const externalEmailTotal = ref(0)
const externalMailboxAuthTypeMap = ref<Record<number, string>>({})
const externalMailboxFetchingIds = ref<number[]>([])
const EXTERNAL_FETCH_ALL_CONCURRENCY = Math.max(
  2,
  Math.min(8, Number(globalThis.navigator?.hardwareConcurrency || 8))
)

const canShowExternalFetchButton = computed(() => {
  // 只有桌面端才显示收取按钮（Web 端所有用户共用服务器 IP 连 IMAP，量大会被风控）
  return isTauri()
})

const syncMailboxAuthTypeMap = (items: any[]) => {
  for (const item of items || []) {
    const id = Number(item?.id)
    const authType = (item?.auth_type || 'password').toLowerCase()
    if (id) {
      externalMailboxAuthTypeMap.value[id] = authType
    }
  }
}

const setExternalMailboxFetchingIds = (ids: number[]) => {
  externalMailboxFetchingIds.value = Array.from(
    new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))
  )
}

const clearExternalMailboxFetchingIds = () => {
  externalMailboxFetchingIds.value = []
}

const removeExternalMailboxFetchingIds = (ids: number[]) => {
  const removing = new Set(
    ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
  )
  externalMailboxFetchingIds.value = externalMailboxFetchingIds.value.filter(
    (id) => !removing.has(id)
  )
}

const markRecoveredMailboxAsPassword = (mailboxId: number) => {
  externalMailboxAuthTypeMap.value[mailboxId] = 'password'
  if (selectedExternalMailboxId.value === mailboxId) {
    selectedExternalAuthType.value = 'password'
  }
  window.dispatchEvent(
    new CustomEvent('external-mailbox-recovered', {
      detail: { mailboxId }
    })
  )
}

const loadExternalMailboxAccountById = async (mailboxId: number) => {
  const response: any = await batchLoginAPI.getAllAccounts(100, {
    suppressErrorMessage: true
  })
  if (response.code !== 0) {
    throw new Error(response.message || '获取邮箱信息失败')
  }
  const accounts = response.data?.accounts || []
  return accounts.find((item: any) => Number(item?.id) === Number(mailboxId)) || null
}

const openOAuthReauthorizeModal = async (account: any) => {
  const provider = resolveOAuthProviderByEmail(account?.email || '', account?.oauth_provider || account?.provider || '')
  if (!provider) {
    throw new Error('当前邮箱不支持 OAuth 重新授权')
  }

  pendingOAuthAccounts.value = [{ email: account.email, provider }]
  showBatchAddModal.value = true
  await nextTick()
  batchAddModalRef.value?.clearResults?.()
  batchAddModalRef.value?.addOAuthAccounts?.(pendingOAuthAccounts.value)
  await nextTick()
  await batchAddModalRef.value?.startOAuthAuthorization?.()
}

const fetchOAuthMailboxOnceById = async (
  tauriInvoke: any,
  mailboxId: number,
  options: { account?: any; allowInteractiveReauth?: boolean } = {}
) => {
  const token = localStorage.getItem('token') || ''
  const serverUrl = getServerUrl()
  const account = options.account || (await loadExternalMailboxAccountById(mailboxId))

  try {
    const fetchResult = await runDesktopOAuthMailboxAction(mailboxId, async (tokenPayload) => {
      return tauriInvoke('fetch_emails', {
        mailboxId,
        email: tokenPayload.email,
        password: '',
        protocol: 'imap',
        host: tokenPayload.imap_host,
        port: tokenPayload.imap_port,
        token,
        serverUrl,
        authType: 'oauth2',
        accessToken: tokenPayload.access_token
      })
    })

    await batchLoginAPI.updateMailboxStatus(mailboxId, 'active')
    return Number(fetchResult?.count || 0)
  } catch (error: any) {
    if (!account) {
      throw error
    }

    if (String(account?.password || '').trim()) {
      const recoverResult = await tauriInvoke('recover_and_fetch_external_mailbox', {
        mailboxId,
        token,
        serverUrl
      })
      markRecoveredMailboxAsPassword(mailboxId)
      await batchLoginAPI.updateMailboxStatus(mailboxId, 'active')
      return Number(recoverResult?.count || 0)
    }

    if (options.allowInteractiveReauth) {
      await openOAuthReauthorizeModal(account)
      throw new Error('__oauth_reauthorizing__')
    }

    throw error
  }
}

const normalizeMailboxEmail = (email: string) => (email || '').trim().toLowerCase()

const loadExternalMailboxAuthTypes = async () => {
  try {
    externalMailboxAuthTypeMap.value = {}

    const pageSize = 20
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      const response = await batchLoginAPI.getAccounts(page, pageSize)
      if (response.code !== 0) break

      const data = response.data || {}
      const list = Array.isArray(data) ? data : data.accounts || []
      syncMailboxAuthTypeMap(list)

      if (!Array.isArray(data) && data.pagination) {
        totalPages = Number(data.pagination.total_pages || 1)
      } else if (list.length < pageSize) {
        totalPages = page
      } else {
        totalPages = page + 1
      }

      page += 1
    }
  } catch (error) {
    console.error('加载外部邮箱认证类型失败:', error)
  }
}

const MAILBOX_TYPE_STORAGE_KEY = 'portal_home_mailbox_type'
const getSavedMailboxType = (): 'system' | 'external' | null => {
  try {
    const value = localStorage.getItem(MAILBOX_TYPE_STORAGE_KEY)
    return value === 'system' || value === 'external' ? value : null
  } catch {
    return null
  }
}
const saveMailboxType = (type: 'system' | 'external') => {
  try {
    localStorage.setItem(MAILBOX_TYPE_STORAGE_KEY, type)
  } catch {
    // ignore
  }
}

// 保存每个Tab的选中邮件
const systemSelectedEmail = ref<any>(null)
const externalSelectedEmail = ref<any>(null)

const normalizeIds = (ids: number[] = []) =>
  Array.from(
    new Set(
      ids.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
    )
  )

const isExternalEmailRecord = (email: any) =>
  Boolean(email) && String(email?.mailbox_type || '') === 'external'

const isSystemEmailRecord = (email: any) => Boolean(email) && !isExternalEmailRecord(email)

const clearSavedSelectedEmails = (matcher: (email: any) => boolean) => {
  if (matcher(systemSelectedEmail.value)) {
    systemSelectedEmail.value = null
  }
  if (matcher(externalSelectedEmail.value)) {
    externalSelectedEmail.value = null
  }
  if (matcher(mailStore.selectedEmail)) {
    mailStore.selectedEmail = null
  }
}

const handleSystemEmailsDeleted = (ids: number[] = []) => {
  const normalizedIds = normalizeIds(ids)
  if (!normalizedIds.length) return

  const idSet = new Set(normalizedIds)
  mailStore.removeEmails(normalizedIds)
  clearSavedSelectedEmails(
    (email) => isSystemEmailRecord(email) && idSet.has(Number(email?.id))
  )
}

const handleExternalEmailsDeleted = (ids: number[] = []) => {
  const normalizedIds = normalizeIds(ids)
  if (!normalizedIds.length) return

  const idSet = new Set(normalizedIds)
  removeExternalEmailsByIds(normalizedIds)
  clearSavedSelectedEmails(
    (email) => isExternalEmailRecord(email) && idSet.has(Number(email?.id))
  )
}

const handleSystemMailboxesDeleted = (ids: number[] = []) => {
  const normalizedIds = normalizeIds(ids)
  if (!normalizedIds.length) return

  const idSet = new Set(normalizedIds)
  mailboxStore.removeMailboxes(normalizedIds)
  mailStore.removeEmailsByMailboxIds(normalizedIds)
  if (selectedMailboxId.value && idSet.has(Number(selectedMailboxId.value))) {
    selectedMailboxId.value = null
  }
  clearSavedSelectedEmails(
    (email) => isSystemEmailRecord(email) && idSet.has(Number(email?.mailbox_id))
  )
}

const handleExternalMailboxesDeleted = (ids: number[] = []) => {
  const normalizedIds = normalizeIds(ids)
  if (!normalizedIds.length) return

  const idSet = new Set(normalizedIds)
  externalMailboxListRef.value?.removeAccounts?.(normalizedIds)
  removeExternalEmailsByMailboxIds(normalizedIds)
  selectedExternalMailboxIds.value = selectedExternalMailboxIds.value.filter(
    (id) => !idSet.has(Number(id))
  )
  clearSavedSelectedEmails(
    (email) => isExternalEmailRecord(email) && idSet.has(Number(email?.mailbox_id))
  )
}

// 批量模式互斥：邮箱批量开启时，关闭邮件批量
const handleMailboxBatchStart = () => {
  console.log('🔵 邮箱批量模式开启，关闭邮件批量模式')
  if (systemMailboxListRef.value?.cancelBatchMode) {
    systemMailboxListRef.value.cancelBatchMode()
  }
  if (externalMailboxListRef.value?.cancelBatchMode) {
    externalMailboxListRef.value.cancelBatchMode()
  }
  // 关闭系统邮件列表的批量模式
  if (systemEmailListRef.value?.cancelBatchMode) {
    systemEmailListRef.value.cancelBatchMode()
  }
  // 关闭外部邮件列表的批量模式
  if (externalEmailListRef.value?.cancelBatchMode) {
    externalEmailListRef.value.cancelBatchMode()
  }
}

// 切换邮箱类型
const switchMailboxType = (type: 'system' | 'external') => {
  currentView.value = 'emails'
  // 保存当前Tab的选中邮件
  if (mailboxType.value === 'system') {
    systemSelectedEmail.value = mailStore.selectedEmail
  } else {
    externalSelectedEmail.value = mailStore.selectedEmail
  }

  // 切换类型
  mailboxType.value = type
  saveMailboxType(type)

  // 恢复目标Tab的选中邮件
  if (type === 'system') {
    mailStore.selectedEmail = systemSelectedEmail.value
    // 切回系统邮箱时，确保自动刷新开启，停止外部收取
    if (!autoRefresh.isRunning.value) {
      autoRefresh.start()
    }
    externalAutoFetch.stop()
  } else {
    mailStore.selectedEmail = externalSelectedEmail.value

    // 切换到外部邮箱时，停止系统邮箱的自动刷新，启动外部自动收取
    autoRefresh.stop()
    if (!externalAutoFetch.isRunning.value) {
      externalAutoFetch.start()
    }

    // 加载外部邮箱列表
    if (externalMailboxListRef.value?.loadAccounts) {
      externalMailboxListRef.value.loadAccounts()
    }
    loadExternalMailboxAuthTypes()
    loadSmtpAccounts()

    // 加载所有外部邮件
    loadAllExternalEmails()

    // 只有第一次切换过来时收取一次，之后切换不再触发
    if (isTauri() && !fetchingExternalEmails.value && !externalInitialFetched.value) {
      externalInitialFetched.value = true
      fetchAllExternalEmails()
    }
  }
}

// 批量登录 - 打开添加账号弹窗
const handleBatchLogin = () => {
  if (!isTauri()) {
    openDesktopDownloadDialog('第三方邮箱仅支持桌面端添加和收取，是否下载桌面客户端？')
    return
  }
  showBatchAddModal.value = true
}

// OAuth2 授权登录（Outlook / Gmail）
const handleOAuth2Login = async (provider: string) => {
  try {
    const res = await batchLoginAPI.getOAuth2AuthUrl(provider)
    if (res.code === 0 && res.data?.auth_url) {
      // 打开授权页面（桌面端优先系统浏览器）
      if (isTauri()) {
        try {
          const { open } = await import('@tauri-apps/plugin-shell')
          await open(res.data.auth_url)
        } catch {
          window.open(res.data.auth_url, '_blank')
        }
      } else {
        window.open(res.data.auth_url, '_blank')
      }
      showMessage(`正在打开${provider === 'microsoft' ? 'Outlook' : 'Gmail'}授权页面...`, 'success')
    } else {
      showMessage(res.message || '获取授权链接失败', 'error')
    }
  } catch (e: any) {
    showMessage(e.message || '获取授权链接失败', 'error')
  }
}

// 处理分享邮箱
const handleShareMailboxes = (mailboxes: any[]) => {
  console.log('🔵 首页 - 处理分享邮箱', mailboxes)
  shareMailboxes.value = mailboxes
  shareMailboxIds.value = mailboxes.map((m) => m.id)
  showShareModal.value = true
}

// 关闭分享弹窗
const handleCloseShareModal = () => {
  showShareModal.value = false
  // 延迟重置，等待动画完成
  setTimeout(() => {
    shareMailboxIds.value = []
    shareMailboxes.value = []
  }, 300)
}

// 分享成功
const handleShareSuccess = (data: any) => {
  console.log('🔵 分享成功', data)
  showMessage('分享创建成功', 'success')
}

const loadSmtpAccounts = async () => {
  try {
    const response = await smtpAccountsAPI.getAccounts()
    if (response.code === 0) {
      smtpAccounts.value = response.data?.accounts || []
    }
  } catch (error) {
    console.error('获取 SMTP 账号列表失败:', error)
  }
}

// 打开发送邮件弹窗
const openSendEmailModal = async () => {
  // 先加载外部邮箱列表
  try {
    const response = await batchLoginAPI.getAccounts(1, 100)
    if (response.code === 0 && response.data) {
      externalMailboxList.value = response.data.accounts || []
      if (externalMailboxList.value.length === 0) {
        showMessage('请先添加第三方邮箱账号', 'error')
        return
      }
      showSendEmailModal.value = true
    }
  } catch (error) {
    console.error('获取邮箱列表失败:', error)
    showMessage('获取邮箱列表失败', 'error')
  }
}

// 邮件发送成功回调
const handleEmailSent = () => {
  // 刷新已发送邮件列表（如果有的话）
  if (selectedExternalMailboxId.value) {
    loadExternalMailboxEmails()
  } else {
    loadAllExternalEmails()
  }
}

// 批量添加账号
const handleBatchAddAccounts = async (accounts: any[]) => {
  batchLoginLoading.value = true

  // 初始化结果列表（全部邮箱）
  if (batchAddModalRef.value) {
    batchAddModalRef.value.initResults(accounts.map((a: any) => a.email))
  }

  // 清空待授权列表
  pendingOAuthAccounts.value = []

  try {
    let successCount = 0
    let failCount = 0
    let needDesktopDownload = false
    let shouldAutoCloseBatchAdd = false
    const pendingOAuthSet = new Set<string>()

    const normalizeEmail = (email: string) => (email || '').trim().toLowerCase()

    const isAlreadyAddedMessage = (message: string) => {
      const text = (message || '').toLowerCase()
      return (
        text.includes('已添加过') ||
        text.includes('无需重复添加') ||
        text.includes('already added') ||
        text.includes('already exists')
      )
    }

    const resolveErrorMessage = (error: any) =>
      normalizeOAuthRecoveryErrorMessage(
        error?.response?.data?.message || error?.message || String(error || '')
      )

    const fetchNewMailboxOnce = async (tauriInvoke: any, mailboxId: number, accountData: any) => {
      const host = accountData.protocol === 'imap' ? accountData.imap_host : accountData.pop3_host
      const port = accountData.protocol === 'imap' ? accountData.imap_port : accountData.pop3_port
      const token = localStorage.getItem('token') || ''
      const serverUrl = getServerUrl()

      const fetchResult = await tauriInvoke('fetch_emails', {
        mailboxId,
        email: accountData.email,
        password: accountData.password,
        protocol: accountData.protocol,
        host: host || null,
        port: port || null,
        token,
        serverUrl
      })

      await batchLoginAPI.updateMailboxStatus(mailboxId, 'active')
      return Number(fetchResult?.count || 0)
    }

    const markNoNeedOAuth = (email: string) => {
      successCount++
      if (batchAddModalRef.value) {
        batchAddModalRef.value.updateResult(email, 'success', '无需授权（已存在）')
      }
    }

    const enqueueOAuthPending = (email: string, provider: string) => {
      const key = `${provider}:${normalizeEmail(email)}`
      if (pendingOAuthSet.has(key)) return
      pendingOAuthSet.add(key)
      pendingOAuthAccounts.value.push({ email, provider })
    }

    // ========== OAuth Token 批量导入（4段格式：邮箱----密码----Client_ID----Refresh_Token） ==========
    const tokenAccounts = accounts.filter(
      (a: any) =>
        a.oauth_refresh_token &&
        a.oauth_client_id &&
        !!resolveOAuthProviderByEmail(a.email)
    )
    const normalAccounts = accounts.filter(
      (a: any) =>
        !(a.oauth_refresh_token && a.oauth_client_id && resolveOAuthProviderByEmail(a.email))
    )

    if (tokenAccounts.length > 0) {
      try {
        // 根据邮箱后缀推断 provider
        const importItems = tokenAccounts.map((account: any) => ({
            email: account.email,
            provider: resolveOAuthProviderByEmail(account.email),
            password: account.password,
            refresh_token: account.oauth_refresh_token,
            client_id: account.oauth_client_id
          }))

        const res = await batchLoginAPI.batchImportOAuth2(importItems)
        const importResults = res.data?.results || res.results || []
        const tauriInvoke = isTauri() ? await getTauriInvoke() : null

        for (const r of importResults) {
          if (r.success) {
            successCount++
            let fetchStatus = ''
            const mailboxId = Number(r.mailbox_id || 0)

            if (tauriInvoke && mailboxId > 0) {
              try {
                setExternalMailboxFetchingIds([mailboxId])
                const importedAccount =
                  tokenAccounts.find(
                    (item: any) => String(item.email || '').toLowerCase() === String(r.email || '').toLowerCase()
                  ) || null
                const newCount = await fetchOAuthMailboxOnceById(tauriInvoke, mailboxId, {
                  account: importedAccount
                })
                fetchStatus = `，首次收取完成（新增 ${newCount} 封）`
              } catch (fetchError: any) {
                const fetchErrorMessage = resolveErrorMessage(fetchError)
                try {
                  await batchLoginAPI.updateMailboxStatus(mailboxId, 'failed', fetchErrorMessage)
                } catch (statusError) {
                  console.error('更新 OAuth 邮箱收取状态失败:', statusError)
                }
                fetchStatus = '，首次收取失败'
              } finally {
                clearExternalMailboxFetchingIds()
              }
            }

            if (batchAddModalRef.value) {
              batchAddModalRef.value.updateResult(
                r.email,
                'success',
                `OAuth Token 导入成功${fetchStatus}`
              )
            }
          } else {
            failCount++
            if (batchAddModalRef.value) {
              batchAddModalRef.value.updateResult(r.email, 'error', r.error || 'Token 导入失败')
            }
          }
        }
      } catch (error: any) {
        // 批量接口整体失败，逐个标记
        for (const a of tokenAccounts) {
          failCount++
          if (batchAddModalRef.value) {
            batchAddModalRef.value.updateResult(a.email, 'error', resolveErrorMessage(error))
          }
        }
      }
    }

    // ========== 普通账号：走密码登录流程 ==========
    // 所有邮箱都先尝试密码登录
    for (const account of normalAccounts) {
      const domain = account.email.split('@')[1]?.toLowerCase()
      const oauthProvider = domain ? OAUTH2_DOMAINS[domain] : null

      try {
        // 传递完整的账号数据（包括协议和自定义服务器配置）
        const accountData: any = {
          email: account.email,
          password: account.password,
          protocol: account.protocol || 'imap' // Gmail/Outlook 默认用 imap
        }

        // 如果有自定义POP3配置
        if (account.pop3_host && account.pop3_port) {
          accountData.pop3_host = account.pop3_host
          accountData.pop3_port = account.pop3_port
        }

        // 如果有自定义IMAP配置
        if (account.imap_host && account.imap_port) {
          accountData.imap_host = account.imap_host
          accountData.imap_port = account.imap_port
        }

        // 判断是否在 Tauri 环境
        if (isTauri()) {
          // 桌面端：使用本地 IP 验证
          console.log('🟢 桌面端：使用本地 IP 验证邮箱')
          try {
            const tauriInvoke = await getTauriInvoke()
            if (!tauriInvoke) {
              throw new Error('Tauri API 尚未加载，请稍后重试')
            }

            // 调用 Tauri 命令验证邮箱
            const result = await tauriInvoke('add_external_mailbox', {
              email: accountData.email,
              password: accountData.password,
              protocol: accountData.protocol,
              host: accountData.protocol === 'imap' ? accountData.imap_host : accountData.pop3_host,
              port: accountData.protocol === 'imap' ? accountData.imap_port : accountData.pop3_port
            })

            // 检查登录是否真正成功
            if (!result.success) {
              throw new Error(result.message || '邮箱验证失败，请检查账号和密码')
            }

            console.log('✅ 本地验证成功:', result)

            // 用 Tauri 返回的实际协议和服务器信息更新 accountData
            if (result.protocol) {
              accountData.protocol = result.protocol
            }
            if (result.host && result.port) {
              if (accountData.protocol === 'imap') {
                accountData.imap_host = result.host
                accountData.imap_port = result.port
              } else {
                accountData.pop3_host = result.host
                accountData.pop3_port = result.port
              }
            }

            // 验证成功，调用后端 API 保存到数据库（跳过服务器端验证）
            const response = await batchLoginAPI.addAccount({ ...accountData, skip_verify: true })
            if (response.code === 0) {
              successCount++
              const mailboxId = Number(response.data?.mailbox_id || 0)

              let canSend = false
              if (result.smtp_verified) {
                try {
                  await smtpAccountsAPI.addAccount({
                    email: accountData.email,
                    password: accountData.password,
                    smtp_host: result.smtp_host,
                    smtp_port: result.smtp_port
                  })
                } catch (error) {}
              }

              try {
                const smtpAccountsResponse = await smtpAccountsAPI.getAccounts()
                const smtpAccounts =
                  smtpAccountsResponse.code === 0 ? smtpAccountsResponse.data?.accounts || [] : []
                canSend = smtpAccounts.some(
                  (item: any) =>
                    normalizeSmtpEmail(item?.email) === normalizeSmtpEmail(accountData.email) &&
                    canDesktopSmtpSend(item)
                )
              } catch (error) {
                canSend = false
              }

              const smtpStatus = canSend ? '能收能发' : '能收不能发'
              let fetchStatus = ''

              if (mailboxId > 0) {
                try {
                  const newCount = await fetchNewMailboxOnce(tauriInvoke, mailboxId, accountData)
                  fetchStatus = `，首次收取完成（新增 ${newCount} 封）`
                } catch (fetchError: any) {
                  const fetchErrorMessage = resolveErrorMessage(fetchError)
                  try {
                    await batchLoginAPI.updateMailboxStatus(mailboxId, 'failed', fetchErrorMessage)
                  } catch (statusError) {
                    console.error('更新邮箱收取状态失败:', statusError)
                  }
                  fetchStatus = `，首次收取失败`
                }
              }

              if (batchAddModalRef.value) {
                batchAddModalRef.value.updateResult(
                  account.email,
                  'success',
                  `本地验证成功（${smtpStatus}）${fetchStatus}`
                )
              }
            } else {
              const responseMessage = response.message || ''
              if (isAlreadyAddedMessage(responseMessage)) {
                markNoNeedOAuth(account.email)
              } else {
                failCount++
                if (batchAddModalRef.value) {
                  batchAddModalRef.value.updateResult(account.email, 'error', response.message)
                }
              }
            }
          } catch (error: any) {
            console.error('❌ 桌面端验证失败:', error)
            // 如果是 OAuth2 邮箱，加入待授权列表
            if (oauthProvider) {
              const errorMessage = resolveErrorMessage(error)
              if (isAlreadyAddedMessage(errorMessage)) {
                markNoNeedOAuth(account.email)
              } else {
                enqueueOAuthPending(account.email, oauthProvider)
                if (batchAddModalRef.value) {
                  batchAddModalRef.value.updateResult(
                    account.email,
                    'error',
                    '密码登录失败，需要OAuth2授权'
                  )
                }
              }
            } else {
              failCount++
              if (batchAddModalRef.value) {
                batchAddModalRef.value.updateResult(
                  account.email,
                  'error',
                  resolveErrorMessage(error)
                )
              }
            }
          }
        } else {
          // Web 端
          if (oauthProvider) {
            console.log('🔵 Web 端：OAuth2 邮箱直接走授权')
            enqueueOAuthPending(account.email, oauthProvider)
            if (batchAddModalRef.value) {
              batchAddModalRef.value.updateResult(account.email, 'error', '需要 OAuth2 授权')
            }
          } else {
            // 普通邮箱：Web 端不支持，提示下载桌面端
            console.log('🔴 Web 端：普通邮箱需要桌面端验证')
            failCount++
            needDesktopDownload = true
            if (batchAddModalRef.value) {
              batchAddModalRef.value.updateResult(account.email, 'error', '需下载桌面端添加')
            }
          }
        }
      } catch (error: any) {
        console.error(`添加账号 ${account.email} 失败:`, error)
        // 如果是 OAuth2 邮箱，加入待授权列表
        if (oauthProvider) {
          const errorMessage = resolveErrorMessage(error)
          if (isAlreadyAddedMessage(errorMessage)) {
            markNoNeedOAuth(account.email)
          } else {
            enqueueOAuthPending(account.email, oauthProvider)
            if (batchAddModalRef.value) {
              batchAddModalRef.value.updateResult(
                account.email,
                'error',
                '密码登录失败，需要OAuth2授权'
              )
            }
          }
        } else {
          failCount++
          if (batchAddModalRef.value) {
            batchAddModalRef.value.updateResult(account.email, 'error', resolveErrorMessage(error))
          }
        }
      }
    }

    // 如果有需要 OAuth2 授权的邮箱，在同一个弹窗内显示授权列表
    if (pendingOAuthAccounts.value.length > 0) {
      if (batchAddModalRef.value?.addOAuthAccounts) {
        batchAddModalRef.value.addOAuthAccounts(pendingOAuthAccounts.value)
      }
    }

    // 显示结果
    if (successCount > 0) {
      showMessage(`添加成功 ${successCount} 个邮箱`, 'success')
    }

    // 如果有普通邮箱需要桌面端，提示下载
    if (needDesktopDownload) {
      openDesktopDownloadDialog('普通邮箱需要桌面端添加和收取，是否下载桌面客户端？')
    }

    // 刷新列表
    if (successCount > 0 && externalMailboxListRef.value?.loadAccounts) {
      await externalMailboxListRef.value.loadAccounts()
    }
    if (successCount > 0 && mailboxType.value === 'external' && currentView.value === 'emails') {
      if (selectedExternalMailboxId.value) {
        await loadExternalMailboxEmails()
      } else {
        await loadAllExternalEmails()
      }
    }
    if (successCount > 0) {
      await loadSmtpAccounts()
    }
    if (successCount > 0 && sendEmailPanelRef.value?.loadData) {
      await sendEmailPanelRef.value.loadData()
    }

    shouldAutoCloseBatchAdd =
      accounts.length > 0
      && successCount === accounts.length
      && failCount === 0
      && pendingOAuthAccounts.value.length === 0
      && !needDesktopDownload

    if (shouldAutoCloseBatchAdd) {
      window.setTimeout(() => {
        if (showBatchAddModal.value) {
          showBatchAddModal.value = false
        }
      }, 900)
    }
  } catch (error) {
    console.error('批量添加账号失败:', error)
    showMessage('批量添加账号失败', 'error')
  } finally {
    batchLoginLoading.value = false
  }
}

// OAuth2 授权完成的回调
const handleOAuth2Complete = async (result: { successCount: number; failCount: number; accounts?: any[] }) => {
  showBatchAddModal.value = false
  pendingOAuthAccounts.value = []
  pendingOAuthBootstrapEmails.value = Array.isArray(result.accounts)
    ? result.accounts
        .filter((item: any) => item?.status === 'success' && item?.email)
        .map((item: any) => normalizeMailboxEmail(item.email))
    : []

  if (result.successCount > 0) {
    showMessage(`OAuth2授权完成: ${result.successCount} 个成功`, 'success')

    // 刷新邮箱列表
    if (externalMailboxListRef.value?.loadAccounts) {
      await externalMailboxListRef.value.loadAccounts()
    }
    await loadSmtpAccounts()
    await loadExternalMailboxAuthTypes()

    // 桌面端首次授权后自动收取一次邮件
    if (isTauri() && !fetchingExternalEmails.value) {
      fetchAllExternalEmails()
    }
  } else if (result.failCount > 0) {
    pendingOAuthBootstrapEmails.value = []
    showMessage(`OAuth2授权失败: ${result.failCount} 个`, 'error')
  }
}

// 批量模式互斥：邮件批量开启时，关闭邮箱批量
const handleEmailBatchStart = () => {
  console.log('🔵 邮件批量模式开启，关闭邮箱批量模式')
  if (systemEmailListRef.value?.cancelBatchMode) {
    systemEmailListRef.value.cancelBatchMode()
  }
  if (externalEmailListRef.value?.cancelBatchMode) {
    externalEmailListRef.value.cancelBatchMode()
  }
  // 关闭系统邮箱列表的批量模式
  if (systemMailboxListRef.value?.cancelBatchMode) {
    systemMailboxListRef.value.cancelBatchMode()
  }
  // 关闭外部邮箱列表的批量模式
  if (externalMailboxListRef.value?.cancelBatchMode) {
    externalMailboxListRef.value.cancelBatchMode()
  }
}

const SYSTEM_EMAIL_REFRESH_INTERVAL = 5
const MANUAL_REFRESH_MIN_SPIN_MS = 1200

const refreshSystemEmails = async (options?: { minSpinMs?: number }) => {
  if (refreshingSystemEmails.value) {
    return
  }

  refreshingSystemEmails.value = true
  const refreshStartedAt = Date.now()

  try {
    if (mailboxType.value !== 'system') {
      return
    }

    // 登录用户
    if (userStore.isAuthenticated) {
      const params: any = {
        page: mailStore.currentPage,
        page_size: 20,
        ...(showOnlyUnread.value ? { unread: true } : {})
      }
      // 保持搜索关键词
      if (mailStore.searchKeyword) params.search = mailStore.searchKeyword
      if (selectedMailboxId.value) {
        await mailStore.fetchMailboxEmails(selectedMailboxId.value, params, true)
      } else {
        await mailStore.fetchUserEmails(
          mailStore.currentPage,
          20,
          true,
          showOnlyUnread.value || undefined,
          mailStore.searchKeyword || undefined
        )
      }
    } else if (mailboxStore.tempMailbox?.id) {
      // 临时用户：用临时邮箱接口刷新
      try {
        const res = await mailboxAPI.getTempMailboxEmails(mailboxStore.tempMailbox.id)
        if (res.code === 0 && res.data) {
          mailStore.emails = res.data.emails || []
        }
      } catch (e) {
        // 静默失败
      }
    }

    // 刷新邮箱标签（可能有新邮件触发了新站点识别）
    systemMailboxListRef.value?.loadTagsData?.()
  } finally {
    const minSpinMs = options?.minSpinMs || 0
    const elapsed = Date.now() - refreshStartedAt
    if (elapsed < minSpinMs) {
      await new Promise((resolve) => setTimeout(resolve, minSpinMs - elapsed))
    }
    refreshingSystemEmails.value = false
  }
}

const handleImmediateRefreshSystemEmails = async () => {
  hideRefreshTooltip()
  autoRefresh.restart()
  await refreshSystemEmails({ minSpinMs: MANUAL_REFRESH_MIN_SPIN_MS })
}

const showRefreshTooltipPopover = () => {
  if (refreshingSystemEmails.value || !refreshButtonRef.value) {
    return
  }

  const rect = refreshButtonRef.value.getBoundingClientRect()
  refreshTooltipStyle.value = {
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.top - 8}px`,
    transform: 'translate(-50%, -100%)'
  }
  showRefreshTooltip.value = true
}

const hideRefreshTooltip = () => {
  showRefreshTooltip.value = false
}

const removeExternalEmailsByIds = (ids: number[] = []) => {
  const idSet = new Set(
    ids.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
  )
  if (!idSet.size) return

  const originalCount = externalEmails.value.length
  externalEmails.value = externalEmails.value.filter((email: any) => !idSet.has(Number(email?.id)))
  const removedCount = originalCount - externalEmails.value.length

  if (selectedExternalEmailId.value && idSet.has(Number(selectedExternalEmailId.value))) {
    selectedExternalEmailId.value = null
  }
  if (mailStore.selectedEmail && idSet.has(Number(mailStore.selectedEmail.id))) {
    mailStore.selectedEmail = null
  }

  if (removedCount > 0) {
    externalEmailTotal.value = Math.max(0, externalEmailTotal.value - removedCount)
  }
}

const removeExternalEmailsByMailboxIds = (mailboxIds: number[] = []) => {
  const idSet = new Set(
    mailboxIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
  )
  if (!idSet.size) return

  const originalCount = externalEmails.value.length
  externalEmails.value = externalEmails.value.filter(
    (email: any) => !idSet.has(Number(email?.mailbox_id))
  )
  const removedCount = originalCount - externalEmails.value.length

  if (selectedExternalMailboxId.value && idSet.has(Number(selectedExternalMailboxId.value))) {
    selectedExternalMailboxId.value = null
    selectedExternalAuthType.value = 'password'
  }
  if (
    mailStore.selectedEmail &&
    String(mailStore.selectedEmail.mailbox_type || '') === 'external' &&
    idSet.has(Number(mailStore.selectedEmail.mailbox_id))
  ) {
    mailStore.selectedEmail = null
  }
  if (
    selectedExternalEmailId.value &&
    !externalEmails.value.some((email: any) => Number(email?.id) === Number(selectedExternalEmailId.value))
  ) {
    selectedExternalEmailId.value = null
  }

  if (removedCount > 0) {
    externalEmailTotal.value = Math.max(0, externalEmailTotal.value - removedCount)
  }
}

const applySystemMailboxListResult = (result: any) => {
  mailboxStore.replaceMailboxes(result?.items || [], result?.pagination)
}

const applyExternalMailboxListResult = (result: any) => {
  externalMailboxListRef.value?.replaceAccounts?.(result?.items || [], result?.pagination)
}

const applySystemEmailListResult = (result: any, mailboxId?: number | null) => {
  mailStore.replaceEmails(result?.items || [], result?.pagination)
  if (mailboxId !== undefined) {
    selectedMailboxId.value = mailboxId || null
  }
  mailboxType.value = 'system'
  currentView.value = 'emails'
}

const applyExternalEmailListResult = (result: any, mailboxId?: number | null) => {
  externalEmails.value = Array.isArray(result?.items) ? [...result.items] : []
  externalEmailPage.value = Number(result?.pagination?.page || 1)
  externalEmailPageSize.value = Number(
    result?.pagination?.page_size || externalEmailPageSize.value || 20
  )
  externalEmailTotal.value = Number(result?.pagination?.total || externalEmails.value.length)
  if (mailboxId !== undefined) {
    selectedExternalMailboxId.value = mailboxId || null
    if (mailboxId) {
      selectedExternalAuthType.value = externalMailboxAuthTypeMap.value[mailboxId] || 'password'
    }
  }
  mailboxType.value = 'external'
  currentView.value = 'emails'
}

const applyEmailDetailResult = (result: any, mailboxTypeValue: 'system' | 'external') => {
  if (!result?.id) return

  mailStore.selectedEmail = result
  currentView.value = 'emails'

  if (mailboxTypeValue === 'external') {
    mailboxType.value = 'external'
    selectedExternalEmailId.value = Number(result.id)
    if (result.mailbox_id) {
      selectedExternalMailboxId.value = Number(result.mailbox_id)
      selectedExternalAuthType.value =
        externalMailboxAuthTypeMap.value[Number(result.mailbox_id)] || selectedExternalAuthType.value
    }
    return
  }

  mailboxType.value = 'system'
  if (result.mailbox_id) {
    selectedMailboxId.value = Number(result.mailbox_id)
  }
}

const aiToolUiHandlers: Record<string, (item: any) => void> = {
  'mailboxes.create': (item) => {
    if (item?.result?.id) {
      mailboxStore.upsertMailboxes([item.result])
    }
  },
  'mailboxes.list': (item) => {
    applySystemMailboxListResult(item?.result)
    mailboxType.value = 'system'
    currentView.value = 'emails'
  },
  'mailboxes.delete': (item) => {
    const mailboxIds = extractToolIds(item, 'mailbox_id', 'mailbox_ids')
    handleSystemMailboxesDeleted(mailboxIds)
  },
  'external_mailboxes.list': (item) => {
    applyExternalMailboxListResult(item?.result)
    mailboxType.value = 'external'
    currentView.value = 'emails'
  },
  'external_mailboxes.delete': (item) => {
    const mailboxIds = extractToolIds(item, 'mailbox_id', 'mailbox_ids')
    handleExternalMailboxesDeleted(mailboxIds)
  },
  'emails.list': (item) => {
    const mailboxTypeValue = extractMailboxType(item)
    const mailboxId = Number(item?.arguments?.mailbox_id || item?.result?.mailbox_id || 0) || null
    if (mailboxTypeValue === 'external') {
      applyExternalEmailListResult(item?.result, mailboxId)
      return
    }
    applySystemEmailListResult(item?.result, mailboxId)
  },
  'emails.detail': (item) => {
    applyEmailDetailResult(item?.result, extractMailboxType(item))
  },
  'emails.delete': (item) => {
    const emailIds = extractToolIds(item, 'email_id', 'email_ids')
    if (extractMailboxType(item) === 'external') {
      handleExternalEmailsDeleted(emailIds)
      return
    }
    handleSystemEmailsDeleted(emailIds)
  },
  'verification_codes.latest': (item) => {
    const detail = item?.result?.email_detail
    if (detail?.id) {
      applyEmailDetailResult(detail, extractMailboxType(item))
    }
  },
  'verification_codes.detail': (item) => {
    applyEmailDetailResult(item?.result, extractMailboxType(item))
  }
}

const handleAIUiSyncEvent = (event: Event) => {
  const detail = (event as CustomEvent<any>)?.detail
  const toolTrace = normalizeAIToolTrace(detail)
  if (!toolTrace.length) return

  for (const item of toolTrace) {
    if (item?.needs_confirmation || !item?.result || item?.result?.blocked) {
      continue
    }
    const handler = aiToolUiHandlers[String(item?.name || '')]
    if (handler) {
      handler(item)
    }
  }
}

// 自动刷新（10秒）- 只在系统邮箱Tab时才刷新
const autoRefresh = useAutoRefresh(async () => {
  await refreshSystemEmails()
}, SYSTEM_EMAIL_REFRESH_INTERVAL)

// 第三方邮箱自动收取（10分钟）
const externalAutoFetch = useAutoRefresh(async () => {
  if (!isTauri()) return
  if (mailboxType.value !== 'external') return
  if (!userStore.isAuthenticated) return
  if (fetchingExternalEmails.value) return
  if (currentView.value === 'send-email') return

  await fetchAllExternalEmails()
  externalMailboxListRef.value?.loadTagsData?.()
}, 600)

// 页面加载时获取数据并启动自动刷新
onMounted(async () => {
  window.addEventListener('external-mailbox-recovered', handleRecoveredMailboxEvent as EventListener)
  window.addEventListener(AI_UI_SYNC_EVENT, handleAIUiSyncEvent as EventListener)

  if (userStore.isAuthenticated) {
    // 加载邮箱列表
    await mailboxStore.fetchMailboxes()
    // 同时加载所有邮件（不选择特定邮箱）
    await mailStore.fetchUserEmails()
    await loadSmtpAccounts()

    // 恢复上次使用的 Tab（临时邮箱 / 第三方邮箱）
    const savedMailboxType = getSavedMailboxType()
    if (savedMailboxType) {
      switchMailboxType(savedMailboxType)
    } else {
      saveMailboxType(mailboxType.value)
    }
  } else {
    // 未登录也写默认值，避免首次进入没有偏好
    saveMailboxType(mailboxType.value)
    autoRefresh.start()
    return
  }

  // 按恢复后的 Tab 启动对应刷新器
  if (mailboxType.value === 'external') {
    autoRefresh.stop()
    if (!externalAutoFetch.isRunning.value) {
      externalAutoFetch.start()
    }
    await loadExternalMailboxAuthTypes()
  } else {
    externalAutoFetch.stop()
    if (!autoRefresh.isRunning.value) {
      autoRefresh.start()
    }
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('external-mailbox-recovered', handleRecoveredMailboxEvent as EventListener)
  window.removeEventListener(AI_UI_SYNC_EVENT, handleAIUiSyncEvent as EventListener)
})

// 申请免费邮箱
const allocateMailbox = async () => {
  const result = await mailboxStore.allocateMailbox()
  if (result.success) {
    // 刷新用户信息以更新剩余邮箱数量
    await userStore.updateUserProfile()
  }
  showMessage(
    result.success ? '邮箱申请成功' : result.error || '申请失败',
    result.success ? 'success' : 'error'
  )
}

// 选择系统邮箱
const handleSelectMailbox = async (mailbox: any) => {
  selectedMailboxId.value = mailbox.id
  mailStore.selectedEmail = null
  mailStore.currentPage = 1
  const params = {
    page: 1,
    page_size: 20,
    ...(showOnlyUnread.value ? { unread: true } : {})
  }
  await mailStore.fetchMailboxEmails(mailbox.id, params)
}

// 选择外部邮箱
const handleSelectExternalMailbox = async (account: any) => {
  // 写邮件模式下支持多选/反选
  if (currentView.value === 'send-email') {
    const idx = selectedExternalMailboxIds.value.indexOf(account.id)
    if (idx > -1) {
      selectedExternalMailboxIds.value.splice(idx, 1)
    } else {
      selectedExternalMailboxIds.value.push(account.id)
    }
    // 同步更新单选 ID（用于左侧高亮等）
    selectedExternalMailboxId.value =
      selectedExternalMailboxIds.value.length > 0
        ? selectedExternalMailboxIds.value[selectedExternalMailboxIds.value.length - 1]
        : null
    return
  }
  selectedExternalMailboxId.value = account.id
  const authType = String(
    account?.auth_type || externalMailboxAuthTypeMap.value[account.id] || 'password'
  ).toLowerCase()
  selectedExternalAuthType.value = authType
  externalMailboxAuthTypeMap.value[account.id] = authType
  externalEmailPage.value = 1
  currentView.value = 'emails'
  mailStore.selectedEmail = null
  await loadExternalMailboxEmails()
  externalEmailListRef.value?.scrollToTop?.()
}

const handleRecoveredMailboxEvent = (event: Event) => {
  const customEvent = event as CustomEvent<{ mailboxId?: number }>
  const mailboxId = Number(customEvent?.detail?.mailboxId || 0)
  if (!mailboxId) return
  externalMailboxAuthTypeMap.value[mailboxId] = 'password'
  if (selectedExternalMailboxId.value === mailboxId) {
    selectedExternalAuthType.value = 'password'
  }
}

const handleOAuthMailboxReauthorize = async (account: any) => {
  try {
    await openOAuthReauthorizeModal(account)
  } catch (error: any) {
    showMessage(error?.message || '打开重新授权窗口失败', 'error')
  }
}

// 移除 SendEmailPanel 中的账号
const handleRemoveAccountFromPanel = (id: number) => {
  if (externalMailboxListRef.value?.isBatchMode) {
    if (externalMailboxListRef.value?.toggleSelection) {
      externalMailboxListRef.value.toggleSelection(id)
    }
  } else {
    if (selectedExternalMailboxId.value === id) {
      selectedExternalMailboxId.value = null
    }
  }
}

// 加载外部邮箱邮件列表（带分页）
const loadExternalMailboxEmails = async () => {
  if (!selectedExternalMailboxId.value) return

  try {
    const mailboxId = Number(selectedExternalMailboxId.value)
    const response = await batchLoginAPI.getExternalEmails(
      externalEmailPage.value,
      externalEmailPageSize.value,
      mailboxId
    )

    if (response.code === 0 && response.data) {
      externalEmails.value = response.data.emails || []
      externalEmailTotal.value = response.data.pagination?.total || 0

      // 空列表不弹 toast，避免和邮箱收取失败的红色错误同时出现造成误导
    } else {
      const msg = response.message || '加载邮件失败'
      // 仅在邮箱不存在/无权限时清空，其他错误保留已有列表
      if (msg.includes('邮箱不存在') || msg.includes('无权限')) {
        externalEmails.value = []
        externalEmailTotal.value = 0
        selectedExternalMailboxId.value = null
        selectedExternalAuthType.value = 'password'
        selectedExternalEmailId.value = null
        clearSavedSelectedEmails(
          (email) =>
            isExternalEmailRecord(email) && Number(email?.mailbox_id) === Number(mailboxId)
        )
        await loadAllExternalEmails()
      }
      showMessage(msg, 'error')
    }
  } catch (error) {
    console.error('❌ 获取外部邮箱邮件失败:', error)
    // 请求失败时保留已有邮件列表，不清空
    showMessage('加载邮件失败', 'error')
  }
}

// 外部邮件分页切换
const handleExternalEmailPageChange = async (page: number) => {
  externalEmailPage.value = page

  // 根据是否选中邮箱决定加载方式
  if (selectedExternalMailboxId.value) {
    await loadExternalMailboxEmails()
  } else {
    await loadAllExternalEmails()
  }
}

// 手动收取外部邮箱邮件
const fetchExternalMailboxEmails = async () => {
  if (!selectedExternalMailboxId.value) return

  fetchingExternalEmails.value = true
  try {
    if (!isTauri()) {
      showMessage('仅支持桌面端本地收取', 'warning')
      return
    }

    showMessage('正在收取邮件...', 'primary', 0)

    // 桌面端：统一走本地 Tauri 收取；OAuth2 只向后端拿 token
    const mailboxId = selectedExternalMailboxId.value
    let newCount = 0
    setExternalMailboxFetchingIds([mailboxId])

    if (selectedExternalAuthType.value === 'oauth2') {
      // OAuth2 邮箱：先获取 token，再走本地 IMAP XOAUTH2
      const tauriInvoke = await getTauriInvoke()
      if (!tauriInvoke) {
        showMessage('桌面端能力未就绪，请稍后重试', 'error')
        return
      }

      try {
        const account = await loadExternalMailboxAccountById(mailboxId)
        newCount = await fetchOAuthMailboxOnceById(tauriInvoke, mailboxId, {
          account,
          allowInteractiveReauth: true
        })
      } catch (e: any) {
        const rawMsg = normalizeOAuthRecoveryErrorMessage(
          typeof e === 'string' ? e : e?.message || '收取失败'
        )
        if (rawMsg === '__oauth_reauthorizing__') {
          return
        }
        await batchLoginAPI.updateMailboxStatus(mailboxId, 'failed', rawMsg)
        showMessage('收取失败: ' + rawMsg, 'error')
        if (externalMailboxListRef.value?.loadAccounts) {
          externalMailboxListRef.value.loadAccounts()
        }
        return
      }
    } else {
      // 非 OAuth2 邮箱：走本地 Tauri
      const tauriInvoke = await getTauriInvoke()
      if (!tauriInvoke) {
        showMessage('桌面端能力未就绪，请稍后重试', 'error')
        return
      }

      // 获取选中邮箱的详细信息
      const res = await batchLoginAPI.getAccounts(1, 100)
      const accountList = res.code === 0 ? res.data?.accounts || [] : []
      const account = accountList.find((a: any) => a.id === mailboxId)
      if (!account) {
        showMessage('未找到该邮箱信息', 'error')
        return
      }

      const host = account.protocol === 'imap' ? account.imap_host : account.pop3_host
      const port = account.protocol === 'imap' ? account.imap_port : account.pop3_port
      const token = localStorage.getItem('token') || ''
      const serverUrl = getServerUrl()

      try {
        const result = await tauriInvoke('fetch_emails', {
          mailboxId: account.id,
          email: account.email,
          password: account.password,
          protocol: account.protocol,
          host: host || null,
          port: port || null,
          token,
          serverUrl
        })
        newCount = Number(result?.count || 0)
        await batchLoginAPI.updateMailboxStatus(mailboxId, 'active')
      } catch (e: any) {
        const rawMsg = typeof e === 'string' ? e : e?.message || '收取失败'
        await batchLoginAPI.updateMailboxStatus(mailboxId, 'failed', rawMsg)
        showMessage('收取失败: ' + rawMsg, 'error')
        if (externalMailboxListRef.value?.loadAccounts) {
          externalMailboxListRef.value.loadAccounts()
        }
        return
      }
    }

    // 收取成功，刷新列表
    await new Promise((resolve) => setTimeout(resolve, 500))
    externalEmailPage.value = 1
    await loadExternalMailboxEmails()
    showMessage(`收取成功，新增 ${newCount} 封邮件`, 'success')
    if (externalMailboxListRef.value?.loadAccounts) {
      externalMailboxListRef.value.loadAccounts()
    }
  } catch (error: any) {
    console.error('❌ 收取邮件失败:', error)
    const errorMsg = error.response?.data?.message || error.message || '网络错误'
    showMessage('收取邮件失败: ' + errorMsg, 'error')

    if (externalMailboxListRef.value?.loadAccounts) {
      externalMailboxListRef.value.loadAccounts()
    }
  } finally {
    fetchingExternalEmails.value = false
    clearExternalMailboxFetchingIds()
  }
}

// 选择外部邮件
const handleSelectExternalEmail = async (email: any) => {
  selectedExternalEmailId.value = email.id
  mailStore.selectEmail(email)

  // 获取完整详情（含附件）
  const result = await mailStore.fetchEmailDetail(email.id, 'external')
  if (!result.success) {
    showMessage(result.error || '邮件不存在或无权访问', 'error')
    selectedExternalEmailId.value = null
    mailStore.selectedEmail = null
    return
  }

  // 标记为已读
  if (!email.is_read) {
    try {
      await unifiedAPI.markEmailRead(email.id, 'external')
      email.is_read = true
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }
}

// 切换外部邮件未读筛选
const toggleExternalUnread = () => {
  showOnlyUnreadExternal.value = !showOnlyUnreadExternal.value
  // 重新加载邮件
  if (selectedExternalMailboxId.value) {
    handleSelectExternalMailbox({ id: selectedExternalMailboxId.value })
  } else {
    loadAllExternalEmails()
  }
}

// 加载所有外部邮箱的所有邮件
const loadAllExternalEmails = async () => {
  try {
    const response = await batchLoginAPI.getExternalEmails(
      externalEmailPage.value,
      externalEmailPageSize.value,
      null // 不传 mailboxId，获取所有外部邮件
    )

    if (response.code === 0 && response.data) {
      externalEmails.value = response.data.emails || []
      externalEmailTotal.value = response.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('❌ 加载所有外部邮件失败:', error)
    // 请求失败时保留已有邮件列表，不清空
  }
}

// 收取所有外部邮箱的邮件
const fetchAllExternalEmails = async () => {
  // Web 端不支持“收取全部”
  if (!isTauri()) return

  // 防止重复点击
  if (fetchingExternalEmails.value) {
    return
  }

  // 立即显示收取中状态(不显示提示,避免重复)
  fetchingExternalEmails.value = true

  try {
    const tauriInvoke = await getTauriInvoke()
    if (!tauriInvoke) {
      showMessage('桌面端能力未就绪，请稍后重试', 'error')
      return
    }

    // 桌面端：逐个邮箱本地收取
    const res: any = await batchLoginAPI.getAllAccounts(100, {
      suppressErrorMessage: true
    })
    const accountList = res.code === 0 ? res.data?.accounts || [] : []
    if (accountList.length === 0) {
      fetchingExternalEmails.value = false
      return
    }

    showMessage('正在收取邮件...', 'primary', 0)

    let totalNew = 0
    let failCount = 0
    const bootstrapOAuthEmailSet = new Set(pendingOAuthBootstrapEmails.value)

    const friendlyError = (msg: string) => {
      if (!msg) return '收取失败'
      if (msg.includes('Unsafe Login') || msg.includes('unsafe login'))
        return '登录被拒绝，请检查授权码或邮箱IMAP设置'
      if (
        msg.includes('auth') ||
        msg.includes('AUTH') ||
        msg.includes('password') ||
        msg.includes('授权')
      )
        return '授权码错误或已失效'
      if (msg.includes('Connection') || msg.includes('connect') || msg.includes('timeout'))
        return '连接超时，请检查网络'
      if (msg.includes('Unable to parse')) return '服务器响应异常，请稍后重试'
      if (msg.length > 30) return msg.substring(0, 30) + '...'
      return msg
    }
    const token = localStorage.getItem('token') || ''
    const serverUrl = getServerUrl()
    setExternalMailboxFetchingIds(accountList.map((account: any) => account.id))

    const results = await runPromisePool<any, { success: boolean; newCount: number }>(
      accountList,
      EXTERNAL_FETCH_ALL_CONCURRENCY,
      async (account: any) => {
        try {
          if (account.auth_type === 'oauth2') {
            console.log('[ExternalFetch] desktop oauth2 local fetch start', {
              mailboxId: account.id,
              email: account.email,
              provider: account.oauth_provider
            })
            const newCount = await fetchOAuthMailboxOnceById(tauriInvoke, account.id, {
              account
            })
            bootstrapOAuthEmailSet.delete(normalizeMailboxEmail(account.email))
            console.log('[ExternalFetch] desktop oauth2 local fetch result', {
              mailboxId: account.id,
              email: account.email,
              count: newCount
            })
            return { success: true, newCount }
          }

          const host = account.protocol === 'imap' ? account.imap_host : account.pop3_host
          const port = account.protocol === 'imap' ? account.imap_port : account.pop3_port

          const result: any = await tauriInvoke('fetch_emails', {
            mailboxId: account.id,
            email: account.email,
            password: account.password,
            protocol: account.protocol,
            host: host || null,
            port: port || null,
            token,
            serverUrl
          })
          await batchLoginAPI.updateMailboxStatus(account.id, 'active')
          return { success: true, newCount: Number(result.count || 0) }
        } catch (e: any) {
          console.error(`收取 ${account.email} 失败:`, e)
          const rawMsg = normalizeOAuthRecoveryErrorMessage(
            typeof e === 'string' ? e : e?.message || '收取失败'
          )
          const normalizedEmail = normalizeMailboxEmail(account.email)
          const shouldRemoveBootstrapOAuth =
            account.auth_type === 'oauth2' && bootstrapOAuthEmailSet.has(normalizedEmail)

          if (shouldRemoveBootstrapOAuth) {
            bootstrapOAuthEmailSet.delete(normalizedEmail)
            try {
              await batchLoginAPI.deleteAccount(account.id)
              externalMailboxListRef.value?.removeAccounts?.([account.id])
              removeExternalEmailsByMailboxIds([account.id])
            } catch (deleteError) {
              console.error(`删除首次接入失败的 OAuth 邮箱 ${account.email} 失败:`, deleteError)
              await (batchLoginAPI as any).updateMailboxStatus(
                account.id,
                'failed',
                friendlyError(rawMsg)
              )
            }
          } else {
            await (batchLoginAPI as any).updateMailboxStatus(
              account.id,
              'failed',
              friendlyError(rawMsg)
            )
          }
          return { success: false, newCount: 0 }
        } finally {
          removeExternalMailboxFetchingIds([account.id])
        }
      }
    )

    for (const result of results) {
      totalNew += result.newCount || 0
      if (!result.success) {
        failCount++
      }
    }

    if (failCount === 0) {
      if (totalNew > 0) {
        showMessage(`收取成功，新增 ${totalNew} 封邮件`, 'success')
      } else {
        showMessage('收取完成，暂无新邮件', 'success')
      }
    } else {
      showMessage(`收取完成，新增 ${totalNew} 封，${failCount} 个邮箱失败`, 'warning')
    }

    // 收取成功后立即刷新邮件列表
    if (selectedExternalMailboxId.value) {
      // 如果选中了特定邮箱，刷新该邮箱的邮件
      externalEmailPage.value = 1
      await loadExternalMailboxEmails()
    } else {
      // 否则刷新所有外部邮件
      await loadAllExternalEmails()
    }

    // 刷新邮箱列表状态
    if (externalMailboxListRef.value?.loadAccounts) {
      await externalMailboxListRef.value.loadAccounts()
    }
  } catch (error: any) {
    console.error('收取失败:', error)
    showMessage('收取失败: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    pendingOAuthBootstrapEmails.value = []
    fetchingExternalEmails.value = false
    clearExternalMailboxFetchingIds()
  }
}

// 返回全部外部邮件
const backToAllExternalEmails = async () => {
  selectedExternalMailboxId.value = null
  selectedExternalAuthType.value = 'password'
  externalEmailPage.value = 1
  await loadAllExternalEmails()
  externalEmailListRef.value?.scrollToTop?.()
}

// 处理外部邮件刷新（单个邮箱收取成功后调用）
const handleRefreshExternalEmails = async () => {
  // 如果选中了特定邮箱，刷新该邮箱的邮件列表
  if (selectedExternalMailboxId.value) {
    externalEmailPage.value = 1
    await loadExternalMailboxEmails()
  } else {
    // 否则刷新所有外部邮件
    await loadAllExternalEmails()
  }
}

// 返回全部邮件
const backToAllEmails = async () => {
  selectedMailboxId.value = null
  showOnlyUnread.value = false
  await mailStore.fetchUserEmails(1, 20, false, undefined)
}

// 切换仅显示未读
const toggleUnreadFilter = async () => {
  showOnlyUnread.value = !showOnlyUnread.value
  mailStore.currentPage = 1 // 重置页码
  const params = {
    page: 1,
    page_size: 20,
    ...(showOnlyUnread.value ? { unread: true } : {})
  }

  if (selectedMailboxId.value) {
    await mailStore.fetchMailboxEmails(selectedMailboxId.value, params)
  } else {
    await mailStore.fetchUserEmails(1, 20, false, showOnlyUnread.value || undefined)
  }
}

// 打开邮件内容弹窗
const openEmailModal = (email: any) => {
  modalEmail.value = email
  showEmailModal.value = true
}

// 格式化日期
const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN')
}

// 搜索系统邮件
const handleSearchEmails = async (keyword: string) => {
  mailStore.searchKeyword = keyword
  const params: any = { page: 1, page_size: 20 }
  if (showOnlyUnread.value) params.unread = true
  if (keyword) params.search = keyword
  if (selectedMailboxId.value) {
    await mailStore.fetchMailboxEmails(selectedMailboxId.value, params)
  } else {
    await mailStore.fetchUserEmails(
      1,
      20,
      false,
      showOnlyUnread.value || undefined,
      keyword || undefined
    )
  }
}

// 搜索外部邮件
const handleSearchExternalEmails = async (keyword: string) => {
  const params: any = { page: 1, page_size: 20, type: 'external' }
  if (showOnlyUnreadExternal.value) params.unread = true
  if (keyword) params.search = keyword
  if (selectedExternalMailboxId.value) {
    params.mailbox_id = selectedExternalMailboxId.value
  }
  const res = await emailAPI.getUserEmails(params)
  if (res.code === 0 && res.data) {
    externalEmails.value = res.data.emails || []
  }
}

// 切换分页
const handlePageChange = async (page: number) => {
  mailStore.currentPage = page
  const params: any = {
    page,
    page_size: 20,
    ...(showOnlyUnread.value ? { unread: true } : {})
  }
  if (mailStore.searchKeyword) params.search = mailStore.searchKeyword
  if (selectedMailboxId.value) {
    await mailStore.fetchMailboxEmails(selectedMailboxId.value, params)
  } else {
    await mailStore.fetchUserEmails(
      page,
      20,
      false,
      showOnlyUnread.value || undefined,
      mailStore.searchKeyword || undefined
    )
  }
}

// 删除单个邮件
const handleDeleteEmail = (id: number) => {
  deletingIds.value = [id]
  deletingBatch.value = false
  showDeleteConfirm.value = true
}

// 批量删除邮件
const handleBatchDeleteEmails = (ids: number[]) => {
  console.log('🟢 系统邮件批量删除，ids:', ids)
  deletingIds.value = ids
  deletingBatch.value = true
  showDeleteConfirm.value = true
}

// 批量删除外部邮件
const handleBatchDeleteExternalEmails = (ids: number[]) => {
  console.log('🟢 外部邮件批量删除，ids:', ids)
  deletingIds.value = ids
  deletingBatch.value = true
  showDeleteConfirm.value = true
}

// 确认删除
const confirmDeleteEmails = async () => {
  deleting.value = true
  try {
    const emailType = mailboxType.value === 'system' ? 'system' : 'external'

    if (deletingBatch.value) {
      // 使用批量删除接口
      await unifiedAPI.batchDeleteEmails(deletingIds.value, emailType)
      showMessage(`已删除 ${deletingIds.value.length} 封邮件`, 'success')
    } else {
      const result = await unifiedAPI.deleteEmail(deletingIds.value[0], emailType)
      if (result.data?.code === 0 || result.code === 0) {
        showMessage('删除成功', 'success')
      } else {
        showMessage(result.data?.message || result.message || '删除失败', 'error')
      }
    }

    if (emailType === 'external') {
      handleExternalEmailsDeleted(deletingIds.value)
    } else {
      handleSystemEmailsDeleted(deletingIds.value)
    }

    // 刷新当前页列表，保持页码不变
    if (emailType === 'system') {
      const params = {
        page: mailStore.currentPage,
        page_size: 20,
        ...(showOnlyUnread.value ? { unread: true } : {})
      }
      if (selectedMailboxId.value) {
        await mailStore.fetchMailboxEmails(selectedMailboxId.value, params)
      } else {
        await mailStore.fetchUserEmails(
          mailStore.currentPage,
          20,
          false,
          showOnlyUnread.value || undefined
        )
      }
    } else {
      // 外部邮件：根据是否选中邮箱决定加载方式
      if (selectedExternalMailboxId.value) {
        await loadExternalMailboxEmails()
      } else {
        await loadAllExternalEmails()
      }
    }

    // 批量删除成功后，退出批量模式
    if (deletingBatch.value) {
      if (mailboxType.value === 'system') {
        if (systemEmailListRef.value?.cancelBatchMode) {
          systemEmailListRef.value.cancelBatchMode()
        }
      } else {
        if (externalEmailListRef.value?.cancelBatchMode) {
          externalEmailListRef.value.cancelBatchMode()
        }
      }
    }
  } catch (error: any) {
    console.error('❌ 删除邮件失败:', error)
    showMessage('删除失败: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
  }
}

// 复制验证码
const copyVerificationCode = (code: string) => {
  navigator.clipboard.writeText(code)
  showMessage('✓ 验证码已复制', 'success')
}

// 选择邮件（获取详情并自动标记已读）
const handleSelectEmail = async (email: any) => {
  // 先设置选中状态（显示基本信息）
  mailStore.selectEmail(email)

  // 然后获取完整详情
  await mailStore.fetchEmailDetail(email.id)

  // 标记已读
  if (!email.is_read) {
    await mailStore.markAsRead(email.id)
  }
}
</script>

<style scoped>
.btn-primary {
  @apply bg-primary-600 hover:bg-primary-700 text-white rounded;
}
</style>
