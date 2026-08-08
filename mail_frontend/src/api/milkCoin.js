/**
 * 奶片系统 API
 */
import api from '@/services/api'

/**
 * 获取手续费配置（无需登录）
 */
export function getFeeConfig() {
  return api.get('/milk-coins/fee-config')
}

/**
 * 获取用户奶片余额 (从token自动获取user_id)
 */
export function getBalance() {
  return api.get('/milk-coins/balance')
}

/**
 * 获取交易记录 (从token自动获取user_id)
 */
export function getTransactions(params) {
  return api.get('/milk-coins/transactions', { params })
}

/**
 * 获取充值记录 (从token自动获取user_id)
 */
export function getRechargeRecords(params) {
  return api.get('/milk-coins/recharge-records', { params })
}

/**
 * 申请提现 (从token自动获取user_id)
 */
export function createWithdrawal(data) {
  return api.post('/milk-coins/withdraw', {
    amount: data.amount,
    account_type: data.account_type,
    account_name: data.account_name,
    account_no: data.account_no
  })
}

/**
 * 获取奶片统计 (从token自动获取user_id)
 */
export function getMilkCoinStats() {
  return api.get('/milk-coins/stats')
}
