<template>
  <div class="space-y-6">
    <div
      v-if="accessLoaded && access.status !== 'approved' && access.status !== 'trial'"
      class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"
    >
      <div class="font-medium">当前账号还没开通邮件触达</div>
      <div class="mt-2">{{ access.reason }}</div>
    </div>

    <div v-if="canOperate" class="rounded-lg bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <BaseInput v-model="filters.keyword" placeholder="标签名称 / 说明" size="sm" class="w-64" />
          <button type="button" class="h-10 rounded-md bg-primary-600 px-5 text-sm text-white hover:bg-primary-700" @click="loadTags">
            查询
          </button>
        </div>
        <button type="button" class="h-10 rounded-md bg-primary-600 px-5 text-sm text-white hover:bg-primary-700" @click="showModal = true">
          新增标签
        </button>
      </div>
    </div>

    <AdminDataTable v-if="canOperate" title="标签列表" :loading="loading" :column-count="3">
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">标签名称</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">说明</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">更新时间</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!filteredTags.length && !loading">
          <td colspan="3" class="px-6 py-12 text-center text-black">暂无标签</td>
        </tr>
        <tr v-for="item in filteredTags" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-black">{{ item.tag_name }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ item.description || '-' }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ formatTime(item.updated_at) }}</td>
        </tr>
      </template>
    </AdminDataTable>

    <BaseModal v-model="showModal" title="新增标签" size="md" confirm-text="保存" :confirm-loading="saving" @confirm="handleSave">
      <BaseInput v-model="form.tag_name" label="标签名称" placeholder="例如 复购用户" />
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import emailReachApi from '@/api/emailReach'

const loading = ref(false)
const saving = ref(false)
const accessLoaded = ref(false)
const showModal = ref(false)
const tags = ref([])
const access = ref({ status: 'pending', reason: '' })
const form = reactive({ tag_name: '' })
const filters = reactive({ keyword: '' })

const canOperate = computed(() => access.value.status === 'approved' || access.value.status === 'trial')
const filteredTags = computed(() => {
  const keyword = String(filters.keyword || '').trim().toLowerCase()
  if (!keyword) return tags.value
  return tags.value.filter((item) => `${item.tag_name || ''} ${item.description || ''}`.toLowerCase().includes(keyword))
})

const formatTime = (value) => {
  if (!value) return '-'
  const date = new Date(Number(value))
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const loadTags = async () => {
  loading.value = true
  try {
    const res = await emailReachApi.getMemberTags()
    if (res.code === 0) tags.value = res.data.items || []
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    const res = await emailReachApi.saveMemberTag({ ...form })
    if (res.code === 0) {
      showModal.value = false
      form.tag_name = ''
      await loadTags()
    }
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const accessRes = await emailReachApi.getAccessSummary()
  accessLoaded.value = true
  if (accessRes.code === 0) access.value = accessRes.data
  if (canOperate.value) await loadTags()
})
</script>
