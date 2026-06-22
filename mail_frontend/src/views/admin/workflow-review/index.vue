<template>
  <div class="h-full">
    <div class=" h-full flex flex-col">

      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <!-- 待审核 -->
        <div class="bg-white rounded-lg shadow-sm border p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">待审核</p>
              <p class="text-2xl font-semibold text-orange-600 mt-1">{{ stats.pending }}</p>
            </div>
            <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <BaseIcon name="clock" size="w-6 h-6" class="text-orange-600" />
            </div>
          </div>
        </div>

        <!-- 已通过 -->
        <div class="bg-white rounded-lg shadow-sm border p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">已通过</p>
              <p class="text-2xl font-semibold text-green-600 mt-1">{{ stats.approved }}</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BaseIcon name="check-circle" size="w-6 h-6" class="text-green-600" />
            </div>
          </div>
        </div>

        <!-- 已拒绝 -->
        <div class="bg-white rounded-lg shadow-sm border p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">已拒绝</p>
              <p class="text-2xl font-semibold text-red-600 mt-1">{{ stats.rejected }}</p>
            </div>
            <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <BaseIcon name="x-circle" size="w-6 h-6" class="text-red-600" />
            </div>
          </div>
        </div>

        <!-- 已发布 -->
        <div class="bg-white rounded-lg shadow-sm border p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">已发布</p>
              <p class="text-2xl font-semibold text-blue-600 mt-1">{{ stats.published }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BaseIcon name="globe" size="w-6 h-6" class="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div class="flex flex-wrap items-center gap-4">
          <!-- 搜索 -->
          <BaseInput
            v-model="searchKeyword"
            type="text"
            placeholder="搜索工作流名称..."
            class="w-64"
            size="sm"
            @keyup.enter="handleSearch"
          >
            <template #left-icon>
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </template>
          </BaseInput>

          <!-- 审核状态筛选 -->
          <CustomSelect
            v-model="reviewStatus"
            :options="[
              { label: '全部状态', value: '' },
              { label: '待审核', value: 'pending' },
              { label: '已通过', value: 'approved' },
              { label: '已拒绝', value: 'rejected' }
            ]"
            placeholder="审核状态"
          />

          <!-- 分类筛选 -->
          <CustomSelect
            v-model="category"
            :options="[
              { label: '全部分类', value: '' },
              { label: '邮件处理', value: 'email' },
              { label: '数据采集', value: 'scraping' },
              { label: '自动化', value: 'automation' }
            ]"
            placeholder="工作流分类"
          />

          <!-- 排序 -->
          <CustomSelect
            v-model="sortBy"
            :options="[
              { label: '最新创建', value: 'created_desc' },
              { label: '最早创建', value: 'created_asc' },
              { label: '最近更新', value: 'updated_desc' }
            ]"
            placeholder="排序方式"
          />

          <!-- 操作按钮 -->
          <div class="flex gap-2 ml-auto">
            <button
              @click="handleSearch"
              class="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              查询
            </button>
            <button
              @click="handleReset"
              class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重置
            </button>
          </div>
        </div>
      </div>

      <!-- 工作流列表 -->
      <AdminDataTable
        title="工作流列表"
        :pagination="pagination"
        :loading="loading"
        :show-page-size-selector="true"
        :column-count="7"
        @page-change="changePage"
        @page-size-change="changePageSize"
      >
        <template #thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">工作流</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">创建者</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">分类</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">价格</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">提交时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">操作</th>
          </tr>
        </template>
        <template #tbody>
          <tr v-for="workflow in workflows" :key="workflow.id" class="hover:bg-gray-50">
            <!-- 工作流 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div>
                <div class="text-sm font-medium text-black">{{ workflow.name }}</div>
                <div class="text-xs text-gray-500 mt-1 truncate max-w-xs">{{ workflow.description }}</div>
              </div>
            </td>

            <!-- 创建者 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-black">{{ workflow.creator_name || '未知' }}</div>
              <div class="text-xs text-gray-500">ID: {{ workflow.creator_id }}</div>
            </td>

            <!-- 分类 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="[
                'px-2 py-1 inline-flex text-xs font-medium rounded',
                getCategoryColor(workflow.category)
              ]">
                {{ getCategoryLabel(workflow.category) }}
              </span>
            </td>

            <!-- 价格 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
              <div v-if="workflow.milk_coin_price > 0">
                {{ workflow.milk_coin_price }}
              </div>
              <div v-else class="text-green-600">免费</div>
            </td>

            <!-- 状态 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex flex-col gap-1">
                <!-- 优先显示禁用状态 -->
                <span v-if="workflow.status === 'inactive'" class="px-2 py-1 inline-flex text-xs font-medium rounded w-fit bg-gray-50 text-gray-700 border border-gray-200">
                  已禁用
                </span>
                <!-- 其次显示审核状态（如果不是已通过） -->
                <span v-else-if="workflow.review_status !== 'approved'" :class="[
                  'px-2 py-1 inline-flex text-xs font-medium rounded w-fit',
                  workflow.review_status === 'pending' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                  workflow.review_status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                  'bg-gray-50 text-gray-700 border border-gray-200'
                ]">
                  {{ getReviewStatusLabel(workflow.review_status) }}
                </span>
                <!-- 最后显示市场状态（已审核通过的情况） -->
                <span v-else-if="workflow.market_status === 'published'" class="px-2 py-1 inline-flex text-xs font-medium rounded w-fit bg-blue-50 text-blue-700 border border-blue-200">
                  已上架
                </span>
                <span v-else class="px-2 py-1 inline-flex text-xs font-medium rounded w-fit bg-green-50 text-green-700 border border-green-200">
                  已通过
                </span>
              </div>
            </td>

            <!-- 提交时间 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
              {{ formatDate(workflow.created_at) }}
            </td>

            <!-- 操作 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <ActionButton
                icon="eye"
                tooltip="查看详情"
                variant="view"
                @click="viewDetail(workflow)"
              />
              <ActionButton
                v-if="workflow.review_status === 'pending'"
                icon="check"
                tooltip="通过审核"
                variant="primary"
                @click="approveWorkflow(workflow)"
              />
              <ActionButton
                v-if="workflow.review_status === 'pending'"
                icon="x"
                tooltip="拒绝审核"
                variant="delete"
                @click="rejectWorkflow(workflow)"
              />
              <!-- 上架/下架按钮 -->
              <ActionButton
                v-if="workflow.review_status === 'approved' && workflow.market_status !== 'published'"
                icon="upload"
                tooltip="上架到市场"
                variant="primary"
                @click="publishWorkflow(workflow)"
              />
              <ActionButton
                v-if="workflow.market_status === 'published'"
                icon="download"
                tooltip="下架"
                variant="warning"
                @click="unpublishWorkflow(workflow)"
              />
              <ActionButton
                v-if="workflow.review_status === 'approved'"
                icon="database"
                tooltip="库存管理"
                variant="primary"
                @click="openInventory(workflow)"
              />
            </td>
          </tr>
        </template>
      </AdminDataTable>
    </div>

    <!-- 工作流详情弹窗 -->
    <BaseModal
      v-model="showDetailModal"
      title="工作流详情"
      size="xl"
      :show-footer="false"
    >
      <div v-if="currentWorkflow" class="space-y-5">
        <!-- 顶部工作流基本信息卡片 -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-900 mb-2">{{ currentWorkflow.name }}</h3>
              <p class="text-gray-600 text-sm mb-3">{{ currentWorkflow.description || '暂无描述' }}</p>
              <div class="flex items-center gap-4 flex-wrap">
                <span :class="[
                  'px-3 py-1 text-xs font-medium rounded-full',
                  getCategoryColor(currentWorkflow.category)
                ]">
                  {{ getCategoryLabel(currentWorkflow.category) }}
                </span>
                <span class="text-sm text-gray-600">
                  <span class="font-semibold">{{ currentWorkflow.milk_coin_price > 0 ? currentWorkflow.milk_coin_price + ' 奶片' : '免费' }}</span>
                  <span class="mx-1">·</span>
                  <span>{{ currentWorkflow.pricing_model === 'free' ? '免费' : currentWorkflow.pricing_model === 'per_use' ? '按次付费' : currentWorkflow.pricing_model === 'one_time' ? '一次性购买' : '订阅制' }}</span>
                </span>
                <span class="text-sm text-gray-600">
                  创建者: <span class="font-medium">{{ currentWorkflow.creator_name || '未知' }}</span>
                </span>
              </div>
            </div>
            <div class="flex flex-col items-end gap-2">
              <div class="flex items-center gap-1 text-yellow-600">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span class="text-sm font-semibold">{{ currentWorkflow.rating || 0 }}</span>
                <span class="text-xs text-gray-500">({{ currentWorkflow.review_count || 0 }})</span>
              </div>
              <div class="text-xs text-gray-500">
                <span class="font-medium text-gray-700">{{ currentWorkflow.purchase_count || 0 }}</span> 次购买
                <span class="mx-1">·</span>
                <span class="font-medium text-gray-700">{{ currentWorkflow.total_calls || 0 }}</span> 次调用
              </div>
            </div>
          </div>
        </div>

        <!-- 状态信息 -->
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-white rounded-lg p-4 border border-gray-200">
            <div class="text-xs text-gray-500 mb-1">审核状态</div>
            <div class="text-sm font-semibold text-gray-900">{{ getReviewStatusLabel(currentWorkflow.review_status) }}</div>
          </div>
          <div class="bg-white rounded-lg p-4 border border-gray-200">
            <div class="text-xs text-gray-500 mb-1">市场状态</div>
            <div class="text-sm font-semibold text-gray-900">{{ currentWorkflow.market_status === 'published' ? '已上架' : currentWorkflow.market_status === 'draft' ? '草稿' : '未上架' }}</div>
          </div>
          <div class="bg-white rounded-lg p-4 border border-gray-200">
            <div class="text-xs text-gray-500 mb-1">工作流状态</div>
            <div class="text-sm font-semibold text-gray-900">{{ currentWorkflow.status === 'active' ? '正常' : currentWorkflow.status === 'inactive' ? '已禁用' : '草稿' }}</div>
          </div>
        </div>

        <!-- 审核意见 -->
        <div v-if="currentWorkflow.review_reason" class="bg-red-50 rounded-lg p-4 border border-red-200">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div class="flex-1">
              <div class="text-sm font-semibold text-red-900 mb-1">审核意见</div>
              <div class="text-sm text-red-700">{{ currentWorkflow.review_reason }}</div>
            </div>
          </div>
        </div>

        <!-- 工作流配置 - 重点美化 -->
        <div class="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-base font-bold text-gray-900">工作流配置</h4>
            <span class="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              {{ getWorkflowSteps(currentWorkflow).length }} 个步骤
            </span>
          </div>
          
          <div class="space-y-3">
            <div
              v-for="(step, index) in getWorkflowSteps(currentWorkflow)"
              :key="index"
              class="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow"
            >
              <!-- 步骤标题 -->
              <div class="flex items-start gap-3 mb-3">
                <div class="flex-shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {{ index + 1 }}
                </div>
                <div class="flex-1">
                  <h5 class="text-sm font-bold text-gray-900 mb-1">{{ step.name || step.action || 'Unnamed Step' }}</h5>
                  <p v-if="step.description" class="text-xs text-gray-600">{{ step.description }}</p>
                </div>
              </div>

              <!-- 技术详情 -->
              <div class="ml-10 space-y-2">
                <!-- Action -->
                <div class="flex items-start gap-2">
                  <span class="text-xs font-mono bg-purple-100 text-purple-700 px-2 py-1 rounded font-semibold min-w-[80px] inline-block">action</span>
                  <code class="text-xs font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded flex-1">{{ step.action || 'N/A' }}</code>
                </div>

                <!-- Plugin ID -->
                <div v-if="step.plugin_id" class="flex items-start gap-2">
                  <span class="text-xs font-mono bg-green-100 text-green-700 px-2 py-1 rounded font-semibold min-w-[80px] inline-block">plugin_id</span>
                  <code class="text-xs font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded flex-1">{{ step.plugin_id }}</code>
                </div>

                <!-- Step ID -->
                <div v-if="step.step_id" class="flex items-start gap-2">
                  <span class="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold min-w-[80px] inline-block">step_id</span>
                  <code class="text-xs font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded flex-1">{{ step.step_id }}</code>
                </div>

                <!-- Parameters -->
                <div v-if="step.parameters && Object.keys(step.parameters).length > 0" class="space-y-1">
                  <div class="text-xs font-mono bg-orange-100 text-orange-700 px-2 py-1 rounded font-semibold inline-block">parameters</div>
                  <div class="bg-gray-50 rounded p-2 border border-gray-200">
                    <pre class="text-xs font-mono text-gray-700 whitespace-pre-wrap">{{ JSON.stringify(step.parameters, null, 2) }}</pre>
                  </div>
                </div>

                <!-- Config -->
                <div v-if="step.config && Object.keys(step.config).length > 0" class="space-y-1">
                  <div class="text-xs font-mono bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-semibold inline-block">config</div>
                  <div class="bg-gray-50 rounded p-2 border border-gray-200">
                    <pre class="text-xs font-mono text-gray-700 whitespace-pre-wrap">{{ JSON.stringify(step.config, null, 2) }}</pre>
                  </div>
                </div>

                <!-- Timeout & Retry -->
                <div class="flex gap-3 flex-wrap">
                  <div v-if="step.timeout" class="flex items-center gap-1">
                    <span class="text-xs text-gray-500">timeout:</span>
                    <code class="text-xs font-mono text-gray-700">{{ step.timeout }}s</code>
                  </div>
                  <div v-if="step.retry_count" class="flex items-center gap-1">
                    <span class="text-xs text-gray-500">retry_count:</span>
                    <code class="text-xs font-mono text-gray-700">{{ step.retry_count }}</code>
                  </div>
                  <div v-if="step.parallel !== undefined" class="flex items-center gap-1">
                    <span class="text-xs text-gray-500">parallel:</span>
                    <code class="text-xs font-mono text-gray-700">{{ step.parallel }}</code>
                  </div>
                </div>

                <!-- Output Name -->
                <div v-if="step.output_name" class="flex items-start gap-2">
                  <span class="text-xs font-mono bg-teal-100 text-teal-700 px-2 py-1 rounded font-semibold min-w-[80px] inline-block">output_name</span>
                  <code class="text-xs font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded flex-1">{{ step.output_name }}</code>
                </div>
              </div>
            </div>
            
            <div v-if="getWorkflowSteps(currentWorkflow).length === 0" class="text-center py-8 text-gray-400">
              <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-sm">暂无步骤配置</p>
            </div>
          </div>
        </div>

        <!-- 详细描述 -->
        <div v-if="currentWorkflow.long_description" class="bg-white rounded-lg p-4 border border-gray-200">
          <h4 class="text-sm font-semibold text-gray-900 mb-3">详细描述</h4>
          <div class="prose prose-sm max-w-none text-gray-700" v-html="currentWorkflow.long_description"></div>
        </div>

        <!-- 时间信息 -->
        <div class="grid grid-cols-2 gap-3 text-xs text-gray-600">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>创建: {{ formatDate(currentWorkflow.created_at) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8 8 0 1115.356 2M15 15v5h5" />
            </svg>
            <span>更新: {{ formatDate(currentWorkflow.updated_at) }}</span>
          </div>
          <div v-if="currentWorkflow.published_at" class="flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>发布: {{ formatDate(currentWorkflow.published_at) }}</span>
          </div>
          <div v-if="currentWorkflow.reviewed_at" class="flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>审核: {{ formatDate(currentWorkflow.reviewed_at) }}</span>
          </div>
        </div>
      </div>
    </BaseModal>

    <!-- 通过审核确认弹窗 -->
    <ConfirmDialog
      v-model:visible="showApproveModal"
      type="success"
      title="通过审核"
      :message="`确定通过工作流「${workflowToApprove?.name}」的审核吗？\n\n通过后将自动上架到市场，作者和用户都可以看到。`"
      confirm-text="通过审核"
      cancel-text="取消"
      :show-warning="false"
      @confirm="confirmApprove"
    />

    <!-- 上架确认弹窗 -->
    <ConfirmDialog
      v-model:visible="showPublishModal"
      type="info"
      title="上架到市场"
      :message="`确定上架工作流「${workflowToPublish?.name}」到市场吗？\n\n上架后用户即可看到并购买使用。`"
      confirm-text="上架"
      cancel-text="取消"
      :show-warning="false"
      @confirm="confirmPublish"
    />

    <!-- 下架确认弹窗 -->
    <ConfirmDialog
      v-model:visible="showUnpublishModal"
      type="warning"
      title="下架工作流"
      :message="`确定下架工作流「${workflowToUnpublish?.name}」吗？\n\n下架后将从市场移除，用户无法看到。`"
      confirm-text="下架"
      cancel-text="取消"
      :show-warning="false"
      @confirm="confirmUnpublish"
    />

    <!-- 拒绝工作流弹窗 -->
    <BaseModal
      v-model="showRejectModal"
      title="拒绝工作流"
      size="md"
      :show-cancel="true"
      :show-confirm="true"
      cancel-text="取消"
      confirm-text="确认拒绝"
      @confirm="confirmReject"
    >
      <div v-if="workflowToReject" class="space-y-4">
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div class="flex-1">
              <h4 class="text-sm font-semibold text-yellow-900 mb-1">拒绝工作流审核</h4>
              <p class="text-sm text-yellow-700">工作流: <span class="font-medium">{{ workflowToReject.name }}</span></p>
              <p class="text-xs text-yellow-600 mt-1">作者将收到拒绝通知和您填写的原因</p>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            拒绝原因 <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="rejectReason"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            placeholder="请详细说明拒绝原因，帮助作者改进工作流..."
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">{{ rejectReason.length }} / 500 字</p>
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p class="text-xs text-blue-700">
            <span class="font-semibold">提示：</span>请清晰说明拒绝原因，如：内容违规、功能不完善、描述不清等，帮助作者改进后重新提交。
          </p>
        </div>
      </div>
    </BaseModal>

    <InventoryManagementModal
      v-if="showInventoryModal && inventoryWorkflow"
      :workflow="inventoryWorkflow"
      :admin-mode="true"
      @close="closeInventory"
      @updated="handleInventoryUpdated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { showMessage } from '@/utils/message'
import { showConfirm, showPrompt, showAlert } from '@/utils/dialog'
import {
  adminGetReviewList,
  adminApproveWorkflow,
  adminRejectWorkflow,
  adminPublishWorkflow,
  adminUnpublishWorkflow
} from '@/api/workflowMarket'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseIcon from '@/components/BaseIcon/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import InventoryManagementModal from '@/views/portal/workflows/components/InventoryManagementModal/index.vue'
import api from '@/services/api'

// 当前管理员ID
const adminId = ref(parseInt(localStorage.getItem('userId')) || 1)

// 统计数据
const stats = ref({
  pending: 0,
  approved: 0,
  rejected: 0,
  published: 0
})

// 筛选条件
const reviewStatus = ref('pending')  // 默认显示待审核
const category = ref('')
const sortBy = ref('created_desc')
const searchKeyword = ref('')

// 工作流列表
const workflows = ref([])

// 分页
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(false)

// 分页数据
const pagination = computed(() => ({
  currentPage: page.value,
  page: page.value,
  totalPages: Math.ceil(total.value / pageSize.value),
  pages: Math.ceil(total.value / pageSize.value),
  total: total.value,
  pageSize: pageSize.value,
  limit: pageSize.value
}))

// 详情弹窗
const showDetailModal = ref(false)
const currentWorkflow = ref(null)

// 拒绝弹窗
const showRejectModal = ref(false)
const rejectReason = ref('')
const workflowToReject = ref(null)

// 通过审核弹窗
const showApproveModal = ref(false)
const workflowToApprove = ref(null)

// 上架弹窗
const showPublishModal = ref(false)
const workflowToPublish = ref(null)

// 下架弹窗
const showUnpublishModal = ref(false)
const workflowToUnpublish = ref(null)

// 库存管理弹窗
const showInventoryModal = ref(false)
const inventoryWorkflow = ref(null)

const openInventory = (workflow) => {
  inventoryWorkflow.value = workflow
  showInventoryModal.value = true
}

const closeInventory = () => {
  showInventoryModal.value = false
  inventoryWorkflow.value = null
}

const handleInventoryUpdated = async () => {
  const currentId = inventoryWorkflow.value?.id
  await loadWorkflows()
  if (currentId) {
    inventoryWorkflow.value = workflows.value.find(item => item.id === currentId) || inventoryWorkflow.value
  }
}

// 切换页码
const changePage = (newPage) => {
  page.value = newPage
  loadWorkflows()
}

// 切换每页数量
const changePageSize = (newPageSize) => {
  pageSize.value = newPageSize
  page.value = 1
  loadWorkflows()
}

// 加载工作流列表（包含统计）
const loadWorkflows = async () => {
  loading.value = true
  try {
    const res = await adminGetReviewList({
      review_status: reviewStatus.value || null,
      category: category.value || null,
      sort_by: sortBy.value || null,
      keyword: searchKeyword.value || null,
      page: page.value,
      page_size: pageSize.value
    })

    if (res.code === 0) {
      workflows.value = res.data.list || res.data.items || []
      total.value = res.data.total || 0

      // 更新统计
      if (res.data.stats) {
        stats.value = {
          pending: res.data.stats.pending || 0,
          approved: res.data.stats.approved || 0,
          rejected: res.data.stats.rejected || 0,
          published: res.data.stats.published || 0
        }
      }
    }
  } catch (error) {
    console.error('加载审核列表失败:', error)
    showMessage('加载审核列表失败', 'error')
  } finally {
    loading.value = false
  }
}

// 查看详情
const viewDetail = (workflow) => {
  currentWorkflow.value = workflow
  showDetailModal.value = true
}

// 获取工作流配置步骤
const getWorkflowSteps = (workflow) => {
  try {
    const config = typeof workflow.config === 'string' ? JSON.parse(workflow.config) : workflow.config
    return config?.steps || []
  } catch (e) {
    console.error('解析配置失败:', e)
    return []
  }
}

// 获取分类颜色
const getCategoryColor = (category) => {
  const colors = {
    'office_automation': 'bg-blue-100 text-blue-700',
    'data_processing': 'bg-green-100 text-green-700',
    'ai_assistant': 'bg-purple-100 text-purple-700',
    'web_scraping': 'bg-orange-100 text-orange-700',
    'email_processing': 'bg-pink-100 text-pink-700',
    'file_management': 'bg-yellow-100 text-yellow-700',
    'communication': 'bg-indigo-100 text-indigo-700',
    'productivity': 'bg-teal-100 text-teal-700',
    'other': 'bg-gray-100 text-gray-700'
  }
  return colors[category] || colors.other
}

// 通过审核 - 打开弹窗
const approveWorkflow = (workflow) => {
  workflowToApprove.value = workflow
  showApproveModal.value = true
}

// 确认通过审核
const confirmApprove = async () => {
  try {
    const res = await adminApproveWorkflow(workflowToApprove.value.id)
    if (res.code === 0) {
      showMessage('审核通过并已自动上架到市场！', 'success')
      await loadWorkflows()
    } else {
      showMessage(res.message || '审核失败', 'error')
    }
  } catch (error) {
    console.error('审核失败:', error)
    showMessage('审核失败', 'error')
  } finally {
    showApproveModal.value = false
  }
}

// 拒绝审核 - 打开弹窗
const rejectWorkflow = (workflow) => {
  workflowToReject.value = workflow
  rejectReason.value = ''
  showRejectModal.value = true
}

// 确认拒绝
const confirmReject = async () => {
  if (!rejectReason.value || rejectReason.value.trim() === '') {
    showMessage('请输入拒绝原因', 'warning')
    return
  }
  
  try {
    const res = await adminRejectWorkflow(workflowToReject.value.id, rejectReason.value)
    if (res.code === 0) {
      showMessage('已拒绝，作者将收到拒绝原因通知', 'success')
      showRejectModal.value = false
      await loadWorkflows()
    } else {
      showMessage(res.message || '操作失败', 'error')
    }
  } catch (error) {
    console.error('拒绝失败:', error)
    showMessage('拒绝失败', 'error')
  }
}

// 上架工作流到市场 - 打开弹窗
const publishWorkflow = (workflow) => {
  workflowToPublish.value = workflow
  showPublishModal.value = true
}

// 确认上架
const confirmPublish = async () => {
  try {
    const res = await adminPublishWorkflow(workflowToPublish.value.id)
    if (res.code === 0) {
      showMessage('已上架到市场', 'success')
      await loadWorkflows()
    } else {
      showMessage(res.message || '上架失败', 'error')
    }
  } catch (error) {
    console.error('上架失败:', error)
    showMessage('上架失败', 'error')
  } finally {
    showPublishModal.value = false
  }
}

// 下架工作流 - 打开弹窗
const unpublishWorkflow = (workflow) => {
  workflowToUnpublish.value = workflow
  showUnpublishModal.value = true
}

// 确认下架
const confirmUnpublish = async () => {
  try {
    const res = await adminUnpublishWorkflow(workflowToUnpublish.value.id)
    if (res.code === 0) {
      showMessage('已下架', 'success')
      await loadWorkflows()
    } else {
      showMessage(res.message || '下架失败', 'error')
    }
  } catch (error) {
    console.error('下架失败:', error)
    showMessage('下架失败', 'error')
  } finally {
    showUnpublishModal.value = false
  }
}

// 获取分类标签
const getCategoryLabel = (category) => {
  const map = {
    email: '邮件处理',
    scraping: '数据采集',
    automation: '自动化',
    image: '图片处理',
    outlook: 'Outlook 邮箱'
  }
  return map[category] || category || '其他'
}

// 获取审核状态标签
const getReviewStatusLabel = (status) => {
  const map = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return map[status] || status || '未知'
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 查询按钮
const handleSearch = () => {
  page.value = 1
  loadWorkflows()
}

// 重置按钮
const handleReset = () => {
  reviewStatus.value = 'pending'  // 重置后默认显示待审核
  category.value = ''
  sortBy.value = 'created_desc'
  searchKeyword.value = ''
  page.value = 1
  loadWorkflows()
}

// 移除自动监听，改为手动点击查询
// watch([reviewStatus, category, sortBy, searchKeyword], () => {
//   page.value = 1
//   loadWorkflows()
// })

onMounted(() => {
  loadWorkflows()
})
</script>
