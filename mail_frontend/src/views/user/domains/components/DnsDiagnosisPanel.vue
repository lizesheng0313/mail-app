<template>
  <section v-if="loading || diagnosis || error" class="rounded-lg border border-primary-200 bg-primary-50 p-4" aria-live="polite" :aria-busy="loading">
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-sm font-semibold text-black">{{ t('dnsDiagnosis.title') }}</h3>
      <span v-if="diagnosis?.source === 'rules'" class="text-xs text-gray-500">{{ t('dnsDiagnosis.basicGuide') }}</span>
    </div>
    <p v-if="loading" class="mt-2 text-sm text-gray-600">{{ t('dnsDiagnosis.loading') }}</p>
    <div v-else-if="error" class="mt-2 text-sm text-gray-600">
      {{ t('dnsDiagnosis.failed') }}
      <button type="button" class="ml-2 text-primary-700 underline" @click="emit('retry')">{{ t('common.retry') }}</button>
    </div>
    <template v-else-if="diagnosis">
      <p class="mt-2 whitespace-pre-line text-sm text-gray-800">{{ diagnosis.summary }}</p>
      <p class="mt-2 break-all text-xs text-gray-600">
        {{ diagnosis.dns_zone ? t('dnsDiagnosis.zone', { zone: diagnosis.dns_zone }) : t('dnsDiagnosis.zoneUnknown') }}
      </p>
      <ol class="mt-3 space-y-3">
        <li v-for="(record, index) in diagnosis.records" :key="record.id" class="rounded-md border border-gray-200 bg-white p-3 text-sm">
          <div class="font-medium text-black">{{ index + 1 }}. {{ record.record_type }}</div>
          <p class="mt-1 whitespace-pre-line text-gray-700">{{ record.explanation }}</p>
          <p v-for="found in record.misplaced_records" :key="found.record_name" class="mt-2 break-all text-xs text-gray-500">
            {{ t('dnsDiagnosis.currentHost') }}：{{ found.record_host }}
          </p>
          <dl class="mt-2 space-y-2">
            <div class="flex items-start gap-2">
              <dt class="shrink-0 text-gray-500">{{ t('dnsDiagnosis.host') }}：</dt>
              <dd class="min-w-0 flex-1 break-all font-medium">{{ record.record_host }}</dd>
              <button type="button" class="shrink-0 text-primary-700" @click="emit('copy', record.record_host)">{{ t('common.copy') }}</button>
            </div>
            <div class="flex items-start gap-2">
              <dt class="shrink-0 text-gray-500">{{ t('dnsDiagnosis.value') }}：</dt>
              <dd class="min-w-0 flex-1 break-all font-medium">{{ record.record_value }}</dd>
              <button type="button" class="shrink-0 text-primary-700" @click="emit('copy', record.record_value)">{{ t('common.copy') }}</button>
            </div>
            <div v-if="record.priority != null" class="flex gap-2">
              <dt class="text-gray-500">{{ t('dnsDiagnosis.priority') }}：</dt><dd>{{ record.priority }}</dd>
            </div>
            <div class="text-xs text-gray-500 break-all">{{ t('dnsDiagnosis.fullName') }}：{{ record.record_name }}</div>
          </dl>
        </li>
      </ol>
      <p class="mt-3 text-sm text-gray-700">{{ diagnosis.next_step }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ diagnosis?: any; loading?: boolean; error?: boolean }>()
const emit = defineEmits<{ (e: 'retry'): void; (e: 'copy', value: string): void }>()
const { t } = useI18n()
</script>
