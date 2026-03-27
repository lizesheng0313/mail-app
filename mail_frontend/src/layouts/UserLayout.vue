<template>
  <SidebarLayout
    title="我的工作台"
    :logo-icon="UserIcon"
    :menu-sections="menuSections"
    :user-email="userInfo?.email || ''"
    user-role="用户"
    :page-title="currentPageTitle"
    :page-description="pageDescription"
    :on-logout="logout"
  >
    <router-view />
  </SidebarLayout>
</template>

<script setup>
import { computed, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import SidebarLayout from '@/components/SidebarLayout/index.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 用户信息
const userInfo = computed(() => userStore.user)

// Logo 图标
const UserIcon = {
  render: () => h('svg', {
    class: 'h-5 w-5 text-white',
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24'
  }, [
    h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
      d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    })
  ])
}

// 菜单配置
const menuSections = [
  {
    name: '开发接入',
    items: [
      {
        path: '/user/developer/api-keys',
        label: '访问密钥',
        icon: {
          render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 7a4 4 0 11-7.75 1H5a2 2 0 100 4h2.25A4 4 0 1115 7zm0 0l4 4m0 0l2-2m-2 2l-2 2' })
          ])
        }
      }
    ]
  },
  {
    name: '财务管理',
    items: [
      {
        path: '/user/finance',
        label: '财务中心',
        icon: {
          render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
          ])
        }
      },
      {
        path: '/user/purchases',
        label: '交易记录',
        icon: {
          render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' })
          ])
        }
      }
    ]
  },
  {
    name: '系统信息',
    items: [
      {
        path: '/user/announcements',
        label: '系统公告',
        icon: {
          render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' })
          ])
        }
      },
      {
        path: '/user/feedback',
        label: '问题反馈',
        icon: {
          render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4z' })
          ])
        }
      }
    ]
  },
  {
    name: '系统设置',
    items: [
      {
        path: '/user/settings',
        label: '个人设置',
        icon: {
          render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }),
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' })
          ])
        }
      }
    ]
  },
  {
    name: '快捷操作',
    items: [
      {
        path: '/',
        label: '返回首页',
        icon: {
          render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' })
          ])
        }
      }
    ]
  }
]

// 当前页面标题
const currentPageTitle = computed(() => {
  if (route.path.startsWith('/user/developer/api-keys')) return '访问密钥'

  const titles = {
    '/user/purchases': '交易记录',
    '/user/finance': '财务中心',
    '/user/settings': '个人设置',
    '/user/announcements': '系统公告',
    '/user/feedback': '问题反馈'
  }
  return titles[route.path] || '我的工作台'
})

// 页面描述
const pageDescription = computed(() => {
  if (route.path.startsWith('/user/developer/api-keys')) return '像其它列表页一样直接管理访问密钥；新建通过弹窗完成'

  const descriptions = {
    '/user/purchases': '查看所有奶片交易记录',
    '/user/finance': '管理奶片充值、提现和交易记录',
    '/user/settings': '管理个人信息和账户设置',
    '/user/announcements': '查看系统发布的公告信息',
    '/user/feedback': '提交问题反馈，查看处理进度和管理员回复'
  }
  return descriptions[route.path] || '欢迎使用工作台'
})

// 退出登录
const logout = () => {
  userStore.logout()
  router.push('/login')
}
</script>
