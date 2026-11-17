// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'

vi.mock('../hooks/useSyncedStorage', () => ({
  useSyncedStorage: (_key, initialValue) => useState(initialValue),
}))
import DayPlanner from './DayPlanner'
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container
afterEach(() => { if (root) act(() => root.unmount()); container?.remove() })

it('lets a user enter an overnight end after 4 AM and apply the range together', () => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root.render(<DayPlanner />))
  expect(container.textContent).toContain('12 AM +1')
  expect(container.textContent).toContain('3 AM +1')
  expect(container.querySelector('#planner-start')).toBeNull()
  expect(container.textContent).toContain('Clear')
  act(() => container.querySelector('[aria-label="Edit schedule hours"]').click())
  const start = container.querySelector('#planner-start')
  const end = container.querySelector('#planner-end')
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  function change(input, value) {
    act(() => {
      setValue.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
  change(start, '09:00')
  change(end, '06:00')
  expect(end.value).toBe('06:00')
  expect(container.textContent).toContain('Next day')
  expect(container.textContent).toContain('10 AM')
  const apply = [...container.querySelectorAll('button')].find(button => button.textContent === 'Apply')
  expect(apply).toBeTruthy()
  act(() => apply.click())
  expect(container.querySelector('#planner-start')).toBeNull()
  expect(container.textContent).toContain('9 AM')
  expect(container.textContent).toContain('6 AM')
  expect(container.querySelector('[aria-label="Planner options"]')).toBeNull()
  act(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Clear').click())
  expect(container.textContent).toContain('Clear all blocks?')
})
