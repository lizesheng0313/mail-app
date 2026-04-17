<template>
  <BaseModal
    v-model="localVisible"
    :title="modalTitle"
    size="xl"
    :confirm-text="customGenerateLoading ? t('home.customGenerating') : t('home.customGenerateConfirm')"
    :confirm-loading="customGenerateLoading"
    :confirm-disabled="!canSubmitCustomGenerate"
    @confirm="handleCustomGenerate"
  >
    <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_420px]">
      <section class="min-w-0 rounded-2xl border border-gray-200 bg-white">
        <div class="border-b border-gray-100 px-5 py-4">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <p class="text-lg font-semibold text-gray-900">{{ t('home.customGenerateDomainLabel') }}</p>
              <p class="mt-1 text-sm text-gray-500">{{ domainHintText }}</p>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <span class="rounded-full bg-primary-50 px-3 py-1 font-medium text-primary-700">
                {{ t('home.selectedDomainsCount', { count: customGenerateForm.domain_ids.length }) }}
              </span>
              <button
                type="button"
                class="font-medium text-primary-600 hover:text-primary-700"
                @click="selectAllCustomDomains"
              >
                {{ t('home.selectAllDomains') }}
              </button>
              <button
                type="button"
                class="font-medium text-gray-500 hover:text-gray-700"
                @click="clearCustomDomains"
              >
                {{ t('home.clearSelectedDomains') }}
              </button>
            </div>
          </div>

          <div class="mt-4">
            <input
              v-model.trim="domainSearchKeyword"
              type="text"
              :placeholder="t('home.searchDomainsPlaceholder')"
              class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>

        <div class="px-4 py-4">
          <div
            v-if="domainLoading"
            class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-500"
          >
            {{ t('common.loading') }}
          </div>
          <div
            v-else-if="!filteredDomainOptions.length"
            class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-500"
          >
            {{ emptyDomainText }}
          </div>
          <div
            v-else
            class="max-h-[560px] space-y-2 overflow-y-auto pr-1"
          >
            <button
              v-for="domain in filteredDomainOptions"
              :key="domain.id"
              type="button"
              @click="toggleCustomDomainSelection(domain.id)"
              :class="[
                'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                customGenerateForm.domain_ids.includes(domain.id)
                  ? 'border-primary-500 bg-primary-50/60'
                  : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50'
              ]"
            >
              <div class="min-w-0 pr-4">
                <div class="flex items-center gap-2">
                  <p class="truncate text-base font-medium text-gray-900">{{ domain.domain_name }}</p>
                  <span
                    v-if="domain.is_public_domain"
                    class="inline-flex flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                  >
                    {{ t('domainsPage.publicDomainBadge') }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-gray-500">
                  {{ t('home.domainMailboxCount', { count: domain.mailbox_count || 0 }) }}
                </p>
              </div>
              <span
                :class="[
                  'inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs',
                  customGenerateForm.domain_ids.includes(domain.id)
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-gray-300 text-transparent'
                ]"
              >
                ✓
              </span>
            </button>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-4">
          <div class="grid grid-cols-1 gap-4">
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-gray-900">
                {{ t('home.customGenerateQuantityLabel') }}
              </span>
              <input
                v-model.number="customGenerateForm.quantity"
                type="number"
                min="1"
                max="200"
                class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <label class="block">
              <span class="mb-2 block text-sm font-medium text-gray-900">
                {{ t('home.customGenerateStrategyLabel') }}
              </span>
              <CustomSelect
                v-model="customGenerateForm.domain_strategy"
                :options="domainStrategyOptions"
              />
            </label>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-4">
          <div class="mb-3">
            <p class="text-sm font-medium text-gray-900">{{ t('home.customGenerateRuleLabel') }}</p>
            <p class="mt-1 text-xs text-gray-500">{{ t('home.customGenerateRuleHint') }}</p>
          </div>

          <div class="grid grid-cols-1 gap-2">
            <button
              type="button"
              @click="customGenerateForm.generation_mode = 'random'"
              :class="
                customGenerateForm.generation_mode === 'random'
                  ? customRuleButtonActiveClass
                  : customRuleButtonClass
              "
            >
              {{ t('home.ruleRandom') }}
            </button>
            <button
              type="button"
              @click="customGenerateForm.generation_mode = 'custom'"
              :class="
                customGenerateForm.generation_mode === 'custom'
                  ? customRuleButtonActiveClass
                  : customRuleButtonClass
              "
            >
              {{ t('home.ruleCustom') }}
            </button>
            <button
              type="button"
              @click="customGenerateForm.generation_mode = 'sequence'"
              :class="
                customGenerateForm.generation_mode === 'sequence'
                  ? customRuleButtonActiveClass
                  : customRuleButtonClass
              "
            >
              {{ t('home.ruleSequence') }}
            </button>
          </div>

          <div class="mt-4 space-y-4">
            <label
              v-if="customGenerateForm.generation_mode !== 'random'"
              class="block"
            >
              <span class="mb-2 block text-sm font-medium text-gray-900">
                {{ t('home.customGeneratePrefixLabel') }}
              </span>
              <input
                v-model.trim="customGenerateForm.custom_prefix"
                type="text"
                maxlength="32"
                class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                :placeholder="t('home.customGeneratePrefixPlaceholder')"
              />
            </label>

            <label
              v-if="customGenerateForm.generation_mode !== 'sequence'"
              class="block"
            >
              <span class="mb-2 block text-sm font-medium text-gray-900">
                {{ t('home.customGenerateRandomLengthLabel') }}
              </span>
              <input
                v-model.number="customGenerateForm.random_length"
                type="number"
                max="24"
                class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <div
              v-if="customGenerateForm.generation_mode === 'sequence'"
              class="grid grid-cols-1 gap-3"
            >
              <label class="block">
                <span class="mb-2 block text-sm font-medium text-gray-900">
                  {{ t('home.customGenerateSequencePaddingLabel') }}
                </span>
                <input
                  v-model.number="customGenerateForm.sequence_padding"
                  type="number"
                  min="1"
                  max="8"
                  class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </label>

              <label class="block">
                <span class="mb-2 block text-sm font-medium text-gray-900">
                  {{ t('home.customGenerateSequenceStartLabel') }}
                </span>
                <input
                  v-model.number="customGenerateForm.sequence_start"
                  type="number"
                  min="1"
                  class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </label>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-4">
          <div
            v-if="isSystemMailbox"
            class="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600"
          >
            {{ t('home.customGenerateUnitPriceValue') }}
          </div>

          <div :class="isSystemMailbox ? 'mt-4' : ''" class="rounded-xl bg-gray-50 px-4 py-3">
            <p class="text-xs text-gray-500">{{ t('home.customGeneratePreviewLabel') }}</p>
            <p class="mt-1 break-all text-sm font-medium text-gray-900">{{ customGeneratePreviewText }}</p>
          </div>

          <div
            v-if="isSystemMailbox && !customGenerateHasEnoughBalance"
            class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
          >
            <p class="text-sm text-amber-700">
              {{ t('home.customGenerateRechargeHint', { balance: customGenerateBalanceDisplay }) }}
            </p>
            <button
              type="button"
              class="mt-3 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              @click="goRecharge"
            >
              {{ t('home.goRecharge') }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </BaseModal>

  <ConfirmDialog
    :visible="confirmDialog.visible"
    :title="confirmDialog.title"
    :message="confirmDialog.message"
    :confirm-text="confirmDialog.confirmText"
    :cancel-text="confirmDialog.cancelText"
    :type="confirmDialog.type"
    :show-warning="false"
    @confirm="handleConfirmDialogConfirm"
    @cancel="closeConfirmDialog"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { mailboxAPI } from '@/api/mailbox'
import { hostedDomainAPI } from '@/api/hostedDomain'
import { getBalance } from '@/api/milkCoin'
import { showMessage } from '@/utils/message'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  mailboxType: {
    type: String,
    default: 'system'
  }
})

const emit = defineEmits(['update:visible', 'success'])
const { t } = useI18n()
const router = useRouter()

const localVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const isHostedMailbox = computed(() => String(props.mailboxType || '').toLowerCase() === 'hosted')
const isSystemMailbox = computed(() => !isHostedMailbox.value)

const modalTitle = computed(() =>
  isHostedMailbox.value ? t('home.customGenerateHostedTitle') : t('home.customGenerateTitle')
)

const domainHintText = computed(() =>
  isHostedMailbox.value
    ? t('home.customGenerateHostedDomainHint')
    : t('home.customGenerateDomainHint')
)

const emptyDomainText = computed(() =>
  isHostedMailbox.value ? t('home.customGenerateNoHostedDomains') : t('home.customGenerateNoDomains')
)

const customRuleButtonClass =
  'rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:border-primary-300 hover:text-primary-700 transition-colors'
const customRuleButtonActiveClass =
  'rounded-xl border border-primary-500 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700 shadow-sm transition-colors'

const customGenerateLoading = ref(false)
const domainLoading = ref(false)
const domainOptions = ref<any[]>([])
const customGenerateBalance = ref(0)
const domainSearchKeyword = ref('')
const customGenerateForm = ref({
  domain_ids: [] as string[],
  quantity: 10,
  generation_mode: 'random',
  custom_prefix: '',
  random_length: 8,
  sequence_padding: 3,
  sequence_start: 1,
  domain_strategy: 'round_robin'
})
const confirmDialog = ref({
  visible: false,
  title: '',
  message: '',
  confirmText: '',
  cancelText: '',
  type: 'info',
  action: '' as 'generate' | 'recharge' | ''
})

const createDefaultCustomGenerateForm = () => ({
  domain_ids: [] as string[],
  quantity: 10,
  generation_mode: 'random',
  custom_prefix: '',
  random_length: 8,
  sequence_padding: 3,
  sequence_start: 1,
  domain_strategy: 'round_robin'
})

const normalizedCustomGenerateQuantity = computed(() =>
  Math.max(1, Number(customGenerateForm.value.quantity || 0) || 1)
)

const customGenerateTotalCost = computed(() =>
  Number((normalizedCustomGenerateQuantity.value * 0.01).toFixed(2))
)

const customGenerateBalanceDisplay = computed(() =>
  Number(customGenerateBalance.value || 0).toFixed(2)
)

const customGenerateTotalCostDisplay = computed(() => customGenerateTotalCost.value.toFixed(2))

const customGenerateHasEnoughBalance = computed(
  () => Number(customGenerateBalance.value || 0) >= customGenerateTotalCost.value
)

const resolvedRandomLength = computed(() => {
  const value = Number(customGenerateForm.value.random_length)
  if (!Number.isFinite(value)) return 1
  if (value > 24) return 24
  if (value <= 0) return 1
  return Math.floor(value)
})

const resolvedSequencePadding = computed(() => {
  const value = Number(customGenerateForm.value.sequence_padding)
  if (!Number.isFinite(value)) return 3
  return Math.max(1, Math.min(8, Math.floor(value)))
})

const resolvedSequenceStart = computed(() => {
  const value = Number(customGenerateForm.value.sequence_start)
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.floor(value))
})

const getDomainSuffix = (domainName: string) => {
  const normalizedName = String(domainName || '').trim().toLowerCase()
  if (!normalizedName) return ''
  const parts = normalizedName.split('.').filter(Boolean)
  return parts.length ? parts[parts.length - 1] : normalizedName
}

const sortDomainsBySuffix = (domains: any[]) =>
  [...domains].sort((left, right) => {
    const leftName = String(left?.domain_name || '').toLowerCase()
    const rightName = String(right?.domain_name || '').toLowerCase()
    const suffixCompare = getDomainSuffix(leftName).localeCompare(getDomainSuffix(rightName))
    if (suffixCompare !== 0) return suffixCompare
    return leftName.localeCompare(rightName)
  })

const domainStrategyOptions = computed(() => [
  {
    label: t('home.domainStrategyRoundRobin'),
    value: 'round_robin'
  },
  {
    label: t('home.domainStrategyRandom'),
    value: 'random'
  }
])

const customGeneratePreviewDomain = computed(() => {
  const selectedId = customGenerateForm.value.domain_ids[0]
  const matchedDomain = domainOptions.value.find((item) => String(item.id) === String(selectedId))
  return matchedDomain?.domain_name || 'domain.com'
})

const customGeneratePreviewText = computed(() => {
  const previewDomain = customGeneratePreviewDomain.value
  const prefix = String(customGenerateForm.value.custom_prefix || '').trim().toLowerCase()

  if (customGenerateForm.value.generation_mode === 'sequence') {
    return `${prefix}${String(resolvedSequenceStart.value).padStart(resolvedSequencePadding.value, '0')}@${previewDomain}`
  }

  if (customGenerateForm.value.generation_mode === 'custom') {
    return `${prefix}${'x'.repeat(resolvedRandomLength.value)}@${previewDomain}`
  }

  return `${'x'.repeat(resolvedRandomLength.value)}@${previewDomain}`
})

const filteredDomainOptions = computed(() => {
  const keyword = String(domainSearchKeyword.value || '').trim().toLowerCase()
  if (!keyword) return domainOptions.value
  return domainOptions.value.filter((item) =>
    String(item.domain_name || '').toLowerCase().includes(keyword)
  )
})

const canSubmitCustomGenerate = computed(() => {
  if (customGenerateLoading.value || domainLoading.value) return false
  if (!customGenerateForm.value.domain_ids.length) return false
  if (
    customGenerateForm.value.generation_mode !== 'random' &&
    !String(customGenerateForm.value.custom_prefix || '').trim()
  ) {
    return false
  }
  return true
})

const syncCustomGenerateDomainSelection = () => {
  const availableIds = new Set(domainOptions.value.map((item) => String(item.id)))
  const nextIds = customGenerateForm.value.domain_ids.filter((item) => availableIds.has(String(item)))
  customGenerateForm.value.domain_ids = nextIds
}

const normalizeHostedDomainRows = (items: any[] = []) =>
  items
    .filter((item: any) => {
      const isVerified = String(item?.verification_status || '').toLowerCase() === 'verified'
      const isActive = Boolean(item?.is_active)
      const isDeleted = Boolean(item?.is_deleted)
      const expiresAt = Number(item?.expires_at || 0)
      const isExpired = expiresAt > 0 && expiresAt < Date.now()
      return isVerified && isActive && !isDeleted && !isExpired
    })
    .map((item: any) => ({
      id: String(item.id),
      raw_id: Number(item.id),
      domain_name: item.domain_name,
      mailbox_count: Number(item.mailbox_count || 0),
      is_public_domain: Boolean(item.is_public)
    }))

const loadCustomGenerateResources = async () => {
  domainLoading.value = true
  try {
    if (isHostedMailbox.value) {
      const domainsRes: any = await hostedDomainAPI.listDomains()
      if (domainsRes.code === 0 && domainsRes.data) {
        domainOptions.value = sortDomainsBySuffix(
          normalizeHostedDomainRows(domainsRes.data.items || [])
        )
        syncCustomGenerateDomainSelection()
      }
      customGenerateBalance.value = 0
      return
    }

    const [domainsRes, balanceRes] = await Promise.all([
      mailboxAPI.getSystemDomains(),
      getBalance()
    ])

    if (domainsRes.code === 0 && domainsRes.data) {
      domainOptions.value = sortDomainsBySuffix(domainsRes.data.items || [])
      syncCustomGenerateDomainSelection()
    }

    if (balanceRes.code === 0 && balanceRes.data) {
      customGenerateBalance.value = Number(balanceRes.data.balance || 0)
    }
  } catch (error) {
    console.error('加载指定生成配置失败:', error)
  } finally {
    domainLoading.value = false
  }
}

const toggleCustomDomainSelection = (domainId: string) => {
  const normalizedId = String(domainId || '').trim()
  if (!normalizedId) return

  const exists = customGenerateForm.value.domain_ids.includes(normalizedId)
  customGenerateForm.value.domain_ids = exists
    ? customGenerateForm.value.domain_ids.filter((item) => item !== normalizedId)
    : [...customGenerateForm.value.domain_ids, normalizedId]
}

const selectAllCustomDomains = () => {
  customGenerateForm.value.domain_ids = filteredDomainOptions.value.map((item) => String(item.id))
}

const clearCustomDomains = () => {
  customGenerateForm.value.domain_ids = []
}

const createRandomSuffix = (length: number) => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const safeLength = Math.max(1, Math.min(24, Math.floor(Number(length) || 1)))
  let result = ''
  for (let index = 0; index < safeLength; index += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return result
}

const pickDomainOption = (items: any[], index: number) => {
  if (!items.length) return null
  if (customGenerateForm.value.domain_strategy === 'random') {
    return items[Math.floor(Math.random() * items.length)] || null
  }
  return items[index % items.length] || null
}

const buildHostedLocalPart = (index: number) => {
  const prefix = String(customGenerateForm.value.custom_prefix || '').trim().toLowerCase()
  if (customGenerateForm.value.generation_mode === 'sequence') {
    const sequenceNumber = resolvedSequenceStart.value + index
    return `${prefix}${String(sequenceNumber).padStart(resolvedSequencePadding.value, '0')}`
  }
  if (customGenerateForm.value.generation_mode === 'custom') {
    const randomSuffix = createRandomSuffix(resolvedRandomLength.value)
    return `${prefix}${randomSuffix}`
  }
  return ''
}

const performHostedCustomGenerate = async () => {
  const selectedDomains = domainOptions.value.filter((item) =>
    customGenerateForm.value.domain_ids.includes(String(item.id))
  )
  if (!selectedDomains.length) {
    throw new Error(emptyDomainText.value)
  }

  const createdItems: any[] = []
  for (let index = 0; index < normalizedCustomGenerateQuantity.value; index += 1) {
    const selectedDomain = pickDomainOption(selectedDomains, index)
    if (!selectedDomain?.raw_id) {
      throw new Error(emptyDomainText.value)
    }

    const payload: Record<string, any> = {
      route_mode: 'direct',
      is_public: false
    }

    if (customGenerateForm.value.generation_mode === 'random') {
      payload.auto_local_part = true
    } else {
      payload.local_part = buildHostedLocalPart(index)
    }

    const result: any = await hostedDomainAPI.createMailbox(selectedDomain.raw_id, payload)
    if (result.code !== 0) {
      throw new Error(result.message || t('home.customGenerateFailed'))
    }
    createdItems.push(result.data)
  }

  return {
    items: createdItems,
    quantity: createdItems.length,
    cost: 0
  }
}

const performSystemCustomGenerate = async () => {
  const payload: Record<string, any> = {
    domain_ids: customGenerateForm.value.domain_ids,
    quantity: normalizedCustomGenerateQuantity.value,
    generation_mode:
      customGenerateForm.value.generation_mode === 'sequence'
        ? 'prefix_sequence'
        : customGenerateForm.value.generation_mode === 'custom'
          ? 'prefix_random'
          : 'random',
    random_length: resolvedRandomLength.value,
    sequence_padding: resolvedSequencePadding.value,
    sequence_start: resolvedSequenceStart.value,
    domain_strategy: customGenerateForm.value.domain_strategy
  }

  if (customGenerateForm.value.generation_mode !== 'random') {
    payload.custom_prefix = String(customGenerateForm.value.custom_prefix || '').trim()
  }

  const result: any = await mailboxAPI.customGenerateSystemMailboxes(payload)
  if (result.code !== 0) {
    throw new Error(result.message || t('home.customGenerateFailed'))
  }
  return result.data
}

const performCustomGenerate = async () => {
  customGenerateLoading.value = true
  try {
    const data = isHostedMailbox.value
      ? await performHostedCustomGenerate()
      : await performSystemCustomGenerate()

    localVisible.value = false
    const successCount = Number(data?.quantity || data?.items?.length || 0)

    if (isHostedMailbox.value) {
      showMessage(t('home.customGenerateSuccessHosted', { count: successCount }), 'success')
    } else {
      const cost = Number(data?.cost || 0).toFixed(2)
      showMessage(t('home.customGenerateSuccess', { count: successCount, cost }), 'success')
    }
    emit('success', data)
  } catch (error: any) {
    showMessage(
      error?.response?.data?.message || error?.message || t('home.customGenerateFailed'),
      'error'
    )
  } finally {
    customGenerateLoading.value = false
  }
}

const closeConfirmDialog = () => {
  confirmDialog.value.visible = false
}

const resetCustomGenerateState = () => {
  domainSearchKeyword.value = ''
  customGenerateForm.value = createDefaultCustomGenerateForm()
  closeConfirmDialog()
}

const goRecharge = () => {
  closeConfirmDialog()
  localVisible.value = false
  router.push('/user/finance#recharge')
}

const handleConfirmDialogConfirm = async () => {
  const action = confirmDialog.value.action
  closeConfirmDialog()
  if (action === 'recharge') {
    goRecharge()
    return
  }
  if (action === 'generate') {
    await performCustomGenerate()
  }
}

const handleCustomGenerate = async () => {
  if (!canSubmitCustomGenerate.value) return

  if (isSystemMailbox.value && !customGenerateHasEnoughBalance.value) {
    confirmDialog.value = {
      visible: true,
      title: t('home.customGenerateInsufficientTitle'),
      message: t('home.customGenerateInsufficientConfirm', {
        cost: customGenerateTotalCostDisplay.value,
        balance: customGenerateBalanceDisplay.value
      }),
      confirmText: t('home.goRecharge'),
      cancelText: t('common.cancel'),
      type: 'warning',
      action: 'recharge'
    }
    return
  }

  confirmDialog.value = {
    visible: true,
    title: t('home.customGenerateConfirmTitle'),
    message: isHostedMailbox.value
      ? t('home.customGenerateConfirmMessageHosted', {
          quantity: normalizedCustomGenerateQuantity.value
        })
      : t('home.customGenerateConfirmMessage', {
          quantity: normalizedCustomGenerateQuantity.value,
          cost: customGenerateTotalCostDisplay.value
        }),
    confirmText: t('home.customGenerateConfirm'),
    cancelText: t('common.cancel'),
    type: 'info',
    action: 'generate'
  }
}

watch(
  () => localVisible.value,
  async (visible) => {
    if (!visible) {
      resetCustomGenerateState()
      return
    }
    resetCustomGenerateState()
    await loadCustomGenerateResources()
    if (domainOptions.value.length === 1) {
      customGenerateForm.value.domain_ids = [String(domainOptions.value[0].id)]
    }
    if (!domainOptions.value.length) {
      showMessage(emptyDomainText.value, 'warning')
    }
  }
)
</script>
