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
      <div
        v-for="mailbox in mailboxes"
        :key="mailbox.id"
        class="group p-3 bg-gray-50 rounded-lg hover:bg-primary-100 cursor-pointer"
        :class="{ 'bg-primary-100': selectedId === mailbox.id || (batchMode && selectedIds.includes(mailbox.id)) }"
        @click="handleMailboxClick(mailbox, batchMode, toggleSelection, onSelect)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center flex-1 min-w-0">
            <input
              v-if="batchMode"
              type="checkbox"
              :checked="selectedIds.includes(mailbox.id)"
              @click.stop
              class="w-4 h-4 mr-3 cursor-pointer flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
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
              <div class="flex items-center justify-between text-xs text-gray-600 mt-1">
                <span>创建：{{ formatDate(mailbox.created_at) }}</span>
                <span v-if="mailbox.expires_at" :class="isExpired(mailbox) ? 'text-red-600 font-medium' : ''">
                  过期：{{ formatDate(mailbox.expires_at) }}
                </span>
              </div>
            </div>
          </div>
          <div v-if="!batchMode" class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 flex-shrink-0">
            <ActionButton
              icon="copy"
              variant="copy"
              tooltip="复制邮箱"
              @click.stop="copy(mailbox.email)"
            />
            <ActionButton
              icon="share"
              variant="primary"
              tooltip="分享邮箱"
              @click.stop="handleShare(mailbox)"
            />
            <ActionButton
              icon="delete"
              variant="delete"
              tooltip="删除邮箱"
              @click.stop="handleDelete(mailbox.id)"
            />
          </div>
        </div>
      </div>
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
    :title="isDeleting.batch ? '批量删除' : '删除邮箱'"
    :message="isDeleting.batch ? `确定删除 ${isDeleting.ids.length} 个邮箱？` : '确定删除这个邮箱？'"
    :loading="deleting"
    @confirm="confirmDelete"
    @cancel="showConfirm = false"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMailboxStore } from '@/stores/auth'
import MailboxList from '@/components/Mail/MailboxList/MailboxList.vue'
import Pagination from '@/components/Pagination/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import { showMessage } from '@/utils/message'
import { unifiedAPI } from '@/api/unified'
import { formatTimestamp } from '@/utils/timeUtils'

const emit = defineEmits(['select', 'batch-mode-start', 'share'])

const mailboxStore = useMailboxStore()
const mailboxListRef = ref()
const showConfirm = ref(false)
const deleting = ref(false)
const isDeleting = ref({ batch: false, ids: [] as number[] })
const selectedId = ref<number | null>(null)

const isExpired = (mailbox: any) => {
  if (!mailbox.expires_at) return false
  // expires_at 是毫秒时间戳
  return mailbox.expires_at < Date.now()
}

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

const handleShare = (mailbox: any) => {
  emit('share', [mailbox])
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
    toggleSelection(mailbox.id)
  } else {
    onSelect(mailbox)
  }
}

const confirmDelete = async () => {
  deleting.value = true
  try {
    if (isDeleting.value.batch) {
      // 使用批量删除接口
      await unifiedAPI.batchDeleteMailboxes(isDeleting.value.ids, 'system')
      showMessage(`已删除 ${isDeleting.value.ids.length} 个邮箱`)
      // 批量删除成功后，退出批量模式
      if (mailboxListRef.value?.cancelBatchMode) {
        mailboxListRef.value.cancelBatchMode()
      }
    } else {
      const result = await mailboxStore.deleteMailbox(isDeleting.value.ids[0])
      showMessage(result.success ? '删除成功' : result.error || '删除失败', result.success ? 'success' : 'error')
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
