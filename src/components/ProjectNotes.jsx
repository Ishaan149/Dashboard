import { useRef, useState } from 'react'
import { sortProjectNotes } from '../domain/projects'
import { renderProjectMarkdownPreview } from '../domain/brainDumpMarkdown'
import { Button, Dialog, EmptyState } from './ui'
import styles from './Projects.module.css'
import noteStyles from './BrainDump.module.css'

function MarkdownMode({ mode, setMode }) {
  return <div className={noteStyles.modeToggle} aria-label="Markdown mode">
    <button type="button" className={mode === 'edit' ? noteStyles.modeActive : ''} aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>Edit</button>
    <button type="button" className={mode === 'preview' ? noteStyles.modeActive : ''} aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>Preview</button>
  </div>
}

function NoteBody({ note, mode, onEdit }) {
  return mode === 'edit'
    ? <div className={noteStyles.editSurface}><textarea key={note.id} className={noteStyles.area} aria-label="Note content" value={note.content} placeholder="Start writing in Markdown…" onChange={event => onEdit(event.target.value)} /></div>
    : <div className={noteStyles.previewSurface} aria-label="Note preview">{note.content ? <div className={noteStyles.markdown} dangerouslySetInnerHTML={{ __html: renderProjectMarkdownPreview(note.content) }} /> : <p className={noteStyles.previewEmpty}>Nothing to preview yet.</p>}</div>
}

export default function ProjectNotes({ project, onUpdate }) {
  const [selectedId, setSelectedId] = useState(null)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
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
        <div className={styles.notesHeading}>
          <h3>Notes <span className={styles.notesCount}>{notes.length}</span></h3>
          <Button variant="ghost" className={styles.addNoteButton} ref={newNoteRef} aria-label="New note" title="New note" onClick={newNote}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </Button>
        </div>
        <div className={noteStyles.noteList}>
          {notes.map(item => <button key={item.id} type="button" className={`${noteStyles.noteItem} ${item.id === note?.id ? noteStyles.noteItemActive : ''}`} aria-label={`Select note ${item.title || 'Untitled note'}`} aria-current={item.id === note?.id ? 'true' : undefined}
            onClick={() => { setSelectedId(item.id); setMode('edit') }}><span className={noteStyles.noteItemTitle}>{item.title || 'Untitled note'}</span></button>)}
          {!notes.length && <p className={styles.hint}>Your documents will appear here.</p>}
        </div>
      </aside>
      <section className={noteStyles.editor} aria-label="Note editor">
          <div className={noteStyles.titleRow}>
            {note && <>
            <input ref={titleRef} className={noteStyles.titleInput} aria-label="Note title" value={note.title} placeholder="Untitled note" onChange={event => editNote('title', event.target.value)} />
            <Button variant="ghost" className={styles.fullscreenTrigger} aria-label="Open note fullscreen" title="Open note fullscreen" aria-haspopup="dialog" onClick={() => setFullscreenOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" /></svg>
            </Button>
            <Button variant="ghost" className={styles.noteDelete} aria-label="Delete note" title="Delete note" onClick={() => setDeleting({ id: note.id, title: note.title || 'Untitled note' })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" /></svg>
            </Button>
            </>}
          </div>
        {note ? <>
          <NoteBody note={note} mode="edit" onEdit={value => editNote('content', value)} />

        </> : <EmptyState message="No notes yet. Create a document for ideas, plans, or reference." />}
      </section>
      <Dialog open={fullscreenOpen && Boolean(note)} fullscreen title={note?.title || 'Untitled note'} titleControl={<input className={styles.popupNoteTitle} aria-label="Note title" value={note?.title ?? ''} placeholder="Untitled note" onChange={event => editNote('title', event.target.value)} />} headerActions={<MarkdownMode mode={mode} setMode={setMode} />} onClose={() => setFullscreenOpen(false)}>
        <div className={styles.fullscreenNote}>
          {note && <NoteBody note={note} mode={mode} onEdit={value => editNote('content', value)} />}
        </div>
      </Dialog>
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
