<template>
  <div>
    <!-- 顶部导航 -->
    <nav class="fixed inset-x-0 top-0 z-[70] bg-white shadow-sm border-b border-gray-200 mobile-nav">
      <div class="page-header-shell">
        <div class="flex h-[54px] items-center justify-between">
          <div class="flex shrink-0 items-center">
            <router-link
              to="/"
              class="flex items-center hover:opacity-80 transition-opacity"
            >
              <h1 class="text-base sm:text-xl font-semibold text-black">{{ t('pageHeader.siteName') }}</h1>
            </router-link>
          </div>
          <div class="flex min-w-0 flex-1 items-center justify-end gap-3 sm:gap-6">
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
        </div>
      </div>
    </nav>

    <div class="h-[54px]"></div>

  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import AccountActions from '@/components/AccountActions/index.vue'
import PublicNavigation from '@/components/PublicNavigation/index.vue'
const { t } = useI18n()
const userStore = useUserStore()
</script>
<style scoped>
.page-header-shell {
  max-width: none;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
  width: 100%;
}

.header-public-navigation {
  scrollbar-width: none;
}

.header-public-navigation::-webkit-scrollbar {
  display: none;
}

@media (min-width: 640px) {
  .page-header-shell {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .page-header-shell {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

@media (min-width: 1440px) {
  .page-header-shell {
    padding-left: 2.5rem;
    padding-right: 2.5rem;
  }
}

@media (min-width: 1920px) {
  .page-header-shell {
    padding-left: clamp(2rem, 2.5vw, 3.25rem);
    padding-right: clamp(2rem, 2.5vw, 3.25rem);
  }
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
