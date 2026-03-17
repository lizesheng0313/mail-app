<template>
  <div class="mailbox-tags" v-if="sites.length > 0 || tags.length > 0 || showAddButton">
    <div class="tags-wrap">
      <!-- 站点标签 -->
      <span
        v-for="site in displayedSites"
        :key="'site-' + site.id"
        class="badge site-badge"
        :style="badgeStyle(site.site_color)"
        :title="`${site.site_name} · ${site.email_count}封`"
      >
        <img
          v-if="site.site_icon"
          :src="site.site_icon"
          class="badge-icon"
          @error="(e) => e.target.style.display = 'none'"
        />
        <span class="badge-text">{{ site.site_name }}</span>
        <span v-if="editable" class="badge-del" @click.stop="handleDeleteSite(site)">×</span>
      </span>

      <!-- 更多站点 -->
      <span v-if="sites.length > maxDisplay" class="badge more-badge" @click.stop="showAllSites = true">
        +{{ sites.length - maxDisplay }}
      </span>

      <!-- 手动标签 -->
      <span
        v-for="tag in displayedTags"
        :key="'tag-' + tag.id"
        class="badge tag-badge"
        :style="badgeStyle(tag.tag_color)"
      >
        <span class="badge-text">{{ tag.tag_name }}</span>
        <span v-if="editable" class="badge-del" @click.stop="handleDeleteTag(tag)">×</span>
      </span>

      <!-- 更多标签 -->
      <span v-if="tags.length > maxDisplay" class="badge more-badge" @click.stop="showAllTags = true">
        +{{ tags.length - maxDisplay }}
      </span>

      <!-- 添加按钮 -->
      <button v-if="showAddButton && editable" class="add-btn" @click.stop="showAddModal = true">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 4v16m8-8H4"/>
        </svg>
      </button>
    </div>
  </div>

  <Teleport to="body">
    <!-- 添加标签弹窗 -->
    <Transition name="modal">
      <div v-if="showAddModal" ref="addPopupRef" class="popup">
        <div ref="addHandleRef" class="popup-header">
          <span class="popup-title">添加标签</span>
          <button class="popup-close" @click="showAddModal = false">×</button>
        </div>
        <div class="popup-body">
          <input
            v-model="newTagName"
            type="text"
            placeholder="输入标签名称"
            class="popup-input"
            maxlength="20"
            @keyup.enter="handleAddTag"
            autofocus
          />
          <div class="color-row">
            <span class="row-label">颜色</span>
            <div class="color-list">
              <button
                v-for="color in tagColors"
                :key="color"
                class="color-dot"
                :class="{ active: selectedColor === color }"
                :style="{ background: color }"
                @click="selectedColor = color"
              />
            </div>
          </div>
          <div class="quick-row">
            <span class="row-label">快捷</span>
            <div class="quick-list">
              <button
                v-for="qt in quickTags"
                :key="qt"
                class="quick-item"
                :class="{ active: newTagName === qt }"
                @click="newTagName = qt"
              >{{ qt }}</button>
            </div>
          </div>
        </div>
        <div class="popup-footer">
          <button class="btn-cancel" @click="showAddModal = false">取消</button>
          <button class="btn-confirm" @click="handleAddTag" :disabled="!newTagName.trim()">添加</button>
        </div>
      </div>
    </Transition>

    <!-- 全部站点弹窗 -->
    <Transition name="modal">
      <div v-if="showAllSites" ref="sitesPopupRef" class="popup">
        <div ref="sitesHandleRef" class="popup-header">
          <span class="popup-title">全部站点 <span class="popup-count">{{ sites.length }}</span></span>
          <button class="popup-close" @click="showAllSites = false">×</button>
        </div>
        <div class="popup-body">
          <div class="sites-grid">
            <span
              v-for="site in sites"
              :key="'as-' + site.id"
              class="badge site-badge large"
              :style="badgeStyle(site.site_color)"
            >
              <img
                v-if="site.site_icon"
                :src="site.site_icon"
                class="badge-icon"
                @error="(e) => e.target.style.display = 'none'"
              />
              <span class="badge-text">{{ site.site_name }}</span>
              <span class="badge-count">{{ site.email_count }}</span>
              <span v-if="editable" class="badge-del" @click.stop="handleDeleteSite(site)">×</span>
            </span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 全部标签弹窗 -->
    <Transition name="modal">
      <div v-if="showAllTags" ref="tagsPopupRef" class="popup">
        <div ref="tagsHandleRef" class="popup-header">
          <span class="popup-title">全部标签 <span class="popup-count">{{ tags.length }}</span></span>
          <button class="popup-close" @click="showAllTags = false">×</button>
        </div>
        <div class="popup-body">
          <div class="sites-grid">
            <span
              v-for="tag in tags"
              :key="'at-' + tag.id"
              class="badge tag-badge large"
              :style="badgeStyle(tag.tag_color)"
            >
              <span class="badge-text">{{ tag.tag_name }}</span>
              <span v-if="editable" class="badge-del" @click.stop="handleDeleteTag(tag)">×</span>
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { mailboxTagsAPI } from '@/api/mailboxTags'
import { useDraggable } from '@/utils/useDraggable'

const props = defineProps({
  mailboxId: { type: Number, required: true },
  mailboxType: { type: String, default: 'system' },
  editable: { type: Boolean, default: true },
  showAddButton: { type: Boolean, default: true },
  maxDisplay: { type: Number, default: 3 },
  initialSites: { type: Array, default: () => [] },
  initialTags: { type: Array, default: () => [] }
})

const emit = defineEmits(['update'])

const sites = ref([])
const tags = ref([])
const showAddModal = ref(false)
const showAllSites = ref(false)
const showAllTags = ref(false)

// 弹窗拖拽
const addPopupRef = ref(null)
const addHandleRef = ref(null)
const sitesPopupRef = ref(null)
const sitesHandleRef = ref(null)
const tagsPopupRef = ref(null)
const tagsHandleRef = ref(null)

watch(showAddModal, (v) => { if (v) nextTick(() => useDraggable(addHandleRef, addPopupRef).init()) })
watch(showAllSites, (v) => { if (v) nextTick(() => useDraggable(sitesHandleRef, sitesPopupRef).init()) })
watch(showAllTags, (v) => { if (v) nextTick(() => useDraggable(tagsHandleRef, tagsPopupRef).init()) })
const newTagName = ref('')
const selectedColor = ref('#6366F1')

const tagColors = ['#6366F1', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4']
const quickTags = ['已使用', '重要', '待处理', 'VIP', '已过期', '测试']

const displayedSites = computed(() => sites.value.slice(0, props.maxDisplay))
const displayedTags = computed(() => tags.value.slice(0, props.maxDisplay))

function badgeStyle(color) {
  const c = color || '#6366F1'
  return {
    backgroundColor: c + '15',
    borderColor: c + '50',
    color: c
  }
}

function loadData() {
  sites.value = props.initialSites
  tags.value = props.initialTags
}

async function handleAddTag() {
  const name = newTagName.value.trim()
  if (!name) return
  try {
    const res = await mailboxTagsAPI.createTag({
      mailbox_id: Number(props.mailboxId),
      mailbox_type: props.mailboxType,
      tag_name: name,
      tag_color: selectedColor.value
    })
    if (res.code === 0 && res.data) {
      tags.value.push(res.data)
      emit('update', { sites: sites.value, tags: tags.value })
      newTagName.value = ''
      showAddModal.value = false
    }
  } catch (e) {
    console.error('添加标签失败:', e)
  }
}

async function handleDeleteTag(tag) {
  try {
    const res = await mailboxTagsAPI.deleteTag(tag.id)
    if (res.code === 0) {
      tags.value = tags.value.filter(t => t.id !== tag.id)
      emit('update', { sites: sites.value, tags: tags.value })
    }
  } catch (e) {
    console.error('删除标签失败:', e)
  }
}

async function handleDeleteSite(site) {
  try {
    const res = await mailboxTagsAPI.deleteSite(site.id)
    if (res.code === 0) {
      sites.value = sites.value.filter(s => s.id !== site.id)
      showAllSites.value = false
      emit('update', { sites: sites.value, tags: tags.value })
    }
  } catch (e) {
    console.error('删除站点失败:', e)
  }
}

watch(() => [props.initialSites, props.initialTags], ([s, t]) => {
  sites.value = s
  tags.value = t
}, { deep: true })

onMounted(loadData)
defineExpose({ loadData })
</script>

<style scoped>
.mailbox-tags {
  margin-top: 6px;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

/* 通用 badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border: 1px solid;
  border-radius: 3px;
  font-size: 11px;
  line-height: 18px;
  white-space: nowrap;
  cursor: default;
  transition: opacity 0.15s;
}

.badge-icon {
  width: 11px;
  height: 11px;
  border-radius: 2px;
  flex-shrink: 0;
}

.badge-text {
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge.large .badge-text {
  max-width: 90px;
}

.badge-count {
  font-size: 10px;
  opacity: 0.6;
}

/* 删除按钮 - 始终占位，避免 hover 时宽度变化导致换行 */
.badge-del {
  width: 12px;
  height: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  line-height: 1;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}

.badge:hover .badge-del {
  opacity: 1;
}

.badge-del:hover {
  background: rgba(0,0,0,0.15);
}

.more-badge {
  background: #f1f5f9 !important;
  border-color: #e2e8f0 !important;
  color: #64748b !important;
  cursor: pointer;
}

.more-badge:hover {
  background: #e2e8f0 !important;
}

/* 添加按钮 */
.add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1px dashed #cbd5e1;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s, color 0.15s;
}

.add-btn:hover {
  border-color: #94a3b8;
  color: #64748b;
}

/* 弹窗 */
.popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 10px;
  width: 300px;
  max-width: 92vw;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  overflow: hidden;
  z-index: 99999;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.popup-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.popup-count {
  font-size: 12px;
  font-weight: 400;
  color: #9ca3af;
  margin-left: 4px;
}

.popup-close {
  width: 24px;
  height: 24px;
  border: none;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-close:hover {
  background: #e5e7eb;
}

.popup-body {
  padding: 14px 16px;
}

.popup-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.popup-input:focus {
  border-color: rgb(var(--color-primary-400));
  box-shadow: 0 0 0 2px rgba(var(--color-primary-500), 0.1);
}

.color-row, .quick-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.row-label {
  font-size: 12px;
  color: #9ca3af;
  white-space: nowrap;
  flex-shrink: 0;
  width: 28px;
}

.color-list {
  display: flex;
  gap: 5px;
  flex-wrap: nowrap;
}

.color-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.color-dot:hover {
  transform: scale(1.15);
}

.color-dot.active {
  border-color: #1f2937;
  transform: scale(1.15);
}

.quick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.quick-item {
  padding: 2px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  background: #f9fafb;
  font-size: 11px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-item:hover, .quick-item.active {
  border-color: rgb(var(--color-primary-400));
  color: rgb(var(--color-primary-600));
  background: rgb(var(--color-primary-50, 239 246 255));
}

.popup-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #f0f0f0;
}

.btn-cancel {
  padding: 6px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #f9fafb;
}

.btn-confirm {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: rgb(var(--color-primary-500));
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-confirm:hover {
  background: rgb(var(--color-primary-600));
}

.btn-confirm:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.sites-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}

/* 弹窗动画 */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.96);
}
</style>
