import { useState, useRef } from 'react'
import { useSyncedStorage as useLocalStorage } from '../hooks/useSyncedStorage'
import Card from './Card'
import styles from './TodoCard.module.css'

function Checkmark({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TodoItem({ item, onToggle, onDelete, onDragStart, onDragEnd, onDragOver, onDrop, isDragOver, nested }) {
  return (
    <li
      className={`${styles.item} ${item.done ? styles.done : ''} ${isDragOver ? styles.dragOver : ''} ${nested ? styles.nested : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span className={styles.dragHandle} aria-hidden="true">⠿</span>
      <button className={styles.checkbox} onClick={onToggle} aria-label={item.done ? 'Mark incomplete' : 'Mark complete'}>
        {item.done && <Checkmark />}
      </button>
      <span className={styles.text}>{item.text}</span>
      <button className={styles.delete} onClick={onDelete} aria-label="Delete task">✕</button>
    </li>
  )
}

const ChevronIcon = ({ collapsed }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
       strokeLinecap="round" strokeLinejoin="round" width="10" height="10"
       style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const FolderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const IArrow = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" width="12" height="12" {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

function FolderRow({ folder, onToggleCollapse, onDelete, onDragStart, onDragEnd, onDragOver, onDrop, isDragOver, onAddTask, children }) {
  const [input, setInput] = useState('')
  const [showInput, setShowInput] = useState(false)

  function add() {
    const text = input.trim()
    if (!text) return
    onAddTask(text)
    setInput('')
    setShowInput(false)
  }

  const doneCount = folder.items.filter(t => t.done).length

  return (
    <li className={styles.folderItem}>
      <div
        className={`${styles.folderRow} ${isDragOver ? styles.folderDragOver : ''}`}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <span className={styles.dragHandle} aria-hidden="true">⠿</span>
        <button className={styles.folderChevron} onClick={onToggleCollapse} aria-label={folder.collapsed ? 'Expand' : 'Collapse'}>
          <ChevronIcon collapsed={folder.collapsed} />
        </button>
        <span className={styles.folderName}>{folder.name}</span>
        {folder.items.length > 0 && (
          <span className={styles.folderCount}>{doneCount}/{folder.items.length}</span>
        )}
        <button className={styles.folderAddBtn} onClick={() => setShowInput(v => !v)} aria-label="Add task to folder">+</button>
        <button className={styles.delete} onClick={onDelete} aria-label="Delete folder">✕</button>
      </div>

      {!folder.collapsed && (
        <ul className={styles.folderChildren}>
          {children}
          {showInput && (
            <li className={styles.folderInputRow}>
              <input
                className={styles.folderInput}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setShowInput(false) }}
                placeholder="Add a task…"
                maxLength={200}
                autoFocus
              />
              <button className={styles.addBtn} onClick={add}>Add</button>
            </li>
          )}
          {!showInput && (
            <li>
              <button className={styles.folderAddInline} onClick={() => setShowInput(true)}>+ Add task</button>
            </li>
          )}
        </ul>
      )}
    </li>
  )
}

export default function TodoCard({ onChange }) {
  const [todayTodos, setTodayTodos] = useLocalStorage('todos-today', [])
  const [weekTodos, setWeekTodos] = useLocalStorage('todos-thisweek', [])
  const [longTodos, setLongTodos] = useLocalStorage('todos-longterm', [])
  const dragging = useRef(null) // { id, from, folderId: string|null }
  const [dragOverItem, setDragOverItem] = useState(null) // { id, list, folderId }|null

  const setters = { today: setTodayTodos, week: setWeekTodos, long: setLongTodos }
  const lists = { today: todayTodos, week: weekTodos, long: longTodos }

  // --- Basic list ops ---

  function addTo(list, text) {
    const item = { id: Date.now(), text, done: false }
    setters[list](prev => [...prev, item])
  }

  function toggle(list, id, folderId = null) {
    if (folderId) {
      setLongTodos(prev => prev.map(f =>
        f.id === folderId ? { ...f, items: f.items.map(t => t.id === id ? { ...t, done: !t.done } : t) } : f
      ))
    } else {
      setters[list](prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
    }
  }

  function remove(list, id, folderId = null) {
    if (folderId) {
      setLongTodos(prev => prev.map(f =>
        f.id === folderId ? { ...f, items: f.items.filter(t => t.id !== id) } : f
      ))
    } else {
      setters[list](prev => prev.filter(t => t.id !== id))
    }
  }

  // --- Folder ops ---

  function addFolder(name) {
    const folder = { id: Date.now(), name, isFolder: true, collapsed: false, items: [] }
    setLongTodos(prev => [...prev, folder])
  }

  function deleteFolder(id) {
    setLongTodos(prev => prev.filter(f => f.id !== id))
  }

  function toggleFolderCollapse(id) {
    setLongTodos(prev => prev.map(f => f.id === id ? { ...f, collapsed: !f.collapsed } : f))
  }

  function addToFolder(folderId, text) {
    const item = { id: Date.now(), text, done: false }
    setLongTodos(prev => prev.map(f => f.id === folderId ? { ...f, items: [...f.items, item] } : f))
  }

  // --- Drag ---

  function handleDragStart(id, from, folderId = null) {
    dragging.current = { id, from, folderId }
  }

  function handleDragEnd() {
    dragging.current = null
    setDragOverItem(null)
  }

  function handleItemDragOver(e, targetId, targetList, targetFolderId = null) {
    e.preventDefault()
    e.stopPropagation()
    if (dragging.current?.id === targetId) return
    setDragOverItem({ id: targetId, list: targetList, folderId: targetFolderId })
  }

  function handleItemDrop(e, targetId, targetList, targetFolderId = null) {
    e.stopPropagation()
    setDragOverItem(null)
    if (!dragging.current) return
    const { id, from, folderId: fromFolderId } = dragging.current
    dragging.current = null
    if (id === targetId) return

    // Dropping onto a folder row → move task into that folder
    const targetIsFolder = targetList === 'long' && !targetFolderId && longTodos.find(t => t.id === targetId)?.isFolder
    if (targetIsFolder) {
      const draggingIsFolder = from === 'long' && !fromFolderId && longTodos.find(t => t.id === id)?.isFolder
      if (draggingIsFolder) {
        // Dragging a folder onto another folder: just reorder
        _reorderFlat('long', id, targetId)
      } else {
        _moveIntoFolder(id, from, fromFolderId, targetId)
      }
      return
    }

    if (from === targetList) {
      _reorderSameList(id, from, fromFolderId, targetId, targetFolderId)
    } else {
      _moveCrossListToPosition(id, from, fromFolderId, targetId, targetList, targetFolderId)
    }
  }

  // Section empty-area drop: append to end, cross-list only
  function handleSectionDrop(to) {
    setDragOverItem(null)
    if (!dragging.current) return
    const { id, from, folderId: fromFolderId } = dragging.current
    dragging.current = null
    if (from === to) return

    let item = null
    if (fromFolderId) {
      const folder = lists[from].find(f => f.id === fromFolderId)
      item = folder?.items.find(t => t.id === id)
    } else {
      item = lists[from].find(t => t.id === id)
    }
    if (!item || item.isFolder) return // don't move folders cross-list

    if (fromFolderId) {
      setters[from](prev => prev.map(f =>
        f.id === fromFolderId ? { ...f, items: f.items.filter(t => t.id !== id) } : f
      ))
    } else {
      setters[from](prev => prev.filter(t => t.id !== id))
    }
    setters[to](prev => [...prev, item])
  }

  // Reorder two flat items in the same list (used for folder reorder)
  function _reorderFlat(list, id, targetId) {
    setters[list](prev => {
      const items = [...prev]
      const fromIdx = items.findIndex(t => t.id === id)
      const toIdx = items.findIndex(t => t.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const [moved] = items.splice(fromIdx, 1)
      items.splice(toIdx, 0, moved)
      return items
    })
  }

  // Move a task into a folder (task may come from another folder or another list)
  function _moveIntoFolder(id, from, fromFolderId, targetFolderId) {
    if (from !== 'long') {
      // Cross-list into folder
      const item = lists[from].find(t => t.id === id)
      if (!item) return
      setters[from](prev => prev.filter(t => t.id !== id))
      setLongTodos(prev => prev.map(f =>
        f.id === targetFolderId ? { ...f, items: [...f.items, item] } : f
      ))
      return
    }
    if (fromFolderId) {
      // From one folder to another
      if (fromFolderId === targetFolderId) return
      setLongTodos(prev => {
        const item = prev.find(f => f.id === fromFolderId)?.items.find(t => t.id === id)
        if (!item) return prev
        return prev.map(f => {
          if (f.id === fromFolderId) return { ...f, items: f.items.filter(t => t.id !== id) }
          if (f.id === targetFolderId) return { ...f, items: [...f.items, item] }
          return f
        })
      })
    } else {
      // Flat long-term task into folder
      setLongTodos(prev => {
        const item = prev.find(t => t.id === id)
        if (!item) return prev
        const without = prev.filter(t => t.id !== id)
        return without.map(f =>
          f.id === targetFolderId ? { ...f, items: [...f.items, item] } : f
        )
      })
    }
  }

  // Reorder within same list (handles flat↔flat, flat↔folder-item, folder-item↔folder-item)
  function _reorderSameList(id, list, fromFolderId, targetId, targetFolderId) {
    if (fromFolderId === targetFolderId) {
      // Both flat or both in same folder
      if (fromFolderId) {
        setLongTodos(prev => prev.map(f => {
          if (f.id !== fromFolderId) return f
          const items = [...f.items]
          const fi = items.findIndex(t => t.id === id)
          const ti = items.findIndex(t => t.id === targetId)
          if (fi === -1 || ti === -1) return f
          const [moved] = items.splice(fi, 1)
          items.splice(ti, 0, moved)
          return { ...f, items }
        }))
      } else {
        _reorderFlat(list, id, targetId)
      }
    } else if (fromFolderId && !targetFolderId) {
      // Exit folder → flat list
      setLongTodos(prev => {
        const item = prev.find(f => f.id === fromFolderId)?.items.find(t => t.id === id)
        if (!item) return prev
        const withoutInFolder = prev.map(f =>
          f.id === fromFolderId ? { ...f, items: f.items.filter(t => t.id !== id) } : f
        )
        const ti = withoutInFolder.findIndex(t => t.id === targetId)
        const result = [...withoutInFolder]
        result.splice(ti >= 0 ? ti : result.length, 0, item)
        return result
      })
    } else if (!fromFolderId && targetFolderId) {
      // Enter folder from flat list
      setLongTodos(prev => {
        const item = prev.find(t => t.id === id)
        if (!item) return prev
        const without = prev.filter(t => t.id !== id)
        return without.map(f => {
          if (f.id !== targetFolderId) return f
          const items = [...f.items]
          const ti = items.findIndex(t => t.id === targetId)
          items.splice(ti >= 0 ? ti : items.length, 0, item)
          return { ...f, items }
        })
      })
    } else {
      // Different folders
      setLongTodos(prev => {
        const item = prev.find(f => f.id === fromFolderId)?.items.find(t => t.id === id)
        if (!item) return prev
        return prev.map(f => {
          if (f.id === fromFolderId) return { ...f, items: f.items.filter(t => t.id !== id) }
          if (f.id === targetFolderId) {
            const items = [...f.items]
            const ti = items.findIndex(t => t.id === targetId)
            items.splice(ti >= 0 ? ti : items.length, 0, item)
            return { ...f, items }
          }
          return f
        })
      })
    }
  }

  // Move cross-list to a specific position (item-level target)
  function _moveCrossListToPosition(id, from, fromFolderId, targetId, targetList, targetFolderId) {
    let item = null
    if (fromFolderId) {
      const folder = lists[from].find(f => f.id === fromFolderId)
      item = folder?.items.find(t => t.id === id)
      if (!item) return
      setters[from](prev => prev.map(f =>
        f.id === fromFolderId ? { ...f, items: f.items.filter(t => t.id !== id) } : f
      ))
    } else {
      item = lists[from].find(t => t.id === id)
      if (!item) return
      setters[from](prev => prev.filter(t => t.id !== id))
    }

    if (targetFolderId) {
      setters[targetList](prev => prev.map(f => {
        if (f.id !== targetFolderId) return f
        const items = [...f.items]
        const ti = items.findIndex(t => t.id === targetId)
        items.splice(ti >= 0 ? ti : items.length, 0, item)
        return { ...f, items }
      }))
    } else {
      setters[targetList](prev => {
        const items = [...prev]
        const ti = items.findIndex(t => t.id === targetId)
        items.splice(ti >= 0 ? ti : items.length, 0, item)
        return items
      })
    }
  }

  // --- Render ---

  function renderItems(list, todos) {
    if (list !== 'long') {
      return todos.map(t => (
        <TodoItem
          key={t.id}
          item={t}
          onToggle={() => toggle(list, t.id)}
          onDelete={() => remove(list, t.id)}
          onDragStart={() => handleDragStart(t.id, list)}
          onDragEnd={handleDragEnd}
          onDragOver={e => handleItemDragOver(e, t.id, list)}
          onDrop={e => handleItemDrop(e, t.id, list)}
          isDragOver={dragOverItem?.id === t.id && dragOverItem?.list === list && !dragOverItem?.folderId}
        />
      ))
    }

    return todos.map(t => {
      if (t.isFolder) {
        return (
          <FolderRow
            key={t.id}
            folder={t}
            onToggleCollapse={() => toggleFolderCollapse(t.id)}
            onDelete={() => deleteFolder(t.id)}
            onDragStart={() => handleDragStart(t.id, 'long')}
            onDragEnd={handleDragEnd}
            onDragOver={e => handleItemDragOver(e, t.id, 'long')}
            onDrop={e => handleItemDrop(e, t.id, 'long')}
            isDragOver={dragOverItem?.id === t.id && dragOverItem?.list === 'long' && !dragOverItem?.folderId}
            onAddTask={text => addToFolder(t.id, text)}
          >
            {t.items.map(task => (
              <TodoItem
                key={task.id}
                item={task}
                nested
                onToggle={() => toggle('long', task.id, t.id)}
                onDelete={() => remove('long', task.id, t.id)}
                onDragStart={() => handleDragStart(task.id, 'long', t.id)}
                onDragEnd={handleDragEnd}
                onDragOver={e => handleItemDragOver(e, task.id, 'long', t.id)}
                onDrop={e => handleItemDrop(e, task.id, 'long', t.id)}
                isDragOver={dragOverItem?.id === task.id && dragOverItem?.list === 'long' && dragOverItem?.folderId === t.id}
              />
            ))}
          </FolderRow>
        )
      }
      return (
        <TodoItem
          key={t.id}
          item={t}
          onToggle={() => toggle('long', t.id)}
          onDelete={() => remove('long', t.id)}
          onDragStart={() => handleDragStart(t.id, 'long')}
          onDragEnd={handleDragEnd}
          onDragOver={e => handleItemDragOver(e, t.id, 'long')}
          onDrop={e => handleItemDrop(e, t.id, 'long')}
          isDragOver={dragOverItem?.id === t.id && dragOverItem?.list === 'long' && !dragOverItem?.folderId}
        />
      )
    })
  }

  const plannerBtn = onChange && (
    <button className={styles.plannerLink} onClick={() => onChange('goals')}>
      Week Planner <IArrow />
    </button>
  )

  return (
    <Card title="To-Do" action={plannerBtn}>
      <div className={styles.columns}>
        <SectionShell
          title="Today"
          listKey="today"
          draggingRef={dragging}
          todos={todayTodos}
          onAdd={text => addTo('today', text)}
          onDrop={() => handleSectionDrop('today')}
          renderItems={() => renderItems('today', todayTodos)}
        />
        <div className={styles.divider} />
        <SectionShell
          title="This Week"
          listKey="week"
          draggingRef={dragging}
          todos={weekTodos}
          onAdd={text => addTo('week', text)}
          onDrop={() => handleSectionDrop('week')}
          renderItems={() => renderItems('week', weekTodos)}
        />
        <div className={styles.divider} />
        <SectionShell
          title="Long Term"
          listKey="long"
          draggingRef={dragging}
          todos={longTodos}
          onAdd={text => addTo('long', text)}
          onDrop={() => handleSectionDrop('long')}
          renderItems={() => renderItems('long', longTodos)}
          onAddFolder={addFolder}
          extraClass={styles.longTermSection}
        />
      </div>
    </Card>
  )
}

function SectionShell({ title, listKey, draggingRef, todos, onAdd, onDrop, renderItems, onAddFolder, extraClass }) {
  const [input, setInput] = useState('')
  const [folderInput, setFolderInput] = useState('')
  const [showFolderInput, setShowFolderInput] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  function add() {
    const text = input.trim()
    if (!text) return
    onAdd(text)
    setInput('')
  }

  function addFolder() {
    const name = folderInput.trim()
    if (!name || !onAddFolder) return
    onAddFolder(name)
    setFolderInput('')
    setShowFolderInput(false)
  }

  return (
    <div
      className={`${styles.section} ${dragOver ? styles.dropTarget : ''} ${extraClass || ''}`}
      onDragOver={e => {
        e.preventDefault()
        if (draggingRef.current && draggingRef.current.from !== listKey) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => { setDragOver(false); onDrop() }}
    >
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add a task…"
          maxLength={200}
        />
        <button className={styles.addBtn} onClick={add}>Add</button>
        {onAddFolder && (
          <button
            className={styles.addFolderBtn}
            onClick={() => setShowFolderInput(v => !v)}
            title="New folder"
            aria-label="New folder"
          >
            <FolderIcon />
          </button>
        )}
      </div>
      {showFolderInput && (
        <div className={styles.folderCreateRow}>
          <input
            className={styles.input}
            type="text"
            value={folderInput}
            onChange={e => setFolderInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addFolder(); if (e.key === 'Escape') setShowFolderInput(false) }}
            placeholder="Folder name…"
            maxLength={60}
            autoFocus
          />
          <button className={styles.addBtn} onClick={addFolder}>Create</button>
        </div>
      )}
      {todos.length === 0 ? (
        <p className={styles.empty}>{dragOver ? 'Drop here…' : "No tasks — you're clear ✦"}</p>
      ) : (
        <ul className={styles.list}>{renderItems()}</ul>
      )}
    </div>
  )
}
