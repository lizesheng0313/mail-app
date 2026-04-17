<template>
  <MailboxList
    ref="mailboxListRef"
    :title="t('home.externalMailbox')"
    :mailboxes="displayAccounts"
    :selectedId="activeMailboxId ?? selectedId"
    :showPagination="true"
    :hideBatchMode="isSendEmailView"
    :searchable="true"
    :search-keyword="searchKeyword"
    @select="$emit('select', $event)"
    @batch-delete="handleBatchDelete"
    @batch-share="handleBatchShare"
    @batch-mode-start="$emit('batch-mode-start')"
    @search="handleSearch"
  >
    <template #pagination>
      <Pagination
        :current-page="currentPage"
        :total-pages="totalPages"
        :total="totalAccounts"
        @page-change="loadAccounts"
      />
    </template>
    <template
      #content="{ mailboxes, selectedId, batchMode, selectedIds, toggleSelection, onSelect }"
    >
      <MailboxCard
        v-for="account in mailboxes"
        :key="account.id"
        :batch-mode="batchMode"
        :checked="selectedIds.includes(toAccountId(account))"
        :card-class="[
          getSendItemClass(account, selectedId, batchMode, selectedIds),
          isSendEmailView && !hasSmtp(account.email) ? 'cursor-not-allowed' : 'cursor-pointer'
        ]"
        @click="handleItemClick(account, batchMode, toggleSelection, onSelect)"
      >
        <template #leading>
          <div
            v-if="!batchMode && isSendEmailView"
            class="mr-2 flex h-5 w-5 flex-shrink-0 items-center justify-center"
          >
            <svg
              v-if="(selectedSendIds || []).map(toNumberId).includes(toAccountId(account))"
              class="h-5 w-5 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div
              v-else
              class="h-4 w-4 rounded-full border-2"
              :class="hasSmtp(account.email) ? 'border-gray-300' : 'border-gray-200'"
            ></div>
          </div>
        </template>
        <div class="flex items-center gap-2 min-w-0">
          <span
            v-if="account.status === 'active'"
            class="w-2 h-2 rounded-full flex-shrink-0 bg-green-500"
            :title="t('externalMailbox.online')"
          ></span>
          <span
            v-else-if="account.status === 'failed'"
            class="w-2 h-2 rounded-full flex-shrink-0 bg-red-500"
            :title="`${t('externalMailbox.connectionFailed')}${account.error_message ? `: ${account.error_message}` : ''}`"
          ></span>
          <span
            v-else
            class="w-2 h-2 rounded-full flex-shrink-0 bg-gray-400"
            :title="t('externalMailbox.disabled')"
          ></span>
          <div class="min-w-0 max-w-full text-left">
            <code
              class="block text-sm truncate"
              :class="[
                account.status === 'failed' ? 'text-red-600' : 'text-black',
                isSendEmailView && !hasSmtp(account.email) ? 'opacity-50' : ''
              ]"
            >
              {{ account.email }}
            </code>
          </div>
        </div>
        <p
          v-if="!isSendEmailView || (account.status === 'failed' && account.error_message)"
          class="text-xs mt-1"
          :class="account.status === 'failed' ? 'text-red-500' : 'text-gray-600'"
        >
          <span v-if="account.status === 'failed' && account.error_message">
            {{ account.error_message }}
          </span>
          <span v-else>
            {{ getUpdatedText(account) }}
          </span>
        </p>
        <MailboxTags
          v-if="!isSendEmailView && toAccountId(account) in tagsData"
          :mailbox-id="toAccountId(account)"
          mailbox-type="external"
          :editable="!batchMode"
          :max-display="3"
          :initial-sites="tagsData[toAccountId(account)]?.sites || []"
          :initial-tags="tagsData[toAccountId(account)]?.tags || []"
        />
        <template #actions>
          <div
            class="relative"
            @mouseenter="handleActionMenuEnter(toAccountId(account), $event)"
            @mouseleave="handleActionMenuLeave(toAccountId(account))"
          >
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
              :title="t('externalMailbox.moreActions')"
              @click.stop="openActionMenu(toAccountId(account), $event)"
            >
              <BaseIcon name="more" size="sm" />
            </button>
            <div
              v-if="openMenuId === toAccountId(account)"
              :class="[
                'absolute right-0 z-20 min-w-[128px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg',
                openMenuPlacement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
              ]"
              @click.stop
            >
              <button
                type="button"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                @click.stop="handleCopyEmail(account.email)"
              >
                <BaseIcon name="copy" size="sm" />
                {{ t('externalMailbox.copyMailbox') }}
              </button>
              <button
                v-if="!isSendEmailView"
                type="button"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                @click.stop="handleShareAction(account)"
              >
                <BaseIcon name="share" size="sm" />
                {{ t('externalMailbox.shareMailbox') }}
              </button>
              <button
                v-if="!isSendEmailView && isDesktop"
                type="button"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="mergedFetchingIds.includes(toAccountId(account))"
                @click.stop="handleRefreshAction(toAccountId(account))"
              >
                <BaseIcon
                  name="refresh"
                  size="sm"
                  :class="{ 'animate-spin': mergedFetchingIds.includes(toAccountId(account)) }"
                />
                {{ mergedFetchingIds.includes(toAccountId(account)) ? t('externalMailbox.fetching') : t('externalMailbox.fetchMail') }}
              </button>
              <button
                type="button"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                @click.stop="handleDeleteAction(toAccountId(account))"
              >
                <BaseIcon name="delete" size="sm" />
                {{ t('externalMailbox.deleteAccount') }}
              </button>
            </div>
          </div>
        </template>
      </MailboxCard>
    </template>
  </MailboxList>

  <ConfirmDialog
    :visible="showConfirm"
    :mask="false"
    :title="isDeleting.batch ? t('externalMailbox.batchDeleteTitle') : t('externalMailbox.deleteTitle')"
    :message="isDeleting.batch ? t('externalMailbox.deleteBatchMessage', { count: isDeleting.ids.length }) : t('externalMailbox.deleteSingleMessage')"
    :loading="deleting"
    @confirm="confirmDelete"
    @cancel="showConfirm = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import MailboxList from '@/components/Mail/MailboxList/MailboxList.vue'
import MailboxCard from '@/components/Mail/MailboxList/MailboxCard.vue'
import Pagination from '@/components/Pagination/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import BaseIcon from '@/components/BaseIcon/index.vue'
import MailboxTags from '@/components/MailboxTags/index.vue'
import { batchLoginAPI } from '@/api/batchLogin'
import { unifiedAPI } from '@/api/unified'
import { mailboxTagsAPI } from '@/api/mailboxTags'
import { showMessage } from '@/utils/message'
import { normalizeOAuthRecoveryErrorMessage } from '@/utils/oauthRecovery'
import { formatTimestamp } from '@/utils/timeUtils'
import { isTauri, getServerUrl } from '@/services/api'
import { runDesktopOAuthMailboxAction } from '@/services/desktopOAuthMailbox'
import { canDesktopSmtpSend, normalizeSmtpEmail } from '@/utils/smtpCapability'

const props = defineProps<{
  isSendEmailView?: boolean
  activeMailboxId?: number | null
  selectedSendIds?: number[]
  smtpAccounts?: any[]
  fetchingIds?: number[]
}>()
const { t } = useI18n()

const isDesktop = isTauri()

// SMTP 状态查询
const smtpEmailSet = computed(() => {
  const set = new Set<string>()
  if (props.smtpAccounts) {
    for (const a of props.smtpAccounts) {
      if (canDesktopSmtpSend(a)) set.add(normalizeSmtpEmail(a.email))
    }
  }
  return set
})

const hasSmtp = (email: string) => smtpEmailSet.value.has(normalizeSmtpEmail(email))
const toNumberId = (value: unknown) => {
  const id = Number(value)
  return Number.isFinite(id) ? id : 0
}
const toAccountId = (account: any) => toNumberId(account?.id)

const getSendItemClass = (account: any, selectedId: any, batchMode: boolean, selectedIds: any) => {
  const accountId = toAccountId(account)
  if (props.isSendEmailView) {
    const selected = (props.selectedSendIds || []).map(toNumberId).includes(accountId)
    if (selected) return 'bg-primary-100 border-primary-300'
    if (!hasSmtp(account.email)) return 'bg-gray-50 opacity-60'
    return 'bg-gray-50 hover:bg-primary-50'
  }
  if (batchMode && selectedIds?.map?.(toNumberId)?.includes?.(accountId)) return 'bg-primary-100 border-primary-200'
  if (toNumberId(selectedId) === accountId) return 'bg-primary-100 border-primary-200'
  return 'bg-gray-50 hover:bg-primary-100'
}

const handleItemClick = (
  account: any,
  batchMode: boolean,
  toggleSelection: Function,
  onSelect: Function
) => {
  if (batchMode) {
    closeActionMenu()
    toggleSelection(account.id)
    return
  }
  // 发件模式下，SMTP未验证的不让选
  if (props.isSendEmailView && !hasSmtp(account.email)) {
    return
  }
  closeActionMenu()
  selectedId.value = toAccountId(account)
  onSelect(account)
}

const emit = defineEmits<{
  select: [id: number]
  refresh: []
  share: [mailboxes: any[]]
  'oauth-reauthorize': [account: any]
  'batch-mode-start': []
  deleted: [ids: number[]]
}>()

const accounts = ref([])
const showConfirm = ref(false)
const deleting = ref(false)
const isDeleting = ref({ batch: false, ids: [] as number[] })
const selectedId = ref<number | null>(null)
const fetchingIds = ref<number[]>([])
const mailboxListRef = ref()
const tagsData = ref<Record<number, { sites: any[]; tags: any[] }>>({})
const openMenuId = ref<number | null>(null)
const openMenuPlacement = ref<'up' | 'down'>('down')
let closeMenuTimer: ReturnType<typeof setTimeout> | null = null
const mergedFetchingIds = computed(() => {
  const ids = [...(props.fetchingIds || []), ...fetchingIds.value]
  return Array.from(new Set(ids))
})

// 分页数据
const currentPage = ref(1)
const totalPages = ref(1)
const totalAccounts = ref(0)
const searchKeyword = ref('')

const displayAccounts = computed(() => {
  if (!props.isSendEmailView) {
    return accounts.value
  }

  return [...accounts.value].sort((first: any, second: any) => {
    const firstCanSend = hasSmtp(first.email) ? 1 : 0
    const secondCanSend = hasSmtp(second.email) ? 1 : 0
    if (firstCanSend !== secondCanSend) {
      return secondCanSend - firstCanSend
    }
    return (second.id || 0) - (first.id || 0)
  })
})

const formatDate = (date: string | number) => {
  if (!date) return t('externalMailbox.unknown')
  const timestamp = typeof date === 'number' ? date : new Date(date).getTime()
  if (isNaN(timestamp)) return t('externalMailbox.unknown')
  return formatTimestamp(timestamp, 'datetime')
}

const getUpdatedText = (account: any) => t('externalMailbox.updatedAt', {
  date: account.last_sync_at || account.created_at
    ? formatDate(account.last_sync_at || account.created_at)
    : t('externalMailbox.notFetched')
})

const handleRecoveredMailbox = () => {
  void loadAccounts(currentPage.value || 1)
}

const closeActionMenu = () => {
  if (closeMenuTimer) {
    clearTimeout(closeMenuTimer)
    closeMenuTimer = null
  }
  openMenuId.value = null
}

const resolveMenuPlacement = (event: Event) => {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return 'down' as const

  const triggerRect = target.getBoundingClientRect()
  const scrollContainer = target.closest('.scrollbar-stable') as HTMLElement | null
  const containerBottom = scrollContainer
    ? Math.min(scrollContainer.getBoundingClientRect().bottom, window.innerHeight)
    : window.innerHeight
  const spaceBelow = containerBottom - triggerRect.bottom
  return spaceBelow < 200 ? 'up' : 'down'
}

const openActionMenu = (accountId: number, event: Event) => {
  if (closeMenuTimer) {
    clearTimeout(closeMenuTimer)
    closeMenuTimer = null
  }
  openMenuId.value = accountId
  openMenuPlacement.value = resolveMenuPlacement(event)
}

const handleActionMenuEnter = (accountId: number, event: Event) => {
  openActionMenu(accountId, event)
}

const handleActionMenuLeave = (accountId: number) => {
  if (openMenuId.value === accountId) {
    closeMenuTimer = setTimeout(() => {
      if (openMenuId.value === accountId) {
        openMenuId.value = null
      }
      closeMenuTimer = null
    }, 160)
  }
}

const applyAccountsPagination = (pagination?: any, fallbackCount = accounts.value.length) => {
  if (pagination) {
    currentPage.value = Number(pagination.page || pagination.current_page || 1)
    totalPages.value = Number(pagination.total_pages || 0)
    totalAccounts.value = Number(pagination.total || fallbackCount || 0)
    return
  }

  totalAccounts.value = fallbackCount
  totalPages.value = fallbackCount > 0 ? Math.max(1, Math.ceil(fallbackCount / 20)) : 0
  currentPage.value = 1
}

const replaceAccounts = (items: any[] = [], pagination?: any) => {
  accounts.value = Array.isArray(items) ? [...items] : []
  applyAccountsPagination(pagination, accounts.value.length)

  if (accounts.value.length > 0) {
    loadTagsData()
  } else {
    tagsData.value = {}
  }
}

const upsertAccounts = (items: any[] = []) => {
  if (!items.length) return

  let addedCount = 0
  const nextAccounts = [...accounts.value]
  for (const item of items) {
    const accountId = Number(item?.id)
    if (!Number.isFinite(accountId) || accountId <= 0) continue

    const index = nextAccounts.findIndex((account: any) => Number(account?.id) === accountId)
    if (index >= 0) {
      nextAccounts[index] = { ...nextAccounts[index], ...item }
    } else {
      nextAccounts.unshift(item)
      addedCount += 1
    }
  }

  accounts.value = nextAccounts
  if (addedCount > 0) {
    totalAccounts.value += addedCount
    totalPages.value = Math.max(1, Math.ceil(totalAccounts.value / 20))
  }
  loadTagsData()
}

const removeAccounts = (ids: number[] = []) => {
  const idSet = new Set(
    ids.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
  )
  if (!idSet.size) return

  const originalCount = accounts.value.length
  accounts.value = accounts.value.filter((account: any) => !idSet.has(Number(account?.id)))
  const removedCount = originalCount - accounts.value.length

  if (selectedId.value && idSet.has(Number(selectedId.value))) {
    selectedId.value = null
  }

  if (removedCount > 0) {
    totalAccounts.value = Math.max(0, totalAccounts.value - removedCount)
    totalPages.value = totalAccounts.value > 0 ? Math.max(1, Math.ceil(totalAccounts.value / 20)) : 0
  }

  if (accounts.value.length > 0) {
    loadTagsData()
  } else {
    tagsData.value = {}
  }
}

const loadAccounts = async (page = 1) => {
  try {
    const res = await batchLoginAPI.getAccounts(page, 20, {
      search: searchKeyword.value
    })

    if (res.code === 0) {
      const data = res.data || []
      replaceAccounts(Array.isArray(data) ? data : data.accounts || [], data.pagination)
    } else {
      console.error('❌ API返回错误:', res.message)
    }
  } catch (e) {
    console.error('❌ 加载外部邮箱失败', e)
  }
}

const ensureAccountVisible = async (accountId: number) => {
  const normalizedId = toNumberId(accountId)
  if (!normalizedId) return

  const exists = accounts.value.some((account: any) => toAccountId(account) === normalizedId)
  if (exists) return

  try {
    const response = await batchLoginAPI.getAllAccounts(100, {
      suppressErrorMessage: true,
    })
    if (response.code !== 0) return

    const data = response.data || {}
    const allAccounts = Array.isArray(data) ? data : data.accounts || []
    const matched = allAccounts.find((account: any) => toAccountId(account) === normalizedId)
    if (matched) {
      upsertAccounts([matched])
    }
  } catch (error) {
    console.error('补充外部邮箱到当前列表失败', error)
  }
}

const handleSearch = async (keyword: string) => {
  searchKeyword.value = String(keyword || '').trim()
  await loadAccounts(1)
}

// 批量加载邮箱标签数据
const loadTagsData = async () => {
  try {
    const ids = accounts.value.map((a: any) => Number(a.id))
    if (ids.length === 0) return

    const res = await mailboxTagsAPI.getBatchMailboxTags('external', ids)
    if (res.data) {
      tagsData.value = res.data
    }
  } catch (e) {
    console.error('加载标签数据失败:', e)
  }
}

const handleDelete = (id: number) => {
  isDeleting.value = { batch: false, ids: [id] }
  showConfirm.value = true
}

const handleShare = (account: any) => {
  emit('share', [account])
}

const handleCopyEmail = (text: string) => {
  closeActionMenu()
  copy(text)
}

const handleShareAction = (account: any) => {
  closeActionMenu()
  handleShare(account)
}

const handleDeleteAction = (id: number) => {
  closeActionMenu()
  handleDelete(id)
}

const handleBatchDelete = (ids: number[]) => {
  console.log('🟢 外部邮箱组件 - handleBatchDelete 被调用')
  console.log('🟢 接收到的 ids:', ids)
  console.log('🟢 ids 类型:', typeof ids)
  console.log('🟢 ids 是数组吗:', Array.isArray(ids))
  if (!ids || ids.length === 0) {
    console.warn('⚠️ 外部邮箱组件 - ids 为空或长度为0')
    showMessage(t('externalMailbox.selectDeleteWarning'), 'warning')
    return
  }
  console.log('🟢 准备显示确认对话框')
  isDeleting.value = { batch: true, ids }
  showConfirm.value = true
  console.log('🟢 showConfirm 设置为:', showConfirm.value)
}

const handleBatchShare = (ids: number[]) => {
  console.log('🟢 外部邮箱 - 批量分享，ids:', ids)
  // 获取选中的邮箱对象
  const selectedAccounts = accounts.value.filter((a) => ids.includes(a.id))
  emit('share', selectedAccounts)
}

const copy = (text: string) => {
  navigator.clipboard.writeText(text)
  showMessage(t('mail.copied'), 'success')
}

const handleRefreshAction = (accountId: number) => {
  closeActionMenu()
  fetchSingleMailbox(accountId)
}

const handleWindowClick = () => {
  closeActionMenu()
}

const confirmDelete = async () => {
  deleting.value = true
  try {
    const deletedIds = [...isDeleting.value.ids]
    await Promise.all(deletedIds.map((id) => unifiedAPI.deleteMailbox(id, 'external')))
    showMessage(t('externalMailbox.batchDeleted', { count: deletedIds.length }))
    emit('deleted', deletedIds)
    await loadAccounts()
    emit('refresh')
  } catch (e: any) {
    showMessage(e.message || t('systemMailbox.deleteFailed'), 'error')
  } finally {
    deleting.value = false
    showConfirm.value = false
  }
}

// 收取单个邮箱的邮件
const fetchSingleMailbox = async (accountId: number) => {
  // 防止重复点击
  if (fetchingIds.value.includes(accountId)) {
    return
  }

  // 立即显示收取中状态
  fetchingIds.value.push(accountId)

  try {
    const account = accounts.value.find((a: any) => a.id === accountId)
    if (!account) {
      showMessage(t('externalMailbox.mailboxNotFound'), 'error')
      return
    }

    if (!isDesktop) {
      showMessage(t('externalMailbox.desktopOnlyFetch'), 'warning')
      return
    }

    showMessage(t('externalMailbox.fetchingMailNow'), 'primary', 0)

    if (account.auth_type === 'oauth2') {
      // OAuth2 邮箱 + 桌面端：先获取 token，再走本地 IMAP XOAUTH2
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const token = localStorage.getItem('token') || ''
        const serverUrl = getServerUrl()

        await runDesktopOAuthMailboxAction(account.id, async (tokenPayload) => {
          return invoke('fetch_emails', {
            mailboxId: account.id,
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
        showMessage(t('externalMailbox.fetchSuccess'), 'success')
      } catch (e: any) {
        const message = typeof e === 'string' ? e : e.message || t('externalMailbox.fetchFailed')
        if (String(account.password || '').trim()) {
          try {
            const { invoke } = await import('@tauri-apps/api/core')
            const token = localStorage.getItem('token') || ''
            const serverUrl = getServerUrl()
            await invoke('recover_and_fetch_external_mailbox', {
              mailboxId: account.id,
              token,
              serverUrl
            })
            window.dispatchEvent(
              new CustomEvent('external-mailbox-recovered', {
                detail: { mailboxId: account.id }
              })
            )
            showMessage(t('externalMailbox.fetchSuccess'), 'success')
          } catch (recoveryError: any) {
            const recoveryMessage = normalizeOAuthRecoveryErrorMessage(
              typeof recoveryError === 'string' ? recoveryError : recoveryError?.message || message
            )
            try {
              await batchLoginAPI.updateMailboxStatus(account.id, 'failed', recoveryMessage)
              window.dispatchEvent(
                new CustomEvent('external-mailbox-updated', {
                  detail: { mailboxId: account.id }
                })
              )
            } catch (statusError) {}
            showMessage(
              recoveryMessage,
              'error'
            )
          }
        } else {
          emit('oauth-reauthorize', account)
        }
      }
    } else {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const token = localStorage.getItem('token') || ''
        const serverUrl = getServerUrl()
        const host = account.protocol === 'imap' ? account.imap_host : account.pop3_host
        const port = account.protocol === 'imap' ? account.imap_port : account.pop3_port

        await invoke('fetch_emails', {
          mailboxId: account.id,
          email: account.email,
          password: account.password,
          protocol: account.protocol,
          host: host || null,
          port: port || null,
          token,
          serverUrl
        })
        showMessage(t('externalMailbox.fetchSuccess'), 'success')
      } catch (e: any) {
        showMessage(typeof e === 'string' ? e : e.message || t('externalMailbox.fetchFailed'), 'error')
      }
    }
    await loadAccounts()
    emit('refresh')
  } catch (e: any) {
    showMessage(typeof e === 'string' ? e : e.message || t('externalMailbox.fetchFailed'), 'error')
    await loadAccounts()
  } finally {
    fetchingIds.value = fetchingIds.value.filter((id) => id !== accountId)
  }
}

// 暴露加载方法给父组件调用（不要在onMounted自动加载）
defineExpose({
  loadAccounts,
  ensureAccountVisible,
  replaceAccounts,
  upsertAccounts,
  removeAccounts,
  loadTagsData,
  cancelBatchMode: () => {
    console.log('🔵 外部邮箱组件 - cancelBatchMode 被调用')
    if (mailboxListRef.value?.cancelBatchMode) {
      mailboxListRef.value.cancelBatchMode()
    }
  },
  isBatchMode: computed(() => mailboxListRef.value?.isBatchMode),
  selectedIds: computed(() => mailboxListRef.value?.selectedIds),
  toggleSelection: (id: number) => {
    if (mailboxListRef.value?.toggleSelection) {
      mailboxListRef.value.toggleSelection(id)
    }
  }
})

onMounted(() => {
  window.addEventListener('click', handleWindowClick)
  window.addEventListener('external-mailbox-recovered', handleRecoveredMailbox)
  window.addEventListener('external-mailbox-updated', handleRecoveredMailbox)
})

onBeforeUnmount(() => {
  if (closeMenuTimer) {
    clearTimeout(closeMenuTimer)
    closeMenuTimer = null
  }
  window.removeEventListener('click', handleWindowClick)
  window.removeEventListener('external-mailbox-recovered', handleRecoveredMailbox)
  window.removeEventListener('external-mailbox-updated', handleRecoveredMailbox)
})
</script>
