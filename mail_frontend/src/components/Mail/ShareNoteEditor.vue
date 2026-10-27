<template>
  <div class="min-w-0 text-sm">
    <form v-if="editing" class="space-y-2" @submit.prevent="save">
      <label class="block text-xs font-medium text-gray-500">
        {{ label }}
        <textarea ref="noteInput" v-model="draft" :aria-label="label" :maxlength="maxLength" :disabled="saving" rows="2" class="mt-1.5 block w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
      </label>
      <p v-if="error" role="alert" class="text-xs text-red-600">{{ error }}</p>
      <div class="flex flex-wrap items-center gap-3">
        <button type="submit" :disabled="saving" class="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">{{ t('common.save') }}</button>
        <button type="button" :disabled="saving" class="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50" @click="cancelEditing">{{ t('common.cancel') }}</button>
        <span class="ml-auto text-xs tabular-nums text-gray-400">{{ draft.length }}/{{ maxLength }}</span>
      </div>
    </form>
    <div v-else class="flex min-w-0 items-start gap-1.5">
      <p v-if="modelValue || placeholder" :title="modelValue || placeholder" class="min-w-0 whitespace-pre-wrap break-words" :class="variant === 'heading' ? 'text-lg font-semibold leading-6 text-gray-900' : 'line-clamp-2 pt-0.5 text-sm leading-5 text-gray-600'">{{ modelValue || placeholder }}</p>
      <button ref="editButton" type="button" :aria-label="editLabel" :title="editLabel" class="inline-flex shrink-0 items-center gap-1 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500" :class="!modelValue && !placeholder ? '-ml-1 text-xs' : ''" @click="startEditing">
        <BaseIcon :name="modelValue || placeholder ? 'edit' : 'plus'" size="h-3.5 w-3.5" />
        <span v-if="!modelValue && !placeholder">{{ t('shareMailbox.addNote') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseIcon from '@/components/BaseIcon/index.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  maxLength: { type: Number, default: 500 },
  placeholder: { type: String, default: '' },
  variant: { type: String, default: 'cell' },
  saveNote: { type: Function, required: true }
})
const { t } = useI18n()
const editing = ref(false)
const draft = ref('')
const saving = ref(false)
const error = ref('')
const noteInput = ref(null)
const editButton = ref(null)
const editLabel = computed(() => `${t(props.modelValue ? 'shareMailbox.editNote' : 'shareMailbox.addNote')} · ${props.label}`)
const startEditing = async () => {
  draft.value = props.modelValue
  error.value = ''
  editing.value = true
  await nextTick()
  noteInput.value?.focus()
}
const cancelEditing = async () => {
  editing.value = false
  await nextTick()
  editButton.value?.focus()
}
const save = async () => {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    await props.saveNote(draft.value.trim())
    await cancelEditing()
  } catch (cause) {
    error.value = cause?.message || t('shareMailbox.noteSaveFailed')
  } finally {
    saving.value = false
  }
}
</script>
