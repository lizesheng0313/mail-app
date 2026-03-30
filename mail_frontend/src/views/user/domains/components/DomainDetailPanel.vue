<template>
  <div class="space-y-6">
    <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="text-xs text-gray-500">当前域名</div>
          <div class="truncate text-sm font-medium text-black">{{ detail.domain.domain_name }}</div>
        </div>
        <span
          :class="getDomainStatusClass(detail.domain.verification_status)"
          class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
        >
          {{ getDomainStatusLabel(detail.domain.verification_status) }}
        </span>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <h3 class="text-sm font-semibold text-black mb-3">DNS 配置</h3>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="pb-3 pr-4 font-medium">主机记录</th>
              <th class="pb-3 pr-4 font-medium">记录类型</th>
              <th class="pb-3 pr-4 font-medium">值</th>
              <th class="pb-3 pr-4 font-medium">优先级</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="record in detail.dns_instructions || []" :key="getRecordKey(record)">
              <td class="py-3 pr-4 align-top">
                <div class="flex items-center gap-2">
                  <div class="max-w-[240px] break-all text-gray-700">{{ formatRecordHost(record) }}</div>
                  <ActionButton
                    icon="copy"
                    title="复制主机记录"
                    @click="emit('copy', formatRecordHost(record))"
                    tooltip="复制主机记录"
                    variant="copy"
                    size="sm"
                  />
                </div>
              </td>
              <td class="py-3 pr-4 align-top">
                <div class="flex items-center gap-2">
                  <span class="text-black">{{ record.record_type }}</span>
                  <button
                    type="button"
                    :class="getRecordResultClass(record)"
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  >
                    {{ getRecordResultLabel(record) }}
                  </button>
                  <HoverTooltip v-if="hasRecordDetail(record)" :text="getRecordResultTooltip(record)">
                    <span
                      class="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600"
                    >
                      !
                    </span>
                  </HoverTooltip>
                </div>
              </td>
              <td class="py-3 pr-4 align-top">
                <div class="flex items-center gap-2">
                  <div class="max-w-[420px] break-all text-gray-700">{{ record.record_value }}</div>
                  <ActionButton
                    icon="copy"
                    title="复制记录值"
                    @click="emit('copy', record.record_value)"
                    tooltip="复制记录值"
                    variant="copy"
                    size="sm"
                  />
                </div>
              </td>
              <td class="py-3 pr-4 align-top text-gray-700">
                {{ record.priority ?? '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <div class="text-sm font-medium text-black">未匹配邮箱代收</div>
          <p class="mt-1 text-xs leading-5 text-gray-500">
            开启后，验证通过才会启用 <span class="font-mono text-gray-700">{{ getCatchAllMailbox(detail.domain.domain_name) }}</span> 代收；未验证前不会代收。
          </p>
          <p class="mt-1 text-xs leading-5 text-gray-500">
            多级域名也支持，如 <span class="font-mono text-gray-700">{{ getCatchAllSubdomainExample(detail.domain.domain_name, 'www') }}</span>、<span class="font-mono text-gray-700">{{ getCatchAllSubdomainExample(detail.domain.domain_name, 'bbb.ccc') }}</span>。
          </p>
          <p v-if="detail.domain.catch_all_enabled && isVerified" class="mt-1 text-xs text-gray-600">
            当前代收邮箱：{{ detail.domain.catch_all_mailbox_email || getCatchAllMailbox(detail.domain.domain_name) }}
          </p>
        </div>
        <button
          type="button"
          class="relative mt-0.5 inline-block h-6 w-11 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="catchAllUpdating"
          @click="emit('update:catch-all-enabled', !detail.domain.catch_all_enabled)"
        >
          <div
            class="block h-6 w-11 rounded-full transition-colors duration-200 ease-in-out"
            :class="detail.domain.catch_all_enabled ? 'bg-primary-600' : 'bg-gray-300'"
          >
            <div
              class="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
              :class="{ 'translate-x-5': detail.domain.catch_all_enabled }"
            ></div>
          </div>
        </button>
      </div>
    </div>

    <div v-if="!isVerified" class="flex justify-end">
      <button
        class="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm disabled:opacity-50"
        :disabled="refreshing"
        @click="emit('refresh', Number(detail.domain.id))"
      >
        <span v-if="refreshing" class="inline-flex items-center gap-2">
          验证中
          <BaseIcon name="refresh" size="sm" class="animate-spin" />
        </span>
        <span v-else>立即验证DNS</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseIcon from '@/components/BaseIcon/index.vue'
import HoverTooltip from '@/components/HoverTooltip/index.vue'

const props = defineProps<{
  detail: any
  refreshing: boolean
  catchAllUpdating: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh', domainId: number): void
  (e: 'copy', value: string): void
  (e: 'update:catch-all-enabled', value: boolean): void
}>()

const isVerified = computed(() => String(props.detail?.domain?.verification_status || '').toLowerCase() === 'verified')

const formatRecordHost = (record: any) => {
  const value = String(record?.record_host || '').trim()
  return value || '@'
}

const getRecordKey = (record: any) => [
  record?.record_type || '',
  record?.record_host || '',
  record?.record_name || '',
  record?.record_value || '',
  record?.priority ?? ''
].join('|')

const getDomainStatusLabel = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'verified') return '已验证'
  if (normalized === 'failed') return '验证失败'
  return '待验证'
}

const getDomainStatusClass = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'verified') return 'bg-green-100 text-green-700'
  if (normalized === 'failed') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}

const getRecordResultLabel = (record: any) => {
  const status = String(record?.status || '').toLowerCase()
  if (status === 'valid' || status === 'verified') return '已匹配'
  const message = String(record?.check_message || record?.fail_reason || '').trim()
  if (message.includes('未查询到记录')) return '未找到'
  if (message.includes('不匹配')) return '值不匹配'
  if (status === 'invalid' || message) return '未通过'
  return '待验证'
}

const getRecordResultTooltip = (record: any) => {
  const status = String(record?.status || '').toLowerCase()
  if (status === 'invalid' || record?.check_message || record?.fail_reason) {
    return record?.check_message || record?.fail_reason || '记录未匹配'
  }
  return '等待验证'
}

const hasRecordDetail = (record: any) => {
  const status = String(record?.status || '').toLowerCase()
  if (status === 'valid' || status === 'verified') return false
  return status === 'invalid' || Boolean(record?.check_message || record?.fail_reason)
}

const getRecordResultClass = (record: any) => {
  const status = String(record?.status || '').toLowerCase()
  if (status === 'valid' || status === 'verified') return 'bg-green-100 text-green-700'
  if (status === 'invalid' || record?.check_message || record?.fail_reason) return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}

const normalizeCatchAllDomain = (domainName?: string) => String(domainName || '').trim() || '你的域名'
const getCatchAllMailbox = (domainName?: string) => `admin@${normalizeCatchAllDomain(domainName)}`
const getCatchAllSubdomainExample = (domainName?: string, subdomain = 'www') => `xxxx@${subdomain}.${normalizeCatchAllDomain(domainName)}`
</script>
