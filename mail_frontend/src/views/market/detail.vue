<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 顶部导航 -->
    <PageHeader />

    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <!-- 加载状态 -->
      <div v-if="loading" class="text-center py-12">
        <div
          class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"
        ></div>
        <p class="mt-4 text-gray-600">{{ t('marketDetail.loading') }}</p>
      </div>

      <!-- 工作流详情 -->
      <div v-else-if="workflow" class="space-y-6">
        <div class="grid grid-cols-1 gap-6 xl:h-auto xl:grid-rows-[calc(100vh-6rem)_auto] xl:grid-cols-[minmax(0,1fr)_460px] xl:items-start">
          <div class="market-scrollbar-hidden overflow-hidden rounded-xl border border-slate-200 bg-white p-5 xl:h-full xl:overflow-y-auto">
            <div class="space-y-4">
                <div
                  class="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <img
                    v-if="activeGalleryImage"
                    :src="activeGalleryImage"
                    class="mx-auto block max-h-[520px] max-w-full w-auto cursor-pointer object-contain"
                    :alt="workflow.name"
                    @click="viewImage(activeGalleryImage)"
                    @error="$event.target.style.display = 'none'"
                  />
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100"
                  >
                    <div class="rounded-lg border border-primary-200 bg-white/80 px-5 py-4 text-center shadow-sm">
                      <div class="text-sm font-medium text-primary-700">{{ resourceProfile.primaryCategory }}</div>
                      <div class="mt-1 text-2xl font-bold text-slate-950">{{ String(workflow.name || '资源').slice(0, 8) }}</div>
                    </div>
                  </div>
                  <div v-if="isResourceSoldOut" class="absolute right-3 top-3">
                    <span
                      class="rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white shadow"
                    >
                      暂时无货
                    </span>
                  </div>
                </div>

                <div v-if="galleryImages.length > 1" class="grid grid-cols-5 gap-3">
                  <button
                    v-for="(image, index) in galleryImages"
                    :key="`${image}-${index}`"
                    type="button"
                    class="overflow-hidden rounded-lg border bg-white transition"
                    :class="activeGalleryImage === image ? 'border-primary-500 ring-2 ring-primary-100' : 'border-slate-200 hover:border-primary-200'"
                    @click="selectGalleryImage(image)"
                  >
                    <img
                      :src="image"
                      :alt="t('marketDetail.screenshotAlt', { index: index + 1 })"
                      class="aspect-square h-full w-full object-cover"
                      @error="handleImageError($event, image)"
                    />
                  </button>
                </div>
            </div>
            <div class="mt-6 space-y-5">
              <div v-if="workflow.long_description" class="rounded-xl border border-slate-200 bg-white p-5">
                <h3 class="mb-4 text-lg font-semibold">{{ t('marketDetail.details') }}</h3>
                <div class="prose max-w-none [&_img]:h-auto [&_img]:max-w-full" v-html="workflow.long_description"></div>
              </div>

              <div v-if="detailImages.length > 0" class="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <h3 class="px-5 py-4 text-lg font-semibold">商品详情图</h3>
                <div class="space-y-4">
                  <img
                    v-for="(image, index) in detailImages"
                    :key="`${image}-${index}`"
                    :src="image"
                    :alt="`${workflow.name || '商品'}详情图${index + 1}`"
                    class="block h-auto w-full max-w-none object-contain"
                    loading="lazy"
                    @error="handleImageError($event, image)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：购买面板 -->
          <div class="market-scrollbar-hidden xl:h-full xl:overflow-y-auto">
            <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
              <div v-if="showSkuSelector">
                <div class="sticky top-0 z-20 -mx-5 border-b border-slate-100 bg-white px-5 pb-4 pt-1 shadow-[0_4px_10px_-8px_rgba(15,23,42,0.35)]">
                  <div class="text-sm text-slate-500">当前价格</div>
                  <div class="mt-1 text-4xl font-semibold leading-none tracking-tight text-primary-600">
                    {{ selectedSkuPriceText }}
                  </div>
                  <div v-if="skuGroups.length > 1" class="mt-4">
                    <div class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">杯型</div>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="group in skuGroups"
                        :key="group.id"
                        type="button"
                        class="rounded-md border px-3 py-1.5 text-sm font-semibold transition"
                        :class="selectedPrimaryGroupId === group.id ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-100' : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:text-primary-700'"
                        @click="selectPrimaryGroup(group.id)"
                      >
                        {{ group.name }}
                      </button>
                    </div>
                  </div>
                  <div v-if="skuGroups.length > 1" class="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">选择规格</div>
                </div>
                <div class="grid grid-cols-1 gap-1.5">
                  <button
                    v-for="sku in visibleSkus"
                    :key="sku.id"
                    type="button"
                    class="w-full rounded-md border px-3 py-1.5 text-left transition"
                    :disabled="!sku.is_available"
                    :class="!sku.is_available ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-70' : selectedSkuId === sku.id ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100' : 'border-slate-200 hover:border-primary-200'"
                    @click="selectSku(sku.id)"
                  >
                    <div class="flex min-w-0 items-center gap-3">
                      <div
                        class="min-w-0 flex-1 break-words text-xs font-semibold leading-5"
                        :class="sku.is_available ? 'text-slate-900' : 'text-slate-400'"
                      >
                        {{ sku.secondary_spec_name || sku.display_name || sku.name }}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div v-if="selectedSku.order_fields.length > 0" class="rounded-lg border border-slate-200 p-4">
                <div class="mb-3">
                  <div class="text-sm font-semibold text-slate-900">下单信息</div>
                </div>
                <div class="space-y-3">
                  <label
                    v-for="field in selectedSku.order_fields"
                    :key="field.key"
                    class="block"
                  >
                    <span class="mb-1 block text-xs font-medium text-slate-600">
                      {{ field.label }}
                      <span v-if="field.required" class="text-red-500">*</span>
                    </span>
                    <select
                      v-if="field.type === 'select'"
                      v-model="orderFieldValues[field.key]"
                      class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    >
                      <option value="">请选择</option>
                      <option v-for="option in field.options || []" :key="option.value || option" :value="option.value || option">
                        {{ option.label || option }}
                      </option>
                    </select>
                    <textarea
                      v-else-if="field.type === 'textarea'"
                      v-model="orderFieldValues[field.key]"
                      rows="3"
                      :placeholder="field.placeholder"
                      class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    ></textarea>
                    <input
                      v-else
                      v-model="orderFieldValues[field.key]"
                      :type="field.type === 'number' ? 'number' : 'text'"
                      :inputmode="field.type === 'phone' ? 'tel' : field.type === 'number' ? 'numeric' : 'text'"
                      :placeholder="field.placeholder"
                      class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                    <span v-if="field.help_text" class="mt-1 block text-xs text-slate-400">{{ field.help_text }}</span>
                  </label>
                </div>
              </div>

              <div
                v-if="showQuantitySelector"
                class="rounded-lg border border-gray-200 p-4 space-y-3"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">{{
                    t('marketDetail.quantityLabel')
                  }}</span>
                  <span class="text-xs text-gray-500">
                    {{
                      t('marketDetail.remainingInventory', { count: workflow.inventory_count || 0 })
                    }}
                  </span>
                </div>

                <div class="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    class="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-lg font-medium text-gray-700 transition-colors hover:border-primary-500 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="selectedExecutionCount <= 1"
                    @click="decreaseExecutionCount"
                  >
                    -
                  </button>

                  <input
                    v-model="executionCountInput"
                    type="number"
                    inputmode="numeric"
                    min="1"
                    :max="maxExecutionCount"
                    class="h-10 flex-1 rounded-md border border-gray-300 px-3 text-center text-base font-semibold text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    @input="handleExecutionCountInput"
                    @blur="normalizeExecutionCount"
                  />

                  <button
                    type="button"
                    class="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-lg font-medium text-gray-700 transition-colors hover:border-primary-500 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="selectedExecutionCount >= maxExecutionCount"
                    @click="increaseExecutionCount"
                  >
                    +
                  </button>
                </div>

                <div
                  v-if="workflow.pricing_model === 'per_use' && workflow.milk_coin_price > 0"
                  class="text-xs text-gray-500"
                >
                  {{ t('marketDetail.totalPrice', { totalPrice: totalExecutionPrice }) }}
                  <span v-if="platformFeeAmount > 0">
                    （商品 {{ itemExecutionPrice }} + 手续费 {{ platformFeeAmount }}）
                  </span>
                </div>
              </div>

              <button
                @click="executeNow"
                :disabled="isResourceSoldOut || !selectedSkuAvailable"
                class="w-full px-6 py-3 bg-primary-600 text-white text-base font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <span v-if="isResourceSoldOut">暂时无货</span>
                <span v-else-if="!selectedSkuAvailable">当前规格暂不可下单</span>
                <span v-else-if="workflow.pricing_model === 'free'">
                  免费获取
                </span>
                <span v-else-if="workflow.pricing_model === 'per_use'">
                  立即购买（{{ selectedSkuPriceText }}）
                </span>
                <span v-else-if="workflow.pricing_model === 'subscription'">
                  {{ t('marketDetail.executeSubscription') }}
                </span>
                <span v-else>
                  {{ t('marketDetail.executeOneTime', { price: workflow.milk_coin_price }) }}
                </span>
              </button>

            </div>

          </div>

            <div
              v-if="isAdminPriceTableVisible"
              class="rounded-lg border border-slate-200 bg-slate-50 p-3 xl:col-span-2"
              :class="isAdminPriceTableFullscreen ? 'fixed inset-4 z-50 flex flex-col shadow-2xl' : ''"
            >
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div class="text-sm font-semibold text-slate-900">商品价格表</div>
                  <div class="flex items-center gap-3">
                    <div class="text-xs text-slate-500">{{ adminPriceTableHintText }}</div>
                    <button
                      v-if="suggestedPlanBatchPayload.length"
                      type="button"
                      class="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="adminPriceTableLoading || adminPriceTableAnalyzing || applyingAllSuggestedPlans"
                      @click="openApplyAllSuggestedPlansConfirm"
                    >
                      {{ applyingAllSuggestedPlans ? '全部适配中...' : `一键适配全部方案（${suggestedPlanBatchPayload.length}组）` }}
                    </button>
                    <button
                      type="button"
                      class="rounded-md border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="adminPriceTableLoading || adminPriceTableAnalyzing"
                      @click="runAdminPriceTableAnalysis"
                    >
                      {{ adminPriceTableActionText }}
                    </button>
                    <button
                      type="button"
                      class="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:border-primary-400 hover:text-primary-600"
                      :aria-label="isAdminPriceTableFullscreen ? '退出全屏' : '全屏查看'"
                      :title="isAdminPriceTableFullscreen ? '退出全屏' : '全屏查看'"
                      @click="isAdminPriceTableFullscreen = !isAdminPriceTableFullscreen"
                    >
                      <svg v-if="!isAdminPriceTableFullscreen" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" />
                      </svg>
                      <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div
                  v-if="workflow.admin_loss_leader_suggestions?.length"
                  class="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-semibold text-amber-900">
                      建议新增 {{ workflow.admin_loss_leader_suggestions.length }} 个独立引流规格（原规格不修改）
                    </div>
                    <button
                      type="button"
                      class="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="creatingLossLeaderSkus"
                      @click="openCreateLossLeaderSkusConfirm"
                    >
                      {{ creatingLossLeaderSkus ? '上架中...' : `一键同意并上架（${workflow.admin_loss_leader_suggestions.length}个）` }}
                    </button>
                  </div>
                  <div class="mt-2 grid gap-2 lg:grid-cols-2">
                    <div
                      v-for="(suggestion, suggestionIndex) in workflow.admin_loss_leader_suggestions"
                      :key="`${suggestion.primary_spec_name}-${suggestion.candidate?.provider_product_no}`"
                      class="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm"
                    >
                      <div class="font-semibold text-slate-900">
                        新增引流{{ suggestionIndex + 1 }}：{{ suggestion.recommended_title }}
                      </div>
                      <div class="mt-1 text-xs text-slate-600">
                        {{ suggestion.primary_spec_name }}，售价 {{ formatTablePrice(suggestion.sell_price) }}；
                        编号 {{ suggestion.candidate?.provider_product_no }}，
                        成本 {{ formatCandidateCost(suggestion.candidate) }}，
                        利润
                        <span :class="Number(suggestion.candidate?.profit || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'">
                          {{ formatProfit(Number(suggestion.candidate?.profit || 0)) }}
                        </span>
                      </div>
                      <div class="mt-1 text-xs text-amber-800">
                        标题仅包含该编号已确认支持的饮品，不与原引流规格共用方案。
                      </div>
                    </div>
                  </div>
                </div>
                <div class="overflow-auto rounded-md border border-slate-200 bg-white" :class="isAdminPriceTableFullscreen ? 'min-h-0 flex-1' : ''">
                  <table class="min-w-[1900px] w-full table-fixed text-left text-sm">
                    <thead class="bg-slate-50 text-slate-500">
                      <tr>
                        <th class="sticky top-0 z-10 w-28 whitespace-nowrap bg-slate-50 px-3 py-2 font-medium">商品类别</th>
                        <th class="sticky top-0 z-10 w-24 whitespace-nowrap bg-slate-50 px-3 py-2 font-medium">一级规格</th>
                        <th class="sticky top-0 z-10 w-[420px] bg-slate-50 px-3 py-2 font-medium">二级规格</th>
                        <th class="sticky top-0 z-10 w-20 whitespace-nowrap bg-slate-50 px-3 py-2 font-medium">售出价</th>
                        <th class="sticky top-0 z-10 w-20 whitespace-nowrap bg-slate-50 px-2 py-2 font-medium">方案</th>
                        <th class="sticky top-0 z-10 w-20 whitespace-nowrap bg-slate-50 px-2 py-2 font-medium">编号1</th>
                        <th class="sticky top-0 z-10 w-44 whitespace-nowrap bg-slate-50 px-2 py-2 font-medium">编号1成本</th>
                        <th class="sticky top-0 z-10 w-20 whitespace-nowrap bg-slate-50 px-2 py-2 font-medium">编号1利润</th>
                        <th class="sticky top-0 z-10 w-20 whitespace-nowrap bg-slate-50 px-2 py-2 font-medium">编号2</th>
                        <th class="sticky top-0 z-10 w-44 whitespace-nowrap bg-slate-50 px-2 py-2 font-medium">编号2成本</th>
                        <th class="sticky top-0 z-10 w-20 whitespace-nowrap bg-slate-50 px-2 py-2 font-medium">编号2利润</th>
                        <th class="sticky top-0 z-10 w-20 whitespace-nowrap bg-slate-50 px-2 py-2 font-medium">编号3</th>
                        <th class="sticky top-0 z-10 w-44 whitespace-nowrap bg-slate-50 px-2 py-2 font-medium">编号3成本</th>
                        <th class="sticky top-0 z-10 w-20 whitespace-nowrap bg-slate-50 px-2 py-2 font-medium">编号3利润</th>
                        <th class="sticky top-0 z-10 w-[520px] bg-slate-50 px-3 py-2 font-medium">提示</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-slate-700">
                      <tr v-if="adminPriceTableLoading">
                        <td colspan="15" class="px-3 py-5 text-center text-slate-400">价格表加载中...</td>
                      </tr>
                      <template v-for="(row, rowIndex) in workflow.admin_price_table || []" :key="row.local_sku_id">
                      <tr v-if="!adminPriceTableLoading">
                        <td class="whitespace-nowrap px-3 py-2">{{ displayCategoryLabel(workflow.primary_category || workflow.category) }}</td>
                        <td class="whitespace-nowrap px-3 py-2">{{ row.primary_spec_name || '-' }}</td>
                        <td class="break-words px-3 py-2 font-medium">
                          {{ row.secondary_spec_name || '-' }}
                        </td>
                        <td class="whitespace-nowrap px-3 py-2">{{ formatTablePrice(row.sell_price) }}</td>
                        <td class="min-w-[220px] px-2 py-2 font-semibold text-emerald-700">
                          {{ sourcePlanDisplay(row) }}
                        </td>
                        <template v-for="index in 3" :key="index">
                          <td class="break-all px-3 py-2">
                            {{ row.candidates?.[index - 1]?.provider_product_no || '-' }}
                            <span v-if="row.candidates?.[index - 1]?.is_available === false" class="ml-1 whitespace-nowrap text-xs font-medium text-red-600">（已下架）</span>
                          </td>
                          <td class="whitespace-nowrap px-3 py-2">
                            {{ row.candidates?.[index - 1] ? formatCandidateCost(row.candidates[index - 1]) : '-' }}
                          </td>
                          <td
                            class="whitespace-nowrap px-3 py-2 font-semibold"
                            :class="candidateProfit(row, index - 1) >= 0 ? 'text-emerald-600' : 'text-red-600'"
                          >
                            {{ row.candidates?.[index - 1] ? formatProfit(candidateProfit(row, index - 1)) : '-' }}
                          </td>
                        </template>
                        <td class="w-[520px] max-w-[520px] px-3 py-2 align-top">
                          <div v-if="hasDifferentSuggestedPlan(row)" class="mt-1 text-xs font-semibold text-emerald-700">
                            当前完整方案：
                            {{ currentPlanProductNos(row).join('、') || '无' }}
                            →
                            建议完整方案：{{ row.suggested_plan_candidates.map((candidate) => candidate.provider_product_no).filter(Boolean).join('、') }}
                          </div>
                          <div v-if="hasDifferentSuggestedPlan(row) && row.suggested_plan_reason?.type === 'lower_cost'" class="mt-1 text-xs font-medium text-emerald-700">
                            替换原因：
                            <template v-for="(replacement, replacementIndex) in row.suggested_plan_reason.replacements || []" :key="replacement.from_product_no">
                              编号 {{ replacement.from_product_no }}<template v-if="replacement.from_source_name">（{{ replacement.from_source_name }}）</template>
                              替换为 {{ replacement.to_product_no }}<template v-if="replacement.to_source_name">（{{ replacement.to_source_name }}）</template>
                              <template v-if="replacement.saving > 0">，每单省 {{ formatProfit(replacement.saving) }}</template><span v-if="replacementIndex < row.suggested_plan_reason.replacements.length - 1">；</span>
                            </template>。
                          </div>
                          <div v-else-if="hasDifferentSuggestedPlan(row) && row.suggested_plan_reason?.type === 'unusable'" class="mt-1 text-xs font-medium text-emerald-700">
                            替换原因：
                            <template v-for="(issue, issueIndex) in row.suggested_plan_reason.issues || []" :key="issue.product_no">
                              编号 {{ issue.product_no }}
                              <template v-if="issue.type === 'unavailable'">当前不可用</template>
                              <template v-else-if="issue.type === 'missing_products'">未覆盖：{{ issue.missing_products.join('、') }}</template>
                              <template v-else>商品详情无法确认是否覆盖当前规格</template><span v-if="issueIndex < row.suggested_plan_reason.issues.length - 1">；</span>
                            </template>。
                          </div>
                          <div v-if="row.unavailable_candidates?.length && row.suggested_plan_reason?.no_eligible_replacement" class="mt-1 text-xs font-medium text-red-600">
                            下架编号：{{ row.unavailable_candidates.map((candidate) => candidate.provider_product_no).filter(Boolean).join('、') }}。暂无合格替代方案
                            <template v-if="row.suggested_plan_reason.profit_blocked_replacements?.length">
                              ，可替换编号均亏损超过 {{ formatProfit(-0.04) }}，不建议替换
                            </template>。
                          </div>
                          <div v-if="hasDifferentSuggestedPlan(row) && row.suggested_plan_reason?.omitted_candidates?.length" class="mt-1 text-xs font-medium text-emerald-700">
                            未纳入建议方案：
                            <template v-for="(candidate, candidateIndex) in row.suggested_plan_reason.omitted_candidates" :key="candidate.provider_product_no">
                              编号 {{ candidate.provider_product_no }}
                              <template v-if="candidate.reason_type === 'profit_below_threshold'">
                                成本 {{ formatCandidateCost(candidate) }}，按售价 {{ formatTablePrice(row.sell_price) }} 计算利润 {{ formatProfit(candidate.profit) }}，低于允许亏损上限 {{ formatProfit(candidate.min_profit) }}
                              </template>
                              <template v-else>未进入当前建议方案</template><span v-if="candidateIndex < row.suggested_plan_reason.omitted_candidates.length - 1">；</span>
                            </template>。
                          </div>
                          <div v-if="!row.candidates?.length && row.partial_coverage?.length" class="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-xs font-medium text-amber-700">
                            <div v-for="item in row.partial_coverage" :key="item.provider_product_no">
                              编号 {{ item.provider_product_no }} 少：{{ item.missing_products.join('、') }}
                            </div>
                          </div>
                          <div v-if="hasDifferentSuggestedPlan(row) && row.recommended_title" class="mt-1 text-xs font-semibold text-emerald-700">
                            建议标题：{{ row.recommended_title }}
                          </div>
                          <div v-if="hasDifferentSuggestedPlan(row)" class="mt-1 text-xs font-semibold text-emerald-700">
                            建议方案：
                            <span v-for="(candidate, index) in row.suggested_plan_candidates" :key="candidate.provider_product_no">
                              {{ index + 1 }}. {{ candidate.provider_product_no }}（{{ formatCandidateCost(candidate) }}）<span v-if="index < row.suggested_plan_candidates.length - 1">，</span>
                            </span>
                          </div>
                          <div v-if="!row.candidates?.length && row.missing_products?.length" class="mt-1 text-xs font-medium text-amber-700">
                            未覆盖饮品：{{ row.missing_products.join('、') }}
                          </div>
                          <span v-if="row.candidates?.length && !row.suggested_plan_candidates?.length" class="text-slate-400">-</span>
                        </td>
                      </tr>
                      <tr
                        v-if="!adminPriceTableLoading && isLastPrimaryRow(row, rowIndex)"
                        :key="`${row.local_sku_id}-source-summary`"
                        class="bg-emerald-50/60"
                      >
                        <td colspan="15" class="px-4 py-3 text-base text-slate-700">
                          <div class="text-lg font-semibold text-emerald-700">
                            {{ row.primary_spec_name || '默认规格' }}货源方案：共 {{ primarySourcePlans(row.primary_spec_name).length }} 组
                          </div>
                          <div v-if="primarySourcePlans(row.primary_spec_name).length" class="mt-2 space-y-1.5 text-lg">
                            <div v-for="(plan, planIndex) in primarySourcePlans(row.primary_spec_name)" :key="plan.signature" class="font-medium">
                              <div>
                                方案{{ planIndex + 1 }}：
                                <span v-for="(source, sourceIndex) in plan.candidates" :key="source.provider_product_no">
                                  {{ source.provider_product_no }}<span v-if="sourceIndex < plan.candidates.length - 1"> + </span>
                                </span>
                                <template v-if="plan.candidates.length && plan.candidates.every((source) => source.is_available === false)">
                                  删除
                                </template>
                                <span v-for="replacement in replacementsForPlan(row.primary_spec_name, planIndex)" :key="replacement.key" class="text-emerald-700">
                                  → 新方案{{ planIndex + 1 }}：
                                  <span v-for="(source, sourceIndex) in replacement.candidates" :key="source.provider_product_no">
                                    {{ source.provider_product_no }}<span v-if="sourceIndex < replacement.candidates.length - 1"> + </span>
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div v-if="primaryUnboundSuggestedPlans(row.primary_spec_name).length" class="mt-3 border-t border-emerald-100 pt-2 text-lg">
                            <div class="font-semibold text-emerald-700">
                              建议新增方案
                            </div>
                            <div class="mt-1.5 space-y-1.5">
                              <div v-for="(plan, planIndex) in primaryUnboundSuggestedPlans(row.primary_spec_name)" :key="plan.signature" class="font-medium text-emerald-700">
                                方案{{ primarySourcePlans(row.primary_spec_name).length + planIndex + 1 }}：{{ plan.provider_product_nos.join(' + ') }}
                              </div>
                            </div>
                          </div>
                          <div v-if="!primarySourcePlans(row.primary_spec_name).length && !primarySuggestedPlans(row.primary_spec_name).length" class="mt-1 text-slate-400">当前一级规格还没有绑定货源</div>
                        </td>
                      </tr>
                      </template>
                      <tr v-if="!adminPriceTableLoading && !(workflow.admin_price_table || []).length">
                        <td colspan="15" class="px-3 py-5 text-center text-slate-400">当前商品还没有可展示的编号绑定</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
            </div>

        <div class="space-y-5 xl:col-start-1 xl:col-span-1">
          <!-- 用户评价 -->
          <div class="rounded-xl border border-slate-200 bg-white p-5">
            <h3 class="text-lg font-semibold mb-6">
              {{ t('marketDetail.reviewsTitle', { count: workflow.review_count || 0 }) }}
            </h3>

            <!-- 评论输入框 - 始终显示 -->
            <div class="mb-6">
              <div class="flex items-start gap-3">
                <div
                  class="w-10 h-10 rounded-full bg-gradient-workflow flex items-center justify-center text-white font-semibold"
                >
                  {{ userStore.user?.username?.charAt(0)?.toUpperCase() || 'U' }}
                </div>
                <div class="flex-1">
                  <textarea
                    v-model="newComment"
                    rows="3"
                    :placeholder="
                      canReview
                        ? t('marketDetail.reviewPlaceholder')
                        : t('marketDetail.reviewLockedPlaceholder')
                    "
                    :disabled="!canReview"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    :class="!canReview ? 'bg-gray-50 cursor-not-allowed' : ''"
                  ></textarea>
                  <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-gray-600">{{ t('marketDetail.rating') }}</span>
                      <div class="flex gap-1">
                        <button
                          v-for="i in 5"
                          :key="i"
                          @click="canReview && (newRating = i)"
                          :disabled="!canReview"
                          class="focus:outline-none"
                        >
                          <svg
                            :class="i <= newRating ? 'text-yellow-400' : 'text-gray-300'"
                            class="h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <button
                      @click="submitReview"
                      :disabled="!canReview || !newComment.trim()"
                      class="px-4 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {{ t('marketDetail.submitReview') }}
                    </button>
                  </div>
                  <p v-if="!canReview" class="text-xs text-amber-600 mt-2">
                    {{ t('marketDetail.reviewHint') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 评价列表 -->
            <div v-if="reviews && reviews.length > 0" class="space-y-4">
              <div
                v-for="review in reviews"
                :key="review.id"
                class="border-b border-gray-200 pb-4 last:border-0"
              >
                <div class="flex items-start gap-3">
                  <!-- 评论者头像 -->
                  <div
                    class="w-10 h-10 rounded-full bg-gradient-workflow flex items-center justify-center text-white font-semibold flex-shrink-0"
                  >
                    {{ review.user_name?.charAt(0)?.toUpperCase() || 'U' }}
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-gray-900">{{
                          review.user_name || t('marketDetail.anonymousUser')
                        }}</span>
                        <!-- 作者标识 -->
                        <span
                          v-if="review.user_id === workflow.author_id"
                          class="px-2 py-0.5 text-xs bg-primary-100 text-primary-600 rounded"
                          >{{ t('marketDetail.authorBadge') }}</span
                        >
                        <div v-if="review.rating" class="flex">
                          <svg
                            v-for="i in 5"
                            :key="i"
                            :class="i <= review.rating ? 'text-yellow-400' : 'text-gray-300'"
                            class="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-sm text-gray-500">{{
                          formatDate(review.created_at)
                        }}</span>
                        <!-- 删除按钮 - 只有自己能删除自己的评论 -->
                        <ActionButton
                          v-if="review.user_id === userStore.user?.id"
                          icon="delete"
                          variant="delete"
                          size="sm"
                          :tooltip="t('marketDetail.deleteReviewTooltip')"
                          @click="deleteReviewById(review.id)"
                        />
                      </div>
                    </div>
                    <p class="text-gray-700">{{ review.comment }}</p>

                    <!-- 回复按钮 -->
                    <button
                      v-if="canReview"
                      @click="replyToReview(review)"
                      class="mt-2 text-sm text-primary-600 hover:text-primary-700"
                    >
                      {{ t('marketDetail.reply') }}
                    </button>

                    <!-- 子评论（回复） -->
                    <div
                      v-if="review.replies && review.replies.length > 0"
                      class="mt-3 ml-8 space-y-3"
                    >
                      <div
                        v-for="reply in review.replies"
                        :key="reply.id"
                        class="border-l-2 border-gray-200 pl-4"
                      >
                        <div class="flex items-center justify-between mb-1">
                          <div class="flex items-center gap-2">
                            <span class="font-medium text-gray-900 text-sm">{{
                              reply.user_name || t('marketDetail.anonymousUser')
                            }}</span>
                            <!-- 作者标识 -->
                            <span
                              v-if="reply.user_id === workflow.author_id"
                              class="px-2 py-0.5 text-xs bg-primary-100 text-primary-600 rounded"
                              >{{ t('marketDetail.authorBadge') }}</span
                            >
                            <span class="text-xs text-gray-500">{{
                              formatDate(reply.created_at)
                            }}</span>
                          </div>
                          <!-- 删除回复按钮 -->
                          <ActionButton
                            v-if="reply.user_id === userStore.user?.id"
                            icon="delete"
                            variant="delete"
                            size="xs"
                            :tooltip="t('marketDetail.deleteReplyTooltip')"
                            @click="deleteReviewById(reply.id)"
                          />
                        </div>
                        <p class="text-gray-700 text-sm">{{ reply.comment }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          <div v-else class="text-center py-8 text-gray-500">
              {{ t('marketDetail.emptyReviews') }}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- 确认对话框 -->
    <ConfirmDialog
      v-model:visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :type="confirmDialog.type"
      :loading="confirmDialog.loading"
      @confirm="confirmDialog.onConfirm"
      @cancel="confirmDialog.onCancel"
    />

    <!-- 执行结果弹窗 -->
    <ExecutionResultModal
      :visible="showExecutionResult"
      :execution-data="executionResultData"
      @close="showExecutionResult = false"
    />

    <!-- 执行历史弹窗 -->
    <ExecutionHistoryModal
      v-if="showExecutionHistory"
      :workflowId="workflow?.workflow_id"
      :marketStatus="workflow?.market_status"
      :author-id="workflow?.author_id"
      @close="showExecutionHistory = false"
    />

    <!-- 图片预览弹窗 -->
    <ImagePreview v-model:visible="showImagePreview" :src="previewImage" />

    <!-- 执行中的全局loading -->
    <div
      v-if="confirmDialog.loading && !confirmDialog.visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg p-6 flex flex-col items-center">
        <svg class="animate-spin h-12 w-12 text-primary-600 mb-4" fill="none" viewBox="0 0 24 24">
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p class="text-lg font-medium text-gray-900">{{ t('marketDetail.executingTitle') }}</p>
        <p class="text-sm text-gray-500 mt-2">{{ t('marketDetail.executingSubtitle') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  applyAllSuggestedSourcePlans,
  createLossLeaderSkus,
  getWorkflowAdminPriceTable,
  getWorkflowDetail,
  refreshWorkflowAdminPriceCatalog
} from '@/api/workflowMarket'
import { createReview, deleteReview } from '@/api/workflowMarket'
import { workflowApi } from '@/api/workflow'
import { getBalance, getFeeConfig } from '@/api/milkCoin'
import { showMessage } from '@/utils/message'
import PageHeader from '@/components/PageHeader/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import ExecutionResultModal from '@/views/portal/workflows/components/ExecutionResultModal/index.vue'
import ExecutionHistoryModal from '@/views/portal/workflows/components/ExecutionHistoryModal/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import ImagePreview from '@/components/ImagePreview/index.vue'
import { useUserStore } from '@/stores/user'
import { useMailboxStore } from '@/stores/auth'
import { setPageSeo } from '@/seo'
import { getCurrentLocale } from '@/i18n'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const mailboxStore = useMailboxStore()
const { t, te } = useI18n()

const workflowId = computed(() => parseInt(route.params.id))
const workflow = ref(null)
const loading = ref(true)
const canReview = ref(false)
const reviews = ref([])
const adminPriceTableLoading = ref(false)
const adminPriceTableAnalyzing = ref(false)
const adminPriceTableAnalyzed = ref(false)
const adminPriceTableAnalysisStage = ref('')
const isAdminPriceTableFullscreen = ref(false)
const applyingAllSuggestedPlans = ref(false)
const creatingLossLeaderSkus = ref(false)
const showExecutionResult = ref(false)
const showExecutionHistory = ref(false)
const selectedExecutionCount = ref(1)
const executionCountInput = ref('1')
const executionResultData = ref({
  execution_id: '',
  status: '',
  result: null
})
const platformFeeRate = ref(0)
const selectedSkuId = ref('')
const selectedPrimaryGroupId = ref('')
const orderFieldValues = ref({})
const activeGalleryImage = ref('')

// 评论相关
const newComment = ref('')
const newRating = ref(5)

// 截图验证
const validScreenshots = ref([])

const fulfillmentProfiles = {
  link: {
    label: '链接交付',
    resultPreview: '下单后返回链接，可打开或复制'
  },
  code: {
    label: '卡密交付',
    resultPreview: '下单后返回兑换码或卡密'
  },
  account: {
    label: '账号交付',
    resultPreview: '下单后返回账号信息'
  },
  recharge: {
    label: '直充交付',
    resultPreview: '提交手机号或账号后充值'
  },
  api: {
    label: '接口调用',
    resultPreview: '下单后通过供货接口自动处理'
  },
  manual: {
    label: '人工处理',
    resultPreview: '下单后等待处理'
  },
  workflow: {
    label: '工作流执行',
    resultPreview: '购买或执行后进入自动化流程'
  }
}

const resourceTypeLabels = {
  rights: '权益商品',
  proxy_order: '代下单',
  account: '账号库存',
  workflow: '工作流',
  service: '虚拟服务'
}

const primaryCategoryLabels = {
  food_drink: '餐饮饮品',
  video_member: '视频会员',
  travel: '出行打车',
  entertainment_game: '娱乐游戏',
  office_member: '办公会员',
  life_rights: '生活权益',
  mail_resource: '邮箱资源',
  automation_tool: '自动化工具'
}

const secondaryCategoryLabels = {
  coffee_drink: '餐饮饮品',
  coffee: '咖啡饮品',
  milk_tea: '奶茶甜品',
  fast_food: '快餐小吃',
  delivery: '外卖代下',
  meal_coupon: '商超餐券',
  long_video: '长视频会员',
  short_video: '短视频权益',
  music: '音乐会员',
  cloud_drive: '网盘会员',
  bundle: '联合会员',
  taxi_coupon: '打车券',
  car_service: '加油洗车',
  parking: '停车权益',
  bike: '骑行权益',
  travel_monthly_card: '出行月卡',
  game_card: '游戏点卡',
  game_member: '游戏会员',
  live_member: '直播会员',
  movie_ticket: '电影票券',
  show_entertainment: '演出娱乐',
  document: '文档办公',
  storage: '网盘存储',
  ai_tools: 'AI 工具',
  design: '设计工具',
  dev_tools: '开发工具',
  shopping: '商超购物',
  phone_data: '话费流量',
  local_life: '本地生活',
  recharge_payment: '充值缴费',
  life_service: '生活服务',
  outlook_mail: 'Outlook 邮箱',
  gmail: 'Gmail 邮箱',
  enterprise_mail: '企业邮箱',
  external_mail: '三方邮箱',
  mail_service: '邮箱辅助服务',
  workflow: '工作流',
  plugin: '插件',
  script: '脚本工具',
  mail_automation: '邮箱自动化',
  data_processing: '数据处理'
}

const normalizeJsonList = (value) => {
  if (Array.isArray(value)) {
    return value
  }
  if (typeof value !== 'string' || !value.trim()) {
    return []
  }
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

const getCategoryProfile = (item = {}) => {
  if (item.primary_category_name || item.secondary_category_name || item.primary_category || item.secondary_category) {
    return {
      primaryCategory: item.primary_category_name || primaryCategoryLabels[item.primary_category] || item.primary_category || '资源市场',
      secondaryCategory: item.secondary_category_name || secondaryCategoryLabels[item.secondary_category] || item.secondary_category || '精选资源'
    }
  }

  if (item.category === 'outlook') {
    return { primaryCategory: '邮箱资源', secondaryCategory: 'Outlook 邮箱' }
  }

  if (item.category === 'mailbox') {
    return { primaryCategory: '邮箱资源', secondaryCategory: '三方邮箱' }
  }

  return { primaryCategory: '自动化工具', secondaryCategory: '工作流' }
}

const getResourceType = (item = {}) => {
  if (item.resource_type) {
    return item.resource_type
  }
  if (item.category === 'outlook') {
    return 'account'
  }
  return 'workflow'
}

const getFulfillmentType = (item = {}) => {
  if (item.fulfillment_type) {
    return item.fulfillment_type
  }
  if (item.category === 'outlook') {
    return 'account'
  }
  return 'workflow'
}

const resourceProfile = computed(() => {
  const item = workflow.value || {}
  const category = getCategoryProfile(item)
  const resourceType = getResourceType(item)
  const fulfillmentType = getFulfillmentType(item)
  const fulfillment = fulfillmentProfiles[fulfillmentType] || fulfillmentProfiles.workflow

  return {
    ...category,
    resourceType,
    resourceTypeLabel: resourceTypeLabels[resourceType] || '资源',
    fulfillmentType,
    fulfillmentLabel: fulfillment.label,
    resultPreview: fulfillment.resultPreview
  }
})

const resourceCover = computed(() => {
  if (!workflow.value) {
    return ''
  }
  // The cover is an explicit asset. Detail screenshots must never be promoted
  // into the main-image area when a cover has not been configured.
  return workflow.value.cover_url || workflow.value.icon_url || ''
})

const galleryImages = computed(() => {
  return resourceCover.value ? [resourceCover.value] : []
})

const detailImages = computed(() => {
  const cover = resourceCover.value
  return Array.from(new Set(validScreenshots.value.filter((url) => url && url !== cover)))
})

const detailTags = computed(() => {
  const keywords = normalizeJsonList(workflow.value?.keywords)
  const tags = normalizeJsonList(workflow.value?.tags)
  return [
    resourceProfile.value.resourceTypeLabel,
    resourceProfile.value.fulfillmentLabel,
    ...keywords,
    ...tags
  ].filter(Boolean).slice(0, 8)
})

const normalizeOrderFields = (value) =>
  normalizeJsonList(value).map((field) => ({
    key: field.key || field.name,
    label: field.label || field.title || field.key || field.name,
    type: field.type || 'text',
    required: Boolean(field.required),
    placeholder: field.placeholder || '',
    options: Array.isArray(field.options) ? field.options : [],
    validation: field.validation || '',
    help_text: field.help_text || field.helpText || ''
  })).filter((field) => field.key)

const normalizeSku = (sku, item, index = 0) => {
  const fulfillmentType = sku.fulfillment_type || resourceProfile.value.fulfillmentType
  const fulfillment = fulfillmentProfiles[fulfillmentType] || fulfillmentProfiles.workflow
  const orderFields = normalizeOrderFields(sku.order_fields)
  return {
    ...sku,
    id: String(sku.id || sku.sku_id || index + 1),
    name: sku.name || sku.spec_name || sku.title || item.name,
    image_url: sku.image_url || sku.imageUrl || '',
    price: Number(sku.sell_price ?? sku.price ?? sku.milk_coin_price ?? item.milk_coin_price ?? 0),
    allow_batch_purchase: Boolean(sku.allow_batch_purchase) || orderFields.length === 0,
    order_fields: orderFields,
    fulfillment_type: fulfillmentType,
    fulfillment_label: fulfillment.label,
    result_hint: sku.result_hint || fulfillment.resultPreview,
    primary_spec_id: sku.primary_spec_id || '',
    primary_spec_name: sku.primary_spec_name || '',
    primary_spec_sort: Number(sku.primary_spec_sort || 0),
    secondary_spec_id: sku.secondary_spec_id || '',
    secondary_spec_name: sku.secondary_spec_name || '',
    secondary_spec_sort: Number(sku.secondary_spec_sort || 0),
    display_name: sku.display_name || sku.secondary_spec_name || sku.name || sku.spec_name || item.name,
    binding_count: Number(sku.binding_count || 0),
    available_provider_product_nos: normalizeJsonList(sku.available_provider_product_nos),
    is_available: sku.is_available !== undefined ? Boolean(sku.is_available) : true
  }
}

const displaySkus = computed(() => {
  const item = workflow.value
  if (!item) {
    return []
  }

  const apiSkus = normalizeJsonList(item.skus || item.specs || item.product_skus)
  if (apiSkus.length > 0) {
    return apiSkus.map((sku, index) => normalizeSku(sku, item, index))
  }

  const fulfillment = fulfillmentProfiles[resourceProfile.value.fulfillmentType] || fulfillmentProfiles.workflow
  return [
    {
      id: `workflow-${item.id}`,
      name: item.name,
      price: Number(item.milk_coin_price || 0),
      allow_batch_purchase: Boolean(item.inventory_enabled),
      order_fields: normalizeOrderFields(item.order_fields),
      fulfillment_type: resourceProfile.value.fulfillmentType,
      fulfillment_label: fulfillment.label,
      result_hint: fulfillment.resultPreview
    }
  ]
})

const skuGroups = computed(() => {
  const item = workflow.value
  if (!item) {
    return []
  }

  const rawGroups = normalizeJsonList(item.sku_groups)
  if (rawGroups.length > 0) {
    return rawGroups
      .map((group, index) => {
        const children = normalizeJsonList(group.children).map((child, childIndex) =>
          displaySkus.value.find((sku) => sku.id === String(child.id || child.sku_id || childIndex + 1))
          || normalizeSku(child, item, childIndex)
        )
        return {
          id: String(group.id || index + 1),
          name: group.name || `分组${index + 1}`,
          sort: Number(group.sort || index + 1),
          children
        }
      })
      .filter((group) => group.children.length > 0)
      .sort((a, b) => a.sort - b.sort)
  }

  const grouped = {}
  displaySkus.value.forEach((sku, index) => {
    const groupId = String(sku.primary_spec_id || 'default')
    if (!grouped[groupId]) {
      grouped[groupId] = {
        id: groupId,
        name: sku.primary_spec_name || '默认规格',
        sort: Number(sku.primary_spec_sort || index + 1),
        children: []
      }
    }
    grouped[groupId].children.push(sku)
  })

  return Object.values(grouped).sort((a, b) => a.sort - b.sort)
})

const activePrimaryGroup = computed(() => {
  if (skuGroups.value.length === 0) {
    return null
  }
  return skuGroups.value.find((group) => group.id === selectedPrimaryGroupId.value) || skuGroups.value[0]
})

const visibleSkus = computed(() => activePrimaryGroup.value?.children || displaySkus.value)

const isThirdPartyProduct = computed(() => {
  if (!workflow.value) return false
  // 库存商品不使用供货编号可用性；旧数据里的 is_available 不能覆盖这个规则。
  if (workflow.value.inventory_enabled === true) return false
  if (workflow.value.has_third_party_delivery === true) return true
  const modes = normalizeJsonList(workflow.value.skus || workflow.value.specs || workflow.value.product_skus)
    .map((sku) => String(sku?.delivery_mode || sku?.fulfillment_type || '').trim().toLowerCase())
  const topLevelMode = String(workflow.value.delivery_mode || workflow.value.fulfillment_type || '').trim().toLowerCase()
  return ['third_party_api', 'api'].includes(topLevelMode) || modes.some((mode) => ['third_party_api', 'api'].includes(mode))
})

const isAdminPriceTableVisible = computed(() => Boolean(workflow.value?.is_admin_viewer && isThirdPartyProduct.value))
const adminPriceTableHintText = computed(() => {
  if (adminPriceTableAnalyzing.value) {
    return adminPriceTableAnalysisStage.value === 'catalog'
      ? '第 1 步：同步当前商品分类及上下架状态'
      : '第 2 步：分析候选方案'
  }
  if (adminPriceTableAnalyzed.value) {
    return '当前已展示本次 AI 分析结果'
  }
  return '默认只加载基础成本利润，点开始分析才跑 AI'
})
const adminPriceTableActionText = computed(() => {
  if (adminPriceTableAnalyzing.value) {
    return adminPriceTableAnalysisStage.value === 'catalog' ? '同步分类中...' : '分析中...'
  }
  return adminPriceTableAnalyzed.value ? '重新分析' : '开始分析'
})

const isSkuAvailable = (sku) => isThirdPartyProduct.value ? Boolean(sku?.is_available) : true

const selectedSku = computed(() => {
  if (visibleSkus.value.length === 0 && displaySkus.value.length === 0) {
    return {
      id: '',
      name: '',
      price: 0,
      allow_batch_purchase: false,
      order_fields: [],
      fulfillment_label: '资源交付',
      result_hint: ''
    }
  }
  return visibleSkus.value.find((sku) => sku.id === selectedSkuId.value)
    || displaySkus.value.find((sku) => sku.id === selectedSkuId.value)
    || visibleSkus.value[0]
    || displaySkus.value[0]
})

const showSkuSelector = computed(() => skuGroups.value.length > 1 || visibleSkus.value.length > 1)

const formatPrice = (price) => {
  const normalizedPrice = Number(price || 0)
  return normalizedPrice > 0 ? `${normalizedPrice} 奶片` : '免费'
}

const formatTablePrice = (price) => {
  const normalizedPrice = Number(price || 0)
  return String(normalizedPrice)
}

const formatCandidateCost = (candidate) => {
  const actualCost = Number(candidate?.cost_price || 0)
  const baseCost = Number(candidate?.base_cost_price ?? actualCost)
  const serviceFee = Number(candidate?.service_fee ?? Math.max(0, actualCost - baseCost))
  return `${baseCost.toFixed(2)} + ${serviceFee.toFixed(2)} = ${actualCost.toFixed(2)}`
}

const formatProfit = (profit) => {
  const normalizedProfit = Number(profit || 0)
  return String(normalizedProfit)
}

const candidateProfit = (row, index) => {
  const candidate = row?.candidates?.[index]
  if (!candidate) return 0
  if (candidate.profit !== undefined && candidate.profit !== null) {
    return Number(candidate.profit || 0)
  }
  return Number((Number(row.sell_price || 0) - Number(candidate.cost_price || 0)).toFixed(4))
}

// 新接口提供真实绑定方案；旧数据仍回退到表格候选，避免历史资源无法展示。
const currentPlanCandidates = (row) => {
  const planCandidates = Array.isArray(row?.current_plan_candidates)
    ? row.current_plan_candidates
    : row?.candidates || []
  return planCandidates.filter((candidate) => candidate?.provider_product_no)
}

const currentPlanProductNos = (row) => currentPlanCandidates(row)
  .map((candidate) => String(candidate?.provider_product_no || '').trim())
  .filter(Boolean)

const hasDifferentSuggestedPlan = (row) => {
  const current = currentPlanProductNos(row).slice().sort().join('|')
  const suggested = (row?.suggested_plan_candidates || [])
    .map((candidate) => String(candidate?.provider_product_no || '').trim())
    .filter(Boolean)
    .sort()
    .join('|')
  return Boolean(suggested) && suggested !== current
}

const primarySourcePlans = (primarySpecName) => {
  const rows = workflow.value?.admin_price_table || []
  const plans = new Map()
  for (const row of rows) {
    if (String(row?.primary_spec_name || '') !== String(primarySpecName || '')) continue
    const candidates = currentPlanCandidates(row)
    if (!candidates.length) continue
    const signature = candidates
      .map((candidate) => String(candidate.provider_product_no))
      .sort()
      .join('|')
    if (!plans.has(signature)) {
      plans.set(signature, { signature, candidates })
    }
  }
  return Array.from(plans.values())
}

const primarySuggestedPlans = (primarySpecName) => {
  const currentSignatures = new Set(
    primarySourcePlans(primarySpecName).map((plan) => plan.signature),
  )
  const plans = new Map()
  for (const row of workflow.value?.admin_price_table || []) {
    if (String(row?.primary_spec_name || '') !== String(primarySpecName || '')) continue
    for (const candidates of [row.suggested_plan_candidates || []]) {
      const validCandidates = candidates.filter((candidate) => candidate?.provider_product_no)
      if (!validCandidates.length) continue
      const sortedCandidates = validCandidates.slice().sort(
        (left, right) => Number(left?.cost_price || 0) - Number(right?.cost_price || 0),
      )
      const providerProductNos = sortedCandidates.map((candidate) => String(candidate.provider_product_no))
      const signature = providerProductNos.slice().sort().join('|')
      if (currentSignatures.has(signature) || plans.has(signature)) continue
      plans.set(signature, {
        signature,
        provider_product_nos: providerProductNos,
        total_cost: sortedCandidates.reduce((total, candidate) => total + Number(candidate?.cost_price || 0), 0),
      })
    }
  }
  return Array.from(plans.values()).sort((left, right) => left.total_cost - right.total_cost)
}

const primaryPlanReplacements = (primarySpecName) => {
  const currentPlans = primarySourcePlans(primarySpecName)
  const replacements = []
  const seen = new Set()
  for (const row of workflow.value?.admin_price_table || []) {
    if (String(row?.primary_spec_name || '') !== String(primarySpecName || '')) continue
    const current = currentPlanProductNos(row)
    const suggested = (row.suggested_plan_candidates || [])
      .map((candidate) => String(candidate?.provider_product_no || '').trim())
      .filter(Boolean)
    if (!current.length || !suggested.length) continue
    const oldIndex = currentPlans.findIndex(
      (plan) => plan.signature === current.slice().sort().join('|'),
    )
    const newSignature = suggested.slice().sort().join('|')
    if (oldIndex < 0 || newSignature === current.slice().sort().join('|')) continue
    const key = `${oldIndex}-${newSignature}`
    if (seen.has(key)) continue
    seen.add(key)
    replacements.push({
      key,
      oldIndex,
      signature: newSignature,
      current_product_nos: current,
      provider_product_nos: suggested,
      candidates: row.suggested_plan_candidates || [],
    })
  }
  return replacements
}

const primaryUnboundSuggestedPlans = (primarySpecName) => {
  const knownSignatures = new Set([
    ...primarySourcePlans(primarySpecName).map((plan) => plan.signature),
    ...primaryPlanReplacements(primarySpecName).map((replacement) => replacement.signature),
  ])
  const plans = new Map()
  for (const row of workflow.value?.admin_price_table || []) {
    if (String(row?.primary_spec_name || '') !== String(primarySpecName || '')) continue
    if (currentPlanCandidates(row).length) continue
    const candidates = (row.suggested_plan_candidates || []).filter((candidate) => candidate?.provider_product_no)
    if (!candidates.length) continue
    const sortedCandidates = candidates.slice().sort(
      (left, right) => Number(left?.cost_price || 0) - Number(right?.cost_price || 0),
    )
    const providerProductNos = sortedCandidates.map((candidate) => String(candidate.provider_product_no))
    const signature = providerProductNos.slice().sort().join('|')
    if (knownSignatures.has(signature) || plans.has(signature)) continue
    plans.set(signature, {
      signature,
      provider_product_nos: providerProductNos,
      total_cost: sortedCandidates.reduce((total, candidate) => total + Number(candidate?.cost_price || 0), 0),
    })
  }
  return Array.from(plans.values()).sort((left, right) => left.total_cost - right.total_cost)
}

const replacementsForPlan = (primarySpecName, planIndex) => (
  primaryPlanReplacements(primarySpecName).filter((item) => item.oldIndex === planIndex)
)

const sourcePlanSignature = (productNos = []) => productNos
  .map((productNo) => String(productNo || '').trim())
  .filter(Boolean)
  .sort()
  .join('|')

const getSuggestedPlanTargetSkuIds = (primarySpecName, replacement) => {
  const currentSignature = sourcePlanSignature(replacement?.current_product_nos || [])
  const suggestedSignature = sourcePlanSignature(replacement?.provider_product_nos || [])
  return (workflow.value?.admin_price_table || [])
    .filter((row) => (
      String(row?.primary_spec_name || '') === String(primarySpecName || '')
      && sourcePlanSignature(currentPlanProductNos(row)) === currentSignature
      && sourcePlanSignature(
        (row?.suggested_plan_candidates || []).map((candidate) => candidate?.provider_product_no),
      ) === suggestedSignature
    ))
    .map((row) => String(row?.local_sku_id || '').trim())
    .filter(Boolean)
}

const normalizeSuggestedPlanCandidates = (candidates = []) => {
  const seen = new Set()
  return candidates
    .map((candidate) => ({
      source_id: Number(candidate?.source_id || 0),
      source_kind: String(candidate?.source_kind || 'standard').trim() || 'standard',
      provider_product_no: String(candidate?.provider_product_no || '').trim(),
    }))
    .filter((candidate) => {
      const key = `${candidate.source_id}:${candidate.source_kind}:${candidate.provider_product_no}`
      if (candidate.source_id <= 0 || !candidate.provider_product_no || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const suggestedPlanBatchPayload = computed(() => {
  const plans = []
  const seen = new Set()
  const primarySpecNames = new Set(
    (workflow.value?.admin_price_table || [])
      .map((row) => String(row?.primary_spec_name || '').trim())
      .filter(Boolean),
  )

  primarySpecNames.forEach((primarySpecName) => {
    primaryPlanReplacements(primarySpecName).forEach((replacement) => {
      const localSkuIds = getSuggestedPlanTargetSkuIds(primarySpecName, replacement)
      const suggestedCandidates = normalizeSuggestedPlanCandidates(replacement?.candidates || [])
      if (!localSkuIds.length || !suggestedCandidates.length) return

      const key = [
        primarySpecName,
        sourcePlanSignature(replacement?.current_product_nos || []),
        sourcePlanSignature(suggestedCandidates.map((candidate) => candidate.provider_product_no)),
      ].join(':')
      if (seen.has(key)) return
      seen.add(key)
      plans.push({
        primary_spec_name: primarySpecName,
        local_sku_ids: localSkuIds,
        current_provider_product_nos: replacement.current_product_nos || [],
        suggested_candidates: suggestedCandidates,
      })
    })
  })

  return plans
})

const openCreateLossLeaderSkusConfirm = () => {
  const suggestions = workflow.value?.admin_loss_leader_suggestions || []
  if (!suggestions.length) {
    showMessage('暂无可新增的引流规格，请重新分析后再试', 'warning')
    return
  }
  confirmDialog.value = {
    visible: true,
    title: '新增并上架引流规格',
    message: `确认新增并立即上架 ${suggestions.length} 个独立引流规格吗？\n\n原有规格不会修改；新规格将使用页面显示的标题、售价和供货编号。`,
    type: 'warning',
    loading: false,
    onConfirm: async () => {
      confirmDialog.value.loading = true
      creatingLossLeaderSkus.value = true
      try {
        const payload = {
          suggestions: suggestions.map((suggestion) => ({
            primary_spec_name: String(suggestion?.primary_spec_name || ''),
            recommended_title: String(suggestion?.recommended_title || ''),
            sell_price: Number(suggestion?.sell_price || 0),
            candidate: {
              source_id: Number(suggestion?.candidate?.source_id || 0),
              source_kind: String(suggestion?.candidate?.source_kind || 'standard'),
              provider_product_no: String(suggestion?.candidate?.provider_product_no || ''),
            },
          })),
        }
        const res = await createLossLeaderSkus(workflowId.value, payload)
        if (res?.code !== 0) {
          showMessage(res?.message || '新增引流规格失败', 'error')
          return
        }
        confirmDialog.value.visible = false
        showMessage(res?.message || '引流规格已新增并上架', 'success')
        await loadWorkflowDetail(false)
      } catch (error) {
        showMessage(
          error?.response?.data?.detail || error?.response?.data?.message || error?.message || '新增引流规格失败',
          'error',
        )
      } finally {
        confirmDialog.value.loading = false
        creatingLossLeaderSkus.value = false
      }
    },
    onCancel: () => {
      confirmDialog.value.visible = false
    },
  }
}

const openApplyAllSuggestedPlansConfirm = () => {
  const plans = suggestedPlanBatchPayload.value
  if (!plans.length) {
    showMessage('暂无可一键适配的建议方案，请重新分析后再试', 'warning')
    return
  }

  const targetSkuCount = new Set(plans.flatMap((plan) => plan.local_sku_ids)).size
  confirmDialog.value = {
    visible: true,
    title: '一键适配全部方案',
    message: `确认一次适配全部 ${plans.length} 组建议方案，覆盖 ${targetSkuCount} 个规格吗？\n\n只修改绑定编号，不会修改售价、标题和详情。任意一组已变化或不可用时，本次不会写入任何方案。`,
    type: 'warning',
    loading: false,
    onConfirm: async () => {
      confirmDialog.value.loading = true
      applyingAllSuggestedPlans.value = true
      try {
        const res = await applyAllSuggestedSourcePlans(workflowId.value, { plans })
        if (res?.code !== 0) {
          showMessage(res?.message || '一键适配失败', 'error')
          return
        }
        confirmDialog.value.visible = false
        showMessage(res?.message || '全部建议方案已适配，售价未修改', 'success')
        await loadAdminPriceTable()
      } catch (error) {
        showMessage(
          error?.response?.data?.detail || error?.response?.data?.message || error?.message || '一键适配失败',
          'error',
        )
      } finally {
        confirmDialog.value.loading = false
        applyingAllSuggestedPlans.value = false
      }
    },
    onCancel: () => {
      confirmDialog.value.visible = false
    },
  }
}

const sourcePlanLabel = (row) => {
  const candidates = currentPlanCandidates(row)
  if (!candidates.length) return '-'
  const signature = candidates
    .map((candidate) => String(candidate.provider_product_no))
    .sort()
    .join('|')
  const planIndex = primarySourcePlans(row?.primary_spec_name).findIndex(
    (plan) => plan.signature === signature,
  )
  return planIndex >= 0 ? `方案${planIndex + 1}` : '-'
}

const sourcePlanDisplay = (row) => {
  const current = currentPlanProductNos(row)
  const suggested = (row?.suggested_plan_candidates || [])
    .map((candidate) => String(candidate?.provider_product_no || '').trim())
    .filter(Boolean)
  if (!current.length && suggested.length) {
    const suggestedSignature = suggested.slice().sort().join('|')
    const existingIndex = primarySourcePlans(row?.primary_spec_name)
      .findIndex((plan) => plan.signature === suggestedSignature)
    if (existingIndex >= 0) return `建议方案${existingIndex + 1}`

    const replacement = primaryPlanReplacements(row?.primary_spec_name)
      .find((item) => item.signature === suggestedSignature)
    if (replacement) return `建议方案${replacement.oldIndex + 1}`

    // 真正的新组合才按底部“建议新增方案”的顺序分配新编号。
    const suggestedIndex = primaryUnboundSuggestedPlans(row?.primary_spec_name)
      .findIndex((plan) => plan.signature === suggestedSignature)
    const baseIndex = primarySourcePlans(row?.primary_spec_name).length
    return `建议方案${baseIndex + Math.max(0, suggestedIndex) + 1}`
  }
  if (!suggested.length || current.slice().sort().join('|') === suggested.slice().sort().join('|')) {
    return sourcePlanLabel(row)
  }
  const currentSignature = current.slice().sort().join('|')
  const oldPlanIndex = primarySourcePlans(row?.primary_spec_name)
    .findIndex((plan) => plan.signature === currentSignature)
  return oldPlanIndex >= 0 ? `新方案${oldPlanIndex + 1}` : '新方案'
}

const isLastPrimaryRow = (row, rowIndex) => {
  const rows = workflow.value?.admin_price_table || []
  const currentPrimary = String(row?.primary_spec_name || '')
  const nextPrimary = String(rows[rowIndex + 1]?.primary_spec_name || '')
  return rowIndex === rows.length - 1 || currentPrimary !== nextPrimary
}

const displayCategoryLabel = (category) => {
  const labels = {
    food_drink: '餐饮饮品',
    coffee_drink: '咖啡饮品'
  }
  return labels[category] || category || '-'
}

const selectedSkuPriceText = computed(() => formatPrice(selectedSku.value.price))

const selectedSkuAvailable = computed(() => isSkuAvailable(selectedSku.value))

const showQuantitySelector = computed(
  () => Boolean(selectedSkuAvailable.value && selectedSku.value.allow_batch_purchase)
)

const isResourceSoldOut = computed(() => {
  if (!workflow.value?.inventory_enabled) {
    return false
  }
  return Number(workflow.value.inventory_count || 0) <= 0
})

const selectSku = (skuId) => {
  const targetSku = displaySkus.value.find((item) => item.id === skuId)
  if (!isSkuAvailable(targetSku)) {
    return
  }
  selectedSkuId.value = skuId
}

const selectPrimaryGroup = (groupId) => {
  const currentSku = displaySkus.value.find((item) => item.id === selectedSkuId.value)
  const currentSecondaryId = currentSku?.secondary_spec_id || ''
  selectedPrimaryGroupId.value = groupId
  const group = skuGroups.value.find((item) => item.id === groupId)
  const sameSecondarySku = group?.children?.find(
    (item) => item.secondary_spec_id === currentSecondaryId
  )
  const nextSku = sameSecondarySku || group?.children?.find(isSkuAvailable) || group?.children?.[0]
  selectedSkuId.value = nextSku?.id || ''
}

const selectGalleryImage = (url) => {
  activeGalleryImage.value = url
}

const resetOrderFieldValues = () => {
  const nextValues = {}
  selectedSku.value.order_fields.forEach((field) => {
    nextValues[field.key] = orderFieldValues.value[field.key] || ''
  })
  orderFieldValues.value = nextValues
}

const validateOrderFields = () => {
  const missingField = selectedSku.value.order_fields.find(
    (field) => field.required && !String(orderFieldValues.value[field.key] || '').trim()
  )
  if (missingField) {
    showMessage(`请填写${missingField.label}`, 'warning')
    return false
  }
  const invalidField = selectedSku.value.order_fields.find((field) => {
    const value = String(orderFieldValues.value[field.key] || '').trim()
    if (!value) return false
    if (field.validation === 'phone') return !/^1[3-9]\d{9}$/.test(value)
    if (field.validation === 'email') return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    if (field.validation === 'qq') return !/^\d{5,12}$/.test(value)
    return false
  })
  if (invalidField) {
    showMessage(`请填写正确的${invalidField.label}`, 'warning')
    return false
  }
  return true
}

const buildExecutionVariables = () => {
  const variables = {
    selected_sku_id: selectedSku.value.id,
    selected_sku_name: selectedSku.value.name
  }

  if (selectedSku.value.order_fields.length > 0) {
    variables.order_fields = { ...orderFieldValues.value }
  }

  return variables
}

const stripHtml = (value = '') =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const updateWorkflowSeo = () => {
  if (!workflow.value) {
    return
  }

  const workflowName = workflow.value.name || t('marketDetail.seoFallbackTitle')
  const workflowDescription =
    workflow.value.description ||
    stripHtml(workflow.value.long_description || '') ||
    t('marketDetail.seoFallbackDescription')
  const keywordList = Array.isArray(workflow.value.keywords)
    ? workflow.value.keywords.filter(Boolean)
    : []

  setPageSeo({
    title: `${workflowName} - ${t('marketDetail.seoTitleSuffix')} | ${t('seo.siteName')}`,
    description: workflowDescription.slice(0, 160),
    keywords: [
      t('marketDetail.seoKeywordWorkflowDetail'),
      t('marketDetail.seoKeywordEmailAutomation'),
      workflowName,
      ...keywordList
    ].join(', '),
    canonicalPath: route.path,
    ogType: 'website'
  })
}

const handleImageError = (event, imageUrl) => {
  if (event?.target) {
    event.target.style.display = 'none'
  }
  validScreenshots.value = validScreenshots.value.filter((url) => url !== imageUrl)
  if (activeGalleryImage.value && !galleryImages.value.includes(activeGalleryImage.value)) {
    activeGalleryImage.value = galleryImages.value[0] || ''
  }
}

// 确认对话框
const confirmDialog = ref({
  visible: false,
  title: '',
  message: '',
  type: 'info',
  loading: false,
  onConfirm: () => {},
  onCancel: () => {}
})

const maxExecutionCount = computed(() => {
  if (!showQuantitySelector.value) {
    return 1
  }

  if (!workflow.value?.inventory_enabled) {
    return 99
  }
  return Math.max(1, Number(workflow.value.inventory_count || 0))
})

const calculatePlatformFee = (amount) => {
  if (workflow.value?.author_is_admin) {
    return 0
  }
  const normalizedAmount = Number(amount || 0)
  const fee = Math.floor(normalizedAmount * platformFeeRate.value * 100 + 1e-9) / 100
  return normalizedAmount > 0 && platformFeeRate.value > 0 && fee <= 0 ? 0.01 : fee
}

const itemExecutionPrice = computed(() =>
  Number((Number(selectedSku.value.price || 0) * selectedExecutionCount.value).toFixed(2))
)

const platformFeeAmount = computed(() => calculatePlatformFee(itemExecutionPrice.value))

const totalExecutionPrice = computed(() =>
  Number((itemExecutionPrice.value + platformFeeAmount.value).toFixed(2))
)

const buyerUnitPrice = computed(() => {
  const price = Number(selectedSku.value.price || 0)
  const fee = calculatePlatformFee(price)
  return Number((price + fee).toFixed(2))
})

const isOutlookWorkflow = computed(() => workflow.value?.category === 'outlook')

const syncExecutionCountState = (nextCount) => {
  const normalizedCount = Math.min(Math.max(Number(nextCount) || 1, 1), maxExecutionCount.value)
  selectedExecutionCount.value = normalizedCount
  executionCountInput.value = String(normalizedCount)
  return normalizedCount
}

const getExecutionCountInputString = () => String(executionCountInput.value ?? '')

const normalizeExecutionCount = () => {
  syncExecutionCountState(getExecutionCountInputString())
}

const handleExecutionCountInput = () => {
  const sanitized = getExecutionCountInputString().replace(/[^\d]/g, '')
  executionCountInput.value = sanitized

  if (!sanitized) {
    return
  }

  syncExecutionCountState(sanitized)
}

const increaseExecutionCount = () => {
  syncExecutionCountState(selectedExecutionCount.value + 1)
}

const decreaseExecutionCount = () => {
  syncExecutionCountState(selectedExecutionCount.value - 1)
}

const refreshInventoryCount = async () => {
  if (!workflow.value?.inventory_enabled) {
    return
  }

  try {
    const inventoryRes = await workflowApi.getInventoryCount(workflow.value.workflow_id)
    if (inventoryRes.code === 0) {
      workflow.value.inventory_count = inventoryRes.data.inventory_count
      syncExecutionCountState(selectedExecutionCount.value)
    }
  } catch (error) {
    console.error('获取库存失败:', error)
  }
}

const buildExecuteConfirmMessage = (count) => {
  const model = workflow.value.pricing_model
  const price = Number(workflow.value.milk_coin_price || 0)
  const name = workflow.value.name

  if (model === 'per_use') {
    if (isOutlookWorkflow.value) {
      if (count > 1) {
        return t('marketDetail.confirmBuyOutlookMultiple', {
          name,
          price: buyerUnitPrice.value,
          count,
          totalPrice: totalExecutionPrice.value
        })
      }
      return t('marketDetail.confirmBuyOutlook', { name, price: buyerUnitPrice.value })
    }
    if (count > 1) {
      return t('marketDetail.confirmExecutePerUseMultiple', {
        name,
        price: buyerUnitPrice.value,
        count,
        totalPrice: totalExecutionPrice.value
      })
    }
    return t('marketDetail.confirmExecutePerUse', { name, price: buyerUnitPrice.value })
  }

  if (model === 'subscription') {
    if (count > 1) {
      return t('marketDetail.confirmExecuteSubscriptionMultiple', { name, count })
    }
    return t('marketDetail.confirmExecuteSubscription', { name })
  }

  if (count > 1) {
    return t('marketDetail.confirmExecuteDefaultMultiple', { name, count })
  }

  return t('marketDetail.confirmExecuteDefault', { name })
}

// 加载工作流详情
const loadWorkflowDetail = async (showLoading = true) => {
  if (showLoading) {
    loading.value = true
  }

  try {
    const res = await getWorkflowDetail(workflowId.value)

    if (res.code === 0) {
      workflow.value = res.data
      const firstAvailableGroup = skuGroups.value.find((group) => group.children?.some(isSkuAvailable)) || skuGroups.value[0]
      const firstAvailableSku = firstAvailableGroup?.children?.find(isSkuAvailable) || firstAvailableGroup?.children?.[0] || displaySkus.value.find(isSkuAvailable) || displaySkus.value[0]
      selectedPrimaryGroupId.value = firstAvailableGroup?.id || ''
      selectedSkuId.value = firstAvailableSku?.id || ''
      resetOrderFieldValues()
      syncExecutionCountState(selectedExecutionCount.value)
      updateWorkflowSeo()

      // 初始化有效截图列表
      if (res.data.screenshots && Array.isArray(res.data.screenshots)) {
        validScreenshots.value = res.data.screenshots.filter((url) => url && url.trim())
      } else {
        validScreenshots.value = []
      }
      canReview.value = res.data.can_review || false

      // 加载评价
      if (res.data.reviews) {
        reviews.value = res.data.reviews
      }
      loadAdminPriceTable()
    }
  } catch (error) {
    console.error('加载失败:', error)
  } finally {
    loading.value = false
  }
}

const loadAdminPriceTable = async ({ analyze = false } = {}) => {
  if (!isAdminPriceTableVisible.value) return
  if (analyze) {
    adminPriceTableAnalyzing.value = true
  } else {
    adminPriceTableLoading.value = true
  }
  try {
    if (analyze) {
      adminPriceTableAnalysisStage.value = 'catalog'
      try {
        await refreshWorkflowAdminPriceCatalog(workflowId.value)
      } catch (firstError) {
        const status = Number(firstError?.response?.status || 0)
        if (status > 0 && status < 500) throw firstError
        await new Promise((resolve) => setTimeout(resolve, 800))
        await refreshWorkflowAdminPriceCatalog(workflowId.value)
      }
      adminPriceTableAnalysisStage.value = 'analysis'
    }
    const res = await getWorkflowAdminPriceTable(workflowId.value, { analyze })
    if (res.code === 0 && workflow.value) {
      workflow.value = {
        ...workflow.value,
        admin_price_table: Array.isArray(res.data?.items) ? res.data.items : [],
        admin_loss_leader_suggestions: Array.isArray(res.data?.loss_leader_suggestions)
          ? res.data.loss_leader_suggestions
          : [],
      }
      adminPriceTableAnalyzed.value = Boolean(res.data?.analysis_enabled)
    }
  } catch (error) {
    console.error('加载商品价格表失败:', error)
    if (analyze) {
      const detail = error?.response?.data?.detail
      const fallback = adminPriceTableAnalysisStage.value === 'catalog'
        ? '商品分类同步失败，请稍后再试'
        : 'AI 分析失败，请稍后再试'
      showMessage(detail || fallback, 'error')
    }
  } finally {
    if (analyze) {
      adminPriceTableAnalyzing.value = false
      adminPriceTableAnalysisStage.value = ''
    } else {
      adminPriceTableLoading.value = false
    }
  }
}

const runAdminPriceTableAnalysis = async () => {
  await loadAdminPriceTable({ analyze: true })
}

// 立即执行工作流
const executeNow = async () => {
  if (!selectedSkuAvailable.value) {
    showMessage('当前规格暂无可用编号，请先选择其他规格', 'warning')
    return
  }

  // 检查登录状态
  if (!userStore.isAuthenticated) {
    showMessage(t('marketDetail.loginBeforeExecute'), 'warning')
    router.push('/login')
    return
  }

  const model = workflow.value.pricing_model
  const price = selectedSku.value.price
  const currentWorkflowId = workflow.value.workflow_id
  const executionCount = showQuantitySelector.value
    ? syncExecutionCountState(executionCountInput.value)
    : 1

  if (!executionCount) {
    return
  }

  if (!validateOrderFields()) {
    return
  }

  // 如果是付费工作流,检查余额
  if (model === 'per_use' && price > 0) {
    try {
      const balanceRes = await getBalance()
      if (balanceRes.code === 0) {
        const userBalance = balanceRes.data.balance || 0
        const totalPrice = totalExecutionPrice.value

        // 余额不足,引导充值
        if (userBalance < totalPrice) {
          confirmDialog.value = {
            visible: true,
            title: t('marketDetail.insufficientCoinsTitle'),
            message:
              executionCount > 1
                ? t('marketDetail.insufficientCoinsMessageMultiple', {
                    price,
                    count: executionCount,
                    totalPrice,
                    balance: userBalance
                  })
                : t('marketDetail.insufficientCoinsMessage', { price, balance: userBalance }),
            type: 'warning',
            loading: false,
            onConfirm: () => {
              confirmDialog.value.visible = false
              // 跳转到财务中心充值页面,带上锚点定位到充值区域
              router.push('/user/finance#recharge')
            },
            onCancel: () => {
              confirmDialog.value.visible = false
            }
          }
          return
        }
      }
    } catch (error) {
      console.error('检查余额失败:', error)
    }
  }

  let title = t('marketDetail.confirmExecuteTitle')
  let message = buildExecuteConfirmMessage(executionCount)

  confirmDialog.value = {
    visible: true,
    title,
    message,
    loading: false,
    onConfirm: async () => {
      confirmDialog.value.loading = true
      try {
        const response = await workflowApi.executeWorkflow(
          currentWorkflowId,
          buildExecutionVariables(),
          { count: executionCount }
        )

        confirmDialog.value.visible = false
        await refreshInventoryCount()

        if (response.code !== 0) {
          showMessage(response.message || t('marketDetail.executionFailed'), 'error')
          return
        }

        if (response.data?.inventory_type === 'outlook' || isOutlookWorkflow.value) {
          await mailboxStore.fetchMailboxes()
          showMessage(response.message || t('marketDetail.outlookDelivered'), 'success')
          return
        }

        if (executionCount === 1) {
          const status = response.data.status
          if (Array.isArray(response.data.accounts) && response.data.accounts.length > 0) {
            executionResultData.value = response.data
            showExecutionResult.value = true
            showMessage(t('marketDetail.executionSuccess'), 'success')
            return
          }
          if (status === 'completed') {
            executionResultData.value = response.data
            showExecutionResult.value = true
            showMessage(t('marketDetail.executionSuccess'), 'success')
          } else if (status === 'failed') {
            showMessage(t('marketDetail.executionFailed'), 'error')
          } else {
            showMessage(t('marketDetail.executionSubmitted'), 'info')
          }
          return
        }

        const summary = response.data.summary || {}
        if (Array.isArray(response.data.accounts) && response.data.accounts.length > 0) {
          executionResultData.value = response.data
          showExecutionResult.value = true
        }
        const processingCount =
          Number(summary.executing_count || 0) + Number(summary.pending_count || 0)
        const messageType =
          Number(summary.failed_count || 0) > 0
            ? 'warning'
            : Number(summary.completed_count || 0) > 0
              ? 'success'
              : 'info'
        showMessage(
          t('marketDetail.executionBatchSummary', {
            count: executionCount,
            completed: Number(summary.completed_count || 0),
            submitted: processingCount,
            failed: Number(summary.failed_count || 0) + Number(summary.rejected_count || 0)
          }),
          messageType
        )
      } catch (error) {
        console.error('执行失败:', error)
        showMessage(t('marketDetail.executionFailed'), 'error')
      } finally {
        confirmDialog.value.loading = false
      }
    },
    onCancel: () => {
      confirmDialog.value.visible = false
    }
  }
}

// 显示评价对话框
// 提交评论
const submitReview = async () => {
  // 检查登录状态
  if (!userStore.isAuthenticated) {
    showMessage(t('marketDetail.loginBeforeReview'), 'warning')
    router.push('/login')
    return
  }

  if (!canReview.value) {
    showMessage(t('marketDetail.purchaseBeforeReview'), 'warning')
    return
  }

  if (!newComment.value.trim()) {
    showMessage(t('marketDetail.reviewContentRequired'), 'warning')
    return
  }

  try {
    const res = await createReview(workflow.value.id, {
      rating: newRating.value,
      comment: newComment.value.trim()
    })

    if (res.code === 0) {
      showMessage(t('marketDetail.reviewSuccess'), 'success')
      newComment.value = ''
      newRating.value = 5
      // 重新加载评价
      await loadWorkflowDetail()
    } else {
      showMessage(t('marketDetail.reviewFailed'), 'error')
    }
  } catch (error) {
    console.error('评价失败:', error)
    showMessage(t('marketDetail.reviewFailed'), 'error')
  }
}

// 回复评论
const replyToReview = async (review) => {
  // 检查登录状态
  if (!userStore.isAuthenticated) {
    showMessage(t('marketDetail.loginBeforeReply'), 'warning')
    router.push('/login')
    return
  }

  const comment = await showPrompt(
    t('marketDetail.replyPromptMessage', {
      name: review.user_name || t('marketDetail.anonymousUser')
    }),
    t('marketDetail.replyPromptTitle')
  )

  if (!comment || comment.trim() === '') {
    return
  }

  try {
    const res = await createReview(workflow.value.id, {
      rating: 0,
      comment: comment,
      parent_id: review.id
    })

    if (res.code === 0) {
      showMessage(t('marketDetail.replySuccess'), 'success')
      loadWorkflowDetail()
    }
  } catch (error) {
    console.error('回复失败:', error)
    showMessage(t('marketDetail.replyFailed'), 'error')
  }
}

// 图片预览
const previewImage = ref('')
const showImagePreview = ref(false)

const viewImage = (url) => {
  previewImage.value = url
  showImagePreview.value = true
}

// 获取分类文本
const getCategoryText = (category) => {
  const key = `marketDetail.categories.${category || 'other'}`
  return te(key) ? t(key) : category
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleDateString(getCurrentLocale())
}

// 删除评论
const deleteReviewById = async (reviewId) => {
  confirmDialog.value = {
    visible: true,
    title: t('marketDetail.deleteReviewConfirmTitle'),
    message: t('marketDetail.deleteReviewConfirmMessage'),
    type: 'warning',
    loading: false,
    onConfirm: async () => {
      confirmDialog.value.loading = true
      try {
        const res = await deleteReview(workflow.value.id, reviewId)
        if (res.code === 0) {
          showMessage(t('marketDetail.reviewDeleted'), 'success')
          confirmDialog.value.visible = false
          await loadWorkflowDetail()
        } else {
          showMessage(t('marketDetail.deleteFailed'), 'error')
        }
      } catch (error) {
        console.error('删除评论失败:', error)
        showMessage(t('marketDetail.deleteFailed'), 'error')
      } finally {
        confirmDialog.value.loading = false
      }
    },
    onCancel: () => {
      confirmDialog.value.visible = false
    }
  }
}

onMounted(async () => {
  await Promise.all([
    loadWorkflowDetail(),
    getFeeConfig()
      .then((feeRes) => {
        if (feeRes.code === 0) {
          platformFeeRate.value = Number(feeRes.data?.platform_fee_rate || 0)
        }
      })
      .catch((error) => {
        console.error('加载手续费配置失败:', error)
      })
  ])
})

watch(
  galleryImages,
  (images) => {
    if (!images.includes(activeGalleryImage.value)) {
      activeGalleryImage.value = images[0] || ''
    }
  },
  { immediate: true }
)

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      loadWorkflowDetail()
    }
  }
)

watch(
  () => selectedSku.value.id,
  () => {
    resetOrderFieldValues()
    syncExecutionCountState(1)
  }
)
</script>
