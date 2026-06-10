<template>
  <div class="space-y-6">
    <AccessPendingAlert v-if="accessLoaded && !canOperate" :reason="access.reason" />

    <div v-if="canOperate" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
            class="h-10 rounded-xl bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700"
            @click="applyFilters"
          >
            查询
          </button>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            @click="protocolVisible = true"
          >
            使用协议
          </button>
          <button
            type="button"
            class="h-10 rounded-xl bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">主题</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">更新时间</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">操作</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!filteredTemplates.length && !loading">
          <td colspan="5" :class="TABLE_EMPTY_CELL_CLASS">暂无模板</td>
        </tr>
        <tr v-for="item in filteredTemplates" :key="item.template_id || item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-black">{{ item.template_id || '-' }}</td>
          <td class="px-6 py-4 text-sm font-medium text-black">{{ item.name || '未命名模板' }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ item.subject || '-' }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ formatDateTime(item.updated_at) }}</td>
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
          <div class="text-base font-semibold text-black">第一章 总则</div>
          <div class="mt-2">1. 本协议适用于肥猫猫平台邮件触达服务的开通、模板保存、任务创建、邮件发送、退订处理、投诉处理、风控审核及相关管理行为。</div>
          <div>2. 你开通或使用本服务，即表示你已完整阅读、理解并接受本协议全部内容，并承诺严格遵守适用法律法规、行业规范及平台规则。</div>
          <div>3. 本服务属于高风险通信能力，平台有权基于合规、通道信誉、投诉风险和业务安全需要，对相关功能进行审核、限制、暂停或终止。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">第二章 定义与适用范围</div>
          <div class="mt-2">1. “许可发送”是指你向自有注册用户、订阅用户、已建立真实业务关系的客户，或其他已获得明确授权的收件人发送邮件。</div>
          <div>2. “营销邮件”是指包含推广、促销、优惠、活动、召回、商品推荐、品牌宣传或其他商业广告属性的邮件。</div>
          <div>3. “垃圾邮件”包括但不限于：未经许可向陌生人发送邮件、使用非授权名单群发、骚扰式触达、诱导式广告、虚假宣传、绕过退订继续发送等行为。</div>
          <div>4. 营销、推广、优惠、活动类内容必须建立在收件人已授权、已订阅或已有业务关系的前提下；未经许可向陌生人发送邮件，一律视为垃圾邮件。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">第三章 服务内容</div>
          <div class="mt-2">1. 平台可向你提供邮件模板编辑、模板审核、会员管理、任务创建、定时发送、退订管理、投诉拦截、风险识别、发信配置、额度管理及其他与邮件触达相关的功能。</div>
          <div>2. 平台有权根据实际运营情况、第三方通道政策、法律法规要求及风控需要，对服务功能、使用方式、配额规则、审核标准、发送限制及可用范围进行调整。</div>
          <div>3. 平台提供的是技术服务能力，不对你的发送内容、业务模式、收件人来源、营销效果、到达率、打开率、点击率或商业收益作任何承诺。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">第四章 开通条件与审核</div>
          <div class="mt-2">1. 平台有权根据账号信息、历史行为、业务场景、发信内容、名单来源、投诉风险、通道政策及其他因素，决定是否向你开通本服务。</div>
          <div>2. 平台有权要求你补充身份信息、业务说明、网站链接、品牌信息、收件人授权证明、样例模板、名单来源说明及其他必要材料。</div>
          <div>3. 即使已开通本服务，也不代表平台将持续无条件提供服务；后续如出现风险或违反本协议，平台仍有权限制、暂停或终止服务。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">第五章 收件地址来源与授权义务</div>
          <div class="mt-2">1. 你必须确保收件地址来源真实、合法、可追溯、可审计，并能证明收件人已明确同意接收相关邮件，或与你存在真实、合理、持续的业务联系。</div>
          <div>2. 严禁购买、租用、交换、抓取、撞库、爬取、拼接、推测或以其他非授权方式获取邮箱地址。</div>
          <div>3. 严禁使用来路不明名单、公开采集名单、社群导出名单、招聘平台名单、爬虫名单或任何未经收件人明确许可的地址池。</div>
          <div>4. 你必须保存并在平台要求时提供名单来源、订阅记录、授权页面、授权时间、操作日志、业务关系证明、来源页面或其他能够证明合法授权的材料。</div>
          <div>5. 如你不能证明收件人授权来源合法，平台有权直接按垃圾邮件风险处理，无需以收件人是否实际投诉为前提。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">第六章 邮件内容与发送规范</div>
          <div class="mt-2">1. 允许发送的内容应当与真实业务有关，包括但不限于订单通知、发货提醒、售后通知、会员消息、活动通知、优惠信息及其他合法合规的业务邮件。</div>
          <div>2. 营销邮件、广告邮件应当具有可识别性。平台可根据合规要求自动在标题前添加“广告”或等效标识，并自动附加退订、举报入口。</div>
          <div>3. 退订后不得再次向该收件人发送相同或类似邮件；投诉、退信、无效地址等风险地址，平台可直接纳入限制名单并停止投递。</div>
          <div>4. 你不得通过拆分账号、拆分域名、拆分模板、频繁更换发信身份等方式规避平台风控、投诉控制、退订机制或通道限制。</div>
          <div>5. 你应确保邮件标题、正文、图片、链接、落地页、附件、变量内容及业务描述真实、准确、合法，不得存在欺骗、误导、夸大、伪装或隐瞒真实身份的情况。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">第七章 严格禁止行为</div>
          <div class="mt-2">以下行为一经发现，平台有权立即处理，无需另行通知：</div>
          <ul class="list-disc pl-5">
            <li>未经许可向陌生人群发邮件、开发信、冷启动陌生触达、垃圾广告邮件。</li>
            <li>乱发广告、营销轰炸、频繁骚扰、招聘骚扰、诱导点击、虚假宣传。</li>
            <li>发送钓鱼、欺诈、病毒、木马、假发票、色情、赌博、诈骗、政治敏感、电子烟、烟弹、烟油、悦刻、RELX、一次性电子烟、烟草售卖及其他法律明确禁止传播的内容。</li>
            <li>在邮件中导流微信、QQ、群号、二维码、Telegram、WhatsApp 等站外联系方式，或引导交易绕过平台监管。</li>
            <li>通过多账号、多域名、多模板规避平台风控，或协助他人实施上述行为。</li>
          </ul>
        </section>

        <section>
          <div class="text-base font-semibold text-black">第八章 模板审核、监测与举证配合</div>
          <div class="mt-2">1. 平台有权对模板内容、图片内容、标题、变量、落地链接、发送对象、发送结果、投诉退订、退信情况及通道信誉进行自动或人工审核。</div>
          <div>2. 如模板存在中高风险内容、风险表达、疑似广告伪装、来源不明名单或其他合规疑点，平台有权拒绝保存、拒绝发送、暂停模板使用或要求你整改后重新提交。</div>
          <div>3. 平台有权要求你补充说明模板用途、发送场景、业务关系、授权链路、名单来源及其他必要材料；拒不配合、拖延配合或提供虚假材料的，平台有权直接停用服务。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">第九章 风控措施与服务限制</div>
          <div class="mt-2">出现以下情况，平台有权限制外发、暂停发送、切换通道或直接中止服务：</div>
          <ul class="list-disc pl-5">
            <li>无效地址率、退信率、投诉率、垃圾邮件率异常升高。</li>
            <li>通道信誉明显下降、到达率异常偏低、短时间内集中触发大量拒收。</li>
            <li>发送内容或发送对象存在较高投诉、举报、封禁风险。</li>
            <li>平台综合判断该账号继续发送可能损害平台、发信通道或第三方服务商信誉。</li>
          </ul>
          <div class="mt-2">平台有权单方决定限制策略，包括但不限于：暂停模板、停止任务、限制额度、冻结通道、切换通道、临时停发、长期停发、永久停用及关联账号排查。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">第十章 费用、额度、资源与冻结</div>
          <div class="mt-2">1. 平台有权对邮件触达服务设置发件额度、购买规则、资源消耗规则、试用上限、增值包、赠送额度及其他运营规则。</div>
          <div>2. 已发放、已购买、已赠送或已消耗的资源是否可退、可补、可转移，以平台当时公布的规则及实际处理结果为准。</div>
          <div>3. 如你存在违规风险、投诉争议、名单来源异常、恶意套利、规避风控或其他异常行为，平台有权冻结你的额度、奶片余额、相关权益及未使用资源，并保留后续处置权。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">第十一章 违规处理、责任承担与追偿</div>
          <div class="mt-2">如平台认定你存在违规发送、垃圾邮件、陌生人触达、购买名单、抓取地址、乱发广告、招聘骚扰或其他高风险行为，平台有权立即采取以下一项或多项措施：</div>
          <ul class="list-disc pl-5">
            <li>立即停用邮件触达账号、暂停模板、停止任务、封禁发信通道。</li>
            <li>限制或终止相关邮箱、相关账户及关联服务的继续使用。</li>
            <li>冻结该账号下全部奶片余额、相关权益及未消耗资源，且不保证恢复。</li>
            <li>向发信通道服务商、投诉方或有关主管机关同步必要信息。</li>
            <li>涉嫌违法犯罪的，平台有权向公安机关或其他有权机关报送线索并配合调查。</li>
          </ul>
          <div class="mt-2">对于“未经许可发给陌生人”的情形，平台将直接认定为垃圾邮件处理，并可直接封号。</div>
          <div>因你的发送行为引发的投诉、索赔、行政处罚、诉讼、仲裁、通道封禁、域名/IP 污染、第三方追责或其他损失，由你自行承担全部责任；如平台因此遭受损失，平台有权向你追偿。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">第十二章 第三方通道与平台免责</div>
          <div class="mt-2">1. 本服务可能依赖第三方发信通道、网络服务、域名服务、云服务或其他第三方资源。第三方的策略变化、封禁、延迟、拒收、中断、调整或终止，均可能影响邮件发送效果。</div>
          <div>2. 因第三方服务商策略、黑名单、投诉机制、域名/IP 信誉、收件方策略或不可抗力导致的拒收、延迟、失败、中断或效果不达预期，平台不承担保证责任。</div>
          <div>3. 平台不对你发送邮件后的送达率、打开率、点击率、转化率、商业结果或客户关系结果作任何明示或默示承诺。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">第十三章 法律适用与争议解决</div>
          <div class="mt-2">1. 本协议的订立、执行、解释及争议解决，均适用中华人民共和国法律法规。</div>
          <div>2. 因本协议或本服务产生的任何争议，双方应优先友好协商；协商不成的，任一方有权提交平台经营主体所在地有管辖权的人民法院处理。</div>
        </section>

        <section>
          <div class="text-base font-semibold text-black">第十四章 附则</div>
          <div class="mt-2">1. 平台有权根据法律法规、监管要求、通道政策、投诉情况和风险结果，随时调整审核标准、限制策略、拦截规则及处理措施。</div>
          <div>2. 本协议自你点击“同意并继续”之时生效，对你后续使用邮件触达服务的全部行为持续有效。</div>
          <div>3. 如你不同意本协议或后续更新内容，请立即停止使用本服务；继续使用即视为接受调整后的规则。</div>
          <div>4. 本协议各章节标题仅为阅读方便设置，不影响条款含义；如本协议部分条款被认定无效或不可执行，不影响其他条款的效力。</div>
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
import AccessPendingAlert from './components/AccessPendingAlert.vue'
import { TABLE_EMPTY_CELL_CLASS, formatDateTime, hasAccessStatus } from './ui'

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

const canOperate = computed(() => hasAccessStatus(access.value.status))
const deleteMessage = computed(() => `确认删除模板《${deletingTemplate.value?.name || '未命名模板'}》吗？`)
const filteredTemplates = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()
  return templates.value.filter((item) => !keyword || String(item.name || '').toLowerCase().includes(keyword))
})

const applyFilters = () => {
  appliedFilters.keyword = filters.keyword
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
