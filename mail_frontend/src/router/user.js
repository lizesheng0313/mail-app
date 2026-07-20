import UserLayout from '@/layouts/UserLayout.vue'

// 用户中心路由配置
const userRoutes = [
  {
    path: '/user',
    component: UserLayout,
    redirect: '/user/purchases',
    meta: { requiresAuth: true },
    children: [
      // 交易记录
      {
        path: 'purchases',
        name: 'MyPurchases',
        component: () => import('@/views/user/purchases/index.vue'),
        meta: { title: '交易记录' }
      },
      {
        path: 'resource-orders',
        name: 'ResourceOrders',
        component: () => import('@/views/user/resource-orders/index.vue'),
        meta: { title: '我的订单' }
      },
      // 财务中心
      {
        path: 'finance',
        name: 'FinanceCenter',
        component: () => import('@/views/user/finance/index.vue'),
        meta: { title: '财务中心' }
      },
      // 个人设置
      {
        path: 'settings',
        name: 'UserSettings',
        component: () => import('@/views/user/settings/index.vue'),
        meta: { title: '个人设置' }
      }
    ]
  },
  // 工作流市场（独立布局）
  {
    path: '/market',
    name: 'WorkflowMarket',
    component: () => import('@/views/market/index.vue'),
    meta: { title: '工作流市场' }
  },
  {
    path: '/market/detail/:id',
    name: 'WorkflowDetail',
    component: () => import('@/views/market/detail.vue'),
    meta: { title: '工作流详情' }
  }
]

export default userRoutes
