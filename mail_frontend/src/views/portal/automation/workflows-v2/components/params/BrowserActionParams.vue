<template>
  <div class="space-y-2">
    <!-- 通用字段：selector -->
    <div v-if="needsSelector" class="flex items-center gap-2">
      <label class="text-xs text-gray-500 w-16 shrink-0">目标元素</label>
      <input
        :value="params.selector"
        @input="update('selector', $event.target.value)"
        class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        placeholder="页面上的元素位置（AI 自动填写）"
      />
    </div>

    <!-- navigate: url + wait_until -->
    <template v-if="action === 'navigate'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">URL</label>
        <input
          :value="params.url"
          @input="update('url', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="https://..."
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">等待策略</label>
        <select
          :value="params.wait_until || 'networkidle'"
          @change="update('wait_until', $event.target.value)"
          class="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="domcontentloaded">DOM 加载完成</option>
          <option value="load">页面加载完成</option>
          <option value="networkidle">网络空闲</option>
        </select>
      </div>
    </template>

    <!-- fill: 智能填值 -->
    <template v-if="action === 'fill'">
      <SmartValueEditor
        :strategy="params.value_strategy || null"
        :value="params.value || ''"
        :element-context="elementContext"
        @update:strategy="$emit('strategy-update', $event)"
        @update:value="update('value', $event)"
      />
    </template>

    <!-- select: 智能填值 -->
    <template v-if="action === 'select'">
      <SmartValueEditor
        :strategy="params.value_strategy || null"
        :value="params.value || ''"
        :element-context="elementContext"
        @update:strategy="$emit('strategy-update', $event)"
        @update:value="update('value', $event)"
      />
    </template>

    <!-- check: checked state -->
    <template v-if="action === 'check'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">勾选</label>
        <label class="flex items-center gap-1.5 text-xs text-gray-700">
          <input
            type="checkbox"
            :checked="params.checked !== false"
            @change="update('checked', $event.target.checked)"
            class="rounded"
          />
          选中
        </label>
      </div>
    </template>

    <!-- wait_for: state -->
    <template v-if="action === 'wait_for'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">等待状态</label>
        <select
          :value="params.state || 'visible'"
          @change="update('state', $event.target.value)"
          class="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="visible">可见</option>
          <option value="attached">已挂载</option>
          <option value="hidden">隐藏</option>
          <option value="detached">已移除</option>
        </select>
      </div>
    </template>

    <!-- extract_text -->
    <template v-if="action === 'extract_text'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">存入变量</label>
        <input
          :value="params.variable_name"
          @input="update('variable_name', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="变量名"
        />
      </div>
    </template>

    <!-- extract_attr -->
    <template v-if="action === 'extract_attr'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">属性名</label>
        <input
          :value="params.attribute"
          @input="update('attribute', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="href / src / value ..."
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">存入变量</label>
        <input
          :value="params.variable_name"
          @input="update('variable_name', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="变量名"
        />
      </div>
    </template>

    <!-- keyboard: key -->
    <template v-if="action === 'keyboard'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">按键</label>
        <select
          :value="params.key || 'Enter'"
          @change="update('key', $event.target.value)"
          class="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="Enter">Enter</option>
          <option value="Tab">Tab</option>
          <option value="Escape">Escape</option>
          <option value="ArrowDown">ArrowDown</option>
          <option value="ArrowUp">ArrowUp</option>
          <option value="Space">Space</option>
        </select>
      </div>
    </template>

    <!-- javascript: expression -->
    <template v-if="action === 'javascript'">
      <div class="flex items-start gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0 mt-1.5">JS 代码</label>
        <textarea
          :value="params.expression"
          @input="update('expression', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none min-h-[60px]"
          placeholder="document.querySelector(...)"
        ></textarea>
      </div>
    </template>

    <!-- screenshot: full_page -->
    <template v-if="action === 'screenshot'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">全页截图</label>
        <label class="flex items-center gap-1.5 text-xs text-gray-700">
          <input
            type="checkbox"
            :checked="params.full_page === true"
            @change="update('full_page', $event.target.checked)"
            class="rounded"
          />
          截取完整页面
        </label>
      </div>
    </template>

    <!-- scroll: 滚动页面 -->
    <template v-if="action === 'scroll'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">滚动到</label>
        <select
          :value="params.target || 'bottom'"
          @change="update('target', $event.target.value)"
          class="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="bottom">页面底部</option>
          <option value="top">页面顶部</option>
          <option value="pixels">指定像素</option>
        </select>
      </div>
      <div v-if="params.target === 'pixels'" class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">像素值</label>
        <input
          :value="params.y || 500"
          @input="update('y', Number($event.target.value))"
          type="number"
          class="w-28 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        />
      </div>
      <div class="text-xs text-gray-400">滚动后等待 {{ params.wait_after_ms || 1000 }}ms 让内容加载</div>
    </template>

    <!-- dismiss_dialog: 处理弹窗 -->
    <template v-if="action === 'dismiss_dialog'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">操作</label>
        <select
          :value="params.action || 'accept'"
          @change="update('action', $event.target.value)"
          class="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="accept">确认</option>
          <option value="dismiss">取消</option>
        </select>
      </div>
      <div class="text-xs text-gray-400">自动处理 alert/confirm/prompt 弹窗</div>
    </template>

    <!-- switch_to_frame: 切换iframe -->
    <template v-if="action === 'switch_to_frame'">
      <div class="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded p-2">
        切换到 iframe 内操作，完成后用「切回主框架」返回
      </div>
    </template>

    <!-- switch_to_main: 切回主框架 -->
    <template v-if="action === 'switch_to_main'">
      <div class="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded p-2">
        从 iframe 切回主框架
      </div>
    </template>

    <!-- upload_file: 文件上传 -->
    <template v-if="action === 'upload_file'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">文件路径</label>
        <input
          :value="params.file_path || ''"
          @input="update('file_path', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="/path/to/file.jpg"
        />
      </div>
    </template>

    <!-- handle_new_tab: 处理新标签页 -->
    <template v-if="action === 'handle_new_tab'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">触发元素</label>
        <input
          :value="params.trigger_selector || ''"
          @input="update('trigger_selector', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="点击后会打开新标签页的按钮"
        />
      </div>
      <div class="text-xs text-gray-400">等待新标签页打开并自动切换到新页面</div>
    </template>

    <!-- close_tab: 关闭标签页 -->
    <template v-if="action === 'close_tab'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">关闭</label>
        <select
          :value="params.target || 'new'"
          @change="update('target', $event.target.value)"
          class="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="new">新标签页</option>
          <option value="current">当前页</option>
        </select>
      </div>
    </template>

    <!-- wait_for_navigation: 等待跳转 -->
    <template v-if="action === 'wait_for_navigation'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">等待策略</label>
        <select
          :value="params.wait_until || 'domcontentloaded'"
          @change="update('wait_until', $event.target.value)"
          class="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="domcontentloaded">DOM 加载</option>
          <option value="load">完全加载</option>
          <option value="networkidle">网络空闲</option>
        </select>
      </div>
    </template>

    <!-- close_overlay: 关闭遮罩 -->
    <template v-if="action === 'close_overlay'">
      <div class="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded p-2">
        自动检测并关闭 Cookie 横幅、广告弹窗、模态框等遮罩。也可指定关闭按钮的选择器。
      </div>
    </template>

    <!-- wait_for_url: 等待URL -->
    <template v-if="action === 'wait_for_url'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">URL 模式</label>
        <input
          :value="params.pattern || ''"
          @input="update('pattern', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="**/success** 或正则"
        />
      </div>
    </template>

    <!-- drag_and_drop: 拖拽 -->
    <template v-if="action === 'drag_and_drop'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">源元素</label>
        <input
          :value="params.source_selector || ''"
          @input="update('source_selector', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="拖拽起始元素"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">目标</label>
        <input
          :value="params.target_selector || ''"
          @input="update('target_selector', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="目标元素（或留空用偏移）"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">X偏移</label>
        <input
          :value="params.offset_x || 0"
          @input="update('offset_x', Number($event.target.value))"
          type="number"
          class="w-20 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        />
        <label class="text-xs text-gray-500 w-10 shrink-0">Y偏移</label>
        <input
          :value="params.offset_y || 0"
          @input="update('offset_y', Number($event.target.value))"
          type="number"
          class="w-20 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        />
      </div>
      <div class="text-xs text-gray-400">用于滑块验证码等拖拽场景</div>
    </template>

    <!-- 通用字段：timeout -->
    <div v-if="showTimeout" class="flex items-center gap-2">
      <label class="text-xs text-gray-500 w-16 shrink-0">超时(ms)</label>
      <input
        :value="params.timeout"
        @input="update('timeout', Number($event.target.value))"
        type="number"
        class="w-28 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        placeholder="15000"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SmartValueEditor from '../SmartValueEditor.vue'

const SELECTOR_ACTIONS = new Set([
  'click', 'fill', 'select', 'check', 'hover', 'wait_for', 'extract_text', 'extract_attr',
  'switch_to_frame', 'upload_file', 'close_overlay',
])

const props = defineProps({
  action: { type: String, required: true },
  params: { type: Object, default: () => ({}) },
  elementContext: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update', 'strategy-update'])

const needsSelector = computed(() => SELECTOR_ACTIONS.has(props.action))
const showTimeout = computed(() => props.action !== 'screenshot')

const update = (key, value) => emit('update', key, value)
</script>
