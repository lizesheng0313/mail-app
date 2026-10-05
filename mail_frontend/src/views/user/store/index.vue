<template>
  <div class="mx-auto w-full max-w-6xl space-y-5 px-3 pb-8 sm:px-5">
    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">正在加载店铺资料…</div>
    <template v-else>
      <div v-if="store?.status === 'pending'" class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <ClockIcon class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div><p class="font-semibold">开店申请审核中</p><p class="mt-1 text-amber-800">审核通过后即可发布私人商品。收款账户仍可在下方修改。</p></div>
      </div>
      <div v-else-if="store?.status === 'rejected'" class="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
        <ExclamationCircleIcon class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div><p class="font-semibold">申请未通过，请修改后重新提交</p><p v-if="store.review_reason" class="mt-1">{{ store.review_reason }}</p></div>
      </div>
      <div v-else-if="store?.status === 'suspended'" class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
        <ExclamationCircleIcon class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div><p class="font-semibold">店铺已暂停</p><p class="mt-1">分享链接暂不可购买。{{ store.review_reason || '' }}</p></div>
      </div>

      <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
        <div class="space-y-5">
          <form v-if="!store || store.status === 'rejected' || store.status === 'active'" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" @submit.prevent="save">
            <div class="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div class="flex items-center gap-2">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><BuildingStorefrontIcon class="h-4 w-4" aria-hidden="true" /></span>
                <h2 class="text-base font-semibold text-slate-900">{{ store?.status === 'active' ? '店铺资料' : '开店资料' }}</h2>
              </div>
              <p class="mt-2 text-sm text-slate-500">让买家一眼认出你的店铺。</p>
            </div>
            <div class="space-y-5 px-5 py-5 sm:px-6">
              <label class="block text-sm font-medium text-slate-700">
                店铺名称 <span class="text-rose-500">*</span>
                <input v-model.trim="form.name" required minlength="2" maxlength="100" class="store-input mt-2" placeholder="例如：小林的自动化工具铺" />
                <span class="mt-1.5 block text-xs font-normal text-slate-400">2–100 个字符，建议简短易记</span>
              </label>
              <label class="block text-sm font-medium text-slate-700">
                店铺简介
                <textarea v-model.trim="form.intro" maxlength="500" rows="3" class="store-input mt-2 resize-y" placeholder="说说你提供什么商品，以及适合哪些买家" />
                <span class="mt-1.5 block text-right text-xs font-normal text-slate-400">{{ form.intro.length }}/500</span>
              </label>
              <div>
                <p class="text-sm font-medium text-slate-700">店铺封面 <span class="font-normal text-slate-400">（可选）</span></p>
                <div class="mt-2 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                  <img v-if="form.cover_url" :src="form.cover_url" alt="店铺封面预览" class="h-44 w-full object-cover" />
                  <div v-else class="flex min-h-36 flex-col items-center justify-center gap-2 px-4 py-5 text-slate-400">
                    <PhotoIcon class="h-8 w-8" aria-hidden="true" />
                    <span class="text-xs">横向封面图更适合店铺展示</span>
                  </div>
                  <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3">
                    <label class="cursor-pointer text-sm font-medium text-emerald-700 hover:text-emerald-800">
                      {{ uploadingCover ? '上传中…' : form.cover_url ? '更换图片' : '上传图片' }}
                      <input type="file" accept="image/*" class="sr-only" :disabled="uploadingCover" @change="uploadCover" />
                    </label>
                    <div class="flex items-center gap-3 text-xs text-slate-400">
                      <span>最大 5 MB</span>
                      <button v-if="form.cover_url" type="button" class="text-rose-600 hover:underline" @click="form.cover_url = ''">移除</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="border-t border-slate-100 pt-5">
                <button :disabled="saving || uploadingCover || (!defaultAccount && store?.status !== 'active')" class="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                  {{ saving ? '提交中…' : store?.status === 'active' ? '保存店铺资料' : store?.status === 'rejected' ? '重新提交申请' : '提交开店申请' }}
                </button>
                <p v-if="!defaultAccount && store?.status !== 'active'" class="mt-2 text-xs text-amber-700">请先在右侧绑定并设置默认收款账户。</p>
              </div>
            </div>
          </form>

          <section v-else class="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
            <h2 class="text-base font-semibold text-slate-900">店铺资料</h2>
            <p class="mt-3 text-sm text-slate-600">{{ store.intro || '暂未填写店铺简介' }}</p>
            <img v-if="store.cover_url" :src="store.cover_url" alt="店铺封面" class="mt-4 h-40 w-full rounded-xl object-cover" />
          </section>

          <section v-if="store?.status === 'active'" class="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
            <div class="flex items-center gap-2"><LinkIcon class="h-5 w-5 text-emerald-700" aria-hidden="true" /><h2 class="text-base font-semibold text-slate-900">专属店铺链接</h2></div>
            <p class="mt-2 text-sm text-slate-500">把链接发给买家即可访问你的店铺。</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <input :value="storeUrl" readonly aria-label="店铺链接" class="min-w-0 flex-[1_1_230px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600" />
              <button type="button" class="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700" @click="copyStoreUrl">复制链接</button>
              <button type="button" class="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="rotateLink">更换</button>
            </div>
            <p class="mt-2 text-xs text-slate-400">更换后旧链接立即失效。</p>
          </section>
        </div>

        <div class="space-y-4">
          <PayoutAccountCard :accounts="accounts" :loading="accountsLoading" :error="accountsError" @refresh="loadAccounts" />
          <div class="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-4 text-xs leading-5 text-emerald-900">
            <p class="font-semibold">关于收款</p>
            <p class="mt-1 text-emerald-800">销售收益先进入平台奶片余额。需要提现时，选择已绑定账户提交申请；审核通过后由平台打款。</p>
            <router-link to="/user/finance" class="mt-2 inline-flex font-semibold text-emerald-700 hover:underline">查看财务与提现 →</router-link>
          </div>
        </div>
      </div>

      <template v-if="store?.status === 'active'">
        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div><h2 class="text-lg font-semibold text-slate-900">店铺经营</h2><p class="mt-1 text-sm text-slate-500">查看商品、订单和分享链接</p></div>
          <router-link to="/workflows/publish" class="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">发布商品</router-link>
        </div>
        <StoreWorkbench />
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BuildingStorefrontIcon, ClockIcon, ExclamationCircleIcon, LinkIcon, PhotoIcon } from '@heroicons/vue/24/outline'
import { applyForStore, createStoreShare, getMyStore, rotateStoreShare, updateMyStore } from '@/api/workflowMarket'
import { getUserAccounts } from '@/api/paymentAccount'
import { showConfirm } from '@/utils/dialog'
import { showMessage } from '@/utils/message'
import { uploadImageFile } from '@/utils/imageUpload'
import PayoutAccountCard from './PayoutAccountCard.vue'
import StoreWorkbench from './StoreWorkbench.vue'

const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const uploadingCover = ref(false)
const accountsLoading = ref(true)
const accountsError = ref('')
const accounts = ref([])
const store = ref(null)
const shareToken = ref('')
const form = reactive({ name: '', intro: '', cover_url: '' })
const defaultAccount = computed(() => accounts.value.find(account => account.is_default))
const storeUrl = computed(() => shareToken.value
  ? new URL(router.resolve({ name: 'private-shop', params: { token: shareToken.value } }).href, window.location.origin).toString()
  : '')

const loadAccounts = async () => {
  accountsLoading.value = true
  accountsError.value = ''
  try {
    const response = await getUserAccounts()
    if (response.code !== 0) throw new Error(response.message || '获取收款账户失败')
    accounts.value = response.data?.accounts || response.data || []
  } catch (error) {
    accountsError.value = error?.response?.data?.detail || error?.message || '获取收款账户失败'
  } finally {
    accountsLoading.value = false
  }
}

const load = async () => {
  loading.value = true
  const accountRequest = loadAccounts()
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
    await accountRequest
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
  if (store.value?.status !== 'active' && !defaultAccount.value) {
    showMessage('请先绑定并设置默认收款账户', 'error')
    return
  }
  saving.value = true
  try {
    const response = store.value?.status === 'active'
      ? await updateMyStore(form)
      : await applyForStore(form)
    if (response.code !== 0) throw new Error(response.message || '提交失败')
    store.value = response.data
    showMessage(store.value.status === 'pending' ? '申请已提交' : '店铺资料已保存', 'success')
  } catch (error) {
    showMessage(error?.response?.data?.detail || error?.message || '提交失败', 'error')
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

<style scoped>
.store-input { @apply block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100; }
</style>
