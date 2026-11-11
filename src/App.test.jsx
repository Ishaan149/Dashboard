// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ClockWidget from './components/ClockWidget'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

vi.mock('./components/AppShell', () => ({
  default: ({ children, onNavigate }) => (
    <div>
      <button type="button" aria-label="Open To-Do navigation" onClick={() => onNavigate('todo')}>To-Do</button>
      <button type="button" aria-label="Open Projects navigation" onClick={() => onNavigate('projects')}>Projects</button>
      <main id="main-content" tabIndex="-1">{children}</main>
    </div>
  ),
}))
vi.mock('./theme/ThemeProvider', () => ({ ThemeProvider: ({ children }) => children }))
vi.mock('./components/ui', async importOriginal => ({
  ...await importOriginal(),
  LoadingState: () => <span>Loading</span>,
}))
vi.mock('./components/Overview', () => ({
  default: ({ onChange, selectedJobType, onSelectedJobTypeChange, clock }) => (
    <div>
      <select aria-label="Mock job type" value={selectedJobType} onChange={event => onSelectedJobTypeChange(event.target.value)}>
        <option value="">Choose job type</option>
        <option value="backend">Backend</option>
      </select>
      <button type="button" aria-label="Open To-Do" onClick={() => onChange('todo')}>Open To-Do</button>
      <ClockWidget clock={clock} />
    </div>
  ),
}))
vi.mock('./components/Projects', () => ({ default: () => <div>Project notebook workspace</div> }))
vi.mock('./components/TodoCard', () => ({
  default: ({ onChange, selectedJobType }) => (
    <div>
      <span>To-Do selection: {selectedJobType}</span>
      <button type="button" aria-label="Open Overview" onClick={() => onChange('overview')}>Open Overview</button>
    </div>
  ),
}))

import App from './App'

function changeValue(field, value) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value').set
  act(() => {
    setter.call(field, value)
    field.dispatchEvent(new Event(field.tagName === 'INPUT' ? 'input' : 'change', { bubbles: true }))
  })
}

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

describe('App', () => {
  let container
  let root

  beforeEach(async () => {
    localStorage.setItem('dashboard-unlocked', 'true')
    localStorage.setItem('wellness_food_records', '[{"name":"Oats"}]')
    localStorage.setItem('wellness_saved_foods', '[{"name":"Yogurt"}]')
    localStorage.setItem('wellness_weight_records', '{"2026-10-17":{"weightKg":80}}')
    localStorage.setItem('habits', '[{"id":1,"name":"Walk"}]')
    localStorage.setItem('todos-daily', '{"2026-10-17":[]}')
    localStorage.setItem('brainDumpNotes', '[{"id":"health","title":"Health notes"}]')
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => root.render(<App />))
  })

  afterEach(() => {
    if (root) act(() => root.unmount())
    container.remove()
    localStorage.clear()
    sessionStorage.clear()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('clears only retired wellness browser records on startup', () => {
    expect(localStorage.getItem('wellness_food_records')).toBeNull()
    expect(localStorage.getItem('wellness_saved_foods')).toBeNull()
    expect(localStorage.getItem('wellness_weight_records')).toBeNull()
    expect(localStorage.getItem('habits')).toBe('[{"id":1,"name":"Walk"}]')
    expect(localStorage.getItem('todos-daily')).toBe('{"2026-10-17":[]}')
    expect(localStorage.getItem('brainDumpNotes')).toBe('[{"id":"health","title":"Health notes"}]')
    expect(localStorage.getItem('dashboard-unlocked')).toBe('true')
  })

  it('survives view unmount/remount but resets with a fresh application mount', async () => {
    const select = container.querySelector('[aria-label="Mock job type"]')
    expect(select.value).toBe('')
    changeValue(select, 'backend')
    click(container.querySelector('[aria-label="Open To-Do"]'))
    await act(async () => {})
    expect(container.textContent).toContain('To-Do selection: backend')

    click(container.querySelector('[aria-label="Open Overview"]'))
    await act(async () => {})
    expect(container.querySelector('[aria-label="Mock job type"]').value).toBe('backend')

    act(() => root.unmount())
    root = createRoot(container)
    await act(async () => root.render(<App />))
    expect(container.querySelector('[aria-label="Mock job type"]').value).toBe('')
  })

  it('loads To-Do through navigation and hands focus to the main landmark', async () => {
    click(container.querySelector('[aria-label="Open To-Do navigation"]'))
    await act(async () => {})
    expect(container.textContent).toContain('To-Do selection:')
    await act(async () => new Promise(resolve => requestAnimationFrame(resolve)))
    expect(document.activeElement).toBe(container.querySelector('#main-content'))
  })
  it('lazy-loads Projects through navigation and focuses the main content', async () => {
    click(container.querySelector('[aria-label="Open Projects navigation"]'))
    await act(async () => {})
    expect(container.textContent).toContain('Project notebook workspace')
    await act(async () => new Promise(resolve => requestAnimationFrame(resolve)))
    expect(document.activeElement).toBe(container.querySelector('#main-content'))
  })

  function clockButton(label) {
    return [...container.querySelectorAll('section button')].find(button => (button.getAttribute('aria-label') ?? button.textContent.trim()) === label)
  }

  function clockReadout() {
    return container.querySelector('[role="timer"]').textContent
  }

  it('pauses a custom countdown and announces completion once from another view', async () => {
    vi.useFakeTimers()
    expect(clockButton('Set custom duration')).toBeUndefined()
    click(clockButton('Set timer duration, 30:00'))
    click(clockButton('Set custom duration'))
    changeValue(container.querySelector('[name="minutes"]'), '0')
    changeValue(container.querySelector('[name="seconds"]'), '3')
    act(() => container.querySelector('form').requestSubmit())
    expect(clockReadout()).toBe('00:03')
    expect(clockButton('Set timer duration, 00:03').getAttribute('aria-expanded')).toBe('false')

    click(clockButton('Start'))
    act(() => vi.advanceTimersByTime(1000))
    click(clockButton('Pause'))
    act(() => vi.advanceTimersByTime(4000))
    expect(clockReadout()).toBe('00:02')
    expect(container.textContent).not.toContain('Timer complete')

    click(clockButton('Resume'))
    click(container.querySelector('[aria-label="Open To-Do"]'))
    await act(async () => {})
    expect(container.querySelector('[role="timer"]')).toBeNull()
    act(() => vi.advanceTimersByTime(2000))
    expect(container.textContent.match(/Timer complete/g)).toHaveLength(1)

    click(container.querySelector('[aria-label="Open Overview"]'))
    await act(async () => {})
    expect(clockReadout()).toBe('00:00')
    expect(clockButton('Restart')).toBeDefined()
    expect(container.textContent.match(/Timer complete/g)).toHaveLength(1)
  })

  it('preserves a running stopwatch through mode changes and a fresh application mount', async () => {
    vi.useFakeTimers()
    click(clockButton('Stopwatch'))
    click(clockButton('Start'))
    act(() => vi.advanceTimersByTime(2200))
    expect(clockReadout()).toBe('00:02')

    click(clockButton('Timer'))
    click(clockButton('Set timer duration, 30:00'))
    click(clockButton('1 hour'))
    expect(clockReadout()).toBe('01:00:00')
    act(() => root.unmount())
    act(() => vi.advanceTimersByTime(3000))
    root = createRoot(container)
    await act(async () => root.render(<App />))
    expect(clockReadout()).toBe('01:00:00')

    click(clockButton('Stopwatch'))
    expect(clockReadout()).toBe('00:05')
    click(clockButton('Pause'))
    act(() => vi.advanceTimersByTime(2000))
    expect(clockReadout()).toBe('00:05')
    click(clockButton('Reset'))
    expect(clockReadout()).toBe('00:00')
  })

  it('shows an expired timer notice when the browser tab becomes visible', () => {
    vi.useFakeTimers()
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    click(clockButton('Start'))

    hidden.mockReturnValue(true)
    act(() => vi.advanceTimersByTime(30 * 60_000 + 9000))
    expect(container.textContent).not.toContain('Timer complete')

    hidden.mockReturnValue(false)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(container.textContent.match(/Timer complete/g)).toHaveLength(1)
  })
})
