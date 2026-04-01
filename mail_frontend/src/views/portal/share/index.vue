<template>
  <div>
    <!-- 公共头部 -->
    <PageHeader />
    
    <ThreeColumnLayout>
      <template #header>
        <div></div>
      </template>
    
    <template #toolbar>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
          </svg>
          <h1 class="text-lg font-semibold text-gray-900">{{ t('sharePage.title') }}</h1>
          <span v-if="mailboxCount > 0" class="text-sm text-gray-500">({{ t('sharePage.mailboxCount', { count: mailboxCount }) }})</span>
        </div>
        <div v-if="expireAt" class="flex items-center gap-2 text-sm text-gray-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>{{ t('sharePage.validUntil', { date: formatDate(expireAt) }) }}</span>
        </div>
      </div>
    </template>

    <!-- 左栏：邮箱列表 -->
    <template #left>
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p class="mt-2 text-sm text-gray-600">{{ t('common.loading') }}</p>
        </div>
      </div>

      <div v-else-if="error" class="flex items-center justify-center h-full p-4">
        <div class="text-center">
          <svg class="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-red-800 font-medium">{{ error }}</p>
        </div>
      </div>

      <MailboxList
        v-else
        :title="t('sharePage.myMailboxes')"
        :mailboxes="mailboxes"
        :selectedId="selectedMailbox?.id"
        :emptyText="t('sharePage.noMailbox')"
        @select="handleSelectMailbox"
      >
        <template #content="{ mailboxes, selectedId, onSelect }">
          <div
            v-for="mailbox in mailboxes"
            :key="mailbox.id"
            @click="onSelect(mailbox)"
            :class="['group p-3 rounded-lg hover:bg-primary-100 cursor-pointer transition-colors', 
              selectedId === mailbox.id ? 'bg-primary-100' : 'bg-gray-50']"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                  <code class="text-sm text-gray-900 truncate">{{ mailbox.email || mailbox.email_address }}</code>
                </div>
                <div class="text-xs text-gray-600 mt-1 flex items-center justify-between">
                  <span>{{ t('common.createdAt') }}：{{ formatDate(mailbox.created_at || mailbox.created_at_ms) }}</span>
                  <span v-if="mailboxType === 'system' && mailbox.expires_at_ms" class="text-orange-600">
                    {{ t('common.expiresAtLabel') }}：{{ formatDate(mailbox.expires_at_ms) }}
                  </span>
                </div>
              </div>
              <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                <ActionButton
                  icon="copy"
                  variant="copy"
                  :tooltip="t('sharePage.copyMailbox')"
                  @click.stop="copyMailboxAddress(mailbox.email || mailbox.email_address)"
                />
              </div>
            </div>
          </div>
        </template>
      </MailboxList>
    </template>

    <!-- 中栏：邮件列表 -->
    <template #middle>
      <EmailList
        :title="t('mail.myEmails')"
        :emails="emails"
        :selectedId="selectedEmail?.id"
        :showPagination="totalPages > 1"
        :autoRefresh="mailboxType === 'system' ? { countdown: { value: countdown } } : null"
        @select="handleSelectEmail"
      >
        <template #title-extra>
          <button
            v-if="selectedMailbox"
            @click="handleSelectMailbox(null)"
            class="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors whitespace-nowrap"
          >
            {{ t('sharePage.viewAll') }}
          </button>
        </template>

        <template #content="{ emails, selectedId, onSelect }">
          <div v-if="loadingEmails" class="flex items-center justify-center h-full">
            <div class="text-center">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p class="mt-2 text-sm text-gray-600">{{ t('sharePage.loadingEmails') }}</p>
            </div>
          </div>
          <EmailItem
            v-else
            v-for="email in emails"
            :key="email.id"
            :email="{ ...email, is_read: email.is_read || readEmailIds.has(email.id) }"
            :isSelected="selectedId === email.id"
            @click="onSelect(email)"
          />
        </template>

        <template #pagination>
          <Pagination
            :currentPage="currentPage"
            :totalPages="totalPages"
            @update:currentPage="handlePageChange"
          />
        </template>
      </EmailList>
    </template>

    <template #right>
      <EmailDetail :email="selectedEmail" @expand="openEmailModal" />
    </template>
    </ThreeColumnLayout>

    <!-- 邮件内容弹窗 -->
    <EmailContentModal
      :visible="showEmailModal"
      :email="modalEmail"
      @update:visible="showEmailModal = $event"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/PageHeader/index.vue'
import ThreeColumnLayout from '@/components/Mail/Layout/ThreeColumnLayout.vue'
import MailboxList from '@/components/Mail/MailboxList/MailboxList.vue'
import EmailList from '@/components/Mail/EmailList/EmailList.vue'
import EmailItem from '@/components/Mail/EmailItem.vue'
import EmailDetail from '@/components/Mail/EmailDetail/EmailDetail.vue'
import EmailContentModal from '@/components/Mail/EmailContentModal.vue'
import Pagination from '@/components/Pagination/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import { mailboxShareAPI } from '@/api/mailboxShare'
import { showMessage } from '@/utils/message'
import { getCurrentLocale } from '@/i18n'

const route = useRoute()
const { t } = useI18n()

const loading = ref(true)
const error = ref('')
const mailboxType = ref('system')
const mailboxes = ref([])
const mailboxCount = ref(0)
const expireAt = ref(null)
const selectedMailbox = ref(null)

const loadingEmails = ref(false)
const emails = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const emailTotal = ref(0)
const totalPages = ref(1)

const selectedEmail = ref(null)
const readEmailIds = ref(new Set()) // 本地记录已读的邮件ID

// 邮件弹窗相关
const showEmailModal = ref(false)
const modalEmail = ref(null)

// 打开邮件弹窗
const openEmailModal = (email) => {
  modalEmail.value = email
  showEmailModal.value = true
}

// 自动刷新倒计时（只有系统邮箱才启用）
const countdown = ref(10)
let countdownTimer = null

const startAutoRefresh = () => {
  // 只有系统邮箱才启用自动刷新
  if (mailboxType.value !== 'system') {
    return
  }
  
  // 清除旧的定时器
  if (countdownTimer) clearInterval(countdownTimer)
  
  countdown.value = 10
  
  // 每秒倒计时
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      // 倒计时结束，刷新邮件
      loadEmails()
      countdown.value = 10
    }
  }, 1000)
}

const stopAutoRefresh = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

const loadShareInfo = async () => {
  const shareToken = route.params.token
  if (!shareToken) {
    error.value = t('sharePage.invalidLink')
    loading.value = false
    return
  }
  try {
    const res = await mailboxShareAPI.getShareInfo(shareToken)
    if (res.code === 0) {
      mailboxType.value = res.data.mailbox_type
      mailboxes.value = res.data.mailboxes || []
      mailboxCount.value = mailboxes.value.length
      expireAt.value = res.data.expire_at
      // 默认不选中任何邮箱，显示全部邮件
      selectedMailbox.value = null
      await loadEmails()
      // 启动自动刷新
      startAutoRefresh()
    } else {
      error.value = res.message || t('sharePage.loadShareFailed')
    }
  } catch (err) {
    console.error('加载分享信息失败:', err)
    if (err.response?.status === 404) {
      error.value = t('sharePage.shareNotFound')
    } else if (err.response?.status === 410) {
      error.value = t('sharePage.shareExpired')
    } else {
      error.value = err.response?.data?.detail || t('sharePage.loadFailed')
    }
  } finally {
    loading.value = false
  }
}

const loadEmails = async () => {
  const shareToken = route.params.token
  loadingEmails.value = true
  try {
    const res = await mailboxShareAPI.getShareEmails(shareToken, {
      mailbox_id: selectedMailbox.value?.id,
      page: currentPage.value,
      page_size: pageSize.value
    })
    if (res.code === 0) {
      emails.value = res.data.emails || []
      emailTotal.value = res.data.pagination?.total || 0
      totalPages.value = res.data.pagination?.total_pages || 1
      // 不自动选中第一封邮件，保持空状态
    } else {
      showMessage(res.message || t('sharePage.loadEmailsFailed'), 'error')
    }
  } catch (err) {
    console.error('加载邮件失败:', err)
    showMessage(t('sharePage.loadEmailsFailed'), 'error')
  } finally {
    loadingEmails.value = false
  }
}

const handleSelectMailbox = (mailbox) => {
  selectedMailbox.value = mailbox
  currentPage.value = 1
  selectedEmail.value = null
  loadEmails()
}

const handleSelectEmail = async (email) => {
  // 先设置选中状态（显示基本信息）
  selectedEmail.value = email
  
  // 标记为已读（仅前端本地）
  readEmailIds.value.add(email.id)
  
  // 获取完整邮件详情（包含 content_text 和 content_html）
  try {
    const shareToken = route.params.token
    const res = await mailboxShareAPI.getShareEmailDetail(shareToken, email.id, mailboxType.value)
    if (res.code === 0 && res.data) {
      // 更新选中邮件的完整内容
      selectedEmail.value = {
        ...selectedEmail.value,
        content: res.data.content,
        content_text: res.data.content,
        contentHtml: res.data.contentHtml,
        content_html: res.data.contentHtml,
        from_addr: res.data.from_addr,
        to_addr: res.data.to_addr,
        received_at: res.data.received_at
      }
    }
  } catch (err) {
    console.error('获取邮件详情失败:', err)
    showMessage(t('sharePage.loadEmailDetailFailed'), 'error')
  }
}

const handlePageChange = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  selectedEmail.value = null
  loadEmails()
}

const copyMailboxAddress = (email) => {
  navigator.clipboard.writeText(email)
  showMessage(t('sharePage.copied'), 'success')
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  let date
  if (typeof dateStr === 'number') {
    date = new Date(dateStr)
  } else {
    date = new Date(dateStr)
  }
  return date.toLocaleString(getCurrentLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadShareInfo()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>
