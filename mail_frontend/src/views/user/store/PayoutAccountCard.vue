<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="border-b border-slate-100 px-5 py-5 sm:px-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <CreditCardIcon class="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 class="text-base font-semibold text-slate-900">收款账户</h2>
          </div>
          <p class="mt-2 text-sm leading-6 text-slate-500">填写真实收款人和账号，提现申请会使用选定的账户。</p>
        </div>
        <span v-if="defaultAccount" class="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">已绑定</span>
      </div>
    </div>

    <div class="space-y-4 px-5 py-5 sm:px-6">
      <p v-if="loading" class="text-sm text-slate-500">正在加载收款账户…</p>
      <div v-else-if="error" class="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        {{ error }}
        <button type="button" class="ml-2 font-medium underline" @click="$emit('refresh')">重试</button>
      </div>
      <template v-else>
        <div v-if="accounts.length" class="space-y-2">
          <div v-for="account in accounts" :key="account.id" class="rounded-xl border p-3.5" :class="account.is_default ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-slate-900">{{ typeLabel(account.account_type) }}</span>
                  <span v-if="account.is_default" class="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">默认收款</span>
                </div>
                <p class="mt-1 text-sm text-slate-700">{{ account.account_name }}</p>
                <p class="mt-0.5 text-xs text-slate-500">{{ maskAccount(account.account_no) }}<span v-if="account.bank_name"> · {{ account.bank_name }}</span></p>
              </div>
              <div class="flex shrink-0 flex-wrap justify-end gap-2 text-xs">
                <button v-if="!account.is_default" type="button" class="font-medium text-emerald-700 hover:underline" :disabled="busy" @click="makeDefault(account)">设为默认</button>
                <button type="button" class="font-medium text-slate-600 hover:underline" :disabled="busy" @click="edit(account)">编辑</button>
                <button type="button" class="font-medium text-rose-600 hover:underline" :disabled="busy" @click="remove(account)">删除</button>
              </div>
            </div>
          </div>
        </div>

        <button v-if="!showForm && accounts.length" type="button" class="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800" @click="startAdd">
          <PlusIcon class="h-4 w-4" aria-hidden="true" /> 添加收款账户
        </button>

        <form v-if="showForm || !accounts.length" class="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4" @submit.prevent="saveAccount">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-slate-900">{{ editingId ? '编辑收款账户' : '绑定收款账户' }}</h3>
            <button v-if="accounts.length" type="button" class="text-xs text-slate-500 hover:text-slate-800" @click="cancelEdit">取消</button>
          </div>
          <fieldset :disabled="busy" class="space-y-4">
            <div>
              <p class="mb-2 text-xs font-medium text-slate-600">收款方式</p>
              <div class="grid grid-cols-3 gap-2">
                <label v-for="option in types" :key="option.value" class="cursor-pointer rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors" :class="form.account_type === option.value ? 'border-emerald-500 bg-white text-emerald-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'">
                  <input v-model="form.account_type" type="radio" name="payout-account-type" class="sr-only" :value="option.value" :disabled="Boolean(editingId)" />
                  {{ option.label }}
                </label>
              </div>
              <p v-if="editingId" class="mt-1 text-xs text-slate-400">更换收款方式请添加新账户。</p>
            </div>
            <label class="block text-xs font-medium text-slate-600">
              收款人真实姓名 <span class="text-rose-500">*</span>
              <input v-model.trim="form.account_name" required maxlength="100" autocomplete="name" class="store-input mt-1.5" placeholder="与收款账户实名一致" />
            </label>
            <label class="block text-xs font-medium text-slate-600">
              {{ form.account_type === 'bank' ? '银行卡号' : form.account_type === 'alipay' ? '支付宝账号' : '微信收款账号' }} <span class="text-rose-500">*</span>
              <input v-model.trim="form.account_no" required maxlength="100" autocomplete="off" class="store-input mt-1.5" :placeholder="form.account_type === 'bank' ? '填写银行卡号' : '填写用于收款的账号'" />
            </label>
            <template v-if="form.account_type === 'bank'">
              <label class="block text-xs font-medium text-slate-600">
                开户银行 <span class="text-rose-500">*</span>
                <input v-model.trim="form.bank_name" required maxlength="100" class="store-input mt-1.5" placeholder="如：中国工商银行" />
              </label>
              <label class="block text-xs font-medium text-slate-600">
                开户支行 <span class="text-rose-500">*</span>
                <input v-model.trim="form.bank_branch" required maxlength="200" class="store-input mt-1.5" placeholder="填写完整支行名称" />
              </label>
            </template>
            <button type="submit" class="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50" :disabled="busy">
              {{ busy ? '保存中…' : editingId ? '保存收款资料' : '绑定并设为默认收款账户' }}
            </button>
          </fieldset>
          <p class="text-xs leading-5 text-slate-500">请核对姓名与账号。平台不会在保存账户时自动打款。</p>
        </form>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { CreditCardIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { createAccount, deleteAccount, setDefaultAccount, updateAccount } from '@/api/paymentAccount'
import { showConfirm } from '@/utils/dialog'
import { showMessage } from '@/utils/message'

const props = defineProps({
  accounts: { type: Array, default: () => [] },
  loading: Boolean,
  error: { type: String, default: '' }
})
const emit = defineEmits(['refresh'])
const types = [
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' },
  { value: 'bank', label: '银行卡' }
]
const defaultAccount = computed(() => props.accounts.find(account => account.is_default))
const busy = ref(false)
const showForm = ref(false)
const editingId = ref(null)
const form = reactive({ account_type: 'alipay', account_name: '', account_no: '', bank_name: '', bank_branch: '' })
const typeLabel = type => types.find(option => option.value === type)?.label || type
const maskAccount = value => {
  const text = String(value || '')
  return text.length > 4 ? `${'•'.repeat(Math.min(text.length - 4, 8))}${text.slice(-4)}` : '••••'
}
const resetForm = () => Object.assign(form, { account_type: 'alipay', account_name: '', account_no: '', bank_name: '', bank_branch: '' })
const startAdd = () => { resetForm(); editingId.value = null; showForm.value = true }
const cancelEdit = () => { resetForm(); editingId.value = null; showForm.value = false }
const edit = account => {
  Object.assign(form, {
    account_type: account.account_type,
    account_name: account.account_name || '',
    account_no: account.account_no || '',
    bank_name: account.bank_name || '',
    bank_branch: account.bank_branch || ''
  })
  editingId.value = account.id
  showForm.value = true
}
const saveAccount = async () => {
  if (!form.account_name || !form.account_no || (form.account_type === 'bank' && (!form.bank_name || !form.bank_branch))) {
    showMessage('请填写完整收款资料', 'error')
    return
  }
  busy.value = true
  try {
    const data = {
      account_type: form.account_type,
      account_name: form.account_name,
      account_no: form.account_no,
      bank_name: form.account_type === 'bank' ? form.bank_name : null,
      bank_branch: form.account_type === 'bank' ? form.bank_branch : null,
      is_default: editingId.value ? Boolean(defaultAccount.value?.id === editingId.value) : true
    }
    const response = editingId.value ? await updateAccount(editingId.value, data) : await createAccount(data)
    if (response.code !== 0) throw new Error(response.message || '保存失败')
    showMessage('收款账户已保存', 'success')
    cancelEdit()
    emit('refresh')
  } catch (error) {
    showMessage(error?.response?.data?.detail || error?.message || '保存收款账户失败', 'error')
  } finally {
    busy.value = false
  }
}
const makeDefault = async account => {
  busy.value = true
  try {
    const response = await setDefaultAccount(account.id)
    if (response.code !== 0) throw new Error(response.message || '设置失败')
    showMessage('默认收款账户已更新', 'success')
    emit('refresh')
  } catch (error) {
    showMessage(error?.response?.data?.detail || error?.message || '设置失败', 'error')
  } finally {
    busy.value = false
  }
}
const remove = async account => {
  if (!await showConfirm('删除后此账户不能用于新的提现申请，确定删除吗？', '删除收款账户')) return
  busy.value = true
  try {
    const response = await deleteAccount(account.id)
    if (response.code !== 0) throw new Error(response.message || '删除失败')
    if (editingId.value === account.id) cancelEdit()
    showMessage('收款账户已删除', 'success')
    emit('refresh')
  } catch (error) {
    showMessage(error?.response?.data?.detail || error?.message || '删除失败', 'error')
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.store-input { @apply block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100; }
</style>
