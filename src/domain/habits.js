import { addDays, isLocalDateKey, parseLocalDateKey, toLocalDateKey } from '../utils/date'

export const HABIT_NAME_LIMIT = 60
export const HABIT_TRACKER_DATA_VERSION = 2
export const HABIT_TRACKER_MIGRATION_KEY = 'habit_tracker_migration'

function dateAtNoon(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12)
}

export function getHabitDateWindow(days = 7, today = new Date()) {
  const end = dateAtNoon(today)
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(end, index - (days - 1))
    return { key: toLocalDateKey(date), date }
  })
}

export function getHabitDateRange(days, today = new Date()) {
  return getHabitDateWindow(days, today).map(({ key }) => key)
}

export function formatHabitDate(dateKey, locale) {
  const date = parseLocalDateKey(dateKey)
  if (!date) return dateKey
  const parts = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' }).formatToParts(date)
  const weekday = parts.find(part => part.type === 'weekday')?.value
  const day = parts.find(part => part.type === 'day')?.value
  return weekday && day ? `${weekday} ${day}` : new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' }).format(date)
}

export function formatFullHabitDate(dateKey, locale) {
  const date = parseLocalDateKey(dateKey)
  if (!date) return dateKey
  return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)
}

export function normalizeHabitName(value) {
  const name = typeof value === 'string' ? value.trim() : ''
  return name.length <= HABIT_NAME_LIMIT ? name : ''
}

export function normalizeHabits(value, fallbackCreatedAt) {
  if (!Array.isArray(value)) return []
  const knownIds = new Set()
  return value.flatMap(habit => {
    if (!habit || (typeof habit.id !== 'number' && typeof habit.id !== 'string') || knownIds.has(habit.id)) return []
    const name = normalizeHabitName(habit.name)
    if (!name) return []
    knownIds.add(habit.id)
    const createdAt = isLocalDateKey(habit.createdAt) ? habit.createdAt : fallbackCreatedAt
    return [{ ...habit, id: habit.id, name, ...(createdAt ? { createdAt } : {}) }]
  })
}

export function normalizeHabitLogs(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).flatMap(([dateKey, ids]) => {
    if (!isLocalDateKey(dateKey) || !Array.isArray(ids)) return []
    const uniqueIds = [...new Set(ids.filter(id => typeof id === 'number' || typeof id === 'string'))]
    return uniqueIds.length ? [[dateKey, uniqueIds]] : []
  }))
}

export function toggleHabitCompletion(logs, dateKey, habitId) {
  if (!isLocalDateKey(dateKey)) return normalizeHabitLogs(logs)
  const next = normalizeHabitLogs(logs)
  const existing = next[dateKey] ?? []
  const updated = existing.includes(habitId)
    ? existing.filter(id => id !== habitId)
    : [...existing, habitId]
  return { ...next, [dateKey]: updated }
}

function isEligible(dateKey, habit, todayKey) {
  return Boolean(habit?.createdAt && dateKey >= habit.createdAt && dateKey <= todayKey)
}

function isCompleted(logs, dateKey, habitId) {
  return Array.isArray(logs[dateKey]) && logs[dateKey].includes(habitId)
}

export function getHabitCompletionSummary(habit, logs, days, today = new Date()) {
  const todayKey = toLocalDateKey(today)
  const cleanLogs = normalizeHabitLogs(logs)
  const dates = getHabitDateRange(days, today)
  const eligibleDates = dates.filter(dateKey => isEligible(dateKey, habit, todayKey))
  const completed = eligibleDates.filter(dateKey => isCompleted(cleanLogs, dateKey, habit.id)).length
  const eligible = eligibleDates.length
  return { completed, eligible, percentage: eligible ? Math.round((completed / eligible) * 100) : null }
}

export function getOverallCompletionSummary(habits, logs, days, today = new Date()) {
  const normalizedHabits = normalizeHabits(habits)
  const summaries = normalizedHabits.map(habit => getHabitCompletionSummary(habit, logs, days, today))
  const completed = summaries.reduce((total, summary) => total + summary.completed, 0)
  const eligible = summaries.reduce((total, summary) => total + summary.eligible, 0)
  return { completed, eligible, percentage: eligible ? Math.round((completed / eligible) * 100) : null }
}

export function getCurrentStreak(habit, logs, today = new Date()) {
  if (!habit?.createdAt) return 0
  const cleanLogs = normalizeHabitLogs(logs)
  const todayKey = toLocalDateKey(today)
  let date = dateAtNoon(today)
  if (!isCompleted(cleanLogs, todayKey, habit.id)) date = addDays(date, -1)
  let streak = 0
  while (toLocalDateKey(date) >= habit.createdAt) {
    if (!isCompleted(cleanLogs, toLocalDateKey(date), habit.id)) break
    streak += 1
    date = addDays(date, -1)
  }
  return streak
}

export function getBestStreak(habit, logs, today = new Date()) {
  if (!habit?.createdAt || !isLocalDateKey(habit.createdAt)) return 0
  const cleanLogs = normalizeHabitLogs(logs)
  const start = parseLocalDateKey(habit.createdAt)
  const end = dateAtNoon(today)
  let best = 0
  let current = 0
  for (let date = start; date <= end; date = addDays(date, 1)) {
    if (isCompleted(cleanLogs, toLocalDateKey(date), habit.id)) {
      current += 1
      best = Math.max(best, current)
    } else current = 0
  }
  return best
}

// This pure state machine is deliberately not invoked automatically. A release
// coordinator may persist each returned phase in a synthetic/test environment,
// then separately authorize its production execution.
export function migrateHabitTrackerData({ habits, habitLogs, metadata }, resetDate) {
  const current = metadata && typeof metadata === 'object' ? metadata : {}
  const storedResetDate = current.version === HABIT_TRACKER_DATA_VERSION && isLocalDateKey(current.resetDate)
    ? current.resetDate
    : null
  const effectiveResetDate = storedResetDate ?? resetDate
  if (!isLocalDateKey(effectiveResetDate)) throw new Error('A valid local reset date is required.')
  if (current.version >= HABIT_TRACKER_DATA_VERSION && current.resetDate && current.phase === 'complete') {
    return { habits: normalizeHabits(habits, current.resetDate), habitLogs: normalizeHabitLogs(habitLogs), metadata: current, phase: 'complete', changed: false }
  }
  const migratedHabits = normalizeHabits(habits, effectiveResetDate).map(habit => ({ ...habit, createdAt: effectiveResetDate }))
  // `prepared` is safe to persist before logs are cleared. Re-running from it
  // keeps the same resetDate, so an interruption cannot create a second reset.
  const preparedMetadata = { version: HABIT_TRACKER_DATA_VERSION, resetDate: effectiveResetDate, phase: 'prepared' }
  if (current.phase !== 'logs-cleared') {
    return { habits: migratedHabits, habitLogs: normalizeHabitLogs(habitLogs), metadata: preparedMetadata, phase: 'prepared', changed: true }
  }
  const completeMetadata = { version: HABIT_TRACKER_DATA_VERSION, resetDate: effectiveResetDate, phase: 'complete' }
  return { habits: migratedHabits, habitLogs: {}, metadata: completeMetadata, phase: 'complete', changed: true }
}

export function completeHabitTrackerMigration({ habits, metadata }, resetDate) {
  return migrateHabitTrackerData({ habits, habitLogs: {}, metadata: { ...(metadata ?? {}), phase: 'logs-cleared' } }, resetDate)
}
