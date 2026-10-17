// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import styles from './TodoCard.module.css'
import { getMonday, toLocalDateKey } from '../utils/date'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const store = vi.hoisted(() => ({ values: {} }))
vi.mock('../hooks/useSyncedStorage', () => ({
  useSyncedStorage(key, initial) {
    const [value, setValue] = useState(() => store.values[key] ?? initial)
    return [value, next => setValue(previous => {
      const resolved = typeof next === 'function' ? next(previous) : next
      store.values[key] = resolved
      return resolved
    })]
  },
}))
import TodoCard from './TodoCard'

const task = (id, text) => ({ id, text, done: false })
const folder = (id, name, items = []) => ({ id, name, items, isFolder: true, collapsed: false })
let container; let root
const row = text => container.querySelector(`button[aria-label="Mark ${text} complete"]`).closest('li')
const folderRow = name => container.querySelector(`[aria-label="Collapse ${name}"]`).parentElement
const transfer = () => ({ effectAllowed: '', dropEffect: '', setData: vi.fn() })
function drag(element, type, dataTransfer, extra = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, { dataTransfer, clientY: 0, relatedTarget: null, ...extra })
  act(() => element.dispatchEvent(event))
  return event
}
function bounds(element) {
  element.getBoundingClientRect = () => ({ top: 0, bottom: 30, height: 30 })
}
function render() { act(() => root.render(<TodoCard />)) }

beforeEach(() => {
  store.values = {
    'todos-thisweek': [task(1, 'Alpha'), task(2, 'Beta')],
    'todos-longterm': [folder(10, 'Projects'), folder(11, 'Later')],
    'todos-recurring': ['One', 'Two'].map(id => ({ id, text: id, archivedDate: null, createdDate: '2020-01-01', scheduleRevisions: [{ effectiveFrom: '2020-01-01', weekdays: [1] }] })),
  }
  container = document.createElement('div'); document.body.append(container)
  root = createRoot(container); render()
})
afterEach(() => { act(() => root.unmount()); container.remove() })

describe('To-do drag feedback and placement', () => {
  it('clears a row insertion marker when the pointer leaves the row', () => {
    const data = transfer(); const target = row('Beta')
    drag(row('Alpha'), 'dragstart', data)
    drag(target, 'dragover', data)
    expect(target.className).toContain(styles.taskDragOver)
    drag(target, 'dragleave', data)
    expect(target.className).not.toContain(styles.taskDragOver)
  })

  it('clears list highlighting and the empty hint after cancellation', () => {
    const data = transfer(); const source = row('Alpha')
    const zone = folderRow('Projects').nextElementSibling
    drag(source, 'dragstart', data); drag(zone, 'dragover', data)
    expect(zone.className).toContain(styles.dropZoneActive)
    drag(source, 'dragend', data)
    expect(zone.className).not.toContain(styles.dropZoneActive)
    expect(zone.textContent).not.toContain('Drop task here')
  })

  it('highlights only the inner folder when hovering its empty contents', () => {
    const data = transfer(); const zone = folderRow('Projects').nextElementSibling
    drag(row('Alpha'), 'dragstart', data); drag(zone, 'dragover', data)
    expect(container.querySelectorAll(`.${styles.dropZoneActive}`)).toHaveLength(1)
    drag(zone, 'drop', data)
    expect(store.values['todos-longterm'][0].items.map(item => item.text)).toEqual(['Alpha'])
    expect(store.values['todos-thisweek'].map(item => item.text)).toEqual(['Beta'])
  })

  it('does not advertise a folder drop onto a day or task', () => {
    const data = transfer(); drag(folderRow('Projects'), 'dragstart', data)
    const dayZone = container.querySelector('section').children[1]
    expect(drag(dayZone, 'dragover', data).defaultPrevented).toBe(false)
    expect(dayZone.className).not.toContain(styles.dropZoneActive)
    const target = row('Beta')
    expect(drag(target, 'dragover', data).defaultPrevented).toBe(false)
    expect(target.className).not.toContain(styles.taskDragOver)
  })

  it('does not highlight task targets for recurring-series or external drags', () => {
    const target = row('Beta'); const data = transfer()
    expect(drag(target, 'dragover', data).defaultPrevented).toBe(false)
    const series = container.querySelector('[aria-label="Reorder One; use arrow keys"]').closest('li')
    drag(series, 'dragstart', data)
    expect(drag(target, 'dragover', data).defaultPrevented).toBe(false)
    expect(target.className).not.toContain(styles.taskDragOver)
  })

  it('places a task after the row when dropped on its lower half', () => {
    const data = transfer(); const target = row('Beta'); bounds(target)
    drag(row('Alpha'), 'dragstart', data)
    drag(target, 'dragover', data, { clientY: 25 })
    expect(target.className).toContain(styles.taskDragAfter)
    drag(target, 'drop', data, { clientY: 25 })
    expect(store.values['todos-thisweek'].map(item => item.text)).toEqual(['Beta', 'Alpha'])
  })

  it('reorders the last recurring series using its lower-half drop target', () => {
    const data = transfer()
    const source = container.querySelector('[aria-label="Reorder One; use arrow keys"]').closest('li')
    const target = container.querySelector('[aria-label="Reorder Two; use arrow keys"]').closest('li'); bounds(target)
    drag(source, 'dragstart', data)
    drag(target, 'drop', data, { clientY: 25 })
    expect(store.values['todos-recurring'].map(item => item.id)).toEqual(['Two', 'One'])
  })

  it('keeps a row highlighted when crossing its own child controls', () => {
    const data = transfer(); const target = row('Beta')
    drag(row('Alpha'), 'dragstart', data); drag(target, 'dragover', data)
    drag(target, 'dragleave', data, { relatedTarget: target.querySelector('button') })
    expect(target.className).toContain(styles.taskDragOver)
  })

  it('places a task above the upper half and clears every drop indicator on success', () => {
    const data = transfer(); const target = row('Alpha'); bounds(target)
    drag(row('Beta'), 'dragstart', data); drag(target, 'dragover', data, { clientY: 5 })
    expect(target.className).not.toContain(styles.taskDragAfter)
    drag(target, 'drop', data, { clientY: 5 })
    expect(store.values['todos-thisweek'].map(item => item.text)).toEqual(['Beta', 'Alpha'])
    expect(container.querySelectorAll(`.${styles.taskDragOver}, .${styles.dropZoneActive}`)).toHaveLength(0)
  })

  it('moves a task through a folder, another folder, a day, and back without duplicates', () => {
    const data = transfer()
    drag(row('Alpha'), 'dragstart', data); drag(folderRow('Projects'), 'drop', data)
    expect(store.values['todos-longterm'][0].items.map(item => item.id)).toEqual([1])
    drag(row('Alpha'), 'dragstart', data); drag(folderRow('Later').nextElementSibling, 'drop', data)
    expect(store.values['todos-longterm'][0].items).toEqual([])
    expect(store.values['todos-longterm'][1].items.map(item => item.id)).toEqual([1])
    const dayZone = container.querySelector('section').children[1]
    drag(row('Alpha'), 'dragstart', data); drag(dayZone, 'drop', data)
    expect(store.values['todos-longterm'][1].items).toEqual([])
    expect(store.values['todos-daily'][toLocalDateKey(getMonday())].map(item => item.id)).toEqual([1])
    drag(row('Alpha'), 'dragstart', data); drag(row('Beta'), 'drop', data)
    expect(store.values['todos-daily'][toLocalDateKey(getMonday())]).toEqual([])
    expect(store.values['todos-thisweek'].map(item => item.id)).toEqual([1, 2])
  })

  it('reorders folders below the last folder without moving their children', () => {
    const data = transfer(); const target = folderRow('Later'); bounds(target)
    drag(folderRow('Projects'), 'dragstart', data)
    drag(target, 'dragover', data, { clientY: 25 })
    expect(target.className).toContain(styles.taskDragAfter)
    drag(target, 'drop', data, { clientY: 25 })
    expect(store.values['todos-longterm'].map(item => item.name)).toEqual(['Later', 'Projects'])
  })

})
