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
import { ThemeProvider } from '../theme/ThemeProvider'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let container, root
function control(name, scope = document.body) {
  const found = [...scope.querySelectorAll('button, input[type="checkbox"]')].find(node => (node.getAttribute('aria-label') ?? node.textContent.trim()) === name)
  expect(found, `control: ${name}`).toBeTruthy()
  return found
}
function click(name, scope) {
  if (!scope && ['Edit project', 'Complete project', 'Reopen project', 'Delete project'].includes(name) && !document.querySelector('#project-actions') && !document.querySelector('[role="dialog"]')) {
    act(() => control('Project actions').click())
  }
  act(() => control(name, scope).click())
}
function field(name, scope = document.body) { return scope.querySelector(`[aria-label="${name}"]`) }
function change(name, value, scope) {
  const node = field(name, scope)
  expect(node, `field: ${name}`).toBeTruthy()
  const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  act(() => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value)
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
  })
}
function submit(name) { act(() => control(name).closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
function dragTask(sourceName, targetName, position = 'before') {
  const source = control(`Rename task ${sourceName}`).closest('li')
  const target = control(`Rename task ${targetName}`).closest('li')
  const dataTransfer = { setData: vi.fn() }
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 100, height: 40 })
  for (const [node, type] of [[source, 'dragstart'], [target, 'dragover'], [target, 'drop'], [source, 'dragend']]) {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperties(event, { dataTransfer: { value: dataTransfer }, clientY: { value: position === 'after' ? 135 : 105 } })
    act(() => node.dispatchEvent(event))
  }
}
function openCategories() { click('Project options'); click('Manage categories') }
function mount() { root = createRoot(container); act(() => root.render(<ThemeProvider storage={{ getItem: () => null, setItem: () => {} }}><Projects /></ThemeProvider>)) }
function remount() { act(() => root.unmount()); mount() }
function project(overrides = {}) { return { id: 'a', name: 'Alpha', description: 'A project', categoryId: null, completed: false, notes: [], tasks: [], ...overrides } }

beforeEach(() => {
  storage.value = { projects: [], categories: [] }
  storage.writes = []
  container = document.createElement('div'); document.body.append(container)
})
afterEach(() => { if (root) act(() => root.unmount()); root = null; container.remove(); vi.restoreAllMocks() })

describe('Projects workspace', () => {
  it('edits and persists project icons, cancels unsaved choices, and keeps category colors', () => {
    const original = project({ categoryId: 'coding', notes: [{ id: 'n', title: 'Keep', content: 'Notes', createdAt: 1, updatedAt: 1 }], tasks: [{ id: 't', text: 'Keep task', completed: false }] })
    storage.value = { projects: [original, project({ id: 'b', name: 'Beta' })], categories: [{ id: 'coding', name: 'Coding', color: '#3B82F6' }] }
    mount()
    expect(control('Open Alpha').querySelector('svg').dataset.projectIcon).toBe('folder')
    click('Open Alpha'); click('Edit project')
    expect(control('Use Folder icon').getAttribute('aria-pressed')).toBe('true')
    click('Use Code icon')
    expect(control('Use Code icon').getAttribute('aria-pressed')).toBe('true')
    expect(control('Use Folder icon').getAttribute('aria-pressed')).toBe('false')
    click('Cancel')
    expect(storage.writes).toEqual([])
    click('Edit project'); click('Use Code icon'); submit('Save project')
    expect(storage.value.projects[0]).toEqual({ ...original, icon: 'code' })
    expect(storage.value.projects[1]).toEqual(project({ id: 'b', name: 'Beta' }))
    remount()
    expect(control('Open Alpha').querySelector('svg').dataset.projectIcon).toBe('code')
    expect(control('Open Alpha').closest('article').style.getPropertyValue('--project-color')).toBe('#3B82F6')
    click('Open Alpha'); click('Edit project')
    expect(control('Use Code icon').getAttribute('aria-pressed')).toBe('true')
    click('Cancel'); click('Complete project'); click('Back to projects')
    expect(control('Open Alpha').querySelector('svg').dataset.projectIcon).toBe('code')
  })

  it('chooses icons for new projects and falls back to Folder for unknown saved icons', () => {
    storage.value = { projects: [project({ icon: 'unknown' })], categories: [] }
    mount()
    expect(control('Open Alpha').querySelector('svg').dataset.projectIcon).toBe('folder')
    expect(storage.writes).toEqual([])
    click('New project'); change('Project name', 'Launch'); click('Use Rocket icon')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    submit('Create project')
    expect(storage.value.projects[1].icon).toBe('rocket')
    expect(control('Open Launch').querySelector('svg').dataset.projectIcon).toBe('rocket')
  })

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
  it('shows project actions in a dismissible dropdown and closes it after completing or reopening', async () => {
    storage.value = { projects: [project()], categories: [] }
    mount(); click('Open Alpha')
    expect(container.textContent).not.toContain('Active project')
    expect(container.textContent).not.toContain('Edit project')
    expect(control('Project actions').getAttribute('aria-expanded')).toBe('false')
    click('Project actions')
    await act(async () => new Promise(resolve => requestAnimationFrame(resolve)))
    expect(document.activeElement).toBe(control('Edit project'))
    expect(document.querySelector('#project-actions').textContent).toBe('Edit projectComplete projectDelete project')
    act(() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(document.querySelector('#project-actions')).toBeNull()
    expect(document.activeElement).toBe(control('Project actions'))
    click('Project actions')
    act(() => container.dispatchEvent(new Event('pointerdown', { bubbles: true })))
    expect(document.querySelector('#project-actions')).toBeNull()
    click('Complete project')
    expect(storage.value.projects[0].completed).toBe(true)
    expect(document.querySelector('#project-actions')).toBeNull()
    expect(document.activeElement).toBe(control('Project actions'))
    click('Reopen project')
    expect(storage.value.projects[0].completed).toBe(false)
    expect(document.querySelector('#project-actions')).toBeNull()
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
    click('Select note Plan'); click('Open note fullscreen')
    const dialog = document.querySelector('[role="dialog"]')
    click('Preview', dialog)
    expect(dialog.querySelector('h1').textContent).toBe('The plan')
    expect(storage.writes).toEqual([])
    expect(storage.value).toEqual(beforeReading)
    click('Edit', dialog)
    expect(field('Note content', dialog).value).toBe('# The plan\n\n- First step')
    vi.mocked(Date.now).mockReturnValue(300)
    change('Note title', 'New plan', dialog)
    expect(field('Note content', dialog).value).toBe('# The plan\n\n- First step')
    expect([...container.querySelectorAll('[aria-label^="Select note "]')].map(item => item.textContent)).toEqual(['New plan', 'Reference'])
    expect(storage.value.projects[0].notes.find(note => note.id === firstId)).toMatchObject({ title: 'New plan', updatedAt: 300, createdAt: 100 })
    expect(storage.value.projects[1]).toEqual(project({ id: 'b', name: 'Beta' }))
    change('Note content', '# Updated plan', dialog)
    click('Close dialog', dialog)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(field('Note title').value).toBe('New plan')
    expect(field('Note content').value).toBe('# Updated plan')
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
    dragTask('Third', 'Second')
    expect(storage.value.projects[0].tasks.map(task => task.text)).toEqual(['First', 'Third', 'Second'])
    click('Complete task First')
    dragTask('Third', 'Second', 'after')
    expect([...container.querySelector('[aria-label="Incomplete tasks"]').querySelectorAll('[aria-label^="Rename task "]')].map(node => node.textContent)).toEqual(['Second', 'Third'])
    click('Complete task Third'); dragTask('Third', 'First')
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

  it('reorders by dropping before or after a row, persists the order, and keeps completion groups separate', () => {
    storage.value = { projects: [project({ tasks: [
      { id: 'one', text: 'One', completed: false },
      { id: 'done', text: 'Done', completed: true },
      { id: 'two', text: 'Two', completed: false },
      { id: 'three', text: 'Three', completed: false },
    ] })], categories: [] }
    mount(); click('Open Alpha')
    expect(container.querySelector('[aria-label^="Move task "]')).toBeNull()
    dragTask('One', 'Two', 'before')
    expect(storage.value.projects[0].tasks.map(task => task.text)).toEqual(['One', 'Done', 'Two', 'Three'])
    dragTask('One', 'Two', 'after')
    expect(storage.value.projects[0].tasks.map(task => task.text)).toEqual(['Two', 'Done', 'One', 'Three'])
    dragTask('Three', 'Two', 'before')
    expect(storage.value.projects[0].tasks.map(task => task.text)).toEqual(['Three', 'Done', 'Two', 'One'])
    const before = structuredClone(storage.value)
    storage.writes = []
    dragTask('Three', 'Three'); dragTask('Three', 'Done')
    expect(storage.value).toEqual(before)
    expect(storage.writes).toEqual([])
    remount(); click('Open Alpha')
    expect([...container.querySelector('[aria-label="Incomplete tasks"]').querySelectorAll('[aria-label^="Rename task "]')].map(node => node.textContent)).toEqual(['Three', 'Two', 'One'])
    const keyboardTask = control('Rename task Two')
    keyboardTask.focus()
    act(() => keyboardTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true })))
    expect(storage.value.projects[0].tasks.map(task => task.text)).toEqual(['Two', 'Done', 'Three', 'One'])
    expect(document.activeElement).toBe(keyboardTask)
    click('Rename task Two')
    expect(field('Task text').closest('li').draggable).toBe(false)
  })

  it('renders safe Markdown checklists through Preview without changing project tasks', () => {
    storage.value = { projects: [project({ notes: [{ id: 'n', title: 'Checklist', content: '# Plan\n\n- [x] Draft\n- [ ] Review\n\n[Reference](https://example.com)\n\n<script>boom()</script>', createdAt: 1, updatedAt: 1 }] })], categories: [] }
    mount(); click('Open Alpha'); click('Open note fullscreen')
    const dialog = document.querySelector('[role="dialog"]')
    click('Preview', dialog)
    const preview = dialog.querySelector('[aria-label="Note preview"]')
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

  it('assigns a category color to every matching project icon and preserves it after remount', () => {
    storage.value = { projects: [project({ categoryId: 'coding' }), project({ id: 'b', name: 'Beta', categoryId: 'coding' }), project({ id: 'c', name: 'Completed example', categoryId: 'coding', completed: true }), project({ id: 'd', name: 'Uncategorized example' })], categories: [{ id: 'coding', name: 'Coding' }] }
    mount(); openCategories()
    const before = structuredClone(storage.value)
    change('Color for Coding', '#3b82f6'); click('Close dialog')
    expect(storage.value).toEqual(before)
    openCategories(); change('Color for Coding', '#3b82f6'); submit('Save category Coding'); click('Close dialog')
    expect(storage.value.categories[0]).toMatchObject({ id: 'coding', name: 'Coding', color: '#3B82F6' })
    expect(storage.value.projects).toEqual(before.projects)
    for (const name of ['Alpha', 'Beta']) expect(control(`Open ${name}`).closest('article').style.getPropertyValue('--project-color')).toBe('#3B82F6')
    expect(control('Open Uncategorized example').closest('article').style.getPropertyValue('--project-color')).toBe('')
    click('Completed')
    expect(control('Open Completed example').closest('article').style.getPropertyValue('--project-color')).toBe('#3B82F6')
    remount(); openCategories()
    expect(field('Color for Coding').value).toBe('#3b82f6')
    change('Rename Coding', 'Development'); submit('Save category Coding'); click('Close dialog')
    expect(storage.value.categories[0]).toMatchObject({ name: 'Development', color: '#3B82F6' })
    openCategories(); click('Delete category Development'); click('Close dialog')
    expect(control('Open Alpha').closest('article').style.getPropertyValue('--project-color')).toBe('')
  })

  it('lets new categories get colors in both creation flows and reuses an existing category color', () => {
    mount(); openCategories()
    change('Category name', 'Coding'); change('New category color', '#8b5cf6'); submit('Add category'); click('Close dialog')
    const categoryId = storage.value.categories[0].id
    expect(storage.value.categories[0]).toMatchObject({ name: 'Coding', color: '#8B5CF6' })
    click('New project'); change('Project name', 'Website'); change('Project category', categoryId); submit('Create project')
    expect(control('Open Website').closest('article').style.getPropertyValue('--project-color')).toBe('#8B5CF6')
    click('New project'); change('Project name', 'Research'); change('Project category', '__new__'); change('New category name', 'University'); change('New category color', '#06b6d4'); submit('Create project')
    expect(storage.value.categories[1]).toMatchObject({ name: 'University', color: '#06B6D4' })
    expect(control('Open Research').closest('article').style.getPropertyValue('--project-color')).toBe('#06B6D4')
    click('New project'); change('Project name', 'Another site'); change('Project category', '__new__'); change('New category name', 'coding'); change('New category color', '#ef4444'); submit('Create project')
    expect(storage.value.categories).toHaveLength(2)
    expect(control('Open Another site').closest('article').style.getPropertyValue('--project-color')).toBe('#8B5CF6')
  })

})
