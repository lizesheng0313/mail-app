<template>
  <div class="min-w-0 text-xs" :class="expanded ? 'w-full' : ''">
    <p v-if="mailboxes.length === 1 && !compact" class="break-all text-gray-500">{{ mailboxes[0] }}</p>
    <p v-else-if="!mailboxes.length" class="text-gray-400">-</p>
    <template v-else>
      <button type="button" :aria-label="label" :aria-expanded="expanded" :aria-controls="detailsId" class="inline-flex max-w-full items-center gap-1 rounded-sm text-gray-500 transition-colors hover:text-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500" @click="toggleExpanded">
        <span>{{ t(compact ? 'shareMailbox.linkMailboxCount' : 'shareMailbox.scopeMailboxCount', { count: mailboxes.length }) }}</span>
        <BaseIcon :name="expanded ? 'chevron-up' : 'chevron-down'" size="h-3 w-3" />
      </button>
      <div v-if="expanded" :id="detailsId" class="mt-2 rounded-md border border-gray-200 bg-gray-50 p-2.5">
        <div v-if="mailboxes.length > 8" class="mb-2 flex items-center gap-2">
          <input v-model="search" type="search" :aria-label="`${t('shareMailbox.filterMailboxes')} · ${label}`" :placeholder="t('shareMailbox.filterMailboxes')" class="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-300" />
          <span class="shrink-0 tabular-nums text-gray-400">{{ filteredMailboxes.length }}/{{ mailboxes.length }}</span>
        </div>
        <ul v-if="filteredMailboxes.length" :aria-label="label" class="max-h-36 overflow-y-auto overscroll-contain" :class="compact ? 'space-y-1.5' : 'grid gap-x-4 gap-y-1.5 sm:grid-cols-2'">
          <li v-for="mailbox in filteredMailboxes" :key="mailbox" class="min-w-0 break-all leading-5 text-gray-600">{{ mailbox }}</li>
        </ul>
        <p v-else class="py-2 text-gray-400">{{ t('shareMailbox.noMatchingMailboxes') }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseIcon from '@/components/BaseIcon/index.vue'

const props = defineProps({
  mailboxes: { type: Array, default: () => [] },
  label: { type: String, required: true },
  compact: { type: Boolean, default: false }
})
const { t } = useI18n()
const expanded = ref(false)
const search = ref('')
const detailsId = `share-mailboxes-${Math.random().toString(36).slice(2)}`
const filteredMailboxes = computed(() => {
  const query = search.value.trim().toLowerCase()
  return props.mailboxes.filter((mailbox) => mailbox.toLowerCase().includes(query))
})
const toggleExpanded = () => {
  expanded.value = !expanded.value
  if (!expanded.value) search.value = ''
}
watch(() => props.mailboxes.join('\u0000'), () => { expanded.value = false; search.value = '' })
</script>
