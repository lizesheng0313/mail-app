import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Email } from '@/types'
import { emailAPI } from '@/api/email'

export const useMailStore = defineStore('mail', () => {
  const emails = ref<Email[]>([])
  const loading = ref(false)
  const selectedEmail = ref<Email | null>(null)
  const totalEmails = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const totalPages = ref(0)
  const searchKeyword = ref('')

  const applyPagination = (pagination?: any, fallbackCount = emails.value.length) => {
    if (pagination) {
      totalEmails.value = Number(pagination.total || fallbackCount || 0)
      totalPages.value = Number(pagination.total_pages || 0)
      currentPage.value = Number(pagination.page || 1)
      pageSize.value = Number(pagination.page_size || pageSize.value || 20)
      return
    }

    totalEmails.value = fallbackCount
    totalPages.value = fallbackCount > 0 ? 1 : 0
    currentPage.value = 1
  }

  const replaceEmails = (items: any[] = [], pagination?: any) => {
    emails.value = [...items]
    applyPagination(pagination, emails.value.length)
  }

  const upsertEmails = (items: any[] = []) => {
    if (!items.length) return

    let addedCount = 0
    const nextEmails = [...emails.value]
    for (const email of items) {
      const emailId = Number(email?.id)
      if (!Number.isFinite(emailId) || emailId <= 0) continue

      const index = nextEmails.findIndex((item) => Number(item.id) === emailId)
      if (index >= 0) {
        nextEmails[index] = { ...nextEmails[index], ...email }
      } else {
        nextEmails.unshift(email)
        addedCount += 1
      }
    }

    emails.value = nextEmails
    if (addedCount > 0) {
      totalEmails.value += addedCount
      totalPages.value = Math.max(1, Math.ceil(totalEmails.value / (pageSize.value || 20)))
    }
  }

  const removeEmails = (ids: number[] = []) => {
    const idSet = new Set(ids.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))
    if (!idSet.size) return

    const originalCount = emails.value.length
    emails.value = emails.value.filter((email) => !idSet.has(Number(email.id)))
    const removedCount = originalCount - emails.value.length

    if (selectedEmail.value && idSet.has(Number(selectedEmail.value.id))) {
      selectedEmail.value = null
    }

    if (removedCount > 0) {
      totalEmails.value = Math.max(0, totalEmails.value - removedCount)
      totalPages.value = totalEmails.value > 0 ? Math.max(1, Math.ceil(totalEmails.value / (pageSize.value || 20))) : 0
    }
  }

  // 获取指定邮箱的所有邮件
  const fetchMailboxEmails = async (mailboxId: number, params?: any, silent: boolean = false, signal?: AbortSignal) => {
    if (!silent) loading.value = true
    try {
      const response: any = await emailAPI.getMailboxEmails(mailboxId, params, signal)
      if (response.code === 0 && response.data) {
        emails.value = response.data.emails || []
        totalEmails.value = response.data.pagination?.total || 0
        totalPages.value = response.data.pagination?.total_pages || 0
        currentPage.value = response.data.pagination?.page || 1
        return { success: true, data: response.data }
      } else {
        return { success: false, error: response.message }
      }
    } catch (error: any) {
      // 如果是请求被取消，不返回错误
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        return { success: false, error: 'canceled' }
      }
      return {
        success: false,
        error: error.response?.data?.message || '获取邮件列表失败'
      }
    } finally {
      if (!silent) loading.value = false
    }
  }

  // 获取当前用户所有邮件（分页）
  const fetchUserEmails = async (page: number = 1, pageSize: number = 20, silent: boolean = false, unread?: boolean, search?: string) => {
    if (!silent) loading.value = true
    try {
      const params: any = { page, page_size: pageSize }
      if (unread === true) {
        params.unread = true
      }
      if (search && search.trim()) {
        params.search = search.trim()
      }
      
      const response: any = await emailAPI.getUserEmails(params)
      if (response.code === 0 && response.data) {
        emails.value = response.data.emails || []
        totalEmails.value = response.data.pagination?.total || 0
        totalPages.value = response.data.pagination?.total_pages || 0
        currentPage.value = response.data.pagination?.page || 1
        return { success: true, data: response.data }
      } else {
        return { success: false, error: response.message }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '获取邮件列表失败'
      }
    } finally {
      if (!silent) loading.value = false
    }
  }





  const fetchEmailDetail = async (id: number, type: string = 'system') => {
    loading.value = true
    try {
      const response: any = await emailAPI.getEmail(id, type)

      if (response.code === 0 && response.data) {
        selectedEmail.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, error: response.message }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '获取邮件详情失败'
      }
    } finally {
      loading.value = false
    }
  }

  const markAsRead = async (id: number, type: string = 'system') => {
    try {
      const response: any = await emailAPI.markAsRead(id, type)
      if (response.code === 0) {
        const email = emails.value.find(e => e.id === id)
        if (email) {
          email.is_read = true
        }
        if (selectedEmail.value && selectedEmail.value.id === id) {
          selectedEmail.value.is_read = true
        }
        return { success: true, message: response.message }
      }
      return { success: false, error: response.message }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '标记已读失败'
      }
    }
  }

  const deleteEmail = async (id: number, type: string = 'system') => {
    try {
      const response: any = await emailAPI.deleteEmail(id, type)
      if (response.code === 0) {
        const index = emails.value.findIndex(e => e.id === id)
        if (index > -1) {
          emails.value.splice(index, 1)
          totalEmails.value--
        }
        // 如果删除的是当前选中的邮件，清空选中状态
        if (selectedEmail.value && selectedEmail.value.id === id) {
          selectedEmail.value = null
        }
        return { success: true, message: response.message || '删除成功' }
      }
      return { success: false, error: response.message || '删除失败' }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || error.response?.data?.message || '删除邮件失败'
      }
    }
  }

  const selectEmail = async (email: any) => {
    selectedEmail.value = email
    if (!email.is_read) {
      const type = email.mailbox_type === 'external' ? 'external' : 'system'
      await markAsRead(email.id, type)
    }
  }

  const getUnreadCount = () => {
    return emails.value.filter(email => !email.is_read).length
  }

  // 清理邮件列表（删除邮箱时使用）
  const clearEmails = () => {
    emails.value = []
    selectedEmail.value = null
    totalEmails.value = 0
    totalPages.value = 0
    currentPage.value = 1
  }

  // 从邮件列表中移除指定邮箱的所有邮件
  const removeEmailsByMailbox = (mailboxId: number) => {
    const originalCount = emails.value.length
    emails.value = emails.value.filter(email => email.mailbox_id !== mailboxId)
    const removedCount = originalCount - emails.value.length

    if (removedCount > 0) {
      totalEmails.value = Math.max(0, totalEmails.value - removedCount)
      // 如果当前选中的邮件被删除了，清空选中状态
      if (selectedEmail.value && selectedEmail.value.mailbox_id === mailboxId) {
        selectedEmail.value = null
      }
    }
  }

  const getEmailsByMailbox = (mailboxId: number) => {
    return emails.value.filter(email => email.mailbox_id === mailboxId)
  }

  const removeEmailsByMailboxIds = (mailboxIds: number[] = []) => {
    const idSet = new Set(
      mailboxIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
    )
    if (!idSet.size) return

    const originalCount = emails.value.length
    emails.value = emails.value.filter((email) => !idSet.has(Number(email.mailbox_id)))
    const removedCount = originalCount - emails.value.length

    if (selectedEmail.value && idSet.has(Number(selectedEmail.value.mailbox_id))) {
      selectedEmail.value = null
    }

    if (removedCount > 0) {
      totalEmails.value = Math.max(0, totalEmails.value - removedCount)
      totalPages.value = totalEmails.value > 0 ? Math.max(1, Math.ceil(totalEmails.value / (pageSize.value || 20))) : 0
    }
  }



  return {
    emails,
    loading,
    selectedEmail,
    totalEmails,
    totalPages,
    currentPage,
    pageSize,
    searchKeyword,
    fetchUserEmails,
    fetchMailboxEmails,
    replaceEmails,
    upsertEmails,
    removeEmails,
    fetchEmailDetail,
    markAsRead,
    deleteEmail,
    selectEmail,
    getUnreadCount,
    getEmailsByMailbox,
    clearEmails,
    removeEmailsByMailbox,
    removeEmailsByMailboxIds
  }
})
