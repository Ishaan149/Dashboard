// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings, { SHORTCUTS } from './Settings'
import { ThemeProvider } from '../theme/ThemeProvider'
import { THEME_STORAGE_KEY } from '../theme/theme'

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
    localStorage.clear()
    act(() => root.render(<ThemeProvider><Settings onLock={onLock} /></ThemeProvider>))
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

  it('renders five ordered presets and exactly three native color inputs', () => {
    const cards = [...container.querySelectorAll('[aria-pressed]')]
    expect(cards.map(card => card.textContent.replace('Selected', '').trim())).toEqual(['Forest✓', 'Slate✓', 'Plum✓', 'Mocha✓', 'Graphite✓'])
    expect(container.querySelectorAll('input[type="color"]')).toHaveLength(3)
    expect([...container.querySelectorAll('input[type="color"]')].map(input => input.getAttribute('aria-label'))).toEqual([
      'Choose accent color',
      'Choose background color',
      'Choose foreground color',
    ])
  })

  it('exposes selected state with aria-pressed and visible checkmark treatment', () => {
    const cards = [...container.querySelectorAll('[aria-pressed]')]
    expect(cards[0].getAttribute('aria-pressed')).toBe('true')
    expect(cards[0].textContent).toContain('Selected')
    expect(cards.slice(1).every(card => card.getAttribute('aria-pressed') === 'false')).toBe(true)
  })

  it('selects a preset and persists one complete canonical record', () => {
    const slate = [...container.querySelectorAll('[aria-pressed]')][1]
    act(() => slate.click())

    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY))).toEqual({
      version: 1,
      presetId: 'slate',
      colors: { accent: '#8296B0', background: '#12151A', foreground: '#E7E9ED' },
    })
    expect(slate.getAttribute('aria-pressed')).toBe('true')
  })

  it.each([
    ['accent', '#112233'],
    ['background', '#223344'],
    ['foreground', '#DDEEFF'],
  ])('editing %s changes only that value and persists it', (name, value) => {
    const input = container.querySelector(`[aria-label="Choose ${name} color"]`)
    const before = [...container.querySelectorAll('input[type="color"]')].map(element => element.value)

    act(() => {
      input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const after = [...container.querySelectorAll('input[type="color"]')].map(element => element.value)
    expect(after.filter((color, index) => color !== before[index])).toEqual([value.toLowerCase()])
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)).colors[name]).toBe(value)
  })

  it('restores edits after remount, then discards all edits when switching away', () => {
    const accent = container.querySelector('[aria-label="Choose accent color"]')
    act(() => {
      accent.value = '#112233'
      accent.dispatchEvent(new Event('input', { bubbles: true }))
    })

    act(() => root.unmount())
    root = createRoot(container)
    act(() => root.render(<ThemeProvider><Settings onLock={onLock} /></ThemeProvider>))
    expect(container.querySelector('[aria-label="Choose accent color"]').value).toBe('#112233')

    const cards = [...container.querySelectorAll('[aria-pressed]')]
    act(() => cards[1].click())
    act(() => cards[0].click())
    expect(container.querySelector('[aria-label="Choose accent color"]').value).toBe('#73b592')
  })

  it('treats selecting the active preset as a no-op and keeps temporary edits', () => {
    const accent = container.querySelector('[aria-label="Choose accent color"]')
    act(() => {
      accent.value = '#112233'
      accent.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    act(() => container.querySelector('[aria-pressed="true"]').click())

    expect(container.querySelector('[aria-label="Choose accent color"]').value).toBe('#112233')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(stored)
  })

  it('keeps the live preview working when storage writes fail', () => {
    act(() => root.unmount())
    root = createRoot(container)
    const failingStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('Storage unavailable') },
    }
    act(() => root.render(
      <ThemeProvider storage={failingStorage}><Settings onLock={onLock} /></ThemeProvider>
    ))

    const slate = [...container.querySelectorAll('[aria-pressed]')][1]
    act(() => slate.click())
    expect(slate.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('[aria-label="Choose accent color"]').value).toBe('#8296b0')
  })
})
