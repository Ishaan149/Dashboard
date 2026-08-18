// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const storage = vi.hoisted(() => ({
  setDailyTasks: vi.fn(),
  setWeekTasks: vi.fn(),
  setHabitLogs: vi.fn(),
  setNotes: vi.fn(),
  setActiveId: vi.fn(),
  setJobRecords: vi.fn(),
}))

vi.mock('../hooks/useSyncedStorage', () => ({
  useSyncedStorage(key) {
    if (key === 'todos-daily') return [{}, storage.setDailyTasks]
    if (key === 'todos-thisweek') return [[], storage.setWeekTasks]
    if (key === 'habits') return [[{ id: 7, name: 'Read' }, { id: 8, name: 'Walk' }], vi.fn()]
    if (key === 'habit_logs') return [{}, storage.setHabitLogs]
    if (key === 'brainDumpNotes') return [[{ id: 'existing', title: 'Existing', content: '' }], storage.setNotes]
    if (key === 'brainDumpActiveId') return [null, storage.setActiveId]
    if (key === 'job_applications') return [[], storage.setJobRecords]
    throw new Error(`Unexpected storage key: ${key}`)
  },
}))

import CommandPalette from './CommandPalette'
import { ToastProvider } from './ui'

function inputValue(element, value) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set
  act(() => {
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

function clickCommand(label) {
  const option = [...document.body.querySelectorAll('[role="option"]')]
    .find(element => element.querySelector('strong')?.textContent === label)
  click(option)
}

describe('Command Palette Quick Note', () => {
  let container
  let root
  let onNavigate
  let randomUUID

  beforeEach(() => {
    storage.setDailyTasks.mockReset()
    storage.setWeekTasks.mockReset()
    storage.setHabitLogs.mockReset()
    storage.setNotes.mockReset()
    storage.setActiveId.mockReset()
    storage.setJobRecords.mockReset()
    onNavigate = vi.fn()
    randomUUID = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('quick-generated')
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    act(() => root.render(
      <ToastProvider><CommandPalette activeView="overview" onNavigate={onNavigate} /></ToastProvider>,
    ))
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    randomUUID.mockRestore()
  })

  it('shows action commands without shortcut navigation clutter', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    const dialog = document.body.querySelector('[role="dialog"]')

    expect(dialog).not.toBeNull()
    expect(dialog.textContent).toContain('Create Task Today')
    expect(dialog.textContent).toContain('Create Task This Week')
    expect(dialog.textContent).toContain('Log Habit')
    expect(dialog.textContent).toContain('Quick Note')
    expect(dialog.textContent).toContain('Log Application')
    expect(dialog.textContent).not.toContain('Home')
    expect(dialog.textContent).not.toContain('To-Do')
    expect(dialog.textContent).not.toContain('Brain Dump')
    expect(dialog.textContent).not.toContain('Job Applications')
    expect(dialog.textContent).not.toContain('Navigate')
  })

  it('resets the active command when reopened', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    clickCommand('Quick Note')
    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Cancel'))

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))

    expect(document.body.querySelector('[role="option"][aria-selected="true"]')?.textContent).toContain('Quick Note')
  })

  it('uses command-only copy for empty search results', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    inputValue(document.body.querySelector('[aria-label="Search commands"]'), 'does-not-exist')

    expect(document.body.textContent).toContain('No matching commands')
    expect(document.body.textContent).not.toContain('No matching commands or pages')
  })

  it('runs the Home keyboard shortcut', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true })))

    expect(onNavigate).toHaveBeenCalledWith('overview')
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('does not discard an in-progress command when Home is pressed', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    clickCommand('Quick Note')
    inputValue(document.body.querySelector('textarea'), 'Keep this draft')

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true })))

    expect(onNavigate).not.toHaveBeenCalled()
    expect(document.body.querySelector('textarea')?.value).toBe('Keep this draft')
  })

  it.each([
    ['t', 'todo'],
    ['n', 'braindump'],
    ['j', 'jobs'],
  ])('navigates with the %s keyboard shortcut', (key, view) => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key, metaKey: true, bubbles: true })))

    expect(onNavigate).toHaveBeenCalledWith(view)
  })

  it('keeps shortcut hints out of the command list', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))

    expect(document.body.querySelector('[role="listbox"] kbd')).toBeNull()
  })

  it('creates a task for today', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    clickCommand('Create Task Today')
    inputValue(document.body.querySelector('input[placeholder="What needs to get done?"]'), 'Ship dashboard')
    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Create Task'))

    expect(storage.setDailyTasks).toHaveBeenCalledTimes(1)
    const updated = storage.setDailyTasks.mock.calls[0][0]({})
    const tasks = Object.values(updated).flat()
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({ text: 'Ship dashboard', done: false })
    expect(document.body.textContent).toContain('Task added to Today.')
  })

  it('creates a task for this week', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Create Task This Week'))
    inputValue(document.body.querySelector('input[placeholder="What needs to get done?"]'), 'Review roadmap')
    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Create Task'))

    expect(storage.setWeekTasks).toHaveBeenCalledTimes(1)
    expect(storage.setWeekTasks.mock.calls[0][0]([])[0]).toMatchObject({ text: 'Review roadmap', done: false })
    expect(document.body.textContent).toContain('Task added to This Week.')
  })

  it('logs a selected habit for today', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Log Habit'))
    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Log Habit'))

    expect(storage.setHabitLogs).toHaveBeenCalledTimes(1)
    const updated = storage.setHabitLogs.mock.calls[0][0]({})
    expect(Object.values(updated).flat()).toContain(7)
    expect(document.body.textContent).toContain('Read logged for today.')
  })

  it.each(['jobs', 'applications', 'add job', 'Software Engineering', 'AI Applications', 'Backend', 'Data'])(
    'finds Log Application with the %s keyword',
    keyword => {
      act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
      inputValue(document.body.querySelector('[aria-label="Search commands"]'), keyword)
      expect(document.body.querySelector('[role="option"]')?.textContent).toContain('Log Application')
    },
  )

  it('opens the ordered uncommitted job-type list and cancels without writing', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    clickCommand('Log Application')

    expect([...document.body.querySelectorAll('[aria-label="Job types"] [role="option"]')].map(option => option.textContent.trim())).toEqual([
      'Software Engineering',
      'AI Applications',
      'Backend',
      'Data',
    ])
    expect(storage.setJobRecords).not.toHaveBeenCalled()
    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === '← Back'))
    expect(storage.setJobRecords).not.toHaveBeenCalled()
    expect(document.body.querySelector('[aria-label="Search commands"]')).not.toBeNull()
  })

  it.each(['escape', 'close', 'backdrop'])('does not write when the job step is dismissed by %s', dismissal => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    clickCommand('Log Application')

    if (dismissal === 'escape') {
      act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    } else if (dismissal === 'close') {
      click(document.body.querySelector('[aria-label="Close command palette"]'))
    } else {
      const backdrop = document.body.querySelector('[class*="backdrop"]')
      act(() => backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })))
    }

    expect(storage.setJobRecords).not.toHaveBeenCalled()
  })

  it.each([
    ['Software Engineering', 'softwareEngineering'],
    ['AI Applications', 'aiApplications'],
    ['Backend', 'backend'],
    ['Data', 'data'],
  ])('logs exactly one %s application and preserves compatible fields', (label, key) => {
    const existing = [{
      date: '2026-08-18',
      count: 6,
      categories: { softwareEngineering: 1, aiApplications: 0, backend: 1, data: 1 },
      emails: 2,
      linkedin: 3,
      future: { keep: true },
    }]
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    clickCommand('Log Application')
    click([...document.body.querySelectorAll('[aria-label="Job types"] [role="option"]')].find(option => option.textContent.includes(label)))

    expect(storage.setJobRecords).toHaveBeenCalledTimes(1)
    const updated = storage.setJobRecords.mock.calls[0][0](existing)
    expect(updated[0]).toMatchObject({ count: 7, emails: 2, linkedin: 3, future: { keep: true } })
    expect(updated[0].categories[key]).toBe(existing[0].categories[key] + 1)
    expect(updated[0].categories).toEqual({ ...existing[0].categories, [key]: existing[0].categories[key] + 1 })
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(document.body.textContent).toContain(`${label} application logged for today.`)
  })

  it('supports keyboard job-type choice and reopens with no committed selection', async () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    clickCommand('Log Application')
    const first = document.body.querySelector('[aria-label="Job types"] [role="option"]')
    await act(async () => new Promise(resolve => requestAnimationFrame(resolve)))
    expect(document.activeElement).toBe(first)
    act(() => first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })))
    expect(document.activeElement.textContent).toContain('AI Applications')
    act(() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    click(document.activeElement)
    expect(storage.setJobRecords).toHaveBeenCalledTimes(1)

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    clickCommand('Log Application')
    expect([...document.body.querySelectorAll('[aria-label="Job types"] [role="option"]')].every(option => option.getAttribute('aria-selected') === 'false')).toBe(true)
  })

  it('opens globally and captures an isolated regular Brain Dump Quick Note', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))

    clickCommand('Quick Note')
    const textarea = document.body.querySelector('textarea')
    inputValue(textarea, 'First quick thought\nwith more detail')
    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Save Quick Note'))

    expect(storage.setNotes).toHaveBeenCalledTimes(1)
    expect(storage.setNotes.mock.calls[0][0][0]).toMatchObject({
      id: 'quick-generated',
      title: 'First quick thought',
      content: 'First quick thought\nwith more detail',
      quickNote: true,
      favorite: false,
    })
    expect(storage.setActiveId).toHaveBeenCalledWith('quick-generated')
    expect(document.body.textContent).toContain('Quick Note saved to Brain Dump.')
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('protects an unsaved Quick Note before leaving', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })))
    clickCommand('Quick Note')
    const textarea = document.body.querySelector('textarea')
    inputValue(textarea, 'Keep this draft')
    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === '← Back'))

    expect(document.body.querySelector('[aria-label="Discard unsaved changes"]')).not.toBeNull()
    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Keep Editing'))
    expect(document.body.querySelector('textarea')?.value).toBe('Keep this draft')

    click([...document.body.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Close command palette'))
    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Discard'))

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(storage.setNotes).not.toHaveBeenCalled()
  })

  it('disables required actions until their fields have content', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })))
    clickCommand('Create Task Today')
    expect([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Create Task')?.disabled).toBe(true)

    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Cancel'))
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })))
    clickCommand('Quick Note')
    expect([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Save Quick Note')?.disabled).toBe(true)

    expect(storage.setNotes).not.toHaveBeenCalled()
  })
})
