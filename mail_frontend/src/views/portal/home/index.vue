<template>
  <ThreeColumnLayout
    :compact-panels="!userStore.isAuthenticated"
    :use-main="currentView === 'send-email'"
    :page-scrollable="currentView === 'send-email'"
  >
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
            {{ t('home.temporaryMailbox') }}
          </button>
          <button
            @click="switchMailboxType('hosted')"
            :class="[
              'px-6 py-2 text-sm font-medium border-b-2 transition-colors',
              mailboxType === 'hosted'
                ? 'text-primary-600 border-primary-600'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ t('home.hostedMailbox') }}
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
            {{ t('home.externalMailbox') }}
          </button>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center gap-3">
          <!-- 生成系统邮箱按钮 -->
          <button
            v-if="mailboxType === 'system'"
            @click="allocateMailbox"
            :disabled="mailboxStore.loading"
            class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ mailboxStore.loading ? t('home.claiming') : t('home.freeClaimMailbox') }}
          </button>

          <button
            v-if="mailboxType === 'system'"
            @click="showCustomGenerateModal = true"
            class="px-4 py-2 border border-primary-200 bg-primary-50 text-primary-700 text-sm font-medium rounded-lg hover:bg-primary-100 transition-colors"
          >
            {{ t('home.customGenerate') }}
          </button>

          <button
            v-if="mailboxType === 'hosted'"
            @click="generateHostedMailbox"
            :disabled="mailboxStore.loading"
            class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            {{ mailboxStore.loading ? t('home.claiming') : t('home.freeClaimMailbox') }}
          </button>

          <button
            v-if="mailboxType === 'hosted'"
            @click="showHostedCustomGenerateModal = true"
            class="px-4 py-2 border border-primary-200 bg-primary-50 text-primary-700 text-sm font-medium rounded-lg hover:bg-primary-100 transition-colors"
          >
            {{ t('home.customGenerate') }}
          </button>

          <button
            v-if="mailboxType === 'hosted'"
            @click="goToDomainWorkbench()"
            class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            {{ t('home.manageDomains') }}
          </button>

          <!-- 添加邮箱按钮（第三方邮箱） -->
          <button
            v-if="mailboxType === 'external'"
            @click="handleBatchLogin"
            :disabled="batchLoginLoading"
            class="px-4 py-2 border border-primary-200 bg-primary-50 text-primary-700 text-sm font-medium rounded-lg hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ batchLoginLoading ? t('home.addingMailbox') : t('home.addMailbox') }}
          </button>

          <button
            v-if="mailboxType === 'external'"
            type="button"
            @click="goToExternalOpsWorkbench"
            class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            工作台
          </button>
        </div>
      </div>
      <section v-else class="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0">
            <h1 class="text-lg font-semibold text-gray-900">{{ t('home.guestTitle') }}</h1>
            <p class="mt-1 text-sm text-gray-600">
              {{ t('home.guestDescription') }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 flex-shrink-0">
            <a
              href="/market"
              class="inline-flex items-center rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
            >
              {{ t('home.workflowMarket') }}
            </a>
            <a
              href="/download"
              class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              {{ t('home.downloadDesktop') }}
            </a>
            <a
              href="/about"
              class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              {{ t('home.learnMore') }}
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

        <div v-show="mailboxType === 'hosted'" class="h-full">
          <SystemMailboxList
            ref="hostedMailboxListRef"
            mailbox-type="hosted"
            :title="t('home.hostedMailbox')"
            :search-keyword="hostedMailboxSearchKeyword"
            :mailboxes="hostedMailboxItems"
            :pagination="{
              page: hostedMailboxPage,
              total_pages: hostedMailboxTotalPages,
              total: hostedMailboxTotal
            }"
            :on-page-change="handleHostedMailboxPageChange"
            :on-search="handleHostedMailboxSearch"
            @select="handleSelectHostedMailbox"
            @share="handleShareMailboxes"
            @deleted="handleHostedMailboxesDeleted"
            @refresh="loadHostedDomainSummary"
            @batch-mode-start="handleMailboxBatchStart"
          />
        </div>

        <div v-show="mailboxType === 'external'" class="h-full">
          <ExternalMailboxList
            ref="externalMailboxListRef"
            :is-send-email-view="currentView === 'send-email'"
            :active-mailbox-id="currentView === 'outbox' ? selectedOutboxMailboxId : selectedExternalMailboxId"
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

    <!-- 中栏 -->
    <template #middle>
      <!-- 临时邮箱邮件列表 -->
      <div v-if="currentView === 'emails' && mailboxType === 'system'" class="h-full">
        <EmailList
          ref="systemEmailListRef"
          :title="t('mail.inbox')"
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
                :aria-label="refreshingSystemEmails ? t('home.refreshing') : t('home.refreshNow')"
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
              {{ t('home.viewAll') }}
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
              {{ t('home.unreadOnly') }}
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

      <div v-else-if="currentView === 'emails' && mailboxType === 'hosted'" class="h-full">
        <EmailList
          ref="hostedEmailListRef"
          :title="selectedHostedMailboxId ? t('mail.inbox') : t('mail.allEmails')"
          :emails="hostedEmails"
          :selected-id="selectedHostedEmailId"
          :show-pagination="true"
          :searchable="true"
          :auto-refresh="autoRefresh"
          @select="handleSelectHostedEmail"
          @batch-delete="handleBatchDeleteHostedEmails"
          @batch-mode-start="handleEmailBatchStart"
          @search="handleSearchHostedEmails"
        >
          <template #title-extra>
            <button
              v-if="selectedHostedMailboxId"
              @click="backToAllHostedEmails"
              class="px-2 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
            >
              {{ t('home.viewAll') }}
            </button>
          </template>

          <template #actions>
            <button
              @click="toggleHostedUnread"
              :class="[
                'px-2 py-1 text-xs rounded transition-colors whitespace-nowrap',
                showOnlyUnreadHosted
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
              ]"
            >
              {{ t('home.unreadOnly') }}
            </button>
          </template>

          <template
            #content="{ emails, selectedId, batchMode, selectedIds, toggleSelection, onSelect }"
          >
            <EmailItem
              v-for="email in emails"
              :key="email.id"
              :email="email"
              :is-selected="selectedId === email.id"
              :is-checked="(selectedIds?.value || []).includes(email.id)"
              :batch-mode="batchMode"
              @click="onSelect(email)"
              @toggle="toggleSelection(email.id)"
              @delete="handleDeleteEmail(email.id)"
              @copy-code="copyVerificationCode"
            />
          </template>

          <template #pagination>
            <Pagination
              :current-page="hostedEmailPage"
              :total-pages="Math.ceil(hostedEmailTotal / hostedEmailPageSize) || 1"
              :total="hostedEmailTotal"
              @page-change="handleHostedEmailPageChange"
            />
          </template>
        </EmailList>
      </div>

      <!-- 第三方邮箱邮件列表 -->
      <div v-else-if="currentView === 'emails' && mailboxType === 'external'" class="h-full">
        <EmailList
          ref="externalEmailListRef"
          :title="selectedExternalMailboxId ? t('mail.inbox') : t('mail.allEmails')"
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
              {{ t('home.viewAll') }}
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
              <span>{{ fetchingExternalEmails ? t('home.fetchingAll') : t('home.fetchAll') }}</span>
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

      <div v-else-if="currentView === 'outbox'" class="h-full">
        <OutboxListPanel
          ref="outboxListRef"
          :filter-mailbox-id="selectedOutboxMailboxId"
          @select="selectedOutboxRecord = $event"
          @clear-filter="selectedOutboxMailboxId = null"
        />
      </div>
    </template>

    <!-- 右栏：详情-->
    <template #right>
      <template v-if="currentView === 'emails'">
      <EmailDetail
        v-if="mailStore.selectedEmail"
        :email="mailStore.selectedEmail"
        @expand="openEmailModal"
        @reply="handleReplyExternalEmail"
      />
      </template>

      <OutboxDetailPanel
        v-else-if="currentView === 'outbox'"
        :record="selectedOutboxRecord"
        @reedit="handleReeditSentEmail"
      />
    </template>

    <template v-if="currentView === 'send-email'" #main>
      <SendEmailPanel ref="sendEmailPanelRef" :selected-mailbox-ids="selectedExternalMailboxIds" />
    </template>

    <template #footer v-if="!userStore.isAuthenticated">
      <div
        class="flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>{{ t('mail.footerServiceName') }}</div>
        <div class="flex items-center gap-3">
          <a href="/privacy-policy" class="hover:text-primary-600">{{ t('legal.privacyTitle') }}</a>
          <span class="text-gray-300">|</span>
          <a href="/terms-of-service" class="hover:text-primary-600">{{ t('legal.termsTitle') }}</a>
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
    <img :src="wxProgramImg" class="w-20 h-20 rounded-lg" :alt="t('home.miniProgramQrAlt')" />
    <p class="text-[11px] text-gray-500 mt-1.5">{{ t('home.miniProgramCta') }}</p>
  </div>

  <!-- 邮件内容弹窗 -->
  <div
    v-if="showRefreshTooltip && !refreshingSystemEmails"
    class="pointer-events-none fixed z-[9999] whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white shadow-sm"
    :style="refreshTooltipStyle"
  >
    {{ t('home.refreshNow') }}
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
    :title="deletingBatch ? t('home.batchDeleteTitle') : t('home.deleteEmailTitle')"
    :message="
      deletingBatch
        ? t('home.deleteEmailsMessage', { count: deletingIds.length })
        : t('home.deleteEmailMessage')
    "
    :loading="deleting"
    @confirm="confirmDeleteEmails"
    @cancel="showDeleteConfirm = false"
  />

  <!-- 批量添加邮箱弹窗（含 OAuth2 授权） -->
  <BatchAddAccountModal
    ref="batchAddModalRef"
    :visible="showBatchAddModal"
    :loading="batchLoginLoading"
    @close="handleCloseBatchAddModal"
    @submit="handleBatchAddAccounts"
    @oauth-complete="handleOAuth2Complete"
  />

  <!-- 下载桌面端提示弹窗 -->
  <ConfirmDialog
    :visible="showDownloadDialog"
    :mask="false"
    :title="downloadDialogTitle"
    :message="downloadDialogMessage"
    :confirm-text="t('home.downloadDesktop')"
    :cancel-text="t('common.cancel')"
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
  <CustomGenerateModal
    v-model:visible="showCustomGenerateModal"
    mailbox-type="system"
    @success="handleCustomGenerateSuccess"
  />
  <CustomGenerateModal
    v-model:visible="showHostedCustomGenerateModal"
    mailbox-type="hosted"
    @success="handleCustomGenerateSuccess"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMailboxStore } from '@/stores/auth'
import { useMailStore } from '@/stores/mail'
import ThreeColumnLayout from '@/components/Mail/Layout/ThreeColumnLayout.vue'
import SendEmailPanel from '@/components/Mail/SendEmailPanel.vue'
import OutboxListPanel from '@/components/Mail/OutboxListPanel.vue'
import OutboxDetailPanel from '@/components/Mail/OutboxDetailPanel.vue'
import TempMailbox from '@/components/Mail/TempMailbox/TempMailbox.vue'
import SystemMailboxList from '@/components/Mail/SystemMailbox/MailboxList.vue'
import ExternalMailboxList from '@/components/Mail/ExternalMailbox/MailboxList.vue'
import EmailList from '@/components/Mail/EmailList/EmailList.vue'
import EmailItem from '@/components/Mail/EmailItem.vue'
import BatchAddAccountModal from '@/components/Mail/BatchAddAccountModal.vue'
import ShareMailboxModal from '@/components/Mail/ShareMailboxModal.vue'
import SendEmailModal from '@/components/Mail/SendEmailModal.vue'
import batchLoginAPI from '@/api/batchLogin'
import mailboxProxyApi from '@/api/mailboxProxy'
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
import {
  AI_UI_SYNC_EVENT,
  extractMailboxType,
  extractToolIds,
  normalizeAIToolTrace
} from '@/utils/aiUiSync'
import { hostedDomainAPI } from '@/api/hostedDomain'
import CustomGenerateModal from '@/components/Mail/SystemMailbox/CustomGenerateModal.vue'
import { getCurrentLocale } from '@/i18n'
import wxProgramImg from '@/assets/img/wx_program.jpg'

// 获取 Tauri invoke（按需加载，避免竞态）
async function getTauriInvoke() {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    if (typeof invoke !== 'function') return null

    if (isTauri()) {
      return invoke
    }

    const runtimeReady = await invoke<boolean>('is_tauri').catch(() => false)
    return runtimeReady ? invoke : null
  } catch {
    return null
  }
}
import { unifiedAPI } from '@/api/unified'
import { emailAPI } from '@/api/email'

const { t } = useI18n()

const GOOGLE_OAUTH_DOMAIN_SUFFIXES = ['gmail.com', 'googlemail.com']
const MICROSOFT_OAUTH_DOMAIN_SUFFIXES = ['outlook.', 'hotmail.', 'live.', 'msn.', 'live.cn']

const resolveOAuthProviderByDomain = (domain: string) => {
  const normalizedDomain = String(domain || '').toLowerCase().trim()
  if (!normalizedDomain) return ''

  if (GOOGLE_OAUTH_DOMAIN_SUFFIXES.some((suffix) => normalizedDomain === suffix || normalizedDomain.endsWith(`.${suffix}`))) {
    return 'google'
  }

  if (MICROSOFT_OAUTH_DOMAIN_SUFFIXES.some((suffix) => normalizedDomain === suffix || normalizedDomain.startsWith(suffix) || normalizedDomain.endsWith(`.${suffix}`))) {
    return 'microsoft'
  }

  return ''
}

const resolveOAuthProviderByEmail = (email: string, fallback = '') => {
  const normalizedFallback = String(fallback || '').toLowerCase()
  if (normalizedFallback === 'google' || normalizedFallback === 'microsoft') {
    return normalizedFallback
  }

  const domain = (email.split('@')[1] || '').toLowerCase()
  return resolveOAuthProviderByDomain(domain)
}

const userStore = useUserStore()
const mailboxStore = useMailboxStore()
const mailStore = useMailStore()
const router = useRouter()

const systemMailboxListRef = ref()
const hostedMailboxListRef = ref()
const externalMailboxListRef = ref()
const systemEmailListRef = ref()
const externalEmailListRef = ref()
const hostedEmailListRef = ref()
const mailboxType = ref<'system' | 'hosted' | 'external'>('system')
const currentView = ref<'emails' | 'send-email' | 'outbox'>('emails')
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
const batchAddRunId = ref(0)
const pendingOAuthAccounts = ref<Array<{ email: string; provider: string }>>([])
const pendingOAuthBootstrapEmails = ref<string[]>([])
const showDownloadDialog = ref(false)
const downloadDialogTitle = ref(t('home.desktopRequiredTitle'))
const downloadDialogMessage = ref(t('home.desktopRequiredMessage'))
const showCustomGenerateModal = ref(false)
const showHostedCustomGenerateModal = ref(false)
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
  message = t('home.desktopRequiredMessage'),
  title = t('home.desktopRequiredTitle')
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

// 域名邮箱相关状态
const hostedDomains = ref<any[]>([])
const hostedDomainMailboxes = ref<any[]>([])
const hostedMailboxPage = ref(1)
const hostedMailboxPageSize = ref(50)
const hostedMailboxTotal = ref(0)
const hostedMailboxTotalPages = ref(0)
const hostedMailboxSearchKeyword = ref('')
const selectedHostedMailboxId = ref<number | null>(null)
const selectedHostedEmailId = ref<number | null>(null)
const hostedEmails = ref<any[]>([])
const showOnlyUnreadHosted = ref(false)
const hostedEmailPage = ref(1)
const hostedEmailPageSize = ref(20)
const hostedEmailTotal = ref(0)
const hostedSearchKeyword = ref('')

// 外部邮箱相关状态
const selectedExternalMailboxId = ref<number | null>(null)
const selectedExternalMailboxIds = ref<number[]>([])
const selectedExternalEmailId = ref<number | null>(null)
const selectedExternalAuthType = ref<string>('password')
const sendEmailPanelRef = ref<any>(null)
const outboxListRef = ref<any>(null)
const selectedOutboxMailboxId = ref<number | null>(null)
const selectedOutboxRecord = ref<any>(null)
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
const TITLE_ALERT_POLL_INTERVAL = 5
const TITLE_ALERT_PREFIX_RE = /^[【\[].*?[】\]]/
const browserBaseTitle = ref(t('home.defaultBrowserTitle'))
const titleAlertSeenEmailIds: Record<'system' | 'hosted' | 'external', Set<number>> = {
  system: new Set<number>(),
  hosted: new Set<number>(),
  external: new Set<number>()
}
const titleAlertInitialized: Record<'system' | 'hosted' | 'external', boolean> = {
  system: false,
  hosted: false,
  external: false
}
const pendingTitleAlertEmails = new Map<string, any>()

const canShowExternalFetchButton = computed(() => {
  // 只有桌面端才显示收取按钮（Web 端所有用户共用服务器 IP 连 IMAP，量大会被风控）
  return isTauri()
})

const hostedDomainNameMap = computed(() =>
  Object.fromEntries(
    hostedDomains.value.map((item: any) => [Number(item.id), item.domain_name || ''])
  )
)

const hostedMailboxItems = computed(() =>
  hostedDomainMailboxes.value.map((item: any) => ({
    ...item,
    domain_name: hostedDomainNameMap.value[Number(item.domain_id)] || item.domain_name || ''
  }))
)

const syncMailboxAuthTypeMap = (items: any[]) => {
  for (const item of items || []) {
    const id = Number(item?.id)
    const authType = (item?.auth_type || 'password').toLowerCase()
    if (id) {
      externalMailboxAuthTypeMap.value[id] = authType
    }
  }
}

const normalizeBrowserBaseTitle = (title?: string) => {
  const cleaned = String(title || '')
    .replace(TITLE_ALERT_PREFIX_RE, '')
    .trim()
  return cleaned || t('home.defaultBrowserTitle')
}

const rememberBrowserBaseTitle = (title?: string) => {
  browserBaseTitle.value = normalizeBrowserBaseTitle(title || document.title)
}

const getTitleAlertEmailKey = (mailType: 'system' | 'hosted' | 'external', email: any) => {
  const id = Number(email?.id)
  if (!Number.isFinite(id) || id <= 0) {
    return ''
  }
  return `${mailType}:${id}`
}

const getEmailTimestamp = (email: any) => {
  const candidates = [email?.received_at, email?.email_date, email?.created_at]
  for (const value of candidates) {
    if (value === null || value === undefined || value === '') {
      continue
    }
    const timestamp = new Date(value).getTime()
    if (!Number.isNaN(timestamp) && timestamp > 0) {
      return timestamp
    }
    const numericValue = Number(value)
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue
    }
  }
  return 0
}

const applyBrowserTitleAlert = () => {
  const baseTitle = normalizeBrowserBaseTitle(browserBaseTitle.value || document.title)
  if (!document.hidden || pendingTitleAlertEmails.size === 0) {
    if (document.title !== baseTitle) {
      document.title = baseTitle
    }
    return
  }

  const pendingEmails = Array.from(pendingTitleAlertEmails.values()).sort(
    (left, right) => getEmailTimestamp(right) - getEmailTimestamp(left)
  )
  const latestCode = String(
    pendingEmails.find((item) => String(item?.verification_code || '').trim())?.verification_code ||
      ''
  ).trim()
  const alertPrefix = latestCode
    ? t('home.titleAlertCode', { code: latestCode })
    : pendingTitleAlertEmails.size > 1
      ? t('home.titleAlertNewMailCount', { count: pendingTitleAlertEmails.size })
      : t('home.titleAlertNewMail')

  document.title = `${alertPrefix}${baseTitle}`
}

const clearBrowserTitleAlerts = () => {
  pendingTitleAlertEmails.clear()
  applyBrowserTitleAlert()
}

const registerTitleAlertEmails = (
  mailType: 'system' | 'hosted' | 'external',
  emails: any[] = []
) => {
  const seenIds = titleAlertSeenEmailIds[mailType]
  if (!titleAlertInitialized[mailType]) {
    for (const email of emails) {
      const emailId = Number(email?.id)
      if (Number.isFinite(emailId) && emailId > 0) {
        seenIds.add(emailId)
      }
    }
    titleAlertInitialized[mailType] = true
    return
  }

  for (const email of emails) {
    const emailId = Number(email?.id)
    if (!Number.isFinite(emailId) || emailId <= 0) {
      continue
    }

    const alertKey = getTitleAlertEmailKey(mailType, email)
    const isUnread = !email?.is_read

    if (document.hidden && isUnread && !seenIds.has(emailId) && alertKey) {
      pendingTitleAlertEmails.set(alertKey, email)
    }
    if (!isUnread && alertKey) {
      pendingTitleAlertEmails.delete(alertKey)
    }

    seenIds.add(emailId)
  }

  applyBrowserTitleAlert()
}

const loadTitleAlertEmailsByType = async (mailType: 'system' | 'hosted' | 'external') => {
  if (mailType === 'system' && !userStore.isAuthenticated) {
    const tempMailboxId = Number(mailboxStore.tempMailbox?.id || 0)
    if (!tempMailboxId) {
      return []
    }
    const response: any = await mailboxAPI.getTempMailboxEmails(tempMailboxId, {
      page: 1,
      page_size: 20
    })
    return response.code === 0 && response.data ? response.data.emails || [] : []
  }

  if (!userStore.isAuthenticated) {
    return []
  }

  const response: any = await emailAPI.getUserEmails({
    type: mailType,
    page: 1,
    page_size: 20
  })
  if (response.code !== 0 || !response.data) {
    return []
  }

  if (mailType === 'hosted') {
    return normalizeHostedEmailRows(response.data.emails || [])
  }
  return response.data.emails || []
}

const pollBrowserTitleAlerts = async () => {
  if (typeof document === 'undefined' || !document.hidden) {
    return
  }

  rememberBrowserBaseTitle()

  try {
    const systemEmails = await loadTitleAlertEmailsByType('system')
    registerTitleAlertEmails('system', systemEmails)
  } catch (error) {
    console.error('轮询系统邮件标题提醒失败:', error)
  }

  if (!userStore.isAuthenticated) {
    applyBrowserTitleAlert()
    return
  }

  const [hostedResult, externalResult] = await Promise.allSettled([
    loadTitleAlertEmailsByType('hosted'),
    loadTitleAlertEmailsByType('external')
  ])

  if (hostedResult.status === 'fulfilled') {
    registerTitleAlertEmails('hosted', hostedResult.value)
  } else {
    console.error('轮询域名邮件标题提醒失败:', hostedResult.reason)
  }

  if (externalResult.status === 'fulfilled') {
    registerTitleAlertEmails('external', externalResult.value)
  } else {
    console.error('轮询第三方邮件标题提醒失败:', externalResult.reason)
  }
}

const handleBrowserVisibilityChange = () => {
  if (document.hidden) {
    rememberBrowserBaseTitle()
    void pollBrowserTitleAlerts()
    return
  }

  clearBrowserTitleAlerts()
  rememberBrowserBaseTitle()
}

const syncAutoRefreshStates = () => {
  if (mailboxType.value === 'external') {
    autoRefresh.stop()
  } else if (!autoRefresh.isRunning.value) {
    autoRefresh.start()
  }

  if (userStore.isAuthenticated && isTauri()) {
    if (!externalAutoFetch.isRunning.value) {
      externalAutoFetch.start()
    }
  } else {
    externalAutoFetch.stop()
  }
}

const setExternalMailboxFetchingIds = (ids: number[]) => {
  externalMailboxFetchingIds.value = Array.from(
    new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))
  )
}

const addExternalMailboxFetchingIds = (ids: number[]) => {
  const nextIds = ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
  if (nextIds.length === 0) return
  externalMailboxFetchingIds.value = Array.from(
    new Set([...externalMailboxFetchingIds.value, ...nextIds])
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
    throw new Error(response.message || t('home.loadMailboxInfoFailed'))
  }
  const accounts = response.data?.accounts || []
  return accounts.find((item: any) => Number(item?.id) === Number(mailboxId)) || null
}

const loadMailboxRuntimeProxy = async (mailboxId: number) => {
  if (!mailboxId) return null
  try {
    const response: any = await mailboxProxyApi.getRuntimeProxy(mailboxId)
    if (response.code !== 0) return null
    return response?.data?.runtime_proxy || null
  } catch {
    return null
  }
}

const previewMailboxRuntimeProxy = async (email: string, oauthProvider: string | null = null, proxyId: number | null = null) => {
  if (!email && !proxyId) return null
  try {
    const response: any = await mailboxProxyApi.previewRuntimeProxy({
      email,
      oauth_provider: oauthProvider || null,
      proxy_id: proxyId || null
    })
    if (response.code !== 0) return null
    return response?.data?.runtime_proxy || null
  } catch {
    return null
  }
}

const openOAuthReauthorizeModal = async (account: any) => {
  const provider = resolveOAuthProviderByEmail(
    account?.email || '',
    account?.oauth_provider || account?.provider || ''
  )
  if (!provider) {
    throw new Error(t('home.oauthReauthorizeUnsupported'))
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
  const runtimeProxy = await loadMailboxRuntimeProxy(mailboxId)

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
        accessToken: tokenPayload.access_token,
        proxy: runtimeProxy
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
const getSavedMailboxType = (): 'system' | 'hosted' | 'external' | null => {
  try {
    const value = localStorage.getItem(MAILBOX_TYPE_STORAGE_KEY)
    return value === 'system' || value === 'hosted' || value === 'external' ? value : null
  } catch {
    return null
  }
}
const saveMailboxType = (type: 'system' | 'hosted' | 'external') => {
  try {
    localStorage.setItem(MAILBOX_TYPE_STORAGE_KEY, type)
  } catch {
    // ignore
  }
}

// 保存每个Tab的选中邮件
const systemSelectedEmail = ref<any>(null)
const hostedSelectedEmail = ref<any>(null)
const externalSelectedEmail = ref<any>(null)

const normalizeIds = (ids: number[] = []) =>
  Array.from(
    new Set(ids.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))
  )

const isExternalEmailRecord = (email: any) =>
  Boolean(email) && String(email?.mailbox_type || '') === 'external'

const isHostedEmailRecord = (email: any) =>
  Boolean(email) && String(email?.mailbox_type || '') === 'hosted'

const isSystemEmailRecord = (email: any) =>
  Boolean(email) && !isExternalEmailRecord(email) && !isHostedEmailRecord(email)

const clearSavedSelectedEmails = (matcher: (email: any) => boolean) => {
  if (matcher(systemSelectedEmail.value)) {
    systemSelectedEmail.value = null
  }
  if (matcher(hostedSelectedEmail.value)) {
    hostedSelectedEmail.value = null
  }
  if (matcher(externalSelectedEmail.value)) {
    externalSelectedEmail.value = null
  }
  if (matcher(mailStore.selectedEmail)) {
    mailStore.selectedEmail = null
  }
}

const goToDomainWorkbench = (domainId?: number | null) => {
  if (domainId) {
    router.push({ path: '/user/domains', query: { domainId: String(domainId) } })
    return
  }
  router.push('/user/domains')
}

const normalizeHostedEmailRows = (items: any[] = []) =>
  items.map((item: any) => ({
    ...item,
    mailbox_type: 'hosted'
  }))

const loadHostedDomainSummary = async (
  page = hostedMailboxPage.value,
  search = hostedMailboxSearchKeyword.value
) => {
  try {
    const [domainsResponse, mailboxesResponse] = await Promise.all([
      hostedDomainAPI.listDomains(),
      mailboxAPI.getMailboxes({
        mailbox_type: 'hosted',
        page,
        page_size: hostedMailboxPageSize.value,
        ...(String(search || '').trim() ? { search: String(search || '').trim() } : {})
      })
    ])

    if (domainsResponse.code === 0 && domainsResponse.data) {
      hostedDomains.value = domainsResponse.data.items || []
    }

    if (mailboxesResponse.code === 0 && mailboxesResponse.data) {
      hostedDomainMailboxes.value = mailboxesResponse.data.mailboxes || []
      hostedMailboxPage.value = Number(mailboxesResponse.data.pagination?.page || page)
      hostedMailboxTotal.value = Number(
        mailboxesResponse.data.pagination?.total || hostedDomainMailboxes.value.length
      )
      hostedMailboxTotalPages.value = Number(mailboxesResponse.data.pagination?.total_pages || 1)
      if (
        selectedHostedMailboxId.value &&
        !hostedDomainMailboxes.value.some(
          (item: any) => Number(item.id) === Number(selectedHostedMailboxId.value)
        )
      ) {
        selectedHostedMailboxId.value = null
      }
    }
  } catch (error) {
    console.error('加载域名邮箱概览失败:', error)
  }
}

const handleHostedMailboxPageChange = async (page: number) => {
  hostedMailboxPage.value = page
  await loadHostedDomainSummary(page)
}

const handleHostedMailboxSearch = async (keyword: string) => {
  hostedMailboxSearchKeyword.value = String(keyword || '').trim()
  hostedMailboxPage.value = 1
  await loadHostedDomainSummary(1, hostedMailboxSearchKeyword.value)
}

const resolvePreferredHostedDomainId = () => {
  if (selectedHostedMailboxId.value) {
    const selectedMailbox = hostedDomainMailboxes.value.find(
      (item: any) => Number(item.id) === Number(selectedHostedMailboxId.value)
    )
    if (String(selectedMailbox?.access_mode || '') === 'public_claim') {
      return null
    }
    const selectedDomainId = Number(selectedMailbox?.domain_id || 0)
    if (selectedDomainId) {
      return selectedDomainId
    }
  }

  const verifiedDomains = hostedDomains.value.filter(
    (item: any) =>
      Boolean(item?.is_active) && String(item?.verification_status || '') === 'verified'
  )
  if (!verifiedDomains.length) {
    return null
  }
  const randomDomain = verifiedDomains[Math.floor(Math.random() * verifiedDomains.length)]
  const verifiedDomainId = Number(randomDomain?.id || 0)
  return verifiedDomainId || null
}

const generateHostedMailbox = async () => {
  const preferredDomainId = resolvePreferredHostedDomainId()
  const payload: Record<string, any> = {
    mailbox_type: 'hosted',
    auto_local_part: true
  }
  if (preferredDomainId) {
    payload.domain_id = preferredDomainId
  }

  const result = await mailboxStore.allocateMailbox(payload)

  if (!result.success) {
    showMessage(result.error || t('home.generateMailboxFailed'), 'error')
    return
  }

  showMessage(t('home.hostedMailboxCreated'), 'success')
  await loadHostedDomainSummary()
  selectedHostedMailboxId.value = null
  selectedHostedEmailId.value = null
  hostedEmailPage.value = 1
  await loadHostedEmails(1)
}

const handleSystemEmailsDeleted = (ids: number[] = []) => {
  const normalizedIds = normalizeIds(ids)
  if (!normalizedIds.length) return

  const idSet = new Set(normalizedIds)
  mailStore.removeEmails(normalizedIds)
  clearSavedSelectedEmails((email) => isSystemEmailRecord(email) && idSet.has(Number(email?.id)))
}

const handleExternalEmailsDeleted = (ids: number[] = []) => {
  const normalizedIds = normalizeIds(ids)
  if (!normalizedIds.length) return

  const idSet = new Set(normalizedIds)
  removeExternalEmailsByIds(normalizedIds)
  clearSavedSelectedEmails((email) => isExternalEmailRecord(email) && idSet.has(Number(email?.id)))
}

const handleHostedEmailsDeleted = (ids: number[] = []) => {
  const normalizedIds = normalizeIds(ids)
  if (!normalizedIds.length) return

  const idSet = new Set(normalizedIds)
  removeHostedEmailsByIds(normalizedIds)
  clearSavedSelectedEmails((email) => isHostedEmailRecord(email) && idSet.has(Number(email?.id)))
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

const handleHostedMailboxesDeleted = (ids: number[] = []) => {
  const normalizedIds = normalizeIds(ids)
  if (!normalizedIds.length) return

  const idSet = new Set(normalizedIds)
  hostedDomainMailboxes.value = hostedDomainMailboxes.value.filter(
    (item: any) => !idSet.has(Number(item.id))
  )
  removeHostedEmailsByMailboxIds(normalizedIds)
  if (selectedHostedMailboxId.value && idSet.has(Number(selectedHostedMailboxId.value))) {
    selectedHostedMailboxId.value = null
  }
  clearSavedSelectedEmails(
    (email) => isHostedEmailRecord(email) && idSet.has(Number(email?.mailbox_id))
  )
}

// 批量模式互斥：邮箱批量开启时，关闭邮件批量
const handleMailboxBatchStart = () => {
  console.log('🔵 邮箱批量模式开启，关闭邮件批量模式')
  if (systemMailboxListRef.value?.cancelBatchMode) {
    systemMailboxListRef.value.cancelBatchMode()
  }
  if (hostedMailboxListRef.value?.cancelBatchMode) {
    hostedMailboxListRef.value.cancelBatchMode()
  }
  if (externalMailboxListRef.value?.cancelBatchMode) {
    externalMailboxListRef.value.cancelBatchMode()
  }
  // 关闭系统邮件列表的批量模式
  if (systemEmailListRef.value?.cancelBatchMode) {
    systemEmailListRef.value.cancelBatchMode()
  }
  if (hostedEmailListRef.value?.cancelBatchMode) {
    hostedEmailListRef.value.cancelBatchMode()
  }
  // 关闭外部邮件列表的批量模式
  if (externalEmailListRef.value?.cancelBatchMode) {
    externalEmailListRef.value.cancelBatchMode()
  }
}

// 切换邮箱类型
const switchMailboxType = (type: 'system' | 'hosted' | 'external') => {
  currentView.value = 'emails'
  // 保存当前Tab的选中邮件
  if (mailboxType.value === 'system') {
    systemSelectedEmail.value = mailStore.selectedEmail
  } else if (mailboxType.value === 'hosted') {
    hostedSelectedEmail.value = mailStore.selectedEmail
  } else {
    externalSelectedEmail.value = mailStore.selectedEmail
  }

  // 切换类型
  mailboxType.value = type
  saveMailboxType(type)

  // 恢复目标Tab的选中邮件
  if (type === 'system') {
    mailStore.selectedEmail = systemSelectedEmail.value
  } else if (type === 'hosted') {
    mailStore.selectedEmail = hostedSelectedEmail.value
    void loadHostedDomainSummary()
    void loadHostedEmails()
  } else {
    mailStore.selectedEmail = externalSelectedEmail.value

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

  syncAutoRefreshStates()
}

// 批量登录 - 打开添加账号弹窗
const handleBatchLogin = async () => {
  const tauriInvoke = await getTauriInvoke()
  if (!tauriInvoke) {
    openDesktopDownloadDialog()
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
      showMessage(
        t('home.openingOauthPage', { provider: provider === 'microsoft' ? 'Outlook' : 'Gmail' }),
        'success'
      )
    } else {
      showMessage(res.message || t('login.getAuthLinkFailed'), 'error')
    }
  } catch (e: any) {
    showMessage(e.message || t('login.getAuthLinkFailed'), 'error')
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
  showMessage(t('home.shareCreated'), 'success')
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
        showMessage(t('home.addExternalFirst'), 'error')
        return
      }
      showSendEmailModal.value = true
    }
  } catch (error) {
    console.error('获取邮箱列表失败:', error)
    showMessage(t('home.fetchMailboxListFailed'), 'error')
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

const handleCloseBatchAddModal = () => {
  showBatchAddModal.value = false
  batchAddRunId.value += 1
}

// 批量添加账号
const handleBatchAddAccounts = async (accounts: any[]) => {
  const currentBatchAddRunId = batchAddRunId.value
  const isBatchAddCancelled = () =>
    currentBatchAddRunId !== batchAddRunId.value || !showBatchAddModal.value

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
    let skippedCount = 0
    let needDesktopDownload = false
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

    const startBatchAddProgressHints = (accountData: any) => {
      const timers: number[] = []
      const pushHint = (message: string) => {
        if (batchAddModalRef.value?.updatePending) {
          batchAddModalRef.value.updatePending(accountData.email, message)
        }
      }

      const protocol = String(accountData.protocol || 'auto').toLowerCase()
      const isCustom = Boolean(
        (protocol === 'imap' && accountData.imap_host) ||
        (protocol === 'pop3' && accountData.pop3_host)
      )

      if (protocol === 'auto') {
        pushHint('正在自动识别协议')
        timers.push(window.setTimeout(() => pushHint('正在尝试 IMAP 协议'), 300))
        timers.push(window.setTimeout(() => pushHint('正在尝试 POP3 协议'), 1600))
      } else if (protocol === 'pop3') {
        pushHint(isCustom ? '正在尝试自定义 POP3 协议' : '正在尝试 POP3 协议')
      } else {
        pushHint(isCustom ? '正在尝试自定义 IMAP 协议' : '正在尝试 IMAP 协议')
      }

      if (accountData.verify_smtp !== false) {
        const smtpDelay = protocol === 'auto' ? 2800 : 1200
        timers.push(window.setTimeout(() => pushHint('正在尝试 SMTP 验证'), smtpDelay))
      }

      return () => {
        timers.forEach(timer => window.clearTimeout(timer))
      }
    }

    const fetchNewMailboxOnce = async (tauriInvoke: any, mailboxId: number, accountData: any, runtimeProxy: any = null) => {
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
        serverUrl,
        proxy: runtimeProxy
      })

      await batchLoginAPI.updateMailboxStatus(mailboxId, 'active')
      return Number(fetchResult?.count || 0)
    }

    const startBackgroundInitialFetch = (
      mailboxId: number,
      accountData: any,
      runtimeProxy: any = null
    ) => {
      if (!mailboxId || !isTauri()) return

      addExternalMailboxFetchingIds([mailboxId])
      void (async () => {
        try {
          const tauriInvoke = await getTauriInvoke()
          if (!tauriInvoke) {
            throw new Error(t('home.desktopApiNotReady'))
          }
          await fetchNewMailboxOnce(tauriInvoke, mailboxId, accountData, runtimeProxy)
        } catch (fetchError: any) {
          const fetchErrorMessage = resolveErrorMessage(fetchError)
          try {
            await batchLoginAPI.updateMailboxStatus(mailboxId, 'failed', fetchErrorMessage)
          } catch (statusError) {
            console.error('更新邮箱后台收取状态失败:', statusError)
          }
        } finally {
          removeExternalMailboxFetchingIds([mailboxId])
        }
      })()
    }

    const startBackgroundOAuthInitialFetch = (mailboxId: number, account: any) => {
      if (!mailboxId || !isTauri()) return

      addExternalMailboxFetchingIds([mailboxId])
      void (async () => {
        try {
          const tauriInvoke = await getTauriInvoke()
          if (!tauriInvoke) {
            throw new Error(t('home.desktopApiNotReady'))
          }
          await fetchOAuthMailboxOnceById(tauriInvoke, mailboxId, { account })
        } catch (fetchError: any) {
          const fetchErrorMessage = resolveErrorMessage(fetchError)
          try {
            await batchLoginAPI.updateMailboxStatus(mailboxId, 'failed', fetchErrorMessage)
          } catch (statusError) {
            console.error('更新 OAuth 邮箱后台收取状态失败:', statusError)
          }
        } finally {
          removeExternalMailboxFetchingIds([mailboxId])
        }
      })()
    }

    const markNoNeedOAuth = (email: string) => {
      skippedCount++
      if (batchAddModalRef.value) {
        batchAddModalRef.value.updateResult(email, 'success', t('home.batchAddAlreadyExists'))
      }
    }

    const enqueueOAuthPending = (email: string, provider: string) => {
      const key = `${provider}:${normalizeEmail(email)}`
      if (pendingOAuthSet.has(key)) return
      pendingOAuthSet.add(key)
      pendingOAuthAccounts.value.push({ email, provider })
    }

    const existingEmailSet = new Set<string>()
    try {
      const existingResponse = await batchLoginAPI.getAllAccounts(100, {
        suppressErrorMessage: true
      })
      if (existingResponse.code === 0) {
        const existingAccounts = existingResponse.data?.accounts || []
        existingAccounts.forEach((item: any) => {
          const email = normalizeEmail(item?.email || '')
          if (email) existingEmailSet.add(email)
        })
      }
    } catch (error) {
      console.warn('批量添加前置查重失败，继续走后端查重:', error)
    }

    const accountsToAdd = accounts.filter((account: any) => {
      const email = normalizeEmail(account?.email || '')
      if (!email || !existingEmailSet.has(email)) return true
      markNoNeedOAuth(account.email)
      return false
    })

    // ========== OAuth Token 批量导入（4段格式：邮箱----密码----Client_ID----Refresh_Token） ==========
    const tokenAccounts = accountsToAdd.filter(
      (a: any) =>
        a.oauth_refresh_token && a.oauth_client_id && !!resolveOAuthProviderByEmail(a.email)
    )
    const normalAccounts = accountsToAdd.filter(
      (a: any) =>
        !(a.oauth_refresh_token && a.oauth_client_id && resolveOAuthProviderByEmail(a.email))
    )

    if (tokenAccounts.length > 0) {
      for (const account of tokenAccounts) {
        if (isBatchAddCancelled()) break
        try {
          const provider = resolveOAuthProviderByEmail(account.email)
          if (!provider) {
            throw new Error(t('home.oauthReauthorizeUnsupported'))
          }
          let refreshedToken: any = null

          if (provider === 'microsoft') {
            if (!isTauri()) {
              throw new Error('Outlook Token 导入需要桌面端本地刷新')
            }

            const tauriInvoke = await getTauriInvoke()
            if (!tauriInvoke) {
              throw new Error(t('home.desktopApiNotReady'))
            }

            batchAddModalRef.value?.updatePending?.(account.email, '正在本地刷新 Token')
            refreshedToken = await tauriInvoke('refresh_oauth2_token_locally', {
              provider,
              email: account.email,
              refreshToken: account.oauth_refresh_token,
              clientId: account.oauth_client_id
            })
          }

          batchAddModalRef.value?.updatePending?.(account.email, '正在写入账号')
          const importItems = [{
            email: account.email,
            provider,
            password: account.password,
            refresh_token: refreshedToken?.refresh_token || account.oauth_refresh_token,
            client_id: account.oauth_client_id,
            access_token: refreshedToken?.access_token,
            expires_at: refreshedToken?.expires_at
          }]

          const res = await batchLoginAPI.batchImportOAuth2(importItems)
          const importResults = res.data?.results || res.results || []
          const r = importResults[0]
          if (!r) {
            throw new Error(res.message || t('home.oauthTokenImportFailed'))
          }
          if (r.success) {
            successCount++
            const mailboxId = Number(r.mailbox_id || 0)
            startBackgroundOAuthInitialFetch(mailboxId, account)

            if (batchAddModalRef.value) {
              batchAddModalRef.value.updateResult(
                r.email,
                'success',
                t('home.oauthTokenImportSuccess', { status: t('home.initialFetchQueuedSuffix') })
              )
            }
          } else {
            failCount++
            if (batchAddModalRef.value) {
              batchAddModalRef.value.updateResult(
                r.email,
                'error',
                r.error || t('home.oauthTokenImportFailed')
              )
            }
          }
        } catch (error: any) {
          failCount++
          if (batchAddModalRef.value) {
            batchAddModalRef.value.updateResult(account.email, 'error', resolveErrorMessage(error))
          }
        }
      }
    }

    // ========== 普通账号：走密码登录流程 ==========
    // 所有邮箱都先尝试密码登录
    for (const account of normalAccounts) {
      if (isBatchAddCancelled()) break
      const domain = account.email.split('@')[1]?.toLowerCase()
      const oauthProvider = domain ? resolveOAuthProviderByDomain(domain) : null

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
              throw new Error(t('home.desktopApiNotReady'))
            }
            const previewRuntimeProxy = await previewMailboxRuntimeProxy(
              accountData.email,
              oauthProvider,
              Number(account.proxy_id || 0) || null
            )
            if (account.proxy_id && !previewRuntimeProxy) {
              throw new Error('所选代理当前不可用，请更换后重试')
            }
            const stopProgressHints = startBatchAddProgressHints(accountData)

            let result: any
            try {
              // 调用 Tauri 命令验证邮箱
              result = await tauriInvoke('add_external_mailbox', {
                email: accountData.email,
                password: accountData.password,
                protocol: accountData.protocol,
                host: accountData.protocol === 'imap' ? accountData.imap_host : accountData.pop3_host,
                port: accountData.protocol === 'imap' ? accountData.imap_port : accountData.pop3_port,
                verifySmtp: accountData.verify_smtp !== false,
                proxy: previewRuntimeProxy
              })
            } finally {
              stopProgressHints()
            }

            // 检查登录是否真正成功
            if (!result.success) {
              throw new Error(result.message || t('home.mailboxVerifyFailed'))
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
            const response = await batchLoginAPI.addAccount({
              ...accountData,
              skip_verify: true,
              proxy_id: Number(account.proxy_id || 0) || null
            }, {
              suppressErrorMessage: true
            })
            if (response.code === 0) {
              successCount++
              const mailboxId = Number(response.data?.mailbox_id || 0)
              const runtimeProxy = response?.data?.runtime_proxy || null

              let canSend = false
              if (accountData.verify_smtp !== false && result.smtp_verified) {
                try {
                  await smtpAccountsAPI.addAccount({
                    email: accountData.email,
                    password: accountData.password,
                    smtp_host: result.smtp_host,
                    smtp_port: result.smtp_port
                  })
                } catch (error) {}
              }

              if (accountData.verify_smtp !== false) {
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
              }

              const smtpStatus =
                accountData.verify_smtp === false
                  ? t('home.smtpNotEnabled')
                  : canSend
                    ? t('home.smtpReceiveAndSend')
                    : t('home.smtpReceiveOnly')
              startBackgroundInitialFetch(mailboxId, accountData, runtimeProxy)

              if (batchAddModalRef.value) {
                batchAddModalRef.value.updateResult(
                  account.email,
                  'success',
                  t('home.localVerifySuccess', {
                    smtpStatus,
                    status: t('home.initialFetchQueuedSuffix')
                  })
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
                    t('home.passwordLoginNeedsOAuth')
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
              batchAddModalRef.value.updateResult(
                account.email,
                'error',
                t('home.oauthAuthorizationRequired')
              )
            }
          } else {
            // 普通邮箱：Web 端不支持，提示下载桌面端
            console.log('🔴 Web 端：普通邮箱需要桌面端验证')
            failCount++
            needDesktopDownload = true
            if (batchAddModalRef.value) {
              batchAddModalRef.value.updateResult(
                account.email,
                'error',
                t('home.desktopRequiredForAddMailbox')
              )
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
                t('home.passwordLoginNeedsOAuth')
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
    if (!isBatchAddCancelled() && pendingOAuthAccounts.value.length > 0) {
      if (batchAddModalRef.value?.addOAuthAccounts) {
        batchAddModalRef.value.addOAuthAccounts(pendingOAuthAccounts.value)
      }
    }

    // 显示结果
    if (!isBatchAddCancelled() && successCount > 0) {
      showMessage(t('home.batchAddSuccess', { count: successCount }), 'success')
    }

    // 如果有普通邮箱需要桌面端，提示下载
    if (!isBatchAddCancelled() && needDesktopDownload) {
      openDesktopDownloadDialog(t('home.desktopRequiredMessage'))
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

  } catch (error) {
    console.error('批量添加账号失败:', error)
    showMessage(t('home.batchAddFailed'), 'error')
  } finally {
    batchLoginLoading.value = false
  }
}

// OAuth2 授权完成的回调
const handleOAuth2Complete = async (result: {
  successCount: number
  failCount: number
  accounts?: any[]
}) => {
  pendingOAuthAccounts.value = []
  pendingOAuthBootstrapEmails.value = Array.isArray(result.accounts)
    ? result.accounts
        .filter((item: any) => item?.status === 'success' && item?.email)
        .map((item: any) => normalizeMailboxEmail(item.email))
    : []

  if (result.successCount > 0) {
    showMessage(t('home.oauthCompleteSuccess', { count: result.successCount }), 'success')

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
    showMessage(t('home.oauthCompleteFailed', { count: result.failCount }), 'error')
  }
}

// 批量模式互斥：邮件批量开启时，关闭邮箱批量
const handleEmailBatchStart = () => {
  console.log('🔵 邮件批量模式开启，关闭邮箱批量模式')
  if (systemEmailListRef.value?.cancelBatchMode) {
    systemEmailListRef.value.cancelBatchMode()
  }
  if (hostedEmailListRef.value?.cancelBatchMode) {
    hostedEmailListRef.value.cancelBatchMode()
  }
  if (externalEmailListRef.value?.cancelBatchMode) {
    externalEmailListRef.value.cancelBatchMode()
  }
  // 关闭系统邮箱列表的批量模式
  if (systemMailboxListRef.value?.cancelBatchMode) {
    systemMailboxListRef.value.cancelBatchMode()
  }
  if (hostedMailboxListRef.value?.cancelBatchMode) {
    hostedMailboxListRef.value.cancelBatchMode()
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

const loadHostedEmails = async (page = hostedEmailPage.value) => {
  try {
    const params: any = {
      page,
      page_size: hostedEmailPageSize.value,
      type: 'hosted'
    }
    if (selectedHostedMailboxId.value) {
      params.mailbox_id = selectedHostedMailboxId.value
    }
    if (showOnlyUnreadHosted.value) {
      params.unread = true
    }
    if (hostedSearchKeyword.value) {
      params.search = hostedSearchKeyword.value
    }

    const response: any = await emailAPI.getUserEmails(params)
    if (response.code === 0 && response.data) {
      hostedEmails.value = normalizeHostedEmailRows(response.data.emails || [])
      hostedEmailPage.value = response.data.pagination?.page || page
      hostedEmailPageSize.value = response.data.pagination?.page_size || hostedEmailPageSize.value
      hostedEmailTotal.value = response.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('加载域名邮箱邮件失败:', error)
  }
}

const refreshHostedEmails = async () => {
  if (mailboxType.value !== 'hosted') {
    return
  }
  await loadHostedEmails(hostedEmailPage.value || 1)
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

const removeHostedEmailsByIds = (ids: number[] = []) => {
  const idSet = new Set(
    ids.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
  )
  if (!idSet.size) return

  const originalCount = hostedEmails.value.length
  hostedEmails.value = hostedEmails.value.filter((email: any) => !idSet.has(Number(email?.id)))
  const removedCount = originalCount - hostedEmails.value.length

  if (selectedHostedEmailId.value && idSet.has(Number(selectedHostedEmailId.value))) {
    selectedHostedEmailId.value = null
  }
  if (mailStore.selectedEmail && idSet.has(Number(mailStore.selectedEmail.id))) {
    mailStore.selectedEmail = null
  }

  if (removedCount > 0) {
    hostedEmailTotal.value = Math.max(0, hostedEmailTotal.value - removedCount)
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
    !externalEmails.value.some(
      (email: any) => Number(email?.id) === Number(selectedExternalEmailId.value)
    )
  ) {
    selectedExternalEmailId.value = null
  }

  if (removedCount > 0) {
    externalEmailTotal.value = Math.max(0, externalEmailTotal.value - removedCount)
  }
}

const removeHostedEmailsByMailboxIds = (mailboxIds: number[] = []) => {
  const idSet = new Set(
    mailboxIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
  )
  if (!idSet.size) return

  const originalCount = hostedEmails.value.length
  hostedEmails.value = hostedEmails.value.filter(
    (email: any) => !idSet.has(Number(email?.mailbox_id))
  )
  const removedCount = originalCount - hostedEmails.value.length

  if (selectedHostedMailboxId.value && idSet.has(Number(selectedHostedMailboxId.value))) {
    selectedHostedMailboxId.value = null
  }
  if (
    mailStore.selectedEmail &&
    String(mailStore.selectedEmail.mailbox_type || '') === 'hosted' &&
    idSet.has(Number(mailStore.selectedEmail.mailbox_id))
  ) {
    mailStore.selectedEmail = null
  }
  if (
    selectedHostedEmailId.value &&
    !hostedEmails.value.some(
      (email: any) => Number(email?.id) === Number(selectedHostedEmailId.value)
    )
  ) {
    selectedHostedEmailId.value = null
  }

  if (removedCount > 0) {
    hostedEmailTotal.value = Math.max(0, hostedEmailTotal.value - removedCount)
  }
}

const applySystemMailboxListResult = (result: any) => {
  mailboxStore.replaceMailboxes(result?.items || [], result?.pagination)
}

const applyHostedMailboxListResult = (result: any) => {
  hostedDomainMailboxes.value = result?.items || []
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

const applyHostedEmailListResult = (result: any, mailboxId?: number | null) => {
  hostedEmails.value = normalizeHostedEmailRows(Array.isArray(result?.items) ? result.items : [])
  hostedEmailPage.value = Number(result?.pagination?.page || 1)
  hostedEmailPageSize.value = Number(
    result?.pagination?.page_size || hostedEmailPageSize.value || 20
  )
  hostedEmailTotal.value = Number(result?.pagination?.total || hostedEmails.value.length)
  if (mailboxId !== undefined) {
    selectedHostedMailboxId.value = mailboxId || null
  }
  mailboxType.value = 'hosted'
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

const applyEmailDetailResult = (
  result: any,
  mailboxTypeValue: 'system' | 'hosted' | 'external'
) => {
  if (!result?.id) return

  mailStore.selectedEmail = result
  currentView.value = 'emails'

  if (mailboxTypeValue === 'hosted') {
    mailboxType.value = 'hosted'
    selectedHostedEmailId.value = Number(result.id)
    if (result.mailbox_id) {
      selectedHostedMailboxId.value = Number(result.mailbox_id)
    }
    return
  }

  if (mailboxTypeValue === 'external') {
    mailboxType.value = 'external'
    selectedExternalEmailId.value = Number(result.id)
    if (result.mailbox_id) {
      selectedExternalMailboxId.value = Number(result.mailbox_id)
      selectedExternalAuthType.value =
        externalMailboxAuthTypeMap.value[Number(result.mailbox_id)] ||
        selectedExternalAuthType.value
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
    if (extractMailboxType(item) === 'hosted') {
      applyHostedMailboxListResult(item?.result)
      mailboxType.value = 'hosted'
      currentView.value = 'emails'
      return
    }
    applySystemMailboxListResult(item?.result)
    mailboxType.value = 'system'
    currentView.value = 'emails'
  },
  'mailboxes.delete': (item) => {
    const mailboxIds = extractToolIds(item, 'mailbox_id', 'mailbox_ids')
    if (extractMailboxType(item) === 'hosted') {
      handleHostedMailboxesDeleted(mailboxIds)
      return
    }
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
    if (mailboxTypeValue === 'hosted') {
      applyHostedEmailListResult(item?.result, mailboxId)
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
    if (extractMailboxType(item) === 'hosted') {
      handleHostedEmailsDeleted(emailIds)
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
  if (mailboxType.value === 'hosted') {
    await refreshHostedEmails()
    return
  }
  await refreshSystemEmails()
}, SYSTEM_EMAIL_REFRESH_INTERVAL)

// 第三方邮箱自动收取（10分钟）
const externalAutoFetch = useAutoRefresh(async () => {
  if (!isTauri()) return
  if (!userStore.isAuthenticated) return
  if (fetchingExternalEmails.value) return
  if (currentView.value !== 'emails') return

  await fetchAllExternalEmails({ silent: true })
  externalMailboxListRef.value?.loadTagsData?.()
}, 600)

const titleAlertRefresh = useAutoRefresh(async () => {
  await pollBrowserTitleAlerts()
}, TITLE_ALERT_POLL_INTERVAL)

watch(
  () => mailStore.emails,
  (emails) => {
    registerTitleAlertEmails('system', Array.isArray(emails) ? emails : [])
  }
)

watch(hostedEmails, (emails) => {
  registerTitleAlertEmails('hosted', Array.isArray(emails) ? emails : [])
})

watch(externalEmails, (emails) => {
  registerTitleAlertEmails('external', Array.isArray(emails) ? emails : [])
})

// 页面加载时获取数据并启动自动刷新
onMounted(async () => {
  window.addEventListener(
    'external-mailbox-recovered',
    handleRecoveredMailboxEvent as EventListener
  )
  window.addEventListener(AI_UI_SYNC_EVENT, handleAIUiSyncEvent as EventListener)
  document.addEventListener('visibilitychange', handleBrowserVisibilityChange)
  rememberBrowserBaseTitle()
  if (!titleAlertRefresh.isRunning.value) {
    titleAlertRefresh.start()
  }

  if (userStore.isAuthenticated) {
    // 加载邮箱列表
    await mailboxStore.fetchMailboxes()
    // 同时加载所有邮件（不选择特定邮箱）
    await mailStore.fetchUserEmails()
    await loadHostedDomainSummary()
    await loadSmtpAccounts()

    // 恢复上次使用的 Tab（临时邮箱 / 域名邮箱 / 第三方邮箱）
    const savedMailboxType = getSavedMailboxType()
    if (savedMailboxType) {
      switchMailboxType(savedMailboxType)
    } else {
      saveMailboxType(mailboxType.value)
    }
  } else {
    // 未登录也写默认值，避免首次进入没有偏好
    saveMailboxType(mailboxType.value)
    syncAutoRefreshStates()
    return
  }

  // 按恢复后的 Tab 启动对应刷新器
  if (mailboxType.value === 'external') {
    await loadExternalMailboxAuthTypes()
  }
  syncAutoRefreshStates()
})

onBeforeUnmount(() => {
  window.removeEventListener(
    'external-mailbox-recovered',
    handleRecoveredMailboxEvent as EventListener
  )
  window.removeEventListener(AI_UI_SYNC_EVENT, handleAIUiSyncEvent as EventListener)
  document.removeEventListener('visibilitychange', handleBrowserVisibilityChange)
  titleAlertRefresh.stop()
  clearBrowserTitleAlerts()
})

// 生成系统邮箱
const allocateMailbox = async () => {
  const result = await mailboxStore.allocateMailbox()
  if (result.success) {
    // 刷新用户信息以更新剩余邮箱数量
    await userStore.updateUserProfile()
  }
  showMessage(
    result.success
      ? t('home.allocateMailboxSuccess')
      : result.error || t('home.allocateMailboxFailed'),
    result.success ? 'success' : 'error'
  )
}

const handleCustomGenerateSuccess = async () => {
  await Promise.all([
    mailboxStore.fetchMailboxes(),
    mailStore.fetchUserEmails(),
    userStore.updateUserProfile(),
    loadHostedDomainSummary(),
    loadHostedEmails(1)
  ])
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

const handleSelectHostedMailbox = async (mailbox: any) => {
  selectedHostedMailboxId.value = Number(mailbox.id)
  selectedHostedEmailId.value = null
  hostedEmailPage.value = 1
  mailStore.selectedEmail = null
  await loadHostedEmails(1)
}

// 选择外部邮箱
const handleSelectExternalMailbox = async (account: any) => {
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
  if (currentView.value === 'outbox') {
    const mailboxId = Number(account.id)
    selectedOutboxMailboxId.value =
      selectedOutboxMailboxId.value === mailboxId ? null : mailboxId
    await nextTick()
    await outboxListRef.value?.loadSentEmails?.()
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

const handleReeditSentEmail = async (record: any) => {
  const mailboxId = Number(record?.external_mailbox_id || 0)
  if (mailboxId > 0) {
    selectedExternalMailboxIds.value = [mailboxId]
    selectedExternalMailboxId.value = mailboxId
  }
  currentView.value = 'send-email'
  await nextTick()
  await externalMailboxListRef.value?.ensureAccountVisible?.(mailboxId)
  await sendEmailPanelRef.value?.loadData?.()
  sendEmailPanelRef.value?.loadDraftFromSent?.(record)
}

const openOutboxView = async () => {
  currentView.value = 'outbox'
  await nextTick()
  await outboxListRef.value?.loadSentEmails?.()
}

const goToExternalOpsWorkbench = () => {
  router.push('/user/external-batch-verify')
}

const handleSelectHostedEmail = async (email: any) => {
  selectedHostedEmailId.value = Number(email.id)
  mailStore.selectedEmail = email

  const result = await mailStore.fetchEmailDetail(email.id, 'hosted')
  if (!result.success) {
    showMessage(result.error || t('home.emailNotFoundOrNoPermission'), 'error')
    selectedHostedEmailId.value = null
    mailStore.selectedEmail = null
    return
  }

  if (!email.is_read) {
    try {
      await unifiedAPI.markEmailRead(email.id, 'hosted')
      email.is_read = true
    } catch (error) {
      console.error('标记域名邮箱邮件已读失败:', error)
    }
  }
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
    showMessage(error?.message || t('common.operationFailed'), 'error')
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
      const msg = response.message || t('home.loadEmailsFailed')
      // 仅在邮箱不存在/无权限时清空，其他错误保留已有列表
      if (msg.includes('邮箱不存在') || msg.includes('无权限')) {
        externalEmails.value = []
        externalEmailTotal.value = 0
        selectedExternalMailboxId.value = null
        selectedExternalAuthType.value = 'password'
        selectedExternalEmailId.value = null
        clearSavedSelectedEmails(
          (email) => isExternalEmailRecord(email) && Number(email?.mailbox_id) === Number(mailboxId)
        )
        await loadAllExternalEmails()
      }
      showMessage(msg, 'error')
    }
  } catch (error) {
    console.error('❌ 获取外部邮箱邮件失败:', error)
    // 请求失败时保留已有邮件列表，不清空
    showMessage(t('home.loadEmailsFailed'), 'error')
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
      showMessage(t('home.desktopOnlyFetch'), 'warning')
      return
    }

    showMessage(t('externalMailbox.fetchingMailNow'), 'primary', 0)

    // 桌面端：统一走本地 Tauri 收取；OAuth2 只向后端拿 token
    const mailboxId = selectedExternalMailboxId.value
    let newCount = 0
    setExternalMailboxFetchingIds([mailboxId])

    if (selectedExternalAuthType.value === 'oauth2') {
      // OAuth2 邮箱：先获取 token，再走本地 IMAP XOAUTH2
      const tauriInvoke = await getTauriInvoke()
      if (!tauriInvoke) {
        showMessage(t('home.desktopNotReady'), 'error')
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
          typeof e === 'string' ? e : e?.message || t('home.fetchFailed')
        )
        if (rawMsg === '__oauth_reauthorizing__') {
          return
        }
        await batchLoginAPI.updateMailboxStatus(mailboxId, 'failed', rawMsg)
        showMessage(t('home.fetchFailedWithReason', { reason: rawMsg }), 'error')
        if (externalMailboxListRef.value?.loadAccounts) {
          externalMailboxListRef.value.loadAccounts()
        }
        return
      }
    } else {
      // 非 OAuth2 邮箱：走本地 Tauri
      const tauriInvoke = await getTauriInvoke()
      if (!tauriInvoke) {
        showMessage(t('home.desktopNotReady'), 'error')
        return
      }

      // 获取选中邮箱的详细信息
      const res = await batchLoginAPI.getAccounts(1, 100)
      const accountList = res.code === 0 ? res.data?.accounts || [] : []
      const account = accountList.find((a: any) => a.id === mailboxId)
      if (!account) {
        showMessage(t('home.mailboxNotFound'), 'error')
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
          serverUrl,
          proxy: await loadMailboxRuntimeProxy(account.id)
        })
        newCount = Number(result?.count || 0)
        await batchLoginAPI.updateMailboxStatus(mailboxId, 'active')
      } catch (e: any) {
        const rawMsg = typeof e === 'string' ? e : e?.message || t('home.fetchFailed')
        await batchLoginAPI.updateMailboxStatus(mailboxId, 'failed', rawMsg)
        showMessage(t('home.fetchFailedWithReason', { reason: rawMsg }), 'error')
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
    showMessage(t('home.fetchSuccessNewCount', { count: newCount }), 'success')
    if (externalMailboxListRef.value?.loadAccounts) {
      externalMailboxListRef.value.loadAccounts()
    }
  } catch (error: any) {
    console.error('❌ 收取邮件失败:', error)
    const errorMsg = error.response?.data?.message || error.message || t('common.operationFailed')
    showMessage(t('home.fetchFailedWithReason', { reason: errorMsg }), 'error')

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
    showMessage(result.error || t('home.emailNotFoundOrNoPermission'), 'error')
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

const handleReplyExternalEmail = async (email: any) => {
  const mailboxId = Number(email?.mailbox_id || selectedExternalMailboxId.value || 0)
  const replyTo = String(email?.from_addr || '').trim()

  if (!mailboxId || !replyTo) {
    showMessage(t('home.loadEmailDetailFailed'), 'error')
    return
  }

  mailboxType.value = 'external'
  currentView.value = 'send-email'
  selectedExternalMailboxId.value = mailboxId
  selectedExternalMailboxIds.value = [mailboxId]
  selectedExternalAuthType.value =
    externalMailboxAuthTypeMap.value[mailboxId] || selectedExternalAuthType.value

  await nextTick()
  sendEmailPanelRef.value?.loadReplyDraft?.({
    to: replyTo,
    subject: String(email?.subject || '')
  })
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
const fetchAllExternalEmails = async (options: { silent?: boolean } = {}) => {
  const silent = options.silent === true

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
      if (!silent) {
        showMessage(t('home.desktopNotReady'), 'error')
      }
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

    if (!silent) {
      showMessage(t('externalMailbox.fetchingMailNow'), 'primary', 0)
    }

    let totalNew = 0
    let failCount = 0
    const bootstrapOAuthEmailSet = new Set(pendingOAuthBootstrapEmails.value)

    const friendlyError = (msg: string) => {
      if (!msg) return t('home.fetchFailed')
      if (msg.includes('Unsafe Login') || msg.includes('unsafe login'))
        return t('home.fetchUnsafeLogin')
      if (
        msg.includes('auth') ||
        msg.includes('AUTH') ||
        msg.includes('password') ||
        msg.includes('授权')
      )
        return t('home.fetchAuthExpired')
      if (msg.includes('Connection') || msg.includes('connect') || msg.includes('timeout'))
        return t('home.fetchTimeout')
      if (msg.includes('Unable to parse')) return t('home.fetchServerError')
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
            const newCount = await fetchOAuthMailboxOnceById(tauriInvoke, account.id, {
              account
            })
            bootstrapOAuthEmailSet.delete(normalizeMailboxEmail(account.email))
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
            serverUrl,
            proxy: await loadMailboxRuntimeProxy(account.id)
          })
          await batchLoginAPI.updateMailboxStatus(account.id, 'active')
          return { success: true, newCount: Number(result.count || 0) }
        } catch (e: any) {
          console.error(`收取 ${account.email} 失败:`, e)
          const rawMsg = normalizeOAuthRecoveryErrorMessage(
            typeof e === 'string' ? e : e?.message || t('home.fetchFailed')
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
        if (!silent) {
          showMessage(t('home.fetchSuccessNewCount', { count: totalNew }), 'success')
        }
      } else {
        if (!silent) {
          showMessage(t('home.fetchDoneNoNewMail'), 'success')
        }
      }
    } else {
      if (!silent) {
        showMessage(t('home.fetchDoneWithFailures', { count: totalNew, failCount }), 'warning')
      }
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
    if (!silent) {
      showMessage(
        t('home.fetchFailedWithReason', {
          reason: error.response?.data?.message || error.message || t('common.operationFailed')
        }),
        'error'
      )
    }
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

const backToAllHostedEmails = async () => {
  selectedHostedMailboxId.value = null
  hostedEmailPage.value = 1
  await loadHostedEmails(1)
  hostedEmailListRef.value?.scrollToTop?.()
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

const toggleHostedUnread = async () => {
  showOnlyUnreadHosted.value = !showOnlyUnreadHosted.value
  hostedEmailPage.value = 1
  await loadHostedEmails(1)
}

// 打开邮件内容弹窗
const openEmailModal = (email: any) => {
  modalEmail.value = email
  showEmailModal.value = true
}

// 格式化日期
const formatDate = (date: string) => {
  return new Date(date).toLocaleString(getCurrentLocale())
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

const handleSearchHostedEmails = async (keyword: string) => {
  hostedSearchKeyword.value = keyword
  hostedEmailPage.value = 1
  await loadHostedEmails(1)
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

const handleHostedEmailPageChange = async (page: number) => {
  hostedEmailPage.value = page
  await loadHostedEmails(page)
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

const handleBatchDeleteHostedEmails = (ids: number[]) => {
  console.log('🟢 域名邮箱邮件批量删除，ids:', ids)
  deletingIds.value = ids
  deletingBatch.value = true
  showDeleteConfirm.value = true
}

// 确认删除
const confirmDeleteEmails = async () => {
  deleting.value = true
  try {
    const emailType =
      mailboxType.value === 'system'
        ? 'system'
        : mailboxType.value === 'hosted'
          ? 'hosted'
          : 'external'

    if (deletingBatch.value) {
      // 使用批量删除接口
      await unifiedAPI.batchDeleteEmails(deletingIds.value, emailType)
      showMessage(t('home.deleteEmailsSuccess', { count: deletingIds.value.length }), 'success')
    } else {
      const result = await unifiedAPI.deleteEmail(deletingIds.value[0], emailType)
      if (result.data?.code === 0 || result.code === 0) {
        showMessage(t('home.deleteEmailSuccess'), 'success')
      } else {
        showMessage(result.data?.message || result.message || t('home.deleteFailed'), 'error')
      }
    }

    if (emailType === 'external') {
      handleExternalEmailsDeleted(deletingIds.value)
    } else if (emailType === 'hosted') {
      handleHostedEmailsDeleted(deletingIds.value)
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
    } else if (emailType === 'hosted') {
      await loadHostedEmails(hostedEmailPage.value || 1)
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
      } else if (mailboxType.value === 'hosted') {
        if (hostedEmailListRef.value?.cancelBatchMode) {
          hostedEmailListRef.value.cancelBatchMode()
        }
      } else {
        if (externalEmailListRef.value?.cancelBatchMode) {
          externalEmailListRef.value.cancelBatchMode()
        }
      }
    }
  } catch (error: any) {
    console.error('❌ 删除邮件失败:', error)
    showMessage(
      `${t('home.deleteFailed')}: ${error.response?.data?.message || error.message || t('common.operationFailed')}`,
      'error'
    )
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
  }
}

// 复制验证码
const copyVerificationCode = (code: string) => {
  navigator.clipboard.writeText(code)
  showMessage(t('home.copyCodeSuccess'), 'success')
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
