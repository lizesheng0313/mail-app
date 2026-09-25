import {
  EnvelopeIcon,
  GlobeAltIcon,
  InboxStackIcon,
  BoltIcon,
  CubeIcon,
  KeyIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  PaperAirplaneIcon,
  ListBulletIcon,
  NoSymbolIcon,
  BellSlashIcon,
  ShoppingCartIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  WalletIcon
} from '@heroicons/vue/24/outline'

export const WORKSPACE_HOME = '/user/mailboxes/system'
export const EXTERNAL_MAILBOX_HOME = '/user/mailboxes/external'

export const getWorkspaceHome = () => {
  try {
    const type = localStorage.getItem('portal_home_mailbox_type')
    if (type === 'hosted' || type === 'external') return `/user/mailboxes/${type}`
  } catch {
    // Restricted storage still has a usable default mailbox page.
  }
  return WORKSPACE_HOME
}

export const externalMailboxTabs = (t: (key: string) => string) => [
  { path: EXTERNAL_MAILBOX_HOME, label: t('mail.inbox') },
  { path: '/user/external-batch-verify', label: t('userLayout.batchVerify') },
  { path: '/user/external-bulk-send', label: t('userLayout.bulkSend') },
  { path: '/user/external-outbox', label: t('userLayout.outbox') },
  { path: '/user/external-proxy-management', label: t('userLayout.proxyManagement') }
]

export const createWorkspaceMenu = (
  t: (key: string) => string,
  options: { publicHome?: boolean; guest?: boolean } = {}
) => [
  {
    name: t('workspace.mailboxes'),
    items: [
      { path: options.publicHome ? '/' : WORKSPACE_HOME, label: t('home.temporaryMailbox'), icon: EnvelopeIcon },
      {
        path: '/user/mailboxes/hosted',
        label: t('home.hostedMailbox'),
        icon: GlobeAltIcon,
        matchPaths: ['/user/domains']
      },
      {
        path: EXTERNAL_MAILBOX_HOME,
        label: t('home.externalMailbox'),
        icon: InboxStackIcon,
        matchPaths: externalMailboxTabs(t).map((item) => item.path)
      }
    ]
  },
  {
    name: t('userLayout.automation'),
    items: [
      {
        path: '/user/automation/triggers',
        label: t('userLayout.automationTriggers'),
        icon: BoltIcon
      },
      {
        path: '/user/automation/workflows',
        label: t('userLayout.automationWorkflows'),
        icon: CubeIcon,
        matchPaths: ['/user/automation/execution-history']
      },
      { path: '/user/automation/plugins', label: t('userLayout.myPlugins'), icon: CubeIcon }
    ]
  },
  {
    name: t('userLayout.emailReach'),
    items: [
      {
        path: '/user/email-reach/dashboard',
        label: t('userLayout.emailReachDashboard'),
        icon: ChartBarIcon
      },
      {
        path: '/user/email-reach/templates',
        label: t('userLayout.emailReachTemplates'),
        icon: DocumentTextIcon
      },
      {
        path: '/user/email-reach/members',
        label: t('userLayout.emailReachMembers'),
        icon: UserGroupIcon,
        children: [
          { path: '/user/email-reach/members', label: t('workspace.memberList') },
          { path: '/user/email-reach/member-groups', label: t('userLayout.groupManagement') },
          { path: '/user/email-reach/member-tags', label: t('workspace.memberTags') }
        ]
      },
      { path: '/user/email-reach/tasks', label: t('workspace.sendTasks'), icon: PaperAirplaneIcon },
      {
        path: '/user/email-reach/records',
        label: t('workspace.activityRecords'),
        icon: ListBulletIcon
      },
      {
        path: '/user/email-reach/recipients',
        label: t('userLayout.emailReachRecipients'),
        icon: NoSymbolIcon
      },
      {
        path: '/user/email-reach/unsubscribes',
        label: t('userLayout.emailReachUnsubscribes'),
        icon: BellSlashIcon
      }
    ]
  },
  {
    name: t('workspace.developer'),
    items: [
      { path: '/user/developer/api-keys', label: t('userLayout.apiKeys'), icon: KeyIcon }
    ]
  },
  {
    name: t('workspace.account'),
    items: [
      { path: '/user/settings', label: t('userLayout.personalSettings'), icon: Cog6ToothIcon },
      { path: '/user/resource-orders', label: t('userLayout.resourceOrders'), icon: ShoppingCartIcon },
      {
        path: '/user/finance',
        label: t('userLayout.financeCenter'),
        icon: WalletIcon,
        matchPaths: ['/user/purchases']
      }
    ]
  },
  {
    name: t('workspace.tools'),
    items: [
      { path: options.guest ? '/tools/2fa-code' : '/user/tools/2fa-code', label: t('mail.footerTool2fa'), icon: ShieldCheckIcon }
    ]
  }
]

type MenuItem = { path?: string; matchPaths?: string[]; children?: MenuItem[] }

export const isMenuItemActive = (item: MenuItem, path: string): boolean =>
  [item.path, ...(item.matchPaths || [])].some(
    (candidate) => candidate && (candidate === path || path.startsWith(`${candidate}/`))
  ) || (item.children || []).some((child) => isMenuItemActive(child, path))
