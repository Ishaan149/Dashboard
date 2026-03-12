import { useState, useRef } from 'react'
import { useSyncedStorage as useLocalStorage } from '../hooks/useSyncedStorage'
import Card from './Card'
import styles from './BrainDump.module.css'

function makeNote(title = 'Note') {
  return { id: Date.now().toString(), title, content: '' }
}

export default function BrainDump() {
  const [notes, setNotes] = useLocalStorage('brainDumpNotes', [makeNote('Note 1')])
  const [activeId, setActiveId] = useLocalStorage('brainDumpActiveId', null)
  const [status, setStatus] = useState('idle')
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const timerRef = useRef(null)

  const activeNote = notes.find(n => n.id === activeId) ?? notes[0]

  function updateContent(val) {
    setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, content: val } : n))
    setStatus('saving')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    }, 600)
  }

  function addNote() {
    const note = makeNote(`Note ${notes.length + 1}`)
    setNotes(prev => [...prev, note])
    setActiveId(note.id)
  }

  function deleteNote(id) {
    if (notes.length === 1) return
    if (!confirm('Delete this note?')) return
    const remaining = notes.filter(n => n.id !== id)
    setNotes(remaining)
    if (activeNote?.id === id) setActiveId(remaining[0].id)
  }

  function startRename(note, e) {
    e.stopPropagation()
    setEditingId(note.id)
    setEditingTitle(note.title)
  }

  function commitRename(id) {
    const trimmed = editingTitle.trim()
    if (trimmed) setNotes(prev => prev.map(n => n.id === id ? { ...n, title: trimmed } : n))
    setEditingId(null)
  }

  function clearNote() {
    if (!activeNote?.content) return
    if (!confirm('Clear this note?')) return
    updateContent('')
    setStatus('idle')
  }

  const statusText = status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Auto-saves as you type'

  return (
    <Card title="Brain Dump">
      <div className={styles.tabs}>
        {notes.map(note => (
          <div
            key={note.id}
            className={`${styles.tab} ${note.id === activeNote?.id ? styles.tabActive : ''}`}
            onClick={() => setActiveId(note.id)}
          >
            {editingId === note.id ? (
              <input
                className={styles.tabInput}
                value={editingTitle}
                autoFocus
                onChange={e => setEditingTitle(e.target.value)}
                onBlur={() => commitRename(note.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename(note.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <>
                <span className={styles.tabLabel} onDoubleClick={e => startRename(note, e)}>
                  {note.title}
                </span>
                <button
                  className={styles.tabRename}
                  onClick={e => startRename(note, e)}
                  title="Rename note"
                >
                  ✎
                </button>
              </>
            )}
            {notes.length > 1 && (
              <button
                className={styles.tabClose}
                onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                title="Delete note"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button className={styles.addBtn} onClick={addNote} title="New note">+</button>
      </div>

      <textarea
        key={activeNote?.id}
        className={styles.area}
        value={activeNote?.content ?? ''}
        onChange={e => updateContent(e.target.value)}
        placeholder="Just start typing — anything on your mind, ideas, half-thoughts, reminders…"
      />

      <div className={styles.footer}>
        <span className={`${styles.status} ${status === 'saved' ? styles.saved : ''}`}>
          {status === 'saved' && <span className={styles.dot} />}
          {statusText}
        </span>
        <div className={styles.meta}>
          <span className={styles.count}>{(activeNote?.content.length ?? 0) > 0 ? `${activeNote.content.length} chars` : ''}</span>
          <button className={styles.clearBtn} onClick={clearNote}>Clear note</button>
        </div>
      </div>
    </Card>
  )
}
