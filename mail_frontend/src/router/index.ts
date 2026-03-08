import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 普通用户页面组件 - 懒加载
const Dashboard = () => import('@/views/portal/home/index.vue')
const Login = () => import('@/views/portal/login/index.vue')
const GoogleCallback = () => import('@/views/portal/auth/GoogleCallback.vue')
const GoogleSuccess = () => import('@/views/portal/auth/GoogleSuccess.vue')
const GoogleChoose = () => import('@/views/portal/auth/GoogleChoose.vue')
const Profile = () => import('@/views/portal/profile/index.vue')
const Feedback = () => import('@/views/portal/feedback/index.vue')
const PluginManagement = () => import('@/views/portal/plugins/index.vue')
const PluginStore = () => import('@/views/portal/plugin-store/index.vue')
const AutomationCenter = () => import('@/views/portal/automation/index.vue')
const AutomationTriggers = () => import('@/views/portal/automation/triggers/index.vue')
const AutomationWorkflows = () => import('@/views/portal/automation/workflows/index.vue')
const PublishWorkflow = () => import('@/views/portal/workflows/publish/index.vue')
const ExecutionHistory = () => import('@/views/portal/workflows/execution-history/index.vue')
const ProxyManagement = () => import('@/views/portal/proxy/index.vue')
const PaymentPage = () => import('@/views/portal/payment/index.vue')
const AboutPage = () => import('@/views/portal/about/index.vue')
// BatchLogin 已整合到首页，不再需要单独页面

// 管理后台组件 - 只有管理员访问时才加载
const AdminLayout = () => import('@/layouts/AdminLayout.vue')
const AuthCodeManage = () => import('@/views/admin/authManage/index.vue')
const DomainManage = () => import('@/views/admin/domain/index.vue')
const FeedbackManage = () => import('@/views/admin/feedbackManage/index.vue')
const MonitoringDashboard = () => import('@/views/admin/monitoring/index.vue')
const AdminProxyManagement = () => import('@/views/admin/proxy-management/index.vue')
const AdminUserManagement = () => import('@/views/admin/user-management/index.vue')
const WorkflowReview = () => import('@/views/admin/workflow-review/index.vue')
const FinanceSettlement = () => import('@/views/admin/finance-settlement/index.vue')
const AnnouncementManagement = () => import('@/views/admin/announcement-management/index.vue')
const TransactionManagement = () => import('@/views/admin/transaction-management/index.vue')
const MiniappManagement = () => import('@/views/admin/miniapp-management/index.vue')
const MiniappConfig = () => import('@/views/admin/miniapp-config/index.vue')

// 用户中心组件
const UserLayout = () => import('@/layouts/UserLayout.vue')
const UserPurchases = () => import('@/views/user/purchases/index.vue')
const UserOrders = () => import('@/views/user/orders/index.vue')
const UserFinance = () => import('@/views/user/finance/index.vue')
const UserSettings = () => import('@/views/user/settings/index.vue')
const UserAnnouncements = () => import('@/views/user/announcements/index.vue')

// 工作流市场组件
const WorkflowMarket = () => import('@/views/market/index.vue')
const WorkflowDetail = () => import('@/views/market/detail.vue')

// 邮箱分享页面（无需登录）
const ShareMailbox = () => import('@/views/portal/share/index.vue')

// 下载页面（无需登录）
const DownloadPage = () => import('@/views/download/index.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/auth/google/callback',
      name: 'google-callback',
      component: GoogleCallback
    },
    {
      path: '/auth/google/success',
      name: 'google-success',
      component: GoogleSuccess
    },
    {
      path: '/auth/google/choose',
      name: 'google-choose',
      component: GoogleChoose
    },
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard
    },
    // 个人中心 - 包含Google账号绑定
    {
      path: '/profile',
      name: 'profile',
      component: Profile,
      meta: { requiresAuth: true }
    },
    {
      path: '/feedback',
      name: 'feedback',
      component: Feedback,
      meta: { requiresAuth: true }
    },
    {
      path: '/plugins',
      name: 'plugins',
      component: PluginManagement,
      meta: { requiresAuth: true }
    },
    {
      path: '/plugin-store',
      name: 'plugin-store',
      component: PluginStore,
      meta: { requiresAuth: true }
    },
    {
      path: '/automation',
      name: 'automation',
      component: AutomationCenter,
      meta: { requiresAuth: true }
    },
    {
      path: '/automation/triggers',
      name: 'automation-triggers',
      component: AutomationTriggers,
      meta: { requiresAuth: true }
    },
    {
      path: '/automation/workflows',
      name: 'automation-workflows',
      component: AutomationWorkflows,
      meta: { requiresAuth: true }
    },
    {
      path: '/workflows/execution-history',
      name: 'execution-history',
      component: ExecutionHistory,
      meta: { requiresAuth: true }
    },
    {
      path: '/workflows/publish',
      name: 'publish-workflow',
      component: PublishWorkflow,
      meta: { requiresAuth: true }
    },

    {
      path: '/proxy',
      name: 'proxy',
      component: ProxyManagement,
      meta: { requiresAuth: true }
    },
    {
      path: '/payment',
      name: 'payment',
      component: PaymentPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/purchase',
      redirect: '/payment'
    },
    {
      path: '/about',
      name: 'about',
      component: AboutPage
    },
    // 工作流市场（无需登录即可浏览，购买时才需要登录）
    {
      path: '/market',
      name: 'workflow-market',
      component: WorkflowMarket
    },
    {
      path: '/market/workflow/:id',
      name: 'workflow-detail',
      component: WorkflowDetail
    },

    // 邮箱分享页面（无需登录）
    {
      path: '/share/:token',
      name: 'share-mailbox',
      component: ShareMailbox
    },

    // 下载页面（无需登录）
    {
      path: '/download',
      name: 'download',
      component: DownloadPage
    },

    // 用户中心
    {
      path: '/user',
      component: UserLayout,
      redirect: '/user/purchases',
      meta: { requiresAuth: true },
      children: [
        {
          path: 'purchases',
          name: 'user-purchases',
          component: UserPurchases
        },
        {
          path: 'orders',
          name: 'user-orders',
          component: UserOrders
        },
        {
          path: 'finance',
          name: 'user-finance',
          component: UserFinance
        },
        {
          path: 'settings',
          name: 'user-settings',
          component: UserSettings
        },
        {
          path: 'announcements',
          name: 'user-announcements',
          component: UserAnnouncements
        }
      ]
    },

    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: 'auth-codes',
          name: 'admin-auth-codes',
          component: AuthCodeManage
        },
        {
          path: 'domains',
          name: 'admin-domains',
          component: DomainManage
        },
        {
          path: 'feedback',
          name: 'admin-feedback',
          component: FeedbackManage
        },
        {
          path: 'monitoring',
          name: 'admin-monitoring',
          component: MonitoringDashboard
        },
        {
          path: 'proxy',
          name: 'admin-proxy',
          component: AdminProxyManagement
        },
        {
          path: 'users',
          name: 'admin-users',
          component: AdminUserManagement
        },
        {
          path: 'workflow-review',
          name: 'admin-workflow-review',
          component: WorkflowReview
        },
        {
          path: 'finance-settlement',
          name: 'admin-finance-settlement',
          component: FinanceSettlement
        },
        {
          path: 'announcements',
          name: 'admin-announcements',
          component: AnnouncementManagement
        },
        {
          path: 'miniapp-management',
          name: 'admin-miniapp-management',
          component: MiniappManagement
        },
        {
          path: 'miniapp-config',
          name: 'admin-miniapp-config',
          component: MiniappConfig
        },
        {
          path: 'transactions',
          name: 'admin-transactions',
          component: TransactionManagement
        }
      ]
    },
    {
      // 通配符路由 - 必须放在最后
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      redirect: '/'
    }
  ]
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore()

  // 检查本地存储的认证状态（只在初始加载时检查一次）
  if (!userStore.isAuthenticated && !userStore.user) {
    userStore.checkAuth()
  }

  // 如果要访问登录页面且用户已认证，重定向到首页
  if (to.path === '/login' && userStore.isAuthenticated) {
    next('/')
    return
  }

  // 检查需要认证的路由
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next('/login')
    return
  }

  // 检查需要管理员权限的路由
  if (to.meta.requiresAdmin) {
    if (!userStore.isAuthenticated) {
      next('/login')
      return
    }

    // 确保用户数据已加载
    if (!userStore.user) {
      try {
        const result = await userStore.updateUserProfile()
        if (result && !result.success) {
          userStore.logout()
          next('/login')
          return
        }
      } catch (error) {
        userStore.logout()
        next('/login')
        return
      }
    }

    // 检查管理员权限
    if (!(userStore.user as any)?.is_admin) {
      next('/')
      return
    }
  }

  next()
})

export default router
