// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const firestore = vi.hoisted(() => ({
  listener: null,
  doc: vi.fn((_db, collection, key) => ({ collection, key })),
  onSnapshot: vi.fn((_ref, next) => {
    firestore.listener = next
    return vi.fn()
  }),
  setDoc: vi.fn(() => Promise.resolve()),
}))

vi.mock('firebase/firestore', () => ({
  doc: firestore.doc,
  onSnapshot: firestore.onSnapshot,
  setDoc: firestore.setDoc,
}))

vi.mock('../firebase', () => ({ db: { mocked: true } }))

import { useSyncedStorage } from './useSyncedStorage'
import { adjustCategory, getJobRecord } from '../domain/jobActivity'

function Harness() {
  const [notes, setNotes] = useSyncedStorage('brainDumpNotes', [])
  return (
    <button type="button" onClick={() => setNotes(previous => previous.map(note => note.id === 'legacy' ? { ...note, content: 'Edited' } : note))}>
      {notes[0]?.content ?? 'empty'}
    </button>
  )
}

const activityDate = '2026-08-18'

function JobConsumersHarness() {
  const [paletteRecords, setPaletteRecords] = useSyncedStorage('job_applications', [])
  const [overviewRecords, setOverviewRecords] = useSyncedStorage('job_applications', [])
  const paletteCount = getJobRecord(paletteRecords, activityDate)?.count ?? 0
  const overviewBackendCount = getJobRecord(overviewRecords, activityDate)?.categories.backend ?? 0
  return (
    <>
      <button type="button" onClick={() => setOverviewRecords([{ date: activityDate, count: 1 }])}>
        Add legacy record
      </button>
      <button type="button" onClick={() => setPaletteRecords(previous => adjustCategory(previous, activityDate, 'backend', 1))}>
        Log Backend application
      </button>
      <output>{paletteCount} total, {overviewBackendCount} Backend</output>
    </>
  )
}

describe('useSyncedStorage Firebase safety', () => {
  let container
  let root
  const legacy = [{ id: 'legacy', title: 'Keep me', content: 'Original', unknown: 'preserved' }]

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    firestore.listener = null
    firestore.doc.mockClear()
    firestore.onSnapshot.mockClear()
    firestore.setDoc.mockClear()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  it('does not echo cached or hydrated legacy notes, then writes only after an explicit edit', () => {
    localStorage.setItem('brainDumpNotes', JSON.stringify(legacy))
    act(() => root.render(<Harness />))
    expect(container.textContent).toBe('Original')
    expect(firestore.setDoc).not.toHaveBeenCalled()

    act(() => firestore.listener({
      exists: () => true,
      data: () => ({ value: legacy }),
    }))
    act(() => vi.advanceTimersByTime(1_100))
    expect(firestore.setDoc).not.toHaveBeenCalled()

    act(() => container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(container.textContent).toBe('Edited')
    expect(JSON.parse(localStorage.getItem('brainDumpNotes'))[0]).toEqual({ ...legacy[0], content: 'Edited' })

    act(() => vi.advanceTimersByTime(1_000))
    expect(firestore.setDoc).toHaveBeenCalledTimes(1)
    expect(firestore.setDoc.mock.calls[0][1].value[0]).toEqual({ ...legacy[0], content: 'Edited' })
  })

  it('shares direct writes and typed job updates between same-tab consumers', () => {
    act(() => root.render(<JobConsumersHarness />))
    const [addLegacyRecord, logBackend] = container.querySelectorAll('button')
    const counts = container.querySelector('output')
    expect(counts.textContent).toBe('0 total, 0 Backend')

    act(() => addLegacyRecord.click())
    expect(counts.textContent).toBe('1 total, 0 Backend')
    expect(JSON.parse(localStorage.getItem('job_applications'))).toEqual([{ date: activityDate, count: 1 }])

    act(() => logBackend.click())
    expect(counts.textContent).toBe('2 total, 1 Backend')
    expect(JSON.parse(localStorage.getItem('job_applications'))[0]).toMatchObject({
      date: activityDate,
      count: 2,
      categories: { backend: 1 },
    })
  })
})
