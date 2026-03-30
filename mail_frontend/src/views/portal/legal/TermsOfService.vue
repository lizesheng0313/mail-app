<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <PageHeader />

    <div class="flex-1">
      <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="overflow-hidden rounded-2xl bg-white shadow-xl">
          <div class="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-10 text-white">
            <h1 class="text-3xl font-bold">{{ t('legal.termsTitle') }}</h1>
            <p class="mt-2 text-primary-100">{{ t('legal.updatedAt') }}</p>
          </div>

          <div class="space-y-8 px-8 py-10 text-sm leading-7 text-gray-700">
            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">{{ t('legal.terms1Title') }}</h2>
              <p>{{ t('legal.terms1Body') }}</p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">{{ t('legal.terms2Title') }}</h2>
              <p>{{ t('legal.terms2Body') }}</p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">{{ t('legal.terms3Title') }}</h2>
              <p>{{ t('legal.terms3Body') }}</p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">{{ t('legal.terms4Title') }}</h2>
              <p>{{ t('legal.terms4Body') }}</p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">{{ t('legal.terms5Title') }}</h2>
              <p>{{ t('legal.terms5Body') }}</p>
            </section>

            <section>
              <h2 class="mb-2 text-xl font-semibold text-gray-900">{{ t('legal.terms6Title') }}</h2>
              <p>{{ t('legal.terms6Body') }}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/PageHeader/index.vue'

const { t } = useI18n()
</script>
