<template>
  <div class="flex h-full min-h-0 flex-col gap-4 pb-3">
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-lg font-semibold text-gray-900">店铺审核</h1>
        <p class="mt-1 text-sm text-gray-500">审核私人店铺申请；暂停后店铺链接将不可购买。</p>
      </div>
      <select v-model="status" class="rounded-md border border-gray-300 px-3 py-2 text-sm" @change="changeStatus">
        <option value="pending">待审核</option>
        <option value="active">已开通</option>
        <option value="rejected">已拒绝</option>
        <option value="suspended">已暂停</option>
      </select>
    </div>
    <AdminDataTable
      title="店铺列表"
      :loading="loading"
      :column-count="5"
      :pagination="{ page, total, pageSize, totalPages }"
      @page-change="changePage"
    >
      <template #thead>
        <tr>
          <th class="px-5 py-3 text-left text-xs font-medium text-gray-700">店铺</th>
          <th class="px-5 py-3 text-left text-xs font-medium text-gray-700">申请人</th>
          <th class="px-5 py-3 text-left text-xs font-medium text-gray-700">简介</th>
          <th class="px-5 py-3 text-left text-xs font-medium text-gray-700">申请时间</th>
          <th class="px-5 py-3 text-left text-xs font-medium text-gray-700">操作</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-for="item in items" :key="item.owner_user_id" class="hover:bg-gray-50">
          <td class="px-5 py-4 text-sm font-medium text-gray-900">{{ item.name }}</td>
          <td class="px-5 py-4 text-sm text-gray-700">{{ item.username || `用户 ${item.owner_user_id}` }}</td>
          <td class="max-w-sm px-5 py-4 text-sm text-gray-600">{{ item.intro || '—' }}</td>
          <td class="whitespace-nowrap px-5 py-4 text-sm text-gray-600">{{ formatTime(item.created_at_ms) }}</td>
          <td class="px-5 py-4">
            <div v-if="status === 'pending' || status === 'active'" class="flex min-w-[230px] items-center gap-2">
              <button v-if="status === 'pending'" class="rounded-md bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700" :disabled="busyId === item.owner_user_id" @click="act(item, 'approve')">通过</button>
              <input v-model.trim="reasons[item.owner_user_id]" maxlength="500" :placeholder="status === 'pending' ? '拒绝原因' : '暂停原因'" class="min-w-0 w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              <button class="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50" :disabled="busyId === item.owner_user_id" @click="act(item, status === 'pending' ? 'reject' : 'suspend')">{{ status === 'pending' ? '拒绝' : '暂停' }}</button>
            </div>
            <button v-else-if="status === 'suspended'" class="rounded-md bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700" :disabled="busyId === item.owner_user_id" @click="act(item, 'resume')">恢复</button>
            <span v-else class="text-xs text-gray-500">{{ item.review_reason || '—' }}</span>
          </td>
        </tr>
        <tr v-if="!items.length"><td colspan="5" class="px-5 py-12 text-center text-sm text-gray-500">暂无店铺</td></tr>
      </template>
    </AdminDataTable>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import { getAdminStores, reviewAdminStore } from '@/api/workflowMarket'
import { showConfirm } from '@/utils/dialog'
import { showMessage } from '@/utils/message'

const status = ref('pending')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const items = ref([])
const reasons = reactive({})
const loading = ref(false)
const busyId = ref(null)
const formatTime = (value) => value ? new Date(Number(value)).toLocaleString() : '—'

const load = async () => {
  loading.value = true
  try {
    const response = await getAdminStores({ status: status.value, page: page.value, page_size: pageSize })
    if (response.code !== 0) throw new Error(response.message || '加载店铺失败')
    items.value = response.data?.items || []
    total.value = Number(response.data?.total || 0)
  } catch (error) {
    showMessage(error?.message || '加载店铺失败', 'error')
  } finally {
    loading.value = false
  }
}
const changeStatus = () => { page.value = 1; load() }
const changePage = (next) => { page.value = next; load() }
const act = async (item, action) => {
  const reason = reasons[item.owner_user_id] || ''
  if ((action === 'reject' || action === 'suspend') && !reason.trim()) {
    showMessage('请先填写原因', 'warning')
    return
  }
  if (!await showConfirm('确定执行此店铺审核操作吗？', '店铺审核')) return
  busyId.value = item.owner_user_id
  try {
    const response = await reviewAdminStore(item.owner_user_id, { action, reason })
    if (response.code !== 0) throw new Error(response.message || '操作失败')
    delete reasons[item.owner_user_id]
    showMessage('操作已完成', 'success')
    await load()
  } catch (error) {
    showMessage(error?.message || '操作失败', 'error')
  } finally {
    busyId.value = null
  }
}
onMounted(load)
</script>
