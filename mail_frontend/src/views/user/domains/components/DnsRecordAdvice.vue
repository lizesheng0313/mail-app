<template>
  <div v-if="actionTitle" class="space-y-1.5">
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <p class="font-medium text-gray-700">{{ actionTitle }}</p>
      <button
        v-if="priority !== null"
        type="button"
        :aria-label="t('dnsDiagnosis.copyPriority')"
        :title="t('dnsDiagnosis.copyPriority')"
        class="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-700"
        @click="emit('copy', priority)"
      >
        {{ t('dnsDiagnosis.priority') }} <code>{{ priority }}</code>
        <svg
          class="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <rect x="8" y="8" width="12" height="13" rx="2" />
          <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" />
        </svg>
      </button>
    </div>
    <div v-for="field in fields" :key="field.key" class="flex min-w-0 items-center gap-1.5">
      <span v-if="field.label" class="min-w-12 shrink-0 whitespace-nowrap text-gray-400">{{
        t(field.label)
      }}</span>
      <template v-if="field.previous">
        <code class="max-w-[42%] truncate text-gray-400" :title="field.previous">{{
          field.previous
        }}</code>
        <span class="shrink-0 text-gray-400" aria-hidden="true">→</span>
      </template>
      <button
        type="button"
        :aria-label="t(field.copyLabel)"
        :title="field.value"
        class="inline-flex min-w-0 flex-1 items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-left text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-400"
        @click="emit('copy', field.value)"
      >
        <code class="min-w-0 flex-1 truncate">{{ field.value }}</code>
        <svg
          class="h-3.5 w-3.5 shrink-0 text-primary-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <rect x="8" y="8" width="12" height="13" rx="2" />
          <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" />
        </svg>
      </button>
    </div>
  </div>
  <span v-else class="text-gray-500">{{
    status === 'queryFailed' ? t('dnsDiagnosis.retryLookup') : '—'
  }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { dnsStatusKey } from './dnsStatus'

interface RecordAdvice {
  record_type: string
  record_host?: string
  record_name?: string
  record_value: string
  priority?: number | null
  status: string
  misplaced_records?: { record_host?: string; record_name?: string }[]
}
interface CopyField {
  key: string
  label?: string
  previous?: string
  value: string
  copyLabel: string
}
const props = defineProps<{ record: RecordAdvice; zoneConfirmed: boolean }>()
const emit = defineEmits<{ copy: [value: string] }>()
const { t } = useI18n()
const status = computed(() => dnsStatusKey(props.record.status))
const priority = computed(() =>
  props.record.record_type === 'MX' &&
  ['missing', 'mismatch'].includes(status.value) &&
  props.record.priority !== null &&
  props.record.priority !== undefined
    ? String(props.record.priority)
    : null
)
const actionTitle = computed(() => {
  if (status.value === 'missing')
    return t('dnsDiagnosis.addRecord', { type: props.record.record_type })
  if (status.value === 'wrongHost')
    return t(props.zoneConfirmed ? 'dnsDiagnosis.changeHost' : 'dnsDiagnosis.changeName')
  if (status.value === 'mismatch') return t('dnsDiagnosis.changeValue')
  return ''
})
const fields = computed<CopyField[]>(() => {
  const row = props.record
  const fields: CopyField[] = []
  const host = String(
    props.zoneConfirmed ? row.record_host || row.record_name || '' : row.record_name || ''
  )
  if ((status.value === 'missing' || status.value === 'wrongHost') && host) {
    const previous = row.misplaced_records?.length === 1 ? row.misplaced_records[0] : null
    fields.push({
      key: 'host',
      label:
        status.value === 'missing'
          ? props.zoneConfirmed
            ? 'dnsDiagnosis.host'
            : 'dnsDiagnosis.fullName'
          : undefined,
      previous:
        status.value === 'wrongHost' && previous
          ? props.zoneConfirmed
            ? previous.record_host
            : previous.record_name
          : undefined,
      value: host,
      copyLabel: props.zoneConfirmed ? 'dnsDiagnosis.copyHost' : 'dnsDiagnosis.copyFullName'
    })
  }
  if (status.value === 'missing' || status.value === 'mismatch') {
    fields.push({
      key: 'value',
      label: status.value === 'missing' ? 'dnsDiagnosis.value' : undefined,
      value: row.record_value,
      copyLabel: 'dnsDiagnosis.copyValue'
    })
  }
  return fields
})
</script>
