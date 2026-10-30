<template>
  <div class="flex min-h-10 shrink-0 items-start gap-2 border-b border-gray-100 px-3 py-1.5">
    <label :for="inputId" class="w-14 shrink-0 pt-1 text-xs leading-5 text-gray-500">{{
      label
    }}</label>
    <div
      class="flex max-h-24 min-w-0 flex-1 flex-wrap items-center gap-1 overflow-y-auto"
      @click="input?.focus()"
    >
      <span
        v-for="email in recipients"
        :key="email"
        class="inline-flex max-w-full items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs leading-6 text-gray-700"
      >
        <span class="truncate">{{ email }}</span>
        <button
          type="button"
          :disabled="disabled"
          :aria-label="t('sendEmail.editor.removeRecipient', { email })"
          class="shrink-0 text-gray-400 hover:text-red-500 disabled:pointer-events-none"
          @click.stop="remove(email)"
        >
          <XMarkIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </span>
      <input
        :id="inputId"
        ref="input"
        :value="draft"
        :disabled="disabled"
        :placeholder="recipients.length ? '' : placeholder"
        :aria-label="label"
        type="text"
        class="min-h-7 min-w-24 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-gray-400 focus:ring-0 disabled:opacity-60"
        @input="emit('update:draft', ($event.target as HTMLInputElement).value)"
        @blur="commit()"
        @keydown="keydown"
        @paste="paste"
      />
    </div>
    <div class="flex shrink-0 items-center self-center"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  inputId: string
  label: string
  recipients: string[]
  draft: string
  placeholder?: string
  disabled?: boolean
}>()
const emit = defineEmits<{
  'update:recipients': [value: string[]]
  'update:draft': [value: string]
}>()
const { t } = useI18n()
const input = ref<HTMLInputElement | null>(null)
const remove = (email: string) =>
  emit(
    'update:recipients',
    props.recipients.filter((item) => item !== email)
  )
const commit = (value = props.draft) => {
  if (props.disabled) return
  const seen = new Set(props.recipients.map((email) => email.toLowerCase()))
  const added = value
    .split(/[,;，；\s]+/)
    .filter(
      (email) =>
        email.includes('@') && !seen.has(email.toLowerCase()) && seen.add(email.toLowerCase())
    )
  if (added.length) emit('update:recipients', [...props.recipients, ...added])
  emit('update:draft', '')
}
const keydown = (event: KeyboardEvent) => {
  if (['Enter', 'Tab', ',', '，', ';', '；'].includes(event.key) && props.draft.trim()) {
    if (event.key !== 'Tab') event.preventDefault()
    commit()
  } else if (event.key === 'Backspace' && !props.draft && props.recipients.length) {
    remove(props.recipients[props.recipients.length - 1])
  }
}
const paste = (event: ClipboardEvent) => {
  const value = event.clipboardData?.getData('text')
  if (!value?.includes('@')) return
  event.preventDefault()
  commit(props.draft + value)
}
</script>
