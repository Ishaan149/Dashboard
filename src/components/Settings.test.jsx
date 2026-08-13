// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings, { SHORTCUTS } from './Settings'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('Settings shortcut cheat sheet', () => {
  let container
  let root
  let onLock

  beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    onLock = vi.fn()
    act(() => root.render(<Settings onLock={onLock} />))
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('lists every active dashboard shortcut', () => {
    expect(SHORTCUTS.map(shortcut => shortcut.key)).toEqual(['K', 'H', 'T', 'N', 'J'])
    expect(container.textContent).toContain('Command palette')
    expect(container.textContent).toContain('Home')
    expect(container.textContent).toContain('To-Do')
    expect(container.textContent).toContain('Brain Dump')
    expect(container.textContent).toContain('Job Applications')
  })

  it('renders each shortcut as an accessible key combination', () => {
    expect(container.querySelectorAll('kbd')).toHaveLength(SHORTCUTS.length * 2)
    expect(container.querySelectorAll('[aria-label$="plus K"], [aria-label$="plus H"], [aria-label$="plus T"], [aria-label$="plus N"], [aria-label$="plus J"]')).toHaveLength(5)
  })

  it('locks the dashboard from Settings', () => {
    const button = [...container.querySelectorAll('button')].find(element => element.textContent.includes('Lock Dashboard'))
    act(() => button.click())

    expect(onLock).toHaveBeenCalledTimes(1)
  })
})
