<template>
  <Dialog :open="open" :initial-focus="closeButton" class="relative z-[200]" @close="$emit('close')">
    <div class="fixed inset-0 bg-gray-900/40" aria-hidden="true" />
    <div class="fixed inset-0 flex items-center justify-center p-3 sm:p-6">
      <DialogPanel class="flex h-[34rem] max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:max-h-[calc(100dvh-3rem)]">
        <header class="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div class="min-w-0">
            <DialogTitle class="text-lg font-semibold text-gray-900">{{ t('shareMailbox.mailboxListTitle') }}</DialogTitle>
            <p class="mt-1 text-xs text-gray-500">{{ t('shareMailbox.scopeMailboxCount', { count: items.length }) }}</p>
          </div>
          <button ref="closeButton" type="button" :aria-label="t('common.close')" class="-mr-1 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500" @click="$emit('close')"><BaseIcon name="x" size="h-5 w-5" /></button>
        </header>
        <div class="shrink-0 px-5 pt-4">
          <input v-model="search" type="search" :aria-label="t('shareMailbox.filterMailboxes')" :placeholder="t('shareMailbox.filterMailboxes')" class="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-300" />
          <p v-if="missingCount" role="status" class="mt-3 text-xs leading-5 text-amber-700">{{ t('shareMailbox.unavailableMailboxHint', { count: missingCount }) }}</p>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
          <ol v-if="filteredItems.length" :aria-label="t('shareMailbox.mailboxListTitle')" class="divide-y divide-gray-100">
            <li v-for="item in filteredItems" :key="item.id" class="flex items-start gap-3 py-3">
              <span class="w-6 shrink-0 pt-0.5 text-xs tabular-nums text-gray-400">{{ String(item.index).padStart(2, '0') }}</span>
              <div class="min-w-0 flex-1">
                <p class="select-text break-all text-sm leading-5 text-gray-800">{{ item.email }}</p>
                <p v-if="item.available === false" class="mt-1 text-xs text-gray-400">{{ t('shareMailbox.mailboxRemoved') }}</p>
              </div>
            </li>
          </ol>
          <p v-else class="py-12 text-center text-sm text-gray-500">{{ t(!search && missingCount === items.length && items.length ? 'shareMailbox.unavailableMailboxAddress' : 'shareMailbox.noMatchingMailboxes') }}</p>
        </div>
        <footer class="shrink-0 border-t border-gray-100 px-5 py-3 text-xs tabular-nums text-gray-400">{{ filteredItems.length }} / {{ items.length }}</footer>
      </DialogPanel>
    </div>
  </Dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { useI18n } from 'vue-i18n'
import BaseIcon from '@/components/BaseIcon/index.vue'
const props = defineProps({ open: Boolean, items: { type: Array, default: () => [] } })
defineEmits(['close'])
const { t } = useI18n()
const closeButton = ref(null)
const search = ref('')
const missingCount = computed(() => props.items.filter(item => !item.email).length)
const filteredItems = computed(() => {
  const query = search.value.trim().toLowerCase()
  return props.items.map((item, index) => ({ ...item, index: index + 1 })).filter(item => item.email && (!query || item.email.toLowerCase().includes(query)))
})
watch(() => props.open, () => { search.value = '' })
</script>
