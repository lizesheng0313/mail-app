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
        @click="handleMailboxClick(mailbox, batchMode, toggleSelection, onSelect)"
      >
        <div class="flex items-center gap-2 flex-nowrap">
          <svg v-if="isUnavailable(mailbox)" class="w-3 h-3 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <code
            :class="isUnavailable(mailbox) ? 'text-red-600 line-through' : 'text-black'"
            class="text-sm truncate flex-shrink"
          >{{ mailbox.email }}</code>
          <span
            v-if="isProtectedHostedCatchAll(mailbox)"
            :title="t('systemMailbox.catchAllTooltip')"
            class="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 rounded whitespace-nowrap flex-shrink-0"
          >
            {{ t('systemMailbox.catchAllDefault') }}
          </span>
          <span v-if="isDeletedHostedDomain(mailbox)" class="px-1 py-0.5 text-xs bg-red-100 text-red-800 rounded whitespace-nowrap flex-shrink-0">{{ t('systemMailbox.domainDeleted') }}</span>
          <span v-else-if="isExpired(mailbox)" class="px-1 py-0.5 text-xs bg-red-100 text-red-800 rounded whitespace-nowrap flex-shrink-0">{{ t('systemMailbox.expired') }}</span>
        </div>
        <div class="mt-1 flex items-center justify-between text-xs text-gray-600">
          <span>{{ t('common.createdAt') }}：{{ formatDate(mailbox.created_at) }}</span>
          <span v-if="getDisplayExpiresAt(mailbox)" :class="isExpired(mailbox) ? 'text-red-600 font-medium' : ''">
            {{ t('common.expiresAtLabel') }}：{{ formatDate(getDisplayExpiresAt(mailbox)) }}
          </span>
        </div>
        <MailboxTags
          v-if="mailbox.id in tagsData"
          :mailbox-id="mailbox.id"
          :mailbox-type="mailboxType"
          :editable="!batchMode"
          :max-display="3"
          :initial-sites="tagsData[mailbox.id]?.sites || []"
          :initial-tags="tagsData[mailbox.id]?.tags || []"
        />
        <template #actions>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
            :title="t('systemMailbox.moreActions')"
            @click.stop="toggleActionMenu(mailbox.id, $event)"
          >
            <BaseIcon name="more" size="sm" />
          </button>
          <div
            v-if="openMenuId === mailbox.id"
            :class="[
              'absolute right-0 z-20 min-w-[128px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg',
              openMenuPlacement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
            ]"
            @click.stop
          >
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              @click.stop="handleCopyEmail(mailbox.email)"
            >
              <BaseIcon name="copy" size="sm" />
              {{ t('systemMailbox.copyMailbox') }}
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              @click.stop="handleShareAction(mailbox)"
            >
              <BaseIcon name="share" size="sm" />
              {{ t('systemMailbox.shareMailbox') }}
            </button>
            <button
              type="button"
              :disabled="isProtectedHostedCatchAll(mailbox)"
              :title="isProtectedHostedCatchAll(mailbox) ? t('systemMailbox.protectedDeleteTooltip') : t('systemMailbox.deleteMailbox')"
              :class="isProtectedHostedCatchAll(mailbox)
                ? 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-400 cursor-not-allowed'
                : 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50'"
              @click.stop="handleDeleteAction(mailbox.id)"
            >
              <BaseIcon name="delete" size="sm" />
              {{ t('systemMailbox.deleteMailbox') }}
            </button>
          </div>
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
    :message="isDeleting.batch ? t('systemMailbox.deleteBatchMessage', { count: isDeleting.ids.length }) : t('systemMailbox.deleteSingleMessage')"
    :loading="deleting"
    @confirm="confirmDelete"
    @cancel="showConfirm = false"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMailboxStore } from '@/stores/auth'
import MailboxList from '@/components/Mail/MailboxList/MailboxList.vue'
import MailboxCard from '@/components/Mail/MailboxList/MailboxCard.vue'
import Pagination from '@/components/Pagination/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import BaseIcon from '@/components/BaseIcon/index.vue'
import MailboxTags from '@/components/MailboxTags/index.vue'
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
const openMenuId = ref<number | null>(null)
const openMenuPlacement = ref<'up' | 'down'>('down')
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

const closeActionMenu = () => {
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
  return spaceBelow < 160 ? 'up' : 'down'
}

const toggleActionMenu = (mailboxId: number, event: Event) => {
  openMenuId.value = openMenuId.value === mailboxId ? null : mailboxId
  if (openMenuId.value === mailboxId) {
    openMenuPlacement.value = resolveMenuPlacement(event)
  }
}

const handleShare = (mailbox: any) => {
  emit('share', [mailbox])
}

const handleCopyEmail = (text: string) => {
  closeActionMenu()
  copy(text)
}

const handleShareAction = (mailbox: any) => {
  closeActionMenu()
  handleShare(mailbox)
}

const handleDeleteAction = (id: number) => {
  const targetMailbox = resolvedMailboxes.value.find((item: any) => Number(item.id) === Number(id))
  if (targetMailbox && isProtectedHostedCatchAll(targetMailbox)) {
    closeActionMenu()
    return
  }
  closeActionMenu()
  handleDelete(id)
}

const handleBatchDelete = (ids: number[]) => {
  const deletableIds = ids.filter((id) => {
    const targetMailbox = resolvedMailboxes.value.find((item: any) => Number(item.id) === Number(id))
    return !targetMailbox || !isProtectedHostedCatchAll(targetMailbox)
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
    closeActionMenu()
    toggleSelection(mailbox.id)
  } else {
    closeActionMenu()
    selectedId.value = mailbox.id
    onSelect(mailbox)
  }
}

const handleWindowClick = () => {
  closeActionMenu()
}

const confirmDelete = async () => {
  deleting.value = true
  try {
    const deletedIds = [...isDeleting.value.ids]
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
    showConfirm.value = false
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

onMounted(() => {
  window.addEventListener('click', handleWindowClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleWindowClick)
})
</script>
