<template>
  <Dialog :open="open" :initial-focus="closeButton" class="relative z-[200]" @close="emit('close')">
    <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
    <div class="fixed inset-0 flex justify-end">
      <DialogPanel class="dns-drawer flex h-[100dvh] w-full max-w-xl flex-col bg-white shadow-xl">
        <header
          class="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6"
        >
          <div class="min-w-0">
            <DialogTitle class="text-base font-semibold text-gray-900">{{
              t('dnsDiagnosis.title')
            }}</DialogTitle>
            <p class="mt-1 break-all text-xs text-gray-500">{{ domainName }}</p>
          </div>
          <button
            ref="closeButton"
            type="button"
            :aria-label="t('common.close')"
            class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
            @click="emit('close')"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-width="1.8" d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
        </header>

        <div
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6"
          :aria-busy="loading"
        >
          <div v-if="loading" role="status" class="space-y-5">
            <div class="rounded-lg border border-primary-100 bg-primary-50 p-4">
              <div class="flex items-center gap-2.5 text-sm font-medium text-primary-800">
                <span
                  class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"
                  aria-hidden="true"
                />
                {{ t('dnsDiagnosis.loading') }}
              </div>
              <p class="mt-2 text-xs leading-5 text-gray-600">
                {{ t('dnsDiagnosis.loadingHint') }}
              </p>
            </div>
            <div
              v-for="record in records"
              :key="dnsRecordKey(record)"
              class="rounded-lg border border-gray-200 p-4"
              aria-hidden="true"
            >
              <div class="flex items-center gap-2 text-sm font-medium text-gray-600">
                <span class="rounded bg-gray-100 px-2 py-0.5 text-xs">{{ record.record_type }}</span
                ><span class="break-all">{{
                  record.configuration_host || record.record_host
                }}</span>
              </div>
              <div class="mt-4 space-y-2 motion-safe:animate-pulse">
                <div class="h-2 w-5/6 rounded bg-gray-100" />
                <div class="h-2 w-2/3 rounded bg-gray-100" />
              </div>
            </div>
          </div>

          <div
            v-else-if="error"
            role="alert"
            class="rounded-lg border border-amber-200 bg-amber-50 p-4"
          >
            <h3 class="text-sm font-medium text-amber-800">{{ t('dnsDiagnosis.failed') }}</h3>
            <p class="mt-2 text-xs leading-5 text-gray-600">{{ t('dnsDiagnosis.failedHint') }}</p>
            <button
              type="button"
              class="mt-4 rounded-md bg-white px-3 py-2 text-sm font-medium text-primary-700 ring-1 ring-gray-200 hover:bg-gray-50"
              @click="emit('retry')"
            >
              {{ t('common.retry') }}
            </button>
          </div>

          <template v-else-if="diagnosis">
            <div role="status" class="mb-5">
              <span
                class="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700"
                >{{
                  t(
                    diagnosis.source === 'rules'
                      ? 'dnsDiagnosis.basicGuide'
                      : 'dnsDiagnosis.complete'
                  )
                }}</span
              >
              <p class="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
                {{ diagnosis.summary }}
              </p>
              <p class="mt-2 text-xs leading-5 text-gray-500">
                {{ t('dnsDiagnosis.chooseRecord') }}
              </p>
            </div>
            <div class="space-y-3">
              <section
                v-for="(record, index) in diagnosis.records"
                :key="dnsRecordKey(record)"
                class="dns-result overflow-hidden rounded-lg border"
                :class="
                  activeKey === dnsRecordKey(record) ? 'border-primary-200' : 'border-gray-200'
                "
                :style="{ animationDelay: `${index * 65}ms` }"
              >
                <h3>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-600"
                    :aria-expanded="activeKey === dnsRecordKey(record)"
                    :aria-controls="`dns-record-${index}`"
                    @click="
                      activeKey = activeKey === dnsRecordKey(record) ? '' : dnsRecordKey(record)
                    "
                  >
                    <span
                      class="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700"
                      >{{ record.record_type }}</span
                    >
                    <span class="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{{
                      record.record_host
                    }}</span>
                    <span
                      class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="dnsStatusClass(record.status)"
                      >{{ t(`dnsDiagnosis.status.${dnsStatusKey(record.status)}`) }}</span
                    >
                    <svg
                      class="h-4 w-4 shrink-0 text-gray-400 transition-transform"
                      :class="{ 'rotate-180': activeKey === dnsRecordKey(record) }"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </h3>
                <div
                  v-if="activeKey === dnsRecordKey(record)"
                  :id="`dns-record-${index}`"
                  class="border-t border-gray-100 px-4 pb-4 pt-3"
                >
                  <p class="whitespace-pre-line text-sm leading-6 text-gray-700">
                    {{ record.explanation }}
                  </p>
                  <p
                    v-if="dnsStatusKey(record.status) === 'missing'"
                    class="mt-2 text-xs leading-5 text-amber-700"
                  >
                    {{ t('dnsDiagnosis.hint.missing') }}
                  </p>
                  <p
                    v-for="found in record.misplaced_records"
                    :key="found.record_name"
                    class="mt-2 break-all text-xs text-red-600"
                  >
                    {{ t('dnsDiagnosis.currentHost') }}：{{ found.record_host }}
                  </p>
                  <div class="mt-4 rounded-md bg-gray-50 p-3">
                    <h4 class="mb-3 text-xs font-medium text-gray-500">
                      {{ t('dnsDiagnosis.requiredConfig') }}
                    </h4>
                    <dl class="space-y-3 text-sm">
                      <div class="flex items-start gap-3">
                        <dt class="w-16 shrink-0 text-xs leading-5 text-gray-500">
                          {{ t('dnsDiagnosis.host') }}
                        </dt>
                        <dd
                          class="min-w-0 flex-1 break-all font-mono text-xs leading-5 text-gray-900"
                        >
                          {{ record.record_host }}
                        </dd>
                        <button
                          type="button"
                          class="shrink-0 text-xs leading-5 text-primary-700 hover:underline"
                          :aria-label="t('dnsDiagnosis.copyHost')"
                          @click="emit('copy', record.record_host)"
                        >
                          {{ t('common.copy') }}
                        </button>
                      </div>
                      <div class="flex items-start gap-3">
                        <dt class="w-16 shrink-0 text-xs leading-5 text-gray-500">
                          {{ t('dnsDiagnosis.value') }}
                        </dt>
                        <dd
                          class="min-w-0 flex-1 break-all font-mono text-xs leading-5 text-gray-900"
                        >
                          {{ record.record_value }}
                        </dd>
                        <button
                          type="button"
                          class="shrink-0 text-xs leading-5 text-primary-700 hover:underline"
                          :aria-label="t('dnsDiagnosis.copyValue')"
                          @click="emit('copy', record.record_value)"
                        >
                          {{ t('common.copy') }}
                        </button>
                      </div>
                      <div v-if="record.priority != null" class="flex items-start gap-3">
                        <dt class="w-16 shrink-0 text-xs leading-5 text-gray-500">
                          {{ t('dnsDiagnosis.priority') }}
                        </dt>
                        <dd class="text-xs leading-5 text-gray-900">{{ record.priority }}</dd>
                      </div>
                    </dl>
                    <p
                      class="mt-3 break-all border-t border-gray-200 pt-3 text-xs leading-5 text-gray-500"
                    >
                      {{ t('dnsDiagnosis.fullName') }}：{{ record.record_name }}
                    </p>
                  </div>
                  <details
                    v-if="record.observation || detectionMessage(record)"
                    class="mt-4 text-xs text-gray-500"
                  >
                    <summary class="cursor-pointer hover:text-gray-700">
                      {{ t('dnsDiagnosis.detectionDetails') }}
                    </summary>
                    <div class="mt-2 space-y-2 break-all leading-5">
                      <p v-if="record.observation?.answers?.length">
                        <span class="font-medium">{{ t('dnsDiagnosis.observedValue') }}：</span
                        >{{ record.observation.answers.join(' · ') }}
                      </p>
                      <p v-if="record.observation?.error">{{ record.observation.error }}</p>
                      <p v-if="detectionMessage(record)">{{ detectionMessage(record) }}</p>
                      <p v-else-if="record.observation?.sources">
                        {{ t('dnsDiagnosis.querySources') }}：{{ record.observation.sources }}
                      </p>
                    </div>
                  </details>
                </div>
              </section>
            </div>
            <p class="mt-5 break-all text-xs leading-5 text-gray-500">
              {{
                diagnosis.dns_zone
                  ? t('dnsDiagnosis.zone', { zone: diagnosis.dns_zone })
                  : t('dnsDiagnosis.zoneUnknown')
              }}
            </p>
          </template>
        </div>

        <footer
          v-if="loading || diagnosis"
          class="shrink-0 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6"
        >
          <p class="text-xs leading-5 text-gray-500">
            {{
              loading
                ? t('dnsDiagnosis.backgroundHint')
                : diagnosis?.next_step || t('dnsDiagnosis.failedHint')
            }}
          </p>
          <div v-if="!loading && diagnosis" class="mt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              class="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-200"
              @click="emit('retry')"
            >
              {{ t('dnsDiagnosis.reanalyze') }}
            </button>
            <button
              type="button"
              class="rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
              @click="emit('verify')"
            >
              {{ t('dnsDiagnosis.verifyAgain') }}
            </button>
          </div>
        </footer>
      </DialogPanel>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { useI18n } from 'vue-i18n'
import { dnsRecordKey, dnsStatusClass, dnsStatusKey } from './dnsStatus'

const props = withDefaults(
  defineProps<{
    open: boolean
    domainName: string
    records: any[]
    diagnosis?: any
    loading?: boolean
    error?: boolean
    selectedRecordKey?: string
  }>(),
  { selectedRecordKey: '' }
)
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'retry'): void
  (e: 'verify'): void
  (e: 'copy', value: string): void
}>()
const { t } = useI18n()
const closeButton = ref<HTMLButtonElement | null>(null)
const activeKey = ref('')
watch(
  () => [props.open, props.selectedRecordKey, props.diagnosis] as const,
  () => {
    if (!props.open) return
    const rows = props.diagnosis?.records || []
    const selected = rows.find((record: any) => dnsRecordKey(record) === props.selectedRecordKey)
    const first =
      selected || rows.find((record: any) => dnsStatusKey(record.status) !== 'valid') || rows[0]
    activeKey.value = first ? dnsRecordKey(first) : ''
  },
  { immediate: true }
)
const detectionMessage = (record: any) => {
  const original = props.records.find((row) => dnsRecordKey(row) === dnsRecordKey(record))
  return original?.check_message || original?.fail_reason || ''
}
</script>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .dns-drawer {
    animation: drawer-in 220ms ease-out;
  }
  .dns-result {
    animation: result-in 180ms ease-out backwards;
  }
}
@keyframes drawer-in {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
@keyframes result-in {
  from {
    opacity: 0;
    transform: translateX(12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
