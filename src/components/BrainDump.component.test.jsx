// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const storage = vi.hoisted(() => ({
  setNotes: vi.fn(),
  setActiveId: vi.fn(),
  setPinnedNote: vi.fn(),
}))

vi.mock('../hooks/useSyncedStorage', () => ({
  useSyncedStorage(key) {
    if (key === 'brainDumpNotes') return [[
      { id: 'alpha', title: 'Alpha', content: '# Heading', favorite: true, quickNote: true },
      { id: 'beta', title: 'Beta', content: 'Body' },
    ], storage.setNotes]
    if (key === 'brainDumpActiveId') return ['alpha', storage.setActiveId]
    if (key === 'brainDumpPinnedNote') return [{ title: 'Pinned', content: 'Inbox' }, storage.setPinnedNote]
    throw new Error(`Unexpected storage key: ${key}`)
  },
}))

import BrainDump from './BrainDump'
import { ToastProvider } from './ui'

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

describe('Brain Dump read-only interactions', () => {
  let container
  let root

  beforeEach(() => {
    storage.setNotes.mockReset()
    storage.setActiveId.mockReset()
    storage.setPinnedNote.mockReset()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    act(() => root.render(<ToastProvider><BrainDump /></ToastProvider>))
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('does not write when searching, filtering, previewing, or opening the mobile sheet', () => {
    const search = container.querySelector('input[type="search"]')
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    act(() => {
      valueSetter.call(search, 'head')
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })

    click([...container.querySelectorAll('button')].find(button => button.textContent.trim() === 'Favorites'))
    click([...container.querySelectorAll('button')].find(button => button.textContent.trim() === 'Quick Notes'))
    click([...container.querySelectorAll('button')].find(button => button.textContent.trim() === 'Preview'))
    click([...container.querySelectorAll('button')].find(button => button.textContent.trim() === 'Notes'))

    expect(storage.setNotes).not.toHaveBeenCalled()
    expect(storage.setActiveId).not.toHaveBeenCalled()
    expect(storage.setPinnedNote).not.toHaveBeenCalled()
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
  })
})
