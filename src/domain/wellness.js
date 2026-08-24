import { addDays, isLocalDateKey, parseLocalDateKey, toLocalDateKey } from '../utils/date'

export const FOOD_NAME_LIMIT = 80
export const FOOD_CALORIE_RANGE = Object.freeze({ min: 0, max: 20_000 })
export const FOOD_PROTEIN_RANGE = Object.freeze({ min: 0, max: 1_000 })
export const WEIGHT_RANGE = Object.freeze({ min: 20, max: 500 })
export const WEIGHT_WINDOW_DAYS = 28

function finiteTimestamp(value, fallback = 0) {
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : fallback
}

function storedWholeNumber(value, { min, max }) {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= min
    && value <= max
    ? value
    : null
}

function storedWeight(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < WEIGHT_RANGE.min || value > WEIGHT_RANGE.max) return null
  return Math.round(value * 10) / 10
}

function cleanId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeNameValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function dateOrdinal(dateKey) {
  const date = parseLocalDateKey(dateKey)
  if (!date) return null
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
}

function validChartPoints(points) {
  return (Array.isArray(points) ? points : [])
    .filter(point => isLocalDateKey(point?.date) && Number.isFinite(point?.weightKg))
    .map(point => ({ ...point, weightKg: Number(point.weightKg) }))
    .sort((left, right) => left.date.localeCompare(right.date))
}

export function normalizeFoodName(value) {
  return normalizeNameValue(value)
}

export function normalizeFoodRecords(value) {
  if (!Array.isArray(value)) return []

  const ids = new Set()
  return value.reduce((records, entry) => {
    const id = cleanId(entry?.id)
    const date = entry?.date
    const name = normalizeFoodName(entry?.name)
    const calories = storedWholeNumber(entry?.calories, FOOD_CALORIE_RANGE)
    const proteinGrams = storedWholeNumber(entry?.proteinGrams, FOOD_PROTEIN_RANGE)
    if (!id || ids.has(id) || !isLocalDateKey(date) || !name || name.length > FOOD_NAME_LIMIT || calories === null || proteinGrams === null) return records

    ids.add(id)
    const createdAt = finiteTimestamp(entry.createdAt)
    records.push({
      id,
      date,
      name,
      calories,
      proteinGrams,
      createdAt,
      updatedAt: finiteTimestamp(entry.updatedAt, createdAt),
    })
    return records
  }, [])
}

export function normalizeSavedFoods(value) {
  if (!Array.isArray(value)) return []

  const ids = new Set()
  return value.reduce((foods, entry) => {
    const id = cleanId(entry?.id)
    const name = normalizeFoodName(entry?.name)
    const calories = storedWholeNumber(entry?.calories, FOOD_CALORIE_RANGE)
    const proteinGrams = storedWholeNumber(entry?.proteinGrams, FOOD_PROTEIN_RANGE)
    if (!id || ids.has(id) || !name || name.length > FOOD_NAME_LIMIT || calories === null || proteinGrams === null) return foods

    ids.add(id)
    foods.push({
      id,
      name,
      calories,
      proteinGrams,
      createdAt: finiteTimestamp(entry.createdAt),
    })
    return foods
  }, [])
}

export function normalizeWeightRecords(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.entries(value).reduce((records, [date, entry]) => {
    const weightKg = storedWeight(entry?.weightKg)
    if (!isLocalDateKey(date) || weightKg === null) return records

    const createdAt = finiteTimestamp(entry.createdAt)
    records[date] = {
      weightKg,
      createdAt,
      updatedAt: finiteTimestamp(entry.updatedAt, createdAt),
    }
    return records
  }, {})
}

export function validateFoodInput({ name, calories, proteinGrams } = {}) {
  const errors = {}
  const normalizedName = normalizeFoodName(name)
  if (!normalizedName) errors.name = 'Enter a food name.'
  else if (normalizedName.length > FOOD_NAME_LIMIT) errors.name = `Food name must be ${FOOD_NAME_LIMIT} characters or fewer.`

  const calorieResult = validateWholeNumber(calories, FOOD_CALORIE_RANGE, 'Calories')
  if (calorieResult.error) errors.calories = calorieResult.error

  const proteinResult = validateWholeNumber(proteinGrams, FOOD_PROTEIN_RANGE, 'Protein')
  if (proteinResult.error) errors.proteinGrams = proteinResult.error

  return Object.keys(errors).length
    ? { valid: false, errors }
    : {
      valid: true,
      errors: {},
      value: {
        name: normalizedName,
        calories: calorieResult.value,
        proteinGrams: proteinResult.value,
      },
    }
}

export function validateWholeNumber(value, range, label = 'Value') {
  const isBlank = value === '' || value === null || value === undefined || (typeof value === 'string' && !value.trim())
  if (isBlank) return { error: `${label} is required.` }

  const numeric = typeof value === 'string' ? Number(value.trim()) : value
  if (!Number.isFinite(numeric)) return { error: `${label} must be a number.` }
  if (!Number.isInteger(numeric)) return { error: `${label} must be a whole number.` }
  if (numeric < range.min || numeric > range.max) return { error: `${label} must be between ${range.min.toLocaleString()} and ${range.max.toLocaleString()}.` }
  return { value: numeric }
}

export function savedFoodSignature({ name, calories, proteinGrams } = {}) {
  const validation = validateFoodInput({ name, calories, proteinGrams })
  if (!validation.valid) return null
  const value = validation.value
  return `${value.name.toLocaleLowerCase()}\u0000${value.calories}\u0000${value.proteinGrams}`
}

export function hasExactSavedFoodDuplicate(savedFoods, candidate) {
  const signature = savedFoodSignature(candidate)
  if (!signature) return false
  return normalizeSavedFoods(savedFoods).some(food => savedFoodSignature(food) === signature)
}

export function getFoodRecordsForDate(records, date) {
  if (!isLocalDateKey(date)) return []
  return normalizeFoodRecords(records)
    .filter(record => record.date === date)
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))
}

export function getDailyNutritionTotals(records, date) {
  return getFoodRecordsForDate(records, date).reduce((totals, record) => ({
    calories: totals.calories + record.calories,
    proteinGrams: totals.proteinGrams + record.proteinGrams,
  }), { calories: 0, proteinGrams: 0 })
}

export function createWellnessId(prefix) {
  const randomPart = globalThis.crypto?.randomUUID?.().replaceAll('-', '')
    ?? `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`
}

export function validateWeightKg(value) {
  const isBlank = value === '' || value === null || value === undefined || (typeof value === 'string' && !value.trim())
  if (isBlank) return { valid: false, error: 'Weight is required.' }

  const text = typeof value === 'string' ? value.trim() : String(value)
  if (!/^\d+(?:\.\d)?$/u.test(text)) return { valid: false, error: 'Weight must be a number with at most one decimal place.' }

  const numeric = Number(text)
  if (!Number.isFinite(numeric)) return { valid: false, error: 'Weight must be a finite number.' }
  if (numeric < WEIGHT_RANGE.min || numeric > WEIGHT_RANGE.max) return { valid: false, error: `Weight must be between ${WEIGHT_RANGE.min} and ${WEIGHT_RANGE.max} kg.` }
  return { valid: true, value: Math.round(numeric * 10) / 10 }
}

export function upsertWeightRecord(records, date, weight, timestamp = Date.now()) {
  const normalized = normalizeWeightRecords(records)
  const validation = validateWeightKg(weight)
  if (!isLocalDateKey(date) || !validation.valid) return normalized

  const existing = normalized[date]
  return {
    ...normalized,
    [date]: {
      weightKg: validation.value,
      createdAt: existing?.createdAt ?? finiteTimestamp(timestamp),
      updatedAt: finiteTimestamp(timestamp),
    },
  }
}

export function removeWeightRecord(records, date) {
  const normalized = normalizeWeightRecords(records)
  if (!isLocalDateKey(date) || !normalized[date]) return normalized
  const { [date]: _removed, ...remaining } = normalized
  return remaining
}

export function getWeightRecordEntries(records) {
  return Object.entries(normalizeWeightRecords(records))
    .map(([date, record]) => ({ date, ...record }))
    .sort((left, right) => left.date.localeCompare(right.date))
}

export function getCurrentWeight(records, today = new Date()) {
  const todayKey = toLocalDateKey(today)
  const entries = getWeightRecordEntries(records).filter(record => record.date <= todayKey)
  return entries.at(-1) ?? null
}

export function getVisibleWeightWindow(today = new Date()) {
  return {
    startDate: toLocalDateKey(addDays(today, -(WEIGHT_WINDOW_DAYS - 1))),
    endDate: toLocalDateKey(today),
  }
}

export function buildVisibleWeightSeries(records, today = new Date()) {
  const window = getVisibleWeightWindow(today)
  return {
    ...window,
    points: getWeightRecordEntries(records)
      .filter(record => record.date >= window.startDate && record.date <= window.endDate),
  }
}

export function getVisibleWeightRecords(records, today = new Date()) {
  return buildVisibleWeightSeries(records, today).points
}

export function getVisiblePeriodChange(records, today = new Date()) {
  const points = getVisibleWeightRecords(records, today)
  if (points.length < 2) return null
  return Math.round((points.at(-1).weightKg - points[0].weightKg) * 10) / 10
}

export function getWeightChartBounds(points) {
  const safePoints = validChartPoints(points)
  if (!safePoints.length) return { min: 0, max: 1, padding: 0 }

  const values = safePoints.map(point => point.weightKg)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const spread = maximum - minimum
  const padding = spread === 0
    ? Math.max(0.5, Math.abs(minimum) * 0.02)
    : Math.max(0.2, Math.min(5, spread * 0.15))
  return { min: minimum - padding, max: maximum + padding, padding }
}

export function getWeightChartCoordinates(points, {
  startDate,
  endDate,
  width = 1,
  height = 1,
  bounds = getWeightChartBounds(points),
} = {}) {
  const safePoints = validChartPoints(points)
  const safeWidth = Number.isFinite(width) && width >= 0 ? width : 1
  const safeHeight = Number.isFinite(height) && height >= 0 ? height : 1
  const firstDate = startDate ?? safePoints[0]?.date
  const lastDate = endDate ?? safePoints.at(-1)?.date
  const firstOrdinal = dateOrdinal(firstDate)
  const lastOrdinal = dateOrdinal(lastDate)
  const xSpan = firstOrdinal === null || lastOrdinal === null ? 0 : lastOrdinal - firstOrdinal
  const minimum = Number.isFinite(bounds?.min) ? bounds.min : 0
  const maximum = Number.isFinite(bounds?.max) && bounds.max > minimum ? bounds.max : minimum + 1
  const ySpan = maximum - minimum

  return safePoints.reduce((coordinates, point) => {
    const ordinal = dateOrdinal(point.date)
    if (ordinal === null) return coordinates
    const rawX = xSpan > 0 ? ((ordinal - firstOrdinal) / xSpan) * safeWidth : safeWidth / 2
    const rawY = safeHeight - ((point.weightKg - minimum) / ySpan) * safeHeight
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return coordinates
    coordinates.push({ ...point, x: Math.max(0, Math.min(safeWidth, rawX)), y: Math.max(0, Math.min(safeHeight, rawY)) })
    return coordinates
  }, [])
}
