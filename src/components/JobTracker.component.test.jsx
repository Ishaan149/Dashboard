// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const storage = vi.hoisted(() => ({
  records: [],
  note: '',
  setRecords: vi.fn(),
  setNote: vi.fn(),
}))

vi.mock('../hooks/useSyncedStorage', () => ({
  useSyncedStorage(key) {
    if (key === 'job_applications') return [storage.records, storage.setRecords]
    if (key === 'job_note') return [storage.note, storage.setNote]
    throw new Error(`Unexpected storage key: ${key}`)
  },
}))

import JobTracker from './JobTracker'

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

describe('Job Applications page', () => {
  let container
  let root

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 14, 12))
    storage.records = []
    storage.note = ''
    storage.setRecords.mockReset()
    storage.setNote.mockReset()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    act(() => root.render(<JobTracker />))
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  it('selects local today without creating a record and renders approved controls in order', () => {
    const dateDisplay = container.querySelector('time[aria-label="Selected activity date"]')
    expect(dateDisplay.getAttribute('dateTime')).toBe('2026-08-14')
    expect(dateDisplay.textContent).toBe('Today')
    expect(storage.setRecords).not.toHaveBeenCalled()

    const headings = [...container.querySelectorAll('section[aria-label="Job activity logging"] li h3')].map(node => node.textContent)
    expect(headings).toEqual(['Software Engineering', 'AI Applications', 'Backend', 'Data', 'Emails', 'LinkedIn'])
  })

  it('renders contextual accessible names and updates only through the mocked boundary', () => {
    const backendIncrease = container.querySelector('button[aria-label^="Increase Backend"]')
    const backendDecrease = container.querySelector('button[aria-label^="Decrease Backend"]')
    expect(backendIncrease.getAttribute('aria-label')).toContain('Friday, August 14, 2026')
    expect(backendDecrease.disabled).toBe(true)

    click(backendIncrease)
    expect(storage.setRecords).toHaveBeenCalledTimes(1)
    const updated = storage.setRecords.mock.calls[0][0](storage.records)
    expect(updated[0]).toMatchObject({ date: '2026-08-14', count: 1, categories: { backend: 1 } })
    expect(backendDecrease.disabled).toBe(true)
  })

  it('allows past and future dates without creating records on navigation', () => {
    click(container.querySelector('button[aria-label^="Previous activity date"]'))
    click(container.querySelector('button[aria-label^="Next activity date"]'))
    click(container.querySelector('button[aria-label^="Next activity date"]'))
    expect(storage.setRecords).not.toHaveBeenCalled()
    expect(container.querySelector('time[aria-label="Selected activity date"]').getAttribute('dateTime')).toBe('2026-08-15')
    expect(container.querySelector('time[aria-label="Selected activity date"]').textContent).toBe('Sat, Aug 15')
    expect(container.querySelector('section[aria-label="Job activity logging"] h3').textContent).toBe('Applications')
  })

  it('keeps application-only summaries, notes, and history compatible with legacy records', () => {
    storage.records = [
      { date: '2026-08-13', count: 4 },
      { date: '2026-08-12', count: 0, emails: 2 },
    ]
    storage.note = 'Keep this global note'
    act(() => root.render(<JobTracker />))

    expect(container.textContent).toContain('this week')
    expect(container.textContent).toContain('this month')
    expect(container.textContent).toContain('all time')
    expect(container.querySelector('#notes-heading + textarea').value).toBe('Keep this global note')
    const historyItems = container.querySelectorAll('#history-heading + ul > li')
    expect(historyItems).toHaveLength(2)
    expect(historyItems[0].textContent).toContain('4')
    expect(container.querySelector('section[aria-label="Job activity logging"] li span[aria-live="polite"]').textContent).toBe('0')
    expect([...historyItems].some(item => item.textContent.includes('0'))).toBe(true)
  })

  it('uses native disabled semantics for every zero-valued decrease control', () => {
    const decreases = [...container.querySelectorAll('button[aria-label^="Decrease"]')]
    expect(decreases).toHaveLength(6)
    expect(decreases.every(button => button.disabled)).toBe(true)
    expect(decreases.every(button => button.offsetWidth >= 0)).toBe(true)
  })
})
