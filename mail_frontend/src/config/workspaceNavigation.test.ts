import { describe, expect, it } from 'vitest'
import {
  createWorkspaceMenu,
  externalMailboxTabs,
  getWorkspaceHome,
  isMenuItemActive
} from './workspaceNavigation'

const t = (key: string) => key
const menu = createWorkspaceMenu(t)

describe('Workspace navigation', () => {
  it('shows the same sections to guests while keeping public entries usable', () => {
    const guestMenu = createWorkspaceMenu(t, { publicHome: true, guest: true })
    expect(guestMenu.map((section) => section.name)).toEqual(menu.map((section) => section.name))
    expect(guestMenu[0].items[0].path).toBe('/')
    expect(isMenuItemActive(guestMenu[0].items[0], '/')).toBe(true)
    const account = guestMenu.find((section) => section.name === t('workspace.account'))
    expect(account?.items.map((item) => item.path)).toEqual([
      '/user/settings',
      '/user/resource-orders',
      '/user/finance'
    ])
    expect(isMenuItemActive(account!.items[2], '/user/purchases')).toBe(true)
    expect(guestMenu.flatMap((section) => section.items.map((item) => item.path))).not.toContain('/market')
    expect(guestMenu[guestMenu.length - 1].items[0].path).toBe('/tools/2fa-code')
  })

  it('keeps workspace actions reachable through the sidebar and mailbox tabs', () => {
    const paths = new Set(
      menu.flatMap((section) =>
        section.items.flatMap((item) => [
          'path' in item ? item.path : undefined,
          ...('children' in item ? item.children?.map((child) => child.path) || [] : [])
        ])
      )
    )
    externalMailboxTabs(t).forEach((item) => paths.add(item.path))
    for (const path of [
      '/user/automation/triggers',
      '/user/automation/workflows',
      '/user/resource-orders',
      '/user/automation/plugins',
      '/user/developer/api-keys',
      '/user/email-reach/dashboard',
      '/user/email-reach/templates',
      '/user/email-reach/members',
      '/user/email-reach/member-groups',
      '/user/email-reach/tasks',
      '/user/email-reach/records',
      '/user/email-reach/recipients',
      '/user/email-reach/unsubscribes',
      '/user/external-batch-verify',
      '/user/external-bulk-send',
      '/user/external-outbox',
      '/user/external-proxy-management',
      '/user/finance',
      '/user/settings'
    ])
      expect(paths.has(path), path).toBe(true)
    expect(paths.has('/market')).toBe(false)
    expect(paths.has('/user/external-batch-repair')).toBe(false)
    expect(paths.has('/user/external-group-management')).toBe(false)
    expect(paths.has('/user/automation/browser-workflows')).toBe(false)
  })

  it('selects the third-party mailbox section for each of its original tool routes', () => {
    const externalItem = menu[0].items[2]
    for (const tab of externalMailboxTabs(t))
      expect(isMenuItemActive(externalItem, tab.path)).toBe(true)
    expect(isMenuItemActive(externalItem, '/user/email-reach/tasks')).toBe(false)
  })

  it('keeps parent menus selected on detail pages without matching unrelated route prefixes', () => {
    const templates = { path: '/user/email-reach/templates' }
    expect(isMenuItemActive(templates, '/user/email-reach/templates/25/edit')).toBe(true)
    expect(isMenuItemActive(templates, '/user/email-reach/templates-extra')).toBe(false)
    const members = menu[2].items[2]
    expect(isMenuItemActive(members, '/user/email-reach/member-tags')).toBe(true)
  })

  it('opens the last mailbox type and falls back safely for invalid stored values', () => {
    expect(getWorkspaceHome()).toBe('/user/mailboxes/system')
    localStorage.setItem('portal_home_mailbox_type', 'external')
    expect(getWorkspaceHome()).toBe('/user/mailboxes/external')
    localStorage.setItem('portal_home_mailbox_type', 'invalid')
    expect(getWorkspaceHome()).toBe('/user/mailboxes/system')
  })
})
