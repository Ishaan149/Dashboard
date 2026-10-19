import { useRef, useState } from 'react'
import { sortProjectNotes } from '../domain/projects'
import { renderProjectMarkdownPreview } from '../domain/brainDumpMarkdown'
import { Button, Dialog, EmptyState } from './ui'
import styles from './Projects.module.css'

export default function ProjectNotes({ project, onUpdate }) {
  const [selectedId, setSelectedId] = useState(null)
  const [mode, setMode] = useState('edit')
  const [deleting, setDeleting] = useState(null)
  const cancelRef = useRef(null)
  const newNoteRef = useRef(null)
  const titleRef = useRef(null)
  const notes = sortProjectNotes(project.notes)
  const note = notes.find(item => item.id === selectedId) ?? notes[0]

  function newNote() {
    const now = Date.now()
    const created = { id: crypto.randomUUID(), title: 'Untitled note', content: '', createdAt: now, updatedAt: now }
    onUpdate(item => ({ ...item, notes: [...item.notes, created] }))
    setSelectedId(created.id)
    setMode('edit')
    requestAnimationFrame(() => { titleRef.current?.focus(); titleRef.current?.select() })
  }

  function editNote(field, value) {
    if (note[field] === value) return
    // Pin selection before an edit changes the sorted note index.
    setSelectedId(note.id)
    const now = Date.now()
    onUpdate(item => ({ ...item, notes: item.notes.map(current => current.id === note.id ? { ...current, [field]: value, updatedAt: now } : current) }))
  }

  return (
    <section className={styles.notesWorkspace} aria-label="Project notes">
      <aside className={styles.noteIndex} aria-label="Note index">
        <div className={styles.panelHeading}><h3>Notes</h3><Button ref={newNoteRef} onClick={newNote}>New note</Button></div>
        <div className={styles.noteList}>
          {notes.map(item => <button key={item.id} type="button" aria-label={`Select note ${item.title || 'Untitled note'}`} aria-current={item.id === note?.id ? 'true' : undefined}
            onClick={() => { setSelectedId(item.id); setMode('edit') }}>{item.title || 'Untitled note'}</button>)}
          {!notes.length && <p className={styles.hint}>Your documents will appear here.</p>}
        </div>
      </aside>
      <section className={styles.editor} aria-label="Note editor">
        {note ? <>
          <input ref={titleRef} className={styles.noteTitle} aria-label="Note title" value={note.title} placeholder="Untitled note" onChange={event => editNote('title', event.target.value)} />
          <div className={styles.editorTools}>
            <div className={styles.actions} aria-label="Markdown mode">
              <Button aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>Edit</Button>
              <Button aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>Preview</Button>
            </div>
            <Button variant="ghost" onClick={() => setDeleting({ id: note.id, title: note.title || 'Untitled note' })}>Delete note</Button>
          </div>
          {mode === 'edit' ? <textarea key={note.id} className={styles.noteContent} aria-label="Note content" value={note.content} placeholder="Write in Markdown…" onChange={event => editNote('content', event.target.value)} />
            : <div className={styles.markdown} aria-label="Note preview">{note.content ? <div dangerouslySetInnerHTML={{ __html: renderProjectMarkdownPreview(note.content) }} /> : <p className={styles.hint}>Nothing to preview yet.</p>}</div>}
        </> : <EmptyState message="No notes yet. Create a document for ideas, plans, or reference." />}
      </section>
      <Dialog open={Boolean(deleting)} title="Delete note?" description={`“${deleting?.title}” will be permanently deleted.`} destructive initialFocusRef={cancelRef} onClose={() => setDeleting(null)}
        footer={<><Button ref={cancelRef} onClick={() => setDeleting(null)}>Cancel</Button><Button variant="danger" onClick={() => {
          onUpdate(item => ({ ...item, notes: item.notes.filter(current => current.id !== deleting.id) }))
          setDeleting(null)
          setSelectedId(null)
          requestAnimationFrame(() => (titleRef.current ?? newNoteRef.current)?.focus())
        }}>Delete note</Button></>} />
    </section>
  )
}
