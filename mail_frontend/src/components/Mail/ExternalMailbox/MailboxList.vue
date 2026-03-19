<template>

  <MailboxList
    ref="mailboxListRef"
    title="第三方邮箱"
    :mailboxes="displayAccounts"
    :selectedId="activeMailboxId ?? selectedId"
    :showPagination="true"
    :hideBatchMode="isSendEmailView"
    @select="$emit('select', $event)"
    @batch-delete="handleBatchDelete"
    @batch-share="handleBatchShare"
  >
    <template #pagination>
      <Pagination
        :current-page="currentPage"
        :total-pages="totalPages"
        :total="totalAccounts"
        @page-change="loadAccounts"
      />
    </template>
    <template #content="{ mailboxes, selectedId, batchMode, selectedIds, toggleSelection, onSelect }">
      <div
        v-for="account in mailboxes"
        :key="account.id"
        class="group rounded-lg border border-transparent p-3"
        :class="[getSendItemClass(account, selectedId, batchMode, selectedIds), isSendEmailView && !hasSmtp(account.email) ? 'cursor-not-allowed' : 'cursor-pointer']"
        @click="handleItemClick(account, batchMode, toggleSelection, onSelect)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center flex-1 min-w-0">
            <input
              v-if="batchMode"
              type="checkbox"
              :checked="selectedIds.includes(account.id)"
              @change.stop="toggleSelection(account.id)"
              class="w-4 h-4 mr-3 cursor-pointer flex-shrink-0"
            />
            <!-- 发件模式下的选中图标 -->
            <div v-else-if="isSendEmailView" class="w-5 h-5 mr-2 flex-shrink-0 flex items-center justify-center">
              <svg
                v-if="(selectedSendIds || []).includes(account.id)"
                class="w-5 h-5 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div
                v-else
                class="w-4 h-4 rounded-full border-2"
                :class="hasSmtp(account.email) ? 'border-gray-300' : 'border-gray-200'"
              ></div>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span 
                  v-if="account.status === 'active'"
                  class="w-2 h-2 rounded-full flex-shrink-0 bg-green-500"
                  title="🟢 在线"
                ></span>
                <span 
                  v-else-if="account.status === 'failed'"
                  class="w-2 h-2 rounded-full flex-shrink-0 bg-red-500"
                  :title="'🔴 连接失败' + (account.error_message ? ': ' + account.error_message : '')"
                ></span>
                <span 
                  v-else
                  class="w-2 h-2 rounded-full flex-shrink-0 bg-gray-400"
                  title="⚪ 已禁用"
                ></span>
                <code class="text-sm truncate" :class="[
                  account.status === 'failed' ? 'text-red-600' : 'text-black',
                  isSendEmailView && !hasSmtp(account.email) ? 'opacity-50' : ''
                ]">
                  {{ account.email }}
                </code>
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
                  更新：{{ (account.last_sync_at || account.created_at) ? formatDate(account.last_sync_at || account.created_at) : '未收取' }}
                </span>
              </p>
              <!-- 站点和标签 -->
              <MailboxTags
                v-if="!isSendEmailView && account.id in tagsData"
                :mailbox-id="account.id"
                mailbox-type="external"
                :editable="!batchMode"
                :show-add-button="!batchMode"
                :max-display="3"
                :initial-sites="tagsData[account.id]?.sites || []"
                :initial-tags="tagsData[account.id]?.tags || []"
              />
            </div>
          </div>
          <div v-if="!batchMode" class="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 flex-shrink-0">
            <ActionButton
              icon="copy"
              variant="copy"
              tooltip="复制邮箱"
              @click.stop="copy(account.email)"
            />
            <ActionButton
              v-if="!isSendEmailView"
              icon="share"
              variant="primary"
              tooltip="分享邮箱"
              @click.stop="handleShare(account)"
            />
            <ActionButton
              icon="delete"
              variant="delete"
              tooltip="删除账号"
              @click.stop="handleDelete(account.id)"
            />
            <ActionButton
              v-if="!isSendEmailView && (isDesktop || account.auth_type === 'oauth2')"
              icon="refresh"
              variant="primary"
              :tooltip="fetchingIds.includes(account.id) ? '收取中...' : '收取邮件'"
              :disabled="fetchingIds.includes(account.id)"
              :class="{ 'animate-spin': fetchingIds.includes(account.id) }"
              @click.stop="fetchSingleMailbox(account.id)"
            />
          </div>
        </div>
      </div>
    </template>
  </MailboxList>

  <ConfirmDialog
    :visible="showConfirm"
    :title="isDeleting.batch ? '批量删除' : '删除账号'"
    :message="isDeleting.batch ? `确定删除 ${isDeleting.ids.length} 个账号？` : '确定删除这个账号？'"
    :loading="deleting"
    @confirm="confirmDelete"
    @cancel="showConfirm = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import MailboxList from '@/components/Mail/MailboxList/MailboxList.vue'
import Pagination from '@/components/Pagination/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import MailboxTags from '@/components/MailboxTags/index.vue'
import { batchLoginAPI } from '@/api/batchLogin'
import { unifiedAPI } from '@/api/unified'
import { mailboxTagsAPI } from '@/api/mailboxTags'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils'
import { isTauri, getServerUrl } from '@/services/api'
const isDesktop = isTauri()

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

const props = defineProps<{
  isSendEmailView?: boolean
  activeMailboxId?: number | null
  selectedSendIds?: number[]
  smtpAccounts?: any[]
}>()

// SMTP 状态查询
const smtpEmailSet = computed(() => {
  const set = new Set<string>()
  if (props.smtpAccounts) {
    for (const a of props.smtpAccounts) {
      if (a.status === 'active') set.add(a.email)
    }
  }
  return set
})

const hasSmtp = (email: string) => smtpEmailSet.value.has(email)

const getSendItemClass = (account: any, selectedId: any, batchMode: boolean, selectedIds: any) => {
  if (props.isSendEmailView) {
    const selected = (props.selectedSendIds || []).includes(account.id)
    if (selected) return 'bg-primary-100 border-primary-300'
    if (!hasSmtp(account.email)) return 'bg-gray-50 opacity-60'
    return 'bg-gray-50 hover:bg-primary-50'
  }
  if (batchMode && selectedIds?.includes?.(account.id)) return 'bg-primary-100 border-primary-200'
  if (selectedId === account.id) return 'bg-primary-100 border-primary-200'
  return 'bg-gray-50 hover:bg-primary-100'
}

const handleItemClick = (account: any, batchMode: boolean, toggleSelection: Function, onSelect: Function) => {
  if (batchMode) {
    toggleSelection(account.id)
    return
  }
  // 发件模式下，SMTP未验证的不让选
  if (props.isSendEmailView && !hasSmtp(account.email)) {
    return
  }
  selectedId.value = account.id
  onSelect(account)
}

const emit = defineEmits<{
  'select': [id: number]
  'refresh': []
  'share': [mailboxes: any[]]
}>()

const accounts = ref([])
const showConfirm = ref(false)
const deleting = ref(false)
const isDeleting = ref({ batch: false, ids: [] as number[] })
const selectedId = ref<number | null>(null)
const fetchingIds = ref<number[]>([])
const mailboxListRef = ref()
const tagsData = ref<Record<number, { sites: any[], tags: any[] }>>({})

// 分页数据
const currentPage = ref(1)
const totalPages = ref(1)
const totalAccounts = ref(0)

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
  if (!date) return '未知'
  const timestamp = typeof date === 'number' ? date : new Date(date).getTime()
  if (isNaN(timestamp)) return '未知'
  return formatTimestamp(timestamp, 'datetime')
}

const loadAccounts = async (page = 1) => {
  try {
    const res = await batchLoginAPI.getAccounts(page, 20)
    
    if (res.code === 0) {
      // 确保是数组：如果 res.data 是对象，提取 accounts 数组
      const data = res.data || []
      accounts.value = Array.isArray(data) ? data : (data.accounts || [])
      
      // 处理分页信息
      if (data.pagination) {
        currentPage.value = data.pagination.current_page || page
        totalPages.value = data.pagination.total_pages || 1
        totalAccounts.value = data.pagination.total || accounts.value.length
      } else if (data.total) {
        totalAccounts.value = data.total
        totalPages.value = Math.ceil(data.total / 20)
        currentPage.value = page
      } else {
        totalAccounts.value = accounts.value.length
        totalPages.value = 1
        currentPage.value = 1
      }
      
      // 批量加载标签数据
      if (accounts.value.length > 0) {
        loadTagsData()
      }
    } else {
      console.error('❌ API返回错误:', res.message)
    }
  } catch (e) {
    console.error('❌ 加载外部邮箱失败', e)
  }
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

const handleBatchDelete = (ids: number[]) => {
  console.log('🟢 外部邮箱组件 - handleBatchDelete 被调用')
  console.log('🟢 接收到的 ids:', ids)
  console.log('🟢 ids 类型:', typeof ids)
  console.log('🟢 ids 是数组吗:', Array.isArray(ids))
  if (!ids || ids.length === 0) {
    console.warn('⚠️ 外部邮箱组件 - ids 为空或长度为0')
    showMessage('请先选择要删除的邮箱', 'warning')
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
  const selectedAccounts = accounts.value.filter(a => ids.includes(a.id))
  emit('share', selectedAccounts)
}

const copy = (text: string) => {
  navigator.clipboard.writeText(text)
  showMessage('已复制', 'success')
}

const confirmDelete = async () => {
  deleting.value = true
  try {
    await Promise.all(
      isDeleting.value.ids.map(id => unifiedAPI.deleteMailbox(id, 'external'))
    )
    showMessage(`已删除 ${isDeleting.value.ids.length} 个账号`)
    await loadAccounts()
  } catch (e: any) {
    showMessage(e.message || '删除失败', 'error')
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
  showMessage('正在收取邮件...', 'success')

  try {
    const account = accounts.value.find((a: any) => a.id === accountId)
    if (!account) {
      showMessage('邮箱不存在', 'error')
      return
    }

    // OAuth2 邮箱统一走后端 OAuth2 拉取（Web/桌面一致）
    if (account.auth_type === 'oauth2') {
      const res = await batchLoginAPI.fetchOAuth2Emails(account.id)
      if (res.code === 0) {
        showMessage(res.message || '收取成功', 'success')
      } else {
        showMessage(res.message || '收取失败', 'error')
      }
      await loadAccounts()
      emit('refresh')
      return
    }

    const tauriInvoke = await getTauriInvoke()
    if (tauriInvoke) {
      // 桌面端：本地收取
      const host = account.protocol === 'imap' ? account.imap_host : account.pop3_host
      const port = account.protocol === 'imap' ? account.imap_port : account.pop3_port

      const token = localStorage.getItem('token') || ''
      const serverUrl = getServerUrl()

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

      showMessage(`收取成功，新增 ${result.count || 0} 封邮件`, 'success')
      await loadAccounts()
      emit('refresh')
    } else {
      // Web 端：调用后端接口
      const res = await batchLoginAPI.fetchSingle(accountId)
      if (res.code === 0) {
        showMessage(res.message || '收取成功', 'success')
        await loadAccounts()
        emit('refresh')
      } else {
        showMessage(res.message || '收取失败', 'error')
        await loadAccounts()
      }
    }
  } catch (e: any) {
    showMessage(typeof e === 'string' ? e : (e.message || '收取失败'), 'error')
    await loadAccounts()
  } finally {
    fetchingIds.value = fetchingIds.value.filter(id => id !== accountId)
  }
}

// 暴露加载方法给父组件调用（不要在onMounted自动加载）
defineExpose({
  loadAccounts,
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
</script>

<style scoped>
/* 自定义 checkbox 样式 */
input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border: 2px solid #d1d5db;
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  background-color: white;
}

input[type="checkbox"]:checked {
  background-color: #22c55e;
  border-color: #22c55e;
}

input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
</style>
