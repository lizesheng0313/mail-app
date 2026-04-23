<template>
  <div>
    <PageHeader />

    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        <!-- ═══ 顶部：输入区 ═══ -->
        <GeneratePanel
          :form="form"
          :generating="generating"
          :generating-tip="generatingTip"
          :snapshot-info="snapshotInfo"
          @update:form="form = $event"
          @generate="generate"
        />

        <!-- ═══ 主内容区 ═══ -->
        <div v-if="draft.blocks.length" class="space-y-4">

          <!-- 操作栏：标题 + 试运行 + 保存 -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div class="flex items-center justify-between flex-wrap gap-3">
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-semibold text-black">流程步骤</h2>
                <span class="text-xs text-gray-400">{{ totalSteps }} 个步骤</span>
              </div>
              <div class="flex items-center gap-2">
                <!-- 执行结果摘要 -->
                <div v-if="runResult" class="flex items-center gap-2 text-xs mr-2">
                  <span :class="runResult.status === 'completed' ? 'text-green-600' : 'text-red-600'" class="font-medium">
                    {{ runResult.status === 'completed' ? '全部通过' : '存在失败' }}
                  </span>
                  <span class="text-gray-400">{{ runResult.success_steps }}/{{ runResult.total_steps }} 成功</span>
                </div>
                <!-- 查看日志 -->
                <button
                  v-if="debugLogs.length && !showLogPanel"
                  @click="showLogPanel = true"
                  class="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  📋 日志
                </button>
                <!-- 试运行 -->
                <button
                  @click="debugRunSSE"
                  :disabled="debugging"
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  :class="debugging
                    ? 'bg-gray-100 text-gray-400 cursor-wait'
                    : 'bg-gray-900 text-white hover:bg-black'"
                >
                  <span v-if="debugging" class="flex items-center gap-2">
                    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    执行中...
                  </span>
                  <span v-else>试运行</span>
                </button>
                <!-- 从失败步继续 -->
                <button
                  v-if="lastFailedStepIdx > 0 && !debugging"
                  @click="debugRunSSE(lastFailedStepIdx)"
                  class="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  从第{{ lastFailedStepIdx }}步继续
                </button>
                <button
                  @click="compileAndSave"
                  :disabled="saving"
                  class="px-4 py-2 rounded-lg text-sm font-medium border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-60 transition-colors"
                >
                  {{ saving ? '保存中...' : '保存' }}
                </button>
              </div>
            </div>
          </div>

          <!-- 页面标注 + 运行日志弹窗 -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <PageAnnotation
              :screenshot-b64="screenshotB64"
              :viewport="snapshotViewport"
              :snapshot="snapshotInfo"
              :draft="draft"
              :action-labels="actionLabelMap"
              :debug-logs="debugLogs"
              :debugging="debugging"
              :show-log-panel="showLogPanel"
              @close-log-panel="showLogPanel = false"
            />
          </div>
        </div>

        <!-- 空状态引导 -->
        <div v-else-if="!generating" class="bg-white rounded-xl shadow-sm border border-gray-100 p-10">
          <div class="max-w-lg mx-auto text-center space-y-4">
            <h3 class="text-lg font-semibold text-gray-800">3 步完成自动化</h3>
            <div class="text-sm text-gray-500 space-y-1">
              <p>1. 粘贴目标网址，描述你要做什么</p>
              <p>2. AI 分析页面后自动生成全部操作步骤（邮箱/密码/用户名自动生成）</p>
              <p>3. 点「试运行」看效果，满意后保存</p>
            </div>

            <div class="pt-2">
              <p class="text-xs text-gray-400 mb-2">试试这些场景：</p>
              <div class="flex flex-wrap justify-center gap-2">
                <button
                  v-for="eg in examples"
                  :key="eg.goal"
                  @click="form.url = eg.url; form.goal = eg.goal"
                  class="px-3 py-1.5 text-xs rounded-full border border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  {{ eg.goal }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 悬浮 AI 聊天助手 -->
    <AIChatPanel
      v-if="draft.blocks.length"
      :draft="draft"
      :snapshot-info="snapshotInfo"
      @apply-draft="applyDraftFromChat"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader/index.vue'
import PageAnnotation from './components/PageAnnotation.vue'
import GeneratePanel from './components/GeneratePanel.vue'
import AIChatPanel from './components/AIChatPanel.vue'
import { workflowV2Api } from '@/api/workflowV2'
import { showMessage } from '@/utils/message'

const router = useRouter()

// ── action 列表（中文标签） ──
const pluginActions = [
  { key: 'allocate_email', label: '分配邮箱' },
  { key: 'wait_email_code', label: '等待邮件验证码' },
  { key: 'solve_captcha', label: '识别验证码' },
  { key: 'get_phone_number', label: '获取手机号' },
  { key: 'wait_sms_code', label: '等待短信验证码' },
]
const browserActions = [
  { key: 'navigate', label: '打开网页' },
  { key: 'click', label: '点击' },
  { key: 'fill', label: '填写输入框' },
  { key: 'select', label: '下拉选择' },
  { key: 'check', label: '勾选' },
  { key: 'hover', label: '鼠标悬停' },
  { key: 'wait_for', label: '等待元素' },
  { key: 'scroll', label: '滚动页面' },
  { key: 'screenshot', label: '截图' },
  { key: 'extract_text', label: '提取文字' },
  { key: 'extract_attr', label: '提取属性' },
  { key: 'keyboard', label: '按键' },
  { key: 'javascript', label: '执行脚本' },
  { key: 'dismiss_dialog', label: '处理弹窗' },
  { key: 'switch_to_frame', label: '切换iframe' },
  { key: 'switch_to_main', label: '切回主框架' },
  { key: 'upload_file', label: '上传文件' },
  { key: 'handle_new_tab', label: '处理新标签页' },
  { key: 'close_tab', label: '关闭标签页' },
  { key: 'wait_for_navigation', label: '等待跳转' },
  { key: 'close_overlay', label: '关闭遮罩' },
  { key: 'wait_for_url', label: '等待URL' },
  { key: 'drag_and_drop', label: '拖拽操作' },
]
const dataActions = [
  { key: 'replan', label: '重新分析页面' },
  { key: 'generate_password', label: '生成密码' },
  { key: 'generate_username', label: '生成用户名' },
  { key: 'set_variable', label: '设置变量' },
  { key: 'delay', label: '等待延迟' },
  { key: 'http_request', label: '发送请求' },
  { key: 'json_parse', label: '解析JSON' },
  { key: 'condition', label: '条件判断' },
  { key: 'text_process', label: '文本处理' },
  { key: 'math_calc', label: '数学计算' },
  { key: 'datetime', label: '日期时间' },
  { key: 'array_operate', label: '数组操作' },
  { key: 'log', label: '记录日志' },
]

const actionLabelMap = Object.fromEntries(
  [...pluginActions, ...browserActions, ...dataActions].map(a => [a.key, a.label])
)

// ── 表单状态 ──
const form = ref({ url: '', goal: '', max_blocks: 6 })
const draft = ref({ name: '', description: '', url: '', goal: '', blocks: [] })
const snapshotInfo = ref(null)
const screenshotB64 = ref(null)
const snapshotViewport = ref(null)

// ── 示例场景 ──
const examples = [
  { url: 'https://example.com/register', goal: '自动注册账号' },
  { url: 'https://example.com/login', goal: '自动登录' },
  { url: 'https://example.com/form', goal: '自动填写表单并提交' },
]

// ── loading 状态 ──
const generating = ref(false)
const generatingTip = ref('')
const debugging = ref(false)
const showLogPanel = ref(false)
const saving = ref(false)

// ── 调试状态 ──
const debugLogs = ref([])
const runResult = ref(null)

// ── 计算属性 ──
const SYSTEM_ACTIONS = new Set([
  'navigate', 'allocate_email', 'generate_password', 'generate_username',
  'wait_for', 'switch_to_frame', 'switch_to_main', 'close_overlay',
  'wait_for_navigation', 'set_variable', 'delay', 'log', 'scroll',
  'get_phone_number', 'screenshot', 'replan', 'dismiss_dialog',
  'wait_for_url', 'handle_new_tab', 'close_tab', 'keyboard',
])
const totalSteps = computed(() =>
  draft.value.blocks.reduce((sum, b) =>
    sum + (b.internal_steps || []).filter(s => !SYSTEM_ACTIONS.has(s.action_key)).length, 0)
)

// ── API: 生成草稿 ──
const generate = async () => {
  if (!form.value.url) {
    showMessage('请输入目标网址', 'warning')
    return
  }
  if (!form.value.goal) {
    showMessage('请描述你要做什么', 'warning')
    return
  }
  if (!form.value.url.startsWith('http://') && !form.value.url.startsWith('https://')) {
    form.value.url = 'https://' + form.value.url
  }

  generating.value = true
  generatingTip.value = '正在打开浏览器...'
  // 清空旧数据，防止上一次结果残留
  draft.value = { name: '', description: '', url: '', goal: '', blocks: [] }
  screenshotB64.value = null
  snapshotInfo.value = null
  snapshotViewport.value = null
  debugLogs.value = []
  runResult.value = null
  try {
    setTimeout(() => { if (generating.value) generatingTip.value = '正在渲染页面...' }, 3000)
    setTimeout(() => { if (generating.value) generatingTip.value = '正在分析页面结构...' }, 7000)
    setTimeout(() => { if (generating.value) generatingTip.value = 'AI生成操作步骤...' }, 12000)

    const res = await workflowV2Api.generatePlanFromUrl({
      url: form.value.url,
      goal: form.value.goal,
      max_blocks: form.value.max_blocks
    })
    if (res.code === 0 && res.data?.draft) {
      draft.value = res.data.draft
      snapshotInfo.value = res.data.meta?.url_snapshot || null
      screenshotB64.value = res.data.screenshot_b64 || null
      snapshotViewport.value = res.data.viewport || null
      showMessage('页面分析完成，已生成操作步骤', 'success')
    }
  } catch (err) {
    console.error(err)
  } finally {
    generating.value = false
  }
}

// ── API: SSE 实时调试 ──
// 找到最后一个失败步骤的序号
const lastFailedStepIdx = computed(() => {
  for (let i = debugLogs.value.length - 1; i >= 0; i--) {
    if (debugLogs.value[i].status === 'failed') return debugLogs.value[i].order || 0
  }
  return 0
})

let stepTimeoutTimer = null

const debugRunSSE = async (startFrom = 0) => {
  if (!draft.value.blocks.length) return
  debugging.value = true
  showLogPanel.value = true
  if (startFrom === 0) {
    debugLogs.value = []
  }
  runResult.value = null
  if (stepTimeoutTimer) clearTimeout(stepTimeoutTimer)

  try {
    await workflowV2Api.debugRunSSE(
      {
        draft: draft.value,
        input_context: {},
        options: {},
        start_from_step: parseInt(startFrom) || 0,
      },
      (event, data) => {
        if (event === 'step_start') {
          debugLogs.value.push({
            step_id: data.step_id, step_name: data.step_name,
            order: data.order, attempt: 1, status: 'running',
            duration_ms: 0, summary: `执行中: ${data.action_key}`,
            debug_output: { action_key: data.action_key }
          })
          // 60秒超时提示（不中断SSE，等后端真实结果）
          if (stepTimeoutTimer) clearTimeout(stepTimeoutTimer)
          stepTimeoutTimer = setTimeout(() => {
            const log = debugLogs.value.find(l => l.step_id === data.step_id && l.status === 'running')
            if (log) {
              log.summary = '等待后端响应中（已超过60秒）...'
              showMessage(`步骤 #${data.order} ${data.step_name} 执行较慢，等待中...`, 'warning')
            }
          }, 60000)
        } else if (event === 'step_success') {
          if (stepTimeoutTimer) clearTimeout(stepTimeoutTimer)
          const log = debugLogs.value.find(l => l.step_id === data.step_id && (l.status === 'running' || l.status === 'retrying'))
          if (log) {
            log.status = 'success'
            log.duration_ms = data.duration_ms
            log.attempt = data.attempt
            log.summary = data.result ? `${data.result}` : '执行成功'
            // 验证码识别时保存截图，方便调试
            if (data.captcha_image_b64) {
              log.debug_output = { ...log.debug_output, captcha_image_b64: data.captcha_image_b64 }
            }
          }
        } else if (event === 'step_fail') {
          if (stepTimeoutTimer) clearTimeout(stepTimeoutTimer)
          const log = debugLogs.value.find(l => l.step_id === data.step_id && (l.status === 'running' || l.status === 'retrying'))
          if (log) {
            log.status = 'failed'
            log.summary = data.error || '执行失败'
            log.debug_output = {
              ...log.debug_output, error: data.error,
              current_url: data.current_url || '',
              screenshot_b64: data.screenshot_b64 || '',
              ...(data.captcha_image_b64 ? { captcha_image_b64: data.captcha_image_b64 } : {}),
            }
            // 失败时用全屏截图替换主截图区域，让用户看到出错时的浏览器画面
            if (data.screenshot_b64) {
              screenshotB64.value = data.screenshot_b64
            }
          }
          // 失败时立即结束"执行中"状态，让用户能操作
          debugging.value = false
        } else if (event === 'step_retry') {
          const log = debugLogs.value.find(l => l.step_id === data.step_id && (l.status === 'running' || l.status === 'failed'))
          if (log) {
            log.status = 'retrying'
            log.attempt = data.attempt
            log.summary = `重试中 (第${data.attempt}次): ${data.error || ''}`
            if (data.current_url) log.debug_output = { ...log.debug_output, current_url: data.current_url }
            if (data.screenshot_b64) log.debug_output = { ...log.debug_output, screenshot_b64: data.screenshot_b64 }
          }
        } else if (event === 'step_skip') {
          // 跳过的步骤不显示在日志里
        } else if (event === 'result') {
          // 把所有还在 running/retrying 的 log 强制标记为 failed
          debugLogs.value.forEach(log => {
            if (log.status === 'running' || log.status === 'retrying') {
              log.status = 'failed'
              if (!log.debug_output?.error) {
                log.summary = data.last_error || '执行失败'
                log.debug_output = { ...log.debug_output, error: data.last_error || '' }
              }
            }
          })
          runResult.value = {
            status: data.status,
            total_steps: data.total_steps || 0,
            success_steps: data.success_steps || 0,
            failed_steps: data.failed_steps || 0,
            skipped_steps: data.skipped_steps || 0,
            total_attempts: data.total_attempts || 0,
          }
          // 失败时用全屏截图更新主截图区
          if (data.screenshot_b64) {
            screenshotB64.value = data.screenshot_b64
            // 同时写入最后一个失败 log 的截图
            const failedLog = [...debugLogs.value].reverse().find(l => l.status === 'failed')
            if (failedLog && !failedLog.debug_output?.screenshot_b64) {
              failedLog.debug_output = { ...failedLog.debug_output, screenshot_b64: data.screenshot_b64 }
            }
          }
          const failed = data.failed_steps || 0
          debugging.value = false
          showMessage(
            failed > 0 ? `执行完成，${failed} 个步骤失败` : '全部步骤执行成功',
            failed > 0 ? 'warning' : 'success'
          )
        } else if (event === 'error') {
          debugging.value = false
          showMessage(data.error || '调试出错', 'error')
        }
      }
    )
  } catch (err) {
    console.error('debugRunSSE error:', err)
    showMessage('试运行失败: ' + (err.message || String(err)), 'error')
  } finally {
    if (stepTimeoutTimer) clearTimeout(stepTimeoutTimer)
    debugging.value = false
  }
}

// ── API: 保存为正式工作流（含截图持久化）──
const compileAndSave = async () => {
  if (!draft.value.blocks.length) return
  saving.value = true
  try {
    const res = await workflowV2Api.saveWorkflow({
      draft: draft.value,
      customer_visibility_mode: 'grouped',
      screenshot_b64: screenshotB64.value || undefined,
    })
    if (res.code === 0) {
      showMessage('工作流已保存', 'success')
      router.push('/automation/workflows')
    } else {
      showMessage(res.message || '保存失败', 'error')
    }
  } catch (err) {
    console.error(err)
  } finally {
    saving.value = false
  }
}

// ── AI 对话式修改应用 ──
const applyDraftFromChat = (newDraft) => {
  draft.value = newDraft
  const failIdx = lastFailedStepIdx.value
  if (failIdx > 0) {
    showMessage(`已应用修改，正在从第${failIdx}步继续执行...`, 'success')
    setTimeout(() => debugRunSSE(failIdx), 800)
  } else {
    showMessage('已应用修改', 'success')
  }
}


</script>
