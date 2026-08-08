<template>
  <div v-if="visible" class="browser-runtime-overlay" role="presentation">
    <div
      class="browser-runtime-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <template v-if="phase === 'confirm'">
        <div class="browser-runtime-header">
          <div class="browser-runtime-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <h3 class="browser-runtime-title">{{ title }}</h3>
        </div>
        <p class="browser-runtime-description">{{ description }}</p>
        <div class="browser-runtime-actions">
          <button
            data-testid="browser-runtime-cancel"
            class="browser-runtime-button browser-runtime-button-secondary"
            type="button"
            @click="emit('cancel')"
          >
            {{ cancelText }}
          </button>
          <button
            data-testid="browser-runtime-confirm"
            class="browser-runtime-button browser-runtime-button-primary"
            type="button"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </button>
        </div>
      </template>

      <template v-else-if="phase === 'downloading'">
        <div class="browser-runtime-header browser-runtime-header-centered">
          <div class="browser-runtime-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <h3 class="browser-runtime-title">{{ downloadingTitle || title }}</h3>
        </div>
        <div class="browser-runtime-progress-wrap">
          <progress
            data-testid="browser-runtime-progress"
            class="browser-runtime-progress"
            :value="progressPercent"
            max="100"
          />
          <span class="browser-runtime-progress-text">{{ progressPercent }}%</span>
        </div>
        <p class="browser-runtime-hint">{{ progressMessage || '正在准备浏览器组件' }}</p>
        <div class="browser-runtime-actions">
          <button
            data-testid="browser-runtime-cancel"
            class="browser-runtime-button browser-runtime-button-secondary"
            type="button"
            @click="emit('cancel')"
          >
            {{ cancelText }}
          </button>
        </div>
      </template>

      <template v-else>
        <div class="browser-runtime-error-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h3 class="browser-runtime-title">{{ title }}</h3>
        <p class="browser-runtime-description">{{ errorMessage || description }}</p>
        <div class="browser-runtime-actions">
          <button
            data-testid="browser-runtime-cancel"
            class="browser-runtime-button browser-runtime-button-secondary"
            type="button"
            @click="emit('cancel')"
          >
            {{ cancelText }}
          </button>
          <button
            data-testid="browser-runtime-confirm"
            class="browser-runtime-button browser-runtime-button-primary"
            type="button"
            @click="emit('confirm')"
          >
            {{ retryText || confirmText }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type DialogPhase = 'confirm' | 'downloading' | 'error'

const props = withDefaults(defineProps<{
  visible: boolean
  phase: DialogPhase
  title: string
  description?: string
  errorMessage?: string
  downloadingTitle?: string
  progress?: number
  progressTotal?: number | null
  progressMessage?: string
  confirmText?: string
  retryText?: string
  cancelText?: string
}>(), {
  description: '',
  errorMessage: '',
  downloadingTitle: '',
  progress: 0,
  progressTotal: null,
  progressMessage: '',
  confirmText: '立即安装',
  retryText: '重试',
  cancelText: '取消',
})

const emit = defineEmits<{
  (event: 'confirm'): void
  (event: 'cancel'): void
}>()

const progressPercent = computed(() => {
  const downloaded = Number(props.progress) || 0
  const total = Number(props.progressTotal) || 0
  const value = total > 0 ? (downloaded / total) * 100 : downloaded
  return Math.max(0, Math.min(100, Math.round(value)))
})
</script>

<style scoped>
.browser-runtime-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, .4);
}

.browser-runtime-modal {
  width: min(380px, calc(100vw - 40px));
  padding: 32px;
  text-align: center;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, .15);
}

.browser-runtime-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.browser-runtime-header-centered {
  margin-bottom: 16px;
}

.browser-runtime-icon {
  display: flex;
  align-items: center;
  color: rgb(var(--color-primary-500));
}

.browser-runtime-error-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
  color: #ef4444;
}

.browser-runtime-title {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 600;
}

.browser-runtime-description,
.browser-runtime-hint {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
}

.browser-runtime-description {
  margin-bottom: 24px;
}

.browser-runtime-progress-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 12px;
}

.browser-runtime-progress {
  flex: 1;
  width: 100%;
  height: 8px;
  overflow: hidden;
  accent-color: rgb(var(--color-primary-500));
}

.browser-runtime-progress-text {
  min-width: 40px;
  color: rgb(var(--color-primary-600));
  font-size: 14px;
  font-weight: 600;
}

.browser-runtime-hint {
  color: #9ca3af;
  font-size: 13px;
}

.browser-runtime-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.browser-runtime-button {
  flex: 1;
  padding: 10px 0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background .2s;
}

.browser-runtime-button-secondary {
  color: #374151;
  background: #fff;
  border: 1px solid #d1d5db;
}

.browser-runtime-button-secondary:hover {
  background: #f3f4f6;
}

.browser-runtime-button-primary {
  color: #fff;
  background: rgb(var(--color-primary-500));
  border: 0;
}

.browser-runtime-button-primary:hover {
  background: rgb(var(--color-primary-600));
}
</style>
