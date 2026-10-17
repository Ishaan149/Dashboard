// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PrimaryNav from './PrimaryNav'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('PrimaryNav', () => {
  let container
  let root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('keeps Habits available in desktop and mobile navigation without Wellness', () => {
    const onNavigate = vi.fn()
    act(() => root.render(<PrimaryNav activeView="overview" onNavigate={onNavigate} />))

    expect(container.querySelector('[aria-label="Wellness"]')).toBeNull()
    const habitButtons = [...container.querySelectorAll('button[aria-label="Habits"]')]
    expect(habitButtons).toHaveLength(2)
    act(() => habitButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onNavigate).toHaveBeenCalledWith('habits')
  })
})
