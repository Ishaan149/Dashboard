// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDateKey } from '../utils/date'
import { ToastProvider } from './ui'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const store = vi.hoisted(() => ({ values: {}, writes: {} }))
vi.mock('../hooks/useSyncedStorage', () => ({
  useSyncedStorage(key, initialValue) {
    const [value, setValue] = useState(() => store.values[key] ?? initialValue)
    return [value, next => setValue(previous => {
      const resolved = typeof next === 'function' ? next(previous) : next
      store.values[key] = resolved
      store.writes[key] = (store.writes[key] ?? 0) + 1
      return resolved
    })]
  },
}))
import HabitTracker from './HabitTracker'

function input(element, value) { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; act(() => { setter.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })) }) }
function click(element) { act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true }))) }
function keydown(element, key) { act(() => element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))) }

describe('Habit Tracker redesign', () => {
  let container; let root
  beforeEach(() => {
    store.values = { habits: [{ id: 1, name: 'Read', createdAt: getDateKey(6) }], habit_logs: {} }; store.writes = {}
    container = document.createElement('div'); document.body.append(container); root = createRoot(container)
    act(() => root.render(<ToastProvider><HabitTracker /></ToastProvider>))
  })
  afterEach(() => { act(() => root.unmount()); container.remove() })

  it('renders permanent labels, Today, semantic cells, and toggles a historical date in one click', () => {
    const headers = [...container.querySelectorAll('thead th')]
    expect(headers).toHaveLength(8)
    expect(headers.slice(1).every(header => /\w{3}\s+\d+/u.test(header.textContent))).toBe(true)
    expect(headers.at(-1).textContent).toContain('Today')
    const cells = [...container.querySelectorAll('[role="checkbox"]')]
    expect(cells).toHaveLength(7)
    expect(cells[0].getAttribute('aria-label')).toMatch(/Read.*for .*\d{4}/u)
    click(cells[0])
    expect(cells[0].getAttribute('aria-checked')).toBe('true')
    expect(container.textContent).toContain('7 days 14%')
    expect(container.textContent).not.toContain('Current')
    expect(container.textContent).not.toContain('Best')
    expect(document.body.textContent).not.toContain('marked complete')
  })

  it('adds habits with a local creation date and validates empty names', () => {
    const field = container.querySelector('#new-habit')
    click(container.querySelector('button[type="submit"]'))
    expect(container.textContent).toContain('Enter a habit name.')
    input(field, '  Walk  ')
    click(container.querySelector('button[type="submit"]'))
    expect(store.values.habits.at(-1)).toMatchObject({ name: 'Walk', createdAt: getDateKey(0) })
  })

  it('renames with Enter, cancels with Escape, and keeps the identifier', () => {
    click(container.querySelector('[aria-label="Actions for Read"]'))
    click(container.querySelector('[aria-label="Rename Read"]'))
    const rename = container.querySelector('[aria-label="Rename Read"]')
    input(rename, 'Pages')
    keydown(rename, 'Enter')
    expect(store.values.habits[0]).toMatchObject({ id: 1, name: 'Pages' })
    click(container.querySelector('[aria-label="Actions for Pages"]'))
    click(container.querySelector('[aria-label="Rename Pages"]'))
    const next = container.querySelector('[aria-label="Rename Pages"]')
    input(next, 'Discarded'); keydown(next, 'Escape')
    expect(container.textContent).toContain('Pages')
    expect(container.textContent).not.toContain('Discarded')
  })

  it('confirms deletion and preserves data on cancellation', () => {
    click(container.querySelector('[aria-label="Actions for Read"]'))
    const trigger = container.querySelector('[aria-label="Delete Read"]'); trigger.focus(); click(trigger)
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    click([...document.body.querySelectorAll('button')].find(button => button.textContent === 'Cancel'))
    expect(store.values.habits).toHaveLength(1)
    click(container.querySelector('[aria-label="Actions for Read"]'))
    click(container.querySelector('[aria-label="Delete Read"]'))
    click([...document.body.querySelectorAll('button')].find(button => button.textContent === 'Delete habit'))
    expect(store.values.habits).toEqual([])
    expect(container.textContent).toContain('No habits yet.')
  })
})
