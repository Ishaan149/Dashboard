import { parseLocalDateKey, toLocalDateKey } from '../utils/date'

export { toLocalDateKey }

function validWeekdays(weekdays) {
  if (!Array.isArray(weekdays) || weekdays.length === 0) return null
  const unique = [...new Set(weekdays)]
  if (unique.some(day => !Number.isInteger(day) || day < 1 || day > 7)) return null
  return unique.sort((a, b) => a - b)
}

function isValidSeries(series) {
  return Boolean(
    series &&
    typeof series.id === 'string' && series.id &&
    typeof series.text === 'string' && series.text.trim() &&
    parseLocalDateKey(series.createdDate) &&
    (series.archivedDate == null || parseLocalDateKey(series.archivedDate)) &&
    Array.isArray(series.scheduleRevisions)
  )
}

export function toIsoWeekday(dateOrDateKey) {
  const date = dateOrDateKey instanceof Date ? dateOrDateKey : parseLocalDateKey(dateOrDateKey)
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  return date.getDay() === 0 ? 7 : date.getDay()
}

export function makeOccurrenceId(seriesId, dateKey) {
  return `${seriesId}:${dateKey}`
}

export function getScheduleForDate(series, dateKey) {
  if (!isValidSeries(series) || !parseLocalDateKey(dateKey) || dateKey < series.createdDate) return null
  let selected = null
  for (const revision of series.scheduleRevisions) {
    if (!revision || !parseLocalDateKey(revision.effectiveFrom) || revision.effectiveFrom > dateKey) continue
    const weekdays = validWeekdays(revision.weekdays)
    if (!weekdays) continue
    if (!selected || revision.effectiveFrom >= selected.effectiveFrom) {
      selected = { effectiveFrom: revision.effectiveFrom, weekdays }
    }
  }
  return selected
}

export function seriesOccursOn(series, dateKey, occurrenceState = {}) {
  if (!isValidSeries(series) || !parseLocalDateKey(dateKey) || dateKey < series.createdDate) return false
  if (series.archivedDate != null && dateKey > series.archivedDate) return false

  const state = occurrenceState && typeof occurrenceState === 'object'
    ? occurrenceState[makeOccurrenceId(series.id, dateKey)]
    : null
  if (state?.status === 'skipped') return false
  if (state?.status === 'done' && state.preserveOccurrence === true) return true

  const schedule = getScheduleForDate(series, dateKey)
  return Boolean(schedule?.weekdays.includes(toIsoWeekday(dateKey)))
}

export function getRecurringOccurrences(seriesList, occurrenceState, dateKey) {
  if (!Array.isArray(seriesList) || !parseLocalDateKey(dateKey)) return []
  const state = occurrenceState && typeof occurrenceState === 'object' ? occurrenceState : {}
  return seriesList.flatMap(series => {
    if (!seriesOccursOn(series, dateKey, state)) return []
    const id = makeOccurrenceId(series.id, dateKey)
    return [{
      id,
      seriesId: series.id,
      dateKey,
      text: series.text,
      done: state[id]?.status === 'done',
      recurring: true,
    }]
  })
}

export function mergeDailyTasks(recurringOccurrences, manualTasks) {
  const recurring = Array.isArray(recurringOccurrences) ? recurringOccurrences : []
  const manual = Array.isArray(manualTasks) ? manualTasks : []
  return [...recurring, ...manual]
}

export function setOccurrenceCompleted(occurrenceState, seriesId, dateKey, completed, preserveOccurrence = false) {
  const state = occurrenceState && typeof occurrenceState === 'object' ? occurrenceState : {}
  const id = makeOccurrenceId(seriesId, dateKey)
  if (completed) {
    return { ...state, [id]: preserveOccurrence ? { status: 'done', preserveOccurrence: true } : { status: 'done' } }
  }
  const next = { ...state }
  delete next[id]
  return next
}

export function skipOccurrence(occurrenceState, seriesId, dateKey) {
  const state = occurrenceState && typeof occurrenceState === 'object' ? occurrenceState : {}
  return { ...state, [makeOccurrenceId(seriesId, dateKey)]: { status: 'skipped' } }
}
