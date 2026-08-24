// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

vi.mock('./components/AppShell', () => ({
  default: ({ children, onNavigate }) => (
    <div>
      <button type="button" aria-label="Open Wellness navigation" onClick={() => onNavigate('wellness')}>Wellness</button>
      <main id="main-content" tabIndex="-1">{children}</main>
    </div>
  ),
}))
vi.mock('./theme/ThemeProvider', () => ({ ThemeProvider: ({ children }) => children }))
vi.mock('./components/ui', () => ({
  LoadingState: () => <span>Loading</span>,
  ToastProvider: ({ children }) => children,
}))
vi.mock('./components/Overview', () => ({
  default: ({ onChange, selectedJobType, onSelectedJobTypeChange }) => (
    <div>
      <select aria-label="Mock job type" value={selectedJobType} onChange={event => onSelectedJobTypeChange(event.target.value)}>
        <option value="">Choose job type</option>
        <option value="backend">Backend</option>
      </select>
      <button type="button" aria-label="Open To-Do" onClick={() => onChange('todo')}>Open To-Do</button>
    </div>
  ),
}))
vi.mock('./components/TodoCard', () => ({
  default: ({ onChange, selectedJobType }) => (
    <div>
      <span>To-Do selection: {selectedJobType}</span>
      <button type="button" aria-label="Open Overview" onClick={() => onChange('overview')}>Open Overview</button>
    </div>
  ),
}))
vi.mock('./components/Wellness', () => ({
  default: () => <div>Wellness tracker loaded</div>,
}))

import App from './App'

function changeSelect(select, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
  act(() => {
    setter.call(select, value)
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

describe('application-scoped Overview job type', () => {
  let container
  let root

  beforeEach(async () => {
    localStorage.setItem('dashboard-unlocked', 'true')
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => root.render(<App />))
  })

  afterEach(() => {
    if (root) act(() => root.unmount())
    container.remove()
    localStorage.clear()
  })

  it('survives view unmount/remount but resets with a fresh application mount', async () => {
    const select = container.querySelector('[aria-label="Mock job type"]')
    expect(select.value).toBe('')
    changeSelect(select, 'backend')
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

  it('loads Wellness through navigation and hands focus to the main landmark', async () => {
    click(container.querySelector('[aria-label="Open Wellness navigation"]'))
    await act(async () => {})
    expect(container.textContent).toContain('Wellness tracker loaded')
    await act(async () => new Promise(resolve => requestAnimationFrame(resolve)))
    expect(document.activeElement).toBe(container.querySelector('#main-content'))
  })
})
