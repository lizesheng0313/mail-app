<template>
  <Teleport to="body">
    <div
      v-if="current"
      class="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6 backdrop-blur-[1px]"
    >
      <section
        ref="cardRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`important-notice-title-${current.id}`"
        :aria-describedby="`important-notice-content-${current.id}`"
        class="important-notice-card pointer-events-auto relative my-auto max-h-[calc(100dvh-3rem)] w-full overflow-y-auto rounded-2xl border shadow-2xl"
        :class="presentation.amount !== null ? 'max-w-[420px]' : 'max-w-[520px]'"
      >
        <div class="flex items-center gap-3 px-6 pt-6 sm:px-7">
          <div
            class="important-notice-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          >
            <svg
              v-if="presentation.effect === 'coins'"
              class="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <ellipse cx="12" cy="7" rx="7" ry="3.5" />
              <path
                d="M5 7v5c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5V7M5 12v5c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5v-5"
              />
            </svg>
            <svg
              v-else
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.7"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8 12h8m-8 4h5M5 4h14a2 2 0 012 2v14l-4-2-5 2-5-2-4 2V6a2 2 0 012-2z"
              />
            </svg>
          </div>
          <div class="min-w-0 flex-1 text-left">
            <p class="important-notice-muted text-xs font-medium">
              {{ presentation.eyebrow }}
            </p>
            <h2
              :id="`important-notice-title-${current.id}`"
              class="mt-0.5 text-lg font-semibold leading-6"
            >
              {{ presentation.title }}
            </h2>
          </div>
        </div>

        <div
          v-if="presentation.amount !== null"
          ref="coinOriginRef"
          class="important-notice-amount-panel mx-6 mt-6 rounded-xl border px-5 py-5 text-center sm:mx-7"
        >
          <div class="important-notice-secondary text-xs font-medium">
            {{ t('importantNotifications.received') }}
          </div>
          <div class="important-notice-amount mt-1 flex items-baseline justify-center gap-1.5">
            <span class="text-lg font-semibold">+</span>
            <strong class="text-[40px] font-bold leading-tight tracking-tight">{{
              presentation.amount
            }}</strong>
            <span class="text-sm font-medium">{{ t('importantNotifications.coinUnit') }}</span>
          </div>
          <span
            class="important-notice-badge mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
          >
            <span class="important-notice-dot h-1.5 w-1.5 rounded-full"></span>
            {{ t('importantNotifications.deposited') }}
          </span>
        </div>

        <p
          :id="`important-notice-content-${current.id}`"
          class="important-notice-secondary mx-6 mt-5 whitespace-pre-wrap break-words text-sm leading-6 sm:mx-7"
          :class="presentation.amount !== null ? 'text-center' : 'text-left'"
        >
          {{ presentation.content }}
        </p>

        <label
          v-if="current.notification_type === 'shared_domain_earnings'"
          class="important-notice-secondary mx-6 mt-4 flex cursor-pointer items-center gap-2 text-sm sm:mx-7"
        >
          <input v-model="suppressFutureEarnings" type="checkbox" class="h-4 w-4 accent-primary-600" />
          <span>{{ t('importantNotifications.stopEarningsPrompt') }}</span>
        </label>

        <p
          v-if="errorMessage"
          role="alert"
          class="important-notice-error mx-6 mt-3 text-center text-sm"
        >
          {{ errorMessage }}
        </p>
        <div class="px-6 pb-6 pt-5 sm:px-7">
          <button
            ref="confirmRef"
            type="button"
            class="important-notice-confirm w-full rounded-lg px-5 py-3 text-sm font-semibold transition focus:outline-none"
            @click="acknowledge"
          >
            {{ t('importantNotifications.acknowledge') }}
          </button>
          <p v-if="pending.length > 1" class="important-notice-muted mt-3 text-center text-xs">
            {{ t('importantNotifications.more', { count: pending.length - 1 }) }}
          </p>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import {
  acknowledgeImportantNotification,
  getPendingImportantNotifications
} from '@/api/notification'
import { presentImportantNotification } from '@/config/importantNotifications'

const { t } = useI18n()
const userStore = useUserStore()
const pending = ref([])
const current = computed(() => pending.value[0] || null)
const presentation = computed(() =>
  current.value ? presentImportantNotification(current.value, t) : {}
)
const cardRef = ref(null)
const coinOriginRef = ref(null)
const confirmRef = ref(null)
const acknowledgingIds = new Set()
const errorMessage = ref('')
const suppressFutureEarnings = ref(false)

async function loadPending() {
  const userId = Number(userStore.user?.id || 0)
  if (!userStore.isAuthenticated || !userId) return
  try {
    const response = await getPendingImportantNotifications()
    if (response?.code === 0 && Number(userStore.user?.id || 0) === userId)
      pending.value = response.data?.items || []
  } catch (error) {
    console.warn('加载重要通知失败:', error)
  }
}

function collectCoins() {
  if (
    typeof window === 'undefined' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
    return
  const origin = (coinOriginRef.value || cardRef.value)?.getBoundingClientRect()
  const destination = document
    .querySelector('[data-important-notification-target="account"]')
    ?.getBoundingClientRect()
  if (!origin || !destination) return

  const startX = origin.left + origin.width / 2
  const startY = origin.top + origin.height / 2
  const deltaX = destination.left + destination.width / 2 - startX
  const deltaY = destination.top + destination.height / 2 - startY
  for (let index = 0; index < 9; index += 1) {
    const coin = document.createElement('span')
    coin.className = 'important-notice-flying-coin'
    coin.style.left = `${startX}px`
    coin.style.top = `${startY}px`
    coin.style.setProperty('--coin-burst-x', `${(index - 4) * 21}px`)
    coin.style.setProperty('--coin-burst-y', `${-35 - (index % 3) * 17}px`)
    coin.style.setProperty('--coin-flight-x', `${deltaX}px`)
    coin.style.setProperty('--coin-flight-y', `${deltaY}px`)
    coin.style.animationDelay = `${index * 55}ms`
    document.body.appendChild(coin)
    coin.addEventListener('animationend', () => coin.remove(), { once: true })
    window.setTimeout(() => coin.remove(), 2000)
  }

  const target = document.querySelector('[data-important-notification-target="account"]')
  window.setTimeout(() => {
    if (!target?.isConnected) return
    target.classList.remove('important-notice-account-pulse')
    // 重新触发连续通知的到账反馈。
    void target.offsetWidth
    target.classList.add('important-notice-account-pulse')
    window.setTimeout(() => target.classList.remove('important-notice-account-pulse'), 550)
  }, 1050)
}

function acknowledge() {
  const notice = current.value
  if (!notice || acknowledgingIds.has(notice.id)) return
  const userId = Number(userStore.user?.id || 0)
  const disableFutureEarnings =
    notice.notification_type === 'shared_domain_earnings' && suppressFutureEarnings.value
  acknowledgingIds.add(notice.id)
  errorMessage.value = ''

  if (presentation.value.effect === 'coins') {
    try {
      collectCoins()
    } catch (animationError) {
      console.warn('收币动画未能播放:', animationError)
    }
  }
  pending.value.shift()
  const skippedEarnings = disableFutureEarnings
    ? pending.value.filter((item) => item.notification_type === 'shared_domain_earnings')
    : []
  if (disableFutureEarnings)
    pending.value = pending.value.filter((item) => item.notification_type !== 'shared_domain_earnings')

  void acknowledgeInBackground(notice, userId, disableFutureEarnings, skippedEarnings)
}

async function acknowledgeInBackground(notice, userId, disableFutureEarnings, skippedEarnings) {
  try {
    const response = await acknowledgeImportantNotification(notice.id, {
      disable_future_earnings_notice: disableFutureEarnings
    })
    if (response?.code !== 0) throw new Error('acknowledge failed')
    if (Number(userStore.user?.id || 0) === userId) {
      window.dispatchEvent(new Event('important-notification:acknowledged'))
      if (disableFutureEarnings)
        window.dispatchEvent(new CustomEvent('shared-earnings-notice:preference-changed', {
          detail: { enabled: false }
        }))
    }
  } catch (error) {
    console.error('确认重要通知失败:', error)
    if (Number(userStore.user?.id || 0) === userId) {
      pending.value.unshift(notice, ...skippedEarnings)
      await nextTick()
      suppressFutureEarnings.value = disableFutureEarnings
      errorMessage.value = t('importantNotifications.retry')
    }
  } finally {
    acknowledgingIds.delete(notice.id)
    if (
      Number(userStore.user?.id || 0) === userId &&
      !pending.value.length &&
      !acknowledgingIds.size
    )
      void loadPending()
  }
}

watch(current, async (notice, previousNotice) => {
  if (notice?.id !== previousNotice?.id) suppressFutureEarnings.value = false
  if (notice) {
    await nextTick()
    confirmRef.value?.focus()
  }
})

watch(
  () => Number(userStore.user?.id || 0),
  (userId, previousId) => {
    if (userId === previousId) return
    pending.value = []
    if (userStore.isAuthenticated && userId > 0) void loadPending()
  },
  { immediate: true }
)
</script>

<style scoped>
.important-notice-card {
  border-color: rgb(var(--color-border-primary));
  background-color: rgb(var(--color-bg-primary));
  color: rgb(var(--color-text-primary));
  animation: notice-enter 0.35s cubic-bezier(0.2, 0.9, 0.2, 1) both;
}
.important-notice-icon {
  background-color: rgb(var(--color-primary-50));
  color: rgb(var(--color-primary-700));
}
.important-notice-muted {
  color: rgb(var(--color-text-tertiary));
}
.important-notice-secondary {
  color: rgb(var(--color-text-secondary));
}
.important-notice-amount-panel {
  border-color: rgb(var(--color-primary-200));
  background-color: rgb(var(--color-primary-50));
}
.important-notice-amount,
.important-notice-badge {
  color: rgb(var(--color-primary-800));
}
.important-notice-badge {
  background-color: rgb(var(--color-primary-100));
}
.important-notice-dot {
  background-color: rgb(var(--color-primary-500));
}
.important-notice-error {
  color: rgb(var(--color-danger-600));
}
.important-notice-confirm {
  background-color: rgb(var(--color-primary-600));
  color: rgb(var(--color-bg-primary));
}
.important-notice-confirm:hover {
  background-color: rgb(var(--color-primary-700));
}
.important-notice-confirm:focus-visible {
  box-shadow: 0 0 0 3px rgb(var(--color-primary-500) / 35%);
}
@keyframes notice-enter {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .important-notice-card {
    animation: none;
  }
}
</style>

<style>
.important-notice-flying-coin {
  position: fixed;
  z-index: 140;
  width: 26px;
  height: 26px;
  border: 2px solid #d49520;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff5af 0, #f9d86a 42%, #e6a833 100%);
  box-shadow: 0 2px 9px rgb(189 128 20 / 35%);
  pointer-events: none;
  opacity: 0;
  animation: important-notice-coin-flight 1.15s cubic-bezier(0.2, 0.65, 0.24, 1) both;
}
.important-notice-flying-coin::after {
  position: absolute;
  inset: 5px;
  border: 1px solid #b97813;
  border-radius: 50%;
  content: '';
}
.important-notice-account-pulse {
  animation: important-notice-account-pulse 0.5s ease-out;
}
@keyframes important-notice-coin-flight {
  0% {
    transform: translate(-50%, -50%) scale(0.35);
    opacity: 0;
  }
  20% {
    transform: translate(calc(-50% + var(--coin-burst-x)), calc(-50% + var(--coin-burst-y)))
      scale(1);
    opacity: 1;
  }
  65% {
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--coin-flight-x)), calc(-50% + var(--coin-flight-y)))
      scale(0.3);
    opacity: 0;
  }
}
@keyframes important-notice-account-pulse {
  50% {
    transform: scale(1.14);
  }
}
@media (prefers-reduced-motion: reduce) {
  .important-notice-flying-coin,
  .important-notice-account-pulse {
    animation: none;
  }
}
</style>
