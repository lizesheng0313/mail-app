<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[80vh] max-h-[90vh] overflow-hidden flex flex-col">
      <!-- 头部 -->
      <div class="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            {{ t('inventoryModal.title') }}
          </h3>
          <p class="text-sm text-gray-500 mt-1">{{ workflow?.name }}</p>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 操作栏 -->
      <div class="px-6 py-3 border-b bg-white flex-shrink-0">
        <div class="flex items-center justify-between mb-3">
          <div class="flex gap-2">
            <button
              @click="statusFilter = 'all'"
              :class="[
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                statusFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
            >
              {{ t('inventoryModal.all') }} ({{ stats.total }})
            </button>
            <button
              @click="statusFilter = 'available'"
              :class="[
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                statusFilter === 'available'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
            >
              {{ t('inventoryModal.available') }} ({{ stats.available }})
            </button>
            <button
              @click="statusFilter = 'consumed'"
              :class="[
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                statusFilter === 'consumed'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
            >
              {{ t('inventoryModal.consumed') }} ({{ stats.consumed }})
            </button>
            <!-- 批量删除模式切换 -->
            <div class="ml-2 border-l pl-2">
              <button
                v-if="!batchDeleteMode"
                @click="enterBatchDeleteMode"
                class="px-3 py-1.5 text-sm rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {{ t('inventoryModal.batchDelete') }}
              </button>

              <div v-else class="flex items-center gap-2">
                <button
                  @click="confirmBatchDelete"
                  :disabled="selectedIds.length === 0"
                  class="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {{ t('inventoryModal.deleteSelected', { count: selectedIds.length }) }}
                </button>
                <button
                  @click="exitBatchDeleteMode"
                  class="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  {{ t('common.cancel') }}
                </button>
              </div>
            </div>
          </div>
          <button
            @click="showAddModal = true"
            class="inline-flex items-center px-4 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            {{ t('inventoryModal.addBulk') }}
          </button>
        </div>
        <!-- 搜索栏 -->
        <div class="flex gap-2">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('inventoryModal.searchPlaceholder')"
            class="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            @click="handleSearch"
            class="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            {{ t('inventoryModal.search') }}
          </button>
          <button
            @click="handleReset"
            class="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            {{ t('inventoryModal.reset') }}
          </button>
        </div>
      </div>



      <!-- 表格和分页 -->
      <AdminDataTable
        :loading="loading"
        :pagination="{
          page: page,
          pages: totalPages,
          total: stats.total,
          limit: pageSize
        }"
        :column-count="7"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
        class="flex-1"
      >
        <template #thead>
          <tr>
            <th v-if="batchDeleteMode" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('inventoryModal.accountData') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('inventoryModal.status') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('inventoryModal.transactionNo') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('inventoryModal.consumedAt') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('inventoryModal.consumer') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('inventoryModal.createdAt') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('inventoryModal.actions') }}</th>
          </tr>
        </template>
        
        <template #tbody>
          <tr v-if="inventories.length === 0">
            <td colspan="7" class="px-6 py-12 text-center">
              <div class="flex flex-col items-center justify-center text-gray-500">
                <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p class="text-sm">{{ t('inventoryModal.emptyTitle') }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ t('inventoryModal.emptyDesc') }}</p>
              </div>
            </td>
          </tr>
          <tr v-for="item in inventories" :key="item.id" class="hover:bg-gray-50">
              <td v-if="batchDeleteMode" class="px-6 py-4">
                <input
                  v-if="item.status === 'available'"
                  type="checkbox"
                  :checked="selectedIds.includes(item.id)"
                  @change="toggleSelect(item.id)"
                  class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <div class="text-sm font-mono text-gray-900 max-w-xs truncate" :title="item.account_data">
                    {{ item.account_data }}
                  </div>
                  <button
                    @click="copyAccountData(item.account_data)"
                    class="flex-shrink-0 p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    :title="t('inventoryModal.copyAccountData')"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    item.status === 'available'
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ item.status === 'available' ? `✓ ${t('inventoryModal.statusAvailable')}` : `× ${t('inventoryModal.statusConsumed')}` }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span v-if="item.transaction_no" class="font-mono text-xs">{{ item.transaction_no }}</span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(item.consumed_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ item.consumer_email || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(item.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  v-if="item.status === 'available'"
                  @click="confirmDelete(item.id)"
                  class="text-red-600 hover:text-red-900"
                >
                  {{ t('inventoryModal.delete') }}
                </button>
                <span v-else class="text-gray-400">-</span>
              </td>
            </tr>
        </template>
      </AdminDataTable>
    </div>

    <!-- 删除确认对话框 -->
  <ConfirmDialog
    :visible="showDeleteConfirm"
    :title="t('inventoryModal.deleteConfirmTitle')"
    :message="t('inventoryModal.deleteConfirmMessage')"
    :confirmText="t('inventoryModal.delete')"
    :cancelText="t('common.cancel')"
    type="danger"
      :show-warning="true"
      @confirm="deleteItem"
      @cancel="showDeleteConfirm = false"
    />

    <!-- 批量添加弹窗 -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60" @click.self="showAddModal = false">
      <div class="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h3 class="text-lg font-semibold text-gray-900">{{ t('inventoryModal.addAccountsTitle') }}</h3>
          <button @click="showAddModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 p-6 overflow-auto">
          <!-- 模式选择 -->
          <div class="mb-4">
            <div class="flex gap-3">
              <button
                @click="inputMode = 'single'"
                :class="[
                  'flex-1 px-4 py-3 text-sm rounded-lg transition-all border-2',
                  inputMode === 'single'
                    ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                ]"
              >
                <div class="font-semibold">{{ t('inventoryModal.inputModeSingle') }}</div>
                <div class="text-xs mt-0.5 opacity-75">{{ t('inventoryModal.inputModeSingleDesc') }}</div>
              </button>
              <button
                @click="inputMode = 'multiline'"
                :class="[
                  'flex-1 px-4 py-3 text-sm rounded-lg transition-all border-2',
                  inputMode === 'multiline'
                    ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                ]"
              >
                <div class="font-semibold">{{ t('inventoryModal.inputModeMultiline') }}</div>
                <div class="text-xs mt-0.5 opacity-75">{{ t('inventoryModal.inputModeMultilineDesc') }}</div>
              </button>
              <button
                @click="inputMode = 'separator'"
                :class="[
                  'flex-1 px-4 py-3 text-sm rounded-lg transition-all border-2',
                  inputMode === 'separator'
                    ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                ]"
              >
                <div class="font-semibold">{{ t('inventoryModal.inputModeSeparator') }}</div>
                <div class="text-xs mt-0.5 opacity-75">{{ t('inventoryModal.inputModeSeparatorDesc') }}</div>
              </button>
            </div>
          </div>

          <!-- 多行模式配置 -->
          <div v-if="inputMode === 'multiline'" class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-center gap-3">
              <label class="text-sm font-medium text-gray-700">{{ t('inventoryModal.linesPerItem') }}:</label>
              <input
                v-model.number="multilineConfig.linesPerItem"
                type="number"
                min="1"
                max="20"
                class="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span class="text-sm text-gray-600">{{ t('inventoryModal.lineUnit') }}</span>
              <div class="ml-4 text-xs text-gray-500">
                {{ t('inventoryModal.multilineHint') }}
              </div>
            </div>
          </div>

          <!-- 分隔符模式配置 -->
          <div v-if="inputMode === 'separator'" class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-center gap-3">
              <label class="text-sm font-medium text-gray-700">{{ t('inventoryModal.separatorContent') }}:</label>
              <input
                v-model="separatorConfig.separator"
                type="text"
                :placeholder="t('inventoryModal.separatorPlaceholder')"
                class="flex-1 max-w-xs px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
              />
              <span class="text-xs text-gray-500">{{ t('inventoryModal.separatorHint') }}</span>
            </div>
          </div>

          <textarea
            v-model="inventoryInput"
            :placeholder="getPlaceholder()"
            :class="[
              'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:border-primary-500 resize-none font-mono text-sm text-gray-700 placeholder-gray-400',
              inputMode === 'single' ? 'h-[460px]' : 'h-[380px]'
            ]"
            style="tab-size: 4; overflow-x: auto; white-space: pre;"
          ></textarea>
        </div>
        <div class="flex gap-2 px-6 py-4 border-t bg-gray-50">
          <button
            @click="handleAddInventory"
            :disabled="adding || !inventoryInput.trim()"
            class="px-4 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ adding ? t('inventoryModal.adding') : t('inventoryModal.confirmAdd') }}
          </button>
          <button
            @click="showAddModal = false; inventoryInput = ''"
            class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 批量删除确认对话框 -->
  <ConfirmDialog
    :visible="showBatchDeleteConfirm"
    :title="t('inventoryModal.batchDeleteConfirmTitle')"
    :message="t('inventoryModal.batchDeleteConfirmMessage', { count: selectedIds.length })"
    :confirmText="t('inventoryModal.delete')"
    :cancelText="t('common.cancel')"
    type="danger"
      :show-warning="true"
      @confirm="batchDeleteItems"
      @cancel="showBatchDeleteConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { workflowApi } from '@/api/workflow'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'

const props = defineProps({
  workflow: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'updated'])
const { t } = useI18n()

// 响应式数据
const loading = ref(false)
const adding = ref(false)
const showAddModal = ref(false)
const showDeleteConfirm = ref(false)
const showBatchDeleteConfirm = ref(false)
const deleteTargetId = ref(null)
const statusFilter = ref('all')
const inventoryInput = ref('')
const searchQuery = ref('')
const page = ref(1)
const pageSize = ref(50)
const selectedIds = ref([])
const batchDeleteMode = ref(false)  // 批量删除模式
const inputMode = ref('single')  // 输入模式：single | multiline | separator

// 多行模式配置
const multilineConfig = ref({
  linesPerItem: 3  // 每几行算一个账号
})

// 分隔符模式配置
const separatorConfig = ref({
  separator: '==='  // 自定义分隔符内容
})

const inventories = ref([])
const totalInventories = ref(0) // 后端返回的总数
const stats = ref({
  total: 0,
  available: 0,
  consumed: 0,
  reserved: 0
})

// 计算属性
const totalPages = computed(() => {
  return Math.ceil(totalInventories.value / pageSize.value)
})

const isAllSelected = computed(() => {
  const availableItems = inventories.value.filter(item => item.status === 'available')
  return availableItems.length > 0 && selectedIds.value.length === availableItems.length
})

// 进入批量删除模式
const enterBatchDeleteMode = () => {
  batchDeleteMode.value = true
  selectedIds.value = []
}

// 退出批量删除模式
const exitBatchDeleteMode = () => {
  batchDeleteMode.value = false
  selectedIds.value = []
}

// 方法
const handlePageChange = (newPage) => {
  page.value = newPage
}

const handlePageSizeChange = (newSize) => {
  pageSize.value = newSize
  page.value = 1
}

const handleSearch = () => {
  page.value = 1
  fetchInventoryList()
}

const handleReset = () => {
  searchQuery.value = ''
  statusFilter.value = 'all'
  page.value = 1
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  return formatTimestamp(timestamp)
}

const fetchInventoryList = async () => {
  loading.value = true
  try {
    // 构建查询参数
    const params = {
      page: page.value,
      page_size: pageSize.value
    }

    // 添加状态筛选
    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value
    }

    // 添加搜索关键词
    if (searchQuery.value.trim()) {
      params.keyword = searchQuery.value.trim()
    }

    const res = await workflowApi.getInventoryList(props.workflow.workflow_id, params)
    if (res.code === 0) {
      // 后端给啥就用啥，不做任何处理
      inventories.value = res.data.inventories || []
      totalInventories.value = res.data.total || 0

      // 统计数据也直接用后端返回的
      stats.value.total = res.data.total || 0
      stats.value.available = res.data.available || 0
      stats.value.consumed = res.data.consumed || 0
      stats.value.reserved = res.data.reserved || 0

      // 清空选择状态（当列表刷新时）
      selectedIds.value = []
    } else {
      showMessage(t('inventoryModal.fetchFailed'), 'error')
    }
  } catch (error) {
    console.error('获取库存失败:', error)
    showMessage(t('inventoryModal.fetchFailed'), 'error')
  } finally {
    loading.value = false
  }
}

// 选择/取消选择单个项目
const toggleSelect = (id) => {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

// 全选/取消全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    // 只选择状态为 available 的库存
    selectedIds.value = inventories.value
      .filter(item => item.status === 'available')
      .map(item => item.id)
  }
}

// 确认批量删除
const confirmBatchDelete = () => {
  if (selectedIds.value.length === 0) {
    showMessage(t('inventoryModal.selectDeleteWarning'), 'warning')
    return
  }
  showBatchDeleteConfirm.value = true
}

// 执行批量删除
const batchDeleteItems = async () => {
  if (selectedIds.value.length === 0) return

  try {
    const res = await workflowApi.batchDeleteInventory(props.workflow.workflow_id, selectedIds.value)
    if (res.code === 0) {
      showMessage(t('inventoryModal.batchDeleteSuccess', { count: res.data.deleted_count }), 'success')
      // 退出批量删除模式
      exitBatchDeleteMode()
      // 刷新库存列表
      await fetchInventoryList()
      // 通知父组件更新库存数量
      emit('updated')
    } else {
      showMessage(t('inventoryModal.batchDeleteFailed'), 'error')
    }
  } catch (error) {
    console.error('批量删除失败:', error)
    showMessage(t('inventoryModal.batchDeleteFailed'), 'error')
  } finally {
    showBatchDeleteConfirm.value = false
  }
}

const handleAddInventory = async () => {
  if (!inventoryInput.value.trim()) {
    showMessage(t('inventoryModal.inputRequired'), 'warning')
    return
  }

  adding.value = true
  try {
    // 构建请求参数,包含模式和配置
    const requestData = {
      accounts: inventoryInput.value,
      mode: inputMode.value
    }

    // 根据不同模式添加配置参数
    if (inputMode.value === 'multiline') {
      requestData.lines_per_item = multilineConfig.value.linesPerItem
    } else if (inputMode.value === 'separator') {
      requestData.separator = separatorConfig.value.separator
    }

    const res = await workflowApi.addInventory(props.workflow.workflow_id, requestData)

    if (res.code === 0) {
      showMessage(t('inventoryModal.addSuccess', { count: res.data.added_count }), 'success')
      if (res.data.duplicate_count > 0) {
        showMessage(t('inventoryModal.duplicateSkipped', { count: res.data.duplicate_count }), 'warning')
      }
      inventoryInput.value = ''
      showAddModal.value = false
      // 刷新库存列表
      await fetchInventoryList()
      // 通知父组件更新库存数量
      emit('updated')
    } else {
      showMessage(t('inventoryModal.addFailed'), 'error')
    }
  } catch (error) {
    console.error('添加库存失败:', error)
    showMessage(t('inventoryModal.addFailed'), 'error')
  } finally {
    adding.value = false
  }
}

// 根据选择的模式返回对应的placeholder
const getPlaceholder = () => {
  if (inputMode.value === 'single') {
    return t('inventoryModal.placeholderSingle')
  } else if (inputMode.value === 'multiline') {
    return t('inventoryModal.placeholderMultiline', { lines: multilineConfig.value.linesPerItem })
  } else {
    return t('inventoryModal.placeholderSeparator', { separator: separatorConfig.value.separator || '===' })
  }
}

const copyAccountData = async (accountData) => {
  try {
    await navigator.clipboard.writeText(accountData)
    showMessage(t('inventoryModal.copySuccess'), 'success')
  } catch (error) {
    console.error('复制失败:', error)
    showMessage(t('inventoryModal.copyFailed'), 'error')
  }
}

const confirmDelete = (itemId) => {
  deleteTargetId.value = itemId
  showDeleteConfirm.value = true
}

const deleteItem = async () => {
  if (!deleteTargetId.value) return

  try {
    const res = await workflowApi.deleteInventory(props.workflow.workflow_id, deleteTargetId.value)
    if (res.code === 0) {
      showMessage(t('inventoryModal.deleteSuccess'), 'success')
      // 刷新库存列表
      await fetchInventoryList()
      // 通知父组件更新库存数量
      emit('updated')
    } else {
      showMessage(t('inventoryModal.deleteFailed'), 'error')
    }
  } catch (error) {
    console.error('删除失败:', error)
    showMessage(t('inventoryModal.deleteFailed'), 'error')
  } finally {
    showDeleteConfirm.value = false
    deleteTargetId.value = null
  }
}

// 监听页码变化
watch(page, () => {
  fetchInventoryList()
})

// 监听状态筛选变化
watch(statusFilter, () => {
  page.value = 1
  fetchInventoryList()
})

// 挂载时加载数据
onMounted(() => {
  fetchInventoryList()
})
</script>
