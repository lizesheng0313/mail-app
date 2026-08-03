<template>
  <div class="workflow-list-page">
    <section class="filter-panel">
      <div class="filter-fields">
        <label class="search-field"><span>⌕</span><input v-model="searchQuery" placeholder="搜索工作流名称或说明" /></label>
        <select v-model="statusFilter"><option value="">全部状态</option><option value="draft">草稿</option><option value="published">已发布</option></select>
        <button class="search-button" @click="loadWorkflows">查询</button>
      </div>
      <div class="filter-actions">
        <input ref="importInput" class="hidden-file-input" type="file" accept="application/json,.json" @change="importWorkflow" />
        <button class="outline-button" @click="openImport">导入</button>
        <button class="outline-button" @click="loadWorkflows">刷新</button>
        <button class="primary-button" @click="createWorkflow">新建浏览器流程</button>
      </div>
    </section>

    <AdminDataTable title="浏览器工作流" :loading="loading" :column-count="5" :scrollable="false">
      <template #thead><tr><th class="px-6 py-3 text-left text-xs font-medium text-black">资源信息</th><th class="px-6 py-3 text-left text-xs font-medium text-black">状态</th><th class="px-6 py-3 text-left text-xs font-medium text-black">触发器</th><th class="px-6 py-3 text-left text-xs font-medium text-black">步骤</th><th class="px-6 py-3 text-left text-xs font-medium text-black">操作</th></tr></template>
      <template #tbody>
        <tr v-for="item in filteredWorkflows" :key="item.workflow_id" class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap"><button class="flex items-center text-left" @click="openWorkflow(item.workflow_id)"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-primary-700"><svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></span><span class="ml-4"><span class="flex items-center gap-2 text-sm font-medium text-black"><span>{{ item.name }}</span><b class="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">我的</b></span><span class="block max-w-[360px] truncate text-sm text-black">{{ item.description || '浏览器自动化流程' }}</span><span class="mt-1 block text-xs text-gray-400">ID: {{ item.workflow_id }}</span></span></button></td>
          <td class="px-6 py-4 whitespace-nowrap"><span :class="item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'" class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">{{ item.status === 'published' ? '已发布' : '草稿' }}</span></td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-black">浏览器启动</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-black">{{ item.node_count || 0 }} 个节点</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <div class="flex items-center justify-start gap-2">
              <ActionButton icon="edit" tooltip="打开编辑" variant="edit" @click="openWorkflow(item.workflow_id)" />
              <button class="row-text-action" type="button" @click="exportWorkflow(item)">导出</button>
              <ActionButton icon="delete" tooltip="删除" variant="delete" @click="removeWorkflow(item)" />
            </div>
          </td>
        </tr>
        <tr v-if="!filteredWorkflows.length"><td colspan="5" class="px-6 py-12 text-center text-black">暂无符合条件的浏览器工作流</td></tr>
      </template>
    </AdminDataTable>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import browserWorkflowApi from '@/api/browserWorkflow'
import { showMessage } from '@/utils/message'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'

const router = useRouter()
const workflows = ref([])
const searchQuery = ref('')
const statusFilter = ref('')
const loading = ref(false)
const importInput = ref(null)

const filteredWorkflows = computed(() => workflows.value.filter((item) => {
  const query = searchQuery.value.trim().toLowerCase()
  const matchesQuery = !query || `${item.name || ''} ${item.description || ''}`.toLowerCase().includes(query)
  return matchesQuery && (!statusFilter.value || item.status === statusFilter.value)
}))

async function loadWorkflows() {
  loading.value = true
  try {
    const response = await browserWorkflowApi.list({ suppressErrorMessage: true })
    if (response?.code === 0) workflows.value = response.data || []
  } finally {
    loading.value = false
  }
}
function createWorkflow() { router.push('/browser-workflows/new') }
function openWorkflow(workflowId) { router.push(`/browser-workflows/${workflowId}`) }
function openImport() { importInput.value?.click() }
async function importWorkflow(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const document = JSON.parse(await file.text())
    const response = await browserWorkflowApi.import(document)
    if (response?.code === 0) {
      showMessage(response.message || '浏览器工作流导入成功', 'success')
      await loadWorkflows()
    }
  } catch (error) {
    if (error instanceof SyntaxError) showMessage('导入失败：文件不是有效的 JSON', 'error')
  }
}
async function exportWorkflow(item) {
  try {
    const response = await browserWorkflowApi.export(item.workflow_id)
    if (response?.code !== 0 || !response.data) return
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    const safeName = String(item.name || item.workflow_id).replace(/[\\/:*?"<>|]/g, '-')
    link.href = URL.createObjectURL(blob)
    link.download = `${safeName}.json`
    link.click()
    URL.revokeObjectURL(link.href)
    showMessage(response.message || '浏览器工作流已导出', 'success')
  } catch {
    // API layer displays the backend message.
  }
}
async function removeWorkflow(item) {
  if (!window.confirm(`确认删除工作流“${item.name}”吗？`)) return
  try {
    const response = await browserWorkflowApi.remove(item.workflow_id)
    if (response?.code === 0) {
      showMessage(response.message || '浏览器工作流已删除', 'success')
      await loadWorkflows()
    }
  } catch {
    // API layer displays the backend message.
  }
}
function formatTime(value) {
  if (!value) return '-'
  const date = new Date(Number(value))
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
onMounted(loadWorkflows)
</script>

<style scoped>
.workflow-list-page { min-height: 100vh; padding: 20px 28px; color: #26362b; background: #f5f7f5; font: 13px ui-sans-serif, system-ui, sans-serif; }.filter-panel, .list-panel { max-width: 1280px; margin: 0 auto 14px; background: #fff; border: 1px solid #e2e8e3; border-radius: 10px; box-shadow: 0 3px 12px #2e5a3a08; }.filter-panel { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px; }.filter-fields, .filter-actions { display: flex; align-items: center; gap: 10px; }.hidden-file-input { display: none; }.search-field { display: flex; align-items: center; gap: 6px; width: 290px; padding: 8px 10px; color: #8b998e; background: #fbfcfb; border: 1px solid #dce5de; border-radius: 6px; }.search-field input { width: 100%; color: #334438; border: 0; outline: 0; background: transparent; font: inherit; }.filter-panel select { padding: 8px 28px 8px 10px; color: #526158; background: #fff; border: 1px solid #dce5de; border-radius: 6px; }.search-button, .outline-button, .primary-button { padding: 8px 14px; border-radius: 6px; cursor: pointer; font: inherit; }.search-button, .primary-button { color: #fff; background: #198754; border: 1px solid #198754; }.outline-button { color: #526158; background: #fff; border: 1px solid #dce5de; }.row-text-action { padding: 5px 8px; color: #34704c; background: #fff; border: 1px solid #dce5de; border-radius: 6px; cursor: pointer; font: inherit; font-size: 12px; }.row-text-action:hover { color: #198754; border-color: #91c49e; }.list-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #edf1ed; }.list-toolbar div { display: flex; gap: 10px; align-items: center; }.list-toolbar span, .toolbar-hint, .muted { color: #8b998e; font-size: 12px; }.table-head, .workflow-row { display: grid; grid-template-columns: minmax(300px, 2fr) 100px 90px 140px 190px; gap: 14px; align-items: center; padding: 12px 18px; }.table-head { color: #88958c; background: #fafcfa; border-bottom: 1px solid #edf1ed; font-size: 12px; }.workflow-row { min-height: 66px; border-bottom: 1px solid #f0f3f0; }.workflow-row:hover { background: #fbfdfb; }.workflow-name { display: flex; align-items: center; gap: 10px; min-width: 0; color: #2c4032; text-align: left; background: transparent; border: 0; cursor: pointer; }.workflow-name > span:last-child { display: grid; gap: 4px; min-width: 0; }.workflow-name strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.workflow-name small { overflow: hidden; color: #8b998e; text-overflow: ellipsis; white-space: nowrap; }.workflow-mark { display: grid; flex: 0 0 30px; width: 30px; height: 30px; place-items: center; color: #198754; background: #e7f5eb; border-radius: 7px; }.status-tag { display: inline-block; padding: 4px 8px; color: #98701b; background: #fff4d7; border-radius: 10px; font-size: 11px; font-weight: 500; }.status-tag.published { color: #198754; background: #e7f5eb; }.row-actions { display: flex; gap: 8px; }.row-actions button { padding: 4px 7px; color: #34704c; background: transparent; border: 0; cursor: pointer; font-size: 12px; }.row-actions button:disabled { color: #b6c0b8; cursor: not-allowed; }.row-actions .danger { color: #a45a55; }.empty-state { padding: 70px 20px; color: #8b998e; text-align: center; }
@media (max-width: 900px) { .filter-panel { display: block; }.filter-actions { margin-top: 12px; }.table-head { display: none; }.workflow-row { grid-template-columns: 1fr auto; }.workflow-row > span:nth-child(2), .workflow-row > span:nth-child(3), .workflow-row > span:nth-child(4) { display: none; }.row-actions { grid-column: 2; grid-row: 1; }.toolbar-hint { display: none; } }
</style>
