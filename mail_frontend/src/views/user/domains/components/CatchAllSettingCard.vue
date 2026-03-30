<template>
  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <div class="text-sm font-medium text-black">未匹配邮箱代收</div>
        <p class="mt-1 text-xs leading-5 text-gray-500">
          开启后，未创建地址的邮件会统一收到 <span class="font-mono text-gray-700">{{ getCatchAllMailbox(domainName) }}</span>；关闭后不收。
        </p>
        <p class="mt-1 text-xs leading-5 text-gray-500">
          多级域名也支持，如 <span class="font-mono text-gray-700">{{ getCatchAllSubdomainExample(domainName, 'www') }}</span>、<span class="font-mono text-gray-700">{{ getCatchAllSubdomainExample(domainName, 'bbb.ccc') }}</span>。
        </p>
        <p v-if="showMailboxLine && enabled" class="mt-1 text-xs leading-5 text-gray-600">
          代收邮箱：<span class="font-mono text-gray-700">{{ getCatchAllMailbox(domainName) }}</span>
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
withDefaults(defineProps<{
  domainName?: string
  enabled: boolean
  showMailboxLine?: boolean
}>(), {
  domainName: '',
  showMailboxLine: false,
})

const emit = defineEmits<{
  (e: 'update:enabled', value: boolean): void
}>()

const normalizeCatchAllDomain = (domainName?: string) => String(domainName || '').trim() || '你的域名'
const getCatchAllMailbox = (domainName?: string) => `admin@${normalizeCatchAllDomain(domainName)}`
const getCatchAllSubdomainExample = (domainName?: string, subdomain = 'www') => `xxxx@${subdomain}.${normalizeCatchAllDomain(domainName)}`
</script>
