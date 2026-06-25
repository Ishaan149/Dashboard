import { useState } from 'react'
import { COLOR_PRESETS } from '../data/categories'
import styles from './DayPlanner.module.css'

function buildTimeOptions(startHour, endHour) {
  const opts = []
  for (let mins = startHour * 60; mins <= endHour * 60; mins += 15) {
    const h = Math.floor(mins / 60)
    const actual = h % 24
    const m = mins % 60
    const ampm = actual >= 12 ? 'PM' : 'AM'
    const h12  = actual % 12 || 12
    const suffix = h >= 24 ? ' +' : ''
    const label = `${h12}:${String(m).padStart(2, '0')} ${ampm}${suffix}`
    opts.push({ value: mins, label })
  }
  return opts
}

export default function BlockEditPanel({ block, categories, onAddCategory, onRemoveCategory, onUpdate, onDelete, onClose, startHour, endHour }) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0])

  if (!block) return null

  const TIME_OPTIONS = buildTimeOptions(startHour, endHour)

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    onAddCategory({ id: `cat-${Date.now()}`, label: name, color: newColor })
    setNewName('')
    setNewColor(COLOR_PRESETS[0])
    setIsAdding(false)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Edit Block</span>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className={styles.panelBody}>
        <label className={styles.fieldLabel}>Label</label>
        <input
          className={styles.fieldInput}
          value={block.label}
          onChange={e => onUpdate({ label: e.target.value })}
          placeholder="What are you doing?"
          autoFocus
        />

        <label className={styles.fieldLabel}>Category</label>
        <div className={styles.categoryRow}>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`${styles.catBtn} ${block.category === cat.id ? styles.catBtnActive : ''}`}
              style={{ '--cat-color': cat.color }}
              onClick={() => onUpdate({ category: cat.id })}
            >
              <span className={styles.catDot} style={{ background: cat.color }} />
              {cat.label}
              {categories.length > 1 && (
                <span
                  className={styles.catRemove}
                  onClick={e => { e.stopPropagation(); onRemoveCategory(cat.id) }}
                  title={`Remove ${cat.label}`}
                >×</span>
              )}
            </button>
          ))}
          <button
            className={`${styles.catBtn} ${styles.catAddBtn}`}
            onClick={() => setIsAdding(v => !v)}
            title="New category"
          >+</button>
        </div>

        {isAdding && (
          <div className={styles.newCatForm}>
            <input
              className={styles.fieldInput}
              placeholder="Category name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false) }}
              autoFocus
            />
            <div className={styles.colorPresets}>
              {COLOR_PRESETS.map(c => (
                <span
                  key={c}
                  className={`${styles.colorSwatch} ${newColor === c ? styles.colorSwatchActive : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <div className={styles.newCatActions}>
              <button className={styles.cancelCatBtn} onClick={() => setIsAdding(false)}>Cancel</button>
              <button className={styles.addCatBtn} onClick={handleAdd} disabled={!newName.trim()}>Add</button>
            </div>
          </div>
        )}

        <div className={styles.timeRow}>
          <div className={styles.timeField}>
            <label className={styles.fieldLabel}>Start</label>
            <select
              className={styles.fieldSelect}
              value={block.startMinutes}
              onChange={e => {
                const start = Number(e.target.value)
                const end = Math.max(block.endMinutes, start + 15)
                onUpdate({ startMinutes: start, endMinutes: end })
              }}
            >
              {TIME_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.timeField}>
            <label className={styles.fieldLabel}>End</label>
            <select
              className={styles.fieldSelect}
              value={block.endMinutes}
              onChange={e => {
                const end = Number(e.target.value)
                const start = Math.min(block.startMinutes, end - 15)
                onUpdate({ endMinutes: end, startMinutes: start })
              }}
            >
              {TIME_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.panelFooter}>
        <button className={styles.deleteBtn} onClick={onDelete}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
          Delete block
        </button>
      </div>
    </div>
  )
}
