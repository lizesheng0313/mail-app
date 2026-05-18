import api from '@/services/api'

const DEFAULT_MAX_IMAGE_SIZE = 5 * 1024 * 1024

export const uploadImageFile = async (file, options = {}) => {
  const maxSize = options.maxSize || DEFAULT_MAX_IMAGE_SIZE

  if (!file) {
    throw new Error('请选择图片')
  }

  if (file.size > maxSize) {
    throw new Error(`图片不能超过 ${Math.floor(maxSize / 1024 / 1024)}MB`)
  }

  const uploadFormData = new FormData()
  uploadFormData.append('file', file)

  const res = await api.post('/upload/image', uploadFormData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: options.params || (options.purpose ? { purpose: options.purpose } : undefined)
  })

  if (res.code === 0 && res.data?.url) {
    return {
      url: res.data.url,
      filename: res.data.filename || '',
      size: res.data.size || file.size
    }
  }

  throw new Error(res.message || '图片上传失败')
}

export default uploadImageFile
