<template>
  <div class="space-y-2">
    <!-- allocate_email: 无参数 -->
    <template v-if="action === 'allocate_email'">
      <div class="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded p-2">
        自动从系统分配一个邮箱地址，结果存入 <code class="text-blue-600">{<!-- -->{email}}</code> 变量
      </div>
    </template>

    <!-- wait_email_code: 最长等待秒数 -->
    <template v-if="action === 'wait_email_code'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">最长等待</label>
        <input
          :value="params.max_wait_seconds || 120"
          @input="update('max_wait_seconds', Number($event.target.value))"
          type="number"
          min="30"
          max="300"
          class="w-28 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        />
        <span class="text-xs text-gray-400">秒</span>
      </div>
      <div class="text-xs text-gray-400">系统收到邮件后自动通知，提取验证码存入 <code>{<!-- -->{email_code}}</code></div>
    </template>

    <!-- solve_captcha: 验证码元素选择器 -->
    <template v-if="action === 'solve_captcha'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">验证码元素</label>
        <input
          :value="params.selector || ''"
          @input="update('selector', $event.target.value)"
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="验证码图片的 CSS 选择器"
        />
      </div>
      <div class="text-xs text-gray-400">OCR 识别结果存入 <code>{<!-- -->{captcha_text}}</code> 变量</div>
    </template>

    <!-- get_phone_number: 国家代码 -->
    <template v-if="action === 'get_phone_number'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">国家代码</label>
        <input
          :value="params.country_code || '+86'"
          @input="update('country_code', $event.target.value)"
          class="w-28 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
          placeholder="+86"
        />
      </div>
      <div class="text-xs text-gray-400">从短信平台获取手机号，存入 <code>{<!-- -->{phone}}</code> 变量</div>
    </template>

    <!-- wait_sms_code: 最长等待 -->
    <template v-if="action === 'wait_sms_code'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 w-16 shrink-0">最长等待</label>
        <input
          :value="params.max_wait_seconds || 120"
          @input="update('max_wait_seconds', Number($event.target.value))"
          type="number"
          min="30"
          max="300"
          class="w-28 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 focus:bg-white focus:border-primary-400 focus:outline-none"
        />
        <span class="text-xs text-gray-400">秒</span>
      </div>
      <div class="text-xs text-gray-400">等待短信验证码，存入 <code>{<!-- -->{sms_code}}</code> 变量</div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  action: { type: String, required: true },
  params: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update'])
const update = (key, value) => emit('update', key, value)
</script>
