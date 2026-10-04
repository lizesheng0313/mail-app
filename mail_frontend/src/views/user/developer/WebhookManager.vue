<template>
  <section class="flex h-full min-h-0 flex-col gap-3">
    <div v-if="!userStore.isAuthenticated" class="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-800">
      {{ t('developerWebhook.loginRequired') }}
    </div>
    <template v-else>
      <div class="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-600">{{ t('developerWebhook.intro') }}</p>
        <button type="button" class="rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700" @click="showCreate = true">
          {{ t('developerWebhook.create') }}
        </button>
      </div>
      <AdminDataTable :title="t('developerWebhook.title')" :loading="loading" :column-count="6" :fill-empty-height="!items.length" class="min-h-0 flex-1">
        <template #thead>
          <tr>
            <th v-for="column in columns" :key="column" class="px-6 py-3 text-left text-xs font-medium uppercase text-black">{{ t(`developerWebhook.${column}`) }}</th>
          </tr>
        </template>
        <template #tbody>
          <tr v-for="item in items" :key="item.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm font-medium text-black">{{ item.name }}</td>
            <td class="max-w-xs break-all px-6 py-4 text-sm text-gray-600">{{ item.url }}</td>
            <td class="px-6 py-4 text-sm text-gray-600">{{ typeLabel(item.mailbox_type) }}<span v-if="item.mailbox_email" class="block break-all text-xs">{{ item.mailbox_email }}</span></td>
            <td class="px-6 py-4 text-sm" :class="item.is_active ? 'text-primary-700' : 'text-gray-500'">{{ t(item.is_active ? 'developerWebhook.active' : 'developerWebhook.paused') }}</td>
            <td class="px-6 py-4 text-sm text-gray-600">{{ item.last_success_at ? new Date(item.last_success_at).toLocaleString() : '-' }}<span v-if="item.last_error" class="block break-words text-xs text-red-600">{{ item.last_error }}</span></td>
            <td class="px-6 py-4 text-sm">
              <div class="flex flex-wrap gap-3 whitespace-nowrap">
                <button class="text-primary-700 hover:underline" @click="loadDeliveries(item)">{{ t('developerWebhook.history') }}</button>
                <button class="text-primary-700 hover:underline" @click="toggle(item)">{{ t(item.is_active ? 'developerWebhook.pause' : 'developerWebhook.resume') }}</button>
                <button class="text-primary-700 hover:underline" @click="confirmAction('rotate', item)">{{ t('developerWebhook.rotate') }}</button>
                <button class="text-red-600 hover:underline" @click="confirmAction('delete', item)">{{ t('developerWebhook.delete') }}</button>
              </div>
            </td>
          </tr>
          <tr v-if="!items.length"><td colspan="6" class="px-6 py-12 text-center text-gray-500">{{ t('developerWebhook.empty') }}</td></tr>
        </template>
      </AdminDataTable>
    </template>

    <BaseModal v-model="showCreate" :title="t('developerWebhook.create')" :confirm-text="t('developerWebhook.create')" :confirm-loading="saving" @confirm="create" @close="showCreate = false">
      <div class="space-y-4">
        <BaseInput v-model="form.name" :label="t('developerWebhook.name')" :placeholder="t('developerWebhook.namePlaceholder')" />
        <BaseInput v-model="form.url" :label="t('developerWebhook.url')" placeholder="https://example.com/webhooks/mail" />
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('developerWebhook.mailboxType') }}</label>
          <select v-model="form.mailbox_type" class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
            <option v-for="type in types" :key="type" :value="type">{{ typeLabel(type) }}</option>
          </select>
        </div>
        <BaseInput v-model="form.mailbox_email" :label="t('developerWebhook.mailboxEmail')" :placeholder="t('developerWebhook.mailboxEmailPlaceholder')" />
        <p class="text-xs text-gray-500">{{ t('developerWebhook.secretHint') }}</p>
      </div>
    </BaseModal>

    <BaseModal v-model="showSecret" :title="t('developerWebhook.saveSecret')" :show-footer="false" :close-on-click-outside="false" @close="clearSecret">
      <p class="mb-3 text-sm text-amber-800">{{ t('developerWebhook.secretHint') }}</p>
      <code class="block break-all rounded bg-gray-900 p-4 text-sm text-white">{{ oneTimeSecret }}</code>
      <div class="mt-4 flex justify-end gap-3">
        <button class="rounded-md border px-4 py-2 text-sm" @click="clearSecret">{{ t('developerWebhook.saved') }}</button>
        <button class="rounded-md bg-primary-600 px-4 py-2 text-sm text-white" @click="copySecret">{{ t('developerWebhook.copy') }}</button>
      </div>
    </BaseModal>

    <BaseModal v-model="showHistory" :title="t('developerWebhook.history')" :show-footer="false">
      <div v-if="!deliveries.length" class="py-8 text-center text-sm text-gray-500">{{ t('developerWebhook.noHistory') }}</div>
      <div v-for="delivery in deliveries" :key="delivery.id" class="border-b border-gray-100 py-3 text-sm">
        <div class="flex justify-between gap-2"><span>{{ delivery.mailbox_type }} · #{{ delivery.email_id }}</span><span :class="delivery.status === 'sent' ? 'text-primary-700' : 'text-amber-700'">{{ delivery.status }}</span></div>
        <p class="mt-1 text-xs text-gray-500">{{ new Date(delivery.created_at_ms).toLocaleString() }} · {{ t('developerWebhook.attempts') }} {{ delivery.attempts }}</p>
        <p v-if="delivery.last_error" class="mt-1 break-words text-xs text-red-600">{{ delivery.last_error }}</p>
      </div>
    </BaseModal>

    <ConfirmDialog :visible="!!pending" :title="t(pending?.kind === 'rotate' ? 'developerWebhook.rotate' : 'developerWebhook.delete')" :message="t(pending?.kind === 'rotate' ? 'developerWebhook.rotateConfirm' : 'developerWebhook.deleteConfirm')" type="danger" :loading="saving" @confirm="performAction" @cancel="pending = null" />
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import openPlatformApi from '@/services/openPlatformApi'
import { useUserStore } from '@/stores/user'
import { showMessage } from '@/utils/message'

type Webhook = { id: number; name: string; url: string; mailbox_type: string; mailbox_email?: string; is_active: boolean; last_success_at?: number; last_error?: string }
type Delivery = { id: number; mailbox_type: string; email_id: number; status: string; attempts: number; created_at_ms: number; last_error?: string }
const { t } = useI18n()
const userStore = useUserStore()
const columns = ['name', 'url', 'mailboxType', 'status', 'lastDelivery', 'actions']
const types = ['all', 'system', 'hosted', 'external']
const items = ref<Webhook[]>([])
const deliveries = ref<Delivery[]>([])
const loading = ref(false)
const saving = ref(false)
const showCreate = ref(false)
const showSecret = ref(false)
const showHistory = ref(false)
const oneTimeSecret = ref('')
const pending = ref<{ kind: 'rotate' | 'delete'; item: Webhook } | null>(null)
const form = reactive({ name: '', url: '', mailbox_type: 'all', mailbox_email: '' })
const typeLabel = (type: string) => t(`developerWebhook.type_${type}`)

const load = async () => {
  if (!userStore.isAuthenticated) return
  loading.value = true
  try {
    const response: any = await openPlatformApi.get('/webhooks')
    if (response.code === 0) items.value = response.data?.items || []
  } finally { loading.value = false }
}

const create = async () => {
  if (saving.value) return
  saving.value = true
  try {
    const response: any = await openPlatformApi.post('/webhooks', {
      name: form.name, url: form.url, mailbox_type: form.mailbox_type,
      mailbox_email: form.mailbox_email || null
    })
    if (response.code !== 0) return
    oneTimeSecret.value = response.data.secret
    showCreate.value = false
    showSecret.value = true
    Object.assign(form, { name: '', url: '', mailbox_type: 'all', mailbox_email: '' })
    await load()
  } finally { saving.value = false }
}

const toggle = async (item: Webhook) => {
  const response: any = await openPlatformApi.put(`/webhooks/${item.id}/active`, { is_active: !item.is_active })
  if (response.code === 0) await load()
}

const loadDeliveries = async (item: Webhook) => {
  const response: any = await openPlatformApi.get(`/webhooks/${item.id}/deliveries`)
  if (response.code !== 0) return
  deliveries.value = response.data?.items || []
  showHistory.value = true
}

const confirmAction = (kind: 'rotate' | 'delete', item: Webhook) => { pending.value = { kind, item } }
const performAction = async () => {
  if (!pending.value || saving.value) return
  const { kind, item } = pending.value
  saving.value = true
  try {
    const response: any = kind === 'rotate'
      ? await openPlatformApi.post(`/webhooks/${item.id}/rotate-secret`)
      : await openPlatformApi.delete(`/webhooks/${item.id}`)
    if (response.code !== 0) return
    pending.value = null
    if (kind === 'rotate') {
      oneTimeSecret.value = response.data.secret
      showSecret.value = true
    }
    await load()
  } finally { saving.value = false }
}

const clearSecret = () => { oneTimeSecret.value = ''; showSecret.value = false }
const copySecret = async () => {
  try {
    await navigator.clipboard.writeText(oneTimeSecret.value)
    showMessage(t('developerWebhook.copied'), 'success')
    clearSecret()
  } catch { showMessage(t('developerWebhook.copyFailed'), 'error') }
}

watch(() => userStore.isAuthenticated, (authenticated) => {
  if (authenticated) void load()
  else items.value = []
}, { immediate: true })
</script>
