// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const storage = vi.hoisted(() => ({ value: { projects: [], categories: [] }, writes: [] }))
vi.mock('../hooks/useSyncedStorage', () => ({
  useSyncedStorage(key, initial) {
    if (key !== 'projects') throw new Error(`Unexpected storage key: ${key}`)
    const [value, setValue] = useState(() => storage.value ?? initial)
    return [value, next => setValue(previous => {
      const resolved = typeof next === 'function' ? next(previous) : next
      storage.value = resolved
      storage.writes.push({ key, value: resolved })
      return resolved
    })]
  },
}))
import Projects from './Projects'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let container, root
function control(name, scope = document.body) {
  const found = [...scope.querySelectorAll('button, input[type="checkbox"]')].find(node => (node.getAttribute('aria-label') ?? node.textContent.trim()) === name)
  expect(found, `control: ${name}`).toBeTruthy()
  return found
}
function click(name, scope) { act(() => control(name, scope).click()) }
function field(name) { return document.querySelector(`[aria-label="${name}"]`) }
function change(name, value) {
  const node = field(name)
  expect(node, `field: ${name}`).toBeTruthy()
  const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  act(() => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value)
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
  })
}
function submit(name) { act(() => control(name).closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
function openCategories() { click('Project options'); click('Manage categories') }
function mount() { root = createRoot(container); act(() => root.render(<Projects />)) }
function remount() { act(() => root.unmount()); mount() }
function project(overrides = {}) { return { id: 'a', name: 'Alpha', description: 'A project', categoryId: null, completed: false, notes: [], tasks: [], ...overrides } }

beforeEach(() => {
  storage.value = { projects: [], categories: [] }
  storage.writes = []
  container = document.createElement('div'); document.body.append(container)
})
afterEach(() => { if (root) act(() => root.unmount()); root = null; container.remove(); vi.restoreAllMocks() })

describe('Projects workspace', () => {
  it('requires a name, creates and edits a project, and keeps cards limited to name and category', () => {
    mount()
    expect(container.textContent).toContain('No active projects')
    click('New project')
    expect(control('Create project').disabled).toBe(true)
    change('Project name', '   ')
    expect(control('Create project').disabled).toBe(true)
    change('Project name', '  Thesis  ')
    change('Project description', 'Research context')
    submit('Create project')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(container.textContent).not.toContain('Research context')
    click('Open Thesis')
    expect(container.textContent).toContain('Research context')
    click('Edit project'); change('Project name', 'Final thesis'); submit('Save project')
    click('Back to projects'); click('Open Final thesis')
    expect(storage.value.projects[0].name).toBe('Final thesis')
    expect(storage.writes.every(write => write.key === 'projects')).toBe(true)
  })
  it('persists manual ordering within each status, and completes or reopens without changing content', () => {
    const notes = [{ id: 'n', title: 'Reference', content: 'Keep me', createdAt: 1, updatedAt: 2 }]
    const tasks = [{ id: 't', text: 'Unfinished', completed: false }]
    storage.value = { projects: [project({ notes, tasks }), project({ id: 'done', name: 'Archived', completed: true }), project({ id: 'b', name: 'Beta' }), project({ id: 'c', name: 'Gamma' })], categories: [] }
    mount()
    act(() => control('Open Gamma').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true })))
    expect(storage.value.projects.map(item => item.name)).toEqual(['Alpha', 'Archived', 'Gamma', 'Beta'])
    remount()
    expect([...container.querySelectorAll('[aria-label^="Open "]')].map(item => item.textContent.trim())).toEqual(['AlphaUncategorized', 'GammaUncategorized', 'BetaUncategorized'])
    click('Open Alpha'); click('Complete project')
    expect(storage.value.projects[0]).toMatchObject({ completed: true, notes, tasks })
    click('Back to projects')
    expect(control('Completed').getAttribute('aria-pressed')).toBe('true')
    expect(control('Open Archived')).toBeTruthy()
    click('Open Alpha'); click('Reopen project'); click('Back to projects')
    expect(control('Active').getAttribute('aria-pressed')).toBe('true')
    expect(storage.value.projects[0]).toMatchObject({ completed: false, notes, tasks })
  })

  it('creates and reuses categories, renames all assignments, and deletes only the category', () => {
    mount()
    click('New project'); change('Project name', 'One'); change('Project category', '__new__'); change('New category name', 'University'); submit('Create project')
    click('New project'); change('Project name', 'Two'); change('Project category', storage.value.categories[0].id); submit('Create project')
    expect(storage.value.categories).toHaveLength(1)
    openCategories()
    change('Rename University', 'Study'); submit('Save category University')
    click('Close dialog')
    expect([...container.querySelectorAll('article')].map(node => node.textContent)).toEqual([expect.stringContaining('Study'), expect.stringContaining('Study')])
    openCategories(); click('Delete category Study'); click('Close dialog')
    expect(storage.value.categories).toEqual([])
    expect(storage.value.projects.map(item => item.categoryId)).toEqual([null, null])
    expect(storage.value.projects.map(item => item.name)).toEqual(['One', 'Two'])
    openCategories(); change('Category name', 'Personal'); submit('Add category'); click('Close dialog')
    expect(storage.value.categories[0].name).toBe('Personal')
  })

  it('autosaves multiple documents, keeps selection while edited notes reorder, and does not write when reading', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100)
    storage.value = { projects: [project(), project({ id: 'b', name: 'Beta' })], categories: [] }
    mount(); click('Open Alpha')
    expect(container.textContent).toContain('No notes yet')
    click('New note'); change('Note title', 'Plan'); change('Note content', '# The plan\n\n- First step')
    const firstId = storage.value.projects[0].notes[0].id
    vi.mocked(Date.now).mockReturnValue(200)
    click('New note'); change('Note title', 'Reference'); change('Note content', 'A reference')
    const beforeReading = structuredClone(storage.value)
    storage.writes = []
    click('Select note Plan'); click('Preview')
    expect(container.querySelector('h1').textContent).toBe('The plan')
    expect(storage.writes).toEqual([])
    expect(storage.value).toEqual(beforeReading)
    click('Edit')
    expect(field('Note content').value).toBe('# The plan\n\n- First step')
    vi.mocked(Date.now).mockReturnValue(300)
    change('Note title', 'New plan')
    expect(field('Note content').value).toBe('# The plan\n\n- First step')
    expect([...container.querySelectorAll('[aria-label^="Select note "]')].map(item => item.textContent)).toEqual(['New plan', 'Reference'])
    expect(storage.value.projects[0].notes.find(note => note.id === firstId)).toMatchObject({ title: 'New plan', updatedAt: 300, createdAt: 100 })
    expect(storage.value.projects[1]).toEqual(project({ id: 'b', name: 'Beta' }))
    click('Back to projects'); remount(); click('Open Alpha')
    expect(field('Note title').value).toBe('New plan')
    expect(storage.value.projects.map(item => item.id)).toEqual(['a', 'b'])
  })

  it('confirms note and project deletion, canceling safely and preserving other projects', () => {
    storage.value = { projects: [project({ notes: [{ id: 'n', title: 'Only note', content: 'Keep', createdAt: 1, updatedAt: 1 }] }), project({ id: 'b', name: 'Beta' })], categories: [] }
    mount(); click('Open Alpha')
    const before = structuredClone(storage.value)
    click('Delete note'); click('Cancel')
    expect(storage.value).toEqual(before)
    click('Delete note'); click('Delete note', document.querySelector('[role="dialog"]'))
    expect(storage.value.projects[0].notes).toEqual([])
    expect(container.textContent).toContain('No notes yet')
    click('Delete project')
    expect(document.querySelector('[role="dialog"]').textContent).toContain('all its notes and tasks')
    click('Cancel')
    expect(storage.value.projects).toHaveLength(2)
    click('Delete project'); click('Delete project', document.querySelector('[role="dialog"]'))
    expect(storage.value.projects).toEqual([before.projects[1]])
    expect(control('Open Beta')).toBeTruthy()
  })

  it('keeps a manually ordered checklist separate from notes, other projects, and project completion', () => {
    storage.value = { projects: [project(), project({ id: 'b', name: 'Beta' })], categories: [] }
    mount(); click('Open Alpha')
    expect(container.textContent).toContain('No tasks yet')
    for (const text of ['First', 'Second', 'Third']) { change('New task', text); submit('Add task') }
    click('Move task Third up')
    expect(storage.value.projects[0].tasks.map(task => task.text)).toEqual(['First', 'Third', 'Second'])
    click('Complete task First')
    click('Move task Third down')
    expect([...container.querySelector('[aria-label="Incomplete tasks"]').querySelectorAll('[aria-label^="Rename task "]')].map(node => node.textContent)).toEqual(['Second', 'Third'])
    click('Complete task Third'); click('Move task Third up')
    expect([...container.querySelector('[aria-label="Completed tasks"]').querySelectorAll('[aria-label^="Rename task "]')].map(node => node.textContent)).toEqual(['Third', 'First'])
    click('Rename task Second'); change('Task text', 'Revised'); submit('Save task')
    click('Complete task Revised')
    expect(storage.value.projects[0].completed).toBe(false)
    click('Reopen task First'); click('Delete task Revised')
    expect(storage.value.projects[0].tasks.map(task => task.text)).toEqual(['Third', 'First'])
    expect(storage.value.projects[0].notes).toEqual([])
    expect(storage.value.projects[1].tasks).toEqual([])
    click('Complete project')
    change('New task', 'After completion'); submit('Add task')
    click('New note'); change('Note title', 'Still editable')
    expect(storage.value.projects[0]).toMatchObject({ completed: true, notes: [expect.objectContaining({ title: 'Still editable' })], tasks: expect.arrayContaining([expect.objectContaining({ text: 'After completion' })]) })
    expect(storage.writes.every(write => write.key === 'projects')).toBe(true)
  })

  it('renders safe Markdown checklists through Preview without changing project tasks', () => {
    storage.value = { projects: [project({ notes: [{ id: 'n', title: 'Checklist', content: '# Plan\n\n- [x] Draft\n- [ ] Review\n\n[Reference](https://example.com)\n\n<script>boom()</script>', createdAt: 1, updatedAt: 1 }] })], categories: [] }
    mount(); click('Open Alpha'); click('Preview')
    const preview = container.querySelector('[aria-label="Note preview"]')
    expect([...preview.querySelectorAll('input')].map(input => [input.type, input.disabled, input.checked])).toEqual([['checkbox', true, true], ['checkbox', true, false]])
    expect(preview.querySelector('a').href).toBe('https://example.com/')
    expect(preview.querySelector('script')).toBeNull()
    expect(storage.value.projects[0].tasks).toEqual([])
    expect(storage.writes).toEqual([])
  })

  it('allows dragging within a status view and keeps equal-time notes in deterministic order', () => {
    storage.value = { projects: [project({ notes: [{ id: 'z', title: 'Zed', content: 'Z', createdAt: 1, updatedAt: 1 }, { id: 'a', title: 'Aye', content: 'A', createdAt: 1, updatedAt: 1 }] }), project({ id: 'done', name: 'Archived', completed: true }), project({ id: 'b', name: 'Beta' })], categories: [] }
    mount()
    const source = control('Open Alpha')
    const event = new Event('dragstart', { bubbles: true })
    Object.defineProperty(event, 'dataTransfer', { value: { setData: vi.fn() } })
    act(() => source.dispatchEvent(event))
    act(() => control('Open Beta').closest('article').dispatchEvent(new Event('drop', { bubbles: true, cancelable: true })))
    expect(storage.value.projects.map(item => item.id)).toEqual(['b', 'done', 'a'])
    click('Open Alpha')
    expect([...container.querySelectorAll('[aria-label^="Select note "]')].map(node => node.textContent)).toEqual(['Aye', 'Zed'])
    remount(); click('Open Alpha')
    expect(field('Note title').value).toBe('Aye')
  })

  it('keeps keyboard focus on a task when it moves between completion groups', async () => {
    storage.value = { projects: [project({ tasks: [{ id: 't', text: 'Review', completed: false }] })], categories: [] }
    mount(); click('Open Alpha')
    control('Complete task Review').focus()
    click('Complete task Review')
    await act(async () => new Promise(resolve => requestAnimationFrame(resolve)))
    expect(document.activeElement).toBe(control('Reopen task Review'))
  })

  it('preserves category editing focus after a rename is saved', async () => {
    storage.value = { projects: [], categories: [{ id: 'uni', name: 'University' }] }
    mount(); openCategories()
    await act(async () => new Promise(resolve => requestAnimationFrame(resolve)))
    field('Rename University').focus()
    change('Rename University', 'Study'); submit('Save category University')
    expect(document.activeElement).toBe(field('Rename Study'))
    expect(storage.value.categories).toEqual([{ id: 'uni', name: 'Study' }])
  })

})
