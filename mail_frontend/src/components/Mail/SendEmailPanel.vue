<template>
  <div :class="pageMode ? 'h-full min-h-0 overflow-hidden' : 'scrollbar-stable h-full overflow-y-auto pr-1'">
    <div :class="pageMode ? 'h-full min-h-0' : 'mx-auto max-w-4xl space-y-4 pb-6'">
      <div
        v-if="!isDesktop && !pageMode"
        class="flex items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700 shadow-sm"
      >
        <svg class="h-5 w-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        <span class="text-sm">{{ tc('desktopOnlyBanner') }}</span>
      </div>

      <div
        v-if="selectedAccountIds.length === 0 && !pageMode"
        class="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-gray-200 bg-white text-center text-gray-400 shadow-sm"
      >
        <svg class="mb-4 h-12 w-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p class="text-sm">{{ tc('emptyState') }}</p>
      </div>

      <div
        v-if="useComposeOverlay"
        class="fixed inset-0 z-[70] bg-slate-950/20 backdrop-blur-[2px]"
        @click="toggleComposeFullscreen"
      ></div>

      <section
        v-if="!(selectedAccountIds.length === 0 && !pageMode)"
        ref="composeSectionRef"
        :class="composeSectionClass"
      >
        <div :class="pageMode ? 'flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4' : 'border-b border-gray-100 px-5 py-4 sm:px-6'">
          <div class="flex flex-1 flex-wrap items-center justify-between gap-3">
            <div v-if="!pageMode">
              <p class="text-base font-semibold text-gray-900">{{ tc('panelTitle') }}</p>
              <p class="mt-1 text-sm text-gray-500">{{ tc('panelDescription') }}</p>
            </div>
            <div class="flex w-full min-w-0 flex-wrap items-center justify-between gap-3">
              <div class="flex min-w-0 flex-wrap gap-2">
                <button
                  @click="downloadTemplate"
                  class="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  {{ tc('downloadRecipientTemplate') }}
                </button>
                <button
                  @click="triggerImport"
                  class="inline-flex items-center gap-1 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                  </svg>
                  {{ tc('importExcel') }}
                </button>
              </div>
              <div v-if="pageMode" class="ml-auto flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  @click="toggleComposeFullscreen"
                  class="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                >
                  {{ isComposeFullscreen ? tc('fullscreenExit') : tc('fullscreenEnter') }}
                </button>
                <button
                  @click="sendEmail"
                  :disabled="sending || !canSend"
                  :class="[
                    'inline-flex h-9 w-[104px] flex-shrink-0 items-center justify-center rounded-xl text-sm font-semibold transition-colors',
                    canSend && !sending
                      ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700'
                      : 'cursor-not-allowed bg-gray-300 text-gray-500'
                  ]"
                >
                  {{ sending ? tc('sending') : t('sendEmail.send') }}
                </button>
              </div>
              <input
                ref="fileInput"
                type="file"
                accept=".xlsx,.xls"
                class="hidden"
                @change="handleFileImport"
              />
            </div>
          </div>
        </div>

        <div :class="composeGridClass">
          <div :class="pageMode ? 'flex min-h-0 min-w-0 flex-col gap-2.5 overflow-hidden' : 'min-w-0 space-y-6'">
            <div>
              <div class="mb-1.5 flex items-center justify-between">
                <label class="block text-sm font-medium text-gray-700">
                  {{ t('sendEmail.recipient') }} <span class="text-red-500">*</span>
                </label>
                <span v-if="!isCompactAiPanel" class="text-xs text-gray-400">{{ tc('recipientHint') }}</span>
              </div>
              <div
                :class="[
                  'flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 transition-colors focus-within:border-primary-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary-50',
                pageMode ? 'min-h-[40px] py-1' : 'min-h-[52px] py-2'
                ]"
                @click="recipientInputRef?.focus()"
              >
                <span
                  v-for="(email, index) in recipients"
                  :key="index"
                  class="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-white px-3 py-1 text-sm text-primary-700 shadow-sm"
                >
                  {{ email }}
                  <button
                    type="button"
                    class="ml-0.5 text-primary-400 transition-colors hover:text-red-500"
                    @click.stop="removeRecipient(index)"
                  >
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
                <input
                  ref="recipientInputRef"
                  v-model="recipientInput"
                  type="text"
                  :placeholder="recipients.length === 0 ? tc('recipientInlinePlaceholder') : ''"
                  class="min-w-[160px] flex-1 border-none bg-transparent p-0 text-sm outline-none focus:ring-0"
                  @keydown="handleRecipientKeydown"
                  @blur="commitRecipientInput"
                  @paste="handleRecipientPaste"
                />
              </div>
              <p v-if="importCount > 0" class="mt-2 text-sm text-emerald-600">
                {{ tc('importedRecipients', { count: importCount }) }}
              </p>
            </div>

            <div v-if="showCcBcc" class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('sendEmail.cc') }}</label>
                <div
                  :class="[
                    'flex flex-nowrap items-center gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50 px-3 transition-colors [scrollbar-width:none] focus-within:border-primary-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary-50 [&::-webkit-scrollbar]:hidden',
                    pageMode ? 'min-h-[40px] py-1' : 'min-h-[52px] py-2'
                  ]"
                  @click="ccInputRef?.focus()"
                >
                  <span
                    v-for="(email, index) in ccRecipients"
                    :key="`cc-${index}`"
                    class="inline-flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-primary-200 bg-white px-3 py-1 text-sm text-primary-700 shadow-sm"
                  >
                    {{ email }}
                    <button
                      type="button"
                      class="ml-0.5 text-primary-400 transition-colors hover:text-red-500"
                      @click.stop="removeCcRecipient(index)"
                    >
                      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                  <input
                    ref="ccInputRef"
                    v-model="ccInput"
                    type="text"
                    :placeholder="ccRecipients.length === 0 ? tc('ccInlinePlaceholder') : ''"
                    class="min-w-[160px] flex-1 border-none bg-transparent p-0 text-sm outline-none focus:ring-0"
                    @keydown="handleCcKeydown"
                    @blur="commitCcInput"
                    @paste="handleCcPaste"
                  />
                </div>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('sendEmail.bcc') }}</label>
                <div
                  :class="[
                    'flex flex-nowrap items-center gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50 px-3 transition-colors [scrollbar-width:none] focus-within:border-primary-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary-50 [&::-webkit-scrollbar]:hidden',
                    pageMode ? 'min-h-[40px] py-1' : 'min-h-[52px] py-2'
                  ]"
                  @click="bccInputRef?.focus()"
                >
                  <span
                    v-for="(email, index) in bccRecipients"
                    :key="`bcc-${index}`"
                    class="inline-flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-primary-200 bg-white px-3 py-1 text-sm text-primary-700 shadow-sm"
                  >
                    {{ email }}
                    <button
                      type="button"
                      class="ml-0.5 text-primary-400 transition-colors hover:text-red-500"
                      @click.stop="removeBccRecipient(index)"
                    >
                      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                  <input
                    ref="bccInputRef"
                    v-model="bccInput"
                    type="text"
                    :placeholder="bccRecipients.length === 0 ? tc('bccInlinePlaceholder') : ''"
                    class="min-w-[160px] flex-1 border-none bg-transparent p-0 text-sm outline-none focus:ring-0"
                    @keydown="handleBccKeydown"
                    @blur="commitBccInput"
                    @paste="handleBccPaste"
                  />
                </div>
              </div>
            </div>

            <button
              v-else
              @click="showCcBcc = true"
              class="inline-flex items-center rounded-xl px-2 py-1 text-sm text-primary-700 transition-colors hover:bg-primary-50"
            >
              {{ tc('addCcBcc') }}
            </button>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">
                {{ t('sendEmail.subject') }} <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.subject"
                type="text"
                :placeholder="t('sendEmail.subjectPlaceholder')"
                :class="[
                  'w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-50',
                  pageMode ? 'py-2' : 'py-3'
                ]"
              />
            </div>

            <div>
              <div class="mb-1.5 flex items-center justify-between">
                <label class="block text-sm font-medium text-gray-700">{{ tc('attachment') }}</label>
                <button
                  @click="triggerAttachmentSelect"
                  class="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828a4 4 0 10-5.656-5.656L4.929 11.586a6 6 0 108.485 8.485L20 13" />
                  </svg>
                  {{ tc('addAttachment') }}
                </button>
                <input
                  ref="attachmentInput"
                  type="file"
                  multiple
                  class="hidden"
                  @change="handleAttachmentSelect"
                />
              </div>
              <div v-if="attachments.length > 0" class="flex flex-wrap gap-2">
                <div
                  v-for="(attachment, index) in attachments"
                  :key="`${attachment.name}-${attachment.size}-${index}`"
                  class="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                >
                  <span class="max-w-[220px] truncate">{{ attachment.name }}</span>
                  <span class="text-gray-400">{{ formatFileSize(attachment.size) }}</span>
                  <button
                    @click="removeAttachment(index)"
                    class="text-gray-400 transition-colors hover:text-red-500"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div
                v-if="historicalAttachmentHints.length > 0 && attachments.length === 0"
                class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <p class="text-sm font-medium text-amber-800">{{ tc('originalAttachments') }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span
                    v-for="(attachment, index) in historicalAttachmentHints"
                    :key="`${attachment.name}-${index}`"
                    class="rounded-full border border-amber-200 bg-white px-3 py-1 text-sm text-amber-700"
                  >
                    {{ attachment.name }}<span v-if="attachment.size"> · {{ formatFileSize(attachment.size) }}</span>
                  </span>
                </div>
                <p class="mt-2 text-xs text-amber-700">{{ tc('reselectAttachmentHint') }}</p>
              </div>
              <p v-if="attachments.length === 0 && historicalAttachmentHints.length === 0" class="text-sm text-gray-400">{{ tc('noAttachment') }}</p>
            </div>

            <div :class="pageMode ? 'flex min-h-0 flex-1 flex-col' : ''">
              <div class="mb-1.5 flex items-center justify-between gap-3">
                <label class="block text-sm font-medium text-gray-700">
                  {{ t('sendEmail.body') }} <span class="text-red-500">*</span>
                </label>
                <div class="flex items-center gap-2">
                  <div class="rounded-full bg-slate-100 p-1">
                    <div class="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        @click="bodyMode = 'rich'"
                        class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                        :class="bodyMode === 'rich' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                      >
                        {{ tc('richMode') }}
                      </button>
                      <button
                        type="button"
                        @click="bodyMode = 'html'"
                        class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                        :class="bodyMode === 'html' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                      >
                        HTML
                      </button>
                    </div>
                  </div>
                  <button
                    v-if="!pageMode"
                    @click="polishContent"
                    :disabled="polishing || !bodyContentText.trim()"
                    :class="[
                      'inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                      bodyContentText.trim() && !polishing
                        ? 'border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                        : 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                    ]"
                  >
                    {{ polishing ? tc('polishing') : tc('polish') }}
                  </button>
                </div>
              </div>
              <div
                :class="[
                  'overflow-hidden rounded-[24px] bg-white shadow-[inset_0_0_0_1px_rgb(229_231_235)]',
                  bodyPanelClass
                ]"
              >
                <div
                  v-if="bodyMode === 'rich' && bodyEditor"
                  class="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-white px-3 py-2"
                >
                  <button
                    type="button"
                    @click="bodyEditor.chain().focus().toggleBold().run()"
                    class="inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-2 text-xs font-semibold transition-colors"
                    :class="bodyEditor.isActive('bold') ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    @click="bodyEditor.chain().focus().toggleItalic().run()"
                    class="inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-2 text-xs font-semibold italic transition-colors"
                    :class="bodyEditor.isActive('italic') ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    @click="bodyEditor.chain().focus().toggleBulletList().run()"
                    class="inline-flex h-8 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-colors"
                    :class="bodyEditor.isActive('bulletList') ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'"
                  >
                    列表
                  </button>
                  <button
                    type="button"
                    @click="bodyEditor.chain().focus().toggleOrderedList().run()"
                    class="inline-flex h-8 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-colors"
                    :class="bodyEditor.isActive('orderedList') ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'"
                  >
                    编号
                  </button>
                  <button
                    type="button"
                    @click="bodyEditor.chain().focus().toggleBlockquote().run()"
                    class="inline-flex h-8 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-colors"
                    :class="bodyEditor.isActive('blockquote') ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'"
                  >
                    引用
                  </button>
                  <template v-if="isComposeFullscreen">
                    <button
                      type="button"
                      @click="bodyEditor.chain().focus().undo().run()"
                      class="inline-flex h-8 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-colors"
                      :class="bodyEditor.can().undo() ? 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700' : 'cursor-not-allowed border-gray-200 bg-slate-50 text-slate-300'"
                    >
                      {{ tc('undo') }}
                    </button>
                    <button
                      type="button"
                      @click="bodyEditor.chain().focus().redo().run()"
                      class="inline-flex h-8 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-colors"
                      :class="bodyEditor.can().redo() ? 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700' : 'cursor-not-allowed border-gray-200 bg-slate-50 text-slate-300'"
                    >
                      {{ tc('redo') }}
                    </button>
                    <button
                      type="button"
                      @click="bodyEditor.chain().focus().setHorizontalRule().run()"
                      class="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary-200 hover:text-primary-700"
                    >
                      {{ tc('divider') }}
                    </button>
                    <button
                      type="button"
                      @click="bodyEditor.chain().focus().toggleCodeBlock().run()"
                      class="inline-flex h-8 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-colors"
                      :class="bodyEditor.isActive('codeBlock') ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'"
                    >
                      {{ tc('code') }}
                    </button>
                  </template>
                  <button
                    type="button"
                    @click="clearBodyContent"
                    class="ml-auto inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                  >
                    {{ tc('clear') }}
                  </button>
                </div>

                <div
                  v-if="bodyMode === 'rich'"
                  :class="editorViewportClass"
                >
                  <EditorContent
                    v-if="bodyEditor"
                    :editor="bodyEditor"
                    :class="[
                      'mail-body-editor',
                      editorContentClass
                    ]"
                  />
                </div>

                <textarea
                  v-else
                  v-model="bodyHtmlSource"
                  :placeholder="tc('htmlPlaceholder')"
                  :class="[
                    'w-full border-0 bg-white px-4 py-4 font-mono text-xs leading-6 text-slate-700 outline-none focus:ring-0',
                    htmlTextareaClass
                  ]"
                  @input="handleHtmlSourceInput"
                ></textarea>
              </div>
            </div>

            <div v-if="!pageMode" class="flex justify-end pt-2">
              <button
                @click="sendEmail"
                :disabled="sending || !canSend"
                :class="[
                  'inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold transition-colors',
                  canSend && !sending
                    ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700'
                    : 'cursor-not-allowed bg-gray-300 text-gray-500'
                ]"
              >
                {{ sending ? tc('sending') : t('sendEmail.send') }}
              </button>
            </div>
          </div>

          <aside
            v-if="pageMode"
            :class="aiPanelClass"
          >
            <div class="border-b border-slate-100 bg-white p-4">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3l1.6 4.8L18 9.5l-4.4 1.7L12 16l-1.6-4.8L6 9.5l4.4-1.7L12 3zM19 14l.8 2.4L22 17l-2.2.6L19 20l-.8-2.4L16 17l2.2-.6L19 14z" />
                  </svg>
                </div>
                <div>
                  <p class="text-base font-semibold text-slate-900">{{ tc('aiTitle') }}</p>
                  <p v-if="!isCompactAiPanel" class="mt-1 text-xs text-slate-500">{{ tc('aiSubtitle') }}</p>
                </div>
              </div>
              <div class="rounded-full bg-slate-100 p-1">
                <div class="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    @click="aiMode = 'compose'"
                    class="rounded-full px-3 py-2 text-sm font-semibold transition-colors"
                    :class="aiMode === 'compose' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                  >
                    {{ tc('aiCompose') }}
                  </button>
                  <button
                    type="button"
                    @click="aiMode = 'polish'"
                    class="rounded-full px-3 py-2 text-sm font-semibold transition-colors"
                    :class="aiMode === 'polish' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                  >
                    {{ tc('aiPolish') }}
                  </button>
                </div>
              </div>
            </div>

            <div :class="aiPanelBodyClass">
              <div :class="aiPromptCardClass">
                <textarea
                  v-model="aiPrompt"
                  :placeholder="isCompactAiPanel ? '' : (aiMode === 'compose' ? tc('aiComposePlaceholder') : tc('aiPolishPlaceholder'))"
                  :class="aiPromptTextareaClass"
                ></textarea>

                <div v-if="visibleAiQuickOptions.length > 0" :class="isCompactAiPanel ? 'mt-3 grid grid-cols-2 gap-2' : 'mt-3 grid grid-cols-4 gap-2'">
                  <button
                    v-for="option in visibleAiQuickOptions"
                    :key="option.label"
                    type="button"
                    @click="applyAiQuickOption(option)"
                    class="min-w-0 rounded-full bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
                  >
                    {{ option.label }}
                  </button>
                </div>

                <div class="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    @click="aiPrompt = ''"
                    class="text-xs font-medium text-slate-400 transition-colors hover:text-primary-700"
                  >
                    {{ tc('clear') }}
                  </button>
                  <button
                    @click="runAiAction"
                    :disabled="aiBusy || (aiMode === 'compose' && !aiPrompt.trim()) || (aiMode === 'polish' && !bodyContentText.trim())"
                    :class="[
                      'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                      !aiBusy && !((aiMode === 'compose' && !aiPrompt.trim()) || (aiMode === 'polish' && !bodyContentText.trim()))
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'cursor-not-allowed bg-slate-200 text-slate-400'
                    ]"
                  >
                    {{ aiBusy ? tc('aiGenerating') : aiMode === 'compose' ? tc('aiGenerate') : tc('aiRewrite') }}
                  </button>
                </div>
              </div>

              <div v-if="!isCompactAiPanel" class="mt-4 rounded-[22px] border border-slate-200 bg-white p-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-slate-500">{{ tc('aiTone') }}</span>
                  <div class="flex rounded-full bg-slate-100 p-1">
                    <button
                      v-for="tone in aiToneOptions"
                      :key="tone.value"
                      type="button"
                      @click="aiTone = tone.value"
                      class="rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                      :class="aiTone === tone.value ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                    >
                      {{ tone.label }}
                    </button>
                  </div>
                </div>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-xs font-medium text-slate-500">{{ tc('aiLength') }}</span>
                  <div class="flex rounded-full bg-slate-100 p-1">
                    <button
                      v-for="length in aiLengthOptions"
                      :key="length.value"
                      type="button"
                      @click="aiLength = length.value"
                      class="rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                      :class="aiLength === length.value ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                    >
                      {{ length.label }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import * as XLSX from 'xlsx'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { batchLoginAPI } from '@/api/batchLogin'
import mailboxProxyApi from '@/api/mailboxProxy'
import smtpAccountsAPI from '@/api/smtpAccounts'
import { showMessage } from '@/utils/message'
import { isTauri } from '@/services/api'
import api from '@/services/api'
import { buildDesktopSendableSmtpAccountMap, normalizeSmtpEmail } from '@/utils/smtpCapability'

const { t, locale } = useI18n()
const tc = (key: string, params?: Record<string, unknown>) => t(`sendEmail.compose.${key}`, params)

async function getTauriInvoke() {
  if (!isTauri()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke
  } catch {
    return null
  }
}

const previewRuntimeProxy = async (email: string) => {
  try {
    const response: any = await mailboxProxyApi.previewRuntimeProxy({ email })
    if (response.code !== 0) return null
    return response?.data?.runtime_proxy || null
  } catch {
    return null
  }
}

interface SmtpAccount {
  id: number
  email: string
  password?: string
  smtp_host?: string
  smtp_port?: number
  status: string
}

interface ExternalAccount {
  id: number
  email: string
  password?: string
  smtp_verified?: boolean
}

interface ActiveSmtpAccount extends ExternalAccount {
  smtp_host?: string
  smtp_port?: number
  smtp_password?: string
  smtp_id: number
}

interface EmailAttachment {
  name: string
  size: number
  contentType: string
  dataBase64: string
}

interface HistoricalAttachmentHint {
  name: string
  size?: number
  content_type?: string
}

interface SentEmailRecord {
  id: number | string
  from_email: string
  to_email: string
  subject: string
  content_text?: string
  content_html?: string
  created_at: number
  external_mailbox_id?: number | string | null
  attachments?: HistoricalAttachmentHint[]
}

interface ReplyDraftPayload {
  to?: string
  subject?: string
}

const props = defineProps<{
  selectedMailboxIds?: number[]
  pageMode?: boolean
}>()

const loading = ref(false)
const composeSectionRef = ref<HTMLElement | null>(null)
const smtpAccounts = ref<SmtpAccount[]>([])
const externalAccounts = ref<ExternalAccount[]>([])
const sending = ref(false)
const showCcBcc = ref(false)
const polishing = ref(false)
const importCount = ref(0)
const fileInput = ref<HTMLInputElement | null>(null)
const attachmentInput = ref<HTMLInputElement | null>(null)
const attachments = ref<EmailAttachment[]>([])
const historicalAttachmentHints = ref<HistoricalAttachmentHint[]>([])
const recipients = ref<string[]>([])
const recipientInput = ref('')
const recipientInputRef = ref<HTMLInputElement | null>(null)
const ccRecipients = ref<string[]>([])
const bccRecipients = ref<string[]>([])
const ccInput = ref('')
const bccInput = ref('')
const ccInputRef = ref<HTMLInputElement | null>(null)
const bccInputRef = ref<HTMLInputElement | null>(null)
const aiMode = ref<'compose' | 'polish'>('compose')
const aiPrompt = ref('')
const aiTone = ref<'formal' | 'friendly' | 'sales'>('formal')
const aiLength = ref<'short' | 'medium' | 'long'>('medium')
const aiGenerating = ref(false)
const pageMode = computed(() => Boolean(props.pageMode))
const isComposeFullscreen = ref(false)
const aiBusy = computed(() => aiGenerating.value || polishing.value)
const useComposeOverlay = computed(() => pageMode.value && isComposeFullscreen.value)
const isCompactAiPanel = computed(() => pageMode.value && !isComposeFullscreen.value)
const aiToneOptions = computed(() => [
  { value: 'formal', label: tc('toneFormal') },
  { value: 'friendly', label: tc('toneFriendly') },
  { value: 'sales', label: tc('toneSales') },
])
const aiLengthOptions = computed(() => [
  { value: 'short', label: tc('lengthShort') },
  { value: 'medium', label: tc('lengthMedium') },
  { value: 'long', label: tc('lengthLong') },
])
const aiComposeQuickOptions = computed(() => [
  { label: tc('quickQuoteFollowup'), prompt: tc('quickQuoteFollowupPrompt') },
  { label: tc('quickOutbound'), prompt: tc('quickOutboundPrompt') },
  { label: tc('quickReminder'), prompt: tc('quickReminderPrompt') },
  { label: tc('quickMeeting'), prompt: tc('quickMeetingPrompt') },
])
const aiPolishQuickOptions = computed(() => [
  { label: tc('quickFormal'), prompt: tc('quickFormalPrompt') },
  { label: tc('quickShorter'), prompt: tc('quickShorterPrompt') },
  { label: tc('quickTranslate'), prompt: tc('quickTranslatePrompt') },
  { label: tc('quickCta'), prompt: tc('quickCtaPrompt') },
])
const visibleAiQuickOptions = computed(() => {
  const options = aiMode.value === 'compose' ? aiComposeQuickOptions.value : aiPolishQuickOptions.value
  if (!pageMode.value) return options
  return isComposeFullscreen.value ? options : options.slice(0, 2)
})
const selectedToneLabel = computed(() => aiToneOptions.value.find((item) => item.value === aiTone.value)?.label || '')
const selectedLengthLabel = computed(() => aiLengthOptions.value.find((item) => item.value === aiLength.value)?.label || '')
const bodyPanelClass = computed(() => {
  if (!pageMode.value) return 'min-h-[260px]'
  return isComposeFullscreen.value
    ? 'flex min-h-0 flex-1 flex-col'
    : 'flex min-h-0 flex-1 flex-col'
})
const editorViewportClass = computed(() => {
  return pageMode.value ? 'min-h-0 flex-1 overflow-y-auto bg-white pb-3' : 'bg-white pb-3'
})
const editorContentClass = computed(() => {
  if (!pageMode.value) return 'min-h-[240px]'
  return 'h-full min-h-0'
})
const htmlTextareaClass = computed(() => {
  if (!pageMode.value) return 'min-h-[240px] resize-y'
  return 'h-full min-h-0 flex-1 resize-none'
})
const aiPanelClass = computed(() => {
  if (isComposeFullscreen.value) {
    return 'flex h-full min-h-0 self-stretch flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-[#fbfcfb] shadow-sm'
  }
  return isCompactAiPanel.value
    ? 'flex h-full min-h-0 self-stretch flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm'
    : 'flex h-full min-h-0 self-stretch flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-[#fbfcfb] shadow-sm'
})
const aiPanelBodyClass = computed(() => {
  return isCompactAiPanel.value
    ? 'flex min-h-0 flex-1 flex-col overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
    : 'min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
})
const aiPromptCardClass = computed(() => {
  return isCompactAiPanel.value
    ? 'flex min-h-0 flex-1 flex-col rounded-[26px] border border-slate-200 bg-white p-3 shadow-sm'
    : 'rounded-[26px] border border-slate-200 bg-white p-3 shadow-sm'
})
const aiPromptTextareaClass = computed(() => {
  return isCompactAiPanel.value
    ? 'min-h-[150px] flex-1 w-full resize-none border-none bg-transparent px-1 py-1 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0'
    : 'min-h-[150px] w-full resize-none border-none bg-transparent px-1 py-1 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0'
})
const composeSectionClass = computed(() => {
  if (!pageMode.value) {
    return 'compose-section rounded-[28px] border border-gray-200 bg-white shadow-sm'
  }

  if (useComposeOverlay.value) {
    return 'compose-section fixed inset-4 z-[80] flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white px-5 py-5 shadow-2xl'
  }

  return 'compose-section flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] bg-white'
})
const composeGridClass = computed(() => {
  if (!pageMode.value) return 'space-y-6 px-5 py-5 sm:px-6'
  if (useComposeOverlay.value) {
    return 'grid min-h-0 flex-1 items-stretch gap-4 overflow-hidden pt-4 xl:grid-cols-[minmax(0,1fr)_360px]'
  }
  return 'grid min-h-0 flex-1 items-stretch gap-4 overflow-hidden pt-4 xl:grid-cols-[minmax(0,1fr)_320px]'
})

const selectedAccountIds = computed(() => props.selectedMailboxIds || [])
const isDesktop = computed(() => isTauri())
const normalizeMailboxId = (value: unknown) => {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : 0
}

const activeSmtpEmailMap = computed(() => {
  return buildDesktopSendableSmtpAccountMap(smtpAccounts.value)
})

const externalAccountMap = computed(() => {
  return new Map(
    externalAccounts.value.map((account) => [normalizeMailboxId(account.id), account] as const)
  )
})

const selectedExternalAccounts = computed(() => {
  return selectedAccountIds.value
    .map((id) => externalAccountMap.value.get(normalizeMailboxId(id)))
    .filter(Boolean) as ExternalAccount[]
})

// 发件能力以独立 smtp_accounts 表为准：
// 当前桌面端只认“密码型 SMTP + active + 配置完整”为可发件。
const activeSmtpAccounts = computed<ActiveSmtpAccount[]>(() => {
  return selectedExternalAccounts.value
    .filter((account) => activeSmtpEmailMap.value.has(normalizeSmtpEmail(account.email)))
    .map((account) => {
      const smtp = activeSmtpEmailMap.value.get(normalizeSmtpEmail(account.email))!
      return {
        ...account,
        smtp_host: smtp.smtp_host,
        smtp_port: smtp.smtp_port,
        smtp_password: smtp.password,
        smtp_id: smtp.id,
      }
    })
})

const form = ref({
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  content: '',
  contentHtml: '',
})

const bodyMode = ref<'rich' | 'html'>('rich')
const bodyHtmlSource = ref('')
const syncingBodyState = ref(false)

const escapeHtml = (value: string) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const normalizeBodyHtml = (html: string) => {
  const value = String(html || '').trim()
  if (!value || value === '<p></p>' || value === '<p><br></p>') return ''
  return value
}

const htmlToText = (html: string) => {
  const value = String(html || '').trim()
  if (!value) return ''
  if (typeof window === 'undefined') {
    return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  const doc = new DOMParser().parseFromString(value, 'text/html')
  return (doc.body.textContent || '').replace(/\u00a0/g, ' ').trim()
}

const plainTextToHtml = (text: string) => {
  const value = String(text || '').trim()
  if (!value) return ''
  return value
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

const syncBodyState = (html: string) => {
  const normalizedHtml = normalizeBodyHtml(html)
  form.value.contentHtml = normalizedHtml
  bodyHtmlSource.value = normalizedHtml
  form.value.content = htmlToText(normalizedHtml)
}

const bodyContentText = computed(() => {
  return bodyMode.value === 'html' ? htmlToText(bodyHtmlSource.value) : form.value.content
})

const setBodyFromHtml = (html: string) => {
  const normalizedHtml = normalizeBodyHtml(html)
  syncingBodyState.value = true
  syncBodyState(normalizedHtml)
  if (bodyEditor.value) {
    bodyEditor.value.commands.setContent(normalizedHtml || '<p></p>', false)
  }
  syncingBodyState.value = false
}

const setBodyFromText = (text: string) => {
  setBodyFromHtml(plainTextToHtml(text))
}

const clearBodyContent = () => {
  setBodyFromHtml('')
}

const handleHtmlSourceInput = () => {
  if (syncingBodyState.value) return
  syncBodyState(bodyHtmlSource.value)
}

const bodyEditor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: tc('bodyEditorPlaceholder')
    })
  ],
  content: '',
  editorProps: {
    attributes: {
      class: 'fm-mail-editor prose prose-sm max-w-none focus:outline-none'
    }
  },
  onUpdate: ({ editor }) => {
    if (syncingBodyState.value) return
    syncBodyState(editor.getHTML())
  }
})

const recipientCount = computed(() => recipients.value.length)

const canSend = computed(() => {
  return isDesktop.value &&
    activeSmtpAccounts.value.length > 0 &&
    recipients.value.length > 0 &&
    form.value.subject.trim() &&
    bodyContentText.value.trim()
})

const addRecipients = (text: string) => {
  const emails = splitEmails(text).filter((e) => !recipients.value.includes(e))
  if (emails.length > 0) {
    recipients.value.push(...emails)
  }
  return emails.length
}

const splitEmails = (text: string) => {
  return String(text || '')
    .split(/[,;，；\s\n]+/)
    .map((e) => e.trim())
    .filter((e) => e.includes('@'))
}

const addTagEmails = (target: typeof ccRecipients | typeof bccRecipients, text: string) => {
  const emails = splitEmails(text).filter((e) => !target.value.includes(e))
  if (emails.length > 0) {
    target.value.push(...emails)
  }
  return emails.length
}

const commitRecipientInput = () => {
  const text = recipientInput.value.trim()
  if (text) {
    addRecipients(text)
    recipientInput.value = ''
  }
}

const handleRecipientKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === 'Tab' || event.key === ',' || event.key === '，') {
    event.preventDefault()
    commitRecipientInput()
  }
  if (event.key === 'Backspace' && !recipientInput.value && recipients.value.length > 0) {
    recipients.value.pop()
  }
}

const handleRecipientPaste = (event: ClipboardEvent) => {
  const text = event.clipboardData?.getData('text')
  if (text && text.includes('@')) {
    event.preventDefault()
    addRecipients(text)
  }
}

const removeRecipient = (index: number) => {
  recipients.value.splice(index, 1)
}

const commitCcInput = () => {
  const text = ccInput.value.trim()
  if (text) {
    addTagEmails(ccRecipients, text)
    ccInput.value = ''
  }
}

const handleCcKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === 'Tab' || event.key === ',' || event.key === '，') {
    event.preventDefault()
    commitCcInput()
  }
  if (event.key === 'Backspace' && !ccInput.value && ccRecipients.value.length > 0) {
    ccRecipients.value.pop()
  }
}

const handleCcPaste = (event: ClipboardEvent) => {
  const text = event.clipboardData?.getData('text')
  if (text && text.includes('@')) {
    event.preventDefault()
    addTagEmails(ccRecipients, text)
  }
}

const removeCcRecipient = (index: number) => {
  ccRecipients.value.splice(index, 1)
}

const commitBccInput = () => {
  const text = bccInput.value.trim()
  if (text) {
    addTagEmails(bccRecipients, text)
    bccInput.value = ''
  }
}

const handleBccKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === 'Tab' || event.key === ',' || event.key === '，') {
    event.preventDefault()
    commitBccInput()
  }
  if (event.key === 'Backspace' && !bccInput.value && bccRecipients.value.length > 0) {
    bccRecipients.value.pop()
  }
}

const handleBccPaste = (event: ClipboardEvent) => {
  const text = event.clipboardData?.getData('text')
  if (text && text.includes('@')) {
    event.preventDefault()
    addTagEmails(bccRecipients, text)
  }
}

const removeBccRecipient = (index: number) => {
  bccRecipients.value.splice(index, 1)
}

const applyAiQuickOption = (option: { label: string; prompt: string }) => {
  aiPrompt.value = option.prompt
  if (aiPolishQuickOptions.value.some((item) => item.label === option.label)) {
    aiMode.value = 'polish'
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const [extRes, smtpRes] = await Promise.all([
      batchLoginAPI.getAccounts(1, 100),
      smtpAccountsAPI.getAccounts(),
    ])

    if (extRes.code === 0) {
      externalAccounts.value = extRes.data.accounts || []
    }

    if (smtpRes.code === 0) {
      smtpAccounts.value = smtpRes.data.accounts || []
    }
  } catch (error) {
    console.error(tc('loadAccountsFailed'), error)
  } finally {
    loading.value = false
  }
}

const loadDraftFromSent = (record: SentEmailRecord) => {
  const nextRecipients = String(record.to_email || '')
    .split(/[,;，；\s\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)

  recipients.value = nextRecipients
  recipientInput.value = ''
  ccRecipients.value = splitEmails((record as any).cc_email || '')
  bccRecipients.value = splitEmails((record as any).bcc_email || '')
  ccInput.value = ''
  bccInput.value = ''
  showCcBcc.value = ccRecipients.value.length > 0 || bccRecipients.value.length > 0
  form.value.subject = String(record.subject || '')
  if (record.content_html) {
    setBodyFromHtml(String(record.content_html || ''))
  } else {
    setBodyFromText(String(record.content_text || ''))
  }
  historicalAttachmentHints.value = Array.isArray(record.attachments) ? [...record.attachments] : []
}

const loadReplyDraft = (payload: ReplyDraftPayload) => {
  const replyTo = String(payload?.to || '').trim()
  const replySubject = String(payload?.subject || '').trim()

  recipients.value = splitEmails(replyTo)
  recipientInput.value = ''
  ccRecipients.value = []
  bccRecipients.value = []
  ccInput.value = ''
  bccInput.value = ''
  showCcBcc.value = false
  form.value.subject = /^re\s*:/i.test(replySubject) ? replySubject : (replySubject ? `Re: ${replySubject}` : '')
  attachments.value = []
  historicalAttachmentHints.value = []
  aiPrompt.value = ''
  clearBodyContent()
}

const triggerImport = () => {
  fileInput.value?.click()
}

const triggerAttachmentSelect = () => {
  attachmentInput.value?.click()
}

const readFileAsBase64 = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error || new Error(tc('readFileFailed')))
    reader.readAsDataURL(file)
  })
}

const handleAttachmentSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length === 0) return

  try {
    const nextAttachments = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        dataBase64: await readFileAsBase64(file),
      }))
    )

    attachments.value = [...attachments.value, ...nextAttachments]
    historicalAttachmentHints.value = []
  } catch (error) {
    console.error(tc('readAttachmentFailed'), error)
    showMessage(tc('readAttachmentFailed'), 'error')
  } finally {
    target.value = ''
  }
}

const removeAttachment = (index: number) => {
  attachments.value.splice(index, 1)
}

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}

const shouldDisableSenderByError = (message: string) => {
  const normalized = String(message || '').toLowerCase()
  return (
    normalized.includes('smtp 返回 543') ||
    normalized.includes('smtp return 543') ||
    normalized.includes('suspected spams') ||
    normalized.includes('account(ip) invalid') ||
    normalized.includes('account(ip)') ||
    normalized.includes('ip invalid')
  )
}

const handleFileImport = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

      const emails: string[] = []
      for (const row of rows) {
        if (!row || row.length === 0) continue
        const cell = String(row[0] || '').trim()
        if (!cell || cell === tc('excelHeaderEmail') || cell === 'email' || cell === 'Email') continue
        if (cell.includes('@')) {
          emails.push(cell)
        }
      }

      if (emails.length === 0) {
        showMessage(tc('excelNoValidRecipient'), 'warning')
        return
      }

      const added = addRecipients(emails.join(','))
      importCount.value = added || emails.length
      showMessage(tc('excelImportSuccess', { count: emails.length }), 'success')
    } catch (error) {
      showMessage(tc('excelParseFailed'), 'error')
    }
  }

  reader.readAsArrayBuffer(file)
  target.value = ''
}

const downloadTemplate = async () => {
  const wsData = [[tc('excelHeaderEmail')], ['example1@mail.com'], ['example2@mail.com']]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = [{ wch: 30 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, tc('excelSheetName'))

  try {
    if (isDesktop.value) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')

      const savePath = await save({
        defaultPath: tc('excelTemplateName'),
        filters: [
          {
            name: 'Excel',
            extensions: ['xlsx'],
          },
        ],
      })

      if (!savePath) return

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      await writeFile(savePath, new Uint8Array(buffer))
      showMessage(tc('templateSaved'), 'success')
      return
    }

    XLSX.writeFile(wb, tc('excelTemplateName'))
  } catch (error) {
    console.error(tc('templateDownloadFailed'), error)
    showMessage(tc('templateDownloadFailed'), 'error')
  }
}

const sendEmail = async () => {
  if (!canSend.value) return
  const sendFailedPrefix = t('sendEmail.sendFailed')

  const accounts = activeSmtpAccounts.value
  if (accounts.length === 0) {
    showMessage(tc('noAvailableSender'), 'error')
    return
  }

  sending.value = true
  try {
    const recipientList = [...recipients.value]

    const tauriInvoke = await getTauriInvoke()
    if (!tauriInvoke) {
      showMessage(tc('desktopSendOnly'), 'error')
      sending.value = false
      return
    }

    let successCount = 0
    let failCount = 0
    let saveRecordFailed = false
    const sentRecords = []
    const failedDetails: Array<{ recipient: string; message: string }> = []
    const disabledSenderIds = new Set<number>()
    let senderCursor = 0

    for (let i = 0; i < recipientList.length; i++) {
      const availableAccounts = accounts.filter((account) => !disabledSenderIds.has(account.id))
      if (availableAccounts.length === 0) {
        failCount++
        failedDetails.push({
          recipient: recipientList[i],
          message: tc('noAvailableSender'),
        })
        continue
      }

      const account = availableAccounts[senderCursor % availableAccounts.length]
      senderCursor += 1
      const contentHtml = form.value.contentHtml || plainTextToHtml(bodyContentText.value)
      try {
        const runtimeProxy = await previewRuntimeProxy(account.email)
        const sendResult: any = await tauriInvoke('send_smtp_email', {
          fromEmail: account.email,
          password: account.smtp_password || account.password,
          smtpHost: account.smtp_host || '',
          smtpPort: account.smtp_port || 465,
          toEmail: recipientList[i],
          cc: ccRecipients.value.join(',') || null,
          bcc: bccRecipients.value.join(',') || null,
          subject: form.value.subject,
          content: bodyContentText.value,
          contentHtml,
          attachments: attachments.value.map((attachment) => ({
            name: attachment.name,
            size: attachment.size,
            contentType: attachment.contentType,
            dataBase64: attachment.dataBase64,
          })),
          proxy: runtimeProxy
        })

        successCount++
        sentRecords.push({
          smtp_account_id: account.smtp_id,
          external_mailbox_id: account.id,
          from_email: account.email,
          to_email: recipientList[i],
          subject: form.value.subject,
          content: bodyContentText.value,
          content_html: contentHtml,
          status: 'sent',
          smtp_response_code: sendResult?.response_code ?? null,
          smtp_response_message: sendResult?.response_message ?? '',
          attachments: attachments.value.map((attachment) => ({
            name: attachment.name,
            size: attachment.size,
            content_type: attachment.contentType,
          })),
        })
      } catch (error: any) {
        failCount++
        console.error(tc('sendFailedPrefix', { message: recipientList[i] }), error)
        const message = String(error?.message || error?.toString?.() || tc('unknownError')).trim()
        failedDetails.push({
          recipient: recipientList[i],
          message,
        })

        if (shouldDisableSenderByError(message)) {
          disabledSenderIds.add(account.id)
          try {
            await smtpAccountsAPI.reportSendFailure({
              email: account.email,
              error_message: message,
              disable_smtp: true,
            })
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('external-smtp-status-updated', {
                  detail: { email: account.email }
                })
              )
            }
          } catch (reportError) {
            console.error(tc('recordSyncFailed'), reportError)
          }
        }

        sentRecords.push({
          smtp_account_id: account.smtp_id,
          external_mailbox_id: account.id,
          from_email: account.email,
          to_email: recipientList[i],
          subject: form.value.subject,
          content: bodyContentText.value,
          content_html: contentHtml,
          status: 'failed',
          error_message: message.replace(/^(发送失败|Send failed):\s*/, ''),
          attachments: attachments.value.map((attachment) => ({
            name: attachment.name,
            size: attachment.size,
            content_type: attachment.contentType,
          })),
        })
      }
    }

    if (sentRecords.length > 0) {
      try {
        const response = await smtpAccountsAPI.saveSentEmails({ records: sentRecords })
        if (response.code !== 0) {
          saveRecordFailed = true
        }
      } catch (error) {
        console.error(tc('recordSyncFailed'), error)
        saveRecordFailed = true
      }
    }

    if (failCount === 0) {
      showMessage(tc('sendSuccessCount', { count: successCount }), 'success')
      form.value = { to: '', cc: '', bcc: '', subject: '', content: '', contentHtml: '' }
      recipients.value = []
      recipientInput.value = ''
      ccRecipients.value = []
      bccRecipients.value = []
      ccInput.value = ''
      bccInput.value = ''
      showCcBcc.value = false
      importCount.value = 0
      attachments.value = []
      historicalAttachmentHints.value = []
      aiPrompt.value = ''
      clearBodyContent()
    } else {
      const firstFailure = failedDetails[0]
      if (recipientList.length === 1 && firstFailure) {
        showMessage(firstFailure.message.startsWith(sendFailedPrefix) ? firstFailure.message : tc('sendFailedPrefix', { message: firstFailure.message }), 'error')
      } else if (firstFailure) {
        const failedSummary = failedDetails
          .slice(0, 2)
          .map((item) => `${item.recipient}: ${item.message.replace(/^(发送失败|Send failed):\s*/, '')}`)
          .join('；')
        showMessage(tc('sendCompletedSummaryWithDetail', { success: successCount, fail: failCount, detail: failedSummary }), 'warning')
      } else {
        showMessage(tc('sendCompletedSummary', { success: successCount, fail: failCount }), 'warning')
      }
    }

    if (saveRecordFailed) {
      console.error(tc('recordSyncFailed'))
    }
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || error.toString()
    showMessage(tc('sendFailedPrefix', { message }), 'error')
  } finally {
    sending.value = false
  }
}

const polishContent = async () => {
  if (!bodyContentText.value.trim() || polishing.value) return

  polishing.value = true
  try {
    const response: any = await api.post('/ai/polish-email', {
      content: bodyContentText.value,
      subject: form.value.subject || null,
    })

    if (response.code === 0 && response.data?.content) {
      setBodyFromText(String(response.data.content || ''))
      if (response.data.subject) {
        form.value.subject = response.data.subject
      }
      showMessage(tc('aiPolishSuccess'), 'success')
    } else {
      showMessage(response.message || tc('aiPolishFailed'), 'error')
    }
  } catch (error) {
    showMessage(tc('aiPolishRetryFailed'), 'error')
  } finally {
    polishing.value = false
  }
}

const composeEmailWithAI = async () => {
  if (!aiPrompt.value.trim() || aiGenerating.value) return

  aiGenerating.value = true
  try {
    const prompt = [
      aiPrompt.value.trim(),
      tc('promptTone', { label: selectedToneLabel.value }),
      tc('promptLength', { label: selectedLengthLabel.value })
    ].join('\n')

    const response: any = await api.post('/ai/compose-email', {
      prompt,
      tone: selectedToneLabel.value,
      language: locale.value.startsWith('en') ? 'English' : '中文',
      subject: form.value.subject || null,
      content: bodyContentText.value || null,
    })

    if (response.code === 0 && response.data?.content) {
      form.value.subject = String(response.data.subject || form.value.subject || '')
      setBodyFromText(String(response.data.content || bodyContentText.value || ''))
      showMessage(tc('aiComposeSuccess'), 'success')
    } else {
      showMessage(response.message || tc('aiComposeFailed'), 'error')
    }
  } catch (error) {
    showMessage(tc('aiComposeRetryFailed'), 'error')
  } finally {
    aiGenerating.value = false
  }
}

const runAiAction = async () => {
  if (aiMode.value === 'polish') {
    await polishContent()
    return
  }
  await composeEmailWithAI()
}

const syncComposeOverlay = () => {
  if (typeof document === 'undefined') return
  const shouldLock = useComposeOverlay.value
  document.body.style.overflow = shouldLock ? 'hidden' : ''
  document.documentElement.style.overflow = shouldLock ? 'hidden' : ''
}

const handleComposeOverlayKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !useComposeOverlay.value) return
  isComposeFullscreen.value = false
}

const toggleComposeFullscreen = async () => {
  if (!pageMode.value) return
  isComposeFullscreen.value = !isComposeFullscreen.value
}

defineExpose({
  smtpAccounts,
  loadData,
  loadDraftFromSent,
  loadReplyDraft,
})

watch(bodyMode, (mode) => {
  if (mode === 'html') {
    bodyHtmlSource.value = form.value.contentHtml || plainTextToHtml(form.value.content)
    return
  }

  if (bodyEditor.value) {
    syncingBodyState.value = true
    bodyEditor.value.commands.setContent(form.value.contentHtml || '<p></p>', false)
    syncingBodyState.value = false
  }
})

watch(bodyEditor, (editor) => {
  if (!editor) return
  const initialHtml = form.value.contentHtml || plainTextToHtml(form.value.content)
  syncingBodyState.value = true
  editor.commands.setContent(initialHtml || '<p></p>', false)
  syncingBodyState.value = false
  syncBodyState(initialHtml)
})

watch(useComposeOverlay, () => {
  syncComposeOverlay()
})

onMounted(() => {
  loadData()
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', handleComposeOverlayKeydown)
  }
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', handleComposeOverlayKeydown)
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  }
  bodyEditor.value?.destroy()
})
</script>

<style scoped>
.compose-section:fullscreen {
  width: 100vw;
  height: 100vh;
  max-width: none;
  padding: 20px 20px 16px;
  border-radius: 0;
  background: #ffffff;
}

:deep(.compose-section:fullscreen .mail-body-editor .ProseMirror) {
  min-height: 360px;
}

:deep(.mail-body-editor .ProseMirror) {
  min-height: 100%;
  box-sizing: border-box;
  padding: 16px 16px 20px;
  color: rgb(30 41 59);
  font-size: 14px;
  line-height: 1.8;
}

:deep(.mail-body-editor .ProseMirror:focus) {
  outline: none;
}

:deep(.mail-body-editor .ProseMirror p) {
  margin: 0 0 0.8rem;
}

:deep(.mail-body-editor .ProseMirror p:last-child) {
  margin-bottom: 0;
}

:deep(.mail-body-editor .ProseMirror ul),
:deep(.mail-body-editor .ProseMirror ol) {
  margin: 0.75rem 0 0.75rem 1.25rem;
}

:deep(.mail-body-editor .ProseMirror blockquote) {
  margin: 0.75rem 0;
  border-left: 3px solid rgb(187 247 208);
  padding-left: 12px;
  color: rgb(71 85 105);
}

:deep(.mail-body-editor .ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  color: rgb(148 163 184);
  pointer-events: none;
}
</style>
