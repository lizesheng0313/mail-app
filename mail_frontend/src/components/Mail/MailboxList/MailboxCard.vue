<template>
  <div
    ref="cardRef"
    class="group rounded-lg border border-transparent p-3"
    :class="[cardClass]"
    @click="$emit('click')"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 flex-1 items-center">
        <input
          v-if="batchMode"
          type="checkbox"
          :checked="checked"
          class="mailbox-checkbox mr-3 h-4 w-4 flex-shrink-0 cursor-pointer"
          @click.stop="$emit('toggle-check')"
        />
        <slot name="leading"></slot>
        <div class="flex-1 min-w-0">
          <slot>
            <div class="flex min-w-0 items-center gap-2">
              <slot name="address-leading"></slot>
              <code
                v-if="address"
                class="min-w-0 flex-shrink truncate text-sm"
                :class="addressClass"
                :title="address"
              >{{ address }}</code>
              <slot name="badges"></slot>
            </div>
            <div
              v-if="createdText || expiresText || permanentText"
              class="mt-1 flex items-center justify-between gap-2 text-xs text-gray-600"
            >
              <span v-if="createdText" class="truncate">{{ createdLabel }}：{{ createdText }}</span>
              <span
                v-if="expiresText || permanentText"
                class="ml-auto inline-flex shrink-0 items-center gap-1"
                :class="expiresClass"
              >
                <template v-if="permanentText">
                  <span>{{ expiresLabel }}：</span>
                  <span class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] leading-none text-amber-800">{{ permanentText }}</span>
                </template>
                <template v-else>{{ expiresLabel }}：{{ expiresText }}</template>
              </span>
            </div>
            <slot name="details"></slot>
          </slot>
        </div>
      </div>
      <div v-if="!batchMode" class="relative flex-shrink-0">
        <slot name="actions">
          <div
            v-if="actions.length"
            class="relative"
            @mouseenter="openActionMenu"
            @mouseleave="scheduleActionMenuClose"
          >
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
              :title="actionMenuTitle"
              @click.stop="openActionMenu"
            >
              <BaseIcon name="more" size="sm" />
            </button>
            <div
              v-if="actionMenuOpen"
              :class="[
                'absolute right-0 z-20 min-w-[128px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg',
                actionMenuPlacement === 'up' ? 'bottom-full' : 'top-full'
              ]"
              @click.stop
            >
              <button
                v-for="action in actions"
                :key="action.id"
                type="button"
                :disabled="action.disabled"
                :title="action.title || action.label"
                :class="actionButtonClass(action)"
                @click.stop="selectAction(action)"
              >
                <BaseIcon :name="action.icon" size="sm" :class="action.iconClass || ''" />
                {{ action.label }}
              </button>
            </div>
          </div>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import BaseIcon from '@/components/BaseIcon/index.vue'

interface MailboxCardAction {
  id: string
  label: string
  icon: string
  tone?: 'default' | 'danger'
  disabled?: boolean
  title?: string
  iconClass?: string
}

const props = withDefaults(
  defineProps<{
    batchMode?: boolean
    checked?: boolean
    cardClass?: string | string[] | Record<string, boolean>
    address?: string
    addressClass?: string | string[] | Record<string, boolean>
    createdLabel?: string
    createdText?: string
    expiresLabel?: string
    expiresText?: string
    expiresClass?: string | string[] | Record<string, boolean>
    permanentText?: string
    actionMenuTitle?: string
    actions?: MailboxCardAction[]
  }>(),
  {
    batchMode: false,
    checked: false,
    cardClass: '',
    address: '',
    addressClass: 'text-black',
    createdLabel: '',
    createdText: '',
    expiresLabel: '',
    expiresText: '',
    expiresClass: '',
    permanentText: '',
    actionMenuTitle: '',
    actions: () => []
  }
)

const emit = defineEmits<{
  click: []
  'toggle-check': []
  action: [id: string]
}>()

const cardRef = ref<HTMLElement | null>(null)
const actionMenuOpen = ref(false)
const actionMenuPlacement = ref<'up' | 'down'>('down')
let closeMenuTimer: ReturnType<typeof setTimeout> | null = null

const clearCloseMenuTimer = () => {
  if (!closeMenuTimer) return
  clearTimeout(closeMenuTimer)
  closeMenuTimer = null
}

const closeActionMenu = () => {
  clearCloseMenuTimer()
  actionMenuOpen.value = false
}

const resolveMenuPlacement = (event: Event) => {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return 'down' as const
  const triggerRect = target.getBoundingClientRect()
  const scrollContainer = target.closest('.scrollbar-stable') as HTMLElement | null
  const containerTop = scrollContainer
    ? Math.max(scrollContainer.getBoundingClientRect().top, 0)
    : 0
  const containerBottom = scrollContainer
    ? Math.min(scrollContainer.getBoundingClientRect().bottom, window.innerHeight)
    : window.innerHeight
  const menuHeight = Math.max(48, props.actions.length * 40 + 8)
  const spaceAbove = triggerRect.top - containerTop
  const spaceBelow = containerBottom - triggerRect.bottom
  if (spaceBelow >= menuHeight) return 'down' as const
  if (spaceAbove >= menuHeight) return 'up' as const
  return spaceBelow >= spaceAbove ? 'down' as const : 'up' as const
}

const openActionMenu = (event: Event) => {
  clearCloseMenuTimer()
  actionMenuPlacement.value = resolveMenuPlacement(event)
  actionMenuOpen.value = true
}

const scheduleActionMenuClose = () => {
  clearCloseMenuTimer()
  closeMenuTimer = setTimeout(() => {
    actionMenuOpen.value = false
    closeMenuTimer = null
  }, 160)
}

const handleOutsidePointerDown = (event: PointerEvent) => {
  if (!cardRef.value?.contains(event.target as Node)) closeActionMenu()
}

watch(actionMenuOpen, (isOpen) => {
  if (isOpen) {
    window.addEventListener('pointerdown', handleOutsidePointerDown, true)
  } else {
    window.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  }
})

const actionButtonClass = (action: MailboxCardAction) => {
  const base = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors'
  if (action.disabled) return `${base} cursor-not-allowed text-gray-400`
  if (action.tone === 'danger') return `${base} text-red-600 hover:bg-red-50`
  return `${base} text-gray-700 hover:bg-gray-50`
}

const selectAction = (action: MailboxCardAction) => {
  if (action.disabled) return
  closeActionMenu()
  emit('action', action.id)
}

onBeforeUnmount(() => {
  clearCloseMenuTimer()
  window.removeEventListener('pointerdown', handleOutsidePointerDown, true)
})
</script>

<style scoped>
.mailbox-checkbox {
  appearance: none;
  -webkit-appearance: none;
  border: 2px solid #d1d5db;
  border-radius: 3px;
  background-color: white;
  position: relative;
}

.mailbox-checkbox:checked {
  background-color: #22c55e;
  border-color: #22c55e;
}

.mailbox-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
</style>
