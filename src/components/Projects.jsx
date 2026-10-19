import { useEffect, useRef, useState } from 'react'
import { moveWithinGroup } from '../domain/projects'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { Button, Dialog, EmptyState } from './ui'
import { NavigationIcon } from './navigation'
import styles from './Projects.module.css'
import ProjectCategories from './ProjectCategories'
import ProjectNotes from './ProjectNotes'
import ProjectTasks from './ProjectTasks'

const EMPTY_PROJECTS = { projects: [], categories: [] }

function ProjectForm({ project, categories, onSave, onClose }) {
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [categoryId, setCategoryId] = useState(project?.categoryId ?? '')
  const [newCategory, setNewCategory] = useState('')
  const nameRef = useRef(null)
  return (
    <Dialog open title={project ? 'Edit project' : 'New project'} onClose={onClose} initialFocusRef={nameRef}>
      <form className={styles.form} onSubmit={event => {
        event.preventDefault()
        if (name.trim() && (categoryId !== '__new__' || newCategory.trim())) onSave({ name: name.trim(), description: description.trim(), categoryId: categoryId === '__new__' ? null : categoryId || null }, categoryId === '__new__' ? newCategory.trim() : '')
      }}>
        <label>Name<input ref={nameRef} aria-label="Project name" value={name} onChange={event => setName(event.target.value)} required /></label>
        <label>Description <span>(optional)</span><textarea aria-label="Project description" value={description} onChange={event => setDescription(event.target.value)} rows={3} /></label>
        <label>Category <span>(optional)</span><select aria-label="Project category" value={categoryId} onChange={event => setCategoryId(event.target.value)}>
          <option value="">Uncategorized</option>
          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          <option value="__new__">+ New category…</option>
        </select></label>
        {categoryId === '__new__' && <label>New category name<input aria-label="New category name" value={newCategory} onChange={event => setNewCategory(event.target.value)} required /></label>}
        <div className={styles.actions}><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={!name.trim() || (categoryId === '__new__' && !newCategory.trim())}>{project ? 'Save project' : 'Create project'}</Button></div>
      </form>
    </Dialog>
  )
}

export default function Projects() {
  // Array positions are the persisted manual order, shared by both status views.
  const [data, setData] = useSyncedStorage('projects', EMPTY_PROJECTS)
  const [completed, setCompleted] = useState(false)
  const [projectId, setProjectId] = useState(null)
  const [form, setForm] = useState(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const optionsRef = useRef(null)
  const optionsTriggerRef = useRef(null)
  const [deleting, setDeleting] = useState(null)
  const cancelRef = useRef(null)
  const viewFocusRef = useRef(null)
  const draggedProject = useRef(null)
  const projects = data?.projects ?? []
  const categories = data?.categories ?? []
  const project = projects.find(item => item.id === projectId)
  const visibleProjects = projects.filter(item => item.completed === completed)

  useEffect(() => { if (projectId !== null) viewFocusRef.current?.focus() }, [projectId])

  useEffect(() => {
    if (!optionsOpen) return
    const frame = requestAnimationFrame(() => optionsRef.current?.querySelector('[data-options-action]')?.focus())
    function dismiss(event) {
      if (event.type === 'keydown') {
        if (event.key !== 'Escape') return
        optionsTriggerRef.current?.focus()
      } else if (optionsRef.current?.contains(event.target)) return
      setOptionsOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', dismiss)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', dismiss)
    }
  }, [optionsOpen])

  function updateProject(id, update) {
    setData(previous => ({ ...previous, projects: previous.projects.map(item => item.id === id ? update(item) : item) }))
  }

  function moveProject(sourceId, targetId) {
    setData(previous => ({ ...previous, projects: moveWithinGroup(previous.projects, sourceId, targetId, item => item.completed === completed) }))
  }

  function saveProject(fields, categoryName) {
    const newId = crypto.randomUUID()
    const categoryId = crypto.randomUUID()
    setData(previous => {
      const existing = previous.categories.find(item => item.name.toLowerCase() === categoryName.toLowerCase())
      const category = categoryName ? (existing ?? { id: categoryId, name: categoryName }) : null
      const savedFields = { ...fields, categoryId: category?.id ?? (previous.categories.some(item => item.id === fields.categoryId) ? fields.categoryId : null) }
      return {
        ...previous,
        categories: category && !existing ? [...previous.categories, category] : previous.categories,
        projects: form === 'new'
          ? [...previous.projects, { id: newId, ...savedFields, completed: false, notes: [], tasks: [] }]
          : previous.projects.map(item => item.id === form.id ? { ...item, ...savedFields } : item),
      }
    })
    if (form === 'new') setCompleted(false)
    setForm(null)
  }

  function createCategory(name) {
    const id = crypto.randomUUID()
    setData(previous => previous.categories.some(item => item.name.toLowerCase() === name.toLowerCase()) ? previous : { ...previous, categories: [...previous.categories, { id, name }] })
  }

  function renameCategory(id, name) {
    setData(previous => ({ ...previous, categories: previous.categories.map(item => item.id === id ? { ...item, name } : item) }))
  }

  function deleteCategory(id) {
    setData(previous => ({ ...previous, categories: previous.categories.filter(item => item.id !== id), projects: previous.projects.map(item => item.categoryId === id ? { ...item, categoryId: null } : item) }))
  }

  function returnToProjects() {
    setCompleted(project.completed)
    setProjectId(null)
    requestAnimationFrame(() => viewFocusRef.current?.focus())
  }

  return (
    <section className={styles.page} aria-label="Projects">
      {project ? <>
        <Button aria-label="Back to projects" className={styles.back} onClick={returnToProjects}>← Back to projects</Button>
        <header className={styles.projectHeader}>
          <div className={styles.projectInfo}>
            <p className={styles.eyebrow}>{project.completed ? 'Completed project' : 'Active project'}</p>
            <h2 ref={viewFocusRef} tabIndex={-1}>{project.name}</h2>
            {project.categoryId && <span className={styles.category}>{categories.find(item => item.id === project.categoryId)?.name ?? 'Uncategorized'}</span>}
            {project.description && <p className={styles.description}>{project.description}</p>}
          </div>
          <div className={styles.actions}>
            <Button onClick={() => setForm(project)}>Edit project</Button>
            <Button onClick={() => updateProject(project.id, item => ({ ...item, completed: !item.completed }))}>{project.completed ? 'Reopen project' : 'Complete project'}</Button>
            <Button variant="ghost" onClick={() => setDeleting({ id: project.id, name: project.name })}>Delete project</Button>
          </div>
        </header>
        <div className={styles.workspace}>
          <ProjectTasks key={`tasks-${project.id}`} project={project} onUpdate={update => updateProject(project.id, update)} />
          <ProjectNotes key={project.id} project={project} onUpdate={update => updateProject(project.id, update)} />
        </div>
      </> : <>
        <div className={styles.statusViews} aria-label="Project status">
          <Button ref={!completed ? viewFocusRef : undefined} aria-pressed={!completed} onClick={() => setCompleted(false)}>Active</Button>
          <Button ref={completed ? viewFocusRef : undefined} aria-pressed={completed} onClick={() => setCompleted(true)}>Completed</Button>
          <div className={styles.collectionActions}>
            <Button variant="primary" onClick={() => setForm('new')}>New project</Button>
            <div ref={optionsRef} className={styles.collectionOptions}>
              <Button ref={optionsTriggerRef} variant="ghost" className={styles.optionsTrigger} aria-label="Project options" title="Project options" aria-expanded={optionsOpen} aria-controls="project-options" onClick={() => setOptionsOpen(open => !open)}>
                <span aria-hidden="true">•••</span>
              </Button>
              {optionsOpen && <div id="project-options" className={styles.optionsPopover}>
                <button type="button" data-options-action onClick={() => { optionsTriggerRef.current?.focus(); setOptionsOpen(false); setCategoriesOpen(true) }}>Manage categories</button>
              </div>}
            </div>
          </div>
        </div>
        {visibleProjects.length ? <div className={styles.cards}>
          {visibleProjects.map((item, index) => <article className={styles.card} key={item.id}
            onDragOver={event => { if (draggedProject.current) event.preventDefault() }}
            onDrop={event => { event.preventDefault(); if (draggedProject.current) moveProject(draggedProject.current, item.id); draggedProject.current = null }}>

            <button className={styles.cardOpen} aria-label={`Open ${item.name}`} onClick={() => setProjectId(item.id)}
              draggable title="Drag to reorder. Use Alt + ↑ or ↓ with the keyboard." aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
              onDragStart={event => { draggedProject.current = item.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id) }}
              onDragEnd={() => { draggedProject.current = null }}
              onKeyDown={event => {
                if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
                event.preventDefault()
                const target = visibleProjects[index + (event.key === 'ArrowUp' ? -1 : 1)]
                if (target) moveProject(item.id, target.id)
              }}>
              <span className={styles.projectIcon}><NavigationIcon name="projects" size={40} /></span>
              <span className={styles.cardTitle}>{item.name}</span>
              <span className={styles.category}>{categories.find(category => category.id === item.categoryId)?.name ?? 'Uncategorized'}</span>
            </button>
          </article>)}
        </div> : <EmptyState message={completed ? 'No completed projects yet. Completed work will stay here for reference.' : 'No active projects yet. Start with a name and make room for your next idea.'} actionLabel={completed ? undefined : 'Create your first project'} onAction={() => setForm('new')} />}
      </>}
      <Dialog open={Boolean(deleting)} title="Delete project?" description={`“${deleting?.name}” and all its notes and tasks will be permanently deleted.`} destructive initialFocusRef={cancelRef} onClose={() => setDeleting(null)}
        footer={<><Button ref={cancelRef} onClick={() => setDeleting(null)}>Cancel</Button><Button variant="danger" onClick={() => {
          setData(previous => ({ ...previous, projects: previous.projects.filter(item => item.id !== deleting.id) }))
          setCompleted(project?.completed ?? completed)
          setProjectId(null)
          setDeleting(null)
          requestAnimationFrame(() => viewFocusRef.current?.focus())
        }}>Delete project</Button></>} />
      {categoriesOpen && <ProjectCategories categories={categories} onCreate={createCategory} onRename={renameCategory} onDelete={deleteCategory} onClose={() => setCategoriesOpen(false)} />}
      {form && <ProjectForm project={form === 'new' ? null : form} categories={categories} onSave={saveProject} onClose={() => setForm(null)} />}
    </section>
  )
}
