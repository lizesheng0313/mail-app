<template>
  <div class="space-y-6">
    <div class="rounded-lg bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <BaseInput
            v-model="filters.search"
            placeholder="发件账号 / SMTP主机"
            size="sm"
            class="w-72"
            @keyup.enter="loadPageData"
          />
          <div class="w-36">
            <CustomSelect v-model="filters.status" :options="statusOptions" placeholder="全部状态" size="sm" />
          </div>
          <button type="button" class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700" @click="loadPageData">
            查询
          </button>
        </div>
        <button
          type="button"
          class="h-10 rounded-md bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
          @click="openAddModal"
        >
          添加账号
        </button>
      </div>
    </div>

    <AdminDataTable
      title="发信账号配置"
      :loading="loading"
      :column-count="7"
      table-class="w-full min-w-[1120px] table-fixed"
    >
      <template #thead>
        <tr>
          <th class="w-[20%] px-5 py-3 text-left text-xs font-medium text-gray-500">发件账号</th>
          <th class="w-[18%] px-5 py-3 text-left text-xs font-medium text-gray-500">SMTP 配置</th>
          <th class="w-[14%] px-5 py-3 text-left text-xs font-medium text-gray-500">用途与分组</th>
          <th class="w-[10%] px-5 py-3 text-left text-xs font-medium text-gray-500">绑定客户</th>
          <th class="w-[14%] px-5 py-3 text-left text-xs font-medium text-gray-500">发送额度</th>
          <th class="w-[11%] px-5 py-3 text-left text-xs font-medium text-gray-500">状态</th>
          <th class="w-[13%] px-5 py-3 text-center text-xs font-medium text-gray-500">操作</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!filteredRows.length">
          <td colspan="7" class="px-6 py-12 text-center text-sm text-gray-500">暂无发信账号</td>
        </tr>
        <tr v-for="item in filteredRows" :key="item.id" class="hover:bg-gray-50">
          <td class="px-5 py-4">
            <div class="truncate text-sm font-semibold text-gray-900" :title="item.email || '-'">{{ item.email || '-' }}</div>
            <div class="mt-1 truncate text-xs text-gray-500" :title="item.smtp_username || ''">
              {{ item.smtp_username && item.smtp_username !== item.email ? `登录：${item.smtp_username}` : `账号 #${item.id}` }}
            </div>
          </td>
          <td class="px-5 py-4">
            <div class="truncate text-sm text-gray-800" :title="item.smtp_host || '-'">{{ item.smtp_host || '-' }}</div>
            <div class="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <span>端口 {{ item.smtp_port || '-' }}</span>
              <span class="text-gray-300">·</span>
              <span class="truncate">{{ item.provider || '自定义 SMTP' }}</span>
            </div>
          </td>
          <td class="px-5 py-4">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="inline-flex whitespace-nowrap rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                {{ getCategoryText(item) }}
              </span>
              <span
                v-if="!isAuthOnly(item)"
                :class="getGroupClass(item.channel_group)"
                class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium"
              >
                {{ getGroupText(item.channel_group) }}
              </span>
              <span v-if="!isAuthOnly(item) && item.allowed_task_type && item.allowed_task_type !== 'all'" class="w-full text-xs text-gray-500">
                {{ item.allowed_task_type === 'transactional' ? '仅事务' : '仅营销' }}
              </span>
            </div>
          </td>
          <td class="px-5 py-4 text-sm text-gray-700">
            <span v-if="isAuthOnly(item)" class="text-gray-400">不适用</span>
            <span v-else-if="item.bound_user_id" class="font-medium text-gray-800">客户 #{{ item.bound_user_id }}</span>
            <span v-else class="text-gray-500">公共池</span>
          </td>
          <td class="px-5 py-4 text-xs text-gray-600">
            <div class="flex flex-col items-start gap-1.5">
              <span class="inline-flex whitespace-nowrap rounded bg-gray-50 px-2 py-1">
                今日 {{ item.daily_send_count || 0 }} / {{ formatLimit(item.daily_send_limit) }}
              </span>
              <span class="inline-flex whitespace-nowrap rounded bg-gray-50 px-2 py-1">
                本月 {{ item.monthly_send_count || 0 }} / {{ formatLimit(item.monthly_send_limit) }}
              </span>
            </div>
          </td>
          <td class="px-5 py-4 text-sm">
            <span :class="getStatusClass(item)" class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium">
              {{ getStatusText(item) }}
            </span>
          </td>
          <td class="px-5 py-4 text-sm">
            <div class="mx-auto flex w-[136px] items-center justify-start gap-1">
              <ActionButton
                v-if="!isAuthOnly(item)"
                icon="edit"
                tooltip="编辑账号"
                variant="edit"
                :disabled="savingKey === String(item.id)"
                @click="openEditModal(item)"
              />
              <ActionButton
                v-if="!item.authSelected"
                icon="check"
                tooltip="设为验证码"
                variant="enable"
                :disabled="savingKey === String(item.id)"
                @click="handleAssign(item, 'auth')"
              />
              <ActionButton
                v-if="item.status === 'active'"
                icon="disable"
                tooltip="禁用"
                variant="disable"
                :disabled="savingKey === String(item.id)"
                @click="handleDisable(item)"
              />
              <ActionButton
                icon="delete"
                tooltip="删除"
                variant="delete"
                :disabled="savingKey === String(item.id)"
                @click="handleDelete(item)"
              />
            </div>
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <div class="rounded-lg bg-white p-5 shadow-sm space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="text-lg font-semibold text-gray-900">域名分流规则</div>
          <div class="mt-1 text-sm text-gray-500">只对未绑定专属通道的客户生效，根据收件邮箱域名选择对应的 SMTP 账号组</div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="h-10 rounded-md border border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50"
            @click="handleAddDomainRule"
          >
            添加规则
          </button>
          <button
            type="button"
            class="h-10 rounded-md bg-primary-600 px-4 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
            :disabled="routeRulesSaving"
            @click="handleSaveDomainRules"
          >
            {{ routeRulesSaving ? '保存中...' : '保存规则' }}
          </button>
        </div>
      </div>
      <div class="grid gap-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-600 md:grid-cols-3">
        <div><span class="font-medium text-gray-900">客户已绑定：</span>只用该客户勾选的通道，不再执行域名分流。</div>
        <div><span class="font-medium text-gray-900">客户未绑定：</span>例如 qq.com 走国内组，gmail.com 走海外组。</div>
        <div><span class="font-medium text-gray-900">没有匹配：</span>使用 * 兜底规则；同组多个账号会自动轮询和故障切换。</div>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">收件域名</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">通道组</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(rule, index) in domainRules" :key="index">
              <td class="px-4 py-2 w-64">
                <BaseInput v-if="rule.domain !== '*'" v-model="rule.domain" placeholder="qq.com" size="sm" />
                <span v-else class="text-sm text-gray-500">*（其他全部）</span>
              </td>
              <td class="px-4 py-2 w-48">
                <CustomSelect v-model="rule.group" :options="groupOptions" size="sm" />
              </td>
              <td class="px-4 py-2 text-right">
                <ActionButton
                  v-if="rule.domain !== '*'"
                  icon="delete"
                  tooltip="删除规则"
                  variant="delete"
                  @click="domainRules.splice(index, 1)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="rounded-lg bg-white p-5 shadow-sm space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="text-lg font-semibold text-gray-900">邮件补量套餐</div>
          <div class="mt-1 text-sm text-gray-500">后台统一配置邮件封数和价格，前台购买页会直接同步这里</div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="h-10 rounded-md border border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50"
            @click="handleAddQuotaPackage"
          >
            增加套餐
          </button>
          <button
            type="button"
            class="h-10 rounded-md bg-primary-600 px-4 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
            :disabled="quotaPricingSaving"
            @click="handleSaveQuotaPricing"
          >
            {{ quotaPricingSaving ? '保存中...' : '保存套餐' }}
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">套餐名称</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">邮件封数</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">价格</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">原价</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">说明</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">推荐</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="!quotaPackages.length">
              <td colspan="7" class="px-4 py-10 text-center text-sm text-gray-500">暂无套餐</td>
            </tr>
            <tr v-for="(item, index) in quotaPackages" :key="`quota-${index}`">
              <td class="px-4 py-3">
                <input v-model.trim="item.name" type="text" class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none" />
              </td>
              <td class="px-4 py-3">
                <input v-model.number="item.quota" type="number" min="1" class="h-10 w-36 rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none" />
              </td>
              <td class="px-4 py-3">
                <input v-model.number="item.price" type="number" min="0" step="0.01" class="h-10 w-32 rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none" />
              </td>
              <td class="px-4 py-3">
                <input v-model.number="item.original_price" type="number" min="0" step="0.01" class="h-10 w-32 rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none" />
              </td>
              <td class="px-4 py-3">
                <input v-model.trim="item.description" type="text" class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none" />
              </td>
              <td class="px-4 py-3">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input v-model="item.recommended" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  推荐
                </label>
              </td>
              <td class="px-4 py-3 text-right">
                <ActionButton icon="delete" tooltip="删除套餐" variant="delete" @click="handleRemoveQuotaPackage(index)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal
      v-model="addModalVisible"
      :title="editingAccount ? `编辑账号：${editingAccount.email || ''}` : '添加发信账号'"
      size="md"
      :confirm-text="adding ? '保存中...' : '确定'"
      :confirm-loading="adding"
      :confirm-disabled="!canSubmitAccount"
      @confirm="handleSaveAccount"
    >
      <div class="space-y-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700">类别</label>
          <CustomSelect v-model="addForm.category" :options="categoryOptions" placeholder="请选择类别" :disabled="Boolean(editingAccount)" />
        </div>
        <div v-if="editingAccount" class="flex items-center gap-2">
          <input id="edit-set-delivery" v-model="editSetDelivery" type="checkbox" class="h-4 w-4" />
          <label for="edit-set-delivery" class="text-sm text-gray-700">保存时设为发信账号</label>
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700">发件邮箱</label>
          <input
            v-model.trim="addForm.email"
            type="text"
            class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
            :disabled="Boolean(editingAccount)"
            :class="{ 'bg-gray-50 text-gray-500': editingAccount }"
            placeholder="请输入发件邮箱"
          />
        </div>
        <div v-if="!editingAccount">
          <label class="mb-2 block text-sm font-medium text-gray-700">SMTP 登录账号</label>
          <input
            v-model.trim="addForm.smtp_username"
            type="text"
            class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="普通邮箱可留空；Mailtrap 填 SMTP Username"
          />
        </div>
        <div v-if="!editingAccount">
          <label class="mb-2 block text-sm font-medium text-gray-700">密码 / 授权码</label>
          <input
            v-model.trim="addForm.password"
            type="text"
            class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="请输入密码或授权码"
          />
        </div>
        <div v-if="!editingAccount" class="grid grid-cols-[1fr_120px] gap-3">
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700">SMTP 主机</label>
            <input
              v-model.trim="addForm.smtp_host"
              type="text"
              class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
              placeholder="普通邮箱可留空；如 live.smtp.mailtrap.io"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700">端口</label>
            <input
              v-model.number="addForm.smtp_port"
              type="number"
              min="1"
              max="65535"
              class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
              placeholder="587"
            />
          </div>
        </div>

        <div v-if="showDeliveryFields" class="border-t border-gray-200 pt-4">
          <label class="mb-2 block text-sm font-medium text-gray-700">通道分组</label>
          <CustomSelect v-model="routeForm.channel_group" :options="groupOptions" placeholder="请选择通道分组" />
        </div>
        <div v-if="showDeliveryFields">
          <label class="mb-2 block text-sm font-medium text-gray-700">邮件类型</label>
          <CustomSelect v-model="routeForm.allowed_task_type" :options="taskTypeOptions" />
          <p class="mt-1 text-xs text-gray-500">事务=验证码/订单等必达邮件；营销=群发推广。分开用不同的号，营销被举报不会连累事务邮件。</p>
        </div>
        <div v-if="showDeliveryFields" class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700">每日发送上限</label>
            <input
              v-model.number="routeForm.daily_send_limit"
              type="number"
              min="0"
              class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
            />
            <p class="mt-1 text-xs text-gray-500">0 表示不限</p>
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700">每月发送上限</label>
            <input
              v-model.number="routeForm.monthly_send_limit"
              type="number"
              min="0"
              class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
            />
            <p class="mt-1 text-xs text-gray-500">按自然月重置，0 表示不限</p>
          </div>
        </div>
        <div v-if="showDeliveryFields" class="flex items-center gap-2">
          <input id="route-enabled" v-model="routeForm.route_enabled" type="checkbox" class="h-4 w-4" />
          <label for="route-enabled" class="text-sm text-gray-700">参与自动路由</label>
        </div>
        <div v-if="showDeliveryFields">
          <label class="mb-2 block text-sm font-medium text-gray-700">绑定客户（独占，不选为公共池）</label>
          <div v-if="routeForm.bound_user_id" class="mb-2 flex items-center gap-2">
            <span class="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
              {{ routeBoundLabel || `客户#${routeForm.bound_user_id}` }}
            </span>
            <button type="button" class="text-xs text-gray-500 hover:text-red-600" @click="clearBoundUser">
              清除绑定
            </button>
          </div>
          <div class="relative">
            <input
              v-model.trim="routeBoundSearch"
              type="text"
              class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
              placeholder="输入客户邮箱或用户名搜索"
              @input="handleBoundSearch"
            />
            <div
              v-if="routeBoundOptions.length"
              class="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
            >
              <button
                v-for="option in routeBoundOptions"
                :key="option.user_id"
                type="button"
                class="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                @click="selectBoundUser(option)"
              >
                <span class="font-medium text-gray-900">{{ option.email || option.username }}</span>
                <span class="ml-2 text-xs text-gray-500">客户#{{ option.user_id }}</span>
              </button>
            </div>
            <div v-else-if="routeBoundSearching" class="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-lg">
              搜索中...
            </div>
          </div>
          <p class="mt-2 text-xs text-orange-600">
            绑定后此账号只给该客户用，且该客户不再使用公共池；其绑定账号全部不可用时邮件将直接失败。
          </p>
        </div>
      </div>
    </BaseModal>

    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      title="删除发信账号"
      :message="deleteConfirmMessage"
      type="danger"
      confirm-text="删除"
      :loading="deleting"
      loading-text="删除中"
      @confirm="confirmDelete"
      @cancel="closeDeleteConfirm"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'

const loading = ref(false)
const rows = ref([])
const savingKey = ref('')
const addModalVisible = ref(false)
const adding = ref(false)
const editingAccount = ref(null)
const editSetDelivery = ref(false)
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const deletingItem = ref(null)
const quotaPricingSaving = ref(false)
const quotaPackages = ref([])
const filters = reactive({
  search: '',
  status: ''
})
const addForm = ref({
  category: 'delivery',
  email: '',
  smtp_username: '',
  password: '',
  smtp_host: '',
  smtp_port: null
})
const routeForm = reactive({
  channel_group: 'default',
  route_enabled: true,
  bound_user_id: 0,
  allowed_task_type: 'all',
  daily_send_limit: 0,
  monthly_send_limit: 0
})

const taskTypeOptions = [
  { label: '都能发', value: 'all' },
  { label: '仅事务（验证码/订单等）', value: 'transactional' },
  { label: '仅营销（群发推广）', value: 'marketing' }
]
const routeBoundSearch = ref('')
const routeBoundOptions = ref([])
const routeBoundSearching = ref(false)
const routeBoundLabel = ref('')
let boundSearchTimer = null
const domainRules = ref([{ domain: '*', group: 'default' }])
const routeRulesSaving = ref(false)

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'disabled' }
]

const categoryOptions = [
  { label: '发信', value: 'delivery' },
  { label: '验证码', value: 'auth' }
]

const canSubmitAccount = computed(() => {
  if (editingAccount.value) return Boolean(editingAccount.value.id)
  return Boolean(addForm.value.category && addForm.value.email && addForm.value.password)
})
const showDeliveryFields = computed(() => addForm.value.category === 'delivery' || editSetDelivery.value)
const deleteConfirmMessage = computed(() => `确认删除发件账号 ${deletingItem.value?.email || ''} 吗？`)

const filteredRows = computed(() => {
  const keyword = filters.search.trim().toLowerCase()
  return (rows.value || []).filter((item) => {
    const searchMatched = !keyword
      || String(item.email || '').toLowerCase().includes(keyword)
      || String(item.smtp_host || '').toLowerCase().includes(keyword)
      || getCategoryText(item).toLowerCase().includes(keyword)
    const statusMatched = !filters.status || item.status === filters.status
    return searchMatched && statusMatched
  })
})

const mergeAdminAccounts = (deliveryConfig, authConfig) => {
  const accountMap = new Map()
  for (const item of deliveryConfig?.smtp_accounts || []) {
    if (item?.id) accountMap.set(Number(item.id), item)
  }
  for (const item of authConfig?.smtp_accounts || []) {
    if (item?.id) accountMap.set(Number(item.id), item)
  }
  return Array.from(accountMap.values())
}

const buildRows = (accounts, deliveryConfig, authConfig) => {
  const deliveryId = Number(deliveryConfig?.smtp_account_id || 0)
  const authId = Number(authConfig?.smtp_account_id || 0)
  return (accounts || []).map((item) => ({
    ...item,
    deliverySelected: Number(item.id || 0) === deliveryId,
    authSelected: Number(item.id || 0) === authId
  }))
}

const getCategoryText = (item) => {
  if (item?.deliverySelected && item?.authSelected) return '发信 / 验证码'
  if (item?.deliverySelected) return '发信'
  if (item?.authSelected) return '验证码'
  return '未分配'
}

const isAuthOnly = (item) => Boolean(item?.authSelected && !item?.deliverySelected)
const formatLimit = (value) => Number(value || 0) > 0 ? Number(value) : '不限'

const getStatusText = (item) => {
  if (item?.status !== 'active') return '已禁用'
  if (Number(item?.cooldown_seconds || 0) > 0) return `冷却中(${Math.ceil(Number(item.cooldown_seconds) / 60)}分)`
  if (item?.deliverySelected || item?.authSelected) return '当前使用中'
  return '已启用'
}

const getStatusClass = (item) => {
  if (item?.status !== 'active') return 'bg-red-100 text-red-700'
  if (Number(item?.cooldown_seconds || 0) > 0) return 'bg-orange-100 text-orange-700'
  if (item?.deliverySelected || item?.authSelected) return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-600'
}

const getGroupClass = (group) => {
  if (group === 'domestic') return 'bg-blue-100 text-blue-700'
  if (group === 'overseas') return 'bg-green-100 text-green-700'
  if (group && group !== 'default') return 'bg-purple-100 text-purple-700'
  return 'bg-gray-100 text-gray-600'
}

const getGroupText = (group) => {
  if (group === 'domestic') return '国内通道'
  if (group === 'overseas') return '海外通道'
  if (group && group !== 'default') return group
  return '默认通道'
}

const knownGroups = computed(() => {
  const groups = new Set(['default', 'domestic', 'overseas'])
  for (const item of rows.value || []) {
    if (item.channel_group) groups.add(item.channel_group)
  }
  return [...groups]
})

const groupOptions = computed(() => knownGroups.value.map((group) => ({
  label: group === 'default'
    ? '默认通道'
    : group === 'domestic'
      ? '国内通道'
      : group === 'overseas'
        ? '海外通道'
        : group,
  value: group
})))

const resetRouteForm = (item = {}) => {
  routeForm.channel_group = item.channel_group || 'default'
  routeForm.route_enabled = item.route_enabled !== false
  routeForm.bound_user_id = Number(item.bound_user_id || 0)
  routeForm.allowed_task_type = item.allowed_task_type || 'all'
  routeForm.daily_send_limit = Number(item.daily_send_limit || 0)
  routeForm.monthly_send_limit = Number(item.monthly_send_limit || 0)
  routeBoundLabel.value = item.bound_user_id ? `客户#${item.bound_user_id}` : ''
  routeBoundSearch.value = ''
  routeBoundOptions.value = []
  if (routeForm.bound_user_id) {
    resolveBoundLabel(routeForm.bound_user_id)
  }
}

const openEditModal = (item) => {
  editingAccount.value = item
  editSetDelivery.value = Boolean(item?.deliverySelected)
  addForm.value = {
    category: isAuthOnly(item) ? 'auth' : 'delivery',
    email: item.email || '',
    smtp_username: item.smtp_username || '',
    password: '',
    smtp_host: item.smtp_host || '',
    smtp_port: item.smtp_port || null
  }
  resetRouteForm(item)
  addModalVisible.value = true
}

const resolveBoundLabel = async (userId) => {
  try {
    const res = await emailReachApi.getAdminAccounts({ search: '', page: 1, limit: 100 })
    const matched = (res?.data?.items || []).find((item) => Number(item.user_id) === Number(userId))
    if (matched && Number(routeForm.bound_user_id) === Number(userId)) {
      routeBoundLabel.value = `${matched.email || matched.username}（客户#${userId}）`
    }
  } catch {
    /* 显示兜底文案 客户#ID 即可 */
  }
}

const handleBoundSearch = () => {
  if (boundSearchTimer) clearTimeout(boundSearchTimer)
  const keyword = routeBoundSearch.value.trim()
  if (!keyword) {
    routeBoundOptions.value = []
    routeBoundSearching.value = false
    return
  }
  routeBoundSearching.value = true
  boundSearchTimer = setTimeout(async () => {
    try {
      const res = await emailReachApi.getAdminAccounts({ search: keyword, page: 1, limit: 10 })
      if (routeBoundSearch.value.trim() === keyword) {
        routeBoundOptions.value = res?.data?.items || []
      }
    } finally {
      routeBoundSearching.value = false
    }
  }, 300)
}

const selectBoundUser = (option) => {
  routeForm.bound_user_id = Number(option.user_id || 0)
  routeBoundLabel.value = `${option.email || option.username}（客户#${option.user_id}）`
  routeBoundSearch.value = ''
  routeBoundOptions.value = []
}

const clearBoundUser = () => {
  routeForm.bound_user_id = 0
  routeBoundLabel.value = ''
}

const saveAccountRoute = async (accountId) => {
  if (!accountId) return null
  return await emailReachApi.updateAdminSmtpAccountRoute(accountId, {
    channel_group: (routeForm.channel_group || 'default').trim().toLowerCase(),
    route_enabled: Boolean(routeForm.route_enabled),
    bound_user_id: Number(routeForm.bound_user_id || 0),
    allowed_task_type: routeForm.allowed_task_type || 'all',
    daily_send_limit: Math.max(0, Number(routeForm.daily_send_limit || 0)),
    monthly_send_limit: Math.max(0, Number(routeForm.monthly_send_limit || 0))
  })
}

const loadRouteRules = async () => {
  try {
    const res = await emailReachApi.getAdminRouteRules()
    const rules = res?.data?.domain_rules || {}
    const list = Object.entries(rules)
      .filter(([domain]) => domain !== '*')
      .map(([domain, group]) => ({ domain, group }))
    list.push({ domain: '*', group: rules['*'] || 'default' })
    domainRules.value = list
  } catch {
    domainRules.value = [{ domain: '*', group: 'default' }]
  }
}

const handleAddDomainRule = () => {
  domainRules.value.splice(domainRules.value.length - 1, 0, { domain: '', group: 'default' })
}

const handleSaveDomainRules = async () => {
  routeRulesSaving.value = true
  try {
    const payload = {}
    for (const rule of domainRules.value) {
      const domain = String(rule.domain || '').trim().toLowerCase()
      if (domain) payload[domain] = rule.group || 'default'
    }
    const res = await emailReachApi.saveAdminRouteRules({ domain_rules: payload })
    if (res?.code !== 0) return
    showMessage('域名规则已保存', 'success')
    await loadRouteRules()
  } finally {
    routeRulesSaving.value = false
  }
}


const loadPageData = async () => {
  loading.value = true
  try {
    const [deliveryRes, authRes, quotaPricingRes] = await Promise.all([
      emailReachApi.getAdminDeliveryConfig(),
      emailReachApi.getAdminAuthVerificationConfig(),
      emailReachApi.getAdminQuotaPricing()
    ])
    const accounts = mergeAdminAccounts(deliveryRes.data || {}, authRes.data || {})
    rows.value = buildRows(
      accounts,
      deliveryRes.data || {},
      authRes.data || {}
    )
    quotaPackages.value = Array.isArray(quotaPricingRes?.data?.packages)
      ? quotaPricingRes.data.packages.map((item) => ({
        quota: Number(item.quota || 0),
        price: Number(item.price || 0),
        original_price: Number(item.original_price || 0),
        name: item.name || '',
        description: item.description || '',
        recommended: Boolean(item.recommended)
      }))
      : []
  } finally {
    loading.value = false
  }
}

const handleAddQuotaPackage = () => {
  quotaPackages.value.push({
    quota: 10000,
    price: 0,
    original_price: 0,
    name: '',
    description: '',
    recommended: false
  })
}

const handleRemoveQuotaPackage = (index) => {
  quotaPackages.value.splice(index, 1)
}

const handleSaveQuotaPricing = async () => {
  quotaPricingSaving.value = true
  try {
    const res = await emailReachApi.saveAdminQuotaPricing({
      packages: quotaPackages.value.map((item) => ({
        quota: Number(item.quota || 0),
        price: Number(item.price || 0),
        original_price: Number(item.original_price || 0),
        name: item.name || '',
        description: item.description || '',
        recommended: Boolean(item.recommended)
      }))
    })
    if (res?.code !== 0) return
    quotaPackages.value = (res.data?.packages || []).map((item) => ({
      quota: Number(item.quota || 0),
      price: Number(item.price || 0),
      original_price: Number(item.original_price || 0),
      name: item.name || '',
      description: item.description || '',
      recommended: Boolean(item.recommended)
    }))
    showMessage('套餐保存成功', 'success')
  } finally {
    quotaPricingSaving.value = false
  }
}

const openAddModal = () => {
  editingAccount.value = null
  editSetDelivery.value = false
  addForm.value = {
    category: 'delivery',
    email: '',
    smtp_username: '',
    password: '',
    smtp_host: '',
    smtp_port: null
  }
  resetRouteForm()
  addModalVisible.value = true
}

const assignCategory = async (accountId, category) => {
  if (category === 'auth') {
    return await emailReachApi.updateAdminAuthVerificationSmtpStatus(accountId, { status: 'active' })
  }
  return await emailReachApi.updateAdminDeliverySmtpStatus(accountId, { status: 'active' })
}

const handleAssign = async (item, category) => {
  if (!item?.id) return
  savingKey.value = String(item.id)
  try {
    const res = await assignCategory(item.id, category)
    if (res?.code !== 0) return
    showMessage(category === 'auth' ? '已设为验证码账号' : '已设为发信账号', 'success')
    await loadPageData()
  } finally {
    savingKey.value = ''
  }
}

const handleDisable = async (item) => {
  if (!item?.id) return
  savingKey.value = String(item.id)
  try {
    if (item.deliverySelected) {
      const res = await emailReachApi.updateAdminDeliverySmtpStatus(item.id, { status: 'disabled' })
      if (res?.code !== 0) return
    }
    if (item.authSelected) {
      const res = await emailReachApi.updateAdminAuthVerificationSmtpStatus(item.id, { status: 'disabled' })
      if (res?.code !== 0) return
    }
    if (!item.deliverySelected && !item.authSelected) {
      const res = await emailReachApi.updateAdminDeliverySmtpStatus(item.id, { status: 'disabled' })
      if (res?.code !== 0) return
    }
    showMessage('已禁用', 'success')
    await loadPageData()
  } finally {
    savingKey.value = ''
  }
}

const handleDelete = async (item) => {
  if (!item?.id) return
  deletingItem.value = item
  showDeleteConfirm.value = true
}

const closeDeleteConfirm = () => {
  showDeleteConfirm.value = false
  deletingItem.value = null
}

const confirmDelete = async () => {
  if (!deletingItem.value?.id) return
  deleting.value = true
  savingKey.value = String(deletingItem.value.id)
  try {
    const res = await emailReachApi.deleteAdminSmtpAccount(deletingItem.value.id)
    if (res?.code !== 0) return
    showMessage('删除成功', 'success')
    closeDeleteConfirm()
    await loadPageData()
  } finally {
    deleting.value = false
    savingKey.value = ''
  }
}

const handleSaveAccount = async () => {
  if (!canSubmitAccount.value) return
  adding.value = true
  try {
    if (editingAccount.value?.id) {
      if (showDeliveryFields.value) {
        const res = await saveAccountRoute(editingAccount.value.id)
        if (res?.code !== 0) return
      }
      if (editSetDelivery.value) {
        const assignRes = await assignCategory(editingAccount.value.id, 'delivery')
        if (assignRes?.code !== 0) return
      }
      showMessage('保存成功', 'success')
      addModalVisible.value = false
      editingAccount.value = null
      editSetDelivery.value = false
      await loadPageData()
      return
    }

    const res = await emailReachApi.createAdminSmtpAccount({
      category: addForm.value.category,
      email: addForm.value.email,
      smtp_username: addForm.value.smtp_username,
      password: addForm.value.password,
      smtp_host: addForm.value.smtp_host,
      smtp_port: Number(addForm.value.smtp_port || 0)
    })
    if (res?.code !== 0) return
    const accountId = Number(res?.data?.smtp_account_id || 0)
    if (addForm.value.category === 'delivery' && accountId > 0) {
      const routeRes = await saveAccountRoute(accountId)
      if (routeRes?.code !== 0) return
    }
    showMessage('添加成功', 'success')
    addModalVisible.value = false
    editingAccount.value = null
    editSetDelivery.value = false
    await loadPageData()
  } finally {
    adding.value = false
  }
}

onMounted(() => {
  loadPageData()
  loadRouteRules()
})
</script>
