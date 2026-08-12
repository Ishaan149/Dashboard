// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const storage = vi.hoisted(() => ({
  setNotes: vi.fn(),
  setActiveId: vi.fn(),
}))

vi.mock('../hooks/useSyncedStorage', () => ({
  useSyncedStorage(key) {
    if (key === 'brainDumpNotes') return [[{ id: 'existing', title: 'Existing', content: '' }], storage.setNotes]
    if (key === 'brainDumpActiveId') return [null, storage.setActiveId]
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

describe('Command Palette Quick Note', () => {
  let container
  let root
  let onNavigate
  let randomUUID

  beforeEach(() => {
    storage.setNotes.mockReset()
    storage.setActiveId.mockReset()
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

  it('opens globally and captures an isolated regular Brain Dump Quick Note', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()

    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'New Quick Note'))
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

  it('keeps an empty capture open and announces validation', () => {
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })))
    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'New Quick Note'))
    click([...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Save Quick Note'))

    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('Enter some note content')
    expect(storage.setNotes).not.toHaveBeenCalled()
  })
})
