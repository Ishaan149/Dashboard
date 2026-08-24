// @vitest-environment jsdom

import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

import Wellness from './Wellness'

function setInput(element, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function setSelect(element, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
  act(() => {
    setter.call(element, value)
    element.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

function buttonWithText(root, text) {
  return [...root.querySelectorAll('button')].find(button => button.textContent.trim() === text)
}

describe('Wellness', () => {
  let container
  let root

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 24, 12))
    store.values = {
      wellness_food_records: [],
      wellness_saved_foods: [],
      wellness_weight_records: {},
    }
    store.writes = {}
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    act(() => root.render(<ToastProvider><Wellness /></ToastProvider>))
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    document.querySelectorAll('[role="dialog"]').forEach(dialog => dialog.closest('div')?.remove())
    vi.useRealTimers()
  })

  it('opens nutrition on today, prevents a future next-day move, and changes displayed records without writing', () => {
    store.values.wellness_food_records = [
      { id: 'food_today', date: '2026-08-24', name: 'Today food', calories: 100, proteinGrams: 10, createdAt: 1, updatedAt: 1 },
      { id: 'food_previous', date: '2026-08-23', name: 'Previous food', calories: 200, proteinGrams: 20, createdAt: 2, updatedAt: 2 },
    ]
    act(() => root.unmount())
    root = createRoot(container)
    act(() => root.render(<ToastProvider><Wellness /></ToastProvider>))

    const date = container.querySelector('time[aria-label="Selected nutrition date"]')
    expect(date.dateTime).toBe('2026-08-24')
    expect(container.textContent).toContain('Today food')
    expect(container.textContent).toContain('100')
    const next = container.querySelector('button[aria-label^="Next nutrition date"]')
    expect(next.disabled).toBe(true)

    click(container.querySelector('button[aria-label^="Previous nutrition date"]'))
    expect(date.dateTime).toBe('2026-08-23')
    expect(container.textContent).toContain('Previous food')
    expect(container.textContent).not.toContain('Today food')
    expect(store.writes.wellness_food_records).toBeUndefined()
  })

  it('adds manual food, saves it as an exact reusable template, and copies fixed saved-food values', () => {
    setInput(container.querySelector('#wellness-food-name'), '  Greek yogurt  ')
    setInput(container.querySelector('#wellness-food-calories'), '160')
    setInput(container.querySelector('#wellness-food-protein'), '18')
    act(() => container.querySelector('input[type="checkbox"]').click())
    click(buttonWithText(container, 'Add food'))

    expect(store.values.wellness_food_records).toHaveLength(1)
    expect(store.values.wellness_food_records[0]).toMatchObject({ date: '2026-08-24', name: 'Greek yogurt', calories: 160, proteinGrams: 18 })
    expect(store.values.wellness_saved_foods).toHaveLength(1)
    expect(container.textContent).toContain('160 calories')
    expect(container.textContent).toContain('18 g protein')

    const savedSelect = container.querySelector('#wellness-saved-food')
    expect(savedSelect.value).toBe(store.values.wellness_saved_foods[0].id)
    expect(container.textContent).toContain('160 calories')
    expect(container.querySelectorAll('#wellness-saved-food + input')).toHaveLength(0)
    click(buttonWithText(container, 'Add saved food'))

    expect(store.values.wellness_food_records).toHaveLength(2)
    expect(store.values.wellness_food_records[1]).toMatchObject({
      date: '2026-08-24',
      name: 'Greek yogurt',
      calories: 160,
      proteinGrams: 18,
    })
    expect(container.textContent).toContain('320')
    expect(container.textContent).toContain('36 g')
  })

  it('edits food, leaves it unchanged after a cancelled deletion, and deletes it after confirmation', () => {
    store.values.wellness_food_records = [{ id: 'food_one', date: '2026-08-24', name: 'Oats', calories: 300, proteinGrams: 12, createdAt: 1, updatedAt: 1 }]
    act(() => root.unmount())
    root = createRoot(container)
    act(() => root.render(<ToastProvider><Wellness /></ToastProvider>))

    click(container.querySelector('[aria-label="Edit Oats"]'))
    const dialog = document.body.querySelector('[role="dialog"]')
    setInput(dialog.querySelector('#wellness-edit-food-calories'), '350')
    click(buttonWithText(dialog, 'Save changes'))
    expect(store.values.wellness_food_records[0]).toMatchObject({ calories: 350, proteinGrams: 12, date: '2026-08-24', createdAt: 1 })
    expect(container.textContent).toContain('350 calories')

    const deleteFood = container.querySelector('[aria-label="Delete Oats"]')
    deleteFood.focus()
    click(deleteFood)
    const deleteDialog = document.body.querySelector('[role="dialog"]')
    expect(deleteDialog.textContent).toContain('Oats')
    expect(deleteDialog.textContent).toContain('August')
    click(buttonWithText(deleteDialog, 'Cancel'))
    act(() => vi.advanceTimersByTime(20))
    expect(document.activeElement).toBe(deleteFood)
    expect(store.values.wellness_food_records).toHaveLength(1)

    click(container.querySelector('[aria-label="Delete Oats"]'))
    click(buttonWithText(document.body.querySelector('[role="dialog"]'), 'Delete'))
    expect(store.values.wellness_food_records).toEqual([])
    expect(container.textContent).toContain('No food logged for this day')
  })

  it('adds, replaces, edits, and deletes same-day weight while refreshing chart metrics and records', () => {
    setInput(container.querySelector('#wellness-weight-value'), '80')
    click(buttonWithText(container, 'Add weight'))
    expect(store.values.wellness_weight_records).toEqual({
      '2026-08-24': expect.objectContaining({ weightKg: 80 }),
    })
    expect(container.textContent).toContain('80.0 kg')
    expect(container.querySelectorAll('circle[aria-label]').length).toBe(1)

    setInput(container.querySelector('#wellness-weight-value'), '79.4')
    click(buttonWithText(container, 'Update weight'))
    expect(Object.keys(store.values.wellness_weight_records)).toEqual(['2026-08-24'])
    expect(store.values.wellness_weight_records['2026-08-24'].weightKg).toBe(79.4)

    setInput(container.querySelector('#wellness-weight-date'), '2026-08-23')
    setInput(container.querySelector('#wellness-weight-value'), '80.4')
    click(buttonWithText(container, 'Add weight'))
    expect(container.querySelectorAll('circle[aria-label]').length).toBe(2)
    expect(container.textContent).toContain('-1.0 kg')

    click(container.querySelector('[aria-label^="Edit weight for"]'))
    const editDialog = document.body.querySelector('[role="dialog"]')
    setInput(editDialog.querySelector('#wellness-edit-weight'), '80.0')
    click(buttonWithText(editDialog, 'Save changes'))
    expect(store.values.wellness_weight_records['2026-08-24'].weightKg).toBe(80)
    expect(container.textContent).toContain('-0.4 kg')

    const deleteCurrent = [...container.querySelectorAll('[aria-label^="Delete weight for"]')]
      .find(button => button.getAttribute('aria-label').includes('August 24'))
    click(deleteCurrent)
    click(buttonWithText(document.body.querySelector('[role="dialog"]'), 'Cancel'))
    expect(Object.keys(store.values.wellness_weight_records)).toHaveLength(2)

    click(deleteCurrent)
    click(buttonWithText(document.body.querySelector('[role="dialog"]'), 'Delete'))
    expect(store.values.wellness_weight_records).toEqual({
      '2026-08-23': expect.objectContaining({ weightKg: 80.4 }),
    })
    expect(container.textContent).toContain('80.4 kg')
  })

  it('renders intentional empty states for food and four-week weight history', () => {
    expect(container.textContent).toContain('No food logged for this day')
    expect(container.textContent).toContain('Saved foods')
    expect(container.textContent).not.toContain('Save a food while entering it manually')
    expect(container.textContent).toContain('No weight entries in the last four weeks')
    expect(container.querySelector('#weight-chart-title').textContent).toBe('Weight Trend')
    expect(container.textContent).toContain('Enter food')
    expect(container.textContent).not.toContain('Enter food manually')
    expect(container.textContent).not.toContain('Record a weight to see it here')
    expect(container.textContent).not.toContain('Add another entry to see change')
    const weightSection = container.querySelector('section[aria-labelledby="weight-heading"]')
    expect([...weightSection.querySelectorAll('p')].some(paragraph => paragraph.textContent === 'Weight')).toBe(false)
  })
})
