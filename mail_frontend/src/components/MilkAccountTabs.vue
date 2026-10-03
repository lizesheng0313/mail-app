<template>
  <nav :aria-label="t('userLayout.financeCenter')" class="mb-4 flex gap-5 border-b border-gray-200">
    <router-link
      to="/user/finance"
      class="border-b-2 px-1 py-2 text-sm font-medium transition-colors"
      :class="route.path === '/user/finance' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
      :aria-current="route.path === '/user/finance' ? 'page' : undefined"
    >
      {{ t('userLayout.coinBalanceRecharge') }}
    </router-link>
    <router-link
      to="/user/purchases"
      class="border-b-2 px-1 py-2 text-sm font-medium transition-colors"
      :class="route.path === '/user/purchases' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
      :aria-current="route.path === '/user/purchases' ? 'page' : undefined"
    >
      {{ t('userLayout.transactions') }}
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n()
</script>
