import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 普通用户页面组件 - 懒加载
const Dashboard = () => import('@/views/portal/home/index.vue')
const Login = () => import('@/views/portal/login/index.vue')
const GoogleSuccess = () => import('@/views/portal/auth/GoogleSuccess.vue')
const GoogleChoose = () => import('@/views/portal/auth/GoogleChoose.vue')
const Profile = () => import('@/views/portal/profile/index.vue')
const Feedback = () => import('@/views/portal/feedback/index.vue')
const OpenPlatformPage = () => import('@/views/portal/open-platform/index.vue')
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
const PrivacyPolicyPage = () => import('@/views/portal/legal/PrivacyPolicy.vue')
const TermsOfServicePage = () => import('@/views/portal/legal/TermsOfService.vue')
// BatchLogin 已整合到首页，不再需要单独页面

// 管理后台组件 - 只有管理员访问时才加载
const AdminLayout = () => import('@/layouts/AdminLayout.vue')
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
const UserDeveloper = () => import('@/views/user/developer/index.vue')
const UserDomains = () => import('@/views/user/domains/index.vue')

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
      component: Login,
      meta: {
        seo: {
          title: '登录肥猫猫',
          description: '登录肥猫猫，统一管理邮箱、第三方邮箱接入和邮件自动化工作流。',
          canonicalPath: '/login'
        }
      }
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
      component: Dashboard,
      meta: {
        seo: {
          title: '肥猫猫 - 邮箱管理、第三方邮箱接入与邮件自动化平台',
          description:
            '肥猫猫提供邮箱管理、第三方邮箱接入、批量收发、工作流市场和邮件自动化工具，帮助个人和团队更高效地处理多邮箱任务。',
          keywords:
            '邮箱管理,第三方邮箱,邮件自动化,多邮箱管理,邮件工具,工作流市场,workflow marketplace',
          canonicalPath: '/'
        }
      }
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
      redirect: '/user/feedback'
    },
    {
      path: '/open-platform/:section?',
      name: 'open-platform',
      component: OpenPlatformPage,
      meta: {
        seo: {
          title: '开放平台 - API、工具描述与 AI 接入',
          description: '查看开放平台接口、工具描述、OpenClaw 接入和 AI 调用方式。',
          canonicalPath: '/open-platform'
        }
      }
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
      component: AboutPage,
      meta: {
        seo: {
          title: '关于肥猫猫 - 邮箱管理与邮件自动化平台',
          description:
            '了解肥猫猫的产品定位与服务能力。我们提供邮箱管理、第三方邮箱接入、工作流市场和邮件自动化解决方案。',
          keywords: '关于我们, 邮箱管理, 第三方邮箱, 邮件自动化, 工作流市场, 肥猫猫',
          canonicalPath: '/about'
        }
      }
    },
    {
      path: '/privacy-policy',
      name: 'privacy-policy',
      component: PrivacyPolicyPage,
      meta: {
        seo: {
          title: '隐私权政策 - 肥猫猫',
          description:
            '查看肥猫猫平台隐私权政策，了解个人信息收集、使用、存储和保护方式。',
          keywords: '隐私权政策, 隐私政策, 邮箱管理, 肥猫猫',
          canonicalPath: '/privacy-policy'
        }
      }
    },
    {
      path: '/terms-of-service',
      name: 'terms-of-service',
      component: TermsOfServicePage,
      meta: {
        seo: {
          title: '服务条款 - 肥猫猫',
          description:
            '查看肥猫猫平台服务条款，了解账号使用规范、服务边界与责任说明。',
          keywords: '服务条款, 用户协议, 邮箱管理, 肥猫猫',
          canonicalPath: '/terms-of-service'
        }
      }
    },
    // 工作流市场（无需登录即可浏览，购买时才需要登录）
    {
      path: '/market',
      name: 'workflow-market',
      component: WorkflowMarket,
      meta: {
        seo: {
          title: '工作流市场 - 邮箱管理与邮件自动化模板',
          description:
            '在肥猫猫工作流市场浏览邮箱管理、邮件自动化模板、插件与数字资源，快速找到适合第三方邮箱接入、收发处理和数据流转的工作流。',
          keywords: '工作流市场, 邮箱管理模板, 邮件自动化模板, 数字资源, 插件市场, workflow marketplace',
          canonicalPath: '/market'
        }
      }
    },
    {
      path: '/market/workflow/:id',
      name: 'workflow-detail',
      component: WorkflowDetail,
      meta: {
        seo: {
          title: '工作流详情 - 邮件自动化模板',
          description:
            '查看工作流模板的功能说明、价格、作者信息和用户评价，判断它是否适合你的邮件自动化场景。',
          keywords: '工作流详情, 邮件自动化模板, 工作流市场, 肥猫猫'
        }
      }
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
      component: DownloadPage,
      meta: {
        seo: {
          title: '下载邮箱管理客户端 - macOS 与 Windows',
          description:
            '下载肥猫猫邮箱管理客户端，支持 macOS 和 Windows，方便进行第三方邮箱接入、多邮箱管理、邮件收取和自动化处理。',
          keywords: '邮箱管理客户端, macOS 邮件客户端, Windows 邮件客户端, 第三方邮箱, 肥猫猫下载',
          canonicalPath: '/download'
        }
      }
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
          path: 'domains',
          name: 'user-domains',
          component: UserDomains,
          meta: { requiresAdmin: true }
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
        },
        {
          path: 'feedback',
          name: 'user-feedback',
          component: Feedback
        },
        {
          path: 'developer',
          redirect: '/user/developer/api-keys'
        },
        {
          path: 'developer/:section',
          name: 'user-developer',
          component: UserDeveloper
        }
      ]
    },

    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
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
