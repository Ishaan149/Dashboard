import { describe, expect, it } from 'vitest'
import {
  getRecurringOccurrences,
  getScheduleForDate,
  makeOccurrenceId,
  mergeDailyTasks,
  seriesOccursOn,
  setOccurrenceCompleted,
  skipOccurrence,
  toIsoWeekday,
  toLocalDateKey,
} from './recurringTasks'

function series(overrides = {}) {
  return {
    id: 'series-1',
    text: 'Gym',
    createdDate: '2026-08-03',
    archivedDate: null,
    scheduleRevisions: [{ effectiveFrom: '2026-08-03', weekdays: [1, 3, 5] }],
    ...overrides,
  }
}

describe('local calendar helpers', () => {
  it('converts Monday through Sunday to ISO weekdays', () => {
    expect(Array.from({ length: 7 }, (_, index) => toIsoWeekday(`2026-08-${String(3 + index).padStart(2, '0')}`)))
      .toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('generates local date keys without UTC conversion', () => {
    const local = new Date(2026, 7, 8, 0, 15)
    expect(toLocalDateKey(local)).toBe('2026-08-08')
  })
})

describe('recurrence derivation', () => {
  it('shows a series on a selected creation weekday immediately', () => {
    expect(seriesOccursOn(series({ createdDate: '2026-08-03' }), '2026-08-03', {})).toBe(true)
  })

  it('waits until the next selected weekday when creation day is not selected', () => {
    const item = series({ scheduleRevisions: [{ effectiveFrom: '2026-08-04', weekdays: [5] }], createdDate: '2026-08-04' })
    expect(seriesOccursOn(item, '2026-08-04', {})).toBe(false)
    expect(seriesOccursOn(item, '2026-08-07', {})).toBe(true)
  })

  it('treats all seven selected weekdays as daily', () => {
    const item = series({ scheduleRevisions: [{ effectiveFrom: '2026-08-03', weekdays: [1, 2, 3, 4, 5, 6, 7] }] })
    for (let day = 3; day <= 9; day += 1) expect(seriesOccursOn(item, `2026-08-0${day}`, {})).toBe(true)
  })

  it('uses schedule revisions without changing earlier dates', () => {
    const item = series({ scheduleRevisions: [
      { effectiveFrom: '2026-08-03', weekdays: [1] },
      { effectiveFrom: '2026-08-06', weekdays: [4] },
    ] })
    expect(getScheduleForDate(item, '2026-08-03').weekdays).toEqual([1])
    expect(getScheduleForDate(item, '2026-08-06').weekdays).toEqual([4])
    expect(seriesOccursOn(item, '2026-08-10', {})).toBe(false)
  })

  it('supports adding today in a same-day edit', () => {
    const item = series({ createdDate: '2026-08-08', scheduleRevisions: [{ effectiveFrom: '2026-08-08', weekdays: [6] }] })
    expect(seriesOccursOn(item, '2026-08-08', {})).toBe(true)
  })

  it('removes an incomplete occurrence when today is removed', () => {
    const item = series({ scheduleRevisions: [
      { effectiveFrom: '2026-08-03', weekdays: [1, 6] },
      { effectiveFrom: '2026-08-08', weekdays: [1] },
    ] })
    expect(seriesOccursOn(item, '2026-08-08', {})).toBe(false)
  })

  it('preserves a completed occurrence when today is removed', () => {
    const item = series({ scheduleRevisions: [
      { effectiveFrom: '2026-08-03', weekdays: [1, 6] },
      { effectiveFrom: '2026-08-08', weekdays: [1] },
    ] })
    const state = { [makeOccurrenceId(item.id, '2026-08-08')]: { status: 'done', preserveOccurrence: true } }
    expect(getRecurringOccurrences([item], state, '2026-08-08')).toMatchObject([{ done: true, text: 'Gym' }])
  })

  it('keeps completion independent across dates and can toggle it off', () => {
    let state = setOccurrenceCompleted({}, 'series-1', '2026-08-03', true)
    expect(getRecurringOccurrences([series()], state, '2026-08-03')[0].done).toBe(true)
    expect(getRecurringOccurrences([series()], state, '2026-08-05')[0].done).toBe(false)
    state = setOccurrenceCompleted(state, 'series-1', '2026-08-03', false)
    expect(state).toEqual({})
    expect(getRecurringOccurrences([series()], state, '2026-08-03')[0].done).toBe(false)
  })

  it('skips only the selected occurrence', () => {
    const state = skipOccurrence({}, 'series-1', '2026-08-03')
    expect(getRecurringOccurrences([series()], state, '2026-08-03')).toEqual([])
    expect(getRecurringOccurrences([series()], state, '2026-08-05')).toHaveLength(1)
  })

  it('keeps archive day and stops occurrences beginning tomorrow', () => {
    const item = series({ archivedDate: '2026-08-07', scheduleRevisions: [{ effectiveFrom: '2026-08-03', weekdays: [5, 6] }] })
    expect(seriesOccursOn(item, '2026-08-07', {})).toBe(true)
    expect(seriesOccursOn(item, '2026-08-08', {})).toBe(false)
  })

  it('renders historical dates for archived series', () => {
    const item = series({ archivedDate: '2026-08-07' })
    expect(getRecurringOccurrences([item], {}, '2026-08-05')).toHaveLength(1)
  })

  it('keeps identities stable across renames and reordering', () => {
    const second = series({ id: 'series-2', text: 'Read' })
    const before = getRecurringOccurrences([series(), second], {}, '2026-08-03').map(item => item.id)
    const after = getRecurringOccurrences([second, series({ text: 'Workout' })], {}, '2026-08-03').map(item => item.id)
    expect(after).toEqual(before.reverse())
  })

  it('ignores malformed series and orphaned state safely', () => {
    const state = { 'missing:2026-08-03': { status: 'done' } }
    expect(getRecurringOccurrences([null, {}, { id: 3 }, series()], state, '2026-08-03')).toHaveLength(1)
    expect(getRecurringOccurrences('bad', state, '2026-08-03')).toEqual([])
  })
})

describe('daily task merging', () => {
  it('places recurring occurrences above manual daily tasks', () => {
    const recurring = getRecurringOccurrences([series()], {}, '2026-08-03')
    const manual = [{ id: 1, text: 'Email', done: false }]
    expect(mergeDailyTasks(recurring, manual).map(item => item.text)).toEqual(['Gym', 'Email'])
  })
})
