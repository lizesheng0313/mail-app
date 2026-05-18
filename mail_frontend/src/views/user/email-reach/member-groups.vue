<template>
  <div class="space-y-6">
    <div
      v-if="accessLoaded && access.status !== 'approved' && access.status !== 'trial'"
      class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"
    >
      <div class="font-medium">当前账号还没开通邮件触达</div>
      <div class="mt-2">{{ access.reason }}</div>
    </div>

    <div v-if="canOperate" class="rounded-lg bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <BaseInput v-model="filters.keyword" placeholder="分组名称 / 说明" size="sm" class="w-64" />
          <button type="button" class="h-10 rounded-md bg-primary-600 px-5 text-sm text-white hover:bg-primary-700" @click="loadGroups">
            查询
          </button>
        </div>
        <button type="button" class="h-10 rounded-md bg-primary-600 px-5 text-sm text-white hover:bg-primary-700" @click="showModal = true">
          新增分组
        </button>
      </div>
    </div>

    <AdminDataTable v-if="canOperate" title="分组列表" :loading="loading" :column-count="4">
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">分组名称</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">说明</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">更新时间</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">操作</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!filteredGroups.length && !loading">
          <td colspan="4" class="px-6 py-12 text-center text-black">暂无分组</td>
        </tr>
        <tr v-for="item in filteredGroups" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-black">{{ item.group_name }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ item.description || '-' }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ formatTime(item.updated_at) }}</td>
          <td class="px-6 py-4 text-sm">
            <div class="flex items-center gap-2">
              <ActionButton icon="delete" tooltip="删除" variant="delete" @click="handleDeleteGroup(item)" />
            </div>
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <BaseModal v-model="showModal" title="新增分组" size="md" confirm-text="保存" :confirm-loading="saving" @confirm="handleSave">
      <BaseInput v-model="form.group_name" label="分组名称" placeholder="例如 VIP会员" />
    </BaseModal>

    <ConfirmDialog
      :visible="showDeleteConfirm"
      title="删除分组"
      :message="deleteMessage"
      type="danger"
      confirm-text="删除"
      :loading="deleting"
      @confirm="confirmDeleteGroup"
      @cancel="closeDeleteDialog"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'

const loading = ref(false)
const saving = ref(false)
const accessLoaded = ref(false)
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const deletingGroup = ref(null)
const groups = ref([])
const access = ref({ status: 'pending', reason: '' })
const form = reactive({ group_name: '' })
const filters = reactive({ keyword: '' })

const canOperate = computed(() => access.value.status === 'approved' || access.value.status === 'trial')
const deleteMessage = computed(() => `确认删除分组《${deletingGroup.value?.group_name || ''}》吗？会员不会删除，只会清空这个分组。`)
const filteredGroups = computed(() => {
  const keyword = String(filters.keyword || '').trim().toLowerCase()
  if (!keyword) return groups.value
  return groups.value.filter((item) => `${item.group_name || ''} ${item.description || ''}`.toLowerCase().includes(keyword))
})

const formatTime = (value) => {
  if (!value) return '-'
  const date = new Date(Number(value))
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const loadGroups = async () => {
  loading.value = true
  try {
    const res = await emailReachApi.getMemberGroups()
    if (res.code === 0) groups.value = res.data.items || []
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    const res = await emailReachApi.saveMemberGroup({ ...form })
    if (res.code === 0) {
      showModal.value = false
      form.group_name = ''
      await loadGroups()
    }
  } finally {
    saving.value = false
  }
}

const handleDeleteGroup = (item) => {
  deletingGroup.value = item
  showDeleteConfirm.value = true
}

const closeDeleteDialog = () => {
  showDeleteConfirm.value = false
  deletingGroup.value = null
}

const confirmDeleteGroup = async () => {
  if (!deletingGroup.value?.id) return
  deleting.value = true
  try {
    const res = await emailReachApi.deleteMemberGroup(deletingGroup.value.id)
    if (res.code === 0) {
      showMessage('删除成功', 'success')
      closeDeleteDialog()
      await loadGroups()
    }
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  const accessRes = await emailReachApi.getAccessSummary()
  accessLoaded.value = true
  if (accessRes.code === 0) access.value = accessRes.data
  if (canOperate.value) await loadGroups()
})
</script>
