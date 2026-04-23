<template>
  <div class="space-y-2">
    <!-- generate_password: 密码长度 -->
    <template v-if="action === 'generate_password'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">密码长度</label>
        <input
          :value="params.length || 12"
          @input="update('length', Number($event.target.value))"
          type="number"
          min="8"
          max="32"
          class="w-28 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        />
      </div>
      <div class="text-xs text-gray-400">结果存入 <code>{<!-- -->{password}}</code> 变量</div>
    </template>

    <!-- generate_username: 前缀+长度 -->
    <template v-if="action === 'generate_username'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">前缀</label>
        <input
          :value="params.prefix || ''"
          @input="update('prefix', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="可选，如 user_"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">长度</label>
        <input
          :value="params.length || 8"
          @input="update('length', Number($event.target.value))"
          type="number"
          min="4"
          max="20"
          class="w-28 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        />
      </div>
      <div class="text-xs text-gray-400">结果存入 <code>{<!-- -->{username}}</code> 变量</div>
    </template>

    <!-- replan: 重新分析页面 -->
    <template v-if="action === 'replan'">
      <div class="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded p-2">
        重新分析当前页面 DOM，AI 自动生成后续操作步骤。用于多页表单、弹窗、动态加载场景。
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">提示</label>
        <input
          :value="params.hint || ''"
          @input="update('hint', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="给 AI 的上下文提示，如：已点击下一步"
        />
      </div>
    </template>

    <!-- http_request -->
    <template v-if="action === 'http_request'">
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
        <label class="text-xs text-gray-500 w-16 shrink-0">方法</label>
        <select
          :value="params.method || 'GET'"
          @change="update('method', $event.target.value)"
          class="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        >
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>DELETE</option>
        </select>
      </div>
    </template>

    <!-- set_variable -->
    <template v-if="action === 'set_variable'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">变量名</label>
        <input
          :value="params.variable_name"
          @input="update('variable_name', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">值</label>
        <input
          :value="params.value"
          @input="update('value', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="支持 {{变量名}} 引用"
        />
      </div>
    </template>

    <!-- log -->
    <template v-if="action === 'log'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">消息</label>
        <input
          :value="params.message"
          @input="update('message', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="日志内容"
        />
      </div>
    </template>

    <!-- delay: 延迟秒数 -->
    <template v-if="action === 'delay'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">等待时间</label>
        <input
          :value="params.seconds || 1"
          @input="update('seconds', Number($event.target.value))"
          type="number"
          min="0.1"
          max="300"
          step="0.1"
          class="w-28 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        />
        <span class="text-xs text-gray-400">秒</span>
      </div>
    </template>

    <!-- condition: 条件判断 -->
    <template v-if="action === 'condition'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">条件值</label>
        <input
          :value="params.condition"
          @input="update('condition', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="要判断的值，支持 {{变量名}}"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">运算符</label>
        <select
          :value="params.operator || '=='"
          @change="update('operator', $event.target.value)"
          class="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="==">等于 (==)</option>
          <option value="!=">不等于 (!=)</option>
          <option value=">">大于 (>)</option>
          <option value="<">小于 (&lt;)</option>
          <option value=">=">大于等于 (>=)</option>
          <option value="<=">小于等于 (&lt;=)</option>
          <option value="contains">包含</option>
          <option value="not_contains">不包含</option>
          <option value="is_empty">为空</option>
          <option value="not_empty">不为空</option>
        </select>
      </div>
      <div v-if="!['is_empty','not_empty'].includes(params.operator)" class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">比较值</label>
        <input
          :value="params.value"
          @input="update('value', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="要比较的值"
        />
      </div>
    </template>

    <!-- json_parse: JSON 解析 -->
    <template v-if="action === 'json_parse'">
      <div class="flex items-start gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0 mt-1.5">JSON</label>
        <textarea
          :value="params.json_string"
          @input="update('json_string', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none min-h-[50px]"
          placeholder="JSON 字符串，支持 {{变量名}}"
        ></textarea>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">提取路径</label>
        <input
          :value="params.path"
          @input="update('path', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="data.items.0.name（用 . 分隔）"
        />
      </div>
    </template>

    <!-- text_process: 文本处理 -->
    <template v-if="action === 'text_process'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">操作</label>
        <select
          :value="params.operation || 'trim'"
          @change="update('operation', $event.target.value)"
          class="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="concat">拼接</option>
          <option value="replace">替换</option>
          <option value="split">分割</option>
          <option value="substring">截取</option>
          <option value="regex_match">正则匹配</option>
          <option value="upper">转大写</option>
          <option value="lower">转小写</option>
          <option value="trim">去空格</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">输入文本</label>
        <input
          :value="params.input"
          @input="update('input', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="支持 {{变量名}}"
        />
      </div>
      <div v-if="['concat','replace','split','substring','regex_match'].includes(params.operation)" class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">参数1</label>
        <input
          :value="params.param1"
          @input="update('param1', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          :placeholder="textParam1Hint"
        />
      </div>
      <div v-if="['replace','substring'].includes(params.operation)" class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">参数2</label>
        <input
          :value="params.param2"
          @input="update('param2', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          :placeholder="params.operation === 'replace' ? '替换为' : '结束位置'"
        />
      </div>
    </template>

    <!-- math_calc: 数学计算 -->
    <template v-if="action === 'math_calc'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">运算</label>
        <select
          :value="params.operation || 'add'"
          @change="update('operation', $event.target.value)"
          class="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="add">加法</option>
          <option value="subtract">减法</option>
          <option value="multiply">乘法</option>
          <option value="divide">除法</option>
          <option value="power">幂运算</option>
          <option value="random">随机数</option>
          <option value="round">四舍五入</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">值1</label>
        <input
          :value="params.value1"
          @input="update('value1', Number($event.target.value))"
          type="number"
          class="w-28 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">值2</label>
        <input
          :value="params.value2"
          @input="update('value2', Number($event.target.value))"
          type="number"
          class="w-28 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        />
      </div>
    </template>

    <!-- datetime: 日期时间 -->
    <template v-if="action === 'datetime'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">操作</label>
        <select
          :value="params.operation || 'now'"
          @change="update('operation', $event.target.value)"
          class="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="now">当前时间</option>
          <option value="format">格式化</option>
          <option value="add_days">加天数</option>
          <option value="add_hours">加小时</option>
          <option value="timestamp">时间戳</option>
        </select>
      </div>
      <div v-if="['now','format','add_days','add_hours'].includes(params.operation || 'now')" class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">格式</label>
        <input
          :value="params.format || '%Y-%m-%d %H:%M:%S'"
          @input="update('format', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="%Y-%m-%d %H:%M:%S"
        />
      </div>
      <div v-if="['add_days','add_hours'].includes(params.operation)" class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">增加值</label>
        <input
          :value="params.value || 0"
          @input="update('value', Number($event.target.value))"
          type="number"
          class="w-28 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        />
      </div>
    </template>

    <!-- array_operate: 数组操作 -->
    <template v-if="action === 'array_operate'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">操作</label>
        <select
          :value="params.operation || 'length'"
          @change="update('operation', $event.target.value)"
          class="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        >
          <option value="length">长度</option>
          <option value="get_item">取元素</option>
          <option value="join">合并</option>
          <option value="slice">切片</option>
          <option value="filter">筛选</option>
          <option value="map">映射字段</option>
        </select>
      </div>
      <div class="flex items-start gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0 mt-1.5">数组</label>
        <textarea
          :value="typeof params.array === 'string' ? params.array : JSON.stringify(params.array || [])"
          @input="update('array', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none min-h-[40px]"
          placeholder='["a","b","c"] 或 {{变量名}}'
        ></textarea>
      </div>
      <div v-if="['get_item','join','slice','filter','map'].includes(params.operation)" class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">参数</label>
        <input
          :value="params.param"
          @input="update('param', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          :placeholder="arrayParamHint"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  action: { type: String, required: true },
  params: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update'])
const update = (key, value) => emit('update', key, value)

const textParam1Hint = computed(() => {
  const map = {
    concat: '拼接内容',
    replace: '要替换的文本',
    split: '分隔符',
    substring: '起始位置',
    regex_match: '正则表达式',
  }
  return map[props.params?.operation] || '参数'
})

const arrayParamHint = computed(() => {
  const map = {
    get_item: '索引（从 0 开始）',
    join: '连接符（默认逗号）',
    slice: '范围（如 0:3）',
    filter: '要保留的值',
    map: '要提取的字段名',
  }
  return map[props.params?.operation] || '参数'
})
</script>
