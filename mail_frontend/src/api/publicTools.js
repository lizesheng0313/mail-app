import api from '@/services/api'

export const publicToolsAPI = {
  checkDns: (domain, selector = 'default') =>
    api.get('/public-tools/dns-check', {
      params: { domain, selector },
      suppressErrorMessage: true
    })
}

export default publicToolsAPI
