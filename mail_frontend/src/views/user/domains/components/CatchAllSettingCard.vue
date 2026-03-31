<template>
  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <div class="text-sm font-medium text-black">{{ t('domainsPage.catchAllTitle') }}</div>
        <p class="mt-1 text-xs leading-5 text-gray-500">
          {{ t('domainsPage.catchAllCreateDesc', { mailbox: getCatchAllMailbox(domainName) }) }}
        </p>
        <p class="mt-1 text-xs leading-5 text-gray-500">
          {{ t('domainsPage.catchAllDnsDesc') }}
        </p>
        <p v-if="showMailboxLine && enabled" class="mt-1 text-xs leading-5 text-gray-600">
          {{ t('domainsPage.catchAllMailbox', { mailbox: getCatchAllMailbox(domainName) }) }}
        </p>
      </div>
      <button
        type="button"
        class="relative mt-0.5 inline-block h-6 w-11 flex-shrink-0 cursor-pointer"
        @click="emit('update:enabled', !enabled)"
      >
        <div
          class="block h-6 w-11 rounded-full transition-colors duration-200 ease-in-out"
          :class="enabled ? 'bg-primary-600' : 'bg-gray-300'"
        >
          <div
            class="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
            :class="{ 'translate-x-5': enabled }"
          ></div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

withDefaults(
  defineProps<{
    domainName?: string
    enabled: boolean
    showMailboxLine?: boolean
  }>(),
  {
    domainName: '',
    showMailboxLine: false
  }
)

const emit = defineEmits<{
  (e: 'update:enabled', value: boolean): void
}>()
const { t } = useI18n()

const normalizeCatchAllDomain = (domainName?: string) =>
  String(domainName || '').trim() || t('domainsPage.yourDomain')
const getCatchAllMailbox = (domainName?: string) => `admin@${normalizeCatchAllDomain(domainName)}`
</script>
