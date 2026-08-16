import { parseLocalDateKey } from '../utils/date'

export const APPLICATION_CATEGORIES = [
  { key: 'softwareEngineering', label: 'Software Engineering' },
  { key: 'aiApplications', label: 'AI Applications' },
  { key: 'backend', label: 'Backend' },
  { key: 'data', label: 'Data' },
]

export const APPLICATION_CATEGORY_KEYS = APPLICATION_CATEGORIES.map(category => category.key)

const EMPTY_CATEGORIES = Object.fromEntries(APPLICATION_CATEGORY_KEYS.map(key => [key, 0]))

/**
 * Counts are persisted as integers. Invalid values are deliberately treated as
 * zero in memory; reading a malformed record never writes the repair back.
 */
export function normalizeCount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

export function normalizeCategories(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(
    APPLICATION_CATEGORY_KEYS.map(key => [key, normalizeCount(source[key])]),
  )
}

export function getCategorizedTotal(record) {
  const categories = normalizeCategories(record?.categories)
  return APPLICATION_CATEGORY_KEYS.reduce((total, key) => total + categories[key], 0)
}

export function getOverallApplicationCount(record) {
  const count = normalizeCount(record?.count)
  return Math.max(count, getCategorizedTotal(record))
}

export function getUncategorizedCount(record) {
  return Math.max(0, getOverallApplicationCount(record) - getCategorizedTotal(record))
}

export function normalizeJobRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null
  if (typeof record.date !== 'string' || !parseLocalDateKey(record.date)) return null

  const categories = normalizeCategories(record.categories)
  return {
    ...record,
    date: record.date,
    count: getOverallApplicationCount({ ...record, categories }),
    categories,
    emails: normalizeCount(record.emails),
    linkedin: normalizeCount(record.linkedin),
  }
}

function mergeRecords(records) {
  const first = normalizeJobRecord(records[0])
  if (!first) return null

  const merged = {
    ...first,
    count: 0,
    categories: { ...EMPTY_CATEGORIES },
    emails: 0,
    linkedin: 0,
  }

  for (const source of records) {
    const record = normalizeJobRecord(source)
    if (!record) continue
    merged.count += normalizeCount(record.count)
    for (const key of APPLICATION_CATEGORY_KEYS) merged.categories[key] += record.categories[key]
    merged.emails += record.emails
    merged.linkedin += record.linkedin
  }

  merged.count = Math.max(merged.count, getCategorizedTotal(merged))
  return merged
}

/**
 * Returns a normalized, date-unique view of records without mutating the
 * supplied array. This is intentionally a read helper, not a migration.
 */
export function normalizeJobRecords(records) {
  if (!Array.isArray(records)) return []
  const byDate = new Map()
  for (const record of records) {
    if (typeof record?.date !== 'string' || !parseLocalDateKey(record.date)) continue
    const existing = byDate.get(record.date)
    byDate.set(record.date, existing ? [...existing, record] : [record])
  }
  return [...byDate.values()].map(mergeRecords).filter(Boolean)
}

export function getJobRecord(records, date) {
  return normalizeJobRecords(records).find(record => record.date === date) ?? null
}

function hasActivity(record) {
  return getOverallApplicationCount(record) > 0
    || normalizeCount(record?.emails) > 0
    || normalizeCount(record?.linkedin) > 0
}

function replaceDateRecords(records, date, nextRecord) {
  const source = Array.isArray(records) ? records : []
  const withoutDate = source.filter(record => record?.date !== date)
  return nextRecord && hasActivity(nextRecord) ? [...withoutDate, nextRecord] : withoutDate
}

function findRawRecord(records, date) {
  return (Array.isArray(records) ? records : []).find(record => record?.date === date) ?? null
}

function buildBaseRecord(records, date) {
  return normalizeJobRecord(findRawRecord(records, date) ?? { date, count: 0 }) ?? {
    date,
    count: 0,
    categories: { ...EMPTY_CATEGORIES },
    emails: 0,
    linkedin: 0,
  }
}

export function adjustCategory(records, date, categoryKey, delta) {
  if (!APPLICATION_CATEGORY_KEYS.includes(categoryKey)) return Array.isArray(records) ? records : []
  const amount = typeof delta === 'number' && Number.isFinite(delta) ? Math.trunc(delta) : 0
  if (amount === 0) return Array.isArray(records) ? records : []

  const existing = findRawRecord(records, date)
  if (!existing && amount < 0) return Array.isArray(records) ? records : []

  const next = buildBaseRecord(records, date)
  const previousValue = next.categories[categoryKey]
  const previousOverall = getOverallApplicationCount(next)
  const nextValue = Math.max(0, previousValue + amount)
  const actualDelta = nextValue - previousValue
  if (actualDelta === 0) return Array.isArray(records) ? records : []

  next.categories = { ...next.categories, [categoryKey]: nextValue }
  next.count = Math.max(
    getCategorizedTotal(next),
    previousOverall + actualDelta,
  )
  return replaceDateRecords(records, date, next)
}

export function adjustUncategorized(records, date, delta) {
  const amount = typeof delta === 'number' && Number.isFinite(delta) ? Math.trunc(delta) : 0
  if (amount === 0) return Array.isArray(records) ? records : []

  const existing = findRawRecord(records, date)
  const next = buildBaseRecord(records, date)
  const currentUncategorized = getUncategorizedCount(next)
  if (!existing && amount < 0) return Array.isArray(records) ? records : []
  if (amount < 0 && currentUncategorized === 0) return Array.isArray(records) ? records : []

  const actualDelta = amount < 0 ? -Math.min(currentUncategorized, Math.abs(amount)) : amount
  next.count = Math.max(getCategorizedTotal(next), getOverallApplicationCount(next) + actualDelta)
  return replaceDateRecords(records, date, next)
}

export function adjustOutreach(records, date, field, delta) {
  if (field !== 'emails' && field !== 'linkedin') return Array.isArray(records) ? records : []
  const amount = typeof delta === 'number' && Number.isFinite(delta) ? Math.trunc(delta) : 0
  if (amount === 0) return Array.isArray(records) ? records : []

  const existing = findRawRecord(records, date)
  if (!existing && amount < 0) return Array.isArray(records) ? records : []

  const next = buildBaseRecord(records, date)
  const nextValue = Math.max(0, next[field] + amount)
  if (nextValue === next[field]) return Array.isArray(records) ? records : []
  next[field] = nextValue
  return replaceDateRecords(records, date, next)
}

export function getPeriodApplicationTotal(records, startDateKey) {
  return normalizeJobRecords(records)
    .filter(record => record.date >= startDateKey)
    .reduce((total, record) => total + getOverallApplicationCount(record), 0)
}

export function getAllTimeApplicationTotal(records) {
  return normalizeJobRecords(records)
    .reduce((total, record) => total + getOverallApplicationCount(record), 0)
}

export function hasAnyJobActivity(record) {
  return hasActivity(record)
}
