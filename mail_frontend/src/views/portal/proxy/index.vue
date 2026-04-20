<template>
  <div>
    <PageHeader />

    <div class="min-h-screen bg-gray-50 px-6 py-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 class="text-xl font-bold text-black">{{ t('proxyPage.title') }}</h1>
          <p class="mt-1 text-sm text-black">这里只管理邮箱代理：默认代理、直连规则和单邮箱覆盖。</p>
        </div>

        <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div class="border-b border-gray-200 px-6 py-4">
            <h2 class="text-sm font-semibold text-black">默认规则</h2>
          </div>
          <div class="grid gap-4 px-6 py-5 lg:grid-cols-3">
            <label class="flex items-center gap-2 text-sm text-black">
              <input v-model="settings.enabled" type="checkbox" class="h-4 w-4 accent-primary-600">
              启用邮箱代理
            </label>
            <label class="flex items-center gap-2 text-sm text-black">
              <input v-model="settings.fallback_to_direct" type="checkbox" class="h-4 w-4 accent-primary-600">
              无代理时允许直连
            </label>
            <div>
              <div class="mb-2 text-sm text-black">默认代理</div>
              <CustomSelect v-model="settings.default_proxy_id" :options="proxyOptions" placeholder="不使用默认代理" />
            </div>
          </div>
          <div class="border-t border-gray-200 px-6 py-4">
            <button
              :disabled="savingSettings"
              @click="handleSaveSettings"
              class="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {{ savingSettings ? '保存中...' : '保存规则' }}
            </button>
          </div>
        </section>

        <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 class="text-sm font-semibold text-black">邮箱覆盖</h2>
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索邮箱"
              class="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              @keyup.enter="loadMailboxes(1)"
            >
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">邮箱</th>
                  <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">当前生效</th>
                  <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">覆盖模式</th>
                  <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">指定代理</th>
                  <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-if="loadingMailboxes">
                  <td colspan="5" class="px-6 py-8 text-center text-sm text-black">加载中...</td>
                </tr>
                <tr v-else-if="mailboxRows.length === 0">
                  <td colspan="5" class="px-6 py-8 text-center text-sm text-black">暂无第三方邮箱</td>
                </tr>
                <tr v-for="item in mailboxRows" :key="item.id">
                  <td class="px-6 py-4 text-sm text-black">
                    <div class="font-medium">{{ item.email }}</div>
                    <div class="mt-1 text-xs text-gray-500">
                      {{ item.oauth_provider || item.provider || '-' }} · {{ item.auth_type || 'password' }}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-black">
                    <div>{{ formatEffectiveProxy(item.effective_proxy) }}</div>
                    <div class="mt-1 text-xs text-gray-500">{{ formatSource(item.effective_proxy?.source) }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <CustomSelect
                      v-model="rowStates[item.id].proxy_mode"
                      :options="overrideModeOptions"
                      placeholder="继承默认规则"
                    />
                  </td>
                  <td class="px-6 py-4">
                    <CustomSelect
                      v-model="rowStates[item.id].proxy_id"
                      :options="proxyOptions"
                      :disabled="rowStates[item.id].proxy_mode !== 'direct'"
                      placeholder="选择代理"
                    />
                  </td>
                  <td class="px-6 py-4">
                    <button
                      :disabled="savingMailboxId === item.id"
                      @click="handleSaveMailbox(item.id)"
                      class="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-black transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      {{ savingMailboxId === item.id ? '保存中...' : '保存' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div class="border-b border-gray-200 px-6 py-4">
            <h2 class="text-sm font-semibold text-black">可用代理</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">名称</th>
                  <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">服务商</th>
                  <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">地区</th>
                  <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">出口</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-if="proxyOptionsRaw.length === 0">
                  <td colspan="4" class="px-6 py-8 text-center text-sm text-black">暂无可用代理</td>
                </tr>
                <tr v-for="proxy in proxyOptionsRaw" :key="proxy.id">
                  <td class="px-6 py-4 text-sm text-black">{{ proxy.name || `代理 #${proxy.id}` }}</td>
                  <td class="px-6 py-4 text-sm text-black">{{ proxy.provider || '-' }}</td>
                  <td class="px-6 py-4 text-sm text-black">{{ proxy.location || '-' }}</td>
                  <td class="px-6 py-4 text-sm text-black">{{ proxy.endpoint || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/PageHeader/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import mailboxProxyApi from '@/api/mailboxProxy'
import { showMessage } from '@/utils/message'

const { t } = useI18n()

const savingSettings = ref(false)
const savingMailboxId = ref(null)
const loadingMailboxes = ref(false)
const searchKeyword = ref('')

const settings = ref({
  enabled: true,
  fallback_to_direct: true,
  default_proxy_id: null
})

const proxyOptionsRaw = ref([])
const mailboxRows = ref([])
const rowStates = ref({})

const proxyOptions = computed(() => [
  { label: '不选择', value: null },
  ...proxyOptionsRaw.value.map((item) => ({
    label: item.endpoint ? `${item.name || `代理 #${item.id}`} (${item.endpoint})` : item.name || `代理 #${item.id}`,
    value: item.id
  }))
])

const overrideModeOptions = [
  { label: '继承默认规则', value: 'inherit' },
  { label: '指定代理', value: 'direct' },
  { label: '禁用代理', value: 'disabled' }
]

const buildRowState = (item) => ({
  proxy_mode: item.proxy_mode || 'inherit',
  proxy_id: item.proxy_id ?? null
})

const loadOptions = async () => {
  const response = await mailboxProxyApi.getOptions()
  const data = response.data || {}
  settings.value = {
    enabled: Boolean(data.settings?.enabled),
    fallback_to_direct: data.settings?.fallback_to_direct !== false,
    default_proxy_id: data.settings?.default_proxy_id ?? null
  }
  proxyOptionsRaw.value = Array.isArray(data.proxies) ? data.proxies : []
}

const loadMailboxes = async (page = 1) => {
  try {
    loadingMailboxes.value = true
    const response = await mailboxProxyApi.getMailboxes({
      page,
      page_size: 50,
      search: searchKeyword.value.trim()
    })
    mailboxRows.value = response.data?.items || []
    const nextStates = {}
    for (const item of mailboxRows.value) {
      nextStates[item.id] = buildRowState(item)
    }
    rowStates.value = nextStates
  } catch (error) {
    showMessage('加载邮箱代理列表失败', 'error')
  } finally {
    loadingMailboxes.value = false
  }
}

const handleSaveSettings = async () => {
  try {
    savingSettings.value = true
    const response = await mailboxProxyApi.saveSettings(settings.value)
    settings.value = {
      enabled: Boolean(response.data?.enabled),
      fallback_to_direct: response.data?.fallback_to_direct !== false,
      default_proxy_id: response.data?.default_proxy_id ?? null
    }
    showMessage('邮箱代理规则已保存', 'success')
    await loadMailboxes(1)
  } catch (error) {
    showMessage('保存邮箱代理规则失败', 'error')
  } finally {
    savingSettings.value = false
  }
}

const handleSaveMailbox = async (mailboxId) => {
  const rowState = rowStates.value[mailboxId]
  if (!rowState) return

  try {
    savingMailboxId.value = mailboxId
    const response = await mailboxProxyApi.saveMailboxOverride(mailboxId, rowState)
    const index = mailboxRows.value.findIndex((item) => item.id === mailboxId)
    if (index !== -1) {
      mailboxRows.value[index] = {
        ...mailboxRows.value[index],
        proxy_mode: rowState.proxy_mode,
        proxy_id: rowState.proxy_id,
        effective_proxy: response.data?.effective_proxy
          ? {
              source: response.data.effective_proxy.source,
              id: response.data.effective_proxy.proxy_id,
              name: response.data.effective_proxy.name,
              provider: response.data.effective_proxy.provider,
              location: response.data.effective_proxy.location,
              endpoint: response.data.effective_proxy.host && response.data.effective_proxy.port
                ? `${response.data.effective_proxy.host}:${response.data.effective_proxy.port}`
                : null
            }
          : null
      }
    }
    showMessage('邮箱代理覆盖已保存', 'success')
  } catch (error) {
    showMessage('保存邮箱代理覆盖失败', 'error')
  } finally {
    savingMailboxId.value = null
  }
}

const formatSource = (source) => {
  const sourceMap = {
    mailbox_direct: '单邮箱指定',
    mailbox_disabled: '单邮箱禁用',
    user_default: '默认代理',
    disabled: '已关闭',
    none: '未命中'
  }
  return sourceMap[source] || '-'
}

const formatEffectiveProxy = (effectiveProxy) => {
  if (!effectiveProxy) return '直连'
  const label = effectiveProxy.name || `代理 #${effectiveProxy.id}`
  return effectiveProxy.endpoint ? `${label} · ${effectiveProxy.endpoint}` : label
}

onMounted(async () => {
  await loadOptions()
  await loadMailboxes(1)
})
</script>
