import { describe, expect, it } from 'vitest'
import {
  adjustCategory,
  adjustOutreach,
  adjustUncategorized,
  getCategorizedTotal,
  getJobRecord,
  getOverallApplicationCount,
  getUncategorizedCount,
  normalizeJobRecord,
  normalizeJobRecords,
} from './jobActivity'

const date = '2026-08-14'

describe('job activity compatibility helpers', () => {
  it('reads a legacy record as entirely Uncategorized without mutating the fixture', () => {
    const legacy = { date, count: 7 }
    const before = structuredClone(legacy)
    const normalized = normalizeJobRecord(legacy)

    expect(normalized).toMatchObject({
      date,
      count: 7,
      categories: { softwareEngineering: 0, aiApplications: 0, backend: 0, data: 0 },
      emails: 0,
      linkedin: 0,
    })
    expect(getCategorizedTotal(normalized)).toBe(0)
    expect(getUncategorizedCount(normalized)).toBe(7)
    expect(legacy).toEqual(before)
  })

  it('normalizes invalid, negative, and fractional values safely', () => {
    const normalized = normalizeJobRecord({
      date,
      count: 2.9,
      categories: {
        softwareEngineering: -3,
        aiApplications: 1.9,
        backend: 'not a number',
        data: Infinity,
      },
      emails: -1.2,
      linkedin: Number.NaN,
    })

    expect(normalized).toMatchObject({
      count: 2,
      categories: { softwareEngineering: 0, aiApplications: 1, backend: 0, data: 0 },
      emails: 0,
      linkedin: 0,
    })
  })

  it('uses categorized total when a malformed aggregate is too small', () => {
    const record = { date, count: 1, categories: { backend: 3, data: 2 } }
    expect(getCategorizedTotal(record)).toBe(5)
    expect(getOverallApplicationCount(record)).toBe(5)
    expect(getUncategorizedCount(record)).toBe(0)
  })

  it('increments and decrements each category while keeping count synchronized', () => {
    let records = []
    for (const category of ['softwareEngineering', 'aiApplications', 'backend', 'data']) {
      records = adjustCategory(records, date, category, 1)
    }
    expect(getJobRecord(records, date)).toMatchObject({
      count: 4,
      categories: { softwareEngineering: 1, aiApplications: 1, backend: 1, data: 1 },
    })

    records = adjustCategory(records, date, 'backend', -1)
    expect(getJobRecord(records, date)).toMatchObject({ count: 3, categories: { backend: 0 } })
    expect(adjustCategory(records, date, 'backend', -1)).toEqual(records)
  })

  it('preserves Uncategorized applications when changing a category', () => {
    const records = [{ date, count: 5, categories: { data: 2 }, source: 'synthetic' }]
    const updated = adjustCategory(records, date, 'data', 1)
    expect(updated[0]).toMatchObject({ count: 6, source: 'synthetic', categories: { data: 3 } })
    expect(getUncategorizedCount(updated[0])).toBe(3)
  })

  it('changes only Uncategorized through its helper and never below zero', () => {
    const enhanced = [{ date, count: 5, categories: { backend: 2 }, emails: 4, linkedin: 1, future: true }]
    const decreased = adjustUncategorized(enhanced, date, -1)
    expect(decreased[0]).toMatchObject({ count: 4, future: true, categories: { backend: 2 }, emails: 4, linkedin: 1 })
    expect(adjustUncategorized([{ date, count: 2, categories: { backend: 2 } }], date, -1)[0].count).toBe(2)
  })

  it('changes outreach independently and retains an outreach-only date', () => {
    let records = adjustOutreach([], date, 'emails', 1)
    records = adjustOutreach(records, date, 'linkedin', 2)
    expect(records[0]).toMatchObject({ count: 0, emails: 1, linkedin: 2 })
    expect(adjustOutreach(records, date, 'emails', -1)[0]).toMatchObject({ count: 0, emails: 0, linkedin: 2 })
    expect(adjustOutreach(records, date, 'linkedin', -3)[0]).toMatchObject({ count: 0, emails: 1, linkedin: 0 })
  })

  it('preserves unknown fields through category, outreach, and aggregate updates', () => {
    const original = [{ date, count: 1, categories: { data: 1 }, emails: 2, metadata: { tag: 'keep' } }]
    const updated = adjustOutreach(
      adjustCategory(original, date, 'data', 1),
      date,
      'linkedin',
      1,
    )
    const final = adjustUncategorized(updated, date, 1)[0]
    expect(final).toMatchObject({ count: 3, categories: { data: 2 }, emails: 2, linkedin: 1, metadata: { tag: 'keep' } })
  })

  it('removes a date only when all application and outreach values are zero', () => {
    expect(adjustCategory([{ date, count: 1, categories: { softwareEngineering: 1 } }], date, 'softwareEngineering', -1)).toEqual([])
    expect(adjustOutreach([{ date, count: 0, emails: 1 }], date, 'emails', -1)).toEqual([])
    expect(adjustCategory([{ date, count: 1, categories: { data: 1 }, emails: 1 }], date, 'data', -1)).toHaveLength(1)
  })

  it('normalizes duplicate fixture dates for display without mutating input', () => {
    const fixtures = [{ date, count: 2 }, { date, count: 1, categories: { data: 2 }, linkedin: 1 }]
    const before = structuredClone(fixtures)
    const normalized = normalizeJobRecords(fixtures)
    expect(normalized).toHaveLength(1)
    expect(normalized[0]).toMatchObject({ count: 4, categories: { data: 2 }, linkedin: 1 })
    expect(fixtures).toEqual(before)
  })

  it('treats valid past, present, and future local date keys the same way', () => {
    const records = adjustCategory([], '2026-08-13', 'data', 1)
    const withToday = adjustCategory(records, date, 'data', 1)
    const withFuture = adjustOutreach(withToday, '2026-08-15', 'linkedin', 1)
    expect(withFuture.map(record => record.date)).toEqual(['2026-08-13', date, '2026-08-15'])
    expect(getJobRecord(withFuture, '2026-08-15')).toMatchObject({ count: 0, linkedin: 1 })
  })
})
