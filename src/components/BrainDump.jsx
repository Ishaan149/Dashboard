import { useState, useRef } from 'react'
import { useSyncedStorage as useLocalStorage } from '../hooks/useSyncedStorage'
import Card from './Card'
import styles from './BrainDump.module.css'

const PINNED_ID = '__pinned__'

function makeNote(title = 'Untitled') {
  return { id: Date.now().toString(), title, content: '' }
}

export default function BrainDump() {
  const [notes, setNotes]           = useLocalStorage('brainDumpNotes', [makeNote('Note 1')])
  const [activeId, setActiveId]     = useLocalStorage('brainDumpActiveId', null)
  const [pinnedNote, setPinnedNote] = useLocalStorage('brainDumpPinnedNote', { title: 'Pinned', content: '' })
  const [status, setStatus]         = useState('idle')
  const timerRef                    = useRef(null)

  const isEditingPinned = activeId === PINNED_ID
  const activeNote = isEditingPinned
    ? { id: PINNED_ID, ...pinnedNote }
    : (notes.find(n => n.id === activeId) ?? notes[0])

  function triggerStatus() {
    setStatus('saving')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    }, 600)
  }

  function updateContent(val) {
    if (isEditingPinned) {
      setPinnedNote(prev => ({ ...prev, content: val }))
    } else {
      setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, content: val } : n))
    }
    triggerStatus()
  }

  function updateTitle(val) {
    if (isEditingPinned) {
      setPinnedNote(prev => ({ ...prev, title: val }))
    } else {
      setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, title: val } : n))
    }
  }

  function addNote() {
    const note = makeNote('Untitled')
    setNotes(prev => [note, ...prev])
    setActiveId(note.id)
  }

  function deleteNote(id, e) {
    e.stopPropagation()
    if (notes.length === 1) return
    if (!confirm('Delete this note?')) return
    const remaining = notes.filter(n => n.id !== id)
    setNotes(remaining)
    if (activeNote?.id === id) setActiveId(remaining[0].id)
  }

  function clearNote() {
    if (!activeNote?.content) return
    if (!confirm('Clear this note?')) return
    updateContent('')
    clearTimeout(timerRef.current)
    setStatus('idle')
  }

  const statusText = status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Auto-saves'

  return (
    <Card title="Notes">
      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <button className={styles.newBtn} onClick={addNote}>+ New Note</button>
          <div className={styles.noteList}>

            {/* Permanent pinned note */}
            <div
              className={`${styles.noteItem} ${styles.pinnedItem} ${activeId === PINNED_ID ? styles.noteItemActive : ''}`}
              onClick={() => setActiveId(PINNED_ID)}
            >
              <div className={styles.noteItemTitle}>{pinnedNote.title || 'Pinned'}</div>
              <div className={styles.noteItemPreview}>
                {pinnedNote.content ? pinnedNote.content.slice(0, 55).replace(/\n/g, ' ') : 'Empty note'}
              </div>
            </div>

            <div className={styles.divider} />

            {/* Regular notes */}
            {notes.map(note => (
              <div
                key={note.id}
                className={`${styles.noteItem} ${note.id === activeNote?.id ? styles.noteItemActive : ''}`}
                onClick={() => setActiveId(note.id)}
              >
                <div className={styles.noteItemTitle}>{note.title || 'Untitled'}</div>
                <div className={styles.noteItemPreview}>
                  {note.content ? note.content.slice(0, 55).replace(/\n/g, ' ') : 'Empty note'}
                </div>
                {notes.length > 1 && (
                  <button
                    className={styles.noteItemDelete}
                    onClick={e => deleteNote(note.id, e)}
                    title="Delete note"
                  >×</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.editor}>
          <input
            className={styles.titleInput}
            value={activeNote?.title ?? ''}
            onChange={e => updateTitle(e.target.value)}
            placeholder="Untitled"
          />
          <textarea
            key={activeNote?.id}
            className={styles.area}
            value={activeNote?.content ?? ''}
            onChange={e => updateContent(e.target.value)}
            placeholder="Start writing…"
          />
          <div className={styles.footer}>
            <span className={`${styles.status} ${status === 'saved' ? styles.saved : ''}`}>
              {status === 'saved' && <span className={styles.dot} />}
              {statusText}
            </span>
            <div className={styles.meta}>
              <span className={styles.count}>
                {(activeNote?.content.length ?? 0) > 0 ? `${activeNote.content.length} chars` : ''}
              </span>
              <button className={styles.clearBtn} onClick={clearNote}>Clear</button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
