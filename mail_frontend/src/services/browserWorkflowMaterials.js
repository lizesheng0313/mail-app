import { isTauri } from '@/services/api'

// New images live in one desktop-level scope. The workflow argument remains
// only for resolving images created by older workflow-scoped versions.
const GLOBAL_IMAGE_SCOPE = '__global__'

async function tauriInvoke() {
  if (!isTauri()) throw new Error('图片素材只能在肥猫猫桌面端使用')
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke
}

export async function chooseBrowserWorkflowImageMaterial() {
  if (!isTauri()) throw new Error('图片素材只能在肥猫猫桌面端使用')
  const { open } = await import('@tauri-apps/plugin-dialog')
  const sourcePath = await open({
    multiple: false,
    directory: false,
    filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }],
  })
  if (!sourcePath || Array.isArray(sourcePath)) return null
  const invoke = await tauriInvoke()
  return invoke('import_browser_workflow_image_material', {
    workflowId: GLOBAL_IMAGE_SCOPE,
    sourcePath,
  })
}

export async function loadBrowserWorkflowImagePreview(workflowId, fileName, scope = 'workflow') {
  const invoke = await tauriInvoke()
  const targetWorkflowId = scope === 'global' ? GLOBAL_IMAGE_SCOPE : workflowId
  try {
    return await invoke('browser_workflow_image_material_preview', {
      workflowId: targetWorkflowId,
      fileName,
    })
  } catch (error) {
    // Keep old workflow-scoped image materials readable after migration.
    if (scope !== 'global' || !workflowId || workflowId === GLOBAL_IMAGE_SCOPE) throw error
    return invoke('browser_workflow_image_material_preview', { workflowId, fileName })
  }
}

export async function resolveBrowserWorkflowImageMaterials(workflowId, images = []) {
  if (!images.length) return {}
  const invoke = await tauriInvoke()
  const grouped = new Map()
  images.forEach((item) => {
    const targetWorkflowId = item.scope === 'global' ? GLOBAL_IMAGE_SCOPE : (item.workflowId || workflowId)
    if (!grouped.has(targetWorkflowId)) grouped.set(targetWorkflowId, {})
    grouped.get(targetWorkflowId)[item.id] = item.fileName
  })
  const resolved = {}
  for (const [targetWorkflowId, materials] of grouped.entries()) {
    Object.assign(resolved, await invoke('resolve_browser_workflow_image_materials', {
      workflowId: targetWorkflowId,
      materials,
    }))
  }
  return resolved
}

export async function deleteBrowserWorkflowImageMaterial(workflowId, fileName, scope = 'workflow') {
  const invoke = await tauriInvoke()
  const targetWorkflowId = scope === 'global' ? GLOBAL_IMAGE_SCOPE : workflowId
  return invoke('delete_browser_workflow_image_material', {
    workflowId: targetWorkflowId,
    fileName,
  })
}
