<template>
  <div class="flex h-full min-h-0 flex-col gap-4 pb-3">
    <div class="rounded-lg border bg-white p-5 shadow-sm">
      <h1 class="text-xl font-semibold text-gray-900">我的店铺</h1>
      <p class="mt-1 text-sm text-gray-500">私人链接销售；平台资源市场不展示店铺商品。</p>
    </div>

    <div v-if="loading" class="rounded-lg border bg-white p-8 text-sm text-gray-500">加载中…</div>
    <template v-else>
      <div v-if="store" class="rounded-lg border bg-white p-5 shadow-sm">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="text-lg font-semibold text-gray-900">{{ store.name }}</h2>
          <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="statusClass">{{ statusLabel }}</span>
        </div>
        <p v-if="store.review_reason" class="mt-3 text-sm text-red-600">{{ store.review_reason }}</p>
        <p v-else-if="store.status === 'pending'" class="mt-3 text-sm text-gray-500">申请审核中，通过后即可发布私人商品。</p>
        <p v-else-if="store.status === 'suspended'" class="mt-3 text-sm text-gray-500">店铺已暂停，分享链接暂不可访问。</p>
      </div>

      <form v-if="!store || store.status === 'rejected' || store.status === 'active'" class="rounded-lg border bg-white p-5 shadow-sm" @submit.prevent="save">
        <h2 class="text-base font-semibold text-gray-900">{{ store?.status === 'active' ? '店铺资料' : '申请开店' }}</h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <label class="block text-sm text-gray-700">
            店铺名称
            <input v-model.trim="form.name" required minlength="2" maxlength="100" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none" placeholder="填写店铺名称" />
          </label>
          <label class="block text-sm text-gray-700 md:col-span-2">
            店铺简介
            <textarea v-model.trim="form.intro" maxlength="500" rows="3" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none" placeholder="向买家介绍你的店铺" />
          </label>
          <label class="block text-sm text-gray-700 md:col-span-2">
            店铺封面
            <input type="file" accept="image/*" class="mt-1 block w-full text-sm" :disabled="uploadingCover" @change="uploadCover" />
            <span class="mt-1 block text-xs text-gray-500">建议横图，最大 5 MB{{ uploadingCover ? ' · 上传中…' : '' }}</span>
          </label>
          <div v-if="form.cover_url" class="md:col-span-2">
            <img :src="form.cover_url" alt="店铺封面预览" class="h-40 w-full rounded-lg border object-cover sm:w-96" />
            <button type="button" class="mt-2 text-sm text-red-600 hover:underline" @click="form.cover_url = ''">移除封面</button>
          </div>
        </div>
        <button :disabled="saving || uploadingCover" class="mt-4 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
          {{ saving ? '提交中…' : store?.status === 'active' ? '保存资料' : '提交申请' }}
        </button>
      </form>

      <div v-if="store?.status === 'active'" class="rounded-lg border bg-white p-5 shadow-sm">
        <h2 class="text-base font-semibold text-gray-900">店铺链接</h2>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <input :value="storeUrl" readonly class="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600" aria-label="店铺链接" />
          <button type="button" class="rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700" @click="copyStoreUrl">复制</button>
          <button type="button" class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="rotateLink">更换链接</button>
        </div>
        <p class="mt-2 text-xs text-gray-500">更换后旧链接立即失效，请重新发给买家。</p>
      </div>

      <div v-if="store?.status === 'active'" class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">店铺经营</h2>
        <router-link to="/workflows/publish" class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">发布商品</router-link>
      </div>
      <StoreWorkbench v-if="store?.status === 'active'" />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { applyForStore, createStoreShare, getMyStore, rotateStoreShare, updateMyStore } from '@/api/workflowMarket'
import { showConfirm } from '@/utils/dialog'
import { showMessage } from '@/utils/message'
import { uploadImageFile } from '@/utils/imageUpload'
import StoreWorkbench from './StoreWorkbench.vue'

const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const uploadingCover = ref(false)
const store = ref(null)
const shareToken = ref('')
const form = reactive({ name: '', intro: '', cover_url: '' })
const statusLabel = computed(() => ({ pending: '审核中', active: '已开通', rejected: '已拒绝', suspended: '已暂停' })[store.value?.status] || '')
const statusClass = computed(() => ({ pending: 'bg-amber-50 text-amber-700', active: 'bg-green-50 text-green-700', rejected: 'bg-red-50 text-red-700', suspended: 'bg-gray-100 text-gray-600' })[store.value?.status] || '')
const storeUrl = computed(() => shareToken.value
  ? new URL(router.resolve({ name: 'private-shop', params: { token: shareToken.value } }).href, window.location.origin).toString()
  : '')

const load = async () => {
  loading.value = true
  try {
    const response = await getMyStore()
    if (response.code !== 0) throw new Error(response.message || '获取店铺失败')
    store.value = response.data
    form.name = store.value?.name || ''
    form.intro = store.value?.intro || ''
    form.cover_url = store.value?.cover_url || ''
    if (store.value?.status === 'active') {
      const link = await createStoreShare()
      if (link.code === 0) shareToken.value = link.data?.share_token || ''
    }
  } catch (error) {
    showMessage(error?.message || '获取店铺失败', 'error')
  } finally {
    loading.value = false
  }
}

const uploadCover = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  uploadingCover.value = true
  try {
    const image = await uploadImageFile(file)
    form.cover_url = image.url
    showMessage('封面已上传，保存资料后生效', 'success')
  } catch (error) {
    showMessage(error?.message || '封面上传失败', 'error')
  } finally {
    uploadingCover.value = false
    event.target.value = ''
  }
}

const save = async () => {
  saving.value = true
  try {
    const response = store.value?.status === 'active'
      ? await updateMyStore(form)
      : await applyForStore(form)
    if (response.code !== 0) throw new Error(response.message || '提交失败')
    store.value = response.data
    showMessage(store.value.status === 'pending' ? '申请已提交' : '店铺资料已保存', 'success')
  } catch (error) {
    showMessage(error?.message || '提交失败', 'error')
  } finally {
    saving.value = false
  }
}

const copyStoreUrl = async () => {
  if (!storeUrl.value) return
  try {
    await navigator.clipboard.writeText(storeUrl.value)
    showMessage('店铺链接已复制', 'success')
  } catch {
    showMessage('复制失败，请手动复制链接', 'error')
  }
}

const rotateLink = async () => {
  if (!await showConfirm('更换后旧店铺链接立即失效，确定继续吗？', '更换店铺链接')) return
  try {
    const response = await rotateStoreShare()
    if (response.code !== 0) throw new Error(response.message || '更换失败')
    shareToken.value = response.data?.share_token || ''
    showMessage('店铺链接已更换', 'success')
  } catch (error) {
    showMessage(error?.message || '更换失败', 'error')
  }
}

onMounted(load)
</script>
