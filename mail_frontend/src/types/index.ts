export interface User {
  id: number
  email: string
  username?: string
  nickname?: string
  display_name?: string
  nick_name?: string
  is_active: boolean
  is_admin?: boolean
  created_at: string
  last_login_at?: string
  daily_mailbox_limit: number
  used_mailboxes_today: number
  remaining_mailboxes_today: number
  // 兼容旧字段名
  daily_mailbox_quota?: number
  used_mailbox_quota?: number
  total_mailbox_quota?: number
}

export interface Mailbox {
  id: number
  email: string
  user_id?: number
  client_ip?: string
  is_active: boolean
  created_at: string
  expires_at?: string
  last_checked_at?: string
}

export interface Email {
  id: number
  mailbox_id: number
  sender: string
  recipient: string
  subject: string
  content: string
  contentHtml?: string
  email_date: string
  received_at: string
  is_read: boolean
  is_spam?: boolean
  folder?: string
  mailbox?: Mailbox
}

export interface AuthCode {
  id: number
  code: string
  code_type: string
  mailbox_quota: number
  is_used: boolean
  used_by?: number
  used_at?: string
  expires_at: string
  created_at: string
}

export interface AuthCodeType {
  type: string
  description: string
  quota: number
}

export interface EmailDomain {
  domain: string
  description: string
  category: string
}

export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: {
    items: T[]
    total: number
    page: number
    size: number
    pages: number
  }
}

export interface UserStats {
  total_mailboxes: number
  active_mailboxes: number
  total_emails: number
  unread_emails: number
  daily_quota_used: number
  daily_quota_total: number
}

export interface MailboxStats {
  total_count: number
  active_count: number
  temp_count: number
  user_count: number
}

export interface AuthCodeStats {
  total_codes: number
  used_codes: number
  available_codes: number
  by_type: Record<string, number>
}

export interface Domain {
  id: number
  domain_name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  expires_at?: string
}
