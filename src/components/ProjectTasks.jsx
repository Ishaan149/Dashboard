import { useRef, useState } from 'react'
import { moveWithinGroup } from '../domain/projects'
import { Button } from './ui'
import styles from './Projects.module.css'

function TaskRow({ task, first, last, checkboxRef, onChange, onMove, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(task.text)
  const nameRef = useRef(null)
  return (
    <li className={styles.taskRow}>
      {editing ? <form className={styles.taskEdit} onSubmit={event => {
        event.preventDefault()
        if (text.trim()) { onChange({ text: text.trim() }); setEditing(false); requestAnimationFrame(() => nameRef.current?.focus()) }
      }}>
        <input autoFocus aria-label="Task text" value={text} onChange={event => setText(event.target.value)} required />
        <div className={styles.actions}><Button type="submit" disabled={!text.trim()}>Save task</Button><Button onClick={() => { setEditing(false); requestAnimationFrame(() => nameRef.current?.focus()) }}>Cancel edit</Button></div>
      </form> : <>
        <div className={styles.taskLine}>
          <label className={styles.taskCheck}><input ref={checkboxRef} type="checkbox" checked={task.completed} aria-label={`${task.completed ? 'Reopen' : 'Complete'} task ${task.text}`} onChange={() => onChange({ completed: !task.completed })} /></label>
          <button ref={nameRef} type="button" className={`${styles.taskName} ${task.completed ? styles.taskDone : ''}`} aria-label={`Rename task ${task.text}`} onClick={() => { setText(task.text); setEditing(true) }}>{task.text}</button>
        </div>
        <div className={styles.taskActions}>
          <Button aria-label={`Move task ${task.text} up`} disabled={first} onClick={() => onMove(-1)}>↑</Button>
          <Button aria-label={`Move task ${task.text} down`} disabled={last} onClick={() => onMove(1)}>↓</Button>
          <Button aria-label={`Delete task ${task.text}`} onClick={onDelete}>×</Button>
        </div>
      </>}
    </li>
  )
}

export default function ProjectTasks({ project, onUpdate }) {
  const [text, setText] = useState('')
  const checkboxRefs = useRef(new Map())
  const newTaskRef = useRef(null)
  const incomplete = project.tasks.filter(task => !task.completed)
  const completed = project.tasks.filter(task => task.completed)

  function renderGroup(tasks, label) {
    return <ul className={styles.taskList} aria-label={label}>{tasks.map((task, index) => <TaskRow key={task.id} task={task} first={index === 0} last={index === tasks.length - 1}
      checkboxRef={node => { if (node) checkboxRefs.current.set(task.id, node); else checkboxRefs.current.delete(task.id) }}
      onChange={patch => {
        onUpdate(item => ({ ...item, tasks: item.tasks.map(current => current.id === task.id ? { ...current, ...patch } : current) }))
        if ('completed' in patch) requestAnimationFrame(() => checkboxRefs.current.get(task.id)?.focus())
      }}
      onDelete={() => {
        onUpdate(item => ({ ...item, tasks: item.tasks.filter(current => current.id !== task.id) }))
        requestAnimationFrame(() => newTaskRef.current?.focus())
      }}
      onMove={direction => onUpdate(item => ({ ...item, tasks: moveWithinGroup(item.tasks, task.id, tasks[index + direction].id, current => current.completed === task.completed) }))}
    />)}</ul>
  }

  return (
    <aside className={styles.tasks} aria-label="Project checklist">
      <div className={styles.panelHeading}><h3>Tasks</h3></div>
      <form className={styles.addTask} onSubmit={event => {
        event.preventDefault()
        if (!text.trim()) return
        const task = { id: crypto.randomUUID(), text: text.trim(), completed: false }
        onUpdate(item => ({ ...item, tasks: [...item.tasks, task] }))
        setText('')
      }}>
        <input ref={newTaskRef} aria-label="New task" placeholder="Add a task…" value={text} onChange={event => setText(event.target.value)} required />
        <Button type="submit" aria-label="Add task" disabled={!text.trim()}>+</Button>
      </form>
      {!project.tasks.length && <p className={styles.hint}>No tasks yet. Add a next step for this project.</p>}
      {project.tasks.length > 0 && !incomplete.length && <p className={styles.hint}>No open tasks.</p>}
      {renderGroup(incomplete, 'Incomplete tasks')}
      {completed.length > 0 && <><h4 className={styles.completedHeading}>Completed</h4>{renderGroup(completed, 'Completed tasks')}</>}
    </aside>
  )
}
