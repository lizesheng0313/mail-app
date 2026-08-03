<template>
  <div class="browser-workflow-page">
    <div v-if="browserRuntimeBusy && desktopRuntime" class="browser-runtime-dialog">
      <div class="browser-runtime-card">
        <strong>准备浏览器工作流组件</strong>
        <span>{{ browserRuntimeProgress.message || '正在检查组件状态' }}</span>
        <progress v-if="browserRuntimeProgress.total" :value="browserRuntimeProgress.downloaded" :max="browserRuntimeProgress.total" />
        <div class="browser-runtime-actions"><button class="secondary-button" @click="cancelBrowserRuntime">取消本次操作</button></div>
      </div>
    </div>
    <div v-if="runInputVisible" class="browser-runtime-dialog" @click.self="runInputVisible = false">
      <div class="browser-runtime-card workflow-input-card">
        <header><div><strong>填写运行参数</strong><span>这些参数来自开始节点，可被后续任意上游路径中的节点引用。</span></div><button type="button" @click="runInputVisible = false">×</button></header>
        <label v-for="parameter in workflowInputDefinitions" :key="parameter.name">
          <span>{{ parameter.name }}<b v-if="parameter.required">*</b></span>
          <small v-if="parameter.description">{{ parameter.description }}</small>
          <textarea v-if="['object', 'array'].includes(parameter.type)" v-model="runInputValues[parameter.name]" rows="4" :placeholder="parameter.type === 'array' ? '输入 JSON 数组' : '输入 JSON 对象'" />
          <input v-else-if="parameter.type === 'boolean'" v-model="runInputValues[parameter.name]" type="checkbox" />
          <input v-else v-model="runInputValues[parameter.name]" :type="parameter.type === 'number' ? 'number' : 'text'" />
        </label>
        <div class="browser-runtime-actions"><button class="secondary-button" @click="runInputVisible = false">取消</button><button class="primary-button" @click="executeRunDocument">开始试运行</button></div>
      </div>
    </div>
    <div v-if="recordingStartVisible" class="browser-runtime-dialog" @click.self="recordingStartVisible = false">
      <div class="browser-runtime-card recording-start-card">
        <header>
          <div><strong>开始录制</strong><span>选择新录制步骤要插入到哪个节点之后。</span></div>
          <button type="button" @click="recordingStartVisible = false">×</button>
        </header>
        <label>
          <span>录制起点</span>
          <CustomSelect
            :model-value="recordingAnchorChoice"
            :options="recordingAnchorOptions"
            placeholder="选择一个节点"
            @update:model-value="recordingAnchorChoice = $event"
          />
        </label>
        <div class="browser-runtime-actions">
          <button class="secondary-button" @click="recordingStartVisible = false">取消</button>
          <button class="primary-button" :disabled="!recordingAnchorChoice" @click="confirmRecordingStart">连接浏览器并录制</button>
        </div>
      </div>
    </div>
    <main class="workflow-shell">
      <section class="canvas-panel panel" @dragover.prevent @drop="dropNode">
        <div ref="canvasRef" class="workflow-canvas">
          <button class="canvas-back-button" type="button" title="返回工作流列表" aria-label="返回工作流列表" @pointerdown.stop @click.stop="router.push('/user/automation/browser-workflows')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" /></svg>
          </button>
          <div ref="x6CanvasRef" class="x6-canvas-host" :style="{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }" />
          <div class="canvas-bottom-bar">
            <button class="canvas-action" @click.stop="publishDocument">发布</button>
            <button v-if="executionId" class="canvas-action" :class="{ 'status-action-active': executionPanelVisible }" @click.stop="executionPanelVisible = !executionPanelVisible">执行状态</button>
            <div class="add-node-wrap">
              <button class="canvas-action" :class="{ 'status-action-active': showNodeMenu }" @click.stop="toggleNodeMenu">＋ 节点</button>
              <div v-if="showNodeMenu" class="node-menu">
                <section v-for="group in nodeMenuGroups" :key="group.key" v-show="group.nodes.length" class="node-menu-group">
                  <header><strong>{{ group.title }}</strong><small>{{ group.description }}</small></header>
                  <button v-for="item in group.nodes" :key="item.kind" @click="addNodeFromMenu(item.kind)"><span class="node-icon" :class="`tone-${item.tone}`">{{ item.icon }}</span><span><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span></button>
                </section>
              </div>
            </div>
            <div class="add-node-wrap">
              <button class="canvas-action" :class="{ 'status-action-active': pluginCenterVisible }" @click.stop="openPluginCenter">＋ 插件</button>
              <div v-if="pluginCenterVisible" class="node-menu plugin-menu" @click.stop>
                <section v-for="group in pluginMenuGroups" :key="group.key" v-show="group.plugins.length" class="node-menu-group">
                  <header><strong>{{ group.title }}</strong><small>{{ group.description }}</small></header>
                  <article v-for="plugin in group.plugins" :key="plugin.plugin_id" class="plugin-menu-item">
                    <span class="node-icon" :class="plugin.kind === 'business' ? 'tone-red' : 'tone-amber'">{{ plugin.kind === 'business' ? '◎' : '✦' }}</span>
                    <div class="plugin-menu-main">
                      <div><strong>{{ plugin.name }}</strong><span :class="plugin.enabled ? 'plugin-enabled' : 'plugin-disabled'">{{ plugin.enabled ? '已启用' : (plugin.installed ? '已停用' : '未安装') }}</span></div>
                      <small>{{ plugin.vendor }} · {{ plugin.version }}</small>
                      <small>{{ (plugin.capabilities || []).map(item => item.title).join('、') || '未声明节点能力' }}</small>
                      <div v-if="(plugin.permissions || []).length" class="plugin-menu-permissions"><code v-for="permission in plugin.permissions" :key="permission">{{ permission }}</code></div>
                      <div v-if="plugin.enabled && (plugin.capabilities || []).length" class="plugin-capability-actions">
                        <button v-for="capability in plugin.capabilities" :key="capability.node_kind" type="button" @click="addPluginCapability(capability)">＋ {{ capability.title }}</button>
                      </div>
                    </div>
                    <div class="plugin-menu-actions">
                      <template v-if="!plugin.builtin">
                        <button v-if="!plugin.installed" :disabled="!plugin.available" @click="installPlugin(plugin)">{{ plugin.available ? '安装' : '待审核' }}</button>
                        <template v-else>
                          <button v-if="plugin.update_available" @click="installPlugin(plugin)">升级</button>
                          <button @click="togglePlugin(plugin)">{{ plugin.enabled ? '停用' : '启用' }}</button>
                          <button class="danger-action" @click="uninstallPlugin(plugin)">卸载</button>
                        </template>
                      </template>
                      <span v-else>内置</span>
                    </div>
                  </article>
                </section>
                <div v-if="!pluginCatalog.length" class="plugin-menu-empty">当前没有可用插件</div>
              </div>
            </div>
            <button class="canvas-action" :disabled="document.nodes.length < 2" @click.stop="autoLayout">✦ 整理</button>
            <button class="canvas-action" :disabled="!history.length" @click.stop="undo">↶</button>
            <button class="canvas-action" :disabled="!future.length" @click.stop="redo">↷</button>
            <div class="canvas-primary-actions">
              <button class="canvas-action recording-action" :disabled="stepCaptureActive" @click.stop="openRecordingStart">
                {{ stepCaptureActive ? '录制中' : '录制' }}
              </button>
              <button class="canvas-action trial-action" @click.stop="runDocument">试运行</button>
              <button class="canvas-action primary-action" @click.stop="saveDocument">保存</button>
            </div>
          </div>
          <aside v-if="selectedNode" class="config-panel panel node-config-panel" @click.stop>
            <template v-if="selectedNode">
              <div class="panel-heading"><span>节点配置</span><div class="config-heading-actions"><small>{{ selectedNode.kind }}</small><button type="button" @click="clearSelection">×</button></div></div>
              <label>节点名称<input v-model="selectedNode.title" /></label>
              <label>节点说明<textarea v-model="selectedNode.description" rows="3" placeholder="这个节点要完成什么？" /></label>
              <label>意图描述<textarea v-model="selectedNode.intent.goal" rows="4" placeholder="说明这个节点需要完成的操作" /></label>
              <section v-if="selectedNode.kind !== 'start' && selectedNode.kind !== 'condition'" class="parameter-section">
                <header><div><strong>{{ selectedNode.kind === 'end' ? '流程输出' : '输入参数' }}</strong><small>固定值或引用上游节点的输出</small></div><button type="button" @click="addInputParameter">＋ 添加</button></header>
                <article v-for="(parameter, index) in selectedNode.inputs" :key="`input-${index}`" class="parameter-card">
                  <div class="parameter-row">
                    <input v-model.trim="parameter.name" placeholder="参数名" />
                    <CustomSelect size="sm" :model-value="parameter.type" :options="variableTypeOptions" @update:model-value="parameter.type = $event" />
                    <button type="button" class="parameter-remove" @click="removeInputParameter(index)">×</button>
                  </div>
                  <div class="parameter-row parameter-source-row">
                    <CustomSelect size="sm" :model-value="parameter.source" :options="inputSourceOptions" @update:model-value="updateInputSource(parameter, $event)" />
                    <CustomSelect v-if="parameter.source !== 'literal'" size="sm" :model-value="parameter.variable" :options="variableOptionsFor(parameter)" placeholder="选择上游变量" @update:model-value="parameter.variable = $event" />
                    <input v-else v-model="parameter.value" placeholder="固定值" />
                  </div>
                  <CustomSelect v-if="parameter.source === 'node'" class="parameter-aggregation" size="sm" :model-value="parameter.aggregation" :options="aggregationOptions" @update:model-value="parameter.aggregation = $event" />
                  <input v-model.trim="parameter.description" placeholder="参数说明（可选）" />
                  <label class="parameter-required"><input v-model="parameter.required" type="checkbox" /> 必填</label>
                </article>
                <div v-if="!selectedNode.inputs.length" class="parameter-empty">暂无输入参数</div>
              </section>
              <section v-if="selectedNode.kind !== 'end' && selectedNode.kind !== 'condition'" class="parameter-section">
                <header><div><strong>{{ selectedNode.kind === 'start' ? '流程输入' : '输出参数' }}</strong><small>{{ selectedNode.kind === 'start' ? '运行流程时由用户填写' : '供后续节点选择使用' }}</small></div><button type="button" @click="addOutputParameter">＋ 添加</button></header>
                <article v-for="(parameter, index) in selectedNode.outputs" :key="`output-${index}`" class="parameter-card">
                  <div class="parameter-row">
                    <input v-model.trim="parameter.name" placeholder="参数名" />
                    <CustomSelect size="sm" :model-value="parameter.type" :options="variableTypeOptions" @update:model-value="parameter.type = $event" />
                    <button type="button" class="parameter-remove" @click="removeOutputParameter(index)">×</button>
                  </div>
                  <input v-if="selectedNode.kind !== 'start'" v-model.trim="parameter.source_path" placeholder="结果取值路径，例如 data.title" />
                  <input v-model.trim="parameter.description" placeholder="参数说明（可选）" />
                  <label class="parameter-required"><input v-model="parameter.required" type="checkbox" /> 必填</label>
                </article>
                <div v-if="!selectedNode.outputs.length" class="parameter-empty">暂无输出参数</div>
              </section>
              <section v-if="selectedNode.kind === 'condition'" class="condition-editor">
                <header><div><strong>条件分支</strong><small>按顺序判断，命中第一个分支后停止</small></div><button type="button" @click="addConditionBranch">＋ ELSE IF</button></header>
                <div class="condition-source-guide">
                  直接选择页面元素、上游输出、流程输入、流程变量或当前循环项；不需要创建中间参数。
                </div>
                <article v-for="(branch, branchIndex) in (selectedNode.config.branches || [])" :key="branch.id" class="condition-branch-card">
                  <header><strong>{{ branchIndex === 0 ? 'IF' : 'ELSE IF' }}</strong><div><CustomSelect size="sm" :model-value="branch.relation" :options="conditionRelationOptions" @update:model-value="branch.relation = $event" /><button v-if="branchIndex > 0" type="button" @click="removeConditionBranch(branchIndex)">×</button></div></header>
                  <div v-for="(clause, clauseIndex) in branch.conditions" :key="`${branch.id}-${clauseIndex}`" class="condition-clause">
                    <CustomSelect size="sm" :model-value="clause.left.source" :options="conditionLeftSourceOptions" @update:model-value="updateConditionLeftSource(clause, $event)" />
                    <template v-if="clause.left.source === 'page_element'">
                      <input v-model.trim="clause.left.selector" placeholder="录制或填写元素定位" />
                      <CustomSelect size="sm" :model-value="clause.operator" :options="pageElementOperatorOptions" @update:model-value="clause.operator = $event" />
                    </template>
                    <template v-else>
                      <CustomSelect size="sm" :model-value="clause.left.path" :options="conditionOperandOptions(clause.left.source)" placeholder="选择判断数据" @update:model-value="clause.left.path = $event" />
                      <CustomSelect size="sm" :model-value="clause.operator" :options="conditionOperatorOptions" @update:model-value="clause.operator = $event" />
                    </template>
                    <template v-if="conditionNeedsRightOperand(clause)">
                      <CustomSelect size="sm" :model-value="clause.right.source" :options="conditionRightSourceOptions" @update:model-value="updateConditionOperandSource(clause.right, $event)" />
                      <input v-if="clause.right.source === 'literal'" v-model="clause.right.value" placeholder="比较值" />
                      <CustomSelect v-else size="sm" :model-value="clause.right.path" :options="conditionOperandOptions(clause.right.source)" placeholder="选择比较数据" @update:model-value="clause.right.path = $event" />
                    </template>
                    <button v-if="branch.conditions.length > 1" type="button" class="condition-clause-remove" @click="removeConditionClause(branch, clauseIndex)">×</button>
                  </div>
                  <button type="button" class="condition-add-clause" @click="addConditionClause(branch)">＋ 添加条件</button>
                </article>
                <div class="condition-default-branch"><strong>ELSE</strong><span>以上条件均未命中时执行</span></div>
              </section>
              <label v-for="field in (getNodeDefinition(selectedNode.kind).fields || [])" v-show="isNodeFieldVisible(field)" :key="field.key">{{ field.label }}<CustomSelect v-if="field.type === 'select'" class="node-field-select" size="sm" :model-value="selectedNode.config[field.key]" :options="field.options || []" @update:model-value="updateNodeSelectField(field, $event)" /><textarea v-else-if="field.type === 'textarea'" v-model="selectedNode.config[field.key]" rows="3" :placeholder="field.placeholder" /><input v-else-if="field.type !== 'checkbox'" v-model="selectedNode.config[field.key]" :type="field.type || 'text'" :placeholder="field.placeholder" /><input v-else v-model="selectedNode.config[field.key]" type="checkbox" /></label>
              <div v-if="selectedNode.kind === 'credential_input'" class="credential-node-box"><div class="config-caption">保存当前凭据</div><input v-model="credentialForm.provider" placeholder="平台或服务名称" /><input v-model="credentialForm.username" autocomplete="username" placeholder="账号 / 邮箱" /><input v-model="credentialForm.password" autocomplete="current-password" type="password" placeholder="密码" /><button class="secondary-button full" @click="saveCredential">保存此凭据</button></div>
              <label>超时时间（秒）<input v-model.number="selectedNode.timeout_ms" type="number" min="1" /></label>
            </template>
          </aside>
        </div>
      </section>
    </main>

    <section v-if="executionId && executionPanelVisible" class="execution-panel panel">
      <div class="panel-heading"><span>执行状态</span><div class="execution-heading-actions"><small>{{ executionId }}</small><button type="button" title="关闭执行状态" aria-label="关闭执行状态" @click="closeExecutionPanel">×</button></div></div>
      <div class="execution-status" :class="`status-${executionStatus}`">{{ executionStatusLabel }}</div>
      <div v-if="executionId" class="recording-state-hint">录制状态：{{ recordingStateLabel }}</div>
      <div v-if="currentExecutionActivity" class="current-execution-activity">
        <span class="activity-pulse" />
        <div><strong>当前执行：{{ currentExecutionActivity.title }}</strong><small>{{ currentExecutionActivity.message }}，最长等待 {{ currentExecutionActivity.timeoutSeconds }} 秒</small></div>
      </div>
      <div v-if="confirmedStepNodeIds.length" class="step-test-toolbar">
        <span>最近确认的步骤已加入流程</span>
        <button class="secondary-button" @click="testConfirmedStep">从这一步开始测试</button>
      </div>
      <div v-if="stepAnalysis" class="recording-review">
        <strong>{{ recordingReviewTitle }}</strong>
        <label>步骤名称<input v-model="stepTitle" placeholder="例如：打开并处理列表中的一项" /></label>
        <div v-if="['possible_list', 'list_item'].includes(stepScope?.kind) && recordingReviewStage === 'scope_choice'" class="scope-assistant">
          <strong>这一步可能需要重复处理</strong>
          <span>正式执行时希望怎么处理？选择批量后，需要在浏览器中再点击同组的另一个项目确认范围。</span>
          <div class="scope-options">
            <button :class="{ selected: stepScopeSelection === 'single' }" @click="stepScopeSelection = 'single'">只处理这一项</button>
            <button :class="{ selected: stepScopeSelection === 'current_page' }" @click="stepScopeSelection = 'current_page'">处理当前列表全部项目</button>
            <button :class="{ selected: stepScopeSelection === 'all_pages' }" @click="stepScopeSelection = 'all_pages'">处理全部页面中的所有项目</button>
          </div>
          <small v-if="stepScopeSelection !== 'single'">下一步只选择同组中的另一个项目，系统会先展示计算出的列表范围，不会直接生成循环。</small>
        </div>
        <div v-else-if="recordingReviewStage === 'list_scope_ready'" class="scope-assistant scope-ready">
          <strong>已根据两个样本圈定列表范围</strong>
          <span>容器：<code>{{ stepScope.container_selector }}</code></span>
          <span>项目：<code>{{ stepScope.item_selector }}</code></span>
          <small>请确认范围后，再完整演示如何处理其中一个项目。</small>
        </div>
        <div v-else-if="recordingReviewStage === 'pagination_required'" class="scope-assistant">
          <strong>还需要演示如何进入下一批内容</strong>
          <span>请先回到列表，然后点击下面的按钮，再在浏览器中点击一次“下一页”或“加载更多”。</span>
          <button class="primary-button" @click="startPaginationDemo">去浏览器演示翻页</button>
        </div>
        <div v-else-if="recordingReviewStage === 'ready' && stepScope?.kind === 'list_item' && stepScopeSelection !== 'single'" class="scope-assistant scope-ready">
          <strong>单项目演示已完成</strong>
          <span>{{ listExecutionSummary }}</span>
        </div>
        <div class="recording-review-item" v-for="(step, index) in stepAnalysis" :key="`${step.selector}-${index}`">
          <span>{{ step.kind === 'input' ? '输入' : (step.kind === 'drag_slider' ? '拖拽' : '点击') }}</span>
          <code>{{ step.selector || '未找到定位器' }}</code>
          <small>{{ step.reason }}</small>
        </div>
        <div class="recording-review-actions">
          <button v-if="recordingReviewStage === 'scope_choice' && stepScopeSelection !== 'single'" class="primary-button" @click="startListSample">选择第二个项目样本</button>
          <button v-else-if="recordingReviewStage === 'list_scope_ready'" class="primary-button" @click="startListItemDemo">确认范围并演示一个项目</button>
          <button v-else-if="!['pagination_required', 'inserted'].includes(recordingReviewStage)" class="primary-button" @click="confirmStepAnalysis">确认加入流程</button>
          <button v-if="recordingReviewStage === 'ready' && confirmedStepNodeIds.length" class="secondary-button" @click="testConfirmedStep">从这一步开始测试</button>
          <button class="secondary-button" @click="retryStepCapture">重新抓取</button>
          <button class="secondary-button" @click="discardStepAnalysis">放弃</button>
        </div>
      </div>
      <div v-if="waitingNodeId" class="human-gate">
        <strong>流程等待人工处理</strong>
        <span>请在真实浏览器完成当前需要人工确认的操作后继续。</span>
        <button class="primary-button" @click="resumeExecution">我已处理，继续执行</button>
      </div>
      <div class="execution-events">
        <div v-for="event in executionEvents" :key="`${event.id || event.node_id}-${event.created_at_ms || event.message}`" class="execution-event">
          <span :class="event.phase === 'started' ? 'event-running' : (event.success ? 'event-ok' : 'event-warn')">{{ event.phase === 'started' ? '执行中' : (event.success ? '完成' : (event.waiting_for_human ? '人工' : '失败')) }}</span>
          <div class="execution-event-content">
            <strong>{{ nodeDisplayName(event.node_id, event.node_kind) }}</strong>
            <pre>{{ executionEventMessage(event) }}</pre>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import browserWorkflowApi from '@/api/browserWorkflow'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { showMessage } from '@/utils/message'
import { isTauri } from '@/services/api'
import { NODE_MENU_GROUPS, createWorkflowNode, getNodeDefinition, getNodeMenuGroups, registerPluginNodeDefinitions } from './node-registry'
import { insertRecordedStepsIntoGraph } from './recording-graph'
import { applyBackendRecordingState, beginListItemDemonstration, completeListItemDemonstration, completePaginationDemonstration, getRecordingAnchorChoice, normalizeRecordingFinishedPayload, resolveListScope } from './recording-interaction'
import { calculateWorkflowLayout, getWorkflowExecutionOrder, resolveWorkflowCollisions } from './workflow-layout'
import { createWorkflowGraph, disposeWorkflowGraph, syncWorkflowGraph } from './x6-workflow-graph'
import { cancelBrowserWorkflowRuntimeDownload, ensureBrowserWorkflowRuntime, listenBrowserWorkflowRuntimeProgress } from '@/services/browserWorkflowRuntime'

const STORAGE_KEY = 'browser-workflow-draft'
const canvasRef = ref(null)
const x6CanvasRef = ref(null)
const workflowGraph = ref(null)
const syncingWorkflowGraph = ref(false)
const selectedNodeId = ref('')
const invalidNodeIds = ref(new Set())
const selectedEdgeId = ref('')
const hoveredNodeId = ref('')
const linkingFrom = ref('')
const linkingBranch = ref(null)
const draggingKind = ref('')
const showNodeMenu = ref(false)
const canvasSize = { width: 6000, height: 3000 }
const nodeSize = { width: 224, height: 68 }
const nodeSpacing = { x: 48, y: 34 }
const executionId = ref('')
const runInputVisible = ref(false)
const runInputValues = ref({})
const recordingStartVisible = ref(false)
const recordingAnchorChoice = ref('')
const executionPanelVisible = ref(false)
const executionStatus = ref('')
const executionEvents = ref([])
const activeNodeId = ref('')
const waitingNodeId = ref('')
const recordingBackendState = ref({
  recording: false,
  finished: false,
  phase: 'idle',
  message: '',
  eventCount: 0,
  stateVersion: 0,
})
const recordingActive = computed(() => recordingBackendState.value.recording)
const stepCaptureActive = computed(() => recordingBackendState.value.recording)
const recordingAnalyzing = computed(() => recordingBackendState.value.phase === 'analyzing')
const recordingEnded = computed(() => recordingBackendState.value.finished)
const recordingStepCount = ref(0)
const stepAnalysis = ref(null)
const stepTitle = ref('')
const stepScope = ref(null)
const stepScopeSelection = ref('single')
const recordingReviewStage = ref('idle')
const recordingCaptureMode = ref('step')
const listEntrySteps = ref([])
const pendingListScope = ref(null)
const confirmedStepNodeIds = ref([])
const recordingAnchorNodeId = ref('')
const runtimeOptions = { runtime: 'playwright', headless: true }
const desktopRuntime = ref(isTauri())
const browserRuntimeBusy = ref(false)
const browserRuntimeProgress = ref({ stage: '', downloaded: 0, total: null, message: '' })
const pluginCenterVisible = ref(false)
const pluginCatalog = ref([])
let stopBrowserRuntimeProgress = () => {}
const workflowList = ref([])
const credentialForm = ref({ provider: 'browser', username: '', password: '' })
const history = ref([])
const future = ref([])
const dragState = ref(null)
const panState = ref(null)
const linkPreview = ref({ x: 0, y: 0, visible: false })
const nodeWasDragged = ref(false)
let executionSocket

const nodeMenuGroups = ref(NODE_MENU_GROUPS)
const route = useRoute()
const router = useRouter()

const createDocument = () => ({ schema_version: 'browser-workflow/1.0', workflow_id: `browser-${Date.now()}`, name: '未命名浏览器流程', description: '', version: '0.1.0', nodes: [], edges: [], variables: {}, permissions: {}, metadata: { persisted: false } })
const document = ref(loadDocument())
const selectedNode = computed(() => document.value.nodes.find(node => node.id === selectedNodeId.value) || null)
const connectedEdgeIds = computed(() => {
  const nodeId = selectedNodeId.value || hoveredNodeId.value
  if (!nodeId || selectedEdgeId.value) return new Set()
  return new Set(document.value.edges
    .filter(edge => edge.source === nodeId || edge.target === nodeId)
    .map(edge => edge.id))
})
const workflowInputDefinitions = computed(() => document.value.nodes.find(node => node.kind === 'start')?.outputs || [])
const recordingAnchorOptions = computed(() => getWorkflowExecutionOrder(document.value.nodes, document.value.edges)
  .filter(node => node.kind !== 'end')
  .map(node => ({ value: node.id, label: node.title || node.id })))
const variableTypeOptions = [
  { value: 'any', label: '任意类型' },
  { value: 'string', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔值' },
  { value: 'object', label: '对象' },
  { value: 'array', label: '数组' },
  { value: 'file', label: '文件' },
]
const inputSourceOptions = [
  { value: 'literal', label: '固定值' },
  { value: 'workflow', label: '流程入参' },
  { value: 'node', label: '上游节点输出' },
]
const aggregationOptions = [
  { value: 'latest', label: '使用当前一次结果' },
  { value: 'all', label: '汇总该节点全部结果' },
]
const conditionRelationOptions = [
  { value: 'and', label: '全部满足' },
  { value: 'or', label: '任一满足' },
]
const conditionLeftSourceOptions = [
  { value: 'page_element', label: '页面元素' },
  { value: 'node_output', label: '上游节点输出' },
  { value: 'workflow_input', label: '流程输入' },
  { value: 'workflow_variable', label: '流程变量' },
  { value: 'loop_item', label: '当前循环项' },
]
const conditionRightSourceOptions = [
  { value: 'literal', label: '固定值' },
  { value: 'node_output', label: '上游节点输出' },
  { value: 'workflow_input', label: '流程输入' },
  { value: 'workflow_variable', label: '流程变量' },
  { value: 'loop_item', label: '当前循环项' },
]
const pageElementOperatorOptions = [
  { value: 'exists', label: '存在' },
  { value: 'not_exists', label: '不存在' },
  { value: 'visible', label: '可见' },
  { value: 'not_visible', label: '不可见' },
  { value: 'enabled', label: '已启用' },
  { value: 'disabled', label: '已禁用' },
  { value: 'text_contains', label: '文本包含' },
  { value: 'text_equals', label: '文本等于' },
]
const conditionOperatorOptions = [
  { value: 'equals', label: '等于' },
  { value: 'not_equals', label: '不等于' },
  { value: 'greater_than', label: '大于' },
  { value: 'greater_or_equal', label: '大于等于' },
  { value: 'less_than', label: '小于' },
  { value: 'less_or_equal', label: '小于等于' },
  { value: 'contains', label: '包含' },
  { value: 'not_contains', label: '不包含' },
  { value: 'starts_with', label: '开头是' },
  { value: 'ends_with', label: '结尾是' },
  { value: 'empty', label: '为空' },
  { value: 'not_empty', label: '不为空' },
  { value: 'truthy', label: '为真' },
  { value: 'falsy', label: '为假' },
]
const unaryConditionOperators = new Set(['empty', 'not_empty', 'truthy', 'falsy'])
const workflowInputOptions = computed(() => {
  const start = document.value.nodes.find(node => node.kind === 'start')
  return (start?.outputs || []).map(output => ({ value: output.name, label: `流程入参 / ${output.name}` }))
})
const upstreamOutputOptions = computed(() => {
  if (!selectedNode.value) return []
  const options = []
  const upstream = collectUpstreamNodeIds(selectedNode.value.id)
  for (const node of document.value.nodes) {
    if (!upstream.has(node.id) || node.kind === 'start') continue
    for (const output of node.outputs || []) {
      options.push({ value: `${node.id}.${output.name}`, label: `${node.title} / ${output.name}` })
    }
  }
  return options
})
const workflowVariableOptions = computed(() => Object.keys(document.value.variables || {}).map(name => ({
  value: name,
  label: `流程变量 / ${name}`,
})))
const loopItemOptions = computed(() => {
  if (!selectedNode.value) return []
  const upstream = collectUpstreamNodeIds(selectedNode.value.id)
  return document.value.nodes
    .filter(node => upstream.has(node.id) && node.kind === 'loop')
    .flatMap(node => (node.outputs || [])
      .filter(output => ['item', 'index', 'iteration'].includes(output.name))
      .map(output => ({ value: `${node.id}.${output.name}`, label: `${node.title} / ${output.name}` })))
})

function loadDocument() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!saved) return createDocument()
    if (!saved.metadata || typeof saved.metadata !== 'object') saved.metadata = {}
    if (typeof saved.metadata.persisted !== 'boolean') saved.metadata.persisted = false
    normalizeDocument(saved)
    return saved
  } catch {
    return createDocument()
  }
}
async function loadWorkflowList() {
  try {
    const response = await browserWorkflowApi.list({ suppressErrorMessage: true })
    if (response?.code === 0) workflowList.value = response.data || []
  } catch {
    workflowList.value = []
  }
}
async function loadInstalledPluginNodes() {
  try {
    const response = await browserWorkflowApi.plugins({ suppressErrorMessage: true })
    if (response?.code !== 0 || !Array.isArray(response.data)) return
    pluginCatalog.value = response.data
    registerPluginNodeDefinitions(response.data)
    nodeMenuGroups.value = getNodeMenuGroups()
  } catch {
    // The built-in node catalog remains available when the plugin service is offline.
  }
}
async function openPluginCenter() {
  const shouldOpen = !pluginCenterVisible.value
  showNodeMenu.value = false
  pluginCenterVisible.value = shouldOpen
  if (!shouldOpen) return
  await loadInstalledPluginNodes()
}
function toggleNodeMenu() {
  pluginCenterVisible.value = false
  showNodeMenu.value = !showNodeMenu.value
}
async function installPlugin(plugin) {
  const permissions = plugin.permissions || []
  const detail = permissions.length ? `\n需要权限：\n${permissions.join('\n')}` : '\n该插件无需额外权限。'
  if (!window.confirm(`确认安装“${plugin.name}”吗？${detail}`)) return
  const response = await browserWorkflowApi.installPlugin(plugin.plugin_id, permissions)
  if (response?.code === 0) {
    showMessage(response.message || '插件已安装', 'success')
    await loadInstalledPluginNodes()
  }
}
async function togglePlugin(plugin) {
  const enabled = !plugin.enabled
  const response = await browserWorkflowApi.setPluginEnabled(plugin.plugin_id, enabled)
  if (response?.code === 0) {
    showMessage(response.message || (enabled ? '插件已启用' : '插件已停用'), 'success')
    await loadInstalledPluginNodes()
  }
}
async function uninstallPlugin(plugin) {
  if (!window.confirm(`确认卸载“${plugin.name}”吗？已有流程中的对应节点将无法执行。`)) return
  const response = await browserWorkflowApi.uninstallPlugin(plugin.plugin_id)
  if (response?.code === 0) {
    showMessage(response.message || '插件已卸载', 'success')
    await loadInstalledPluginNodes()
  }
}
async function openWorkflow(workflowId) {
  const response = await browserWorkflowApi.get(workflowId)
  if (response?.code !== 0 || !response.data?.document) return
  normalizeDocument(response.data.document)
  document.value = response.data.document
  markPersisted(true)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(document.value))
  selectedNodeId.value = ''
  linkingFrom.value = ''
}
async function saveCredential() {
  if (!credentialForm.value.username || !credentialForm.value.password) {
    showMessage('请先填写账号和密码', 'warning')
    return
  }
  try {
    const credentialId = selectedNode.value?.config?.credential_id || 'browser-main'
    const response = await browserWorkflowApi.saveCredential(credentialId, { provider: credentialForm.value.provider || 'browser', purpose: 'browser_login', values: { username: credentialForm.value.username, password: credentialForm.value.password } })
    if (response?.code === 0) showMessage(response.message || '浏览器凭据已保存', 'success')
  } catch {
    // API layer displays the backend message.
  }
}
function markPersisted(value) {
  if (!document.value.metadata || typeof document.value.metadata !== 'object') document.value.metadata = {}
  document.value.metadata.persisted = value
}
function nodeById(id) { return document.value.nodes.find(node => node.id === id) }
function nodeDisplayName(nodeId, fallback = '') {
  return nodeById(nodeId)?.title || fallback || nodeId || '执行事件'
}
function executionEventMessage(event) {
  const message = String(event.message || event.event_json?.message || event.node_id || '')
  return document.value.nodes.reduce(
    (text, node) => text.replaceAll(node.id, `「${node.title || node.id}」`),
    message,
  )
}
function focusInvalidNodes(nodeIds) {
  invalidNodeIds.value = new Set(nodeIds)
  const node = nodeById(nodeIds[0])
  if (!node) return
  selectedNodeId.value = node.id
  selectedEdgeId.value = ''
  requestAnimationFrame(() => {
    canvasRef.value?.scrollTo({
      left: Math.max(0, Number(node.position.x) - 120),
      top: Math.max(0, Number(node.position.y) - 120),
      behavior: 'smooth',
    })
  })
}
function workflowErrorMessage(error, fallback = '工作流配置不完整') {
  const raw = String(
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.message ||
    error ||
    fallback
  )
  const matched = document.value.nodes.filter(node => raw.includes(node.id))
  const message = matched.reduce(
    (text, node) => text.replaceAll(node.id, `「${node.title || node.id}」`),
    raw,
  )
  if (matched.length) focusInvalidNodes(matched.map(node => node.id))
  showMessage(message, 'error')
  return message
}
function validateEditorDocument() {
  const failures = []
  for (const node of document.value.nodes) {
    if (node.kind !== 'condition') continue
    for (const branch of node.config?.branches || []) {
      for (const clause of branch.conditions || []) {
        const left = clause.left || {}
        if (left.source === 'page_element' ? !String(left.selector || '').trim() : !String(left.path || '').trim()) {
          failures.push({ node, message: '缺少判断对象' })
          break
        }
        if (!conditionNeedsRightOperand(clause)) continue
        const right = clause.right || {}
        if (!right.source || (right.source !== 'literal' && !String(right.path || '').trim())) {
          failures.push({ node, message: '缺少比较对象' })
          break
        }
      }
    }
  }
  invalidNodeIds.value = new Set(failures.map(item => item.node.id))
  if (!failures.length) return true
  const first = failures[0]
  focusInvalidNodes(failures.map(item => item.node.id))
  showMessage(`条件节点「${first.node.title}」${first.message}`, 'error')
  return false
}
function collectUpstreamNodeIds(nodeId) {
  const incoming = new Map()
  for (const edge of document.value.edges) {
    if (!incoming.has(edge.target)) incoming.set(edge.target, [])
    incoming.get(edge.target).push(edge.source)
  }
  const found = new Set()
  const pending = [...(incoming.get(nodeId) || [])]
  while (pending.length) {
    const current = pending.pop()
    if (found.has(current)) continue
    found.add(current)
    pending.push(...(incoming.get(current) || []))
  }
  return found
}
function variableOptionsFor(parameter) {
  return parameter.source === 'workflow' ? workflowInputOptions.value : upstreamOutputOptions.value
}
function addInputParameter() {
  selectedNode.value.inputs.push({ name: '', type: 'string', required: false, description: '', source: 'literal', value: '', variable: '', aggregation: 'latest' })
}
function removeInputParameter(index) { selectedNode.value.inputs.splice(index, 1) }
function updateInputSource(parameter, source) {
  parameter.source = source
  parameter.variable = ''
  parameter.aggregation = 'latest'
  if (source !== 'literal') parameter.value = null
}
function addOutputParameter() {
  selectedNode.value.outputs.push({ name: '', type: 'string', required: false, description: '', source_path: '', object_schema: {} })
}
function removeOutputParameter(index) { selectedNode.value.outputs.splice(index, 1) }
function nodeIcon(kind) { return getNodeDefinition(kind).icon || '·' }
function nodeTone(kind) { return getNodeDefinition(kind).tone || 'blue' }
function nodeDimensions(node) {
  if (node?.kind === 'condition') {
    return { width: 360, height: 70 + Math.max(2, (node.config?.branches?.length || 1) + 1) * 40 }
  }
  if (node?.kind === 'loop') return { width: 360, height: 150 }
  if (isDataStageNode(node)) return { width: 360, height: 126 }
  if (node?.kind === 'pagination') return { width: 224, height: 92 }
  return nodeSize
}
function nodeStyle(node) {
  const size = nodeDimensions(node)
  return {
    left: `${node.position.x}px`,
    top: `${node.position.y}px`,
    width: `${size.width}px`,
    minHeight: `${size.height}px`,
  }
}
function conditionBranchSummary(branch) {
  if (!branch?.conditions?.length) return '未配置条件'
  const relation = branch.relation === 'or' ? ' 或 ' : ' 且 '
  return branch.conditions.map(clause => {
    if (clause.left?.source === 'page_element') {
      const operator = pageElementOperatorOptions.find(item => item.value === clause.operator)?.label || '判断'
      return `${clause.left.selector || '未配置元素'} ${operator}`
    }
    const operator = conditionOperatorOptions.find(item => item.value === clause.operator)?.label || clause.operator || '比较'
    if (unaryConditionOperators.has(clause.operator)) return `${conditionOperandLabel(clause.left)} ${operator}`
    return `${conditionOperandLabel(clause.left)} ${operator} ${conditionOperandLabel(clause.right)}`
  }).join(relation)
}
function loopTypeLabel(node) {
  return ({ array: '遍历数组', count: '按次数', infinite: '持续循环' })[node.config?.loop_type] || '遍历数组'
}
function loopSourceLabel(node) {
  if (node.config?.loop_type === 'count') return `${node.config?.max_iterations || 20} 次`
  if (node.config?.loop_type === 'infinite') return `最多 ${node.config?.max_iterations || 20} 次`
  return node.config?.source || '未选择数组输入'
}
function isDataStageNode(node) {
  return ['http_request', 'text_process', 'json_stringify', 'set_variable'].includes(node?.kind)
}
function nodeInputSummary(node) {
  if (node.kind === 'http_request') return `${node.config?.method || 'GET'} ${node.config?.url || '未配置地址'}`
  return node.inputs?.map(item => item.name).filter(Boolean).join('、') || '未配置输入'
}
function nodeOutputSummary(node) {
  return node.outputs?.map(item => item.name).filter(Boolean).join('、') || '未配置输出'
}
function isNodeFieldVisible(field) {
  if (!field?.showWhen || !selectedNode.value) return true
  return Object.entries(field.showWhen).every(([key, value]) => selectedNode.value.config?.[key] === value)
}
function updateNodeSelectField(field, value) {
  if (!selectedNode.value) return
  selectedNode.value.config[field.key] = value
}
function newConditionClause() {
  return {
    id: `clause_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    left: { source: 'page_element', selector: '' },
    operator: 'exists',
    right: { source: 'literal', value: '' },
  }
}
function addConditionBranch() {
  const branches = selectedNode.value.config.branches || (selectedNode.value.config.branches = [])
  branches.push({
    id: `branch_${Date.now()}_${branches.length}`,
    label: `ELSE IF ${branches.length}`,
    relation: 'and',
    conditions: [newConditionClause()],
  })
}
function removeConditionBranch(index) {
  const branch = selectedNode.value.config.branches[index]
  recordHistory()
  selectedNode.value.config.branches.splice(index, 1)
  document.value.edges = document.value.edges.filter(edge => edge.source !== selectedNode.value.id || edge.condition?.branch !== branch.id)
}
function addConditionClause(branch) { branch.conditions.push(newConditionClause()) }
function removeConditionClause(branch, index) { branch.conditions.splice(index, 1) }
function updateConditionOperandSource(operand, source) {
  Object.keys(operand).forEach(key => delete operand[key])
  Object.assign(operand, source === 'page_element' ? { source, selector: '' } : source === 'literal' ? { source, value: '' } : { source, path: '' })
}
function updateConditionLeftSource(clause, source) {
  updateConditionOperandSource(clause.left, source)
  clause.operator = source === 'page_element' ? 'exists' : 'equals'
}
function conditionOperandOptions(source) {
  if (source === 'node_output') return upstreamOutputOptions.value
  if (source === 'workflow_input') return workflowInputOptions.value
  if (source === 'workflow_variable') return workflowVariableOptions.value
  if (source === 'loop_item') return loopItemOptions.value
  return []
}
function conditionOperandLabel(operand) {
  if (!operand) return '未配置'
  if (operand.source === 'literal') return String(operand.value ?? '固定值')
  return conditionOperandOptions(operand.source).find(item => item.value === operand.path)?.label || operand.path || '未配置'
}
function conditionNeedsRightOperand(clause) {
  return !unaryConditionOperators.has(clause.operator) && !['exists', 'not_exists', 'visible', 'not_visible', 'enabled', 'disabled'].includes(clause.operator)
}
function conditionPorts(node) {
  const branches = node.config?.branches || []
  const ports = [
    ...branches.map((branch, index) => ({ id: branch.id, label: index === 0 ? 'IF' : `ELSE IF ${index}` })),
    { id: 'default', label: 'ELSE' },
  ]
  return ports.map((port, index) => ({ ...port, offsetY: 70 + index * 40 + 20 }))
}
function controlNodePorts(node) {
  if (node.kind === 'condition') return conditionPorts(node)
  const ports = node.kind === 'pagination'
    ? [{ id: 'next', label: '下一页' }, { id: 'done', label: '结束分页' }]
    : [{ id: 'loop', label: '循环' }, { id: 'done', label: '循环结束' }]
  const offsets = node.kind === 'loop' ? [105, 132] : [38, 70]
  return ports.map((port, index) => ({ ...port, offsetY: offsets[index] }))
}
function newNode(kind, x = 120, y = 100) { return createWorkflowNode(kind, { x, y }) }
function snapshot() { return JSON.parse(JSON.stringify(document.value)) }
function recordHistory() { history.value.push(snapshot()); if (history.value.length > 50) history.value.shift(); future.value = [] }
function restoreDocument(nextDocument) { normalizeDocument(nextDocument); document.value = nextDocument; selectedNodeId.value = ''; selectedEdgeId.value = ''; linkingFrom.value = ''; linkingBranch.value = null; clearLinkPreview() }
function undo() { if (!history.value.length) return; future.value.push(snapshot()); restoreDocument(history.value.pop()) }
function redo() { if (!future.value.length) return; history.value.push(snapshot()); restoreDocument(future.value.pop()) }
function clampPosition(position, node = null) {
  const size = nodeDimensions(node)
  return {
    x: Math.max(24, Math.min(position.x, canvasSize.width - size.width - 24)),
    y: Math.max(24, Math.min(position.y, canvasSize.height - size.height - 24)),
  }
}
function repairDocumentCollisions(targetDocument) {
  if (!targetDocument?.nodes?.length) return []
  const result = resolveWorkflowCollisions(targetDocument.nodes, {
    nodeWidth: nodeSize.width,
    nodeHeight: nodeSize.height,
    getNodeSize: nodeDimensions,
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
  })
  targetDocument.nodes.forEach(node => {
    node.position = result.positions.get(node.id) || clampPosition(node.position)
  })
  return result.movedNodeIds
}
function normalizeDocument(targetDocument) {
  for (const node of targetDocument?.nodes || []) {
    if (!Array.isArray(node.inputs)) node.inputs = []
    if (!Array.isArray(node.outputs)) node.outputs = []
  }
  repairDocumentCollisions(targetDocument)
}
function findFreePosition(preferred = { x: 120, y: 100 }, ignoreId = '') {
  const probeId = '__position_probe__'
  const nodes = [
    ...document.value.nodes
      .filter(node => node.id !== ignoreId)
      .map(node => ({ id: node.id, position: node.position })),
    { id: probeId, kind: 'default', position: clampPosition(preferred) },
  ]
  return resolveWorkflowCollisions(nodes, {
    nodeWidth: nodeSize.width,
    nodeHeight: nodeSize.height,
    getNodeSize: nodeDimensions,
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
  }).positions.get(probeId)
}
function addNode(kind, position = null) {
  recordHistory()
  const preferred = position || { x: 120 + document.value.nodes.length * 24, y: 100 + document.value.nodes.length * 24 }
  const nextPosition = findFreePosition(preferred)
  const node = newNode(kind, nextPosition.x, nextPosition.y)
  document.value.nodes.push(node)
  selectedNodeId.value = node.id
  nextTick(() => canvasRef.value?.scrollTo({ left: Math.max(0, node.position.x - 100), top: Math.max(0, node.position.y - 100), behavior: 'smooth' }))
  return node
}
function addNodeFromMenu(kind) {
  addNode(kind)
  showNodeMenu.value = false
}
function addPluginCapability(capability) {
  if (!capability?.node_kind) return
  addNode(capability.node_kind)
  pluginCenterVisible.value = false
}
function startDrag(kind) { draggingKind.value = kind }
function canvasPointFromEvent(event) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect || !canvasRef.value) return null
  return {
    x: event.clientX - rect.left + canvasRef.value.scrollLeft,
    y: event.clientY - rect.top + canvasRef.value.scrollTop,
  }
}
function dropNode(event) {
  if (!draggingKind.value) return
  const point = canvasPointFromEvent(event)
  if (!point) return
  addNode(draggingKind.value, { x: point.x - (nodeSize.width / 2), y: point.y - (nodeSize.height / 2) })
  draggingKind.value = ''
}
function startNodeDrag(event, node) {
  if (event.button !== 0 || linkingFrom.value) return
  const point = canvasPointFromEvent(event)
  if (!point) return
  recordHistory()
  nodeWasDragged.value = false
  dragState.value = { id: node.id, offsetX: point.x - node.position.x, offsetY: point.y - node.position.y }
  window.addEventListener('pointermove', moveNode)
  window.addEventListener('pointerup', stopNodeDrag, { once: true })
}
function moveNode(event) {
  if (!dragState.value) return
  const node = nodeById(dragState.value.id)
  const point = canvasPointFromEvent(event)
  if (!node || !point) return
  if (Math.abs(event.movementX || 0) + Math.abs(event.movementY || 0) > 1) nodeWasDragged.value = true
  node.position = clampPosition({ x: point.x - dragState.value.offsetX, y: point.y - dragState.value.offsetY }, node)
}
function stopNodeDrag() {
  if (dragState.value) {
    const node = nodeById(dragState.value.id)
    if (node) node.position = findFreePosition(node.position, node.id)
  }
  dragState.value = null
  window.removeEventListener('pointermove', moveNode)
}
function createEdge(sourceId, targetId, branch = null) {
  if (!sourceId || !targetId || sourceId === targetId) return
  const source = nodeById(sourceId)
  const branchPort = branch?.condition?.branch || ''
  const exists = ['condition', 'loop', 'pagination'].includes(source?.kind)
    ? document.value.edges.some(edge => edge.source === sourceId && edge.condition?.branch === branchPort)
    : document.value.edges.some(edge => edge.source === sourceId && edge.target === targetId)
  if (exists) return
  recordHistory()
  document.value.edges.push({
    id: `edge-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    source: sourceId,
    target: targetId,
    ...(branch?.label ? { label: branch.label } : {}),
    ...(branch?.condition ? { condition: branch.condition } : {}),
  })
}
function selectNode(id) {
  if (linkingFrom.value && linkingFrom.value !== id) {
    createEdge(linkingFrom.value, id, linkingBranch.value)
    linkingFrom.value = ''
    linkingBranch.value = null
    clearLinkPreview()
  }
  selectedNodeId.value = id
  selectedEdgeId.value = ''
}
function beginLink(nodeId = selectedNodeId.value, branch = null) {
  if (!nodeId) return
  selectedNodeId.value = nodeId
  selectedEdgeId.value = ''
  const sameBranch = linkingFrom.value === nodeId && linkingBranch.value?.label === branch?.label
  linkingFrom.value = sameBranch ? '' : nodeId
  linkingBranch.value = sameBranch ? null : branch
  if (!linkingFrom.value) clearLinkPreview()
}
function cancelLink() { linkingFrom.value = ''; linkingBranch.value = null; clearLinkPreview() }
function clearSelection() { selectedNodeId.value = ''; selectedEdgeId.value = ''; linkingFrom.value = ''; linkingBranch.value = null; clearLinkPreview() }
function selectEdge(edgeId) {
  selectedNodeId.value = ''
  linkingFrom.value = ''
  linkingBranch.value = null
  clearLinkPreview()
  selectedEdgeId.value = edgeId
}
function handleCanvasClick() {
  showNodeMenu.value = false
  pluginCenterVisible.value = false
  clearSelection()
}
function handleNodeClick(id) {
  if (nodeWasDragged.value) {
    nodeWasDragged.value = false
    return
  }
  selectNode(id)
}
function setHoveredNode(id) { hoveredNodeId.value = id }
function clearHoveredNode(id) {
  if (hoveredNodeId.value === id) hoveredNodeId.value = ''
}
function startCanvasPan(event) {
  if (event.button !== 0 || event.target !== event.currentTarget) return
  panState.value = { x: event.clientX, y: event.clientY, scrollLeft: canvasRef.value.scrollLeft, scrollTop: canvasRef.value.scrollTop }
  canvasRef.value.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', moveCanvasPan)
  window.addEventListener('pointerup', stopCanvasPan, { once: true })
}
function moveCanvasPan(event) {
  if (!panState.value || !canvasRef.value) return
  canvasRef.value.scrollLeft = panState.value.scrollLeft - (event.clientX - panState.value.x)
  canvasRef.value.scrollTop = panState.value.scrollTop - (event.clientY - panState.value.y)
}
function stopCanvasPan() {
  panState.value = null
  window.removeEventListener('pointermove', moveCanvasPan)
}
function removeNode(id) { recordHistory(); document.value.nodes = document.value.nodes.filter(node => node.id !== id); document.value.edges = document.value.edges.filter(edge => edge.source !== id && edge.target !== id); clearSelection() }
function removeEdge(edgeId) {
  recordHistory()
  document.value.edges = document.value.edges.filter(edge => edge.id !== edgeId)
  if (selectedEdgeId.value === edgeId) selectedEdgeId.value = ''
}
function handleDeleteKey(event) {
  if ((!selectedEdgeId.value && !selectedNodeId.value) || !['Backspace', 'Delete'].includes(event.key)) return
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return
  event.preventDefault()
  if (selectedEdgeId.value) removeEdge(selectedEdgeId.value)
  else if (selectedNodeId.value) removeNode(selectedNodeId.value)
}
function updateLinkPreview(event) {
  if (!linkingFrom.value) return
  const point = canvasPointFromEvent(event)
  if (!point) return
  linkPreview.value = { x: point.x, y: point.y, visible: true }
}
function clearLinkPreview() {
  linkPreview.value = { ...linkPreview.value, visible: false }
}
function autoLayout() {
  if (document.value.nodes.length < 2) return
  recordHistory()
  const positions = calculateWorkflowLayout(document.value.nodes, document.value.edges, {
    // The canvas scrolls horizontally; do not wrap the execution chain just
    // to fit the visible window, because a reversed second row breaks edge
    // readability and makes source/target nodes look disconnected.
    viewportWidth: canvasSize.width,
    maxColumns: document.value.nodes.length,
    nodeWidth: nodeSize.width,
    nodeHeight: nodeSize.height,
    getNodeSize: nodeDimensions,
    rowGap: nodeSpacing.y,
  })
  document.value.nodes.forEach(node => {
    node.position = clampPosition(positions.get(node.id) || node.position, node)
  })
  canvasRef.value?.scrollTo({ left: 0, top: 0, behavior: 'smooth' })
}
async function saveDocument() {
  if (!validateEditorDocument()) return false
  localStorage.setItem(STORAGE_KEY, JSON.stringify(document.value))
  try {
    if (document.value.metadata?.persisted) {
      const response = await browserWorkflowApi.saveDraft(document.value.workflow_id, document.value, { suppressErrorMessage: 'silent' })
      if (response?.code === 0) {
        markPersisted(true)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(document.value))
        showMessage(response.message || '浏览器工作流草稿已保存', 'success')
        return true
      } else {
        workflowErrorMessage(response?.message)
        return false
      }
    } else {
      const response = await browserWorkflowApi.create(document.value, { suppressErrorMessage: 'silent' })
      if (response?.code === 0) {
        markPersisted(true)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(document.value))
        showMessage(response.message || '浏览器工作流创建成功', 'success')
        await loadWorkflowList()
        return true
      } else {
        workflowErrorMessage(response?.message)
        return false
      }
    }
  } catch (error) {
    workflowErrorMessage(error)
    return false
  }
}
async function publishDocument() {
  if (!await saveDocument()) return
  try {
    const response = await browserWorkflowApi.publish(document.value.workflow_id, document.value.version, { suppressErrorMessage: 'silent' })
    if (response?.code === 0) showMessage(response.message || '浏览器工作流已发布', 'success')
    else workflowErrorMessage(response?.message)
  } catch (error) {
    workflowErrorMessage(error)
  }
}
async function ensureBrowserRuntimeForAction() {
  if (browserRuntimeBusy.value) return false
  browserRuntimeBusy.value = true
  try {
    const result = await ensureBrowserWorkflowRuntime({
      onProgress: (payload) => { browserRuntimeProgress.value = payload },
    })
    if (result.cancelled) {
      showMessage('已取消本次浏览器工作流，不影响邮箱功能', 'warning')
      return false
    }
    return Boolean(result.ready)
  } catch (error) {
    showMessage(error?.message || String(error) || '浏览器组件未准备好', 'error')
    return false
  } finally {
    browserRuntimeBusy.value = false
  }
}
async function cancelBrowserRuntime() {
  try { await cancelBrowserWorkflowRuntimeDownload() } catch { /* the current operation will report its own failure */ }
}
async function runDocument() {
  if (workflowInputDefinitions.value.length) {
    runInputValues.value = Object.fromEntries(workflowInputDefinitions.value.map(parameter => [
      parameter.name,
      document.value.variables?.[parameter.name] ?? (parameter.type === 'boolean' ? false : ''),
    ]))
    runInputVisible.value = true
    return
  }
  await executeRunDocument()
}
function parsedRunInputs() {
  const values = {}
  for (const parameter of workflowInputDefinitions.value) {
    const raw = runInputValues.value[parameter.name]
    if (parameter.required && (raw === '' || raw === null || raw === undefined)) {
      throw new Error(`请填写运行参数：${parameter.name}`)
    }
    if (raw === '' && !parameter.required) {
      values[parameter.name] = null
    } else if (parameter.type === 'number') {
      values[parameter.name] = Number(raw)
    } else if (['object', 'array'].includes(parameter.type)) {
      values[parameter.name] = typeof raw === 'string' ? JSON.parse(raw) : raw
    } else {
      values[parameter.name] = raw
    }
  }
  return values
}
async function executeRunDocument() {
  if (!validateEditorDocument()) return
  let variables
  try {
    variables = parsedRunInputs()
  } catch (error) {
    showMessage(error?.message || '运行参数格式不正确', 'warning')
    return
  }
  if (!await ensureBrowserRuntimeForAction()) return
  try {
    const options = {
      ...runtimeOptions,
      headless: false,
      keep_session_open: true,
      // Desktop workflow actions are attached to the already-started local Agent.
      ...(desktopRuntime.value ? { browser_transport: 'local_agent' } : {}),
    }
    const response = await browserWorkflowApi.previewExecute(document.value, { options, variables }, { suppressErrorMessage: 'silent' })
    if (response?.code === 0) {
      runInputVisible.value = false
      executionId.value = response.data.execution_id
      executionPanelVisible.value = true
      executionStatus.value = response.data.status
      showMessage(response.message || '浏览器工作流试运行已开始', 'success')
      connectExecutionSocket()
    } else {
      workflowErrorMessage(response?.message)
    }
  } catch (error) {
    workflowErrorMessage(error)
  }
}
function closeExecutionPanel() {
  executionPanelVisible.value = false
}
async function openSystemBrowser() {
  if (!desktopRuntime.value) return
  const url = document.value.nodes.find(node => node.kind === 'navigate')?.config?.url
  if (!url) {
    showMessage('打开网页节点还没有配置网址', 'warning')
    return
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('open_external_url', { url })
  } catch (error) {
    showMessage(error?.message || '打开系统浏览器失败', 'error')
  }
}
function acceptBackendRecordingState(payload) {
  recordingBackendState.value = applyBackendRecordingState(recordingBackendState.value, payload)
}
async function recoverBrowserExecutionSession() {
  if (!recordingAnchorNodeId.value || !nodeById(recordingAnchorNodeId.value)) {
    showMessage('请先选择一个节点，再从该节点后开始录制', 'warning')
    return false
  }
  const options = {
    ...runtimeOptions,
    headless: false,
    ...(desktopRuntime.value ? { browser_transport: 'local_agent' } : {}),
  }
  const response = await browserWorkflowApi.startRecordingSession(document.value, {
    options,
    anchor_node_id: recordingAnchorNodeId.value,
  })
  if (response?.code !== 0 || !response.data?.execution_id) return false
  executionId.value = response.data.execution_id
  executionPanelVisible.value = true
  executionStatus.value = response.data.status
  recordingStepCount.value = 0
  recordingAnchorNodeId.value = response.data.anchor_node_id || recordingAnchorNodeId.value
  acceptBackendRecordingState(response.data)
  connectExecutionSocket()
  showMessage('浏览器录制会话已重新建立，没有重新执行整张流程', 'success')
  return true
}
async function withBrowserExecutionRecovery(action) {
  try {
    return await action()
  } catch (error) {
    const message = String(error?.response?.data?.detail || error?.message || error || '')
    if (!message.includes('浏览器会话不存在') && !message.includes('已关闭')) throw error
    if (!await recoverBrowserExecutionSession()) throw error
    return action()
  }
}
function handleExecutionMessage(payload) {
  if (payload?.type === 'execution_snapshot') {
    executionStatus.value = payload.record?.status || executionStatus.value
    executionEvents.value = (payload.events || []).map(item => item.event_json || item)
    activeNodeId.value = findActiveNodeId(executionEvents.value)
    if (payload.recording_state) acceptBackendRecordingState(payload.recording_state)
    return
  }
  if (payload?.type === 'execution_event') {
    const event = payload.event || {}
    executionEvents.value.push(event)
    executionStatus.value = event.waiting_for_human ? 'waiting_human' : (event.phase === 'started' ? 'running' : executionStatus.value)
    if (event.phase === 'started') activeNodeId.value = event.node_id || ''
    else if (activeNodeId.value === event.node_id) activeNodeId.value = ''
    if (event.waiting_for_human) waitingNodeId.value = event.node_id || ''
    if (event.phase !== 'started' && event.success === false) executionStatus.value = 'failed'
    return
  }
  if (payload?.type === 'execution_status') {
    executionStatus.value = payload.status || executionStatus.value
    if (['succeeded', 'failed', 'cancelled'].includes(executionStatus.value)) {
      activeNodeId.value = ''
      closeExecutionSocket()
    }
    return
  }
  if (payload?.type === 'recording_state_changed') {
    acceptBackendRecordingState(payload)
    if (payload.phase === 'analyzing') executionStatus.value = 'recording_analyzing'
    return
  }
  if (payload?.type === 'recording_step_cancelled') {
    stepAnalysis.value = null
    stepTitle.value = ''
    recordingCaptureMode.value = 'step'
    recordingReviewStage.value = 'idle'
    showMessage('已在浏览器中取消当前步骤，可以重新录制', 'warning')
    return
  }
  if (payload?.type === 'recording_finished') {
    executionStatus.value = 'recording_completed'
    recordingStepCount.value = Number(payload.step_count || 0)
    if (!Array.isArray(payload.steps) || !payload.steps.length) {
      stepAnalysis.value = null
      stepTitle.value = ''
      stepScope.value = null
      recordingReviewStage.value = 'idle'
      recordingCaptureMode.value = 'step'
      executionPanelVisible.value = true
      showMessage(`录制已结束，共记录 ${recordingStepCount.value} 个操作，请检查流程并保存`, 'success')
      return
    }
    handleExecutionMessage(normalizeRecordingFinishedPayload(payload))
    showMessage(`录制已结束，共记录 ${recordingStepCount.value} 个操作；请确认最后一步后保存`, 'success')
    return
  }
  if (payload?.type === 'recording_step_finished') {
    recordingAnchorNodeId.value = payload.anchor_node_id || recordingAnchorNodeId.value
    if (Number.isFinite(Number(payload.step_count))) recordingStepCount.value = Number(payload.step_count)
    const captureMode = payload.capture_mode || recordingCaptureMode.value || 'step'
    if (captureMode === 'list_sample' && pendingListScope.value) {
      const result = resolveListScope(listEntrySteps.value, payload.steps || [], pendingListScope.value.mode)
      if (!result.ok) {
        stepAnalysis.value = [...listEntrySteps.value]
        stepScope.value = { kind: 'possible_list', reason: result.reason }
        recordingReviewStage.value = 'scope_choice'
        showMessage(result.reason, 'warning')
      } else {
        stepAnalysis.value = [...result.entrySteps]
        listEntrySteps.value = [...result.entrySteps]
        stepScope.value = result.scope
        pendingListScope.value = { ...result.scope }
        recordingReviewStage.value = 'list_scope_ready'
        showMessage('两个项目样本已匹配，请确认列表范围', 'success')
      }
    } else if (captureMode === 'item_demo' && pendingListScope.value) {
      const result = completeListItemDemonstration({
        entrySteps: listEntrySteps.value,
        scope: pendingListScope.value,
      }, payload.steps || [])
      stepTitle.value = stepTitle.value || payload.step_title || '处理列表中的一个项目'
      stepAnalysis.value = result.steps
      listEntrySteps.value = [...stepAnalysis.value]
      stepScope.value = result.scope
      recordingReviewStage.value = result.stage
    } else if (captureMode === 'pagination_demo' && pendingListScope.value) {
      const result = completePaginationDemonstration({
        entrySteps: listEntrySteps.value,
        scope: pendingListScope.value,
      }, payload.steps || [])
      stepAnalysis.value = result.steps
      stepScope.value = result.scope
      pendingListScope.value = { ...stepScope.value }
      recordingReviewStage.value = result.stage
      if (result.stage === 'pagination_required') showMessage('没有识别到翻页点击，请重新演示一次', 'warning')
    } else {
      stepTitle.value = payload.step_title || '当前步骤'
      stepAnalysis.value = payload.steps || []
      stepScope.value = payload.scope || { kind: 'single' }
      stepScopeSelection.value = 'single'
      recordingReviewStage.value = payload.scope?.kind === 'possible_list' ? 'scope_choice' : 'ready'
      listEntrySteps.value = []
      pendingListScope.value = null
    }
    if (captureMode === 'step' && stepScope.value?.kind === 'single' && stepAnalysis.value?.length && recordingAnchorNodeId.value) {
      confirmedStepNodeIds.value = appendRecordedSteps(stepAnalysis.value, stepScope.value, recordingAnchorNodeId.value)
      if (confirmedStepNodeIds.value.length) {
        recordingReviewStage.value = 'inserted'
        executionStatus.value = 'recording_completed'
        showMessage(`已分析并将 ${confirmedStepNodeIds.value.length} 个节点插入指定位置`, 'success')
      }
    }
    recordingCaptureMode.value = 'step'
    executionPanelVisible.value = true
    showMessage(stepAnalysis.value.length ? '浏览器已完成当前步骤，AI分析结果已返回' : '当前步骤没有可分析的操作', stepAnalysis.value.length ? 'success' : 'warning')
  }
}
function connectExecutionSocket() {
  closeExecutionSocket()
  if (!executionId.value) return
  executionSocket = new WebSocket(browserWorkflowApi.executionSocketUrl(executionId.value))
  executionSocket.onmessage = event => {
    try { handleExecutionMessage(JSON.parse(event.data)) } catch { /* ignore malformed push */ }
  }
  executionSocket.onerror = () => showMessage('执行日志连接中断，浏览器操作不受影响', 'warning')
}
function closeExecutionSocket() {
  if (!executionSocket) return
  executionSocket.onclose = null
  executionSocket.close()
  executionSocket = null
}
async function resumeExecution() {
  if (!executionId.value || !waitingNodeId.value) return
  await browserWorkflowApi.resumeExecution(executionId.value, waitingNodeId.value)
  waitingNodeId.value = ''
}
async function startStepCapture() {
  if (stepCaptureActive.value) return
  if (!selectedNode.value || selectedNode.value.kind === 'end') {
    showMessage('请先选择一个非结束节点，再从该节点后开始录制', 'warning')
    return
  }
  if (document.value.edges.filter(edge => edge.source === selectedNode.value.id).length > 1) {
    showMessage('当前节点有多个分支，请选择具体分支上的节点后再录制', 'warning')
    return
  }
  if (!await ensureBrowserRuntimeForAction()) return
  recordingAnchorNodeId.value = selectedNode.value.id
  stepAnalysis.value = null
  stepTitle.value = ''
  stepScope.value = null
  stepScopeSelection.value = 'single'
  recordingReviewStage.value = 'idle'
  recordingCaptureMode.value = 'step'
  listEntrySteps.value = []
  pendingListScope.value = null
  confirmedStepNodeIds.value = []
  try {
    if (!executionId.value || recordingEnded.value) {
      if (!await recoverBrowserExecutionSession()) return
      showMessage('肥猫猫录制助手已连接，请在浏览器内完成或取消当前步骤', 'success')
      return
    }
    const response = await withBrowserExecutionRecovery(() => browserWorkflowApi.recording(executionId.value, 'start_step', { mode: 'step' }))
    if (response?.code !== 0) return
    acceptBackendRecordingState(response.data)
    showMessage('肥猫猫录制助手已连接，请在浏览器内完成或取消当前步骤', 'success')
  } catch {
    // API layer displays the backend message.
  }
}
function openRecordingStart() {
  recordingAnchorChoice.value = getRecordingAnchorChoice(selectedNode.value)
  recordingStartVisible.value = true
}
async function confirmRecordingStart() {
  const anchor = nodeById(recordingAnchorChoice.value)
  if (!anchor || anchor.kind === 'end') {
    showMessage('请选择一个有效的录制起点', 'warning')
    return
  }
  selectedNodeId.value = anchor.id
  recordingStartVisible.value = false
  await startStepCapture()
}
async function retryStepCapture() {
  if (!executionId.value) return
  await browserWorkflowApi.recording(executionId.value, 'reset_step')
  const response = await browserWorkflowApi.recording(executionId.value, 'start_step', { mode: 'step' })
  if (response?.code !== 0) return
  acceptBackendRecordingState(response.data)
  stepAnalysis.value = null
  stepTitle.value = ''
  stepScope.value = null
  stepScopeSelection.value = 'single'
  recordingReviewStage.value = 'idle'
  recordingCaptureMode.value = 'step'
  listEntrySteps.value = []
  pendingListScope.value = null
  showMessage('已清空当前步骤，请重新操作', 'success')
}
function discardStepAnalysis() {
  stepAnalysis.value = null
  stepTitle.value = ''
  stepScope.value = null
  stepScopeSelection.value = 'single'
  recordingReviewStage.value = 'idle'
  recordingCaptureMode.value = 'step'
  listEntrySteps.value = []
  pendingListScope.value = null
}
async function startListItemDemo() {
  if (!executionId.value || !listEntrySteps.value.length || !stepScope.value || stepScopeSelection.value === 'single') return
  const plan = beginListItemDemonstration(listEntrySteps.value, stepScope.value, stepScopeSelection.value)
  if (!plan) return
  const response = await browserWorkflowApi.recording(executionId.value, 'start_step', { mode: 'item_demo' })
  if (response?.code !== 0) return
  listEntrySteps.value = plan.entrySteps
  pendingListScope.value = plan.scope
  recordingCaptureMode.value = 'item_demo'
  acceptBackendRecordingState(response.data)
  recordingReviewStage.value = 'item_demo'
  stepAnalysis.value = null
  showMessage('请在浏览器中完整演示如何处理一个项目，完成后点击“完成当前项目”', 'success')
}
async function startListSample() {
  if (!executionId.value || !stepAnalysis.value?.length || !stepScope.value || stepScopeSelection.value === 'single') return
  const response = await browserWorkflowApi.recording(executionId.value, 'start_step', { mode: 'list_sample' })
  if (response?.code !== 0) return
  listEntrySteps.value = [...stepAnalysis.value]
  pendingListScope.value = { mode: stepScopeSelection.value }
  recordingCaptureMode.value = 'list_sample'
  acceptBackendRecordingState(response.data)
  recordingReviewStage.value = 'list_sample'
  stepAnalysis.value = null
  showMessage('请在浏览器中点击同组的另一个项目，然后点击“完成样本选择”', 'success')
}
async function startPaginationDemo() {
  if (!executionId.value || !pendingListScope.value) return
  const response = await browserWorkflowApi.recording(executionId.value, 'start_step', { mode: 'pagination_demo' })
  if (response?.code !== 0) return
  recordingCaptureMode.value = 'pagination_demo'
  acceptBackendRecordingState(response.data)
  recordingReviewStage.value = 'pagination_demo'
  stepAnalysis.value = null
  showMessage('请在浏览器中点击一次“下一页”或“加载更多”，然后点击“完成翻页演示”', 'success')
}
function confirmStepAnalysis() {
  if (!stepAnalysis.value?.length) return
  if (!recordingAnchorNodeId.value || !nodeById(recordingAnchorNodeId.value)) {
    showMessage('录制起点节点已经不存在，无法写入流程', 'error')
    return
  }
  const steps = stepAnalysis.value.map(step => ({ ...step, title: stepTitle.value || step.title }))
  confirmedStepNodeIds.value = appendRecordedSteps(
    steps,
    stepScopeSelection.value === 'single' ? null : { ...stepScope.value, mode: stepScopeSelection.value },
    recordingAnchorNodeId.value,
  )
  stepAnalysis.value = null
  stepTitle.value = ''
  stepScope.value = null
  stepScopeSelection.value = 'single'
  recordingReviewStage.value = 'idle'
  recordingCaptureMode.value = 'step'
  listEntrySteps.value = []
  pendingListScope.value = null
  showMessage('当前步骤已加入流程，请点击按钮抓取下一步', 'success')
}
async function testConfirmedStep() {
  if (!executionId.value || !confirmedStepNodeIds.value.length || !recordingAnchorNodeId.value) return
  if (!await ensureBrowserRuntimeForAction()) return
  try {
    const response = await browserWorkflowApi.testStep(
      executionId.value,
      document.value,
      confirmedStepNodeIds.value,
      recordingAnchorNodeId.value,
      { suppressErrorMessage: true },
    )
    if (response?.code === 0) showMessage(response.message || '已从当前步骤开始测试，浏览器保持打开', 'success')
  } catch (error) {
    const anchorTitle = nodeById(recordingAnchorNodeId.value)?.title || recordingAnchorNodeId.value
    const message = String(error?.response?.data?.detail || error?.message || '')
    showMessage(
      message.includes('会话不存在') || message.includes('已关闭')
        ? `浏览器状态已经丢失。录制起点是“${anchorTitle}”，请先执行到该节点后重新录制或测试。`
        : (message || '当前录制步骤测试失败'),
      'error',
    )
  }
}
function appendRecordedSteps(steps, scope = null, anchorNodeId = '') {
  const anchorNode = nodeById(anchorNodeId)
  if (!anchorNode || anchorNode.kind === 'end') return []
  recordHistory()
  const result = insertRecordedStepsIntoGraph({
    workflow: document.value,
    steps,
    scope,
    anchorNodeId,
    resolvePosition: findFreePosition,
  })
  if (!result.createdNodeIds.length) {
    history.value.pop()
    if (result.error) showMessage(result.error, 'warning')
    return []
  }
  repairDocumentCollisions(document.value)
  markPersisted(false)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(document.value))
  showMessage(`已将 ${result.insertedStepCount} 个录制步骤插入“${anchorNode.title}”之后，请检查后保存`, 'success')
  return result.testNodeIds
}
function workflowBranchFromPort(portId = '', sourceId = '') {
  if (!portId || portId === 'output') return null
  const branch = portId.replace(/^output-/, '')
  if (branch === 'default') return { label: 'ELSE', condition: { branch: 'default', default: true } }
  const source = nodeById(sourceId)
  const label = source?.kind === 'condition'
    ? conditionPorts(source).find(port => port.id === branch)?.label || branch
    : branch === 'loop' ? '循环' : branch === 'done' ? '完成' : branch
  return { label, condition: { branch } }
}
function syncWorkflowGraphFromDocument() {
  if (!workflowGraph.value) return
  syncingWorkflowGraph.value = true
  try {
    syncWorkflowGraph(workflowGraph.value, document.value, { getNodeSize: nodeDimensions })
  } finally {
    syncingWorkflowGraph.value = false
  }
}
function handleWorkflowGraphNodeClick({ node }) {
  if (node?.id) handleNodeClick(node.id)
}
function handleWorkflowGraphEdgeClick({ edge }) {
  if (edge?.id) selectEdge(edge.id)
}
function handleWorkflowGraphNodeMoved({ node }) {
  if (syncingWorkflowGraph.value || !node) return
  const target = nodeById(node.id)
  if (!target) return
  target.position = { ...node.getPosition() }
  markPersisted(false)
}
function handleWorkflowGraphEdgeConnected({ edge }) {
  if (syncingWorkflowGraph.value || !edge) return
  const source = edge.getSource?.()
  const target = edge.getTarget?.()
  const sourceId = typeof source?.cell === 'string' ? source.cell : source?.cell?.id
  const targetId = typeof target?.cell === 'string' ? target.cell : target?.cell?.id
  if (!sourceId || !targetId) return
  const branch = workflowBranchFromPort(source.port, sourceId)
  createEdge(sourceId, targetId, branch)
  syncWorkflowGraphFromDocument()
}
function handleWorkflowGraphEdgeRemoved({ cell }) {
  if (syncingWorkflowGraph.value || !cell?.id) return
  removeEdge(cell.id)
}
function initializeWorkflowGraph() {
  if (!x6CanvasRef.value || workflowGraph.value) return
  workflowGraph.value = createWorkflowGraph(x6CanvasRef.value, {
    width: canvasSize.width,
    height: canvasSize.height,
    onNodeClick: handleWorkflowGraphNodeClick,
    onEdgeClick: handleWorkflowGraphEdgeClick,
    onNodeMoved: handleWorkflowGraphNodeMoved,
    onEdgeConnected: handleWorkflowGraphEdgeConnected,
    onEdgeRemoved: handleWorkflowGraphEdgeRemoved,
    onBlankClick: handleCanvasClick,
    onDelete: removeNode,
    getNodeIcon: node => nodeIcon(node.kind),
    getNodeTone: node => nodeTone(node.kind),
  })
  syncWorkflowGraphFromDocument()
}
watch(document, syncWorkflowGraphFromDocument, { deep: true })
onMounted(async () => {
  initializeWorkflowGraph()
  window.addEventListener('keydown', handleDeleteKey)
  stopBrowserRuntimeProgress = await listenBrowserWorkflowRuntimeProgress((payload) => {
    browserRuntimeProgress.value = payload || browserRuntimeProgress.value
  })
  await loadInstalledPluginNodes()
  await loadWorkflowList()
  if (route.params.workflowId && route.params.workflowId !== 'new') {
    await openWorkflow(route.params.workflowId)
  } else if (route.params.workflowId === 'new' || (!document.value.metadata?.persisted && !document.value.nodes.length)) {
    document.value = createDocument()
    selectedNodeId.value = ''
    localStorage.setItem(STORAGE_KEY, JSON.stringify(document.value))
  }
  if (!document.value.metadata?.persisted) return
  try {
    const response = await browserWorkflowApi.get(document.value.workflow_id, { suppressErrorMessage: true })
    if (response?.code === 0 && response.data?.document) {
      normalizeDocument(response.data.document)
      document.value = response.data.document
      markPersisted(true)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(document.value))
      await loadWorkflowList()
    }
  } catch {
    // Local draft remains the offline fallback for a new or not-yet-migrated workspace.
  }
})

const executionStatusLabel = computed(() => ({
  queued: '排队中', running: '执行中', recording_analyzing: '正在分析录制', recording_completed: '录制已完成', waiting_human: '等待人工处理', succeeded: '执行成功', failed: '执行失败', cancelled: '已取消',
}[executionStatus.value] || executionStatus.value || '未运行'))
function findActiveNodeId(events) {
  const active = new Set()
  for (const event of events) {
    if (!event?.node_id) continue
    if (event.phase === 'started') active.add(event.node_id)
    else active.delete(event.node_id)
  }
  return [...active].at(-1) || ''
}
const currentExecutionActivity = computed(() => {
  if (!activeNodeId.value) return null
  const node = nodeById(activeNodeId.value)
  const event = [...executionEvents.value].reverse().find(item => item.node_id === activeNodeId.value && item.phase === 'started')
  return {
    title: node?.title || activeNodeId.value,
    message: event?.message || '正在执行当前节点',
    timeoutSeconds: Math.max(1, Math.round((node?.timeout_ms || 30000) / 1000)),
  }
})
const recordingStateLabel = computed(() => {
  if (recordingEnded.value) return `已结束，共记录 ${recordingStepCount.value} 个操作，可继续查看浏览器`
  if (recordingAnalyzing.value) return '录制已停止，正在分析刚才的操作'
  if (recordingCaptureMode.value === 'item_demo' && stepCaptureActive.value) return '正在演示如何处理一个项目'
  if (recordingCaptureMode.value === 'pagination_demo' && stepCaptureActive.value) return '正在演示如何进入下一批内容'
  if (stepAnalysis.value) return '当前步骤待确认'
  if (stepCaptureActive.value) return '正在抓取当前步骤'
  return '等待开始当前步骤'
})
const recordingReviewTitle = computed(() => {
  if (recordingReviewStage.value === 'scope_choice') return '确认重复列表的处理范围'
  if (recordingReviewStage.value === 'pagination_required') return '补充翻页方式'
  if (stepScope.value?.kind === 'list_item' && stepScopeSelection.value !== 'single') return '确认单项目演示结果'
  return '当前步骤分析结果'
})
const listExecutionSummary = computed(() => {
  const count = stepAnalysis.value?.length || 0
  if (stepScopeSelection.value === 'all_pages') {
    return `系统将逐项执行你演示的 ${count} 个操作，当前列表完成后进入下一批内容，直到没有后续页面。`
  }
  return `系统将对当前列表中的每一项，逐项执行你演示的 ${count} 个操作。`
})
const pluginMenuGroups = computed(() => [
  {
    key: 'interaction',
    title: '复杂浏览器交互',
    description: '处理基础点击和输入之外的页面组件',
    plugins: pluginCatalog.value.filter(plugin => plugin.kind !== 'business'),
  },
  {
    key: 'business',
    title: '业务服务能力',
    description: '邮箱、短信、手机号和其他外部服务',
    plugins: pluginCatalog.value.filter(plugin => plugin.kind === 'business'),
  },
])

onBeforeUnmount(closeExecutionSocket)
onBeforeUnmount(() => stopBrowserRuntimeProgress?.())
onBeforeUnmount(stopNodeDrag)
onBeforeUnmount(stopCanvasPan)
onBeforeUnmount(() => disposeWorkflowGraph(workflowGraph.value))
onBeforeUnmount(() => window.removeEventListener('keydown', handleDeleteKey))
</script>

<style scoped>
.browser-workflow-page { height: 100vh; min-height: 0; overflow: hidden; display: flex; flex-direction: column; padding: 0; box-sizing: border-box; color: #18231d; background: #fbfdfb; font-family: ui-sans-serif, system-ui, sans-serif; }
.browser-runtime-dialog { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; background: rgba(20, 30, 24, .28); }
.browser-runtime-card { width: min(420px, calc(100vw - 40px)); padding: 24px; border: 1px solid #d7e4d9; border-radius: 18px; background: #fff; box-shadow: 0 20px 60px rgba(24, 35, 29, .18); display: grid; gap: 12px; }
.browser-runtime-card strong { font-size: 18px; }
.browser-runtime-card span { color: #647268; }
.browser-runtime-card progress { width: 100%; accent-color: #258451; }
.workflow-input-card { max-height: min(720px, calc(100vh - 48px)); overflow: auto; }.workflow-input-card > header { display: flex; align-items: flex-start; justify-content: space-between; }.workflow-input-card > header div strong, .workflow-input-card > header div span { display: block; }.workflow-input-card > header div span { margin-top: 4px; font-size: 12px; }.workflow-input-card > header button { color: #758078; background: transparent; font-size: 22px; }.workflow-input-card label { display: grid; gap: 5px; }.workflow-input-card label span { color: #405047; font-weight: 700; }.workflow-input-card label b { margin-left: 3px; color: #b24e49; }.workflow-input-card label small { color: #879288; }.workflow-input-card input:not([type="checkbox"]), .workflow-input-card textarea { width: 100%; padding: 10px; box-sizing: border-box; border: 1px solid #d8e3da; border-radius: 8px; outline: none; }.workflow-input-card input:focus, .workflow-input-card textarea:focus { border-color: #5c9c70; box-shadow: 0 0 0 3px #a8d4b34d; }.workflow-input-card input[type="checkbox"] { width: 18px; height: 18px; accent-color: #278453; }
.recording-start-card { display: grid; gap: 18px; width: min(440px, calc(100vw - 40px)); }.recording-start-card > header { display: flex; align-items: flex-start; justify-content: space-between; }.recording-start-card > header div strong, .recording-start-card > header div span { display: block; }.recording-start-card > header div span { margin-top: 5px; color: #7b887f; font-size: 12px; }.recording-start-card > header button { color: #758078; background: transparent; font-size: 22px; }.recording-start-card label { display: grid; gap: 7px; margin: 0; }.recording-start-card label > span { color: #405047; font-weight: 700; }.recording-action { color: #326d9a; background: #eef6fb; border-color: #c6dce9; }
.browser-runtime-actions { display: flex; justify-content: flex-end; }
.workflow-picker { max-width: 1700px; margin: 0 auto 14px; padding: 14px 16px; font: 12px ui-sans-serif, system-ui; }
.desktop-only-banner, .desktop-runtime-bar { display: flex; align-items: center; gap: 12px; max-width: 1700px; margin: 0 auto 14px; padding: 12px 16px; font: 12px ui-sans-serif, system-ui; }.desktop-only-banner { color: #8f4d36; background: #fff7ed; border-color: #f1d1bd; }.desktop-only-banner span, .desktop-runtime-bar span { color: #87958a; }.desktop-runtime-bar > div { display: grid; gap: 3px; margin-right: auto; }
.picker-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; }.picker-heading > div { display: grid; gap: 4px; }.picker-heading span, .credential-bar span { color: #87958a; font-size: 11px; }.workflow-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }.workflow-card { display: grid; gap: 4px; min-width: 210px; padding: 10px 12px; color: #344439; text-align: left; background: #f8fbf8; border: 1px solid #dbe6dc; border-radius: 10px; }.workflow-card span { color: #87958a; font-size: 11px; }.workflow-card.active { border-color: #4e9c68; box-shadow: 0 0 0 3px #9ad1aa44; }.picker-empty { margin-top: 12px; padding: 10px; color: #778379; background: #f6f8f5; border-radius: 8px; }
.hidden-file-input { display: none; }
.runtime-bar { display: flex; align-items: center; gap: 16px; max-width: 1700px; margin: 0 auto 14px; padding: 12px 16px; font: 12px ui-sans-serif, system-ui; }.runtime-bar > div { display: grid; gap: 3px; margin-right: auto; }.runtime-bar > div span { color: #87958a; font-size: 11px; }.runtime-bar label { display: grid; gap: 5px; margin: 0; color: #627066; font-size: 11px; }.runtime-bar input, .runtime-bar select { min-width: 190px; padding: 8px 10px; color: #344439; background: #fbfdfb; border: 1px solid #dbe6dc; border-radius: 8px; font: 12px ui-sans-serif, system-ui; }.runtime-bar .checkbox-label { display: flex; align-items: center; gap: 6px; white-space: nowrap; }.runtime-bar .checkbox-label input { min-width: auto; }
.credential-bar { display: flex; align-items: center; gap: 10px; max-width: 1700px; margin: 0 auto 14px; padding: 12px 16px; font: 12px ui-sans-serif, system-ui; }.credential-bar > div { display: grid; gap: 3px; margin-right: auto; }.credential-bar input { width: 190px; padding: 9px 10px; color: #344439; background: #fbfdfb; border: 1px solid #dbe6dc; border-radius: 8px; font: 12px ui-sans-serif, system-ui; }
.workflow-header { display: flex; justify-content: space-between; gap: 24px; align-items: center; max-width: 1700px; margin: 0 auto 12px; }.compact-header { min-height: 42px; padding: 0 2px; }.compact-header > strong { color: #52665a; font-size: 14px; }
.eyebrow { margin: 0 0 8px; color: #3c8a61; font: 700 11px/1.2 ui-sans-serif, system-ui; letter-spacing: .18em; }
h1 { margin: 0; font-size: clamp(26px, 3vw, 36px); letter-spacing: -.04em; }
.subtitle { margin: 10px 0 0; color: #6e7c72; font: 14px/1.5 ui-sans-serif, system-ui; }
.header-actions { display: flex; gap: 10px; }
button { border: 0; cursor: pointer; font: 600 13px ui-sans-serif, system-ui; }
.primary-button, .ghost-button, .secondary-button { padding: 11px 16px; border-radius: 10px; }
.primary-button { color: white; background: #287d4f; box-shadow: 0 8px 18px #287d4f2b; }
.ghost-button, .secondary-button { color: #476052; background: white; border: 1px solid #d9e4da; }
.workflow-shell { display: grid; flex: 1; min-height: 0; grid-template-columns: minmax(0, 1fr); gap: 0; width: 100%; max-width: none; margin: 0; }.workflow-shell.with-config { grid-template-columns: minmax(0, 1fr) 320px; }
.panel { background: #fff; border: 1px solid #dce7dd; border-radius: 16px; box-shadow: 0 12px 32px #2e5a3a0d; }
.node-library, .config-panel { padding: 16px; }
.node-config-panel { position: absolute; top: 18px; right: 18px; bottom: 74px; z-index: 8; width: 320px; max-height: none; overflow: auto; padding: 20px; box-shadow: 0 18px 42px #1c33252b; }.config-heading-actions { display: flex; align-items: center; gap: 10px; }.config-heading-actions button { width: 28px; height: 28px; color: #718078; background: #f2f6f2; border-radius: 7px; font-size: 19px; }
.parameter-section { margin: 18px 0; padding-top: 14px; border-top: 1px solid #e5ede6; }.parameter-section > header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }.parameter-section > header div strong, .parameter-section > header div small { display: block; }.parameter-section > header div strong { color: #405448; font-size: 12px; }.parameter-section > header div small { margin-top: 2px; color: #8a978e; font-size: 10px; }.parameter-section > header button { padding: 5px 8px; color: #287d4f; background: #f3f8f4; border-radius: 6px; font-size: 10px; }.parameter-card { margin: 8px 0; padding: 9px; background: #f8faf8; border: 1px solid #e1e9e2; border-radius: 8px; }.parameter-card > input { margin-top: 7px; }.parameter-row { display: grid; grid-template-columns: minmax(0, 1fr) 112px 24px; gap: 6px; align-items: center; }.parameter-source-row { grid-template-columns: 105px minmax(0, 1fr); margin-top: 7px; }.parameter-card .parameter-row input, .parameter-card > input { margin-top: 0; }.parameter-remove { width: 24px; height: 24px; color: #a45a57; background: transparent; font-size: 17px; }.parameter-required { display: flex !important; align-items: center; gap: 5px; margin: 7px 0 0 !important; color: #718078; font-size: 10px; }.parameter-required input { width: auto !important; margin: 0 !important; }.parameter-empty { padding: 12px; color: #95a098; text-align: center; background: #fafcfa; border-radius: 7px; font-size: 10px; }
.parameter-aggregation { margin-top: 7px; }
.condition-editor { margin: 18px 0; padding-top: 14px; border-top: 1px solid #e5ede6; }.condition-editor > header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }.condition-editor > header div strong, .condition-editor > header div small { display: block; }.condition-editor > header div small { margin-top: 2px; color: #8a978e; font-size: 10px; }.condition-editor > header button, .condition-add-clause { padding: 5px 8px; color: #287d4f; background: #f3f8f4; border-radius: 6px; font-size: 10px; }.condition-source-guide { padding: 9px 10px; color: #65766b; background: #f4f8f5; border: 1px solid #dfe9e1; border-radius: 8px; font-size: 10px; line-height: 1.55; }.condition-branch-card { margin: 8px 0; padding: 10px; border: 1px solid #dfe8e1; border-radius: 9px; background: #f9fbf9; }.condition-branch-card > header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }.condition-branch-card > header > div { display: flex; align-items: center; gap: 5px; }.condition-branch-card > header > div > button { color: #a45a57; background: transparent; font-size: 17px; }.condition-clause { display: grid; grid-template-columns: minmax(0, 1fr) 110px; gap: 6px; margin-top: 7px; padding-top: 7px; border-top: 1px dashed #e0e7e1; }.condition-clause > input { margin-top: 0; }.condition-clause-remove { color: #a45a57; background: transparent; font-size: 16px; }.condition-add-clause { margin-top: 8px; }.condition-default-branch { display: flex; align-items: center; gap: 10px; padding: 10px; color: #627168; background: #f1f5f2; border-radius: 8px; }.condition-default-branch span { font-size: 10px; }
.panel-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font: 700 14px ui-sans-serif, system-ui; }
.panel-heading small, .canvas-toolbar span { color: #8a998d; font-size: 11px; font-weight: 500; }
.library-node { display: flex; align-items: center; width: 100%; gap: 9px; padding: 10px 8px; margin: 6px 0; color: #314238; text-align: left; background: #f8fbf8; border: 1px solid #e7efe8; border-radius: 10px; }
.library-node:hover { border-color: #91c49e; transform: translateY(-1px); }
.library-node strong, .library-node small { display: block; }
.library-node small, label, .linking-tip, .config-empty small, .empty-canvas small { color: #849187; font: 11px/1.5 ui-sans-serif, system-ui; }
.add-mark { margin-left: auto; color: #a4b2a6; font-size: 18px; }
.node-icon { display: inline-grid; flex: 0 0 28px; width: 28px; height: 28px; place-items: center; border-radius: 8px; font: 700 13px ui-sans-serif, system-ui; }
.tone-green { color: #277d4e; background: #dff3e5; }.tone-blue { color: #326d9a; background: #e3f0f8; }.tone-amber { color: #9b6b16; background: #fff1cf; }.tone-purple { color: #7752a2; background: #efe7f8; }.tone-red { color: #a14f4b; background: #f8e2e0; }
.library-note { margin-top: 18px; padding: 10px; color: #778379; background: #f6f8f5; border-radius: 9px; font: 11px/1.5 ui-sans-serif, system-ui; }
.canvas-panel { position: relative; min-width: 0; min-height: 0; overflow: hidden; display: flex; flex-direction: column; border: 0; border-radius: 0; box-shadow: none; }.canvas-toolbar { display: none; }.canvas-tools { display: none; }.toolbar-hint { display: none; }
.workflow-canvas { position: relative; flex: 1; min-height: 0; overflow: auto; background-color: #fbfdfb; scrollbar-width: thin; }.workflow-canvas::-webkit-scrollbar { width: 8px; height: 8px; }.workflow-canvas::-webkit-scrollbar-thumb { background: #c5d3c8; border-radius: 99px; }.x6-canvas-host { position: relative; min-width: 6000px; min-height: 3000px; }.x6-graph { overflow: visible; }.x6-graph-svg { background-image: radial-gradient(#d5e2d6 1px, transparent 1px); background-size: 20px 20px; }.x6-workflow-node { position: relative; display: flex; align-items: center; gap: 10px; width: 100%; height: 100%; padding: 10px 16px; box-sizing: border-box; background: #fff; border: 1px solid #d9e5db; border-left: 4px solid #9ab7a0; border-radius: 12px; box-shadow: 0 8px 18px #36543b12; cursor: pointer; font-family: ui-sans-serif, system-ui; user-select: none; }.x6-workflow-node-icon { display: inline-grid; flex: 0 0 28px; width: 28px; height: 28px; place-items: center; color: #326d9a; background: #e3f0f8; border-radius: 8px; font-size: 13px; }.x6-workflow-node-copy { min-width: 0; flex: 1; }.x6-workflow-node-copy strong, .x6-workflow-node-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.x6-workflow-node-copy strong { color: #314238; font-size: 13px; }.x6-workflow-node-copy small { margin-top: 3px; color: #8b988e; font-size: 11px; }.x6-workflow-node-delete { flex: 0 0 28px; width: 28px; height: 28px; padding: 0; color: #b1bbb3; background: transparent; border: 0; border-radius: 8px; font-size: 18px; cursor: pointer; }.x6-workflow-node-delete:hover { color: #a54b48; }.x6-node-selected .x6-workflow-node, .x6-workflow-node:hover { border-color: #3b8a5c; box-shadow: 0 0 0 3px #9ad1aa55, 0 8px 18px #36543b18; }.x6-port-body { fill: #fff; stroke: #4c89a8; stroke-width: 2.5; }.x6-port-body[data-port-group="out"] { stroke: #4b9566; }.x6-edge path { transition: stroke .15s ease, stroke-width .15s ease; }.x6-edge:hover path { stroke: #287d4f; stroke-width: 2.6; }
.edge-layer { position: absolute; inset: 0; pointer-events: none; }.edge-hit-area { pointer-events: stroke; cursor: pointer; }.edge-group-muted { opacity: .64; }.workflow-edge { pointer-events: none; transition: opacity .15s ease, stroke .15s ease, stroke-width .15s ease; }.workflow-edge.connected { filter: drop-shadow(0 0 2px #287d4f55); }.workflow-edge.selected { filter: drop-shadow(0 0 3px #b37b2055); }.canvas-node { position: absolute; z-index: 1; display: flex; flex-direction: column; align-items: stretch; width: 224px; min-height: 68px; padding: 10px 16px; box-sizing: border-box; background: white; border: 1px solid #d9e5db; border-left: 4px solid #9ab7a0; border-radius: 12px; box-shadow: 0 8px 18px #36543b12; cursor: pointer; }.canvas-node:hover, .canvas-node.selected { border-color: #3b8a5c; box-shadow: 0 0 0 3px #9ad1aa55, 0 8px 18px #36543b18; }.canvas-node.invalid, .canvas-node.invalid.selected { border-color: #d94a47; border-left-color: #d94a47; box-shadow: 0 0 0 4px #ee6a6638, 0 10px 24px #9e302c20; }.canvas-node.executing { border-color: #3179a8; box-shadow: 0 0 0 4px #64a7d64d, 0 10px 24px #326d9a24; }.canvas-node.linking { border-color: #c88b21; box-shadow: 0 0 0 3px #f3cc7766; }.node-heading { display: flex; align-items: center; gap: 10px; min-height: 46px; }.node-heading > div:nth-child(2) { min-width: 0; flex: 1; }.canvas-node strong, .canvas-node small { display: block; }.canvas-node strong { font: 700 13px ui-sans-serif, system-ui; }.canvas-node small { margin-top: 3px; overflow: hidden; color: #8b988e; font: 11px ui-sans-serif, system-ui; text-overflow: ellipsis; white-space: nowrap; }.node-actions { display: flex; align-items: center; gap: 4px; margin-left: auto; }.condition-node-content { margin: 4px -6px -2px; border-top: 1px solid #edf1ed; }.condition-node-branch { display: grid; grid-template-columns: 62px minmax(0, 1fr); align-items: center; height: 40px; padding: 0 8px; border-bottom: 1px solid #f0f3f0; box-sizing: border-box; }.condition-node-branch:last-child { border-bottom: 0; }.condition-node-branch > span { color: #9b6d1a; font: 700 10px ui-sans-serif, system-ui; }.condition-node-branch > small { margin: 0; color: #708076; }.loop-node-content, .data-node-content { display: grid; gap: 7px; margin: 5px -6px -2px; padding: 9px 8px 0; border-top: 1px solid #edf1ed; }.loop-node-content > div, .data-node-content > div { display: grid; grid-template-columns: 70px minmax(0, 1fr); align-items: center; }.loop-node-content span, .data-node-content span { color: #7c897f; font-size: 10px; }.loop-node-content strong, .loop-node-content small, .data-node-content small { margin: 0; color: #53645a; font-size: 11px; }.loop-node-content footer { display: flex; justify-content: flex-end; gap: 20px; margin-top: 2px; color: #7862a6; }.node-context-actions { position: absolute; right: 0; bottom: calc(100% + 9px); z-index: 4; }.node-context-actions button { display: inline-flex; align-items: center; gap: 5px; padding: 6px 9px; color: #287d4f; white-space: nowrap; background: #fff; border: 1px solid #b9dac4; border-radius: 7px; box-shadow: 0 7px 18px #36543b18; font-size: 10px; }.node-context-actions button:disabled { opacity: .55; cursor: not-allowed; }.node-context-actions svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.8; }.node-context-actions svg circle:first-child { fill: currentColor; stroke: none; }.delete-node { display: inline-grid; width: 28px; height: 28px; place-items: center; color: #b1bbb3; font-size: 18px; border-radius: 8px; background: transparent; }.delete-node:hover { color: #a54b48; }.node-handle { position: absolute; top: 50%; z-index: 3; width: 12px; height: 12px; padding: 0; background: #fff; border: 2px solid #829287; border-radius: 50%; transform: translateY(-50%); cursor: crosshair; transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease; }.input-handle { left: -6px; border-color: #4c89a8; }.output-handle { right: -6px; border-color: #4b9566; }.node-handle:hover, .node-handle.active { border-color: #287d4f; transform: translateY(-50%) scale(1.15); box-shadow: 0 0 0 3px #8fc5a044; }.empty-canvas, .config-empty { display: grid; place-items: center; gap: 7px; height: 250px; color: #7d8d80; text-align: center; font: 14px ui-sans-serif, system-ui; }.empty-canvas span, .config-empty span { color: #83ad8c; font-size: 35px; }.empty-canvas strong, .config-empty strong { color: #52665a; }.config-panel label { display: block; margin: 14px 0; }.config-panel input, .config-panel textarea { width: 100%; margin-top: 6px; padding: 9px 10px; color: #344439; box-sizing: border-box; background: #fbfdfb; border: 1px solid #dbe6dc; border-radius: 8px; font: 12px ui-sans-serif, system-ui; outline: none; }.config-panel input:focus, .config-panel textarea:focus { border-color: #64a578; box-shadow: 0 0 0 3px #a5d5b044; }.node-field-select { margin-top: 6px; }.credential-node-box { margin: 14px 0; padding: 10px; background: #f7faf7; border: 1px solid #e3ece4; border-radius: 9px; }.config-divider { height: 1px; margin: 20px 0; background: #e8eee9; }.config-caption { margin-bottom: 9px; color: #6b7c70; font: 700 11px ui-sans-serif, system-ui; }.linking-tip { margin-bottom: 10px; padding: 9px; color: #87621e; background: #fff8e6; border-radius: 8px; }.linking-tip.muted { color: #738075; background: #f5f8f5; }.full { width: 100%; }
.node-branch-handle { position: absolute; right: -6px; z-index: 3; width: 12px; height: 12px; padding: 0; background: #fff; border: 2px solid #b37b20; border-radius: 50%; cursor: crosshair; transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease; }.node-branch-handle:hover, .node-branch-handle.active { border-color: #287d4f; transform: scale(1.15); box-shadow: 0 0 0 3px #8fc5a044; }
.canvas-back-button { position: fixed; top: 14px; left: 14px; z-index: 9; display: grid; width: 26px; height: 26px; place-items: center; padding: 0; color: #64736a; background: transparent; border: 0; cursor: pointer; }.canvas-back-button svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; transition: transform .16s ease, color .16s ease; }.canvas-back-button:hover { color: #287d4f; }.canvas-back-button:hover svg { transform: translateX(-2px); }.canvas-bottom-bar { position: absolute; right: 18px; bottom: 18px; left: 18px; z-index: 5; display: flex; align-items: center; gap: 8px; width: max-content; max-width: calc(100% - 36px); padding: 8px; background: #fff; border: 1px solid #dce7dd; border-radius: 10px; box-shadow: 0 8px 22px #36543b1c; }.canvas-action { display: inline-flex; align-items: center; gap: 4px; padding: 7px 10px; color: #52665a; background: #f7faf7; border: 1px solid #e0e9e1; border-radius: 7px; cursor: pointer; font: 600 12px ui-sans-serif, system-ui; }.canvas-action:hover { color: #287d4f; border-color: #91c49e; }.canvas-action:disabled { opacity: .45; cursor: not-allowed; }.canvas-primary-actions { display: flex; align-items: center; gap: 6px; margin-left: 6px; padding-left: 12px; border-left: 1px solid #dce7dd; }.trial-action { color: #287d4f; background: #eef8f1; border-color: #b9dac4; }.primary-action { color: #fff; background: #287d4f; border-color: #287d4f; }.add-node-wrap { position: relative; }.node-menu { position: absolute; bottom: 44px; left: 0; display: grid; grid-template-columns: repeat(2, minmax(200px, 1fr)); gap: 8px; width: 500px; max-height: 460px; overflow: auto; padding: 10px; background: #fff; border: 1px solid #dce7dd; border-radius: 10px; box-shadow: 0 12px 30px #36543b25; }.node-menu-group { display: grid; gap: 6px; align-content: start; padding: 7px; background: #fbfdfb; border: 1px solid #edf2ed; border-radius: 8px; }.node-menu-group header { padding: 1px 2px 4px; }.node-menu-group header strong, .node-menu-group header small { display: block; }.node-menu-group header strong { color: #52665a; font-size: 11px; }.node-menu-group header small { margin-top: 2px; color: #96a397; font-size: 10px; line-height: 1.35; }.node-menu button { display: flex; align-items: center; gap: 8px; padding: 8px; color: #344439; text-align: left; background: #fff; border: 1px solid #e6eee7; border-radius: 7px; cursor: pointer; }.node-menu button:hover { border-color: #91c49e; }.node-menu button strong, .node-menu button small { display: block; }.node-menu button small { margin-top: 2px; color: #8b998e; font-size: 10px; }
.execution-panel { position: fixed; right: 22px; bottom: 18px; left: 22px; z-index: 10; max-width: 1700px; max-height: min(62vh, 560px); margin: 0 auto; overflow: auto; padding: 12px 16px; scrollbar-width: thin; }.execution-heading-actions { display: flex; align-items: center; gap: 10px; }.execution-heading-actions button { width: 28px; height: 28px; color: #718078; background: #f2f6f2; border-radius: 7px; font-size: 19px; }.execution-heading-actions button:hover { color: #a14f4b; background: #f8e2e0; }.execution-status { display: inline-block; padding: 7px 11px; color: #277d4e; background: #e2f4e7; border-radius: 999px; font: 700 12px ui-sans-serif, system-ui; }.status-failed { color: #a14f4b; background: #f8e2e0; }.status-waiting_human { color: #956718; background: #fff1cf; }.human-gate { display: flex; align-items: center; gap: 14px; margin-top: 14px; padding: 12px; background: #fff8e8; border: 1px solid #f2d899; border-radius: 10px; font: 12px ui-sans-serif, system-ui; }.human-gate span { color: #826f45; }.human-gate .primary-button { margin-left: auto; }.execution-events { display: grid; gap: 7px; margin-top: 14px; min-width: 0; max-height: 390px; overflow: auto; padding-right: 4px; scrollbar-width: thin; }.execution-event { display: flex; gap: 10px; align-items: flex-start; min-width: 0; padding: 8px 10px; color: #59675d; background: #f8fbf8; border-radius: 8px; font: 12px ui-sans-serif, system-ui; }.execution-event-content { min-width: 0; flex: 1; }.execution-event-content strong { display: block; margin-bottom: 5px; color: #53645a; font-size: 11px; }.execution-event-content pre { max-height: 260px; margin: 0; overflow: auto; color: inherit; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; font: inherit; }.event-ok { color: #2e8b58; }.event-running { color: #3678a7; }.event-warn { color: #ac741e; }
.plugin-menu { right: 0; left: auto; }.plugin-menu-item { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 8px; align-items: start; padding: 8px; color: #344439; background: #fff; border: 1px solid #e6eee7; border-radius: 7px; }.plugin-menu-item:hover { border-color: #91c49e; }.plugin-menu-main { display: grid; min-width: 0; gap: 2px; }.plugin-menu-main > div:first-child { display: flex; align-items: center; gap: 6px; }.plugin-menu-main strong { font-size: 12px; }.plugin-menu-main small { overflow: hidden; color: #8b998e; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.plugin-menu-main .plugin-enabled, .plugin-menu-main .plugin-disabled { font-size: 9px; }.plugin-enabled { color: #278052; }.plugin-disabled { color: #9a6b28; }.plugin-menu-permissions { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }.plugin-menu-permissions code { padding: 2px 4px; color: #79683d; background: #fff7df; border-radius: 4px; font-size: 9px; }.plugin-capability-actions { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }.node-menu .plugin-capability-actions button { display: inline-flex; width: auto; padding: 5px 7px; color: #287d4f; background: #eef8f1; border: 1px solid #b9dac4; border-radius: 5px; font-size: 9px; }.node-menu .plugin-capability-actions button:hover { color: #fff; background: #287d4f; border-color: #287d4f; }.plugin-menu-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; max-width: 118px; }.node-menu .plugin-menu-actions button { display: inline-flex; width: auto; padding: 4px 6px; color: #52665a; background: #f7faf7; border: 1px solid #dce7dd; border-radius: 5px; font-size: 9px; }.node-menu .plugin-menu-actions button:hover { color: #287d4f; border-color: #91c49e; }.node-menu .plugin-menu-actions button:disabled { opacity: .45; cursor: not-allowed; }.node-menu .plugin-menu-actions .danger-action { color: #9b4d48; border-color: #e8cbc8; }.plugin-menu-actions > span { color: #819087; font-size: 9px; }.plugin-menu-empty { grid-column: 1 / -1; padding: 24px; color: #7f8c83; text-align: center; background: #f7faf7; border-radius: 8px; }
.recording-review { display: grid; gap: 9px; margin-top: 14px; padding: 13px; background: #f7fbf7; border: 1px solid #d9e8da; border-radius: 10px; }.recording-review label { display: grid; gap: 5px; color: #637268; }.recording-review input { padding: 9px 10px; color: #344439; background: #fff; border: 1px solid #dbe6dc; border-radius: 8px; font: 12px ui-sans-serif, system-ui; }.recording-review-item { display: grid; grid-template-columns: 44px minmax(160px, 1fr) minmax(180px, 1fr); gap: 9px; align-items: center; padding: 8px 10px; color: #53645a; background: #fff; border-radius: 8px; font-size: 12px; }.recording-review-item code { overflow: auto; color: #386b4a; white-space: nowrap; }.recording-review-item small { color: #87958a; }.recording-review-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 3px; }.scope-assistant { display: grid; gap: 7px; padding: 11px; color: #53645a; background: #fff9eb; border: 1px solid #eed59e; border-radius: 9px; }.scope-assistant > span, .scope-assistant > small { color: #7b806e; font-size: 12px; }.scope-options { display: flex; flex-wrap: wrap; gap: 7px; }.scope-options button { border: 1px solid #d4bd79; border-radius: 7px; padding: 7px 10px; color: #6b5a2d; background: #fff; cursor: pointer; font-size: 12px; }.scope-options button.selected { color: #fff; background: #b37b20; border-color: #b37b20; }
.recording-state-hint { margin-top: 10px; color: #637268; font: 12px ui-sans-serif, system-ui; }.step-test-toolbar { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 10px 12px; color: #53645a; background: #f7fbf7; border: 1px solid #d9e8da; border-radius: 9px; font-size: 12px; }.step-test-toolbar .secondary-button { margin-left: auto; padding: 8px 11px; }
.current-execution-activity { display: flex; align-items: center; gap: 10px; margin-top: 10px; padding: 10px 12px; color: #456575; background: #f0f7fb; border: 1px solid #cee1ec; border-radius: 9px; }.current-execution-activity div { display: grid; gap: 3px; }.current-execution-activity strong { font-size: 12px; }.current-execution-activity small { color: #71858f; font-size: 11px; }.activity-pulse { flex: 0 0 8px; width: 8px; height: 8px; background: #3f8ebd; border-radius: 50%; box-shadow: 0 0 0 0 #3f8ebd66; animation: activity-pulse 1.5s infinite; }@keyframes activity-pulse { 70% { box-shadow: 0 0 0 7px #3f8ebd00; } 100% { box-shadow: 0 0 0 0 #3f8ebd00; } }
.node-recording-box { display: grid; gap: 10px; margin: 14px 0; padding: 12px; border: 1px solid #b9dac4; border-radius: 10px; background: #eef8f1; }.node-recording-box div { display: grid; gap: 3px; }.node-recording-box strong { color: #285e43; font-size: 12px; }.node-recording-box small { color: #718279; font-size: 11px; line-height: 1.45; }.node-recording-box .primary-button { width: 100%; padding: 9px 12px; }
.status-action-active { color: #fff; background: #287d4f; border-color: #287d4f; }
.node-config-panel { position: fixed !important; top: 16px !important; right: 16px !important; bottom: 78px !important; left: auto !important; z-index: 8 !important; width: 360px !important; max-width: calc(100% - 32px); box-sizing: border-box; }
@media (max-width: 1100px) { .workflow-shell { grid-template-columns: 200px minmax(480px, 1fr); }.config-panel { grid-column: 1 / -1; }.config-panel form { display: flex; gap: 12px; } }
@media (max-width: 720px) { .browser-workflow-page { padding: 18px; }.workflow-header { display: block; }.header-actions { margin-top: 18px; }.runtime-bar, .credential-bar { display: grid; align-items: stretch; }.runtime-bar > div, .credential-bar > div { margin-right: 0; }.runtime-bar input, .runtime-bar select, .credential-bar input { width: 100%; box-sizing: border-box; }.workflow-shell { display: block; }.node-library, .config-panel { margin-bottom: 14px; }.canvas-panel { overflow-x: auto; } }
.canvas-bottom-bar { position: fixed !important; right: 18px !important; bottom: 18px !important; left: 18px !important; z-index: 10 !important; }
</style>
<style>
.x6-workflow-node {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  height: 100%;
  padding: 10px 16px;
  box-sizing: border-box;
  color: #314238;
  background: #fff;
  border: 1px solid #d9e5db;
  border-left: 4px solid #9ab7a0;
  border-radius: 12px;
  box-shadow: 0 8px 18px #36543b12;
  cursor: pointer;
  font-family: ui-sans-serif, system-ui, sans-serif;
  user-select: none;
}
.x6-workflow-node:hover,
.x6-node-selected .x6-workflow-node {
  border-color: #3b8a5c;
  box-shadow: 0 0 0 3px #9ad1aa55, 0 8px 18px #36543b18;
}
.x6-workflow-node-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
}
.x6-workflow-node-icon {
  display: inline-grid;
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  place-items: center;
  color: #326d9a;
  background: #e3f0f8;
  border-radius: 9px;
  font-size: 15px;
}
.x6-workflow-node-copy {
  min-width: 0;
  flex: 1;
}
.x6-workflow-node-copy strong,
.x6-workflow-node-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.x6-workflow-node-copy strong { color: #314238; font-size: 13px; font-weight: 700; }
.x6-workflow-node-copy small { margin-top: 3px; color: #8b988e; font-size: 11px; }
.x6-workflow-node-delete {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  padding: 0;
  color: #b1bbb3;
  background: transparent;
  border: 0;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
}
.x6-workflow-node-delete:hover { color: #a54b48; background: #fff1ef; }
.x6-workflow-node-detail {
  display: grid;
  gap: 6px;
  margin: 4px -6px -2px;
  padding: 8px 8px 0;
  border-top: 1px solid #edf1ed;
}
.x6-workflow-node-detail-row {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  min-height: 20px;
  color: #7c897f;
  font-size: 10px;
}
.x6-workflow-node-detail-row strong,
.x6-workflow-node-detail-row small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.x6-workflow-node-detail-row strong { color: #53645a; font-size: 11px; font-weight: 600; }
.x6-workflow-node-detail-row small { color: #7c897f; }
.x6-workflow-node.tone-green { border-left-color: #65a879; }
.x6-workflow-node.tone-amber { border-left-color: #d4a348; }
.x6-workflow-node.tone-red { border-left-color: #c77772; }
.x6-workflow-node.tone-purple { border-left-color: #947bb9; }
.x6-workflow-node.tone-blue { border-left-color: #6e9fbe; }
.x6-port-body { fill: #fff; stroke: #4c89a8; stroke-width: 1.8; }
.x6-port-body[data-port-group="out"] { stroke: #4b9566; }
.x6-edge path { transition: stroke .15s ease, stroke-width .15s ease; }
.x6-edge:hover path { stroke: #4c8f65; stroke-width: 2; }
</style>
