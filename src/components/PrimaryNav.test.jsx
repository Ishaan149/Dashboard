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

  it('exposes Wellness as a labelled primary navigation destination', () => {
    const onNavigate = vi.fn()
    act(() => root.render(<PrimaryNav activeView="overview" onNavigate={onNavigate} />))

    const wellnessButtons = [...container.querySelectorAll('button[aria-label="Wellness"]')]
    expect(wellnessButtons).toHaveLength(2)
    act(() => wellnessButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onNavigate).toHaveBeenCalledWith('wellness')
  })
})
