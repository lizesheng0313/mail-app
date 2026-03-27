<template>
  <MailboxList
    ref="mailboxListRef"
    title="临时邮箱"
    :mailboxes="mailboxStore.mailboxes"
    :selectedId="selectedId"
    :showPagination="true"
    @select="$emit('select', $event)"
    @batch-delete="handleBatchDelete"
    @batch-share="handleBatchShare"
    @batch-mode-start="$emit('batch-mode-start')"
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
          <svg v-if="isExpired(mailbox)" class="w-3 h-3 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <code
            :class="isExpired(mailbox) ? 'text-red-600 line-through' : 'text-black'"
            class="text-sm truncate flex-shrink"
          >{{ mailbox.email }}</code>
          <span v-if="isExpired(mailbox)" class="px-1 py-0.5 text-xs bg-red-100 text-red-800 rounded whitespace-nowrap flex-shrink-0">过期</span>
        </div>
        <div class="mt-1 flex items-center justify-between text-xs text-gray-600">
          <span>创建：{{ formatDate(mailbox.created_at) }}</span>
          <span v-if="mailbox.expires_at" :class="isExpired(mailbox) ? 'text-red-600 font-medium' : ''">
            过期：{{ formatDate(mailbox.expires_at) }}
          </span>
        </div>
        <MailboxTags
          v-if="mailbox.id in tagsData"
          :mailbox-id="mailbox.id"
          mailbox-type="system"
          :editable="!batchMode"
          :max-display="3"
          :initial-sites="tagsData[mailbox.id]?.sites || []"
          :initial-tags="tagsData[mailbox.id]?.tags || []"
        />
        <template #actions>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
            title="更多操作"
            @click.stop="toggleActionMenu(mailbox.id)"
          >
            <BaseIcon name="more" size="sm" />
          </button>
          <div
            v-if="openMenuId === mailbox.id"
            class="absolute right-0 top-10 z-20 min-w-[128px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
            @click.stop
          >
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              @click.stop="handleCopyEmail(mailbox.email)"
            >
              <BaseIcon name="copy" size="sm" />
              复制邮箱
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              @click.stop="handleShareAction(mailbox)"
            >
              <BaseIcon name="share" size="sm" />
              分享邮箱
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
              @click.stop="handleDeleteAction(mailbox.id)"
            >
              <BaseIcon name="delete" size="sm" />
              删除邮箱
            </button>
          </div>
        </template>
      </MailboxCard>
    </template>

    <template #pagination>
      <Pagination
        :current-page="mailboxStore.currentPage"
        :total-pages="mailboxStore.totalPages"
        :total="mailboxStore.totalMailboxes"
        @page-change="mailboxStore.fetchMailboxes"
      />
    </template>
  </MailboxList>

  <ConfirmDialog
    :visible="showConfirm"
    :mask="false"
    :title="isDeleting.batch ? '批量删除' : '删除邮箱'"
    :message="isDeleting.batch ? `确定删除 ${isDeleting.ids.length} 个邮箱？` : '确定删除这个邮箱？'"
    :loading="deleting"
    @confirm="confirmDelete"
    @cancel="showConfirm = false"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
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

const emit = defineEmits(['select', 'batch-mode-start', 'share', 'deleted'])

const mailboxStore = useMailboxStore()
const mailboxListRef = ref()
const showConfirm = ref(false)
const deleting = ref(false)
const isDeleting = ref({ batch: false, ids: [] as number[] })
const selectedId = ref<number | null>(null)
const tagsData = ref<Record<number, { sites: any[], tags: any[] }>>({})
const openMenuId = ref<number | null>(null)

const isExpired = (mailbox: any) => {
  if (!mailbox.expires_at) return false
  // expires_at 是毫秒时间戳
  return mailbox.expires_at < Date.now()
}

// 批量加载邮箱标签数据
const loadTagsData = async () => {
  try {
    const ids = mailboxStore.mailboxes.map((m: any) => Number(m.id))
    if (ids.length === 0) return
    
    const res = await mailboxTagsAPI.getBatchMailboxTags('system', ids)
    if (res.data) {
      tagsData.value = res.data
    }
  } catch (e) {
    console.error('加载标签数据失败:', e)
  }
}

// 监听邮箱列表变化，加载标签
watch(() => mailboxStore.mailboxes, (newMailboxes) => {
  if (newMailboxes.length > 0) {
    loadTagsData()
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
    showMessage('已复制')
  } catch {
    showMessage('复制失败', 'error')
  }
}

const handleDelete = (id: number) => {
  isDeleting.value = { batch: false, ids: [id] }
  showConfirm.value = true
}

const closeActionMenu = () => {
  openMenuId.value = null
}

const toggleActionMenu = (mailboxId: number) => {
  openMenuId.value = openMenuId.value === mailboxId ? null : mailboxId
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
  closeActionMenu()
  handleDelete(id)
}

const handleBatchDelete = (ids: number[]) => {
  isDeleting.value = { batch: true, ids }
  showConfirm.value = true
}

const handleBatchShare = (ids: number[]) => {
  console.log('🟢 系统邮箱 - 批量分享，ids:', ids)
  // 获取选中的邮箱对象
  const selectedMailboxes = mailboxStore.mailboxes.filter(m => ids.includes(m.id))
  emit('share', selectedMailboxes)
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
      await unifiedAPI.batchDeleteMailboxes(deletedIds, 'system')
      showMessage(`已删除 ${deletedIds.length} 个邮箱`)
      emit('deleted', deletedIds)
      // 批量删除成功后，退出批量模式
      if (mailboxListRef.value?.cancelBatchMode) {
        mailboxListRef.value.cancelBatchMode()
      }
    } else {
      const result = await mailboxStore.deleteMailbox(deletedIds[0])
      showMessage(result.success ? '删除成功' : result.error || '删除失败', result.success ? 'success' : 'error')
      if (result.success) {
        emit('deleted', deletedIds)
      }
    }
    await mailboxStore.fetchMailboxes()
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
