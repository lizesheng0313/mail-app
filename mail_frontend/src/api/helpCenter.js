import api from '@/services/api'

export const helpCenterAPI = {
  listPublicArticles() {
    return api.get('/help-center/articles')
  },

  listAdminArticles() {
    return api.get('/help-center/admin/articles')
  },

  saveArticle(articleKey, data) {
    return api.put(`/help-center/admin/articles/${encodeURIComponent(articleKey)}`, data)
  },

  deleteArticle(articleKey) {
    return api.delete(`/help-center/admin/articles/${encodeURIComponent(articleKey)}`)
  },

  uploadImage(file) {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/image', formData)
  },
}

export default helpCenterAPI
