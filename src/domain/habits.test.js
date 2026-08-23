import { describe, expect, it } from 'vitest'
import { completeHabitTrackerMigration, getBestStreak, getCurrentStreak, getHabitCompletionSummary, getHabitDateRange, getHabitDateWindow, getOverallCompletionSummary, migrateHabitTrackerData, normalizeHabitLogs, toggleHabitCompletion } from './habits'

const today = new Date(2026, 2, 1, 9)
const habit = { id: 1, name: 'Read', createdAt: '2026-02-26' }

describe('habit domain', () => {
  it('builds seven consecutive local dates across month, year, leap, and DST boundaries', () => {
    expect(getHabitDateRange(7, new Date(2026, 0, 2))).toEqual(['2025-12-27', '2025-12-28', '2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02'])
    expect(getHabitDateRange(3, new Date(2024, 2, 1))).toEqual(['2024-02-28', '2024-02-29', '2024-03-01'])
    expect(getHabitDateWindow(3, new Date(2026, 2, 8)).map(day => day.key)).toEqual(['2026-03-06', '2026-03-07', '2026-03-08'])
  })

  it('toggles a completion without duplicates and normalizes malformed logs', () => {
    const once = toggleHabitCompletion({ '2026-03-01': [1, 1], invalid: [1], '2026-02-28': 'bad' }, '2026-03-01', 2)
    expect(once).toEqual({ '2026-03-01': [1, 2] })
    expect(toggleHabitCompletion(once, '2026-03-01', 1)).toEqual({ '2026-03-01': [2] })
    expect(normalizeHabitLogs({ '2026-03-01': [1, 1, null] })).toEqual({ '2026-03-01': [1] })
  })

  it('calculates eligible per-habit and overall rates and excludes deleted/pre-creation/future IDs', () => {
    const logs = { '2026-02-25': [1], '2026-02-26': [1, 99], '2026-02-27': [1], '2026-02-28': [1], '2026-03-01': [1], '2026-03-02': [1] }
    expect(getHabitCompletionSummary(habit, logs, 7, today)).toEqual({ completed: 4, eligible: 4, percentage: 100 })
    expect(getOverallCompletionSummary([habit, { id: 2, name: 'New', createdAt: '2026-03-02' }], logs, 30, today)).toEqual({ completed: 4, eligible: 4, percentage: 100 })
    expect(getOverallCompletionSummary([], logs, 7, today)).toEqual({ completed: 0, eligible: 0, percentage: null })
  })

  it('calculates current and best streaks with incomplete today and missed past days', () => {
    const logs = { '2026-02-26': [1], '2026-02-27': [1], '2026-02-28': [1] }
    expect(getCurrentStreak(habit, logs, today)).toBe(3)
    expect(getBestStreak(habit, logs, today)).toBe(3)
    const completedToday = { ...logs, '2026-03-01': [1] }
    expect(getCurrentStreak(habit, completedToday, today)).toBe(4)
    expect(getBestStreak({ ...habit, createdAt: '2026-02-20' }, { '2026-02-20': [1], '2026-02-21': [1], '2026-02-23': [1], '2026-02-24': [1], '2026-02-25': [1] }, today)).toBe(3)
  })

  it('has an idempotent recoverable two-phase migration using synthetic state', () => {
    const input = { habits: [{ id: 1, name: ' Read ' }, { id: 2, name: 'Walk'}], habitLogs: { '2026-02-28': [1, 2] }, metadata: {} }
    const prepared = migrateHabitTrackerData(input, '2026-03-01')
    expect(prepared.phase).toBe('prepared')
    expect(prepared.habits).toEqual([{ id: 1, name: 'Read', createdAt: '2026-03-01' }, { id: 2, name: 'Walk', createdAt: '2026-03-01' }])
    expect(prepared.habitLogs).toEqual(input.habitLogs)
    const resumedNextDay = migrateHabitTrackerData(prepared, '2026-03-02')
    expect(resumedNextDay.metadata.resetDate).toBe('2026-03-01')
    expect(resumedNextDay.habits.every(habit => habit.createdAt === '2026-03-01')).toBe(true)
    const completed = completeHabitTrackerMigration({ habits: resumedNextDay.habits, metadata: resumedNextDay.metadata }, '2026-03-02')
    expect(completed).toMatchObject({ phase: 'complete', habitLogs: {}, metadata: { version: 2, resetDate: '2026-03-01', phase: 'complete' } })
    expect(migrateHabitTrackerData(completed, '2026-03-02')).toMatchObject({ changed: false, habitLogs: {}, phase: 'complete' })
    expect(migrateHabitTrackerData({ habits: prepared.habits, habitLogs: {}, metadata: { ...prepared.metadata, phase: 'logs-cleared' } }, '2026-03-01')).toMatchObject({ phase: 'complete', habitLogs: {} })
  })
})
