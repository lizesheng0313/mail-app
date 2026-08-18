<template>
  <div class="browser-workflow-page">
    <BrowserRuntimeDialog
      :visible="browserRuntimeDialogVisible"
      :phase="browserRuntimeDialogPhase"
      :title="browserRuntimeDialogCopy.title"
      :description="browserRuntimeDialogCopy.description"
      :error-message="browserRuntimeDialogCopy.errorMessage"
      :downloading-title="browserRuntimeDialogCopy.downloadingTitle"
      :confirm-text="browserRuntimeDialogCopy.confirmText"
      :retry-text="browserRuntimeDialogCopy.retryText"
      :cancel-text="browserRuntimeDialogCopy.cancelText"
      :progress="browserRuntimeProgress.downloaded"
      :progress-total="browserRuntimeProgress.total"
      :progress-message="browserRuntimeProgress.message"
      @confirm="confirmBrowserRuntimeDialog"
      @cancel="cancelBrowserRuntimeDialog"
    />
    <OAuth2AuthModal
      :visible="oauthMailboxVisible"
      :pending-accounts="oauthMailboxAccounts"
      @close="oauthMailboxVisible = false"
      @complete="finishOAuthMailboxAuthorization"
    />
    <Transition name="workflow-starting">
      <div v-if="runStarting && !browserRuntimeDialogVisible" class="workflow-starting-toast" role="status" aria-live="polite">
        <span class="workflow-starting-spinner" aria-hidden="true" />
        <div>
          <strong>正在启动浏览器</strong>
          <small>{{ runStartingMessage }}</small>
        </div>
      </div>
    </Transition>
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
        <div class="browser-runtime-actions"><button class="secondary-button" :disabled="runStarting" @click="runInputVisible = false">取消</button><button class="primary-button" :disabled="runStarting" @click="executeRunDocument"><span v-if="runStarting" class="button-loading-spinner" aria-hidden="true" />{{ runStarting ? '正在启动…' : '开始试运行' }}</button></div>
      </div>
    </div>
    <div v-if="materialsVisible" class="browser-runtime-dialog" @click.self="materialsVisible = false">
      <div class="browser-runtime-card materials-card">
        <header class="materials-heading">
          <div><strong>全局素材库</strong><span>文本和图片素材可在当前桌面端的所有工作流中复用。</span></div>
          <button type="button" @click="materialsVisible = false">×</button>
        </header>
        <div class="materials-tabs">
          <button :class="{ active: materialTab === 'text' }" @click="materialTab = 'text'">文本素材</button>
          <button :class="{ active: materialTab === 'image' }" @click="materialTab = 'image'">图片素材</button>
        </div>
        <template v-if="materialTab === 'text'">
          <div class="materials-toolbar">
            <span>保存常用话术，填写内容节点可以直接选择。</span>
            <button class="primary-button" type="button" @click="startNewTextMaterial">＋ 新建文本</button>
          </div>
          <div class="materials-layout">
            <div class="material-list">
              <button
                v-for="item in textMaterials"
                :key="item.id"
                type="button"
                class="material-list-item"
                :class="{ selected: textMaterialDraft.id === item.id }"
                @click="editTextMaterial(item)"
              >
                <strong>{{ item.name }}</strong>
                <small>{{ item.content || '暂无内容' }}</small>
              </button>
              <div v-if="!textMaterials.length" class="material-empty">还没有文本素材</div>
            </div>
            <div class="material-editor">
              <label>素材名称<input v-model.trim="textMaterialDraft.name" placeholder="例如：首次联系话术" /></label>
              <label>文本内容<textarea v-model="textMaterialDraft.content" rows="10" placeholder="输入需要在对方网站填写的内容" /></label>
              <div class="material-editor-actions">
                <button v-if="textMaterialDraft.id" class="danger-button" type="button" @click="removeTextMaterial(textMaterialDraft.id)">删除</button>
                <button class="primary-button" type="button" @click="saveTextMaterial">保存文本</button>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="materials-toolbar">
            <span>图片保存在当前桌面端的全局素材目录，工作流只引用素材编号。</span>
            <button class="primary-button" type="button" :disabled="imageMaterialBusy" @click="addImageMaterial">{{ imageMaterialBusy ? '正在添加…' : '＋ 添加图片' }}</button>
          </div>
          <div class="image-material-grid">
            <article v-for="item in imageMaterials" :key="item.id" class="image-material-card">
              <div class="image-material-preview">
                <img v-if="imageMaterialPreviews[item.id]" :src="imageMaterialPreviews[item.id]" :alt="item.name" />
                <span v-else>本地图片</span>
              </div>
              <div class="image-material-copy"><strong>{{ item.name }}</strong><small>{{ formatMaterialSize(item.size) }}</small></div>
              <button type="button" title="删除图片素材" @click="removeImageMaterial(item)">×</button>
            </article>
            <div v-if="!imageMaterials.length" class="material-empty image-material-empty">还没有图片素材</div>
          </div>
        </template>
      </div>
    </div>
    <div v-if="pluginCenterVisible" class="browser-runtime-dialog plugin-center-dialog" @click.self="pluginCenterVisible = false">
      <div class="browser-runtime-card workflow-plugin-modal" @click.stop>
        <header class="workflow-plugin-modal-heading">
          <div>
            <strong>浏览器插件</strong>
            <small>插件节点会插入画布中的现有流程，不会单独漂浮。</small>
          </div>
          <button type="button" @click="pluginCenterVisible = false">×</button>
        </header>
        <div class="workflow-plugin-context">
          <span v-if="selectedNode">当前插入位置：<strong>{{ selectedNode.title || selectedNode.id }}</strong> 之后</span>
          <span v-else>请先选中一个节点，插件会插入到它后面；未选中时会放到画布空闲位置。</span>
        </div>
        <button type="button" class="workflow-plugin-builtin" @click="addBuiltinSliderPlugin">
          <span class="node-icon tone-amber">✦</span>
          <span class="workflow-plugin-copy">
            <span><strong>自动滑块</strong><em>内置</em></span>
            <small>按录制轨迹自动完成滑块拖动</small>
          </span>
          <b>{{ selectedNode ? '插入后面' : '添加节点' }}</b>
        </button>
        <div v-for="group in pluginMenuGroups" :key="group.key" v-show="group.plugins.length" class="workflow-plugin-group">
          <div class="workflow-plugin-group-heading"><strong>{{ group.title }}</strong><small>{{ group.description }}</small></div>
          <div v-for="plugin in group.plugins" :key="plugin.plugin_id" class="workflow-plugin-card">
            <span class="node-icon tone-amber">✦</span>
            <div class="workflow-plugin-card-main">
              <div><strong>{{ plugin.name }}</strong><span :class="plugin.enabled ? 'plugin-enabled' : 'plugin-disabled'">{{ plugin.enabled ? '已启用' : (plugin.installed ? '已停用' : '未安装') }}</span></div>
              <small>{{ plugin.vendor }} · {{ plugin.version }}</small>
              <small>{{ (plugin.capabilities || []).map(item => item.title).join('、') || '未声明节点能力' }}</small>
              <div v-if="(plugin.permissions || []).length" class="workflow-plugin-permissions"><code v-for="permission in plugin.permissions" :key="permission">{{ permission }}</code></div>
              <div v-if="plugin.enabled && (plugin.capabilities || []).length" class="workflow-plugin-capabilities">
                <button v-for="capability in plugin.capabilities" :key="capability.node_kind" type="button" @click="addPluginCapability(capability)">＋ {{ selectedNode ? '插入' : '添加' }} {{ capability.title }}</button>
              </div>
            </div>
            <div class="workflow-plugin-actions">
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
          </div>
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
            <button v-if="executionId || hasPendingRecordingReview" class="canvas-action" :class="{ 'status-action-active': executionPanelVisible || hasPendingRecordingReview, 'recording-review-pending-action': hasPendingRecordingReview }" @click.stop="toggleExecutionPanel">
              {{ hasPendingRecordingReview ? '录制结果待确认' : '执行状态' }}
            </button>
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
            </div>
            <button class="canvas-action" :disabled="document.nodes.length < 2" @click.stop="autoLayout">✦ 整理</button>
            <button class="canvas-action" :disabled="!history.length" @click.stop="undo">↶</button>
            <button class="canvas-action" :disabled="!future.length" @click.stop="redo">↷</button>
            <div class="canvas-primary-actions">
              <button class="canvas-action recording-action" :disabled="browserRuntimeBusy" @click.stop="openBrowserAssistant">
                {{ browserRuntimeBusy ? '正在打开…' : '浏览器助手' }}
              </button>
              <button class="canvas-action trial-action" :disabled="runStarting" @click.stop="runDocument">试运行</button>
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
              <div v-if="selectedNode.kind === 'input'" class="material-node-box">
                <div class="config-caption">填写内容</div>
                <CustomSelect
                  size="sm"
                  :model-value="selectedNode.config.content_source || 'fixed'"
                  :options="contentSourceOptions"
                  @update:model-value="updateInputContentSource"
                />
                <textarea v-if="selectedNode.config.content_source === 'fixed'" v-model="selectedNode.config.value" rows="4" placeholder="输入固定内容" />
                <CustomSelect
                  v-else-if="selectedNode.config.content_source === 'material'"
                  size="sm"
                  :model-value="selectedNode.config.material_id"
                  :options="textMaterialOptions"
                  placeholder="选择文本素材"
                  @update:model-value="selectedNode.config.material_id = $event"
                />
                <div v-else class="local-source-summary">
                  <strong>{{ selectedNode.config.local_source?.name || '尚未绑定本地数据源' }}</strong>
                  <small>{{ selectedNode.config.local_source?.mode === 'random' ? '随机取值' : '顺序取值' }}；文件内容只保存在浏览器组件中</small>
                </div>
                <button v-if="selectedNode.config.content_source === 'material'" type="button" class="secondary-button full" @click="openMaterials('text')">管理文本素材</button>
              </div>
              <div v-if="selectedNode.kind === 'upload_file'" class="material-node-box">
                <div class="config-caption">上传到当前网站的图片</div>
                <div class="local-source-summary">
                  <strong>{{ selectedNode.config.local_source?.name || '尚未绑定本地图片库' }}</strong>
                  <small>{{ selectedNode.config.local_source?.mode === 'random' ? '随机取图' : '顺序取图' }}</small>
                </div>
                <small>图片文件夹只保存在浏览器组件中，不会上传到肥猫猫服务器。</small>
              </div>
              <label v-for="field in (getNodeDefinition(selectedNode.kind).fields || [])" v-show="isNodeFieldVisible(field)" :key="field.key">{{ field.label }}<CustomSelect v-if="field.type === 'select'" class="node-field-select" size="sm" :model-value="selectedNode.config[field.key]" :options="field.options || []" @update:model-value="updateNodeSelectField(field, $event)" /><textarea v-else-if="field.type === 'textarea'" v-model="selectedNode.config[field.key]" rows="3" :placeholder="field.placeholder" /><input v-else-if="field.type !== 'checkbox'" v-model="selectedNode.config[field.key]" :type="field.type || 'text'" :placeholder="field.placeholder" /><input v-else v-model="selectedNode.config[field.key]" type="checkbox" /></label>
              <button v-if="selectedNode.kind === 'read_email_code'" type="button" class="secondary-button full" @click="authorizeVerificationMailbox">
                授权这个邮箱
              </button>
              <div v-if="selectedNode.kind === 'credential_input'" class="credential-node-box"><div class="config-caption">保存当前凭据</div><input v-model="credentialForm.provider" placeholder="平台或服务名称" /><input v-model="credentialForm.username" autocomplete="username" placeholder="账号 / 邮箱" /><input v-model="credentialForm.password" autocomplete="current-password" type="password" placeholder="密码" /><button class="secondary-button full" @click="saveCredential">保存此凭据</button></div>
              <label>超时时间（秒）<input v-model.number="selectedNode.timeout_ms" type="number" min="1" /></label>
            </template>
          </aside>
        </div>
      </section>
    </main>

    <button v-if="hasPendingRecordingReview && !executionPanelVisible" type="button" class="recording-review-reminder" @click="openPendingRecordingReview">
      <span>录制结果待确认</span>
      <small>点击继续选择处理范围</small>
    </button>

    <section v-if="(executionId || hasPendingRecordingReview) && executionPanelVisible" class="execution-panel panel">
      <div class="panel-heading"><span>{{ hasPendingRecordingReview ? '录制结果待确认' : '执行状态' }}</span><div class="execution-heading-actions"><small v-if="executionId">{{ executionId }}</small><button type="button" title="关闭面板" aria-label="关闭面板" @click="closeExecutionPanel">×</button></div></div>
      <div class="execution-status" :class="`status-${executionStatus}`">{{ executionStatusLabel }}</div>
      <div v-if="recordingSessionActive" class="recording-state-hint">录制状态：{{ recordingStateLabel }}</div>
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
        <div v-if="['possible_list', 'list_item'].includes(stepScope?.kind) && recordingReviewStage === 'scope_choice'" class="scope-assistant">
          <div class="scope-options">
            <button @click="chooseRecordingScope('single')">只处理刚才这一项</button>
            <button @click="chooseRecordingScope('current_page')">处理当前列表的每一项</button>
            <button @click="chooseRecordingScope('all_pages')">处理当前列表及后续页面</button>
          </div>
        </div>
        <div v-else-if="recordingReviewStage === 'list_scope_ready'" class="scope-assistant scope-ready">
          <strong>已确认列表范围</strong>
          <span>系统已经找到这组列表项目，接下来请完整演示如何处理其中一项。</span>
          <small>当前录制内容：{{ describeRecordedFlow(listEntrySteps) }}</small>
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
        <div v-for="(step, index) in (recordingReviewStage === 'scope_choice' ? [] : stepAnalysis)" :key="`${step.selector}-${index}`" class="recording-review-item">
          <span>{{ step.kind === 'input' ? '输入' : (step.kind === 'upload_file' ? '图片' : (step.kind === 'drag_slider' ? '拖拽' : '点击')) }}</span>
          <strong>{{ describeRecordedStep(step, index) }}</strong>
        </div>
        <div v-if="recordingReviewStage !== 'scope_choice'" class="recording-review-actions">
          <button v-if="recordingReviewStage === 'list_scope_ready'" class="primary-button" @click="startListItemDemo">确认范围并演示一个项目</button>
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
import BrowserRuntimeDialog from '@/components/BrowserRuntimeDialog/index.vue'
import OAuth2AuthModal from '@/components/Mail/OAuth2AuthModal.vue'
import { resolveOAuthProviderByEmail } from '@/utils/externalMailboxRules'
import { showMessage } from '@/utils/message'
import { NODE_MENU_GROUPS, createWorkflowNode, getBuiltinPluginManifests, getNodeDefinition, getNodeMenuGroups, registerPluginNodeDefinitions } from './node-registry'
import { insertRecordedStepsIntoGraph } from './recording-graph'
import { applyBackendRecordingState, beginListItemDemonstration, completeListItemDemonstration, completePaginationDemonstration, describeListScope, describeRecordedFlow, describeRecordedStep, inferListScopeFromRecording, normalizeRecordingFinishedPayload, recordedStepTitle, resolveListScope } from './recording-interaction'
import { calculateWorkflowLayout, resolveWorkflowCollisions } from './workflow-layout'
import { createWorkflowGraph, disposeWorkflowGraph, readWorkflowPositions, sanitizeWorkflowGraphDocument, syncWorkflowGraph, syncWorkflowGraphSelection } from './x6-workflow-graph'
import { cancelBrowserWorkflowRuntimeDownload, disconnectBrowserWorkflowDesktopBridge, ensureBrowserWorkflowRuntime, listenBrowserWorkflowRuntimeProgress } from '@/services/browserWorkflowRuntime'
import {
  chooseBrowserWorkflowImageMaterial,
  deleteBrowserWorkflowImageMaterial,
  loadBrowserWorkflowImagePreview,
  resolveBrowserWorkflowImageMaterials,
} from '@/services/browserWorkflowMaterials'

const STORAGE_KEY = 'browser-workflow-draft'
const RECORDING_REVIEW_STORAGE_KEY = 'browser-workflow-pending-review'
const GLOBAL_MATERIALS_STORAGE_KEY = 'browser-workflow-global-materials-v1'
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
const materialsVisible = ref(false)
const materialTab = ref('text')
const textMaterialDraft = ref({ id: '', name: '', content: '' })
const imageMaterialBusy = ref(false)
const imageMaterialPreviews = ref({})
const executionPanelVisible = ref(false)
const executionStatus = ref('')
const executionEvents = ref([])
const activeNodeId = ref('')
const waitingNodeId = ref('')
const recordingSessionActive = ref(false)
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
const stepScope = ref(null)
const stepScopeSelection = ref('single')
const recordingReviewStage = ref('idle')
const recordingCaptureMode = ref('step')
const listEntrySteps = ref([])
const pendingListScope = ref(null)
const confirmedStepNodeIds = ref([])
const hasPendingRecordingReview = computed(() => Boolean(
  stepAnalysis.value?.length && !['idle', 'inserted'].includes(recordingReviewStage.value),
))
const recordingAnchorNodeId = ref('')
const runtimeOptions = { runtime: 'playwright', headless: true }
const desktopBrowserOptions = ref({})
const browserRuntimeBusy = ref(false)
const runStarting = ref(false)
const browserRuntimeProgress = ref({ stage: '', downloaded: 0, total: null, message: '' })
const browserRuntimeDialogVisible = ref(false)
const browserRuntimeDialogPhase = ref('confirm')
const browserRuntimeDialogRequest = ref(null)
const runStartingMessage = computed(() => browserRuntimeProgress.value.message || '正在连接肥猫猫浏览器，请稍候')
const browserRuntimeDialogCopy = computed(() => {
  const request = browserRuntimeDialogRequest.value || {}
  if (request.action === 'update') {
    return {
      title: '更新浏览器组件',
      description: `发现浏览器组件新版本（${request.currentVersion || '当前版本'} → ${request.latestVersion || '新版本'}），现在更新吗？`,
      downloadingTitle: '正在更新浏览器组件',
      confirmText: '立即更新',
      retryText: '重试更新',
      cancelText: '暂不更新',
      errorMessage: '',
    }
  }
  if (request.action === 'start') {
    return {
      title: '启动浏览器组件',
      description: '浏览器组件已经安装，但还没有启动。现在启动并继续本次工作流吗？',
      downloadingTitle: '正在启动浏览器组件',
      confirmText: '启动并继续',
      retryText: '重试启动',
      cancelText: '取消',
      errorMessage: '',
    }
  }
  if (request.action === 'retry') {
    return {
      title: '浏览器组件操作失败',
      description: '',
      downloadingTitle: '正在重试浏览器组件操作',
      confirmText: '重试',
      retryText: '重试',
      cancelText: '取消',
      errorMessage: request.errorMessage || '浏览器组件操作失败，请重试',
    }
  }
  return {
    title: '安装浏览器组件',
    description: '浏览器工作流需要安装独立浏览器组件，安装后才能录制和运行。现在安装吗？',
    downloadingTitle: '正在安装浏览器组件',
    confirmText: '立即安装',
    retryText: '重试安装',
    cancelText: '取消',
    errorMessage: '',
  }
})
const pluginCenterVisible = ref(false)
const pluginCatalog = ref(getBuiltinPluginManifests())
let stopBrowserRuntimeProgress = () => {}
let browserRuntimeApprovalResolver = null
const workflowList = ref([])
const credentialForm = ref({ provider: 'browser', username: '', password: '' })
const oauthMailboxVisible = ref(false)
const oauthMailboxAccounts = ref([])
const history = ref([])
const future = ref([])
const dragState = ref(null)
const panState = ref(null)
const linkPreview = ref({ x: 0, y: 0, visible: false })
const nodeWasDragged = ref(false)
let executionSocket
let executionSocketConnectVersion = 0
const insertedRecordingGroupKeys = new Set()

const nodeMenuGroups = ref(NODE_MENU_GROUPS)
const route = useRoute()
const router = useRouter()

const createDocument = () => ({
  schema_version: 'browser-workflow/1.0',
  workflow_id: `browser-${Date.now()}`,
  name: '未命名浏览器流程',
  description: '',
  version: '0.1.0',
  nodes: [],
  edges: [],
  variables: { __materials: { texts: [], images: [] } },
  permissions: {},
  metadata: { persisted: false },
})
const document = ref(loadDocument())
ensureMaterialStore(document.value)
const storedWorkflowId = ref(document.value.metadata?.persisted ? document.value.workflow_id : '')
const selectedNode = computed(() => document.value.nodes.find(node => node.id === selectedNodeId.value) || null)
const connectedEdgeIds = computed(() => {
  const nodeId = selectedNodeId.value || hoveredNodeId.value
  if (!nodeId || selectedEdgeId.value) return new Set()
  return new Set(document.value.edges
    .filter(edge => edge.source === nodeId || edge.target === nodeId)
    .map(edge => edge.id))
})
const workflowInputDefinitions = computed(() => document.value.nodes.find(node => node.kind === 'start')?.outputs || [])
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
const workflowVariableOptions = computed(() => Object.keys(document.value.variables || {}).filter(name => name !== '__materials').map(name => ({
  value: name,
  label: `流程变量 / ${name}`,
})))
const textMaterials = computed(() => document.value.variables?.__materials?.texts || [])
const imageMaterials = computed(() => document.value.variables?.__materials?.images || [])
const textMaterialOptions = computed(() => textMaterials.value.map(item => ({ value: item.id, label: item.name })))
const imageMaterialOptions = computed(() => imageMaterials.value.map(item => ({ value: item.id, label: item.name })))
const contentSourceOptions = [
  { value: 'fixed', label: '固定内容' },
  { value: 'local_source', label: '本地数据源' },
]
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
function normalizeMaterialStore(value) {
  const store = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    texts: Array.isArray(store.texts) ? store.texts.filter(item => item && typeof item === 'object' && item.id) : [],
    images: Array.isArray(store.images) ? store.images.filter(item => item && typeof item === 'object' && item.id) : [],
  }
}
function readGlobalMaterialStore() {
  try {
    return normalizeMaterialStore(JSON.parse(localStorage.getItem(GLOBAL_MATERIALS_STORAGE_KEY) || 'null'))
  } catch {
    return { texts: [], images: [] }
  }
}
function writeGlobalMaterialStore(store) {
  const normalized = normalizeMaterialStore(store)
  localStorage.setItem(GLOBAL_MATERIALS_STORAGE_KEY, JSON.stringify({
    texts: normalized.texts,
    images: normalized.images.filter(item => item.scope === 'global'),
  }))
}
function mergeMaterialItems(...lists) {
  const seen = new Set()
  return lists.flat().filter((item) => {
    const id = String(item?.id || '')
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}
function ensureMaterialStore(targetDocument = document.value) {
  if (!targetDocument.variables || typeof targetDocument.variables !== 'object' || Array.isArray(targetDocument.variables)) {
    targetDocument.variables = {}
  }
  const localStore = normalizeMaterialStore(targetDocument.variables.__materials)
  const globalStore = readGlobalMaterialStore()
  const globalTexts = mergeMaterialItems(globalStore.texts, localStore.texts)
  const globalImages = mergeMaterialItems(
    globalStore.images.filter(item => item.scope === 'global'),
    localStore.images.filter(item => item.scope === 'global'),
  )
  const localImages = localStore.images.filter(item => item.scope !== 'global')
  writeGlobalMaterialStore({ texts: globalTexts, images: globalImages })
  targetDocument.variables.__materials = {
    texts: globalTexts,
    images: mergeMaterialItems(globalImages, localImages),
  }
  const store = targetDocument.variables.__materials
  return store
}
function persistMaterialChange() {
  const store = normalizeMaterialStore(document.value.variables?.__materials)
  writeGlobalMaterialStore({ texts: store.texts, images: store.images })
  markPersisted(false)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(document.value))
}
function materialId(prefix) {
  const randomPart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${randomPart}`
}
async function openMaterials(tab = '') {
  ensureMaterialStore()
  if (tab === 'text' || tab === 'image') materialTab.value = tab
  materialsVisible.value = true
  if (materialTab.value === 'text' && !textMaterialDraft.value.id && textMaterials.value.length) {
    editTextMaterial(textMaterials.value[0])
  }
  if (materialTab.value === 'image') await loadImageMaterialPreviews()
}
function startNewTextMaterial() {
  textMaterialDraft.value = { id: '', name: '', content: '' }
}
function editTextMaterial(item) {
  textMaterialDraft.value = { id: item.id, name: item.name || '', content: item.content || '' }
}
function saveTextMaterial() {
  const name = String(textMaterialDraft.value.name || '').trim()
  const content = String(textMaterialDraft.value.content || '')
  if (!name) {
    showMessage('请填写素材名称', 'warning')
    return
  }
  if (!content.trim()) {
    showMessage('请填写文本内容', 'warning')
    return
  }
  const store = ensureMaterialStore()
  const id = textMaterialDraft.value.id || materialId('text')
  const nextItem = { id, name, content }
  const index = store.texts.findIndex(item => item.id === id)
  if (index >= 0) store.texts.splice(index, 1, nextItem)
  else store.texts.push(nextItem)
  textMaterialDraft.value = { ...nextItem }
  persistMaterialChange()
  showMessage('文本素材已保存', 'success')
}
function removeTextMaterial(materialIdValue) {
  const usedNodes = document.value.nodes.filter(node => node.kind === 'input' && node.config?.material_id === materialIdValue)
  if (usedNodes.length && !window.confirm(`有 ${usedNodes.length} 个填写内容节点正在使用这条素材，删除后这些节点需要重新选择。确定删除吗？`)) return
  const store = ensureMaterialStore()
  store.texts = store.texts.filter(item => item.id !== materialIdValue)
  usedNodes.forEach(node => {
    node.config.material_id = ''
    node.config.content_source = 'fixed'
  })
  startNewTextMaterial()
  persistMaterialChange()
  showMessage('文本素材已删除', 'success')
}
async function addImageMaterial() {
  if (imageMaterialBusy.value) return
  imageMaterialBusy.value = true
  try {
    const result = await chooseBrowserWorkflowImageMaterial()
    if (!result) return
    const item = {
      id: result.materialId,
      name: result.name,
      fileName: result.fileName,
      mimeType: result.mimeType,
      size: result.size,
      scope: 'global',
    }
    ensureMaterialStore().images.push(item)
    if (result.previewDataUrl) imageMaterialPreviews.value[item.id] = result.previewDataUrl
    persistMaterialChange()
    showMessage('图片素材已添加', 'success')
  } catch (error) {
    showMessage(error?.message || String(error) || '添加图片素材失败', 'error')
  } finally {
    imageMaterialBusy.value = false
  }
}
async function removeImageMaterial(item) {
  const usedNodes = document.value.nodes.filter(node => node.kind === 'upload_file' && node.config?.material_id === item.id)
  if (usedNodes.length && !window.confirm(`有 ${usedNodes.length} 个上传图片节点正在使用这张图片，删除后这些节点需要重新选择。确定删除吗？`)) return
  try {
    await deleteBrowserWorkflowImageMaterial(document.value.workflow_id, item.fileName, item.scope || 'workflow')
    const store = ensureMaterialStore()
    store.images = store.images.filter(image => image.id !== item.id)
    usedNodes.forEach(node => { node.config.material_id = '' })
    delete imageMaterialPreviews.value[item.id]
    persistMaterialChange()
    showMessage('图片素材已删除', 'success')
  } catch (error) {
    showMessage(error?.message || String(error) || '删除图片素材失败', 'error')
  }
}
async function loadImageMaterialPreviews() {
  await Promise.all(imageMaterials.value.map(async (item) => {
    if (imageMaterialPreviews.value[item.id]) return
    try {
      imageMaterialPreviews.value[item.id] = await loadBrowserWorkflowImagePreview(
        document.value.workflow_id,
        item.fileName,
        item.scope || 'workflow',
      )
    } catch {
      imageMaterialPreviews.value[item.id] = ''
    }
  }))
}
function formatMaterialSize(size) {
  const bytes = Number(size || 0)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
async function resolveLocalMaterialPaths() {
  const referencedIds = new Set(document.value.nodes
    .filter(node => node.kind === 'upload_file' && node.config?.material_id)
    .map(node => node.config.material_id))
  if (!referencedIds.size) return {}
  const images = imageMaterials.value.filter(item => referencedIds.has(item.id))
  if (images.length !== referencedIds.size) throw new Error('上传图片节点选择的素材已经不存在，请重新选择')
  try {
    return await resolveBrowserWorkflowImageMaterials(document.value.workflow_id, images)
  } catch (error) {
    throw new Error(error?.message || String(error) || '读取本地图片素材失败')
  }
}
async function loadWorkflowList() {
  try {
    const response = await browserWorkflowApi.list({ suppressErrorMessage: true })
    if (response?.code === 0) {
      workflowList.value = response.data || []
      if (workflowList.value.some(item => item.workflow_id === document.value.workflow_id)) {
        storedWorkflowId.value = document.value.workflow_id
      }
    }
  } catch {
    workflowList.value = []
  }
}
async function loadInstalledPluginNodes() {
  try {
    const response = await browserWorkflowApi.plugins({ suppressErrorMessage: true })
    if (response?.code !== 0 || !Array.isArray(response.data)) return
    const catalog = new Map(getBuiltinPluginManifests().map(plugin => [plugin.plugin_id, plugin]))
    response.data.filter(plugin => plugin?.plugin_id).forEach(plugin => {
      const fallback = catalog.get(plugin.plugin_id)
      catalog.set(plugin.plugin_id, {
        ...(fallback || {}),
        ...plugin,
        capabilities: Array.isArray(plugin.capabilities) && plugin.capabilities.length
          ? plugin.capabilities
          : (fallback?.capabilities || []),
      })
    })
    pluginCatalog.value = [...catalog.values()]
    registerPluginNodeDefinitions(pluginCatalog.value)
    nodeMenuGroups.value = getNodeMenuGroups()
  } catch {
    pluginCatalog.value = getBuiltinPluginManifests()
    registerPluginNodeDefinitions(pluginCatalog.value)
    nodeMenuGroups.value = getNodeMenuGroups()
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
  imageMaterialPreviews.value = {}
  startNewTextMaterial()
  storedWorkflowId.value = response.data.workflow_id || document.value.workflow_id
  markPersisted(true)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(document.value))
  selectedNodeId.value = ''
  linkingFrom.value = ''
  restorePendingRecordingReview()
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
function authorizeVerificationMailbox() {
  const email = String(selectedNode.value?.config?.mailbox_email || '').trim()
  if (!email || !email.includes('@')) {
    showMessage('先填写收验证码的邮箱地址', 'warning')
    return
  }
  const provider = resolveOAuthProviderByEmail(email)
  if (!provider) {
    showMessage('这个邮箱暂不支持网页授权，请先在首页添加邮箱', 'warning')
    return
  }
  oauthMailboxAccounts.value = [{ email, provider }]
  oauthMailboxVisible.value = true
}
function finishOAuthMailboxAuthorization(result) {
  oauthMailboxVisible.value = false
  if (Number(result?.successCount || 0) > 0) {
    showMessage('邮箱授权成功，验证码节点可以使用了', 'success')
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
    if (node.kind === 'input' && node.config?.content_source === 'material') {
      const materialExists = textMaterials.value.some(item => item.id === node.config?.material_id)
      if (!materialExists) failures.push({ node, message: '还没有选择文本素材' })
    }
    if (node.kind === 'input' && node.config?.content_source === 'local_source' && !String(node.config?.local_source?.name || '').trim()) {
      failures.push({ node, message: '还没有绑定本地数据源' })
    }
    if (node.kind === 'upload_file') {
      if (!String(node.config?.selector || '').trim()) failures.push({ node, message: '还没有识别到上传按钮' })
      if (node.config?.content_source === 'local_source') {
        if (!String(node.config?.local_source?.name || '').trim()) failures.push({ node, message: '还没有绑定本地图片库' })
      } else {
        const materialExists = imageMaterials.value.some(item => item.id === node.config?.material_id)
        if (!materialExists) failures.push({ node, message: '还没有选择要上传的图片素材' })
      }
    }
    if (node.kind === 'read_email_code' && !String(node.config?.mailbox_email || '').trim()) {
      failures.push({ node, message: '还没有填写收验证码的邮箱' })
    }
    if (node.kind === 'fill_verification_code') {
      const codeInput = (node.inputs || []).find(item => item.name === 'code')
      if (!codeInput || codeInput.source !== 'node' || !String(codeInput.variable || '').trim()) {
        failures.push({ node, message: '还没有连接“读取邮箱验证码”的输出' })
      }
    }
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
  showMessage(`节点「${first.node.title}」${first.message}`, 'error')
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
  if (node?.kind === 'loop') return { width: 360, height: 164 }
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
function updateInputContentSource(source) {
  if (!selectedNode.value || selectedNode.value.kind !== 'input') return
  selectedNode.value.config.content_source = source
  if (source !== 'material') selectedNode.value.config.material_id = ''
  if (source === 'local_source' && !selectedNode.value.config.local_source) {
    selectedNode.value.config.local_source = { name: '', kind: 'data', mode: 'sequential', field: '' }
  }
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
function serverDocument() {
  const payload = snapshot()
  if (payload.variables && typeof payload.variables === 'object') delete payload.variables.__materials
  return payload
}
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
  ensureMaterialStore(targetDocument)
  let genericRecordedStepIndex = 0
  for (const node of targetDocument?.nodes || []) {
    if (!Array.isArray(node.inputs)) node.inputs = []
    if (!Array.isArray(node.outputs)) node.outputs = []
    if (!node.config || typeof node.config !== 'object') node.config = {}
    if (node.kind === 'input') {
      if (!['fixed', 'material', 'local_source'].includes(node.config.content_source)) node.config.content_source = 'fixed'
      if (typeof node.config.material_id !== 'string') node.config.material_id = ''
      if (!node.config.local_source || typeof node.config.local_source !== 'object') node.config.local_source = { name: '', kind: 'data', mode: 'sequential', field: '' }
    }
    if (node.kind === 'upload_file') {
      if (typeof node.config.material_id !== 'string') node.config.material_id = ''
      if (!node.config.local_source || typeof node.config.local_source !== 'object') node.config.local_source = { name: '', kind: 'images', mode: 'sequential' }
    }
    if (['click', 'input', 'upload_file'].includes(node.kind) && !['fail', 'skip'].includes(node.config.missing_element_action)) {
      node.config.missing_element_action = 'fail'
    }
    const recordedTitle = String(node.title || '').trim()
    const recordedDescription = String(node.description || '').trim()
    const needsRecordedCopyCleanup = ['当前步骤', '当前项目', '录制步骤'].includes(recordedTitle)
      || recordedTitle.length > 10
      || recordedDescription.length > 18
      || /用户|另一个|另外一个|第[一二三四五六七八九十\d]+个|搜索结果列表|录制|DOM|定位器/i.test(`${recordedTitle} ${recordedDescription}`)
    if (String(node.id || '').startsWith('recorded') && ['click', 'input', 'upload_file', 'drag_slider'].includes(node.kind) && needsRecordedCopyCleanup) {
      const recordedStep = { kind: node.kind, title: node.title, reason: node.description }
      const title = recordedStepTitle(recordedStep, genericRecordedStepIndex)
      genericRecordedStepIndex += 1
      node.title = node.kind === 'click' && title === '点击按钮' ? `${title} ${genericRecordedStepIndex}` : title
      node.description = describeRecordedStep(recordedStep, genericRecordedStepIndex - 1)
    }
    if (String(node.id || '').startsWith('recorded-list-loop') && /循环处理/.test(recordedTitle)) {
      node.title = /所有页面|全部/.test(String(node.title || '')) ? '遍历全部列表' : '遍历当前列表'
      node.description = '逐项执行循环内操作'
    }
    if (String(node.id || '').startsWith('recorded-list-extract') && /提取当前列表/.test(recordedTitle)) {
      node.title = '获取列表项目'
      node.description = '读取当前页面的列表内容'
    }
    if (String(node.id || '').startsWith('recorded-return-list') && /返回刚才的列表页/.test(recordedTitle)) {
      node.title = '返回列表'
      node.description = '继续处理下一项'
    }
    const x = Number(node.position?.x)
    const y = Number(node.position?.y)
    node.position = Number.isFinite(x) && Number.isFinite(y)
      ? { x, y }
      : { x: 120, y: 100 }
  }
  for (const edge of targetDocument?.edges || []) {
    if (edge.routing !== 'manual') delete edge.vertices
  }
  const sanitizedGraph = sanitizeWorkflowGraphDocument(targetDocument)
  if (sanitizedGraph.edges.length !== (targetDocument.edges || []).length) {
    targetDocument.edges = sanitizedGraph.edges
  }
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
function insertNodeAfter(source, node) {
  const outgoing = document.value.edges.filter(edge => edge.source === source.id)
  const branching = ['condition', 'loop', 'pagination'].includes(source.kind)
  if (source.kind === 'end') return { connected: false, reason: '结束节点没有后续出口，不能在它后面自动插入。' }
  if (branching && outgoing.length !== 1) {
    return {
      connected: false,
      reason: outgoing.length ? '当前节点有多个分支出口，请从具体出口拖线插入。' : '当前分支节点还没有出口，请先连接一个分支。',
    }
  }
  if (!branching && outgoing.length > 1) {
    return { connected: false, reason: '当前节点存在多个出口，请先整理连接后再插入。' }
  }

  const existing = outgoing[0]
  const branchMeta = existing
    ? {
        ...(existing.label ? { label: existing.label } : {}),
        ...(existing.condition ? { condition: JSON.parse(JSON.stringify(existing.condition)) } : {}),
      }
    : {}
  if (existing) {
    existing.source = node.id
    delete existing.label
    delete existing.condition
  }
  document.value.edges.push({
    id: 'edge-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8),
    source: source.id,
    target: node.id,
    ...branchMeta,
  })
  return { connected: true, branch: branchMeta.label || '' }
}
function addNode(kind, position = null, options = {}) {
  const source = options.connectFrom ? nodeById(options.connectFrom) : null
  if (source) {
    const outgoing = document.value.edges.filter(edge => edge.source === source.id)
    const branching = ['condition', 'loop', 'pagination'].includes(source.kind)
    if (source.kind === 'end') {
      showMessage('结束节点没有后续出口，不能在它后面插入插件。', 'warning')
      return null
    }
    if ((branching && outgoing.length !== 1) || (!branching && outgoing.length > 1)) {
      showMessage(
        branching
          ? (outgoing.length ? '当前节点有多个分支，请从具体出口拖线插入。' : '当前分支节点还没有出口，请先连接分支。')
          : '当前节点存在多个出口，请先整理连接后再插入。',
        'warning',
      )
      return null
    }
  }
  recordHistory()
  const preferred = position || (source
    ? { x: source.position.x + nodeSize.width + nodeSpacing.x, y: source.position.y }
    : { x: 120 + document.value.nodes.length * 24, y: 100 + document.value.nodes.length * 24 })
  const nextPosition = findFreePosition(preferred)
  const node = newNode(kind, nextPosition.x, nextPosition.y)
  document.value.nodes.push(node)
  if (source) insertNodeAfter(source, node)
  markPersisted(false)
  selectedNodeId.value = node.id
  syncWorkflowGraphFromDocument()
  nextTick(() => canvasRef.value?.scrollTo({ left: Math.max(0, node.position.x - 100), top: Math.max(0, node.position.y - 100), behavior: 'smooth' }))
  return node
}
function addNodeFromMenu(kind) {
  const sourceNodeId = selectedNodeId.value
  const node = addNode(kind, null, { connectFrom: sourceNodeId })
  if (!node) return
  if (kind === 'fill_verification_code') {
    const reader = sourceNodeId ? nodeById(sourceNodeId) : null
    const codeInput = (node.inputs || []).find(item => item.name === 'code')
    if (reader?.kind === 'read_email_code' && codeInput) {
      codeInput.source = 'node'
      codeInput.variable = `${reader.id}.code`
    }
  }
  showNodeMenu.value = false
}
function addPluginCapability(capability) {
  if (!capability?.node_kind) return
  const sourceTitle = selectedNode.value?.title || ''
  const node = addNode(capability.node_kind, null, { connectFrom: selectedNodeId.value })
  if (!node) return
  pluginCenterVisible.value = false
  showMessage(
    sourceTitle
      ? '已将“' + node.title + '”插入“' + sourceTitle + '”之后，并已选中该节点'
      : '已添加“' + node.title + '”并已选中该节点',
    'success',
  )
}
function addBuiltinSliderPlugin() {
  addPluginCapability({ node_kind: 'drag_slider' })
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
    : document.value.edges.some(edge => edge.source === sourceId)
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
  syncDocumentPositionsFromGraph()
  if (!validateEditorDocument()) return false
  localStorage.setItem(STORAGE_KEY, JSON.stringify(document.value))
  try {
    if (storedWorkflowId.value === document.value.workflow_id) {
      const response = await browserWorkflowApi.saveDraft(document.value.workflow_id, serverDocument(), { suppressErrorMessage: 'silent' })
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
      const response = await browserWorkflowApi.create(serverDocument(), { suppressErrorMessage: 'silent' })
      if (response?.code === 0) {
        storedWorkflowId.value = response.data?.workflow_id || document.value.workflow_id
        markPersisted(true)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(document.value))
        showMessage(response.message || '浏览器工作流创建成功', 'success')
        await loadWorkflowList()
        if (route.params.workflowId === 'new') {
          await router.replace({ name: route.name, params: { ...route.params, workflowId: storedWorkflowId.value }, query: route.query })
        }
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
function requestBrowserRuntimeApproval(request) {
  browserRuntimeDialogRequest.value = request || { action: 'install' }
  browserRuntimeDialogPhase.value = request?.action === 'retry' ? 'error' : 'confirm'
  browserRuntimeDialogVisible.value = true
  return new Promise((resolve) => {
    browserRuntimeApprovalResolver?.(false)
    browserRuntimeApprovalResolver = resolve
  })
}
function resolveBrowserRuntimeApproval(approved) {
  const resolve = browserRuntimeApprovalResolver
  browserRuntimeApprovalResolver = null
  if (!approved) browserRuntimeDialogVisible.value = false
  resolve?.(approved)
}
function confirmBrowserRuntimeDialog() {
  const request = browserRuntimeDialogRequest.value || {}
  browserRuntimeProgress.value = {
    stage: request.action === 'start' ? 'starting' : 'downloading',
    downloaded: 0,
    total: null,
    message: request.action === 'start' ? '正在启动浏览器组件' : '正在准备浏览器组件',
  }
  browserRuntimeDialogPhase.value = 'downloading'
  resolveBrowserRuntimeApproval(true)
}
async function cancelBrowserRuntimeDialog() {
  if (browserRuntimeDialogPhase.value === 'downloading') {
    await cancelBrowserRuntime()
    browserRuntimeDialogVisible.value = false
    return
  }
  resolveBrowserRuntimeApproval(false)
}
async function ensureBrowserRuntimeForAction() {
  if (browserRuntimeBusy.value) return false
  browserRuntimeBusy.value = true
  browserRuntimeDialogRequest.value = null
  browserRuntimeProgress.value = { stage: 'checking', downloaded: 0, total: null, message: '正在检查浏览器组件' }
  try {
    const result = await ensureBrowserWorkflowRuntime({
      onProgress: (payload) => { browserRuntimeProgress.value = payload },
      requestApproval: requestBrowserRuntimeApproval,
    })
    if (result.cancelled) {
      showMessage('已取消本次浏览器工作流，不影响邮箱功能', 'warning')
      return false
    }
    if (result.desktopRequired) {
      showMessage(result.message || '浏览器工作流只能在桌面端执行，请使用肥猫猫桌面端', 'warning')
      return false
    }
    desktopBrowserOptions.value = result.desktopOptions || {}
    return Boolean(result.ready)
  } catch (error) {
    showMessage(error?.message || String(error) || '浏览器组件未准备好', 'error')
    return false
  } finally {
    browserRuntimeBusy.value = false
    browserRuntimeDialogVisible.value = false
    browserRuntimeApprovalResolver = null
  }
}
async function cancelBrowserRuntime() {
  try { await cancelBrowserWorkflowRuntimeDownload() } catch { /* the current operation will report its own failure */ }
}
async function runDocument() {
  if (runStarting.value) return
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
  if (runStarting.value) return
  if (!validateEditorDocument()) return
  let variables
  try {
    variables = parsedRunInputs()
  } catch (error) {
    showMessage(error?.message || '运行参数格式不正确', 'warning')
    return
  }
  recordingSessionActive.value = false
  runStarting.value = true
  try {
    browserRuntimeProgress.value = { stage: 'checking', downloaded: 0, total: null, message: '正在检查浏览器组件' }
    if (!await ensureBrowserRuntimeForAction()) return
    browserRuntimeProgress.value = { stage: 'starting-workflow', downloaded: 0, total: null, message: '浏览器已连接，正在启动工作流' }
    const localMaterialPaths = await resolveLocalMaterialPaths()
    const options = {
      ...runtimeOptions,
      headless: false,
      keep_session_open: true,
      ...desktopBrowserOptions.value,
      local_material_paths: localMaterialPaths,
    }
    const response = await browserWorkflowApi.previewExecute(serverDocument(), { options, variables }, { suppressErrorMessage: 'silent' })
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
  } finally {
    runStarting.value = false
  }
}
function closeExecutionPanel() {
  executionPanelVisible.value = false
}
function openPendingRecordingReview() {
  executionPanelVisible.value = true
}
function toggleExecutionPanel() {
  executionPanelVisible.value = !executionPanelVisible.value
}
function persistPendingRecordingReview() {
  if (!hasPendingRecordingReview.value) {
    localStorage.removeItem(RECORDING_REVIEW_STORAGE_KEY)
    return
  }
  localStorage.setItem(RECORDING_REVIEW_STORAGE_KEY, JSON.stringify({
    workflowId: document.value.workflow_id,
    executionId: executionId.value,
    anchorNodeId: recordingAnchorNodeId.value,
    stepAnalysis: stepAnalysis.value,
    stepScope: stepScope.value,
    stepScopeSelection: stepScopeSelection.value,
    recordingReviewStage: recordingReviewStage.value,
    recordingCaptureMode: recordingCaptureMode.value,
    listEntrySteps: listEntrySteps.value,
    pendingListScope: pendingListScope.value,
    recordingStepCount: recordingStepCount.value,
    savedAt: Date.now(),
  }))
}
function restorePendingRecordingReview() {
  let saved = null
  try {
    saved = JSON.parse(localStorage.getItem(RECORDING_REVIEW_STORAGE_KEY) || 'null')
  } catch {
    localStorage.removeItem(RECORDING_REVIEW_STORAGE_KEY)
  }
  const valid = saved
    && saved.workflowId === document.value.workflow_id
    && Array.isArray(saved.stepAnalysis)
    && saved.stepAnalysis.length
    && !['idle', 'inserted'].includes(saved.recordingReviewStage)
  if (!valid) {
    stepAnalysis.value = null
    stepScope.value = null
    stepScopeSelection.value = 'single'
    recordingReviewStage.value = 'idle'
    recordingCaptureMode.value = 'step'
    listEntrySteps.value = []
    pendingListScope.value = null
    localStorage.removeItem(RECORDING_REVIEW_STORAGE_KEY)
    return false
  }
  executionId.value = saved.executionId || executionId.value
  recordingAnchorNodeId.value = saved.anchorNodeId || ''
  stepScope.value = saved.stepScope || { kind: 'single' }
  stepScopeSelection.value = saved.stepScopeSelection || 'single'
  recordingReviewStage.value = saved.recordingReviewStage
  recordingCaptureMode.value = saved.recordingCaptureMode || 'step'
  listEntrySteps.value = Array.isArray(saved.listEntrySteps) ? saved.listEntrySteps : []
  pendingListScope.value = saved.pendingListScope || null
  recordingStepCount.value = Number(saved.recordingStepCount || saved.stepAnalysis.length)
  stepAnalysis.value = saved.stepAnalysis
  executionStatus.value = 'recording_completed'
  executionPanelVisible.value = false
  return true
}
function acceptBackendRecordingState(payload) {
  recordingBackendState.value = applyBackendRecordingState(recordingBackendState.value, payload)
}
async function recoverBrowserExecutionSession() {
  if (!recordingAnchorNodeId.value || !nodeById(recordingAnchorNodeId.value)) {
    showMessage('请先选择一个节点，再打开浏览器助手', 'warning')
    return false
  }
  if (!await ensureBrowserRuntimeForAction()) return false
  let response
  try {
    const options = {
      ...runtimeOptions,
      headless: false,
      ...desktopBrowserOptions.value,
    }
    response = await browserWorkflowApi.startRecordingSession(serverDocument(), {
      options,
      anchor_node_id: recordingAnchorNodeId.value,
    })
  } catch (error) {
    showMessage(error?.message || String(error) || '打开浏览器助手失败', 'error')
    return false
  }
  if (response?.code !== 0 || !response.data?.execution_id) return false
  executionId.value = response.data.execution_id
  executionPanelVisible.value = true
  executionStatus.value = response.data.status
  recordingStepCount.value = 0
  recordingAnchorNodeId.value = response.data.anchor_node_id || recordingAnchorNodeId.value
  recordingSessionActive.value = true
  acceptBackendRecordingState(response.data)
  connectExecutionSocket()
  showMessage('浏览器助手已连接', 'success')
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
    recordingSessionActive.value = Boolean(payload.recording_state && !payload.recording_state.finished)
    if (payload.recording_state) {
      recordingAnchorNodeId.value = payload.recording_state.anchor_node_id || recordingAnchorNodeId.value
      acceptBackendRecordingState(payload.recording_state)
      if (payload.recording_state.finished && Array.isArray(payload.recording_state.step_groups) && payload.recording_state.step_groups.length) {
        handleExecutionMessage({
          type: 'recording_finished',
          ...payload.recording_state,
        })
      }
    }
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
      if (!recordingSessionActive.value) closeExecutionSocket()
    }
    return
  }
  if (payload?.type === 'recording_state_changed') {
    recordingSessionActive.value = !payload.finished
    acceptBackendRecordingState(payload)
    if (payload.phase === 'analyzing') executionStatus.value = 'recording_analyzing'
    return
  }
  if (payload?.type === 'recording_step_cancelled') {
    acceptBackendRecordingState(payload)
    stepAnalysis.value = null
    recordingCaptureMode.value = 'step'
    recordingReviewStage.value = 'idle'
    showMessage('已在浏览器中取消当前步骤，可以重新录制', 'warning')
    return
  }
  if (payload?.type === 'recording_finished') {
    const finishedPayload = normalizeRecordingFinishedPayload(payload)
    const groupKey = recordingGroupKey(finishedPayload)
    recordingSessionActive.value = false
    closeExecutionSocket()
    executionStatus.value = 'recording_completed'
    recordingStepCount.value = Number(payload.step_count || 0)
    if (groupKey && insertedRecordingGroupKeys.has(groupKey)) {
      executionPanelVisible.value = true
      showMessage(`录制已结束，共生成 ${recordingStepCount.value} 个流程节点，请检查并保存`, 'success')
      return
    }
    if (!Array.isArray(finishedPayload.steps) || !finishedPayload.steps.length) {
      stepAnalysis.value = null
      stepScope.value = null
      recordingReviewStage.value = 'idle'
      recordingCaptureMode.value = 'step'
      executionPanelVisible.value = true
      showMessage(`录制已结束，共记录 ${recordingStepCount.value} 个操作，请检查流程并保存`, 'success')
      return
    }
    handleExecutionMessage(finishedPayload)
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
        const groupKey = recordingGroupKey(payload)
        if (groupKey) insertedRecordingGroupKeys.add(groupKey)
        recordingReviewStage.value = 'inserted'
        executionStatus.value = 'recording_completed'
        showMessage(`已分析并将 ${confirmedStepNodeIds.value.length} 个节点插入指定位置`, 'success')
      }
    }
    recordingCaptureMode.value = 'step'
    executionPanelVisible.value = true
    showMessage(stepAnalysis.value.length ? '浏览器已完成当前步骤，AI分析结果已返回' : '当前步骤没有可分析的操作', stepAnalysis.value.length ? 'success' : 'warning')
    return
  }
  if (payload?.type === 'assistant_nodes_added') {
    if (payload.document && Array.isArray(payload.document.nodes) && Array.isArray(payload.document.edges)) {
      recordHistory()
      normalizeDocument(payload.document)
      document.value = payload.document
      repairDocumentCollisions(document.value)
      recordingAnchorNodeId.value = payload.anchor_node_id || recordingAnchorNodeId.value
      selectedNodeId.value = (payload.inserted_node_ids || []).at(-1) || recordingAnchorNodeId.value
      markPersisted(false)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(document.value))
      nextTick(() => syncWorkflowGraphFromDocument())
    }
    showMessage(payload.message || '浏览器助手已更新工作流', 'success')
  }
}
async function connectExecutionSocket() {
  closeExecutionSocket()
  if (!executionId.value) return
  const connectVersion = executionSocketConnectVersion
  const targetExecutionId = executionId.value
  try {
    const response = await browserWorkflowApi.createExecutionSocketTicket(targetExecutionId, { suppressErrorMessage: true })
    const ticket = String(response?.data?.ticket || '')
    if (connectVersion !== executionSocketConnectVersion || executionId.value !== targetExecutionId) return
    if (!ticket) throw new Error('未获取到连接票据')
    executionSocket = new WebSocket(browserWorkflowApi.executionSocketUrl(targetExecutionId, ticket))
  } catch {
    showMessage('执行日志连接失败，浏览器操作不受影响', 'warning')
    return
  }
  executionSocket.onmessage = event => {
    try { handleExecutionMessage(JSON.parse(event.data)) } catch { /* ignore malformed push */ }
  }
  executionSocket.onerror = () => showMessage('执行日志连接中断，浏览器操作不受影响', 'warning')
}
function closeExecutionSocket() {
  executionSocketConnectVersion += 1
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
    recordingSessionActive.value = true
    acceptBackendRecordingState(response.data)
    connectExecutionSocket()
    showMessage('肥猫猫录制助手已连接，请在浏览器内完成或取消当前步骤', 'success')
  } catch {
    // API layer displays the backend message.
  }
}
async function openBrowserAssistant() {
  if (!selectedNode.value || selectedNode.value.kind === 'end') {
    showMessage('请先选择一个节点，助手生成的新节点会接在它后面', 'warning')
    return
  }
  if (document.value.edges.filter(edge => edge.source === selectedNode.value.id).length > 1) {
    showMessage('当前节点有多个分支，请先选择具体分支上的节点', 'warning')
    return
  }
  recordingAnchorNodeId.value = selectedNode.value.id
  try {
    if (!await recoverBrowserExecutionSession()) return
    executionPanelVisible.value = false
    showMessage('浏览器助手已打开，请在浏览器右侧直接告诉它要做什么', 'success')
  } catch {
    // API layer displays the backend message.
  }
}
async function retryStepCapture() {
  if (!executionId.value) return
  await browserWorkflowApi.recording(executionId.value, 'reset_step')
  const response = await browserWorkflowApi.recording(executionId.value, 'start_step', { mode: 'step' })
  if (response?.code !== 0) return
  acceptBackendRecordingState(response.data)
  stepAnalysis.value = null
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
function chooseRecordingScope(mode) {
  if (!stepAnalysis.value?.length) return
  stepScopeSelection.value = mode
  if (mode === 'single') {
    confirmStepAnalysis()
    return
  }
  const result = inferListScopeFromRecording(stepAnalysis.value, mode)
  if (!result.ok) {
    showMessage(result.reason, 'warning')
    return
  }
  stepAnalysis.value = result.entrySteps
  stepScope.value = result.scope
  confirmStepAnalysis()
}
function confirmStepAnalysis() {
  if (!stepAnalysis.value?.length) return
  if (!recordingAnchorNodeId.value || !nodeById(recordingAnchorNodeId.value)) {
    showMessage('录制起点节点已经不存在，无法写入流程', 'error')
    return
  }
  confirmedStepNodeIds.value = appendRecordedSteps(
    stepAnalysis.value,
    stepScopeSelection.value === 'single' ? null : { ...stepScope.value, mode: stepScopeSelection.value },
    recordingAnchorNodeId.value,
  )
  stepAnalysis.value = null
  stepScope.value = null
  stepScopeSelection.value = 'single'
  recordingReviewStage.value = 'idle'
  recordingCaptureMode.value = 'step'
  listEntrySteps.value = []
  pendingListScope.value = null
  showMessage('当前步骤已加入流程', 'success')
}
async function testConfirmedStep() {
  if (!executionId.value || !confirmedStepNodeIds.value.length || !recordingAnchorNodeId.value) return
  if (!validateEditorDocument()) return
  if (!await ensureBrowserRuntimeForAction()) return
  try {
    const localMaterialPaths = await resolveLocalMaterialPaths()
    const response = await browserWorkflowApi.testStep(
      executionId.value,
      serverDocument(),
      confirmedStepNodeIds.value,
      recordingAnchorNodeId.value,
      { local_material_paths: localMaterialPaths },
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
  nextTick(() => {
    syncWorkflowGraphFromDocument()
    const firstNode = nodeById(result.createdNodeIds[0])
    if (!firstNode) return
    canvasRef.value?.scrollTo({
      left: Math.max(0, Number(firstNode.position?.x || 0) - 120),
      top: Math.max(0, Number(firstNode.position?.y || 0) - 120),
      behavior: 'smooth',
    })
  })
  showMessage(`已将 ${result.insertedStepCount} 个录制步骤插入“${anchorNode.title}”之后，请检查后保存`, 'success')
  return result.testNodeIds
}
function recordingGroupKey(payload = {}) {
  const groupCount = Number(payload.recording_group_count)
  if (!executionId.value || !Number.isInteger(groupCount) || groupCount <= 0) return ''
  return `${executionId.value}:${groupCount}`
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
    syncWorkflowGraphSelection(workflowGraph.value, {
      nodeId: selectedNodeId.value,
      edgeId: selectedEdgeId.value,
    })
  } finally {
    syncingWorkflowGraph.value = false
  }
}
function syncDocumentPositionsFromGraph() {
  if (!workflowGraph.value) return
  const positions = readWorkflowPositions(workflowGraph.value, document.value.nodes)
  document.value.nodes.forEach(node => {
    const position = positions.get(node.id)
    if (!position) return
    node.position = {
      x: Number(position.x),
      y: Number(position.y),
    }
  })
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
  if (!target && node.getData?.()?.loopNodeId) {
    syncDocumentPositionsFromGraph()
    markPersisted(false)
    return
  }
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
  const existing = document.value.edges.find(item => item.id === edge.id)
  if (existing) {
    const sourceNode = nodeById(sourceId)
    const branchPort = branch?.condition?.branch || (branch?.condition?.default ? 'default' : '')
    const duplicate = document.value.edges.some(item => {
      if (item.id === existing.id || item.source !== sourceId) return false
      if (['condition', 'loop', 'pagination'].includes(sourceNode?.kind)) {
        const itemBranchPort = item.condition?.branch || (item.condition?.default ? 'default' : '')
        return itemBranchPort === branchPort
      }
      return true
    })
    if (duplicate) {
      syncWorkflowGraphFromDocument()
      return
    }
    recordHistory()
    existing.source = sourceId
    existing.target = targetId
    if (branch?.label) existing.label = branch.label
    else delete existing.label
    if (branch?.condition) existing.condition = branch.condition
    else delete existing.condition
    markPersisted(false)
    syncWorkflowGraphFromDocument()
    return
  }
  createEdge(sourceId, targetId, branch)
  markPersisted(false)
  syncWorkflowGraphFromDocument()
}
function persistWorkflowGraphEdgeVertices(edge) {
  if (syncingWorkflowGraph.value || !edge) return
  const target = document.value.edges.find(item => item.id === edge.id)
  if (!target) return
  const vertices = (edge.getVertices?.() || []).map(vertex => ({ x: Number(vertex.x), y: Number(vertex.y) }))
  const previous = JSON.stringify(target.vertices || [])
  const next = JSON.stringify(vertices)
  if (previous === next && (!vertices.length || target.routing === 'manual')) return
  recordHistory()
  if (vertices.length) {
    target.vertices = vertices
    target.routing = 'manual'
  } else {
    delete target.vertices
    delete target.routing
  }
  markPersisted(false)
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
    onEdgeVerticesChanged: ({ edge }) => persistWorkflowGraphEdgeVertices(edge),
    onEdgeMoved: ({ edge }) => persistWorkflowGraphEdgeVertices(edge),
    onEdgeRemoved: handleWorkflowGraphEdgeRemoved,
    onBlankClick: handleCanvasClick,
    onDelete: removeNode,
    getNodeIcon: node => nodeIcon(node.kind),
    getNodeTone: node => nodeTone(node.kind),
  })
  syncWorkflowGraphFromDocument()
}
watch(document, syncWorkflowGraphFromDocument, { deep: true })
watch([selectedNodeId, selectedEdgeId], () => {
  syncWorkflowGraphSelection(workflowGraph.value, {
    nodeId: selectedNodeId.value,
    edgeId: selectedEdgeId.value,
  })
})
watch(
  [executionId, recordingAnchorNodeId, stepAnalysis, stepScope, stepScopeSelection, recordingReviewStage, recordingCaptureMode, listEntrySteps, pendingListScope, recordingStepCount],
  persistPendingRecordingReview,
  { deep: true },
)
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
    ensureMaterialStore(document.value)
    imageMaterialPreviews.value = {}
    startNewTextMaterial()
    storedWorkflowId.value = ''
    selectedNodeId.value = ''
    localStorage.setItem(STORAGE_KEY, JSON.stringify(document.value))
  }
  restorePendingRecordingReview()
  if (!document.value.metadata?.persisted) return
  try {
    const response = await browserWorkflowApi.get(document.value.workflow_id, { suppressErrorMessage: true })
    if (response?.code === 0 && response.data?.document) {
      normalizeDocument(response.data.document)
      document.value = response.data.document
      storedWorkflowId.value = response.data.workflow_id || document.value.workflow_id
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
  if (recordingReviewStage.value === 'scope_choice') return '选择处理范围'
  if (recordingReviewStage.value === 'list_scope_ready') return '确认列表范围'
  if (recordingReviewStage.value === 'pagination_required') return '补充翻页方式'
  if (stepScope.value?.kind === 'list_item' && stepScopeSelection.value !== 'single') return '确认批量处理步骤'
  return '刚才录制的操作'
})
const listExecutionSummary = computed(() => {
  return describeListScope(
    { ...(stepScope.value || {}), mode: stepScopeSelection.value },
    stepAnalysis.value || [],
  )
})
const pluginMenuGroups = computed(() => [
  {
    key: 'interaction',
    title: '复杂浏览器交互',
    description: '处理基础点击和输入之外的页面组件',
    plugins: pluginCatalog.value.filter(plugin => plugin.kind !== 'business' && !plugin.builtin && !String(plugin.plugin_id || '').startsWith('builtin.')),
  },
  {
    key: 'business',
    title: '业务服务能力',
    description: '邮箱、短信、手机号和其他外部服务',
    plugins: pluginCatalog.value.filter(plugin => plugin.kind === 'business'),
  },
])

onBeforeUnmount(closeExecutionSocket)
onBeforeUnmount(disconnectBrowserWorkflowDesktopBridge)
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
.workflow-starting-toast { position: fixed; top: 22px; left: 50%; z-index: 40; display: flex; align-items: center; gap: 12px; min-width: 270px; padding: 13px 16px; color: #244d37; background: rgba(255, 255, 255, .97); border: 1px solid #cfe3d5; border-radius: 12px; box-shadow: 0 14px 36px #1c33252b; transform: translateX(-50%); }.workflow-starting-toast > div { display: grid; gap: 3px; }.workflow-starting-toast strong { font-size: 13px; }.workflow-starting-toast small { color: #718078; font-size: 11px; }.workflow-starting-spinner, .button-loading-spinner { display: inline-block; box-sizing: border-box; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: workflow-loading-spin .75s linear infinite; }.workflow-starting-spinner { flex: 0 0 22px; width: 22px; height: 22px; color: #287d4f; }.button-loading-spinner { width: 13px; height: 13px; }.workflow-starting-enter-active, .workflow-starting-leave-active { transition: opacity .16s ease, transform .16s ease; }.workflow-starting-enter-from, .workflow-starting-leave-to { opacity: 0; transform: translate(-50%, -8px); }@keyframes workflow-loading-spin { to { transform: rotate(360deg); } }
.workflow-input-card { max-height: min(720px, calc(100vh - 48px)); overflow: auto; }.workflow-input-card > header { display: flex; align-items: flex-start; justify-content: space-between; }.workflow-input-card > header div strong, .workflow-input-card > header div span { display: block; }.workflow-input-card > header div span { margin-top: 4px; font-size: 12px; }.workflow-input-card > header button { color: #758078; background: transparent; font-size: 22px; }.workflow-input-card label { display: grid; gap: 5px; }.workflow-input-card label span { color: #405047; font-weight: 700; }.workflow-input-card label b { margin-left: 3px; color: #b24e49; }.workflow-input-card label small { color: #879288; }.workflow-input-card input:not([type="checkbox"]), .workflow-input-card textarea { width: 100%; padding: 10px; box-sizing: border-box; border: 1px solid #d8e3da; border-radius: 8px; outline: none; }.workflow-input-card input:focus, .workflow-input-card textarea:focus { border-color: #5c9c70; box-shadow: 0 0 0 3px #a8d4b34d; }.workflow-input-card input[type="checkbox"] { width: 18px; height: 18px; accent-color: #278453; }
.recording-action { color: #326d9a; background: #eef6fb; border-color: #c6dce9; }
.materials-card { width: min(880px, calc(100vw - 40px)); max-height: min(720px, calc(100vh - 40px)); overflow: hidden; padding: 0; gap: 0; }
.materials-heading { display: flex; align-items: flex-start; justify-content: space-between; padding: 22px 24px 18px; border-bottom: 1px solid #e5ece6; }.materials-heading div { display: grid; gap: 5px; }.materials-heading span { font-size: 12px; }.materials-heading button { color: #758078; background: transparent; font-size: 22px; }
.materials-tabs { display: flex; gap: 8px; padding: 14px 24px 0; }.materials-tabs button { padding: 8px 13px; color: #66766c; background: #f4f7f4; border-radius: 8px; }.materials-tabs button.active { color: #fff; background: #287d4f; }
.materials-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 24px; }.materials-toolbar > span { font-size: 12px; }.materials-toolbar .primary-button { flex: 0 0 auto; padding: 9px 13px; }
.materials-layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); min-height: 380px; max-height: 520px; border-top: 1px solid #edf1ed; }.material-list { overflow: auto; padding: 14px; border-right: 1px solid #edf1ed; background: #f8faf8; }.material-list-item { display: grid; width: 100%; gap: 5px; margin-bottom: 8px; padding: 11px 12px; color: #344439; text-align: left; background: #fff; border: 1px solid #e2e9e3; border-radius: 9px; }.material-list-item.selected { border-color: #5b9d70; box-shadow: 0 0 0 3px #9ad1aa33; }.material-list-item small { overflow: hidden; color: #87958a; text-overflow: ellipsis; white-space: nowrap; }.material-editor { display: grid; align-content: start; gap: 14px; overflow: auto; padding: 20px 24px 24px; }.material-editor label { display: grid; gap: 7px; margin: 0; color: #526258; font-size: 12px; font-weight: 700; }.material-editor input, .material-editor textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; color: #344439; background: #fbfdfb; border: 1px solid #d8e3da; border-radius: 9px; outline: none; resize: vertical; }.material-editor input:focus, .material-editor textarea:focus { border-color: #5c9c70; box-shadow: 0 0 0 3px #a8d4b344; }.material-editor-actions { display: flex; justify-content: flex-end; gap: 9px; }.danger-button { padding: 10px 14px; color: #a54b48; background: #fff4f2; border: 1px solid #edcfcb; border-radius: 9px; }.material-empty { display: grid; min-height: 120px; place-items: center; color: #8b978f; font-size: 12px; }
.image-material-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; max-height: 510px; overflow: auto; padding: 0 24px 24px; }.image-material-card { position: relative; overflow: hidden; background: #f8faf8; border: 1px solid #dfe8e1; border-radius: 11px; }.image-material-preview { display: grid; height: 126px; place-items: center; overflow: hidden; color: #8b978f; background: #eef3ef; font-size: 12px; }.image-material-preview img { width: 100%; height: 100%; object-fit: cover; }.image-material-copy { display: grid; gap: 3px; min-width: 0; padding: 11px 36px 12px 12px; }.image-material-copy strong, .image-material-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.image-material-copy strong { color: #344439; font-size: 12px; }.image-material-copy small { color: #87958a; font-size: 10px; }.image-material-card > button { position: absolute; right: 8px; bottom: 9px; display: grid; width: 24px; height: 24px; place-items: center; color: #a54b48; background: #fff; border-radius: 7px; }.image-material-empty { grid-column: 1 / -1; }
.material-node-box { display: grid; gap: 9px; margin: 14px 0; padding: 12px; background: #f5faf6; border: 1px solid #dce9df; border-radius: 10px; }.material-node-box textarea { margin-top: 0; }.material-node-box > small { color: #7b887f; font-size: 10px; line-height: 1.5; }.local-source-summary { display: grid; gap: 3px; padding: 10px; background: #fff; border: 1px solid #d9e6dc; border-radius: 8px; }.local-source-summary strong { color: #345548; font-size: 12px; }.local-source-summary small { color: #7b887f; font-size: 10px; }
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
.primary-button, .ghost-button, .secondary-button { padding: 11px 16px; border-radius: 10px; }.primary-button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; }.primary-button:disabled, .secondary-button:disabled { opacity: .58; cursor: wait; }
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
.recording-review-pending-action { position: relative; padding-right: 24px; }
.recording-review-pending-action::after { position: absolute; top: 8px; right: 9px; width: 7px; height: 7px; content: ''; background: #fff; border-radius: 50%; box-shadow: 0 0 0 3px #ffffff40; }
.recording-review-reminder { position: fixed; right: 24px; bottom: 82px; z-index: 12; display: grid; gap: 3px; min-width: 210px; padding: 12px 15px; color: #fff; text-align: left; background: #287d4f; border: 0; border-radius: 11px; box-shadow: 0 12px 30px #1d56372e; cursor: pointer; }
.recording-review-reminder span { font-size: 13px; font-weight: 700; }
.recording-review-reminder small { color: #d9f0e1; font-size: 10px; }
.recording-review-reminder:hover { background: #226c44; transform: translateY(-1px); }
.plugin-center-dialog { z-index: 50; }
.workflow-plugin-modal {
  width: min(620px, calc(100vw - 40px));
  max-height: min(680px, calc(100vh - 48px));
  overflow-y: auto;
  padding: 16px;
}
.workflow-plugin-modal-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.workflow-plugin-modal-heading > div {
  display: grid;
  gap: 4px;
}
.workflow-plugin-modal-heading strong { color: #344439; font-size: 18px; }
.workflow-plugin-modal-heading small { color: #8b998e; font-size: 11px; line-height: 1.4; }
.workflow-plugin-modal-heading button {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  color: #758078;
  background: #f2f6f2;
  border-radius: 7px;
  font-size: 20px;
}
.workflow-plugin-modal-heading button:hover { color: #a14f4b; background: #f8e2e0; }
.workflow-plugin-context {
  padding: 9px 11px;
  color: #647268;
  background: #f5faf6;
  border: 1px solid #dce9df;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.5;
}
.workflow-plugin-context strong { color: #287d4f; font-size: 11px; }
.workflow-plugin-modal .workflow-plugin-group { gap: 8px; }
.workflow-plugin-modal .workflow-plugin-capabilities button { font-size: 10px; }
.workflow-plugin-modal .workflow-plugin-actions button { font-size: 10px; }
.workflow-plugin-modal .workflow-plugin-builtin { margin-top: 1px; }
.workflow-plugin-modal .workflow-plugin-builtin > b { font-size: 10px; }
@media (max-width: 720px) {
  .workflow-plugin-modal { width: calc(100vw - 24px); max-height: calc(100vh - 24px); padding: 13px; }
}
.workflow-plugin-heading,
.workflow-plugin-group-heading {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 0 0 auto;
}
.workflow-plugin-heading { padding: 2px 2px 4px; }
.workflow-plugin-heading strong { color: #344439; font-size: 13px; }
.workflow-plugin-heading small,
.workflow-plugin-group-heading small { color: #8b998e; font-size: 10px; line-height: 1.4; }
.workflow-plugin-builtin {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px;
  box-sizing: border-box;
  color: #344439;
  text-align: left;
  background: #f8fbf8;
  border: 1px solid #dce9df;
  border-radius: 9px;
  cursor: pointer;
}
.workflow-plugin-builtin:hover { border-color: #78ae89; background: #f1f8f3; }
.workflow-plugin-copy,
.workflow-plugin-card-main {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}
.workflow-plugin-copy > span,
.workflow-plugin-card-main > div:first-child { display: flex; align-items: center; gap: 7px; }
.workflow-plugin-copy strong,
.workflow-plugin-card-main strong { color: #344439; font-size: 12px; }
.workflow-plugin-copy em { padding: 2px 5px; color: #287d4f; background: #e6f4ea; border-radius: 99px; font-size: 9px; font-style: normal; }
.workflow-plugin-copy small,
.workflow-plugin-card-main small { overflow: hidden; color: #839188; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.workflow-plugin-builtin > b { flex: 0 0 auto; color: #287d4f; font-size: 11px; }
.workflow-plugin-group { display: flex; flex: 0 0 auto; flex-direction: column; gap: 7px; padding-top: 3px; }
.workflow-plugin-group-heading strong { color: #52665a; font-size: 11px; }
.workflow-plugin-card { display: flex; align-items: flex-start; gap: 9px; padding: 10px; background: #fff; border: 1px solid #e4ece5; border-radius: 9px; }
.workflow-plugin-actions { display: flex; flex: 0 0 auto; flex-direction: column; align-items: flex-end; gap: 4px; }
.workflow-plugin-actions button,
.workflow-plugin-capabilities button { padding: 5px 7px; color: #287d4f; background: #eef8f1; border: 1px solid #b9dac4; border-radius: 6px; cursor: pointer; font-size: 9px; }
.workflow-plugin-actions .danger-action { color: #9b4d48; background: #fff; border-color: #e8cbc8; }
.workflow-plugin-actions span { color: #819087; font-size: 9px; }
.workflow-plugin-capabilities { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
.workflow-plugin-permissions { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }
.workflow-plugin-permissions code { padding: 2px 4px; color: #79683d; background: #fff7df; border-radius: 4px; font-size: 9px; }
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
.x6-edge path { transition: none; }
.x6-edge:hover .connection { stroke: #91a197 !important; stroke-width: 1.6px !important; }
.x6-edge:hover .connection-wrap { opacity: 0 !important; stroke: transparent !important; }
.x6-edge:hover .source-marker, .x6-edge:hover .target-marker { stroke: #000 !important; }
</style>
<style>
.canvas-action.primary-action:hover,
.canvas-action.primary-action:focus-visible {
  color: #fff;
  background: #226c44;
  border-color: #226c44;
}
</style>
<style>
/* Keep the X6 surface visually distinct from the surrounding page. */
.workflow-canvas {
  background: #edf3ef !important;
}

.x6-canvas-host,
.x6-graph,
.x6-graph-svg,
.x6-graph-background {
  background-color: #f8faf8 !important;
  background-image: radial-gradient(#d2ded4 1px, transparent 1px) !important;
  background-size: 20px 20px !important;
}

.x6-edge .connection {
  stroke: #7f9184;
  stroke-width: 1.7px;
  stroke-linecap: round;
}

.x6-edge .marker-target {
  fill: #7f9184;
  stroke: #7f9184;
}
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
.x6-workflow-node.node-loop {
  border-color: #d9cfea;
  border-left-color: #8d72b6;
  box-shadow: 0 10px 24px #6c4c9617;
}
.x6-workflow-node.node-loop .x6-workflow-node-icon {
  color: #72569d;
  background: #f0ebf7;
}
.x6-workflow-loop-ports {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  padding-top: 7px;
  color: #735c96;
  border-top: 1px solid #eee8f5;
  font-size: 10px;
  font-weight: 700;
}
.x6-workflow-loop-body {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  cursor: move;
  background: rgba(248, 245, 252, .72);
  border: 1px solid #c9b9df;
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(91, 65, 128, .08), inset 0 0 0 1px rgba(255, 255, 255, .72);
}
.x6-workflow-loop-body-heading {
  position: absolute;
  top: 14px;
  left: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #735c96;
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.x6-workflow-loop-body-heading strong { font-size: 12px; }
.x6-workflow-loop-body-heading span { color: #998bab; font-size: 10px; }
.x6-port-body { fill: #fff; stroke: #4c89a8; stroke-width: 1.8; }
.x6-port-body[data-port-group="out"] { stroke: #4b9566; }
.x6-port-body[data-port-group="loopBody"] { stroke: #8d72b6; }
.x6-edge { cursor: pointer; }
.x6-edge path { transition: none; }
.x6-edge.workflow-edge-connected .connection { stroke: #287d4f !important; stroke-width: 2.8px !important; }
.x6-edge.workflow-edge-selected .connection { stroke: #b37b20 !important; stroke-width: 3px !important; }
</style>
