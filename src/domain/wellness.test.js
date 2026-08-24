import { describe, expect, it } from 'vitest'
import {
  buildVisibleWeightSeries,
  getCurrentWeight,
  getDailyNutritionTotals,
  getFoodRecordsForDate,
  getVisiblePeriodChange,
  getWeightChartBounds,
  getWeightChartCoordinates,
  hasExactSavedFoodDuplicate,
  normalizeFoodRecords,
  normalizeSavedFoods,
  normalizeWeightRecords,
  removeWeightRecord,
  upsertWeightRecord,
  validateFoodInput,
  validateWeightKg,
} from './wellness'

const FOOD = Object.freeze({
  id: 'food_yogurt',
  date: '2026-08-24',
  name: ' Greek yogurt ',
  calories: 160,
  proteinGrams: 18,
  createdAt: 10,
  updatedAt: 11,
})

describe('wellness domain', () => {
  it('normalizes synchronized collections safely and ignores malformed food, saved-food, and weight values', () => {
    expect(normalizeFoodRecords('not an array')).toEqual([])
    expect(normalizeFoodRecords([
      FOOD,
      { ...FOOD, id: 'food_bad_calories', calories: '160' },
      { ...FOOD, id: 'food_bad_date', date: '2026-02-30' },
      { ...FOOD, id: 'food_duplicate' },
      { ...FOOD, id: 'food_duplicate', name: 'Duplicate' },
    ])).toEqual([{
      id: 'food_yogurt',
      date: '2026-08-24',
      name: 'Greek yogurt',
      calories: 160,
      proteinGrams: 18,
      createdAt: 10,
      updatedAt: 11,
    }, {
      id: 'food_duplicate',
      date: '2026-08-24',
      name: 'Greek yogurt',
      calories: 160,
      proteinGrams: 18,
      createdAt: 10,
      updatedAt: 11,
    }])
    expect(normalizeSavedFoods([{ id: 'saved_one', name: ' Eggs ', calories: 70, proteinGrams: 6, createdAt: 'bad' }, { id: 'saved_bad', name: '', calories: 0, proteinGrams: 0 }]))
      .toEqual([{ id: 'saved_one', name: 'Eggs', calories: 70, proteinGrams: 6, createdAt: 0 }])
    expect(normalizeWeightRecords({
      '2026-08-24': { weightKg: 78.44, createdAt: 20, updatedAt: 21 },
      '2026-02-30': { weightKg: 80 },
      '2026-08-23': { weightKg: '78.4' },
    })).toEqual({ '2026-08-24': { weightKg: 78.4, createdAt: 20, updatedAt: 21 } })
  })

  it('filters ordered food records by a local date and includes deliberate zero nutrition in totals', () => {
    const records = [
      { ...FOOD, id: 'food_late', name: 'Dinner', calories: 500, proteinGrams: 30, createdAt: 30 },
      { ...FOOD, id: 'food_zero', name: 'Water label', calories: 0, proteinGrams: 0, createdAt: 10 },
      { ...FOOD, id: 'food_other_day', date: '2026-08-23', name: 'Other', calories: 999, proteinGrams: 999, createdAt: 1 },
    ]
    expect(getFoodRecordsForDate(records, '2026-08-24').map(record => record.id)).toEqual(['food_zero', 'food_late'])
    expect(getDailyNutritionTotals(records, '2026-08-24')).toEqual({ calories: 500, proteinGrams: 30 })
    expect(getDailyNutritionTotals(records, '2026-08-22')).toEqual({ calories: 0, proteinGrams: 0 })
  })

  it('validates food names and whole nutrition values at every boundary', () => {
    expect(validateFoodInput({ name: '  Rice  ', calories: '0', proteinGrams: '1000' })).toEqual({
      valid: true,
      errors: {},
      value: { name: 'Rice', calories: 0, proteinGrams: 1000 },
    })
    expect(validateFoodInput({ name: ' ', calories: '2.5', proteinGrams: '-1' })).toMatchObject({
      valid: false,
      errors: {
        name: 'Enter a food name.',
        calories: 'Calories must be a whole number.',
        proteinGrams: 'Protein must be between 0 and 1,000.',
      },
    })
    expect(validateFoodInput({ name: 'A'.repeat(81), calories: 'Infinity', proteinGrams: 'x' })).toMatchObject({
      valid: false,
      errors: {
        name: 'Food name must be 80 characters or fewer.',
        calories: 'Calories must be a number.',
        proteinGrams: 'Protein must be a number.',
      },
    })
  })

  it('detects only exact saved-food duplicates using normalized name and nutrition values', () => {
    const savedFoods = [{ id: 'saved_yogurt', name: 'Greek Yogurt', calories: 160, proteinGrams: 18, createdAt: 1 }]
    expect(hasExactSavedFoodDuplicate(savedFoods, { name: ' greek yogurt ', calories: 160, proteinGrams: 18 })).toBe(true)
    expect(hasExactSavedFoodDuplicate(savedFoods, { name: 'Greek yogurt', calories: 161, proteinGrams: 18 })).toBe(false)
    expect(hasExactSavedFoodDuplicate(savedFoods, { name: 'Greek yogurt', calories: 160, proteinGrams: 19 })).toBe(false)
  })

  it('keeps logged food snapshots independent when a saved template is removed', () => {
    const records = normalizeFoodRecords([{ ...FOOD, name: 'Greek yogurt' }])
    const savedFoods = normalizeSavedFoods([{ id: 'saved_yogurt', name: 'Greek yogurt', calories: 160, proteinGrams: 18, createdAt: 1 }])
    const remainingTemplates = savedFoods.filter(food => food.id !== 'saved_yogurt')
    expect(remainingTemplates).toEqual([])
    expect(getFoodRecordsForDate(records, '2026-08-24')).toEqual([{ ...records[0] }])
  })

  it('validates and rounds kilogram input, rejecting invalid values and extra decimal places', () => {
    expect(validateWeightKg('20')).toEqual({ valid: true, value: 20 })
    expect(validateWeightKg('78.46')).toEqual({ valid: false, error: 'Weight must be a number with at most one decimal place.' })
    expect(validateWeightKg('78.4')).toEqual({ valid: true, value: 78.4 })
    expect(validateWeightKg('19.9')).toEqual({ valid: false, error: 'Weight must be between 20 and 500 kg.' })
    expect(validateWeightKg('Infinity')).toEqual({ valid: false, error: 'Weight must be a number with at most one decimal place.' })
    expect(validateWeightKg('')).toEqual({ valid: false, error: 'Weight is required.' })
  })

  it('upserts one weight per date while retaining each date’s original creation time', () => {
    const initial = {
      '2026-08-23': { weightKg: 79.2, createdAt: 1, updatedAt: 1 },
      '2026-08-24': { weightKg: 78.9, createdAt: 2, updatedAt: 2 },
    }
    const updated = upsertWeightRecord(initial, '2026-08-24', '78.4', 50)
    expect(updated).toEqual({
      '2026-08-23': { weightKg: 79.2, createdAt: 1, updatedAt: 1 },
      '2026-08-24': { weightKg: 78.4, createdAt: 2, updatedAt: 50 },
    })
    expect(upsertWeightRecord(updated, '2026-08-25', '78.3', 60)['2026-08-25']).toEqual({ weightKg: 78.3, createdAt: 60, updatedAt: 60 })
    expect(removeWeightRecord(updated, '2026-08-24')).toEqual({ '2026-08-23': { weightKg: 79.2, createdAt: 1, updatedAt: 1 } })
  })

  it('selects the newest non-future current weight even when it is outside the chart window', () => {
    const records = {
      '2026-06-01': { weightKg: 81, createdAt: 1, updatedAt: 1 },
      '2026-07-01': { weightKg: 79.5, createdAt: 2, updatedAt: 2 },
      '2026-08-25': { weightKg: 70, createdAt: 3, updatedAt: 3 },
    }
    expect(getCurrentWeight(records, new Date(2026, 7, 24, 12))).toMatchObject({ date: '2026-07-01', weightKg: 79.5 })
  })

  it('builds an inclusive four-week window across month and year boundaries', () => {
    const records = {
      '2025-12-05': { weightKg: 80, createdAt: 1, updatedAt: 1 },
      '2025-12-06': { weightKg: 79.9, createdAt: 2, updatedAt: 2 },
      '2026-01-02': { weightKg: 79, createdAt: 3, updatedAt: 3 },
      '2026-01-03': { weightKg: 78.8, createdAt: 4, updatedAt: 4 },
    }
    const series = buildVisibleWeightSeries(records, new Date(2026, 0, 2, 12))
    expect(series.startDate).toBe('2025-12-06')
    expect(series.endDate).toBe('2026-01-02')
    expect(series.points.map(point => point.date)).toEqual(['2025-12-06', '2026-01-02'])
  })

  it('calculates visible-period change from chronological endpoints rather than object insertion order', () => {
    const records = {
      '2026-08-24': { weightKg: 78.4, createdAt: 3, updatedAt: 3 },
      '2026-08-01': { weightKg: 80, createdAt: 1, updatedAt: 1 },
      '2026-08-15': { weightKg: 79, createdAt: 2, updatedAt: 2 },
    }
    expect(getVisiblePeriodChange(records, new Date(2026, 7, 24, 12))).toBe(-1.6)
    expect(getVisiblePeriodChange({ '2026-08-24': records['2026-08-24'] }, new Date(2026, 7, 24, 12))).toBeNull()
  })

  it('produces finite chart bounds and coordinates for empty, one-point, identical, sparse, and boundary series', () => {
    const chartOptions = { startDate: '2026-08-01', endDate: '2026-08-28', width: 544, height: 172 }
    const examples = [
      [],
      [{ date: '2026-08-01', weightKg: 20 }],
      [{ date: '2026-08-01', weightKg: 78.4 }, { date: '2026-08-28', weightKg: 78.4 }],
      [{ date: '2026-08-01', weightKg: 20 }, { date: '2026-08-13', weightKg: 350.3 }, { date: '2026-08-28', weightKg: 500 }],
    ]
    examples.forEach(points => {
      const bounds = getWeightChartBounds(points)
      expect(Number.isFinite(bounds.min)).toBe(true)
      expect(Number.isFinite(bounds.max)).toBe(true)
      expect(bounds.max).toBeGreaterThan(bounds.min)
      const coordinates = getWeightChartCoordinates(points, { ...chartOptions, bounds })
      coordinates.forEach(point => {
        expect(Number.isFinite(point.x)).toBe(true)
        expect(Number.isFinite(point.y)).toBe(true)
        expect(point.x).toBeGreaterThanOrEqual(0)
        expect(point.x).toBeLessThanOrEqual(544)
        expect(point.y).toBeGreaterThanOrEqual(0)
        expect(point.y).toBeLessThanOrEqual(172)
      })
    })
  })
})
