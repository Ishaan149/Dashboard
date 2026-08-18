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

function SharedHarness() {
  const [first, setFirst] = useSyncedStorage('shared', [])
  const [second] = useSyncedStorage('shared', [])
  return (
    <button type="button" onClick={() => setFirst([{ id: 'quick' }])}>
      {first.length}:{second.length}
    </button>
  )
}

function JobConsumersHarness() {
  const [, setPaletteRecords] = useSyncedStorage('job_applications', [])
  const [overviewRecords] = useSyncedStorage('job_applications', [])
  const backend = getJobRecord(overviewRecords, '2026-08-18')?.categories.backend ?? 0
  return (
    <button type="button" onClick={() => setPaletteRecords(previous => adjustCategory(previous, '2026-08-18', 'backend', 1))}>
      Overview backend: {backend}
    </button>
  )
}

describe('useSyncedStorage Firebase safety', () => {
  let container
  let root
  const legacy = [{ id: 'legacy', title: 'Keep me', content: 'Original', unknown: 'preserved' }]

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    localStorage.setItem('brainDumpNotes', JSON.stringify(legacy))
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

  it('keeps multiple same-tab consumers of one key synchronized without real Firestore', () => {
    localStorage.removeItem('shared')
    act(() => root.render(<SharedHarness />))
    expect(container.textContent).toBe('0:0')

    act(() => container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true })))

    expect(container.textContent).toBe('1:1')
    expect(JSON.parse(localStorage.getItem('shared'))).toEqual([{ id: 'quick' }])
  })

  it('shows a palette-style typed job update in another mounted same-tab consumer immediately', () => {
    localStorage.removeItem('job_applications')
    act(() => root.render(<JobConsumersHarness />))
    expect(container.textContent).toBe('Overview backend: 0')

    act(() => container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true })))

    expect(container.textContent).toBe('Overview backend: 1')
    expect(JSON.parse(localStorage.getItem('job_applications'))[0]).toMatchObject({
      date: '2026-08-18',
      count: 1,
      categories: { backend: 1 },
    })
  })
})
