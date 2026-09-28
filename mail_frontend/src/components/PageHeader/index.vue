<template>
  <div>
    <!-- 顶部导航 -->
    <nav class="fixed inset-x-0 top-0 z-[70] bg-white shadow-sm border-b border-gray-200 mobile-nav">
      <div class="page-header-shell site-header-inline-padding">
        <div class="flex h-[54px] items-center justify-between gap-2">
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 md:hidden"
            :aria-label="t('pageHeader.navigationMenu')"
            :aria-expanded="mobileMenuOpen"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div class="hidden shrink-0 items-center md:flex">
            <router-link
              :to="userStore.isAuthenticated ? '/user' : '/'"
              class="flex items-center hover:opacity-80 transition-opacity"
            >
              <h1 class="whitespace-nowrap text-base font-semibold text-black">{{ t('pageHeader.siteName') }}</h1>
            </router-link>
          </div>
          <div class="hidden min-w-0 flex-1 items-center justify-end gap-3 md:flex lg:gap-6">
            <!-- 菜单导航 -->
            <div class="header-public-navigation flex min-w-0 items-center gap-3 overflow-x-auto sm:gap-4 lg:gap-5">
              <!-- 工作台入口对已登录用户和游客均可见 -->
              <router-link
                :to="userStore.isAuthenticated ? '/user' : '/'"
                class="shrink-0 whitespace-nowrap text-xs font-medium text-black transition-colors hover:text-primary-600 sm:text-sm"
                active-class="text-primary-600 font-semibold"
              >
                {{ t('pageHeader.workspace') }}
              </router-link>

              <PublicNavigation :guest="!userStore.isAuthenticated" />
            </div>

            <div class="shrink-0">
              <AccountActions />
            </div>
          </div>
          <div class="ml-auto flex min-w-0 items-center gap-1 md:hidden">
            <router-link
              :to="userStore.isAuthenticated ? '/user' : '/'"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
              :aria-label="t('pageHeader.workspace')"
              :title="t('pageHeader.workspace')"
            >
              <HomeIcon class="h-5 w-5" aria-hidden="true" />
            </router-link>
            <router-link
              to="/market"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-primary-700"
              :aria-label="t('pageHeader.resourceMarket')"
              :title="t('pageHeader.resourceMarket')"
            >
              <ShoppingCartIcon class="h-5 w-5" aria-hidden="true" />
            </router-link>
            <AccountActions />
          </div>
        </div>
      </div>
    </nav>

    <MobileSiteDrawer v-model:open="mobileMenuOpen" :menu-sections="mobileMenuSections" />

    <div class="h-[54px]"></div>

  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'
import { HomeIcon, ShoppingCartIcon } from '@heroicons/vue/24/outline'
import { useUserStore } from '@/stores/user'
import { createWorkspaceMenu } from '@/config/workspaceNavigation'
import AccountActions from '@/components/AccountActions/index.vue'
import MobileSiteDrawer from '@/components/MobileSiteDrawer/index.vue'
import PublicNavigation from '@/components/PublicNavigation/index.vue'
const { t } = useI18n()
const userStore = useUserStore()
const mobileMenuOpen = ref(false)
const mobileMenuSections = computed(() => createWorkspaceMenu(t, {
  publicHome: !userStore.isAuthenticated,
  guest: !userStore.isAuthenticated
}))
</script>
<style scoped>
.page-header-shell {
  max-width: none;
  margin: 0 auto;
  width: 100%;
}

@media (max-width: 767px) {
  .page-header-shell {
    padding-inline: 0.5rem;
  }
}

.header-public-navigation {
  scrollbar-width: none;
}

.header-public-navigation::-webkit-scrollbar {
  display: none;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
