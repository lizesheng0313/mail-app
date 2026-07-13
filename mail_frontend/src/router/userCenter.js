// 用户管理中心路由配置
// 简化的菜单结构，不创建太多菜单

export const userCenterRoutes = [
  {
    path: '/user',
    component: () => import('@/layouts/UserLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      // 概览页
      {
        path: 'dashboard',
        name: 'UserDashboard',
        component: () => import('@/views/user/Dashboard.vue'),
        meta: {
          title: '概览',
          icon: 'dashboard'
        }
      },

      // 我的工作流（一个列表，通过状态筛选）
      {
        path: 'workflows',
        name: 'MyWorkflows',
        component: () => import('@/views/user/MyWorkflows.vue'),
        meta: {
          title: '我的工作流',
          icon: 'workflow'
        }
      },

      // 工作流监控（查看收益和调用）
      {
        path: 'workflow-monitor',
        name: 'WorkflowMonitor',
        component: () => import('@/views/user/WorkflowMonitor.vue'),
        meta: {
          title: '工作流监控',
          icon: 'monitor'
        }
      },

      // 交易记录
      {
        path: 'purchases',
        name: 'MyPurchases',
        component: () => import('@/views/user/purchases/index.vue'),
        meta: {
          title: '交易记录',
          icon: 'shopping'
        }
      },

      // 财务中心
      {
        path: 'finance',
        name: 'FinanceCenter',
        component: () => import('@/views/user/finance/index.vue'),
        meta: {
          title: '财务中心',
          icon: 'money'
        }
      },

      // 系统公告
      {
        path: 'announcements',
        name: 'UserAnnouncements',
        component: () => import('@/views/user/announcements/index.vue'),
        meta: {
          title: '系统公告',
          icon: 'bell'
        }
      },

      // 通知中心
      {
        path: 'notifications',
        name: 'UserNotifications',
        component: () => import('@/views/user/notifications/index.vue'),
        meta: {
          title: '通知中心',
          icon: 'bell'
        }
      },

      // 个人设置
      {
        path: 'settings',
        name: 'UserSettings',
        component: () => import('@/views/user/settings/index.vue'),
        meta: {
          title: '个人设置',
          icon: 'setting'
        }
      }
    ]
  },

  // 工作流市场（独立页面）
  {
    path: '/market',
    component: () => import('@/layouts/MarketLayout.vue'),
    children: [
      {
        path: '',
        name: 'WorkflowMarket',
        component: () => import('@/views/market/Index.vue'),
        meta: {
          title: '工作流市场'
        }
      },
      {
        path: 'detail/:id',
        name: 'WorkflowDetail',
        component: () => import('@/views/market/Detail.vue'),
        meta: {
          title: '工作流详情'
        }
      }
    ]
  }
]
