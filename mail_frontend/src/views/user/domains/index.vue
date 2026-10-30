<template>
  <div class="flex h-full min-h-0 flex-col gap-2">
    <section
      class="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-white px-4 py-2.5 shadow-sm"
      :aria-label="t('domainsPage.earningsTitle')"
    >
      <h2
        class="text-sm font-semibold text-black"
        :title="t('domainsPage.earningsDescription')"
      >
        {{ t('domainsPage.earningsTitle') }}
      </h2>
      <p class="sr-only">{{ t('domainsPage.earningsDescription') }}</p>
      <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <div class="whitespace-nowrap">
          <span class="text-gray-500">{{ t('domainsPage.yesterdayEarnings') }}</span>
          <strong class="ml-2 tabular-nums text-primary-700">{{ formatEarnings(earningsSummary?.yesterday_income) }}</strong>
        </div>
        <div class="whitespace-nowrap">
          <span class="text-gray-500">{{ t('domainsPage.totalEarnings') }}</span>
          <strong class="ml-2 tabular-nums text-primary-700">{{ formatEarnings(earningsSummary?.total_income) }}</strong>
        </div>
      </div>
      <div class="ml-auto flex items-center gap-2" :title="t('domainsPage.earningsPromptHelp')">
        <span class="text-xs text-gray-500">{{ t('domainsPage.earningsPromptLabel') }}</span>
        <p id="domain-earnings-prompt-help" class="sr-only">{{ t('domainsPage.earningsPromptHelp') }}</p>
        <button
          type="button"
          role="switch"
          :aria-checked="earningsPromptEnabled"
          :aria-label="t('domainsPage.earningsPromptLabel')"
          aria-describedby="domain-earnings-prompt-help"
          :disabled="!earningsPreferenceLoaded || earningsPreferenceSaving"
          class="relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50"
          :class="earningsPromptEnabled ? 'bg-primary-600' : 'bg-gray-300'"
          @click="toggleEarningsPrompt"
        >
          <span
            class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
            :class="earningsPromptEnabled ? 'translate-x-4' : ''"
          ></span>
        </button>
      </div>
    </section>

    <AdminDataTable
      class="min-h-0 flex-1"
      :fill-empty-height="!domains.length"
      :loading="loading"
      :column-count="6"
      :pagination="pagination"
      :show-page-size-selector="true"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    >
      <template #header>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div class="order-last flex min-w-0 basis-full items-center gap-2 sm:order-none sm:basis-auto">
            <div class="min-w-0 flex-1 sm:w-56 sm:flex-none">
              <BaseInput
                v-model="searchQuery"
                :placeholder="t('domainsPage.searchPlaceholder')"
                :aria-label="t('domainsPage.searchPlaceholder')"
                size="sm"
                @enter="applyFilters"
              >
                <template #left-icon>
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </template>
              </BaseInput>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              @click="applyFilters"
            >
              {{ t('domainsPage.query') }}
            </button>
          </div>
          <button
            type="button"
            class="ml-auto shrink-0 rounded-md bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
            @click="openCreateModal"
          >
            {{ t('domainsPage.addDomain') }}
          </button>
        </div>
      </template>
      <template #thead>
        <tr>
          <th class="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">
            {{ t('domainsPage.domain') }}
          </th>
          <th class="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">
            {{ t('domainsPage.description') }}
          </th>
          <th class="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">
            {{ t('domainsPage.status') }}
          </th>
          <th class="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">
            {{ t('domainsPage.createdAt') }}
          </th>
          <th class="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">
            {{ t('domainsPage.expiresAt') }}
          </th>
          <th class="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">
            {{ t('domainsPage.actions') }}
          </th>
        </tr>
      </template>

      <template #tbody>
        <tr v-for="domain in domains" :key="domain.id" class="hover:bg-gray-50">
          <td class="px-4 py-2.5 whitespace-nowrap">
            <div class="flex items-center">
              <div v-if="isDomainDeleted(domain) || isDomainExpired(domain)" class="mr-2">
                <svg
                  class="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div
                :class="
                  isDomainDeleted(domain) || isDomainExpired(domain)
                    ? 'text-red-600 line-through'
                    : 'text-black'
                "
                class="text-sm font-medium"
              >
                {{ domain.domain_name }}
              </div>
            </div>
          </td>
          <td class="px-4 py-2.5 whitespace-nowrap text-sm text-black">
            {{ domain.display_name || '-' }}
          </td>
          <td class="px-4 py-2.5 whitespace-nowrap">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                v-if="isDomainDeleted(domain)"
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit bg-red-100 text-red-800"
              >
                {{ t('domainsPage.deleted') }}
              </span>
              <span
                v-else-if="String(domain.status || '').toLowerCase() === 'verified'"
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit bg-primary-100 text-success-800"
              >
                {{ t('domainsPage.verified') }}
              </span>
              <span
                v-else-if="String(domain.status || '').toLowerCase() === 'disabled'"
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit bg-red-100 text-red-800"
              >
                {{ t('domainsPage.disabled') }}
              </span>
              <span
                v-else
                :class="getVerificationClass(domain.status)"
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit"
              >
                {{ getVerificationLabel(domain.status) }}
              </span>
              <span
                v-if="Boolean(domain.is_public)"
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800 w-fit"
              >
                {{ t('domainsPage.publicDomainBadge') }}
              </span>
              <button
                v-else-if="
                  !isDomainDeleted(domain) &&
                  !isDomainExpired(domain) &&
                  String(domain.status || '').toLowerCase() === 'verified'
                "
                type="button"
                class="w-fit text-left text-xs font-medium text-emerald-700 hover:text-emerald-800"
                @click="openEditModal(domain)"
              >
                {{ t('domainsPage.joinSharedPlanBadge') }}
              </button>
              <span
                v-if="!isDomainDeleted(domain) && isDomainExpired(domain)"
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800 w-fit"
              >
                {{ t('domainsPage.expired') }}
              </span>
            </div>
          </td>
          <td class="px-4 py-2.5 whitespace-nowrap text-sm text-black">
            {{ formatDate(domain.created_at) }}
          </td>
          <td class="px-4 py-2.5 whitespace-nowrap text-sm">
            <span
              v-if="domain.expires_at"
              :class="isDomainExpired(domain) ? 'text-red-600 font-medium' : 'text-black'"
            >
              {{ formatDateOnly(domain.expires_at) }}
            </span>
            <span v-else class="text-black">-</span>
          </td>
          <td class="px-4 py-2.5 whitespace-nowrap text-sm">
            <div class="flex items-center space-x-2">
              <ActionButton
                v-if="
                  !isDomainDeleted(domain) &&
                  String(domain.status || '').toLowerCase() !== 'verified'
                "
                icon="eye"
                tooltip="详情"
                variant="view"
                @click="openVerifyModal(domain)"
              />
              <ActionButton
                v-if="
                  !isDomainDeleted(domain) &&
                  String(domain.status || '').toLowerCase() === 'verified'
                "
                icon="edit"
                :tooltip="t('domainsPage.edit')"
                variant="edit"
                @click="openEditModal(domain)"
              />
              <ActionButton
                :icon="String(domain.status || '').toLowerCase() === 'verified' ? 'disable' : 'enable'"
                :tooltip="String(domain.status || '').toLowerCase() === 'verified' ? t('domainsPage.disable') : t('domainsPage.enable')"
                :variant="String(domain.status || '').toLowerCase() === 'verified' ? 'disable' : 'enable'"
                v-if="
                  !isDomainDeleted(domain) &&
                  ['verified', 'disabled'].includes(String(domain.status || '').toLowerCase())
                "
                @click="toggleDomain(domain)"
              />
              <ActionButton
                icon="delete"
                :tooltip="t('domainsPage.delete')"
                variant="delete"
                @click="openDeleteDialog(domain)"
              />
            </div>
          </td>
        </tr>

        <tr v-if="!domains.length">
          <td colspan="6" class="px-6 py-12 text-center text-black">
            {{ t('domainsPage.empty') }}
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <BaseModal
      v-model="showDomainModal"
      :title="domainModalTitle"
      :show-close="true"
      :show-footer="!domainModalDetail"
      :show-confirm="!domainModalDetail"
      :show-cancel="!domainModalDetail"
      :confirm-text="creatingDomain ? t('domainsPage.creating') : t('domainsPage.addDomain')"
      :confirm-loading="creatingDomain"
      :confirm-disabled="
        creatingDomain ||
        !createForm.domain_name.trim() ||
        (createForm.admin_verification_enabled && !adminQuickBindSessionToken.trim())
      "
      size="lg"
      @confirm="handleCreateDomain"
      @close="closeDomainModal"
      @cancel="closeDomainModal"
    >
      <div v-if="!domainModalDetail" class="space-y-4">
        <BaseInput
          v-model="createForm.domain_name"
          :label="t('domainsPage.domain')"
          placeholder="example.com"
        />
        <BaseInput
          v-model="createForm.display_name"
          :label="t('domainsPage.description')"
          :placeholder="t('domainsPage.optional')"
        />
        <BaseInput
          v-model="createForm.expires_at"
          :label="t('domainsPage.expiresAt')"
          type="date"
          size="lg"
          auto-show-picker
        />
        <CatchAllSettingCard
          :enabled="createForm.catch_all_enabled"
          @update:enabled="createForm.catch_all_enabled = $event"
        />
        <label
          :class="createForm.is_public ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'"
          class="flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3"
        >
          <input
            v-model="createForm.is_public"
            type="checkbox"
            class="mt-1 h-4 w-4 accent-primary-600"
          />
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 text-sm font-medium text-black">
              <span>{{ t('domainsPage.publicDomainLabel') }}</span>
              <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                {{ t('domainsPage.sharedPlanRateBadge') }}
              </span>
            </div>
            <p class="mt-1 text-xs leading-5 text-gray-500">
              {{ t('domainsPage.publicDomainHelp') }}
            </p>
          </div>
        </label>
      </div>

      <div v-else class="space-y-6">
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="text-base font-semibold text-black">
                  {{ domainModalDetail.domain.domain_name }}
                </div>
                <span
                  :class="getVerificationClass(domainModalDetail.domain.status)"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ getVerificationLabel(domainModalDetail.domain.status) }}
                </span>
              </div>
            </div>
            <button
              v-if="String(domainModalDetail.domain.status || '').toLowerCase() !== 'verified'"
              class="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm disabled:opacity-50"
              :disabled="refreshingDomainId === domainModalDetail.domain.id"
              @click="refreshDns(domainModalDetail.domain.id)"
            >
              <span
                v-if="refreshingDomainId === domainModalDetail.domain.id"
                class="inline-flex items-center gap-2"
              >
                验证中
                <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
              </span>
              <span v-else>立即验证DNS</span>
            </button>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-black mb-3">DNS 配置</h3>
          <p class="mb-3 text-xs text-gray-500">
            {{ domainModalDetail.dns_zone ? t('dnsDiagnosis.zone', { zone: domainModalDetail.dns_zone }) : t('dnsDiagnosis.zoneUnknown') }}
          </p>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[800px] table-fixed divide-y divide-gray-200 text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th class="w-[19%] pb-3 pr-4 font-medium">主机记录</th>
                  <th class="w-[9%] pb-3 pr-4 font-medium">记录类型</th>
                  <th class="w-[24%] pb-3 pr-4 font-medium">值</th>
                  <th class="w-[8%] pb-3 pr-4 font-medium">优先级</th>
                  <th class="w-[14%] pb-3 pr-4 font-medium">状态</th>
                  <th class="w-[26%] pb-3 font-medium">{{ t('dnsDiagnosis.aiAdvice') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  v-for="record in domainModalDetail.dns_instructions || []"
                  :key="[
                    record.record_type,
                    record.record_host,
                    record.record_name,
                    record.record_value,
                    record.priority
                  ].join('|')"
                >
                  <td class="py-3 pr-4 align-top">
                    <div class="flex items-center gap-2">
                      <div class="min-w-0 flex-1 break-all text-gray-700">
                        {{ formatRecordHost(record) }}
                        <div class="mt-1 text-xs text-gray-500">{{ record.record_name }}</div>
                      </div>
                      <ActionButton
                        icon="copy"
                        tooltip="复制主机记录"
                        variant="copy"
                        size="sm"
                        @click="copyDnsValue(formatRecordHost(record))"
                      />
                    </div>
                  </td>
                  <td class="py-3 pr-4 align-top text-black">{{ record.record_type }}</td>
                  <td class="py-3 pr-4 align-top">
                    <div class="flex items-center gap-2">
                      <div class="min-w-0 flex-1 break-all text-gray-700">{{ record.record_value }}</div>
                      <ActionButton
                        icon="copy"
                        tooltip="复制记录值"
                        variant="copy"
                        size="sm"
                        @click="copyDnsValue(record.record_value)"
                      />
                    </div>
                  </td>
                  <td class="py-3 pr-4 align-top text-gray-700">
                    {{ record.priority ?? '-' }}
                  </td>
                  <td class="py-3 pr-4 align-top">
                    <span
                      :class="dnsStatusClass(getDnsDisplayStatus(record))"
                      class="inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium"
                    >
                      {{ t(`dnsDiagnosis.status.${dnsStatusKey(getDnsDisplayStatus(record))}`) }}
                    </span>
                  </td>
                  <td class="py-3 align-top text-xs leading-5" aria-live="polite">
                    <span v-if="dnsStatusKey(getDnsDisplayStatus(record)) === 'valid'" class="text-gray-400">—</span>
                    <span v-else-if="diagnosingDomainId === domainModalDetail.domain.id" role="status" class="text-gray-500">
                      {{ t('dnsDiagnosis.adviceLoading') }}
                    </span>
                    <p v-else-if="getDnsAdvice(record)" class="whitespace-pre-line break-words text-gray-700">
                      {{ getDnsAdvice(record) }}
                    </p>
                    <span v-else-if="dnsDiagnosisError || dnsDiagnosis" class="text-gray-500">
                      {{ t('dnsDiagnosis.adviceUnavailable') }}
                    </span>
                    <span v-else class="text-gray-400">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      v-model="showEditModal"
      :title="t('domainsPage.editTitle')"
      :show-close="true"
      :show-footer="true"
      :show-confirm="true"
      :show-cancel="true"
      :confirm-text="t('domainsPage.save')"
      :confirm-loading="savingEdit"
      :confirm-disabled="savingEdit"
      size="md"
      @confirm="saveEditDomain"
      @close="closeEditModal"
      @cancel="closeEditModal"
    >
      <div class="space-y-4">
        <BaseInput v-model="editForm.domain_name" :label="t('domainsPage.domain')" disabled />
        <BaseInput
          v-model="editForm.display_name"
          :label="t('domainsPage.description')"
          :placeholder="t('domainsPage.optional')"
        />
        <BaseInput
          v-model="editForm.expires_at"
          :label="t('domainsPage.expiresAt')"
          type="date"
          size="lg"
          auto-show-picker
        />
        <CatchAllSettingCard
          :enabled="editForm.catch_all_enabled"
          @update:enabled="editForm.catch_all_enabled = $event"
        />
        <label
          :class="editForm.is_public ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'"
          class="flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3"
        >
          <input
            v-model="editForm.is_public"
            type="checkbox"
            class="mt-1 h-4 w-4 accent-primary-600"
          />
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 text-sm font-medium text-black">
              <span>{{ t('domainsPage.publicDomainLabel') }}</span>
              <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                {{ t('domainsPage.sharedPlanRateBadge') }}
              </span>
            </div>
            <p class="mt-1 text-xs leading-5 text-gray-500">
              {{ t('domainsPage.publicDomainHelp') }}
            </p>
          </div>
        </label>
      </div>
    </BaseModal>

    <ConfirmDialog
      :visible="showDeleteConfirm"
      :mask="false"
      :title="t('domainsPage.deleteTitle')"
      :message="t('domainsPage.deleteMessage', { name: domainToDelete?.domain_name || '' })"
      :loading="deleting"
      @confirm="confirmDeleteDomain"
      @cancel="showDeleteConfirm = false"
    />

    <BaseModal
      v-model="showAdminQuickBindModal"
      :title="t('domainsPage.adminVerificationPassword')"
      :show-close="true"
      :show-footer="true"
      :show-confirm="true"
      :show-cancel="true"
      :confirm-loading="authorizingAdminQuickBind"
      :confirm-disabled="authorizingAdminQuickBind || !adminQuickBindPassword.trim()"
      size="sm"
      @confirm="confirmAdminQuickBind"
      @close="closeAdminQuickBindModal"
      @cancel="closeAdminQuickBindModal"
    >
      <BaseInput
        v-model="adminQuickBindPassword"
        :placeholder="t('domainsPage.adminVerificationPasswordPlaceholder')"
        type="password"
        autocomplete="current-password"
        @enter="confirmAdminQuickBind"
      />
    </BaseModal>

    <BaseModal
      v-model="showTransferModal"
      title="转让域名给管理员"
      :show-close="true"
      :show-footer="true"
      :show-confirm="true"
      :show-cancel="true"
      :confirm-text="transferringDomains ? '转让中...' : '确认转让'"
      :confirm-loading="transferringDomains"
      :confirm-disabled="transferringDomains || !selectedTransferDomainIds.length || !transferAdminPassword.trim()"
      size="lg"
      @confirm="confirmTransferDomains"
      @close="closeTransferModal"
      @cancel="closeTransferModal"
    >
      <div class="space-y-4">
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          只能转让已验证通过的域名；转让后，这些域名会进入管理员后台域名池，并从当前账号的我的域名中清空。
        </div>
        <label class="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
          <input
            type="checkbox"
            class="h-4 w-4 accent-primary-600"
            :checked="isAllTransferDomainsSelected"
            @change="toggleAllTransferDomains"
          />
          <span class="text-sm font-medium text-gray-900">全选当前域名</span>
          <span class="ml-auto text-sm text-gray-500">
            已选 {{ selectedTransferDomainIds.length }} / {{ transferableDomains.length }}
          </span>
        </label>
        <div class="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
          <label
            v-for="domain in transferableDomains"
            :key="domain.id"
            class="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-gray-50"
          >
            <input
              v-model="selectedTransferDomainIds"
              type="checkbox"
              class="h-4 w-4 accent-primary-600"
              :value="Number(domain.id)"
            />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-gray-900">{{ domain.domain_name }}</span>
              <span class="mt-1 block text-xs text-gray-500">
                过期时间：{{ domain.expires_at ? formatDateOnly(domain.expires_at) : '-' }}
              </span>
            </span>
          </label>
          <div v-if="!transferableDomains.length" class="px-4 py-8 text-center text-sm text-gray-500">
            暂无已验证通过的可转让域名
          </div>
        </div>
        <BaseInput
          v-model="transferAdminPassword"
          label="管理员密码"
          type="password"
          placeholder="输入管理员密码后才允许转让"
        />
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import CatchAllSettingCard from '@/views/user/domains/components/CatchAllSettingCard.vue'
import { dnsRecordKey, dnsStatusClass, dnsStatusKey } from '@/views/user/domains/components/dnsStatus'
import { hostedDomainAPI } from '@/api/hostedDomain'
import {
  getSharedEarningsNoticePreference,
  setSharedEarningsNoticePreference
} from '@/api/notification'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils.js'

const { t } = useI18n()

const loading = ref(false)
const earningsSummary = ref<{ yesterday_income: number; total_income: number } | null>(null)
const earningsPromptEnabled = ref(true)
const earningsPreferenceLoaded = ref(false)
const earningsPreferenceSaving = ref(false)
const formatEarnings = (value: number | undefined) =>
  value === undefined ? '—' : `${Number(value).toFixed(2)} ${t('importantNotifications.coinUnit')}`

const loadEarningsSettings = async () => {
  const [summary, preference] = await Promise.allSettled([
    hostedDomainAPI.getSharedEarningsSummary(),
    getSharedEarningsNoticePreference()
  ])
  if (summary.status === 'fulfilled' && summary.value?.code === 0)
    earningsSummary.value = summary.value.data
  if (preference.status === 'fulfilled' && preference.value?.code === 0) {
    earningsPromptEnabled.value = Boolean(preference.value.data?.enabled)
    earningsPreferenceLoaded.value = true
  }
}

const toggleEarningsPrompt = async () => {
  if (!earningsPreferenceLoaded.value || earningsPreferenceSaving.value) return
  earningsPreferenceSaving.value = true
  const next = !earningsPromptEnabled.value
  try {
    const response: any = await setSharedEarningsNoticePreference(next)
    if (response?.code !== 0) throw new Error('save failed')
    earningsPromptEnabled.value = next
    showMessage(t('domainsPage.earningsPromptSaved'), 'success')
  } catch {
    showMessage(t('domainsPage.earningsPromptSaveFailed'), 'error')
  } finally {
    earningsPreferenceSaving.value = false
  }
}

const onEarningsPreferenceChanged = (event: Event) => {
  earningsPromptEnabled.value = Boolean((event as CustomEvent<{ enabled: boolean }>).detail?.enabled)
}
const deleting = ref(false)
const creatingDomain = ref(false)
const savingEdit = ref(false)
const refreshingDomainId = ref<number | null>(null)
const diagnosingDomainId = ref<number | null>(null)
const dnsDiagnosis = ref<any>(null)
const dnsDiagnosisError = ref(false)
const failedDnsDomainId = ref<number | null>(null)
let diagnosisVersion = 0

const resetDnsDiagnosis = () => {
  diagnosisVersion += 1
  diagnosingDomainId.value = null
  dnsDiagnosis.value = null
  dnsDiagnosisError.value = false
  failedDnsDomainId.value = null
}
const transferringDomains = ref(false)
const authorizingAdminQuickBind = ref(false)

const ADMIN_QUICK_BIND_SESSION_KEY = 'hosted-domain-admin-quick-bind-token'
const getStoredAdminQuickBindToken = () => {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(ADMIN_QUICK_BIND_SESSION_KEY) || ''
}

const searchQuery = ref('')
const domains = ref<any[]>([])
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0
})
const showDomainModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const showTransferModal = ref(false)
const showAdminQuickBindModal = ref(false)
const domainToDelete = ref<any | null>(null)
const domainModalDetail = ref<any | null>(null)
const selectedTransferDomainIds = ref<number[]>([])
const transferAdminPassword = ref('')
const adminQuickBindPassword = ref('')
const adminQuickBindSessionToken = ref(getStoredAdminQuickBindToken())

const getNextYearTodayDateInput = () => {
  const nextYearToday = new Date()
  nextYearToday.setFullYear(nextYearToday.getFullYear() + 1)
  const year = nextYearToday.getFullYear()
  const month = String(nextYearToday.getMonth() + 1).padStart(2, '0')
  const day = String(nextYearToday.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDefaultCreateForm = () => {
  const adminSessionToken = adminQuickBindSessionToken.value.trim()
  return {
    domain_name: '',
    display_name: '',
    expires_at: getNextYearTodayDateInput(),
    catch_all_enabled: true,
    is_public: false,
    admin_verification_enabled: Boolean(adminSessionToken)
  }
}

const createForm = ref({
  ...getDefaultCreateForm()
})

const editForm = ref({
  id: 0,
  domain_name: '',
  display_name: '',
  expires_at: '',
  catch_all_enabled: false,
  is_public: false
})

const domainModalTitle = computed(() =>
  domainModalDetail.value
    ? String(domainModalDetail.value.domain?.verification_mode || '').toLowerCase() === 'mx'
      ? t('domainsPage.mxDetailTitle')
      : t('domainsPage.detailTitle')
    : t('domainsPage.addTitle')
)
const isDomainTransferable = (domain: any) =>
  !isDomainDeleted(domain) &&
  String(domain?.status || '').toLowerCase() === 'verified' &&
  String(domain?.verification_status || domain?.status || '').toLowerCase() === 'verified'

const transferableDomains = computed(() => domains.value.filter(isDomainTransferable))

const selectedTransferableDomainIds = computed(() => {
  const transferableIdSet = new Set(transferableDomains.value.map((item) => Number(item.id)))
  return selectedTransferDomainIds.value.filter((id) => transferableIdSet.has(Number(id)))
})

const isAllTransferDomainsSelected = computed(
  () =>
    transferableDomains.value.length > 0 &&
    selectedTransferableDomainIds.value.length === transferableDomains.value.length
)

const getVerificationLabel = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'verified') return t('domainsPage.verified')
  if (normalized === 'disabled') return t('domainsPage.disabled')
  if (normalized === 'failed') return t('domainsPage.verifyFailed')
  return t('domainsPage.pendingVerify')
}

const getVerificationClass = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'verified') return 'bg-green-100 text-green-700'
  if (normalized === 'disabled') return 'bg-red-100 text-red-700'
  if (normalized === 'failed') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}

const loadDomains = async (targetPage = pagination.value.page) => {
  loading.value = true
  try {
    const response: any = await hostedDomainAPI.listDomains({
      page: targetPage,
      limit: pagination.value.limit,
      search: searchQuery.value.trim() || undefined
    })
    if (response.code === 0 && response.data) {
      domains.value = (response.data.items || []).filter((item: any) => !item?.is_deleted)
      pagination.value = {
        page: Number(response.data.pagination?.page || targetPage || 1),
        limit: Number(response.data.pagination?.limit || pagination.value.limit || 20),
        total: Number(response.data.pagination?.total || 0),
        pages: Number(response.data.pagination?.pages || 0)
      }

      if (!domains.value.length && pagination.value.total > 0 && pagination.value.pages > 0 && pagination.value.page > pagination.value.pages) {
        await loadDomains(pagination.value.pages)
      }
    }
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  resetDnsDiagnosis()
  showDomainModal.value = true
  domainModalDetail.value = null
  createForm.value = getDefaultCreateForm()
}

const closeDomainModal = () => {
  resetDnsDiagnosis()
  showDomainModal.value = false
  domainModalDetail.value = null
  createForm.value = getDefaultCreateForm()
}

const openAdminQuickBindModal = () => {
  adminQuickBindPassword.value = ''
  showAdminQuickBindModal.value = true
}

const closeAdminQuickBindModal = () => {
  showAdminQuickBindModal.value = false
  adminQuickBindPassword.value = ''
}

const confirmAdminQuickBind = async () => {
  const password = adminQuickBindPassword.value.trim()
  if (!password) return
  authorizingAdminQuickBind.value = true
  try {
    const response: any = await hostedDomainAPI.createAdminQuickBindSession({
      admin_password: password
    })
    const token = String(response.data?.token || '').trim()
    if (response.code === 0 && token) {
      adminQuickBindSessionToken.value = token
      window.sessionStorage.setItem(ADMIN_QUICK_BIND_SESSION_KEY, token)
      createForm.value = getDefaultCreateForm()
      domainModalDetail.value = null
      showAdminQuickBindModal.value = false
      adminQuickBindPassword.value = ''
      showDomainModal.value = true
    }
  } finally {
    authorizingAdminQuickBind.value = false
  }
}

const handleCreateDomain = async () => {
  if (!createForm.value.domain_name.trim()) return

  creatingDomain.value = true
  try {
    const response: any = await hostedDomainAPI.createDomain({
      domain_name: createForm.value.domain_name.trim(),
      display_name: createForm.value.display_name.trim() || undefined,
      expires_at_ms: createForm.value.expires_at
        ? toEndOfDayMs(createForm.value.expires_at)
        : undefined,
      catch_all_enabled: createForm.value.catch_all_enabled,
      is_public: createForm.value.is_public,
      admin_session_token: createForm.value.admin_verification_enabled
        ? adminQuickBindSessionToken.value.trim() || undefined
        : undefined
    })
    if (response.code === 0) {
      showMessage(
        createForm.value.is_public
          ? t('domainsPage.sharedCreateSuccess')
          : t('domainsPage.createSuccess'),
        'success'
      )
      applyDomainDetailToModal(response.data, true)
      await loadDomains(1)
    }
  } finally {
    creatingDomain.value = false
  }
}

const getDnsDiagnosisRecord = (record: any) =>
  dnsDiagnosis.value?.records?.find((row: any) => dnsRecordKey(row) === dnsRecordKey(record))
const getDnsDisplayStatus = (record: any) => getDnsDiagnosisRecord(record)?.status || record.status
const getDnsAdvice = (record: any) =>
  dnsDiagnosis.value?.source === 'ai' ? getDnsDiagnosisRecord(record)?.explanation || '' : ''

const applyDomainDetailToModal = (detail: any, _created = false) => {
  if (domainModalDetail.value?.domain?.id !== detail?.domain?.id) resetDnsDiagnosis()
  domainModalDetail.value = detail || null
  showDomainModal.value = true
}

const getModalDomainId = () => Number(domainModalDetail.value?.domain?.id || 0)

const openVerifyModal = async (domain: any) => {
  resetDnsDiagnosis()
  const domainId = Number(domain?.id || 0)
  if (!domainId) return
  loading.value = true
  try {
    const response: any = await hostedDomainAPI.getDomainDetail(domainId)
    if (response.code === 0 && response.data) {
      applyDomainDetailToModal(response.data)
    }
  } finally {
    loading.value = false
  }
}

const formatRecordHost = (record: any) => {
  return String(record?.configuration_host || record?.record_host || '@')
}

const diagnoseDns = async (domainId: number | string) => {
  const numericId = Number(domainId)
  if (failedDnsDomainId.value !== numericId || getModalDomainId() !== numericId || !showDomainModal.value) return
  if (String(domainModalDetail.value?.domain?.status || '').toLowerCase() === 'verified') return
  if (diagnosingDomainId.value === numericId) return
  const version = ++diagnosisVersion
  diagnosingDomainId.value = numericId
  dnsDiagnosis.value = null
  dnsDiagnosisError.value = false
  try {
    const response: any = await hostedDomainAPI.diagnoseDns(numericId)
    if (version !== diagnosisVersion || getModalDomainId() !== numericId || !showDomainModal.value) return
    if (response.code !== 0 || !response.data) throw new Error('diagnosis failed')
    dnsDiagnosis.value = response.data
  } catch {
    if (version === diagnosisVersion && getModalDomainId() === numericId) dnsDiagnosisError.value = true
  } finally {
    if (version === diagnosisVersion) diagnosingDomainId.value = null
  }
}

const refreshDns = async (domainId: number | string) => {
  const numericId = Number(domainId || 0)
  if (!numericId || refreshingDomainId.value) return
  resetDnsDiagnosis()
  const version = diagnosisVersion
  refreshingDomainId.value = numericId
  try {
    const response: any = await hostedDomainAPI.refreshDns(numericId)
    if (response.code === 0 && response.data) {
      if (version === diagnosisVersion && getModalDomainId() === numericId && showDomainModal.value) {
        applyDomainDetailToModal(response.data)
        if (String(response.data.domain?.status || '').toLowerCase() !== 'verified') {
          failedDnsDomainId.value = numericId
          void diagnoseDns(numericId)
        }
      }
      await loadDomains()
    }
  } finally {
    refreshingDomainId.value = null
  }
}

const copyDnsValue = async (value: string) => {
  await navigator.clipboard.writeText(String(value || ''))
  showMessage(t('mail.copied'), 'success')
}

const openEditModal = (domain: any) => {
  editForm.value = {
    id: Number(domain.id),
    domain_name: domain.domain_name || '',
    display_name: domain.display_name || '',
    expires_at: domain.expires_at ? toDateInputValue(domain.expires_at) : '',
    catch_all_enabled: Boolean(domain.catch_all_enabled),
    is_public: Boolean(domain.is_public)
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editForm.value = {
    id: 0,
    domain_name: '',
    display_name: '',
    expires_at: '',
    catch_all_enabled: false,
    is_public: false
  }
}

const saveEditDomain = async () => {
  if (!editForm.value.id) return
  savingEdit.value = true
  try {
    const response: any = await hostedDomainAPI.updateDomain(editForm.value.id, {
      display_name: editForm.value.display_name.trim() || null,
      expires_at_ms: editForm.value.expires_at ? toEndOfDayMs(editForm.value.expires_at) : null,
      catch_all_enabled: editForm.value.catch_all_enabled,
      is_public: editForm.value.is_public
    })
    if (response.code === 0) {
      showMessage(
        editForm.value.is_public
          ? t('domainsPage.sharedEnabledSuccess')
          : t('domainsPage.updateSuccess'),
        'success'
      )
      closeEditModal()
      await loadDomains()
    }
  } finally {
    savingEdit.value = false
  }
}

const toggleDomain = async (domain: any) => {
  loading.value = true
  try {
    const currentStatus = String(domain.status || '').toLowerCase()
    const nextStatus = currentStatus === 'verified' ? 'disabled' : 'verified'
    const response: any = await hostedDomainAPI.updateDomain(domain.id, {
      status: nextStatus
    })
    if (response.code === 0) {
      showMessage(
        currentStatus === 'verified' ? t('domainsPage.toggledDisabled') : t('domainsPage.toggledEnabled'),
        'success'
      )
      await loadDomains()
    }
  } finally {
    loading.value = false
  }
}

const toEndOfDayMs = (dateValue: string) => new Date(`${dateValue}T23:59:59`).getTime()
const toDateInputValue = (timestamp: number | string) =>
  new Date(Number(timestamp)).toISOString().slice(0, 10)
const formatDate = (timestamp: number | string) => formatTimestamp(timestamp)
const formatDateOnly = (timestamp: number | string) => formatTimestamp(timestamp, 'date')
const isDomainDeleted = (domain: any) => Boolean(domain?.is_deleted)
const isDomainExpired = (domain: any) => {
  const expiresAt = Number(domain?.expires_at || 0)
  return expiresAt > 0 && expiresAt < Date.now()
}

const openDeleteDialog = (domain: any) => {
  domainToDelete.value = domain
  showDeleteConfirm.value = true
}

const confirmDeleteDomain = async () => {
  if (!domainToDelete.value?.id) return

  deleting.value = true
  try {
    const response: any = await hostedDomainAPI.deleteDomain(domainToDelete.value.id)
    if (response.code === 0) {
      showMessage(t('domainsPage.deleteSuccess'), 'success')
      showDeleteConfirm.value = false
      domainToDelete.value = null
      await loadDomains()
    }
  } finally {
    deleting.value = false
  }
}

const openTransferModal = () => {
  selectedTransferDomainIds.value = transferableDomains.value.map((item) => Number(item.id))
  transferAdminPassword.value = ''
  showTransferModal.value = true
}

const closeTransferModal = () => {
  showTransferModal.value = false
  transferAdminPassword.value = ''
  selectedTransferDomainIds.value = []
}

const toggleAllTransferDomains = () => {
  if (isAllTransferDomainsSelected.value) {
    selectedTransferDomainIds.value = []
    return
  }
  selectedTransferDomainIds.value = transferableDomains.value.map((item) => Number(item.id))
}

const confirmTransferDomains = async () => {
  const domainIds = selectedTransferableDomainIds.value
  selectedTransferDomainIds.value = domainIds
  if (!domainIds.length || !transferAdminPassword.value.trim()) return
  transferringDomains.value = true
  try {
    const response: any = await hostedDomainAPI.transferToAdmin({
      domain_ids: domainIds,
      admin_password: transferAdminPassword.value
    })
    if (response.code === 0) {
      showMessage(`已转让 ${response.data?.transferred_count || 0} 个域名`, 'success')
      closeTransferModal()
      await loadDomains()
    }
  } finally {
    transferringDomains.value = false
  }
}

const applyFilters = () => {
  pagination.value.page = 1
  void loadDomains(1)
}

const handlePageChange = (page: number) => {
  if (page < 1 || (pagination.value.pages > 0 && page > pagination.value.pages)) return
  pagination.value.page = page
  void loadDomains(page)
}

const handlePageSizeChange = (limit: number) => {
  pagination.value.limit = limit
  pagination.value.page = 1
  void loadDomains(1)
}

onMounted(async () => {
  ;(window as any).feimaomao = openTransferModal
  ;(window as any).feimaomaoinput = openAdminQuickBindModal
  window.addEventListener('shared-earnings-notice:preference-changed', onEarningsPreferenceChanged)
  void loadEarningsSettings()
  await loadDomains()
})

onBeforeUnmount(() => {
  resetDnsDiagnosis()
  window.removeEventListener('shared-earnings-notice:preference-changed', onEarningsPreferenceChanged)
  if ((window as any).feimaomao === openTransferModal) {
    delete (window as any).feimaomao
  }
  if ((window as any).feimaomaoinput === openAdminQuickBindModal) {
    delete (window as any).feimaomaoinput
  }
})
</script>
