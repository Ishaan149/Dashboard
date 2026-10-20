import { useRef, useState } from 'react'
import { moveWithinGroup } from '../domain/projects'
import { Button } from './ui'
import styles from './Projects.module.css'
import todoStyles from './TodoCard.module.css'

function TaskRow({ task, checkboxRef, onChange, onMove, onDelete, dragOver, dragHandlers }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(task.text)
  const nameRef = useRef(null)
  return (
    <li className={`${todoStyles.task} ${styles.taskRow} ${task.completed ? todoStyles.done : ''} ${dragOver === 'before' ? todoStyles.taskDragOver : ''} ${dragOver === 'after' ? todoStyles.taskDragAfter : ''}`}
      draggable={!editing}
      {...(!editing ? dragHandlers : {})}
    >
      {editing ? <form className={styles.taskEdit} onSubmit={event => {
        event.preventDefault()
        if (text.trim()) { onChange({ text: text.trim() }); setEditing(false); requestAnimationFrame(() => nameRef.current?.focus()) }
      }}>
        <input autoFocus aria-label="Task text" value={text} onChange={event => setText(event.target.value)} required />
        <div className={styles.actions}><Button type="submit" disabled={!text.trim()}>Save task</Button><Button onClick={() => { setEditing(false); requestAnimationFrame(() => nameRef.current?.focus()) }}>Cancel edit</Button></div>
      </form> : <>
        <div className={styles.taskLine}>
          <label className={styles.taskCheck}><input ref={checkboxRef} className={todoStyles.checkbox} type="checkbox" checked={task.completed} aria-label={`${task.completed ? 'Reopen' : 'Complete'} task ${task.text}`} onChange={() => onChange({ completed: !task.completed })} /></label>
          <button ref={nameRef} type="button" className={`${todoStyles.taskText} ${styles.taskName}`} aria-label={`Rename task ${task.text}`} title="Drag to reorder. Use Alt + ↑ or ↓ with the keyboard." aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
            onKeyDown={event => {
              if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
              event.preventDefault()
              onMove(event.key === 'ArrowUp' ? -1 : 1)
            }} onClick={() => { setText(task.text); setEditing(true) }}>{task.text}</button>
        </div>
        <div className={styles.taskActions}>
          <button type="button" className={styles.taskDelete} aria-label={`Delete task ${task.text}`} onClick={onDelete}>×</button>
        </div>
      </>}
    </li>
  )
}

export default function ProjectTasks({ project, onUpdate }) {
  const [text, setText] = useState('')
  const [dragTarget, setDragTarget] = useState(null)
  const dragging = useRef(null)
  const checkboxRefs = useRef(new Map())
  const newTaskRef = useRef(null)
  const incomplete = project.tasks.filter(task => !task.completed)
  const completed = project.tasks.filter(task => task.completed)

  function endDrag() {
    dragging.current = null
    setDragTarget(null)
  }

  function dropPosition(event) {
    const { top, height } = event.currentTarget.getBoundingClientRect()
    return event.clientY > top + height / 2 ? 'after' : 'before'
  }

  function acceptsDrop(task) {
    return dragging.current && dragging.current.id !== task.id && dragging.current.completed === task.completed
  }

  function renderGroup(tasks, label) {
    return <ul className={`${todoStyles.list} ${styles.taskList}`} aria-label={label}>{tasks.map((task, index) => <TaskRow key={task.id} task={task}
      dragOver={dragTarget?.id === task.id ? dragTarget.position : null}
      dragHandlers={{
        onDragStart: event => {
          dragging.current = { id: task.id, completed: task.completed }
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', task.id)
        },
        onDragEnd: endDrag,
        onDragOver: event => {
          event.stopPropagation()
          if (!acceptsDrop(task)) { setDragTarget(null); return }
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          setDragTarget({ id: task.id, position: dropPosition(event) })
        },
        onDragLeave: event => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setDragTarget(previous => previous?.id === task.id ? null : previous)
          }
        },
        onDrop: event => {
          event.stopPropagation()
          if (acceptsDrop(task)) {
            event.preventDefault()
            const sourceId = dragging.current.id
            const position = dropPosition(event)
            onUpdate(item => ({ ...item, tasks: moveWithinGroup(item.tasks, sourceId, task.id, current => current.completed === task.completed, position) }))
          }
          endDrag()
        },
      }}
      checkboxRef={node => { if (node) checkboxRefs.current.set(task.id, node); else checkboxRefs.current.delete(task.id) }}
      onChange={patch => {
        onUpdate(item => ({ ...item, tasks: item.tasks.map(current => current.id === task.id ? { ...current, ...patch } : current) }))
        if ('completed' in patch) requestAnimationFrame(() => checkboxRefs.current.get(task.id)?.focus())
      }}
      onDelete={() => {
        onUpdate(item => ({ ...item, tasks: item.tasks.filter(current => current.id !== task.id) }))
        requestAnimationFrame(() => newTaskRef.current?.focus())
      }}
      onMove={direction => {
        const target = tasks[index + direction]
        if (target) onUpdate(item => ({ ...item, tasks: moveWithinGroup(item.tasks, task.id, target.id, current => current.completed === task.completed) }))
      }}
    />)}</ul>
  }

  return (
    <aside className={styles.tasks} aria-label="Project checklist">
      <div className={styles.panelHeading}><h3>Tasks</h3><span className={styles.panelCount}>{incomplete.length} open</span></div>
      <form className={`${todoStyles.addForm} ${styles.addTask}`} onSubmit={event => {
        event.preventDefault()
        if (!text.trim()) return
        const task = { id: crypto.randomUUID(), text: text.trim(), completed: false }
        onUpdate(item => ({ ...item, tasks: [...item.tasks, task] }))
        setText('')
      }}>
        <input ref={newTaskRef} aria-label="New task" placeholder="Add a task…" value={text} onChange={event => setText(event.target.value)} required />
        <button type="submit" aria-label="Add task" disabled={!text.trim()}>+</button>
      </form>
      {!project.tasks.length && <p className={styles.hint}>No tasks yet. Add a next step for this project.</p>}
      {project.tasks.length > 0 && !incomplete.length && <p className={styles.hint}>No open tasks.</p>}
      {renderGroup(incomplete, 'Incomplete tasks')}
      {completed.length > 0 && <><h4 className={styles.completedHeading}>Completed <span>{completed.length}</span></h4>{renderGroup(completed, 'Completed tasks')}</>}
    </aside>
  )
}
