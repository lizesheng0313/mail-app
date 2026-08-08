import { isTauri } from '@/services/api'

async function tauriInvoke() {
  if (!isTauri()) throw new Error('图片素材只能在肥猫猫桌面端使用')
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke
}

export async function chooseBrowserWorkflowImageMaterial(workflowId) {
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
    workflowId,
    sourcePath,
  })
}

export async function loadBrowserWorkflowImagePreview(workflowId, fileName) {
  const invoke = await tauriInvoke()
  return invoke('browser_workflow_image_material_preview', {
    workflowId,
    fileName,
  })
}

export async function resolveBrowserWorkflowImageMaterials(workflowId, images = []) {
  if (!images.length) return {}
  const invoke = await tauriInvoke()
  const materials = Object.fromEntries(images.map(item => [item.id, item.fileName]))
  return invoke('resolve_browser_workflow_image_materials', {
    workflowId,
    materials,
  })
}

export async function deleteBrowserWorkflowImageMaterial(workflowId, fileName) {
  const invoke = await tauriInvoke()
  return invoke('delete_browser_workflow_image_material', {
    workflowId,
    fileName,
  })
}
