<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-0 border max-w-4xl shadow-lg rounded-lg bg-white">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b">
        <h3 class="text-xl font-semibold text-black">
          {{ isEditMode ? t('workflowEditor.titleEdit') : t('workflowEditor.titleCreate') }}
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-black"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 内容 -->
      <div class="p-6">
        <form @submit.prevent="handleSubmit">
          <!-- 基本信息 -->
          <div class="mb-6">
            <h4 class="text-lg font-medium text-black mb-4">{{ t('workflowEditor.basicInfo') }}</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="name" class="block text-sm font-medium text-black mb-2">
                  {{ t('workflowEditor.name') }} *
                </label>
                <BaseInput
                  id="name"
                  v-model="form.name"
                  type="text"
                  required
                  :placeholder="t('workflowEditor.namePlaceholder')"
                  :error="errors.name"
                />
              </div>
              <div>
                <label for="description" class="block text-sm font-medium text-black mb-2">
                  {{ t('workflowEditor.description') }}
                </label>
                <BaseInput
                  id="description"
                  v-model="form.description"
                  type="text"
                  :placeholder="t('workflowEditor.descriptionPlaceholder')"
                />
              </div>
            </div>
          </div>

          <!-- 工作流插件 -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-medium text-black">{{ t('workflowEditor.plugins') }}</h4>
              <button
                type="button"
                @click="addPluginGroup"
                class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                {{ t('workflowEditor.addPlugin') }}
              </button>
            </div>

            <!-- 插件列表 -->
            <div v-if="form.plugin_groups.length === 0" class="text-center py-8 text-black">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p class="mt-2">{{ t('workflowEditor.emptyPlugins') }}</p>
            </div>

            <div v-else class="space-y-6">
              <div
                v-for="(group, groupIndex) in form.plugin_groups"
                :key="group.group_id"
                draggable="true"
                @dragstart="handleDragStart(groupIndex, $event)"
                @dragover.prevent="handleDragOver(groupIndex, $event)"
                @dragenter.prevent="handleDragOver(groupIndex, $event)"
                @drop="handleDrop(groupIndex, $event)"
                @dragend="handleDragEnd"
                :class="[
                  'transition-all duration-200',
                  draggedIndex === groupIndex ? 'opacity-50 scale-95' : '',
                  dragOverIndex === groupIndex && draggedIndex !== groupIndex ? 'ring-2 ring-green-400' : ''
                ]"
              >
                <PluginConfigCard
                  :group="group"
                  :index="groupIndex"
                  :plugin-options="getPluginOptionsForGroup(group)"
                  :get-plugin-action-options="getPluginActionOptions"
                  :get-selected-action-schema="getSelectedActionSchema"
                  @add-step="addStepToGroup(groupIndex)"
                  @remove="removePluginGroup(groupIndex)"
                  @plugin-change="onGroupPluginChange(groupIndex)"
                  @remove-step="(stepIndex) => removeStepFromGroup(groupIndex, stepIndex)"
                  @step-action-change="(stepIndex) => onStepActionChange(groupIndex, stepIndex)"
                  @move-step-up="(stepIndex) => moveStepUp(groupIndex, stepIndex)"
                  @move-step-down="(stepIndex) => moveStepDown(groupIndex, stepIndex)"
                  @insert-step-before="(stepIndex) => insertStepBefore(groupIndex, stepIndex)"
                />
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-black hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {{ t('workflowEditor.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? (isEditMode ? t('workflowEditor.saving') : t('workflowEditor.creating')) : (isEditMode ? t('workflowEditor.save') : t('workflowEditor.create')) }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseInput from '@/components/BaseInput/index.vue'
import PluginConfigCard from '../PluginConfigCard/index.vue'
import { workflowApi } from '@/api/workflow'
import { pluginApi } from '@/api/plugin'
import { showMessage } from '@/utils/message'

const props = defineProps({
  workflow: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'created'])
const { t } = useI18n()

// 响应式数据
const loading = ref(false)
const plugins = ref([])
const builtinActions = ref([])
const errors = ref({}) // 表单错误状态
const form = ref({
  name: '',
  description: '',
  plugin_groups: [], // 插件组列表
  settings: {}
})

// 拖拽相关状态
const draggedIndex = ref(null)
const dragOverIndex = ref(null)

// 计算属性
const pluginOptions = ref([])

// 判断是否为编辑模式
const isEditMode = computed(() => {
  return props.workflow && props.workflow.workflow_id
})

// 所有插件都通过插件API管理，不再区分内置和普通插件

//方法
const fetchPlugins = async () => {
  try {
    // 获取用户已安装的插件
    const response = await pluginApi.getMyPlugins()
    if (response.code === 0) {
      plugins.value = Array.isArray(response.data) ? response.data : []
    } else {
      plugins.value = response.plugins || []
    }

    // 为每个插件获取 actions
    for (const plugin of plugins.value) {
      if (!plugin.actions) {
        try {
          const actionsRes = await pluginApi.getPluginActions(plugin.plugin_id)
          if (actionsRes.code === 0) {
            plugin.actions = Array.isArray(actionsRes.data) ? actionsRes.data : []
          }
        } catch (err) {
          console.error(`获取插件 ${plugin.plugin_id} 的 actions 失败:`, err)
        }
      }
    }

    // 获取内置actions
    try {
      const builtinRes = await workflowApi.getBuiltinActions()
      if (builtinRes.code === 0) {
        builtinActions.value = builtinRes.data.actions || []
      }
    } catch (err) {
      console.error('获取内置actions失败:', err)
    }

    // 构建选项列表：内置操作作为一个整体，与插件同级
    const pluginOptionsData = plugins.value.map(plugin => ({
      label: plugin.name,
      value: plugin.plugin_id,
      isBuiltin: false
    }))

    // 如果有内置actions，添加"内置操作"选项
    if (builtinActions.value.length > 0) {
      pluginOptions.value = [
        { label: t('workflowEditor.builtinOption'), value: 'builtin', isBuiltin: true },
        ...pluginOptionsData
      ]
    } else {
      pluginOptions.value = pluginOptionsData
    }
  } catch (error) {
    showMessage(t('workflowEditor.fetchPluginsFailed'), 'error')
  }
}


// 获取插件支持的动作
const fetchPluginActions = async (pluginId) => {
  try {
    const response = await pluginApi.getPluginActions(pluginId)
    if (response.code === 0) {
      const actions = Array.isArray(response.data) ? response.data : []
      return actions
    } else {
      return []
    }
  } catch (error) {
    return []
  }
}

// 获取选中动作的参数schema
const getSelectedActionSchema = (group, step) => {
  if (!group.plugin_id || !step.action_key) {
    return {}
  }

  // 如果是内置action
  if (group.plugin_id.startsWith('builtin:')) {
    const actionId = group.plugin_id.replace('builtin:', '')
    const builtinAction = builtinActions.value.find(a => a.id === actionId)
    if (builtinAction && builtinAction.params) {
      // 转换内置action的参数格式为插件参数schema格式
      const schema = {
        type: 'object',
        properties: {},
        required: []
      }

      Object.entries(builtinAction.params).forEach(([key, config]) => {
        schema.properties[key] = {
          type: config.type === 'select' ? 'string' :
                config.type === 'number' ? 'number' :
                config.type === 'json' ? 'object' : 'string',
          title: key,
          description: config.description,
          default: config.default
        }

        // 如果是select类型，添加枚举选项
        if (config.type === 'select' && config.options) {
          schema.properties[key].enum = config.options
        }

        // 如果是必填字段
        if (config.required) {
          schema.required.push(key)
        }
      })

      return schema
    }
    return {}
  }

  // 普通插件
  const plugin = plugins.value.find(p => p.plugin_id === group.plugin_id)
  if (plugin && plugin.actions) {
    const action = plugin.actions.find(a => a.key === step.action_key)
    return action ? action.parameters_schema : {}
  }
  return {}
}
const getPluginName = (pluginId) => {
  // 如果是内置action
  if (pluginId && pluginId.startsWith('builtin:')) {
    const actionId = pluginId.replace('builtin:', '')
    const builtinAction = builtinActions.value.find(a => a.id === actionId)
    return builtinAction ? `${builtinAction.icon} ${builtinAction.name}` : actionId
  }

  // 普通插件
  const plugin = plugins.value.find(p => p.plugin_id === pluginId)
  return plugin ? plugin.name : pluginId
}

// 获取动作选项
const getActionOptions = (step) => {
  if (step.step_type === 'builtin') {
    return builtinActions.value
  } else if (step.step_type === 'plugin') {
    // 如果步骤选择了插件，使用该插件的动作
    if (step.plugin_id) {
      return step.pluginActions || []
    }
  }
  return []
}

// 步骤类型改变时
const onStepTypeChange = (step) => {
  step.action = '' // 清空动作选择
  step.parameters = {} // 清空参数
  if (step.step_type !== 'plugin') {
    step.plugin_id = '' // 清空插件选择
    step.pluginActions = [] // 清空插件动作缓存
  }
}

// 插件改变时
const onPluginChange = async (step) => {
  step.action = '' // 清空动作选择
  if (step.plugin_id) {
    try {
      step.pluginActions = await fetchPluginActions(step.plugin_id)
    } catch (error) {
      step.pluginActions = []
    }
  } else {
    step.pluginActions = []
  }
}

// 动作改变时
const onActionChange = (step) => {
  step.parameters = {} // 清空之前的参数
}

// 添加插件（跳转到插件管理）
const addPlugin = (step) => {
  // 这里可以打开插件商店或插件管理页面
  showMessage(t('workflowEditor.installPluginHint'), 'info')
}

// 插件组管理方法
const addPluginGroup = () => {
  const groupId = `group_${Date.now()}`
  const newGroup = {
    group_id: groupId,
    name: '',
    plugin_id: '', // 插件ID
    plugin_config: '{}', // 插件配置JSON
    steps: []
  }
  
  form.value.plugin_groups.push(newGroup)
  
  // 自动添加一个默认步骤
  const stepId = `step_${Date.now()}`
  newGroup.steps.push({
    step_id: stepId,
    name: '',
    description: '',
    action_key: '', // 插件动作的key
    parameters: {} // 动作参数
  })
}

const removePluginGroup = (groupIndex) => {
  form.value.plugin_groups.splice(groupIndex, 1)
}

const addStepToGroup = (groupIndex) => {
  const stepId = `step_${Date.now()}`
  const group = form.value.plugin_groups[groupIndex]
  
  group.steps.push({
    step_id: stepId,
    name: '',
    description: '',
    action_key: '', // 插件动作或内置动作的key
    parameters: {} // 动作参数
  })
}

const removeStepFromGroup = (groupIndex, stepIndex) => {
  form.value.plugin_groups[groupIndex].steps.splice(stepIndex, 1)
}

// 上移步骤
const moveStepUp = (groupIndex, stepIndex) => {
  if (stepIndex === 0) return
  const steps = form.value.plugin_groups[groupIndex].steps
  const temp = steps[stepIndex]
  steps[stepIndex] = steps[stepIndex - 1]
  steps[stepIndex - 1] = temp
}

// 下移步骤
const moveStepDown = (groupIndex, stepIndex) => {
  const steps = form.value.plugin_groups[groupIndex].steps
  if (stepIndex === steps.length - 1) return
  const temp = steps[stepIndex]
  steps[stepIndex] = steps[stepIndex + 1]
  steps[stepIndex + 1] = temp
}

// 在指定位置之前插入新步骤
const insertStepBefore = (groupIndex, stepIndex) => {
  const newStep = {
    step_id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: '',
    description: '',
    note: '', // 步骤备注
    action_key: '', // 插件动作或内置动作的key
    parameters: {} // 动作参数
  }
  form.value.plugin_groups[groupIndex].steps.splice(stepIndex, 0, newStep)
}


// 根据组的状态返回不同的选项列表（插件选择）
const getPluginOptionsForGroup = (group) => {
  // 始终返回插件列表（包含"内置操作"选项）
  return pluginOptions.value
}

const onGroupPluginChange = async (groupIndex) => {
  const group = form.value.plugin_groups[groupIndex]

  if (group.plugin_id) {
    // 如果选择的是"内置操作"，不设置名称，等待选择具体的内置action
    if (group.plugin_id === 'builtin') {
      group.name = t('workflowEditor.builtinSelectSpecific')
      // 不清空步骤，让用户继续选择具体的内置action
      return
    }
    
    // 如果是具体的内置action
    if (group.plugin_id.startsWith('builtin:')) {
      const actionId = group.plugin_id.replace('builtin:', '')
      const builtinAction = builtinActions.value.find(a => a.id === actionId)
      if (builtinAction) {
        group.name = builtinAction.name  // 去掉图标
      }
    } else {
      // 普通插件
      const plugin = plugins.value.find(p => p.plugin_id === group.plugin_id)
      if (plugin) {
        group.name = plugin.name
      }
    }
  }

  // 清空该组所有步骤的动作选择
  group.steps.forEach(step => {
    step.action_key = ''
    step.parameters = {}
  })
}

const onStepActionChange = (groupIndex, stepIndex) => {
  // 不清空参数，保留用户已输入的数据
  // const step = form.value.plugin_groups[groupIndex].steps[stepIndex]
  // step.parameters = {} // 注释掉清空逻辑
}

// 原生拖拽实现
const handleDragStart = (index, event) => {
  draggedIndex.value = index
  dragOverIndex.value = index
  event.target.style.opacity = '0.5'
  
  // 创建自定义拖拽预览（显示插件名称）
  const dragImage = document.createElement('div')
  dragImage.style.cssText = `
    position: absolute;
    top: -9999px;
    padding: 12px 16px;
    background: white;
    border: 2px solid #10b981;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `
  const group = form.value.plugin_groups[index]
  const pluginName = pluginOptions.value.find(p => p.value === group.plugin_id)?.label || '插件组'
  dragImage.textContent = `📦 ${pluginName} (${index + 1})`
  document.body.appendChild(dragImage)
  event.dataTransfer.setDragImage(dragImage, 0, 0)
  
  // 清理拖拽预览元素
  setTimeout(() => {
    document.body.removeChild(dragImage)
  }, 0)
}

const handleDragOver = (index, event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  
  if (draggedIndex.value === null) return
  
  // 只在目标索引真正变化时才更新
  if (dragOverIndex.value !== index) {
    dragOverIndex.value = index
  }
}

const handleDrop = (index, event) => {
  event.preventDefault()
  event.stopPropagation()
  
  if (draggedIndex.value === null || draggedIndex.value === index) return
  
  // 在 drop 时执行实际的位置交换
  const groups = [...form.value.plugin_groups]
  const draggedItem = groups[draggedIndex.value]
  groups.splice(draggedIndex.value, 1)
  groups.splice(index, 0, draggedItem)
  form.value.plugin_groups = groups
}

const handleDragEnd = (event) => {
  event.target.style.opacity = '1'
  draggedIndex.value = null
  dragOverIndex.value = null
}

// 获取插件动作选项（方法选择）
const getPluginActionOptions = (pluginId) => {
  // 如果是"内置操作"，返回所有内置 actions
  if (pluginId === 'builtin') {
    return builtinActions.value.map(action => ({
      value: action.id,
      label: action.name
    }))
  }
  
  // 如果是具体的内置action（builtin:xxx格式），也返回所有内置 actions
  if (pluginId && pluginId.startsWith('builtin:')) {
    return builtinActions.value.map(action => ({
      value: action.id,
      label: action.name
    }))
  }

  // 普通插件
  const plugin = plugins.value.find(p => p.plugin_id === pluginId)
  if (plugin && plugin.actions) {
    return plugin.actions.map(action => ({
      value: action.key,
      label: action.name
    }))
  }
  return []
}


const handleSubmit = async () => {
  try {
    loading.value = true
    errors.value = {} // 清空之前的错误

    // 验证表单
    if (!form.value.name.trim()) {
      errors.value.name = t('workflowEditor.namePlaceholder')
      return
    }

    // 验证插件组数据（允许空工作流）
    // if (form.value.plugin_groups.length === 0) {
    //   errors.value.plugins = '请至少添加一个插件'
    //   showMessage('请至少添加一个插件', 'error')
    //   return
    // }

    // 验证每个插件组
    let hasError = false
    form.value.plugin_groups.forEach((group, groupIndex) => {
      if (!group.plugin_id) {
        errors.value[`plugin_${groupIndex}`] = t('workflowEditor.selectPluginRequired')
        hasError = true
      }
      
      if (group.steps.length === 0) {
        errors.value[`steps_${groupIndex}`] = t('workflowEditor.atLeastOneStep')
        hasError = true
      }
      
      group.steps.forEach((step, stepIndex) => {
        if (!step.action_key) {
          errors.value[`action_${groupIndex}_${stepIndex}`] = t('workflowEditor.selectActionRequired')
          hasError = true
        }
      })
    })
    
    if (hasError) {
      showMessage(t('workflowEditor.completeForm'), 'error')
      return
    }

    // 将插件组转换为steps格式
    const steps = []
    let stepOrder = 1

    form.value.plugin_groups.forEach((group, groupIndex) => {
      if (group.steps.length === 0) {
        showMessage(t('workflowEditor.pluginGroupMustHaveStep', { index: groupIndex + 1 }), 'error')
        throw new Error(t('workflowEditor.pluginGroupStepsEmpty'))
      }

      group.steps.forEach((step, stepIndex) => {
        // 清理参数：删除值为 0、空字符串、null、undefined 的字段
        const cleanedParams = {}
        Object.entries(step.parameters || {}).forEach(([key, value]) => {
          // 保留有效值：非空、非0（但 false 要保留）
          if (value !== 0 && value !== '' && value !== null && value !== undefined) {
            cleanedParams[key] = value
          } else if (typeof value === 'boolean') {
            // boolean 类型保留，即使是 false
            cleanedParams[key] = value
          } else if (typeof value === 'object' && value !== null) {
            // 对象类型：递归清理空字段
            const cleanedObj = {}
            Object.entries(value).forEach(([k, v]) => {
              if (v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)) {
                cleanedObj[k] = v
              }
            })
            // 只有对象不为空才保留
            if (Object.keys(cleanedObj).length > 0) {
              cleanedParams[key] = cleanedObj
            }
          }
        })
        
        // 处理内置操作：组合成 builtin:action_id 格式
        let finalPluginId = group.plugin_id
        if (group.plugin_id === 'builtin' && step.action_key) {
          finalPluginId = `builtin:${step.action_key}`
        }
        
        steps.push({
          step_id: step.step_id,
          name: step.name || `${group.name || t('workflowEditor.pluginGroup', { index: groupIndex + 1 })} - ${t('workflowEditor.step', { index: stepIndex + 1 })}`,
          description: step.description,
          plugin_id: finalPluginId,
          action: step.action_key,
          parameters: cleanedParams,
          config: JSON.parse(group.plugin_config || '{}'),
          timeout: 300,
          depends_on: [],
          retry_count: 0,
          order: stepOrder++,
          group_id: group.group_id,
          group_name: group.name,
          output_name: step.output_name || null
        })
      })
    })

    const data = {
      name: form.value.name,
      description: form.value.description,
      steps,
      variables: {}, // 固定为空对象
      settings: form.value.settings
    }

    if (isEditMode.value) {
      // 编辑模式：调用更新API
      await workflowApi.updateWorkflow(props.workflow.workflow_id, data)
      showMessage(t('workflowEditor.saveSuccess'), 'success')
    } else {
      // 创建模式：调用创建API
      await workflowApi.createWorkflow(data)
      showMessage(t('workflowEditor.createSuccess'), 'success')
    }
    
    emit('created')
    emit('close') // 自动关闭弹窗

  } catch (error) {
    showMessage(error.message || t('workflowEditor.createFailed'), 'error')
  } finally {
    loading.value = false
  }
}

// 转换工作流数据为表单格式
const convertWorkflowToForm = (workflow) => {
  if (!workflow || !workflow.steps) {
    return
  }
  
  // 按插件分组步骤
  const pluginGroups = new Map()
  
  workflow.steps.forEach((step, index) => {
    // 处理 plugin_id，兼容老数据结构（没有 plugin_id 的情况）
    let groupKey = step.plugin_id || 'legacy'
    let pluginId = step.plugin_id || ''
    let actionKey = step.action
    
    // 如果是内置插件 (builtin:xxx 格式)
    if (step.plugin_id && step.plugin_id.startsWith('builtin:')) {
      groupKey = 'builtin'
      pluginId = 'builtin'
      actionKey = step.plugin_id.replace('builtin:', '')
    }
    
    // 老数据没有 plugin_id，按步骤单独分组
    if (!step.plugin_id) {
      groupKey = `legacy_${index}`
    }
    
    if (!pluginGroups.has(groupKey)) {
      let groupName = groupKey
      
      if (groupKey === 'builtin') {
        groupName = t('workflowEditor.builtinOption')
      } else if (groupKey.startsWith('legacy')) {
        groupName = step.name || t('workflowEditor.step', { index: index + 1 })
      } else {
        // 普通插件
        const plugin = plugins.value.find(p => p.plugin_id === step.plugin_id)
        if (plugin) {
          groupName = plugin.name
        }
      }
      
      pluginGroups.set(groupKey, {
        group_id: `group_${groupKey}_${Date.now()}`,
        name: groupName,
        plugin_id: pluginId,
        plugin_config: JSON.stringify(step.config || {}, null, 2),
        steps: []
      })
    }
    
    pluginGroups.get(groupKey).steps.push({
      step_id: step.step_id || step.id,
      name: step.name,
      description: step.description || '',
      action_key: actionKey,
      parameters: step.parameters || {},
      output_name: step.output_name || null
    })
  })
  
  const convertedGroups = Array.from(pluginGroups.values())
  
  // 更新表单数据
  form.value.name = workflow.name
  form.value.description = workflow.description
  form.value.plugin_groups = convertedGroups
  form.value.settings = workflow.settings || {}
}

// 插件是否加载完成
const pluginsLoaded = ref(false)

// 监听工作流数据变化
watch(() => props.workflow, (newWorkflow) => {
  if (newWorkflow && pluginsLoaded.value) {
    convertWorkflowToForm(newWorkflow)
  } else if (!newWorkflow) {
    // 重置表单
    form.value.name = ''
    form.value.description = ''
    form.value.plugin_groups = []
    form.value.settings = {}
  }
}, { immediate: true })

// 生命周期
onMounted(async () => {
  // 获取插件列表
  await fetchPlugins()
  pluginsLoaded.value = true
  // 插件加载完成后，如果有工作流数据则回显
  if (props.workflow) {
    convertWorkflowToForm(props.workflow)
  }
})
</script>

<style scoped>
.drag-handle {
  cursor: grab;
  user-select: none;
}

.drag-handle:hover {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.drag-handle:active {
  cursor: grabbing;
}

/* 拖拽时的样式 */
[draggable="true"] {
  cursor: move;
  user-select: none;
}

[draggable="true"]:active {
  cursor: grabbing;
}
</style>
