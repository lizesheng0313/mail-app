import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Mailbox } from '@/types'
import { mailboxAPI } from '@/api/mailbox'

export const useMailboxStore = defineStore('mailbox', () => {
  const mailboxes = ref<Mailbox[]>([])
  const loading = ref(false)
  const tempMailbox = ref<Mailbox | null>(null)

  // 分页相关状态
  const totalMailboxes = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(50)
  const totalPages = ref(0)

  const normalizeMailbox = (mailbox: any): Mailbox => ({
    id: mailbox.id,
    email: mailbox.email,
    created_at: mailbox.created_at,
    expires_at: mailbox.expires_at,
    is_active: mailbox.is_active !== undefined ? mailbox.is_active : true,
    user_id: mailbox.user_id
  })

  const applyPagination = (pagination?: any, fallbackCount = mailboxes.value.length) => {
    if (pagination) {
      totalMailboxes.value = Number(pagination.total || fallbackCount || 0)
      totalPages.value = Number(pagination.total_pages || 0)
      currentPage.value = Number(pagination.page || 1)
      pageSize.value = Number(pagination.page_size || pageSize.value || 50)
      return
    }

    totalMailboxes.value = fallbackCount
    totalPages.value = fallbackCount > 0 ? 1 : 0
    currentPage.value = 1
  }

  const replaceMailboxes = (items: any[] = [], pagination?: any) => {
    mailboxes.value = items.map(normalizeMailbox)
    applyPagination(pagination, mailboxes.value.length)
  }

  const upsertMailboxes = (items: any[] = []) => {
    if (!items.length) return

    let addedCount = 0
    const nextMailboxes = [...mailboxes.value]

    for (const rawItem of items) {
      const mailbox = normalizeMailbox(rawItem)
      const index = nextMailboxes.findIndex((item) => Number(item.id) === Number(mailbox.id))
      if (index >= 0) {
        nextMailboxes[index] = { ...nextMailboxes[index], ...mailbox }
      } else {
        nextMailboxes.unshift(mailbox)
        addedCount += 1
      }
    }

    mailboxes.value = nextMailboxes
    if (addedCount > 0) {
      totalMailboxes.value += addedCount
      totalPages.value = Math.max(1, Math.ceil(totalMailboxes.value / (pageSize.value || 50)))
    }
  }

  const removeMailboxes = (ids: number[] = []) => {
    const idSet = new Set(ids.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))
    if (!idSet.size) return

    const originalCount = mailboxes.value.length
    mailboxes.value = mailboxes.value.filter((item) => !idSet.has(Number(item.id)))
    const removedCount = originalCount - mailboxes.value.length
    if (removedCount > 0) {
      totalMailboxes.value = Math.max(0, totalMailboxes.value - removedCount)
      totalPages.value = totalMailboxes.value > 0 ? Math.max(1, Math.ceil(totalMailboxes.value / (pageSize.value || 50))) : 0
    }
  }

  const fetchMailboxes = async (page: number = 1, pageSizeParam: number = 50) => {
    loading.value = true
    try {
      const response: any = await mailboxAPI.getMailboxes({ page, page_size: pageSizeParam })
      if (response.code === 0 && response.data) {
        const mailboxData = response.data.mailboxes || []
        const paginationData = response.data.pagination

        if (paginationData) {
          replaceMailboxes(mailboxData, paginationData)
        } else {
          replaceMailboxes(mailboxData)
        }

        return { success: true, data: response.data }
      }
      return { success: false, error: response.message }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.detail || '获取邮箱列表失败'
      }
    } finally {
      loading.value = false
    }
  }

  const getTempMailbox = async () => {
    loading.value = true
    try {
      const response: any = await mailboxAPI.getTempMailbox()
      // 处理后端返回的 {code: 0, message: "", data: {}} 格式
      if (response.code === 0 && response.data) {
        // 后端返回的临时邮箱字段是 'email'，需要映射到前端使用的格式
        tempMailbox.value = {
          id: response.data.id,
          email: response.data.email, // 后端返回的是 'email' 字段
          created_at: response.data.created_at,
          expires_at: response.data.expires_at
        }
        return { success: true, data: tempMailbox.value }
      }
      return { success: false, error: response.message }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.detail || '获取临时邮箱失败'
      }
    } finally {
      loading.value = false
    }
  }

  const allocateMailbox = async () => {
    loading.value = true
    try {
      const response: any = await mailboxAPI.allocateMailbox()
      if (response.code === 0 && response.data) {
        // 申请成功后重新获取邮箱列表，确保数据同步
        await fetchMailboxes()
        return { success: true, data: response.data }
      }
      return { success: false, error: response.message }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.detail || '申请邮箱失败'
      }
    } finally {
      loading.value = false
    }
  }

  const deleteMailbox = async (id: number) => {
    loading.value = true
    try {
      const response: any = await mailboxAPI.deleteMailbox(id)
      if (response.code === 0) {
        const index = mailboxes.value.findIndex(m => m.id === id)
        if (index > -1) {
          mailboxes.value.splice(index, 1)
        }

        // 删除成功，邮件会通过数据库级联删除自动清理

        return { success: true, message: response.message }
      }
      return { success: false, error: response.message }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.detail || '删除邮箱失败'
      }
    } finally {
      loading.value = false
    }
  }

  const getStats = async () => {
    try {
      const response: any = await mailboxAPI.getStats()
      if (response.code === 0) {
        return { success: true, data: response.data }
      }
      return { success: false, error: response.message }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.detail || '获取统计信息失败'
      }
    }
  }

  return {
    mailboxes,
    tempMailbox,
    loading,
    totalMailboxes,
    currentPage,
    pageSize,
    totalPages,
    fetchMailboxes,
    getTempMailbox,
    allocateMailbox,
    deleteMailbox,
    replaceMailboxes,
    upsertMailboxes,
    removeMailboxes,
    getStats
  }
})
