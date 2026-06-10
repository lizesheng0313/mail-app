<template>
  <div class="space-y-6">
    <AccessPendingAlert v-if="accessLoaded && !canOperate" :reason="access.reason" />

    <div v-if="canOperate" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <BaseInput v-model="filters.search" placeholder="搜索邮箱" size="sm" class="w-64" />
          <div class="w-44">
            <CustomSelect v-model="filters.group_name" :options="groupOptions" placeholder="全部分组" size="sm" />
          </div>
          <div class="flex items-center">
            <button type="button" class="h-10 whitespace-nowrap rounded-xl bg-primary-600 px-5 text-sm font-medium text-white hover:bg-primary-700" @click="loadMembers">
              查询
            </button>
          </div>
        </div>
        <div class="ml-auto flex shrink-0 items-center justify-end gap-3">
          <button type="button" class="h-10 whitespace-nowrap rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="downloadMembers">
            导出
          </button>
          <button type="button" class="h-10 whitespace-nowrap rounded-xl bg-primary-600 px-5 text-sm font-medium text-white hover:bg-primary-700" @click="showImportModal = true">
            导入会员
          </button>
        </div>
      </div>
    </div>

    <AdminDataTable v-if="canOperate" title="会员列表" :loading="loading" :column-count="5">
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">邮箱</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">分组</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">自定义字段</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">更新时间</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">操作</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!members.length && !loading">
          <td colspan="5" :class="TABLE_EMPTY_CELL_CLASS">暂无会员</td>
        </tr>
        <tr v-for="item in members" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-black">{{ item.email }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ item.group_name || '-' }}</td>
          <td class="px-6 py-4 text-sm text-gray-600">
            <div class="max-w-md truncate">{{ formatFields(item.fields) }}</div>
          </td>
          <td class="px-6 py-4 text-sm text-black">{{ formatDateTime(item.updated_at) }}</td>
          <td class="px-6 py-4 text-sm">
            <div class="flex items-center gap-2">
              <ActionButton icon="edit" tooltip="编辑" variant="edit" @click="handleEditMember(item)" />
              <ActionButton icon="delete" tooltip="删除" variant="delete" @click="handleDeleteMember(item)" />
            </div>
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <BaseModal
      v-model="showImportModal"
      title="导入会员"
      size="lg"
      confirm-text="导入"
      :confirm-loading="saving"
      @confirm="handleImport"
    >
      <div class="space-y-3">
        <div class="text-sm text-gray-600">上传 Excel 文件，固定列会直接入库，其他列会作为会员资料保存。</div>
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700">默认分组</label>
          <CustomSelect v-model="defaultImportGroup" :options="groupOptions" placeholder="不设置分组" />
        </div>
        <input
          ref="importFileRef"
          type="file"
          accept=".xlsx,.xls,.csv"
          class="hidden"
          @change="handleImportFileChange"
        />
        <div class="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-4">
          <button type="button" class="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="downloadImportTemplate">
            下载模板
          </button>
          <button type="button" class="h-10 rounded-xl bg-primary-600 px-5 text-sm font-medium text-white hover:bg-primary-700" @click="importFileRef?.click?.()">
            选择文件
          </button>
          <div class="min-w-0 flex-1 truncate text-sm text-gray-700">{{ importFileName || '支持 .xlsx / .xls / .csv' }}</div>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      v-model="showEditModal"
      title="编辑会员"
      size="lg"
      body-class="overflow-visible"
      confirm-text="保存"
      :confirm-loading="editing"
      :close-on-click-outside="false"
      @confirm="handleSaveMember"
      @close="closeEditModal"
    >
      <div class="space-y-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700">邮箱</label>
          <BaseInput
            v-model="editForm.email"
            placeholder="请输入会员邮箱"
            size="sm"
          />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700">分组</label>
          <CustomSelect v-model="editForm.group_name" :options="editGroupOptions" placeholder="不设置分组" />
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div v-for="field in editableFieldDefinitions" :key="field.field_key" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">{{ field.field_label }}</label>
            <BaseInput
              v-model="editForm.fields[field.field_key]"
              :placeholder="`请输入${field.field_label}`"
              size="sm"
            />
          </div>
        </div>
        <div v-if="!editableFieldDefinitions.length" class="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          当前会员没有可编辑的自定义字段
        </div>
      </div>
    </BaseModal>

    <ConfirmDialog
      :visible="showDeleteConfirm"
      title="删除会员"
      :message="deleteMessage"
      type="danger"
      confirm-text="删除"
      :loading="deleting"
      @confirm="confirmDeleteMember"
      @cancel="closeDeleteDialog"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import * as XLSX from 'xlsx'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'
import AccessPendingAlert from './components/AccessPendingAlert.vue'
import { TABLE_EMPTY_CELL_CLASS, formatDateTime, hasAccessStatus } from './ui'

const loading = ref(false)
const saving = ref(false)
const editing = ref(false)
const accessLoaded = ref(false)
const members = ref([])
const groups = ref([])
const memberFields = ref([])
const showImportModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const deletingMember = ref(null)
const editingMember = ref(null)
const importFileRef = ref(null)
const importFileName = ref('')
const importRows = ref([])
const rawImportRows = ref([])
const defaultImportGroup = ref('')
const access = ref({ status: 'pending', reason: '' })
const filters = reactive({ search: '', group_name: '' })
const editForm = reactive({ email: '', group_name: '', fields: {} })

const canOperate = computed(() => hasAccessStatus(access.value.status))
const groupOptions = computed(() => [{ label: '全部分组', value: '' }, ...groups.value.map((item) => ({ label: item.group_name, value: item.group_name }))])
const editGroupOptions = computed(() => [{ label: '请选择', value: '' }, ...groups.value.map((item) => ({ label: item.group_name, value: item.group_name }))])
const deleteMessage = computed(() => `确认删除会员《${deletingMember.value?.email || ''}》吗？`)
const editableFieldDefinitions = computed(() => {
  const seen = new Set()
  const definitions = []
  ;(memberFields.value || []).forEach((item) => {
    const fieldKey = String(item.field_key || '').trim()
    if (!fieldKey || seen.has(fieldKey)) return
    seen.add(fieldKey)
    definitions.push({
      field_key: fieldKey,
      field_label: item.field_label || fieldKey
    })
  })
  Object.keys(editingMember.value?.fields || {}).forEach((fieldKey) => {
    const normalizedKey = String(fieldKey || '').trim()
    if (!normalizedKey || seen.has(normalizedKey)) return
    seen.add(normalizedKey)
    definitions.push({
      field_key: normalizedKey,
      field_label: normalizedKey
    })
  })
  return definitions
})
const fixedExcelColumns = {
  邮箱: 'email',
  分组: 'group_name'
}

const formatFields = (value) => {
  const fieldsValue = value || {}
  const pairs = Object.entries(fieldsValue).filter(([, item]) => item !== undefined && item !== null && item !== '')
  if (!pairs.length) return '-'
  return pairs.map(([key, item]) => `${key}: ${item}`).join('，')
}

const normalizeExcelValue = (value) => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const mapExcelRowToMember = (row) => {
  const member = {
    email: '',
    group_name: defaultImportGroup.value || '',
    tags: [],
    fields: {}
  }
  Object.entries(row || {}).forEach(([header, value]) => {
    const key = String(header || '').trim()
    const text = normalizeExcelValue(value)
    if (!key || !text) return
    const fixedKey = fixedExcelColumns[key]
    if (fixedKey) {
      member[fixedKey] = text
      return
    }
    member.fields[key] = text
  })
  return member.email ? member : null
}

const handleImportFileChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  importFileName.value = file.name
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    rawImportRows.value = rows
    importRows.value = rows.map(mapExcelRowToMember).filter(Boolean)
    if (!importRows.value.length) {
      showMessage('Excel 里没有可导入的会员邮箱', 'warning')
      return
    }
    showMessage(`已读取 ${importRows.value.length} 条会员`, 'success')
  } catch (error) {
    importRows.value = []
    showMessage('Excel 解析失败，请检查文件格式', 'error')
  }
}

const downloadImportTemplate = () => {
  const worksheet = XLSX.utils.json_to_sheet([
    {
      邮箱: 'test@example.com',
      分组: 'VIP',
      生日: '1998-08-01',
      性别: '男'
    }
  ])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '导入模板')
  XLSX.writeFile(workbook, '会员导入模板.xlsx')
}

const loadMeta = async () => {
  const groupsRes = await emailReachApi.getMemberGroups()
  if (groupsRes.code === 0) groups.value = groupsRes.data.items || []
  const fieldsRes = await emailReachApi.getMemberFields()
  if (fieldsRes.code === 0) memberFields.value = fieldsRes.data.items || []
}

const loadMembers = async () => {
  loading.value = true
  try {
    const res = await emailReachApi.getMembers({ ...filters })
    if (res.code === 0) members.value = res.data.items || []
  } finally {
    loading.value = false
  }
}

const handleImport = async () => {
  saving.value = true
  try {
    const rows = (rawImportRows.value.length ? rawImportRows.value : importRows.value).map(mapExcelRowToMember).filter(Boolean)
    if (!rows.length) {
      showMessage('先选择 Excel 文件', 'warning')
      return
    }
    const res = await emailReachApi.importMembers({ members: rows, source: 'manual' })
    if (res.code === 0) {
      showMessage(`导入成功 ${res.data.imported_count || 0} 条`, 'success')
      showImportModal.value = false
      importRows.value = []
      rawImportRows.value = []
      importFileName.value = ''
      defaultImportGroup.value = ''
      if (importFileRef.value) importFileRef.value.value = ''
      await loadMeta()
      await loadMembers()
      return
    }
    showMessage(res.message || '导入失败', 'error')
  } catch (error) {
    showMessage('导入失败，请检查 Excel 内容', 'error')
  } finally {
    saving.value = false
  }
}

const downloadMembers = async () => {
  const res = await emailReachApi.exportMembers({ ...filters })
  if (res.code !== 0) return
  const rows = (res.data.items || []).map((item) => ({
    邮箱: item.email || '',
    分组: item.group_name || '',
    ...(item.fields || {})
  }))
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '会员')
  XLSX.writeFile(workbook, `会员列表_${Date.now()}.xlsx`)
}

const handleDeleteMember = (item) => {
  deletingMember.value = item
  showDeleteConfirm.value = true
}

const resetEditForm = () => {
  editForm.email = ''
  editForm.group_name = ''
  editForm.fields = {}
}

const handleEditMember = (item) => {
  editingMember.value = item
  editForm.email = item.email || ''
  editForm.group_name = item.group_name || ''
  editForm.fields = Object.fromEntries(
    Object.entries(item.fields || {}).map(([key, value]) => [key, value === undefined || value === null ? '' : String(value)])
  )
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingMember.value = null
  resetEditForm()
}

const closeDeleteDialog = () => {
  showDeleteConfirm.value = false
  deletingMember.value = null
}

const confirmDeleteMember = async () => {
  if (!deletingMember.value?.id) return
  deleting.value = true
  try {
    const res = await emailReachApi.deleteMember(deletingMember.value.id)
    if (res.code === 0) {
      showMessage('删除成功', 'success')
      closeDeleteDialog()
      await loadMembers()
    }
  } finally {
    deleting.value = false
  }
}

const handleSaveMember = async () => {
  if (!editingMember.value?.id) return
  const email = String(editForm.email || '').trim().toLowerCase()
  if (!email) {
    showMessage('会员邮箱不能为空', 'warning')
    return
  }
  editing.value = true
  try {
    const fields = {}
    editableFieldDefinitions.value.forEach((field) => {
      const value = editForm.fields[field.field_key]
      const text = value === undefined || value === null ? '' : String(value).trim()
      if (text) fields[field.field_key] = text
    })
    const res = await emailReachApi.updateMember(editingMember.value.id, {
      email,
      group_name: editForm.group_name || '',
      fields
    })
    if (res.code === 0) {
      showMessage('保存成功', 'success')
      closeEditModal()
      await loadMeta()
      await loadMembers()
      return
    }
    showMessage(res.message || '保存失败', 'error')
  } finally {
    editing.value = false
  }
}

onMounted(async () => {
  const accessRes = await emailReachApi.getAccessSummary()
  accessLoaded.value = true
  if (accessRes.code === 0) access.value = accessRes.data
  if (canOperate.value) {
    await loadMeta()
    await loadMembers()
  }
})
</script>
