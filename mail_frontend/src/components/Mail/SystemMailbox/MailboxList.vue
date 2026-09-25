<template>
  <MailboxList
    ref="mailboxListRef"
    :title="resolvedTitle"
    :mailboxes="resolvedMailboxes"
    :selectedId="selectedId"
    :showPagination="showPagination"
    :searchable="searchable"
    :search-keyword="resolvedSearchKeyword"
    :search-placeholder="searchPlaceholder"
    @select="$emit('select', $event)"
    @batch-delete="handleBatchDelete"
    @batch-share="handleBatchShare"
    @batch-mode-start="$emit('batch-mode-start')"
    @search="handleSearch"
  >
    <template #header-actions>
      <slot name="header-actions"></slot>
    </template>

    <template #content="{ mailboxes, selectedId, batchMode, selectedIds, toggleSelection, onSelect }">
      <MailboxCard
        v-for="mailbox in mailboxes"
        :key="mailbox.id"
        :batch-mode="batchMode"
        :checked="selectedIds.includes(mailbox.id)"
        :card-class="[
          selectedId === mailbox.id || (batchMode && selectedIds.includes(mailbox.id))
            ? 'bg-primary-100 border-primary-200'
            : 'bg-gray-50 hover:bg-primary-100 cursor-pointer'
        ]"
        :address="mailbox.email"
        :address-class="isUnavailable(mailbox) ? 'text-red-600 line-through' : 'text-black'"
        :created-label="t('common.createdAt')"
        :created-text="formatDate(mailbox.created_at)"
        :expires-label="t('common.expiresAtLabel')"
        :expires-text="shouldShowExpiresAt(mailbox) && !isPermanentMailbox(mailbox) ? formatDate(getDisplayExpiresAt(mailbox)) : ''"
        :expires-class="getDisplayExpiresAt(mailbox) && isExpired(mailbox) ? 'text-red-600 font-medium' : ''"
        :permanent-text="shouldShowExpiresAt(mailbox) && isPermanentMailbox(mailbox) ? t('common.permanent') : ''"
        :action-menu-title="t('systemMailbox.moreActions')"
        :actions="getMailboxActions(mailbox)"
        @click="handleMailboxClick(mailbox, batchMode, toggleSelection, onSelect)"
        @action="handleMailboxAction($event, mailbox)"
      >
        <template #address-leading>
          <svg v-if="isUnavailable(mailbox)" class="w-3 h-3 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </template>
        <template #badges>
          <HoverTooltip
            v-if="props.mailboxType === 'system' && mailbox.is_public_domain"
            :text="getPublicDomainTooltip(mailbox)"
          >
            <span
              class="px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded whitespace-nowrap flex-shrink-0"
            >
              {{ t('systemMailbox.publicDomain') }}
            </span>
          </HoverTooltip>
          <span
            v-if="isProtectedHostedCatchAll(mailbox)"
            :title="t('systemMailbox.catchAllTooltip')"
            class="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 rounded whitespace-nowrap flex-shrink-0"
          >
            {{ t('systemMailbox.catchAllDefault') }}
          </span>
          <span
            v-if="isReplyMailbox(mailbox)"
            class="px-1.5 py-0.5 text-xs bg-sky-100 text-sky-800 rounded whitespace-nowrap flex-shrink-0"
          >
            回信邮箱
          </span>
          <span
            v-if="props.mailboxType === 'hosted' && mailbox.is_public"
            class="px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded whitespace-nowrap flex-shrink-0"
          >
            {{ t('systemMailbox.publicMailbox') }}
          </span>
          <span
            v-if="props.mailboxType === 'hosted' && String(mailbox.access_mode || '') === 'public_claim'"
            class="px-1.5 py-0.5 text-xs bg-sky-100 text-sky-800 rounded whitespace-nowrap flex-shrink-0"
          >
            {{ t('systemMailbox.claimedMailbox') }}
          </span>
          <span v-if="isDeletedHostedDomain(mailbox)" class="px-1 py-0.5 text-xs bg-red-100 text-red-800 rounded whitespace-nowrap flex-shrink-0">{{ t('systemMailbox.domainDeleted') }}</span>
          <span v-else-if="isExpired(mailbox)" class="px-1 py-0.5 text-xs bg-red-100 text-red-800 rounded whitespace-nowrap flex-shrink-0">{{ t('systemMailbox.expired') }}</span>
        </template>
        <template #details>
          <MailboxTags
            v-if="mailbox.id in tagsData"
            :mailbox-id="mailbox.id"
            :mailbox-type="mailboxType"
            :editable="true"
            :max-display="3"
            :initial-sites="tagsData[mailbox.id]?.sites || []"
            :initial-tags="tagsData[mailbox.id]?.tags || []"
          />
        </template>
      </MailboxCard>
    </template>

    <template #pagination>
      <Pagination
        :current-page="resolvedPagination.page"
        :total-pages="resolvedPagination.total_pages"
        :total="resolvedPagination.total"
        @page-change="handlePageChange"
      />
    </template>
  </MailboxList>

  <ConfirmDialog
    :visible="showConfirm"
    :mask="false"
    :title="isDeleting.batch ? t('systemMailbox.batchDeleteTitle') : t('systemMailbox.deleteTitle')"
    :message="isDeleting.batch ? t('systemMailbox.deleteBatchMessage', { count: pendingDeleteCount }) : t('systemMailbox.deleteSingleMessage')"
    :loading="deleting"
    @confirm="confirmDelete"
    @cancel="closeDeleteConfirm"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMailboxStore } from '@/stores/auth'
import MailboxList from '@/components/Mail/MailboxList/MailboxList.vue'
import MailboxCard from '@/components/Mail/MailboxList/MailboxCard.vue'
import Pagination from '@/components/Pagination/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import MailboxTags from '@/components/MailboxTags/index.vue'
import HoverTooltip from '@/components/HoverTooltip/index.vue'
import { showMessage } from '@/utils/message'
import { unifiedAPI } from '@/api/unified'
import { mailboxTagsAPI } from '@/api/mailboxTags'
import { formatTimestamp } from '@/utils/timeUtils'

const props = withDefaults(defineProps<{
  mailboxType?: 'system' | 'hosted'
  title?: string
  mailboxes?: any[] | null
  showPagination?: boolean
  pagination?: Record<string, any> | null
  onPageChange?: ((page: number) => void | Promise<void>) | null
  searchable?: boolean
  searchKeyword?: string | null
  searchPlaceholder?: string
  onSearch?: ((keyword: string) => void | Promise<void>) | null
}>(), {
  mailboxType: 'system',
  title: '',
  mailboxes: null,
  showPagination: true,
  pagination: null,
  onPageChange: null,
  searchable: true,
  searchKeyword: null,
  searchPlaceholder: '',
  onSearch: null
})
const { t } = useI18n()

const emit = defineEmits(['select', 'batch-mode-start', 'share', 'deleted', 'refresh'])

const mailboxStore = useMailboxStore()
const mailboxListRef = ref()
const showConfirm = ref(false)
const deleting = ref(false)
const isDeleting = ref({ batch: false, ids: [] as number[] })
const selectedId = ref<number | null>(null)
const tagsData = ref<Record<number, { sites: any[], tags: any[] }>>({})
const resolvedMailboxes = computed(() => props.mailboxes || mailboxStore.mailboxes)
const resolvedSearchKeyword = computed(() =>
  props.searchKeyword !== null && props.searchKeyword !== undefined
    ? String(props.searchKeyword || '')
    : String(mailboxStore.searchKeyword || '')
)
const resolvedPagination = computed(() => {
  if (props.pagination) {
    return {
      page: Number(props.pagination.page || 1),
      total_pages: Number(props.pagination.total_pages || 1),
      total: Number(props.pagination.total || 0)
    }
  }
  return {
    page: Number(mailboxStore.currentPage || 1),
    total_pages: Number(mailboxStore.totalPages || 1),
    total: Number(mailboxStore.totalMailboxes || 0)
  }
})
const resolvedTitle = computed(() => {
  if (props.title) return props.title
  return props.mailboxType === 'hosted' ? t('home.hostedMailbox') : t('home.temporaryMailbox')
})
const searchPlaceholder = computed(() => props.searchPlaceholder || t('mail.searchMailboxesPlaceholder'))

const getDisplayExpiresAt = (mailbox: any) => {
  const mailboxExpiresAt = Number(mailbox?.expires_at || 0)
  const domainExpiresAt = Number(mailbox?.domain_expires_at || 0)
  if (String(mailbox?.mailbox_type || '') === 'hosted') {
    return domainExpiresAt || mailboxExpiresAt || null
  }
  return mailboxExpiresAt || null
}

const isPermanentMailbox = (mailbox: any) => !getDisplayExpiresAt(mailbox)

const shouldShowExpiresAt = (mailbox: any) => {
  if (String(mailbox?.mailbox_type || '') === 'hosted') {
    return Boolean(getDisplayExpiresAt(mailbox))
  }
  return getDisplayExpiresAt(mailbox) || isPermanentMailbox(mailbox)
}

const isExpired = (mailbox: any) => {
  const expiresAt = Number(getDisplayExpiresAt(mailbox) || 0)
  return expiresAt > 0 && expiresAt < Date.now()
}

const isDeletedHostedDomain = (mailbox: any) =>
  String(mailbox?.mailbox_type || '') === 'hosted' && Boolean(mailbox?.domain_deleted)

const isUnavailable = (mailbox: any) =>
  isExpired(mailbox) || isDeletedHostedDomain(mailbox)

const isProtectedHostedCatchAll = (mailbox: any) =>
  props.mailboxType === 'hosted' && String(mailbox?.local_part || '').trim().toLowerCase() === 'admin'

const isReplyMailbox = (mailbox: any) =>
  props.mailboxType === 'system' && Boolean(mailbox?.is_reply_mailbox)

const isProtectedMailbox = (mailbox: any) =>
  isProtectedHostedCatchAll(mailbox) || isReplyMailbox(mailbox)

const getDeleteTooltip = (mailbox: any) => {
  if (isReplyMailbox(mailbox)) return '系统回信邮箱不允许删除'
  if (isProtectedHostedCatchAll(mailbox)) return t('systemMailbox.protectedDeleteTooltip')
  return t('systemMailbox.deleteMailbox')
}

const getMailboxActions = (mailbox: any) => [
  {
    id: 'copy',
    label: t('systemMailbox.copyMailbox'),
    icon: 'copy'
  },
  {
    id: 'share',
    label: t('systemMailbox.shareMailbox'),
    icon: 'share'
  },
  {
    id: 'delete',
    label: t('systemMailbox.deleteMailbox'),
    icon: 'delete',
    tone: 'danger' as const,
    disabled: isProtectedMailbox(mailbox),
    title: getDeleteTooltip(mailbox)
  }
]

const getPublicDomainTooltip = (mailbox: any) => {
  const providerName = String(mailbox?.public_domain_provider_name || '').trim()
  if (providerName) {
    return t('systemMailbox.publicDomainProvider', { provider: providerName })
  }
  return t('systemMailbox.publicDomainProviderUnknown')
}

// 批量加载邮箱标签数据
const loadTagsData = async () => {
  try {
    const ids = resolvedMailboxes.value.map((m: any) => Number(m.id))
    if (ids.length === 0) return
    
    const res = await mailboxTagsAPI.getBatchMailboxTags(props.mailboxType, ids)
    if (res.data) {
      tagsData.value = res.data
    }
  } catch (e) {
    console.error('加载标签数据失败:', e)
  }
}

// 监听邮箱列表变化，加载标签
watch(resolvedMailboxes, (newMailboxes) => {
  if (newMailboxes.length > 0) {
    loadTagsData()
  } else if (!newMailboxes.length) {
    tagsData.value = {}
  }
}, { immediate: true })

const formatDate = (date: string | number) => {
  if (!date) return ''
  const timestamp = typeof date === 'number' ? date : new Date(date).getTime()
  return formatTimestamp(timestamp, 'date')
}

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showMessage(t('mail.copied'))
  } catch {
    showMessage(t('mail.copyFailed'), 'error')
  }
}

const handleDelete = (id: number) => {
  isDeleting.value = { batch: false, ids: [id] }
  showConfirm.value = true
}

const normalizeIds = (ids: unknown): number[] => {
  const rawIds = Array.isArray(ids)
    ? ids
    : Array.isArray((ids as any)?.value)
      ? (ids as any).value
      : []

  return Array.from(
    new Set(
      rawIds
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    )
  )
}

const handleMailboxAction = (actionId: string, mailbox: any) => {
  if (actionId === 'copy') {
    void copy(mailbox.email)
    return
  }
  if (actionId === 'share') {
    emit('share', [mailbox])
    return
  }
  if (actionId === 'delete' && !isProtectedMailbox(mailbox)) {
    handleDelete(mailbox.id)
  }
}

const handleBatchDelete = (ids: number[]) => {
  const deletableIds = ids.filter((id) => {
    const targetMailbox = resolvedMailboxes.value.find((item: any) => Number(item.id) === Number(id))
    return !targetMailbox || !isProtectedMailbox(targetMailbox)
  })
  if (!deletableIds.length) {
    showMessage(t('systemMailbox.protectedDeleteWarning'), 'warning')
    return
  }
  if (deletableIds.length !== ids.length) {
    showMessage(t('systemMailbox.skippedCatchAllWarning'), 'warning')
  }
  isDeleting.value = { batch: true, ids: deletableIds }
  showConfirm.value = true
}

const getCurrentBatchSelectedIds = () => normalizeIds(mailboxListRef.value?.selectedIds)

const filterDeletableIds = (ids: number[]) =>
  ids.filter((id) => {
    const targetMailbox = resolvedMailboxes.value.find((item: any) => Number(item.id) === Number(id))
    return !targetMailbox || !isProtectedMailbox(targetMailbox)
  })

const resolvePendingDeleteIds = () => {
  if (!isDeleting.value.batch) {
    return normalizeIds(isDeleting.value.ids)
  }

  const currentIds = getCurrentBatchSelectedIds()
  const sourceIds = currentIds.length ? currentIds : normalizeIds(isDeleting.value.ids)
  return filterDeletableIds(sourceIds)
}

const pendingDeleteCount = computed(() => resolvePendingDeleteIds().length)

const closeDeleteConfirm = () => {
  showConfirm.value = false
  isDeleting.value = { batch: false, ids: [] }
}

const handleBatchShare = (ids: number[]) => {
  console.log('🟢 系统邮箱 - 批量分享，ids:', ids)
  // 获取选中的邮箱对象
  const selectedMailboxes = resolvedMailboxes.value.filter((m: any) => ids.includes(m.id))
  emit('share', selectedMailboxes)
}

const handlePageChange = async (page: number) => {
  if (props.onPageChange) {
    await props.onPageChange(page)
    return
  }
  await mailboxStore.fetchMailboxes(page, mailboxStore.pageSize, mailboxStore.searchKeyword)
}

const handleSearch = async (keyword: string) => {
  if (props.onSearch) {
    await props.onSearch(keyword)
    return
  }
  await mailboxStore.fetchMailboxes(1, mailboxStore.pageSize, keyword)
}

// 处理邮箱点击
const handleMailboxClick = (mailbox: any, batchMode: boolean, toggleSelection: Function, onSelect: Function) => {
  if (batchMode) {
    toggleSelection(mailbox.id)
  } else {
    selectedId.value = mailbox.id
    onSelect(mailbox)
  }
}

const confirmDelete = async () => {
  deleting.value = true
  try {
    const deletedIds = resolvePendingDeleteIds()
    if (!deletedIds.length) {
      showMessage(
        isDeleting.value.batch ? t('systemMailbox.selectDeleteWarning') : t('systemMailbox.deleteFailed'),
        isDeleting.value.batch ? 'warning' : 'error'
      )
      return
    }
    if (isDeleting.value.batch) {
      // 使用批量删除接口
      await unifiedAPI.batchDeleteMailboxes(deletedIds, props.mailboxType)
      showMessage(t('systemMailbox.batchDeleted', { count: deletedIds.length }))
      emit('deleted', deletedIds)
      // 批量删除成功后，退出批量模式
      if (mailboxListRef.value?.cancelBatchMode) {
        mailboxListRef.value.cancelBatchMode()
      }
    } else {
      const result: any = props.mailboxType === 'system'
        ? await mailboxStore.deleteMailbox(deletedIds[0])
        : await unifiedAPI.deleteMailbox(deletedIds[0], props.mailboxType)
      const success = Boolean(result?.success || result?.code === 0 || result?.data?.code === 0)
      const errorText = result?.error || result?.message || result?.data?.message || t('systemMailbox.deleteFailed')
      showMessage(success ? t('systemMailbox.deleteSuccess') : errorText, success ? 'success' : 'error')
      if (success) {
        emit('deleted', deletedIds)
      }
    }
    if (!props.mailboxes && props.mailboxType === 'system') {
      await mailboxStore.fetchMailboxes()
    } else {
      emit('refresh')
    }
  } finally {
    deleting.value = false
    closeDeleteConfirm()
  }
}

// 暴露方法给父组件
const cancelBatchMode = () => {
  if (mailboxListRef.value?.cancelBatchMode) {
    mailboxListRef.value.cancelBatchMode()
  }
}

defineExpose({
  cancelBatchMode,
  loadTagsData,
  toggleSelection: (id: number) => {
    if (mailboxListRef.value?.toggleSelection) {
      mailboxListRef.value.toggleSelection(id)
    }
  }
})

</script>
