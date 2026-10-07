<template>
  <div class="markdown-editor">
    <div class="editor-container">
      <!-- 左侧编辑区 -->
      <div class="editor-pane">
        <div class="pane-header">
          <span class="title">编辑</span>
        </div>
        <textarea
          ref="textarea"
          v-model="localContent"
          class="markdown-textarea"
          placeholder="在此输入Markdown格式的详细说明..."
          @input="handleInput"
        />
      </div>

      <!-- 分隔线 -->
      <div class="divider"></div>

      <!-- 右侧预览区 -->
      <div class="preview-pane">
        <div class="pane-header">
          <span class="title">预览</span>
        </div>
        <div class="markdown-preview" v-html="renderedHtml"></div>
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <div class="editor-footer" v-if="showFooter">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
    </div>
  </div>
</template>

<script>
import { marked } from 'marked'
import DOMPurify from 'dompurify'

export default {
  name: 'MarkdownEditor',
  props: {
    content: {
      type: String,
      default: ''
    },
    showFooter: {
      type: Boolean,
      default: true
    },
  },
  data() {
    return {
      localContent: this.content,
      saving: false
    }
  },
  computed: {
    renderedHtml() {
      if (!this.localContent) {
        return '<div class="empty-preview">暂无内容，请在左侧编辑区输入...</div>'
      }
      try {
        const rawHtml = marked(this.localContent)
        return DOMPurify.sanitize(rawHtml)
      } catch (error) {
        return '<div class="error-preview">Markdown渲染出错</div>'
      }
    }
  },
  watch: {
    content(newVal) {
      this.localContent = newVal
    }
  },
  methods: {
    handleInput() {
      this.$emit('update:content', this.localContent)
    },

    handleSave() {
      this.$emit('save', this.localContent)
    },

    handleCancel() {
      this.$emit('cancel')
    },

    setContent(content) {
      this.localContent = content
    },

    setSaving(loading) {
      this.saving = loading
    }
  }
}
</script>

<style scoped>
.markdown-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  overflow: hidden;
}

.editor-container {
  display: flex;
  flex: 1;
  min-height: 0;
}

.editor-pane,
.preview-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.pane-header .title {
  font-weight: 500;
  color: #6b7280;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.markdown-textarea {
  flex: 1;
  padding: 20px;
  border: none;
  resize: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 15px;
  line-height: 1.7;
  outline: none;
  background: #fff;
  color: #1f2937;
}

.markdown-textarea::placeholder {
  color: #9ca3af;
}

.markdown-textarea:focus {
  outline: none;
}

.divider {
  width: 1px;
  background: #e5e7eb;
  flex-shrink: 0;
}

.markdown-preview {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  line-height: 1.7;
  background: #fff;
}

/* Markdown样式 - 参考GitHub和Notion */
.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4),
.markdown-preview :deep(h5),
.markdown-preview :deep(h6) {
  margin-top: 24px;
  margin-bottom: 12px;
  font-weight: 600;
  line-height: 1.3;
  color: #111827;
}

.markdown-preview :deep(h1:first-child),
.markdown-preview :deep(h2:first-child),
.markdown-preview :deep(h3:first-child) {
  margin-top: 0;
}

.markdown-preview :deep(h1) {
  font-size: 28px;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 8px;
  margin-bottom: 16px;
}

.markdown-preview :deep(h2) {
  font-size: 22px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 6px;
  margin-bottom: 14px;
}

.markdown-preview :deep(h3) { font-size: 18px; }
.markdown-preview :deep(h4) { font-size: 16px; }
.markdown-preview :deep(h5) { font-size: 14px; }
.markdown-preview :deep(h6) {
  font-size: 14px;
  color: #6b7280;
}

.markdown-preview :deep(p) {
  margin-top: 0;
  margin-bottom: 16px;
  color: #374151;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  padding-left: 28px;
  margin-top: 0;
  margin-bottom: 16px;
  color: #374151;
}

.markdown-preview :deep(li) {
  margin-bottom: 6px;
}

.markdown-preview :deep(code) {
  padding: 2px 6px;
  margin: 0 2px;
  font-size: 13px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
  color: #dc2626;
}

.markdown-preview :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.5;
  background-color: #1f2937;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.markdown-preview :deep(pre code) {
  background-color: transparent;
  border: none;
  padding: 0;
  color: #e5e7eb;
  font-size: 13px;
}

.markdown-preview :deep(blockquote) {
  padding: 12px 16px;
  color: #6b7280;
  background: #f9fafb;
  border-left: 4px solid #3b82f6;
  margin: 0 0 16px 0;
  border-radius: 0 4px 4px 0;
}

.markdown-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.markdown-preview :deep(table th),
.markdown-preview :deep(table td) {
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
}

.markdown-preview :deep(table th) {
  font-weight: 600;
  background-color: #f3f4f6;
  color: #111827;
}

.markdown-preview :deep(table tr) {
  background-color: #fff;
}

.markdown-preview :deep(table tr:nth-child(even)) {
  background-color: #f9fafb;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  border-radius: 6px;
  margin: 16px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.markdown-preview :deep(hr) {
  height: 2px;
  padding: 0;
  margin: 24px 0;
  background-color: #e5e7eb;
  border: 0;
  border-radius: 1px;
}

.markdown-preview :deep(a) {
  color: #3b82f6;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.markdown-preview :deep(a:hover) {
  border-bottom-color: #3b82f6;
}

.markdown-preview .empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 14px;
}

.markdown-preview .error-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #ef4444;
  font-size: 14px;
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
</style>
