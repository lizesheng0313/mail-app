import api from '@/services/api'

export const pluginApi = {
  // 获取插件列表
  getPlugins() {
    return api.get('/plugins/list')
  },

  // 获取我的插件
  getMyPlugins() {
    return api.get('/plugins/my')
  },

  // 执行插件
  executePlugin(pluginId, action, parameters) {
    return api.post('/plugins/execute', {
      plugin_id: pluginId,
      action,
      parameters
    })
  },

  // 绑定插件
  bindPlugin(pluginId, expiresDays, config) {
    return api.post('/plugins/bind', {
      plugin_id: pluginId,
      expires_days: expiresDays,
      config
    })
  },

  // 更新插件配置
  updatePluginConfig(pluginId, config) {
    return api.put('/plugins/config', {
      plugin_id: pluginId,
      config
    })
  },

  // 启用/禁用插件
  togglePlugin(pluginId, action) {
    return api.post(`/plugins/${pluginId}/${action}`)
  },

  // 获取插件使用统计
  getPluginUsage(pluginId, days = 7) {
    return api.get(`/plugins/${pluginId}/usage`, { params: { days } })
  },

  // 重新加载插件
  reloadPlugin(pluginId) {
    return api.post(`/plugins/${pluginId}/reload`)
  },

  // 获取插件商店列表
  getStorePlugins(params) {
    return api.get('/plugin-store/browse', { params })
  },

  // 安装插件
  installPlugin(data) {
    return api.post('/plugin-store/install', data)
  },

  // 卸载插件
  uninstallPlugin(pluginId) {
    return api.delete(`/plugins/${pluginId}`)
  },

  // 获取插件配置
  getPluginConfig(pluginId) {
    return api.get(`/plugins/${pluginId}/config`)
  },

  // 获取插件统计
  getPluginStats(pluginId, days = 7) {
    return api.get(`/plugins/${pluginId}/stats`, { params: { days } })
  },

  // 获取插件评价
  getPluginReviews(pluginId) {
    return api.get(`/plugin-store/${pluginId}/reviews`)
  },

  // 获取插件支持的动作列表
  getPluginActions(pluginId) {
    return api.get(`/plugins/${pluginId}/actions`)
  },

  // 获取插件套餐
  getPluginPlans(pluginId) {
    return api.get(`/plugins/${pluginId}/plans`)
  },

  // 购买插件套餐
  purchasePluginPlan(pluginId, planId, authCode) {
    return api.post(`/plugins/${pluginId}/plans/${planId}/purchase`, {
      auth_code: authCode
    })
  },

  // 获取用户插件授权
  getUserPluginLicenses() {
    return api.get('/plugins/user/licenses')
  },

  // 检查用户是否有插件的有效授权
  checkPluginAuthorization(pluginId) {
    return api.get(`/plugin-store/check-authorization/${pluginId}`)
  },

  // ===== 插件购买相关 =====
  
  // 获取插件定价
  getPluginPricing(pluginId) {
    return api.get(`/plugins/purchase/pricing/${pluginId}`)
  },

  // 创建插件订单（PC支付）
  createPluginOrder(pluginId, pricingId) {
    return api.post('/plugins/purchase/create-order', {
      plugin_id: pluginId,
      pricing_id: pricingId
    })
  },

  // 创建插件订单（二维码支付）
  createPluginQrOrder(pluginId, pricingId) {
    return api.post('/plugins/purchase/create-qr-order', {
      plugin_id: pluginId,
      pricing_id: pricingId
    })
  },

  // 查询订单状态
  queryPluginOrder(orderNo) {
    return api.get(`/plugins/purchase/order/${orderNo}`, { timeout: 15000 })
  },

  // 获取我的订单列表
  getMyPluginOrders(page = 1, pageSize = 20) {
    return api.get('/plugins/purchase/my-orders', {
      params: { page, page_size: pageSize }
    })
  },

  // 使用奶片购买插件
  purchaseWithMilkCoins(pluginId, pricingId) {
    return api.post(`/plugin-store/${pluginId}/purchase-with-milk-coins`, {
      pricing_id: pricingId
    })
  }
}

export default pluginApi
