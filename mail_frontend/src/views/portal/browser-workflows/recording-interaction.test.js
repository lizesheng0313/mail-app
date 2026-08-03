import { describe, expect, it } from 'vitest'
import * as recordingInteraction from './recording-interaction'

import {
  beginListItemDemonstration,
  completeListItemDemonstration,
  completePaginationDemonstration,
  getRecordingAnchorChoice,
  normalizeRecordingFinishedPayload,
  resolveListScope,
} from './recording-interaction'

const entryStep = { kind: 'click', selector: '.list-item a' }
const detailStep = { kind: 'input', selector: 'textarea', value: '内容' }

describe('generic repeated-list recording interaction', () => {
  it('derives recording display state only from a newer backend snapshot', () => {
    const current = {
      recording: true,
      finished: false,
      phase: 'recording',
      message: '正在采集',
      eventCount: 2,
      stateVersion: 10,
    }
    const next = recordingInteraction.applyBackendRecordingState?.(current, {
      recording: false,
      finished: true,
      phase: 'analyzing',
      message: '后端正在分析',
      event_count: 2,
      state_version: 11,
    })

    expect(next).toEqual({
      recording: false,
      finished: true,
      phase: 'analyzing',
      message: '后端正在分析',
      eventCount: 2,
      stateVersion: 11,
    })
  })

  it('ignores an older backend recording snapshot', () => {
    const current = {
      recording: false,
      finished: true,
      phase: 'ready',
      message: '分析完成',
      eventCount: 3,
      stateVersion: 15,
    }
    const next = recordingInteraction.applyBackendRecordingState?.(current, {
      recording: true,
      finished: false,
      phase: 'recording',
      message: '过期状态',
      event_count: 0,
      state_version: 14,
    })

    expect(next).toBe(current)
  })

  it('does not throw when recording starts without a selected node', () => {
    expect(getRecordingAnchorChoice(null)).toBe('')
    expect(getRecordingAnchorChoice({ id: 'end', kind: 'end' })).toBe('')
    expect(getRecordingAnchorChoice({ id: 'anchor', kind: 'click' })).toBe('anchor')
  })

  it('normalizes the whole-recording event into the final step review shape', () => {
    expect(normalizeRecordingFinishedPayload({
      type: 'recording_finished',
      step_groups: [{ step_title: '搜索', capture_mode: 'step', steps: [{ kind: 'click', selector: '#submit' }], scope: { kind: 'single' } }],
      step_count: 1,
    })).toMatchObject({
      type: 'recording_step_finished',
      step_title: '搜索',
      capture_mode: 'step',
      steps: [{ kind: 'click', selector: '#submit' }],
      scope: { kind: 'single' },
    })
  })

  it('uses two user-selected samples to resolve one list without class or text guessing', () => {
    const common = [
      { tag: 'html', nth_of_type: 1 },
      { tag: 'body', nth_of_type: 1 },
      { tag: 'main', nth_of_type: 1 },
      { tag: 'section', nth_of_type: 2 },
    ]
    const first = [{
      kind: 'click',
      selector: '#first-link',
      page: { url: 'https://example.com/list' },
      dom_path: [...common, { tag: 'article', nth_of_type: 1 }, { tag: 'a', nth_of_type: 1 }],
    }]
    const second = [{
      kind: 'click',
      selector: '#second-link',
      page: { url: 'https://example.com/list' },
      dom_path: [...common, { tag: 'article', nth_of_type: 2 }, { tag: 'a', nth_of_type: 1 }],
    }]

    const result = resolveListScope(first, second, 'all_pages')

    expect(result.ok).toBe(true)
    expect(result.scope).toMatchObject({
      mode: 'all_pages',
      item_tag: 'article',
      item_selector: 'html:nth-of-type(1) > body:nth-of-type(1) > main:nth-of-type(1) > section:nth-of-type(2) > article',
    })
    expect(result.entrySteps[0]).toMatchObject({
      selector: 'a:nth-of-type(1)',
      within_list_item: true,
    })
  })

  it('rejects samples from different pages instead of guessing a list', () => {
    const result = resolveListScope(
      [{ page: { url: '/one' }, dom_path: [{ tag: 'html', nth_of_type: 1 }] }],
      [{ page: { url: '/two' }, dom_path: [{ tag: 'html', nth_of_type: 1 }] }],
      'current_page',
    )

    expect(result.ok).toBe(false)
  })

  it('combines the selected list entry with the demonstrated item operations', () => {
    const plan = beginListItemDemonstration(
      [entryStep],
      { kind: 'list_item', item_selector: '.list-item' },
      'current_page',
    )
    const result = completeListItemDemonstration(plan, [detailStep])

    expect(result.stage).toBe('ready')
    expect(result.steps).toEqual([entryStep, detailStep])
    expect(result.scope).toMatchObject({
      kind: 'list_item',
      mode: 'current_page',
      item_selector: '.list-item',
    })
  })

  it('requests pagination demonstration only when all pages lack a next selector', () => {
    const plan = beginListItemDemonstration(
      [entryStep],
      { kind: 'list_item', item_selector: '.list-item', next_selector: '' },
      'all_pages',
    )

    expect(completeListItemDemonstration(plan, [detailStep]).stage).toBe('pagination_required')
  })

  it('keeps pagination outside the per-item operation sequence', () => {
    const plan = beginListItemDemonstration(
      [entryStep, detailStep],
      { kind: 'list_item', item_selector: '.list-item' },
      'all_pages',
    )
    const result = completePaginationDemonstration(plan, [
      { kind: 'click', selector: 'button.next-page' },
    ])

    expect(result.stage).toBe('ready')
    expect(result.scope.next_selector).toBe('button.next-page')
    expect(result.steps).toEqual([entryStep, detailStep])
    expect(result.steps).not.toContainEqual(expect.objectContaining({ selector: 'button.next-page' }))
  })
})
