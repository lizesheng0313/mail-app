<template>
  <SidebarLayout
    :title="t('pageHeader.siteName')"
    :logo-icon="UserIcon"
    :hide-brand-icon="true"
    :menu-sections="menuSections"
    :user-email="userInfo?.email || ''"
    :user-role="t('userLayout.userRole')"
    :page-title="isMailboxPage ? '' : currentPageTitle"
    :on-logout="logout"
  >
    <template #header-actions>
      <router-link
        :to="userStore.isAuthenticated ? '/user' : '/'"
        class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700 md:h-auto md:w-auto md:whitespace-nowrap md:rounded-none md:hover:bg-transparent md:text-sm"
        :aria-label="t('pageHeader.workspace')"
        :title="t('pageHeader.workspace')"
        aria-current="page"
      >
        <HomeIcon class="h-5 w-5 md:hidden" aria-hidden="true" />
        <span class="hidden md:inline">{{ t('pageHeader.workspace') }}</span>
      </router-link>
      <router-link
        to="/market"
        class="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-primary-700 xl:hidden"
        :aria-label="t('pageHeader.resourceMarket')"
        :title="t('pageHeader.resourceMarket')"
      >
        <ShoppingCartIcon class="h-5 w-5" />
      </router-link>
      <PublicNavigation compact />
      <AccountActions />
    </template>
    <div class="flex h-full min-h-0 flex-col">
      <nav
        v-if="mailboxTabs.length"
        :aria-label="t('workspace.mailboxTools')"
        class="mb-3 flex shrink-0 gap-5 overflow-x-auto border-b border-gray-200"
      >
        <router-link
          v-for="item in mailboxTabs"
          :key="item.path"
          :to="item.path"
          class="whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition-colors"
          :class="
            route.path === item.path
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          "
          :aria-current="route.path === item.path ? 'page' : undefined"
          >{{ item.label }}</router-link
        >
      </nav>
      <div class="min-h-0 flex-1">
        <router-view v-slot="{ Component, route: childRoute }">
          <KeepAlive>
            <component v-if="childRoute.meta.keepAlive" :is="Component" />
          </KeepAlive>
          <component v-if="!childRoute.meta.keepAlive" :is="Component" />
        </router-view>
      </div>
    </div>
  </SidebarLayout>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { HomeIcon, ShoppingCartIcon, UserIcon } from '@heroicons/vue/24/outline'
import { useUserStore } from '@/stores/user'
import SidebarLayout from '@/components/SidebarLayout/index.vue'
import AccountActions from '@/components/AccountActions/index.vue'
import PublicNavigation from '@/components/PublicNavigation/index.vue'
import { createWorkspaceMenu, externalMailboxTabs } from '@/config/workspaceNavigation'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { t } = useI18n()
const userInfo = computed(() => userStore.user)
const menuSections = computed(() => createWorkspaceMenu(t, {
  publicHome: route.path === '/',
  guest: !userStore.isAuthenticated
}))
const activeMailboxType = computed(() => route.meta.mailboxType)
const isExternalMailboxPage = computed(() =>
  externalMailboxTabs(t).some((item) => item.path === route.path)
)
const isMailboxPage = computed(() =>
  Boolean(activeMailboxType.value) || isExternalMailboxPage.value || route.path === '/user/domains'
)
const mailboxTabs = computed(() => {
  if (isExternalMailboxPage.value) return externalMailboxTabs(t)
  if (activeMailboxType.value === 'hosted' || route.path === '/user/domains')
    return [
      { path: '/user/mailboxes/hosted', label: t('mail.inbox') },
      { path: '/user/domains', label: t('userLayout.myDomains') }
    ]
  return []
})
// 当前页面标题
const currentPageTitle = computed(() => {
  if (activeMailboxType.value)
    return t(
      `home.${activeMailboxType.value === 'system' ? 'temporaryMailbox' : activeMailboxType.value === 'hosted' ? 'hostedMailbox' : 'externalMailbox'}`
    )
  if (isExternalMailboxPage.value) return t('home.externalMailbox')
  if (route.path === '/user/notifications') return t('pageHeader.notices')
  if (route.path.startsWith('/user/automation/browser-workflows'))
    return route.params.workflowId ? '编辑浏览器工作流' : '浏览器工作流'
  if (route.path === '/user/automation/workflows') return t('userLayout.automationWorkflows')
  if (route.path === '/user/automation/execution-history') return '执行记录'
  if (route.path === '/user/automation/triggers') return t('userLayout.automationTriggers')
  if (route.path === '/user/automation/plugins') return t('userLayout.myPlugins')
  if (route.path === '/user/automation/plugins/store') return t('userLayout.pluginStore')
  if (route.path.startsWith('/user/developer/api-keys')) return t('userLayout.apiKeys')
  if (route.path === '/user/email-reach/dashboard') return t('userLayout.emailReachDashboard')
  if (route.path === '/user/email-reach/templates') return t('userLayout.emailReachTemplates')
  if (route.path === '/user/email-reach/templates/create') return '新建模板'
  if (route.path.startsWith('/user/email-reach/templates/') && route.path.endsWith('/edit'))
    return '编辑模板'
  if (route.path === '/user/email-reach/members') return t('userLayout.emailReachMembers')
  if (route.path === '/user/email-reach/member-groups') return '分组管理'
  if (route.path === '/user/email-reach/member-tags') return '标签管理'
  if (route.path === '/user/email-reach/tasks') return '发送任务'
  if (route.path.startsWith('/user/email-reach/tasks/')) return '任务明细'
  if (route.path === '/user/email-reach/records') return '行为明细'
  if (route.path === '/user/email-reach/recipients') return t('userLayout.emailReachRecipients')
  if (route.path === '/user/email-reach/unsubscribes') return t('userLayout.emailReachUnsubscribes')

  const titles = {
    '/user/tools/2fa-code': t('mail.footerTool2fa'),
    '/user/domains': t('userLayout.myDomains'),
    '/user/external-batch-verify': t('userLayout.batchVerify'),
    '/user/external-bulk-send': t('userLayout.bulkSend'),
    '/user/external-outbox': t('userLayout.outbox'),
    '/user/external-group-management': t('userLayout.groupManagement'),
    '/user/external-batch-repair': t('userLayout.batchRepair'),
    '/user/external-proxy-management': t('userLayout.proxyManagement'),
    '/user/purchases': t('userLayout.financeCenter'),
    '/user/resource-orders': t('userLayout.resourceOrders'),
    '/user/finance': t('userLayout.financeCenter'),
    '/user/settings': t('userLayout.personalSettings'),
    '/user/announcements': t('userLayout.announcements')
  }
  return titles[route.path] || t('pageHeader.siteName')
})

const logout = () => {
  userStore.logout()
  router.push('/login')
}
</script>
