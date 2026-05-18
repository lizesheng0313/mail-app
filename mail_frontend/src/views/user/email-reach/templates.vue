<template>
  <div class="space-y-6">
    <div
      v-if="accessLoaded && access.status !== 'approved' && access.status !== 'trial'"
      class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"
    >
      <div class="font-medium">当前账号还没开通邮件触达</div>
      <div class="mt-2">{{ access.reason }}</div>
    </div>

    <div v-if="canOperate" class="rounded-lg border bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-4">
          <BaseInput
            v-model="filters.keyword"
            placeholder="模板名"
            size="sm"
            class="h-10 w-64"
          />
          <button
            type="button"
            class="h-10 rounded-md bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
            @click="applyFilters"
          >
            查询
          </button>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="h-10 rounded-md border border-gray-200 bg-white px-4 text-sm text-gray-700 hover:bg-gray-50"
            @click="protocolVisible = true"
          >
            使用协议
          </button>
          <button
            type="button"
            class="h-10 rounded-md bg-primary-600 px-4 text-sm text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canOperate"
            @click="openCreateModal"
          >
            新建模板
          </button>
        </div>
      </div>
    </div>

    <AdminDataTable title="模板列表" :loading="loading" :column-count="5">
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">模板ID</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">模板名</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">场景</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">更新时间</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">操作</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!filteredTemplates.length && !loading">
          <td colspan="5" class="px-6 py-12 text-center text-black">暂无模板</td>
        </tr>
        <tr v-for="item in filteredTemplates" :key="item.template_id || item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-black">{{ item.template_id || '-' }}</td>
          <td class="px-6 py-4 text-sm font-medium text-black">{{ item.name || '未命名模板' }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ item.scene || '-' }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ formatTime(item.updated_at) }}</td>
          <td class="px-6 py-4 text-sm">
            <div class="flex items-center space-x-2">
              <ActionButton icon="edit" tooltip="编辑" variant="edit" @click="openEditModal(item)" />
              <ActionButton icon="delete" tooltip="删除" variant="delete" @click="openDeleteDialog(item)" />
            </div>
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <ConfirmDialog
      :visible="showDeleteConfirm"
      title="删除模板"
      :message="deleteMessage"
      type="danger"
      confirm-text="删除"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog"
    />

    <BaseModal
      v-model="protocolVisible"
      title="肥猫猫平台邮件触达服务使用协议"
      size="lg"
      :show-close="access.agreement_accepted"
      :close-on-click-outside="access.agreement_accepted"
      :show-footer="true"
      :show-cancel="true"
      :show-confirm="true"
      cancel-text="不同意"
      confirm-text="同意并继续"
      :confirm-loading="agreeSubmitting"
      @confirm="handleAgreementAccept"
      @cancel="handleAgreementDecline"
    >
      <div class="max-h-[70vh] overflow-y-auto space-y-5 text-sm leading-7 text-gray-700">
        <section>
          <div class="text-base font-semibold text-black">一、适用范围</div>
          <div class="mt-2">本服务仅限向你自有的注册用户、订阅用户、已建立业务关系的客户发送邮件。</div>
          <div>适用内容包括但不限于活动通知、订单通知、发货提醒、会员消息、优惠信息及其他合规业务通知。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">二、禁止发送内容</div>
          <div class="mt-2">严禁发送钓鱼、欺诈、病毒、垃圾营销、开发信、假发票、色情、赌博、诈骗、政治敏感及其他违法违规内容。</div>
          <div>严禁向未授权用户发送邮件，严禁在邮件中导流微信、QQ、群、二维码、Telegram、WhatsApp 等站外联系方式。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">三、账户限制规则</div>
          <div class="mt-2">出现以下情况，平台有权限制外发或切换至备用发信通道：</div>
          <ul class="list-disc pl-5">
            <li>前一天发信量大于等于 300，且无效地址率大于 11%。</li>
            <li>前一天发信量大于等于 300，且垃圾邮件率大于 15%。</li>
            <li>前一天发信量大于等于 300，且到达率为 0。</li>
            <li>账号信誉明显下降，或发送质量持续过低。</li>
          </ul>
        </section>

        <section>
          <div class="text-base font-semibold text-black">四、封禁规则</div>
          <div class="mt-2">如发现以下情况，平台有权立即执行封禁处理，且不保证解封：</div>
          <ul class="list-disc pl-5">
            <li>发送钓鱼、欺诈、病毒等恶意邮件。</li>
            <li>多账户注册、滥用服务、规避风控。</li>
            <li>发送大量垃圾邮件，被第三方投诉，导致通道信誉受损。</li>
            <li>其他对通道和平台造成明显风险的行为。</li>
          </ul>
          <div class="mt-2">一旦触发封禁，处理范围不限于邮箱使用、邮件触达使用及相关账号使用，并可同时冻结该账号下全部奶片余额。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">五、使用确认</div>
          <div class="mt-2">邮件底部会自动附带退订与举报链接。</div>
          <div>模板及发送内容会经过风控审核，平台有权根据实际情况调整限制规则、阈值及处理方式。</div>
          <div>你点击“同意并继续”后，即表示你已完整阅读、理解并接受本协议，后续使用邮件触达服务的全部行为均受本协议约束；如不同意，本服务将无法继续使用。</div>
        </section>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'

const router = useRouter()
const accessLoaded = ref(false)
const loading = ref(false)
const deleting = ref(false)
const agreeSubmitting = ref(false)
const templates = ref([])
const showDeleteConfirm = ref(false)
const deletingTemplate = ref(null)
const protocolVisible = ref(false)
const access = ref({
  status: 'pending',
  reason: ''
})
const filters = reactive({
  keyword: ''
})
const appliedFilters = reactive({
  keyword: ''
})

const canOperate = computed(() => access.value.status === 'approved' || access.value.status === 'trial')
const deleteMessage = computed(() => `确认删除模板《${deletingTemplate.value?.name || '未命名模板'}》吗？`)
const filteredTemplates = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()
  return templates.value.filter((item) => !keyword || String(item.name || '').toLowerCase().includes(keyword))
})

const applyFilters = () => {
  appliedFilters.keyword = filters.keyword
}

const formatTime = (value) => {
  if (!value) return '-'
  const date = new Date(Number(value))
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const loadTemplates = async () => {
  loading.value = true
  try {
    const res = await emailReachApi.getTemplates()
    if (res.code === 0) {
      templates.value = res.data.items || []
    }
  } finally {
    loading.value = false
  }
}

const ensureDefaultTemplates = async () => {
  const res = await emailReachApi.getTemplates()
  if (res.code !== 0) return
  const currentItems = res.data.items || []
  if (currentItems.length > 0) {
    templates.value = currentItems
    return
  }
  if (access.value.default_template_initialized_at) {
    templates.value = []
    return
  }

  const bootstrapRes = await emailReachApi.bootstrapTemplates()
  if (bootstrapRes.code === 0) {
    access.value = {
      ...access.value,
      default_template_initialized_at: Date.now()
    }
    const reloadRes = await emailReachApi.getTemplates()
    if (reloadRes.code === 0) {
      templates.value = reloadRes.data.items || []
    }
  }
}

const openCreateModal = () => {
  router.push('/user/email-reach/templates/create')
}

const handleAgreementAccept = async () => {
  agreeSubmitting.value = true
  try {
    const res = await emailReachApi.acceptAccessAgreement()
    if (res.code === 0) {
      access.value = {
        ...access.value,
        agreement_accepted: true,
        agreement_accepted_at: res.data.agreement_accepted_at,
        agreement_version: res.data.agreement_version || ''
      }
      protocolVisible.value = false
      await ensureDefaultTemplates()
    }
  } finally {
    agreeSubmitting.value = false
  }
}

const handleAgreementDecline = () => {
  protocolVisible.value = false
  router.push('/user/automation/triggers')
}

const openEditModal = (item) => {
  router.push(`/user/email-reach/templates/${item.template_id}/edit`)
}

const openDeleteDialog = (item) => {
  deletingTemplate.value = item
  showDeleteConfirm.value = true
}

const closeDeleteDialog = () => {
  showDeleteConfirm.value = false
  deletingTemplate.value = null
}

const confirmDelete = async () => {
  if (!deletingTemplate.value) return
  deleting.value = true
  try {
    const res = await emailReachApi.deleteTemplate(deletingTemplate.value.id)
    if (res.code === 0) {
      showMessage('模板已删除', 'success')
      closeDeleteDialog()
      await loadTemplates()
    }
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  const accessRes = await emailReachApi.getAccessSummary()
  accessLoaded.value = true
  if (accessRes.code === 0) {
    access.value = accessRes.data
  } else {
    showMessage(accessRes.message || '加载权限失败', 'error')
  }
  if (canOperate.value) {
    if (access.value.agreement_accepted) {
      await ensureDefaultTemplates()
    } else {
      protocolVisible.value = true
    }
  }
})
</script>
