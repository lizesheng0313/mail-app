<template>
  <SidebarLayout
    :title="t('userLayout.workspaceTitle')"
    :logo-icon="UserIcon"
    :menu-sections="menuSections"
    :user-email="userInfo?.email || ''"
    :user-role="t('userLayout.userRole')"
    :page-title="currentPageTitle"
    :page-description="pageDescription"
    :on-logout="logout"
  >
    <template #header-actions>
      <router-link
        to="/"
        class="mr-[28px] inline-flex items-center rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
      >
        {{ t('userLayout.backHome') }}
      </router-link>
    </template>
    <router-view />
  </SidebarLayout>
</template>

<script setup>
import { computed, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import SidebarLayout from '@/components/SidebarLayout/index.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { t } = useI18n()

// 用户信息
const userInfo = computed(() => userStore.user)

// Logo 图标
const UserIcon = {
  render: () =>
    h(
      'svg',
      {
        class: 'h-5 w-5 text-white',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24'
      },
      [
        h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
        })
      ]
    )
}

// 菜单配置
const menuSections = computed(() => [
  {
    name: t('userLayout.automation'),
    items: [
      {
        path: '/user/automation/triggers',
        label: t('userLayout.automationTriggers'),
        icon: {
          render: () =>
            h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
              h('path', {
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'stroke-width': '2',
                d: 'M13 10V3L4 14h7v7l9-11h-7z'
              })
            ])
        }
      },
      {
        path: '/user/automation/workflows',
        label: t('userLayout.automationWorkflows'),
        icon: {
          render: () =>
            h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
              h('path', {
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'stroke-width': '2',
                d: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
              })
            ])
        }
      },
      {
        path: '/user/automation/plugins',
        label: t('userLayout.myPlugins'),
        icon: {
          render: () =>
            h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
              h('path', {
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'stroke-width': '2',
                d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
              })
            ])
        }
      }
    ]
  },
  {
    name: t('userLayout.developerAccess'),
    items: [
      {
        path: '/user/developer/api-keys',
        label: t('userLayout.apiKeys'),
        icon: {
          render: () =>
            h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
              h('path', {
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'stroke-width': '2',
                d: 'M15 7a4 4 0 11-7.75 1H5a2 2 0 100 4h2.25A4 4 0 1115 7zm0 0l4 4m0 0l2-2m-2 2l-2 2'
              })
            ])
        }
      }
    ]
  },
  {
    name: t('userLayout.hostedMailbox'),
    items: [
      {
        path: '/user/domains',
        label: t('userLayout.myDomains'),
        icon: {
          render: () =>
            h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
              h('path', {
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'stroke-width': '2',
                d: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3.6a14.2 14.2 0 010 16.8M12 3.6a14.2 14.2 0 000 16.8'
              })
            ])
        }
      }
    ]
  },
  {
    name: t('userLayout.finance'),
    items: [
      {
        path: '/user/finance',
        label: t('userLayout.financeCenter'),
        icon: {
          render: () =>
            h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
              h('path', {
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'stroke-width': '2',
                d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              })
            ])
        }
      },
      {
        path: '/user/purchases',
        label: t('userLayout.transactions'),
        icon: {
          render: () =>
            h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
              h('path', {
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'stroke-width': '2',
                d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
              })
            ])
        }
      }
    ]
  },
  {
    name: t('userLayout.systemInfo'),
    items: [
      {
        path: '/user/announcements',
        label: t('userLayout.announcements'),
        icon: {
          render: () =>
            h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
              h('path', {
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'stroke-width': '2',
                d: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z'
              })
            ])
        }
      }
    ]
  },
  {
    name: t('userLayout.systemSettings'),
    items: [
      {
        path: '/user/settings',
        label: t('userLayout.personalSettings'),
        icon: {
          render: () =>
            h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
              h('path', {
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'stroke-width': '2',
                d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
              }),
              h('path', {
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'stroke-width': '2',
                d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
              })
            ])
        }
      }
    ]
  }
])

// 当前页面标题
const currentPageTitle = computed(() => {
  if (route.path === '/user/automation/workflows') return t('userLayout.automationWorkflows')
  if (route.path === '/user/automation/execution-history') return '执行历史'
  if (route.path === '/user/automation/triggers') return t('userLayout.automationTriggers')
  if (route.path === '/user/automation/plugins') return t('userLayout.myPlugins')
  if (route.path === '/user/automation/plugins/store') return t('userLayout.pluginStore')
  if (route.path.startsWith('/user/developer/api-keys')) return t('userLayout.apiKeys')

  const titles = {
    '/user/domains': t('userLayout.myDomains'),
    '/user/purchases': t('userLayout.transactions'),
    '/user/finance': t('userLayout.financeCenter'),
    '/user/settings': t('userLayout.personalSettings'),
    '/user/announcements': t('userLayout.announcements')
  }
  return titles[route.path] || t('userLayout.workspaceTitle')
})

// 页面描述
const pageDescription = computed(() => {
  if (route.path === '/user/automation/workflows') return t('userLayout.automationWorkflowsDescription')
  if (route.path === '/user/automation/execution-history') return '查看当前工作流的执行记录和失败详情'
  if (route.path === '/user/automation/triggers') return t('userLayout.automationTriggersDescription')
  if (route.path === '/user/automation/plugins') return t('userLayout.myPluginsDescription')
  if (route.path === '/user/automation/plugins/store') return t('userLayout.pluginStoreDescription')
  if (route.path.startsWith('/user/developer/api-keys')) return t('userLayout.apiKeysDescription')

  const descriptions = {
    '/user/domains': t('userLayout.myDomainsDescription'),
    '/user/purchases': t('userLayout.transactionsDescription'),
    '/user/finance': t('userLayout.financeCenterDescription'),
    '/user/settings': t('userLayout.personalSettingsDescription'),
    '/user/announcements': t('userLayout.announcementsDescription')
  }
  return descriptions[route.path] || t('userLayout.workspaceDescription')
})

// 退出登录
const logout = () => {
  userStore.logout()
  router.push('/login')
}
</script>
