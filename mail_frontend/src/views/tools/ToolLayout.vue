<template>
  <div class="flex min-h-screen flex-col bg-gray-50 text-gray-900">
    <PageHeader />

    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <section class="rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-gray-200 sm:px-7 sm:py-6">
        <div class="flex items-start gap-4">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </div>
          <div class="min-w-0">
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{{ title }}</h1>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-gray-500 sm:text-base">{{ description }}</p>
          </div>
        </div>

      </section>

      <section
        class="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-7"
      >
        <slot />
      </section>
    </main>

    <PageFooter />
  </div>
</template>

<script setup lang="ts">
import PageFooter from '@/components/PageFooter/index.vue'
import PageHeader from '@/components/PageHeader/index.vue'

defineProps<{
  title: string
  description: string
}>()
</script>
