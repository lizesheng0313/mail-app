<template>
  <ToolLayout
    title="2FA 动态验证码"
    description="输入 Base32 密钥或 otpauth:// 链接，在当前浏览器生成 TOTP 验证码。密钥不会上传或保存。"
  >
    <BaseInput
      v-model="secretInput"
      :type="showSecret ? 'text' : 'password'"
      label="2FA 密钥"
      placeholder="输入 Base32 密钥或 otpauth:// 链接"
      autocomplete="off"
      :error-message="error"
    >
      <template #right-icon>
        <button
          type="button"
          class="text-xs font-medium text-primary-600 hover:text-primary-700"
          @click="showSecret = !showSecret"
        >
          {{ showSecret ? '隐藏' : '显示' }}
        </button>
      </template>
    </BaseInput>

    <div
      class="mt-7 overflow-hidden rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-gray-50 text-gray-900"
    >
      <div class="grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
        <div>
          <p class="text-xs font-semibold tracking-[0.2em] text-primary-700">
            当前验证码
          </p>
          <button
            type="button"
            :disabled="!code"
            class="mt-3 block font-mono text-4xl font-bold tracking-[0.16em] text-gray-900 disabled:cursor-default sm:text-5xl"
            @click="copyCode"
          >
            {{ formattedCode || '--- ---' }}
          </button>
          <p class="mt-3 text-sm text-gray-500">
            {{ code ? (copied ? '已复制验证码' : '点击验证码即可复制') : '输入密钥后自动生成' }}
          </p>
        </div>

        <div
          class="relative flex h-24 w-24 items-center justify-center rounded-full p-2"
          :style="countdownStyle"
        >
          <div
            class="flex h-full w-full flex-col items-center justify-center rounded-full bg-white shadow-sm"
          >
            <strong class="text-2xl text-gray-900">{{ remaining }}</strong>
            <span class="text-[11px] text-gray-500">秒</span>
          </div>
        </div>
      </div>
      <div
        class="grid grid-cols-3 border-t border-primary-100 text-center text-xs text-gray-600"
      >
        <span class="px-3 py-3">{{ algorithmLabel }}</span>
        <span class="border-x border-primary-100 px-3 py-3">{{ digits }} 位</span>
        <span class="px-3 py-3">{{ period }} 秒刷新</span>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseInput from '@/components/BaseInput/index.vue'
import ToolLayout from './ToolLayout.vue'

type TotpConfig = {
  secret: string
  digits: number
  period: number
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512'
}

const route = useRoute()
const router = useRouter()
const secretInput = ref('')
const showSecret = ref(false)
const code = ref('')
const error = ref('')
const copied = ref(false)
const remaining = ref(30)
const digits = ref(6)
const period = ref(30)
const algorithmLabel = ref('SHA-1')
let timer: ReturnType<typeof window.setInterval> | null = null
let generationId = 0

const queryValue = (value: unknown) => {
  if (Array.isArray(value)) return String(value[0] || '').trim()
  return typeof value === 'string' ? value.trim() : ''
}

const getInputFromQuery = () => {
  const otpauth = queryValue(route.query.otpauth)
  if (otpauth) return otpauth

  const secret = queryValue(route.query.secret)
  if (!secret) return ''

  const options = ['digits', 'period', 'algorithm'] as const
  const hasOptions = options.some((key) => queryValue(route.query[key]))
  if (!hasOptions) return secret

  const params = new URLSearchParams({ secret })
  for (const key of options) {
    const value = queryValue(route.query[key])
    if (value) params.set(key, value)
  }
  return `otpauth://totp/2FA?${params.toString()}`
}

const clearSensitiveQuery = async () => {
  const query = { ...route.query }
  const sensitiveKeys = ['secret', 'otpauth', 'digits', 'period', 'algorithm'] as const
  const hasSensitiveQuery = sensitiveKeys.some((key) => key in query)
  if (!hasSensitiveQuery) return

  for (const key of sensitiveKeys) delete query[key]
  await router.replace({ path: route.path, query, hash: route.hash })
}

const formattedCode = computed(() => {
  if (!code.value) return ''
  const splitAt = Math.ceil(code.value.length / 2)
  return `${code.value.slice(0, splitAt)} ${code.value.slice(splitAt)}`
})

const countdownStyle = computed(() => ({
  background: `conic-gradient(#22c55e ${(remaining.value / period.value) * 360}deg, #e5e7eb 0deg)`
}))

const parseConfig = (input: string): TotpConfig => {
  const value = input.trim()
  if (!value) {
    return { secret: '', digits: 6, period: 30, algorithm: 'SHA-1' }
  }

  if (!value.toLowerCase().startsWith('otpauth://')) {
    return { secret: value, digits: 6, period: 30, algorithm: 'SHA-1' }
  }

  const url = new URL(value)
  if (url.hostname.toLowerCase() !== 'totp') {
    throw new Error('目前只支持 TOTP 类型的 otpauth 链接')
  }

  const secret = url.searchParams.get('secret') || ''
  const parsedDigits = Number(url.searchParams.get('digits') || 6)
  const parsedPeriod = Number(url.searchParams.get('period') || 30)
  const requestedAlgorithm = (url.searchParams.get('algorithm') || 'SHA1')
    .toUpperCase()
    .replace('-', '')
  const algorithmMap: Record<string, TotpConfig['algorithm']> = {
    SHA1: 'SHA-1',
    SHA256: 'SHA-256',
    SHA512: 'SHA-512'
  }

  if (!secret) throw new Error('otpauth 链接中没有找到密钥')
  if (![6, 8].includes(parsedDigits)) throw new Error('仅支持 6 位或 8 位验证码')
  if (!Number.isInteger(parsedPeriod) || parsedPeriod < 10 || parsedPeriod > 120) {
    throw new Error('验证码刷新时间必须在 10 至 120 秒之间')
  }
  if (!algorithmMap[requestedAlgorithm]) throw new Error('不支持该验证码加密算法')

  return {
    secret,
    digits: parsedDigits,
    period: parsedPeriod,
    algorithm: algorithmMap[requestedAlgorithm]
  }
}

const decodeBase32 = (secret: string) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const normalized = secret.toUpperCase().replace(/[\s=-]/g, '')
  if (!normalized) throw new Error('请输入有效的 2FA 密钥')

  let bits = 0
  let bitCount = 0
  const bytes: number[] = []
  for (const character of normalized) {
    const value = alphabet.indexOf(character)
    if (value < 0) throw new Error('2FA 密钥格式不正确，应为 Base32 字符')
    bits = (bits << 5) | value
    bitCount += 5
    if (bitCount >= 8) {
      bitCount -= 8
      bytes.push((bits >>> bitCount) & 0xff)
      bits &= (1 << bitCount) - 1
    }
  }
  if (!bytes.length) throw new Error('2FA 密钥长度不足')
  return new Uint8Array(bytes)
}

const generateTotp = async (config: TotpConfig, timestamp: number) => {
  const keyBytes = decodeBase32(config.secret)
  const counter = Math.floor(timestamp / 1000 / config.period)
  const counterBytes = new ArrayBuffer(8)
  const counterView = new DataView(counterBytes)
  counterView.setUint32(0, Math.floor(counter / 0x100000000), false)
  counterView.setUint32(4, counter >>> 0, false)

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: config.algorithm },
    false,
    ['sign']
  )
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes))
  const offset = signature[signature.length - 1] & 0x0f
  const binary =
    (((signature[offset] & 0x7f) << 24) |
      ((signature[offset + 1] & 0xff) << 16) |
      ((signature[offset + 2] & 0xff) << 8) |
      (signature[offset + 3] & 0xff)) >>>
    0
  return String(binary % 10 ** config.digits).padStart(config.digits, '0')
}

const refreshCode = async () => {
  const currentGeneration = ++generationId
  copied.value = false
  error.value = ''
  try {
    const config = parseConfig(secretInput.value)
    digits.value = config.digits
    period.value = config.period
    algorithmLabel.value = config.algorithm
    const currentSeconds = Math.floor(Date.now() / 1000)
    remaining.value = config.period - (currentSeconds % config.period)
    if (!config.secret) {
      code.value = ''
      return
    }
    const nextCode = await generateTotp(config, Date.now())
    if (currentGeneration === generationId) code.value = nextCode
  } catch (err: any) {
    if (currentGeneration !== generationId) return
    code.value = ''
    error.value = err.message || '验证码生成失败'
  }
}

const copyCode = async () => {
  if (!code.value) return
  try {
    await navigator.clipboard.writeText(code.value)
    copied.value = true
  } catch {
    copied.value = false
  }
}

watch(secretInput, () => void refreshCode())

onMounted(() => {
  const initialInput = getInputFromQuery()
  if (initialInput) {
    secretInput.value = initialInput
    void clearSensitiveQuery()
  }
  void refreshCode()
  timer = window.setInterval(() => void refreshCode(), 1000)
})

onBeforeUnmount(() => {
  if (timer !== null) window.clearInterval(timer)
})
</script>
