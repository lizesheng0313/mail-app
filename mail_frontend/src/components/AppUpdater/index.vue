<template>
  <div v-if="showModal" class="update-overlay">
    <div class="update-modal">
      <!-- 提示更新 -->
      <template v-if="phase === 'confirm'">
        <div class="update-header">
          <div class="update-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <h3 class="update-title">发现新版本</h3>
        </div>
        <p class="update-desc">v{{ version }} 已发布，建议立即更新以获得最佳体验</p>
        <div v-if="notes.trim()" class="update-notes">
          <div class="update-notes-title">更新内容</div>
          <pre class="update-notes-body">{{ notes }}</pre>
        </div>
        <div class="update-actions">
          <button class="btn-later" @click="dismiss">稍后再说</button>
          <button class="btn-update" @click="startUpdate">立即更新</button>
        </div>
      </template>

      <!-- 下载进度（仅插件模式） -->
      <template v-if="phase === 'downloading'">
        <h3 class="update-title">正在更新</h3>
        <div class="progress-wrap">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: percent + '%' }"></div>
          </div>
          <span class="progress-text">{{ percent }}%</span>
        </div>
        <p class="update-hint">{{ hint }}</p>
      </template>

      <!-- 更新失败 -->
      <template v-if="phase === 'error'">
        <div class="update-icon error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h3 class="update-title">更新失败</h3>
        <p class="update-desc">{{ errorMsg }}</p>
        <div class="update-actions">
          <button class="btn-later" @click="dismiss">取消</button>
          <button class="btn-update" @click="startUpdate">重试</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { isTauri } from '@/services/api'

const showModal = ref(false)
const phase = ref<'confirm' | 'downloading' | 'error'>('confirm')
const version = ref('')
const notes = ref('')
const percent = ref(0)
const hint = ref('准备下载...')
const errorMsg = ref('')

let pendingUpdate: any = null
let updateMode: 'plugin' | 'fallback' = 'plugin'

function dismiss() {
  showModal.value = false
  pendingUpdate = null
  notes.value = ''
}

async function startUpdate() {
  phase.value = 'downloading'
  percent.value = 0
  hint.value = '准备下载...'

  try {
    if (updateMode === 'plugin' && pendingUpdate) {
      // 插件模式：用 JS API 下载安装
      let downloaded = 0
      let total = 0
      await pendingUpdate.downloadAndInstall((event: any) => {
        if (event.event === 'Started') {
          total = event.data.contentLength || 0
          hint.value = '正在下载...'
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength || 0
          percent.value = total > 0 ? Math.round((downloaded / total) * 100) : 0
          const mb = (downloaded / 1024 / 1024).toFixed(1)
          const totalMb = (total / 1024 / 1024).toFixed(1)
          hint.value = `${mb} MB / ${totalMb} MB`
        } else if (event.event === 'Finished') {
          percent.value = 100
          hint.value = '下载完成，正在安装...'
        }
      })
    } else {
      // 保底模式：通过 Rust 命令用 updater 插件的 Rust API 下载安装
      const { invoke } = await import('@tauri-apps/api/core')
      const { listen } = await import('@tauri-apps/api/event')

      let downloaded = 0
      let total = 0
      const unlisten = await listen('update-progress', (event: any) => {
        const payload = event.payload
        if (payload.event === 'Started') {
          total = payload.data?.contentLength || 0
          hint.value = '正在下载...'
        } else if (payload.event === 'Progress') {
          downloaded += payload.data?.chunkLength || 0
          percent.value = total > 0 ? Math.round((downloaded / total) * 100) : 0
          const mb = (downloaded / 1024 / 1024).toFixed(1)
          const totalMb = (total / 1024 / 1024).toFixed(1)
          hint.value = `${mb} MB / ${totalMb} MB`
        } else if (payload.event === 'Finished') {
          percent.value = 100
          hint.value = '下载完成，正在安装...'
        }
      })

      try {
        await invoke('download_and_install_update')
      } finally {
        unlisten()
      }
    }

    hint.value = '安装完成，正在重启...'
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  } catch (e: any) {
    // 插件模式失败，自动切到保底模式重试
    if (updateMode === 'plugin') {
      console.warn('[Updater] 插件模式下载失败，切换到保底模式:', e?.message || e)
      updateMode = 'fallback'
      pendingUpdate = null
      await startUpdate()
      return
    }
    phase.value = 'error'
    errorMsg.value = String(e)
  }
}

async function checkForUpdates() {
  console.log('[Updater] 开始检查更新, isTauri:', isTauri())
  if (!isTauri()) return

  // 1. 优先用 updater 插件
  try {
    console.log('[Updater] 尝试使用 updater 插件...')
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    console.log('[Updater] 插件返回:', update)
    if (update) {
      pendingUpdate = update
      version.value = update.version
      notes.value = update.body || update.notes || ''
      updateMode = 'plugin'
      phase.value = 'confirm'
      showModal.value = true
      return // 插件检测到更新了，不用再查
    }
    console.log('[Updater] 插件返回 null，尝试保底检查')
  } catch (e: any) {
    console.error('[Updater] 插件检查失败:', e?.message || e)
  }

  // 2. 插件没检测到更新（返回null或报错），用 reqwest 再确认一次
  try {
    console.log('[Updater] 开始保底检查...')
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke('check_for_update') as { version: string; notes: string } | null
    console.log('[Updater] 保底检查返回:', result)
    if (result) {
      version.value = result.version
      notes.value = result.notes || ''
      updateMode = 'fallback'
      phase.value = 'confirm'
      showModal.value = true
    }
  } catch (e: any) {
    console.error('[Updater] 保底检查也失败:', e?.message || e)
  }
}

defineExpose({ checkForUpdates })
</script>

<style scoped>
.update-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

.update-modal {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  width: 380px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.update-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  justify-content: center;
}

.update-icon {
  color: rgb(var(--color-primary-500));
  display: flex;
  align-items: center;
}

.update-icon.error {
  color: #ef4444;
}

.update-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.update-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px;
  line-height: 1.5;
}

.update-actions {
  display: flex;
  gap: 12px;
}

.btn-later {
  flex: 1;
  padding: 10px 0;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-later:hover {
  background: #f3f4f6;
}

.btn-update {
  flex: 1;
  padding: 10px 0;
  border: none;
  border-radius: 10px;
  background: rgb(var(--color-primary-500));
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-update:hover {
  background: rgb(var(--color-primary-600));
}

.progress-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: rgb(var(--color-primary-500));
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--color-primary-600));
  min-width: 40px;
}

.update-hint {
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
}
.update-notes {
  margin: 16px 0 8px;
  padding: 12px;
  text-align: left;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.update-notes-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.update-notes-body {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
  font-family: inherit;
  max-height: 180px;
  overflow: auto;
}
</style>
