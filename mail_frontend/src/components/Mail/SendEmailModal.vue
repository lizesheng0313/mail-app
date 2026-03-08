<template>
  <BaseModal
    v-model="localVisible"
    title="批量发送邮件"
    size="lg"
    :confirmLoading="sending"
    :showConfirm="isDesktop"
    :confirmText="isDesktop ? '发送' : '请在桌面端使用'"
    @confirm="handleSend"
    @close="handleClose"
  >
    <div class="space-y-4">
      <!-- 发件邮箱选择 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">发件邮箱</label>
        <select
          v-model="form.mailboxId"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          :disabled="!!presetMailboxId"
        >
          <option value="">请选择发件邮箱</option>
          <option 
            v-for="mailbox in smtpVerifiedMailboxes" 
            :key="mailbox.id" 
            :value="mailbox.id"
          >
            {{ mailbox.email }}
          </option>
        </select>
        <!-- 没有可用邮箱的提示 -->
        <p v-if="smtpVerifiedMailboxes.length === 0 && mailboxes.length > 0" class="mt-2 text-sm text-amber-600">
          ⚠️ 没有可用于发送的邮箱。您的邮箱可能使用了不同的 SMTP 授权码。
        </p>
        <!-- 显示不可用的邮箱 -->
        <div v-if="unverifiedMailboxes.length > 0" class="mt-2">
          <p class="text-xs text-gray-500 mb-1">以下邮箱 SMTP 未验证，无法发送：</p>
          <div class="flex flex-wrap gap-1">
            <span 
              v-for="mailbox in unverifiedMailboxes" 
              :key="mailbox.id"
              class="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded"
            >
              {{ mailbox.email }}
            </span>
          </div>
        </div>
      </div>

      <!-- 收件人 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          收件人 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.to"
          type="text"
          placeholder="多个收件人用逗号分隔"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <!-- 抄送 -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">抄送 (CC)</label>
          <input
            v-model="form.cc"
            type="text"
            placeholder="多个用逗号分隔"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">密送 (BCC)</label>
          <input
            v-model="form.bcc"
            type="text"
            placeholder="多个用逗号分隔"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <!-- 主题 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          主题 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.subject"
          type="text"
          placeholder="请输入邮件主题"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <!-- 正文 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          正文 <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="form.content"
          rows="8"
          placeholder="请输入邮件正文..."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
        ></textarea>
      </div>

      <!-- 提示信息 -->
      <div v-if="isDesktop" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div class="flex items-start">
          <svg class="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm text-blue-700">
            邮件将通过您选择的第三方邮箱 SMTP 服务器发送，请确保邮箱已正确配置授权码。
          </p>
        </div>
      </div>
      <div v-else class="mt-2 flex items-center text-xs text-amber-600 gap-2">
        <span>第三方发件功能仅支持桌面端，请下载桌面客户端使用。</span>
        <button
          type="button"
          class="px-2 py-0.5 text-xs rounded border border-primary-500 text-primary-600 hover:bg-primary-50"
          @click="downloadDesktop"
        >
          下载桌面端
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { isTauri } from '@/services/api'
import BaseModal from '@/components/BaseModal/index.vue'
import batchLoginAPI from '@/api/batchLogin'
import { showMessage } from '@/utils/message'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  // 预设的邮箱ID（如果有的话）
  presetMailboxId: {
    type: Number,
    default: null
  },
  // 可用的邮箱列表
  mailboxes: {
    type: Array,
    default: () => []
  },
  // 回复邮件时预填充的收件人
  replyTo: {
    type: String,
    default: ''
  },
  // 回复邮件时预填充的主题
  replySubject: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'sent'])

const isDesktop = computed(() => isTauri())
const sendDisabled = computed(() => !isDesktop.value)

// 本地 visible 值，用于 v-model
const localVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 已验证 SMTP 的邮箱列表（可用于发送）
const smtpVerifiedMailboxes = computed(() => {
  return props.mailboxes.filter((m) => m.smtp_verified === true)
})

// 未验证 SMTP 的邮箱列表
const unverifiedMailboxes = computed(() => {
  return props.mailboxes.filter((m) => m.smtp_verified !== true)
})

const sending = ref(false)

const form = ref({
  mailboxId: null,
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  content: ''
})

// 监听 visible 变化，初始化表单
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 打开时初始化（只使用已验证 SMTP 的邮箱）
    const verifiedMailboxes = props.mailboxes.filter((m) => m.smtp_verified === true)
    form.value = {
      mailboxId: props.presetMailboxId || (verifiedMailboxes.length === 1 ? verifiedMailboxes[0].id : null),
      to: props.replyTo || '',
      cc: '',
      bcc: '',
      subject: props.replySubject ? `Re: ${props.replySubject}` : '',
      content: ''
    }
  }
})

const handleClose = () => {
  emit('update:visible', false)
}

const downloadDesktop = () => {
  window.location.href = 'https://zjkdongao.cn/download'
}

const handleSend = async () => {
  if (!isDesktop.value) {
    showMessage('第三方发件功能仅支持桌面端，请下载桌面客户端使用', 'warning')
    return
  }
  // 验证表单
  if (!form.value.mailboxId) {
    showMessage('请选择发件邮箱', 'error')
    return
  }
  if (!form.value.to.trim()) {
    showMessage('请输入收件人地址', 'error')
    return
  }
  if (!form.value.subject.trim()) {
    showMessage('请输入邮件主题', 'error')
    return
  }
  if (!form.value.content.trim()) {
    showMessage('请输入邮件正文', 'error')
    return
  }

  // 简单的邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const recipients = form.value.to.split(',').map(e => e.trim()).filter(e => e)
  const invalidEmails = recipients.filter(e => !emailRegex.test(e))
  if (invalidEmails.length > 0) {
    showMessage(`收件人邮箱格式不正确: ${invalidEmails.join(', ')}`, 'error')
    return
  }

  sending.value = true

  try {
    const response = await batchLoginAPI.sendEmail(form.value.mailboxId, {
      to: form.value.to,
      subject: form.value.subject,
      content: form.value.content,
      cc: form.value.cc || null,
      bcc: form.value.bcc || null
    })

    if (response.code === 0) {
      showMessage('邮件发送成功', 'success')
      emit('sent')
      handleClose()
    }
  } catch (error) {
    console.error('发送失败:', error)
  } finally {
    sending.value = false
  }
}
</script>
