import { useState, useRef, useEffect, useCallback } from 'react'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import TimeBlock from './TimeBlock'
import BlockEditPanel from './BlockEditPanel'
import { DEFAULT_CATEGORIES } from '../data/categories'
import { formatMinutes, getScheduleMinutes } from '../utils/time'
import styles from './DayPlanner.module.css'

const HOUR_HEIGHT  = 64
const PX_PER_MIN   = HOUR_HEIGHT / 60
function timeValue(hour) {
  const minutes = Math.round(hour * 60) % (24 * 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function RangeTimeInput({ label, value, onChange, nextDay }) {
  return (
    <div className={styles.settingsGroup}>
      <div className={styles.fieldHeading}>
        <label className={styles.settingsLabel} htmlFor={`planner-${label.toLowerCase()}`}>{label}</label>
        {nextDay && <span className={styles.nextDayLabel}>Next day</span>}
      </div>
      <div className={styles.timeControl}>
        <input id={`planner-${label.toLowerCase()}`} className={styles.settingsTime} type="time" step="900" value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  )
}

export default function DayPlanner() {
  const [blocks, setBlocks]         = useSyncedStorage('dayplanner-blocks', [])
  const [settings, setSettings]     = useSyncedStorage('dayplanner-settings', { startHour: 10, endHour: 27 })
  const [categories, setCategories] = useSyncedStorage('dayplanner-categories', DEFAULT_CATEGORIES)
  const [selectedId, setSelectedId] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [openPopover, setOpenPopover] = useState(null)
  const [startDraft, setStartDraft] = useState(() => timeValue(settings.startHour))
  const [endDraft, setEndDraft] = useState(() => timeValue(settings.endHour))
  const settingsBarRef = useRef(null)

  useEffect(() => {
    if (!openPopover) return
    function dismiss(e) {
      if (e.type === 'keydown' && e.key !== 'Escape') return
      if (e.type === 'pointerdown' && settingsBarRef.current?.contains(e.target)) return
      setOpenPopover(null)
      setShowClearConfirm(false)
      setStartDraft(timeValue(settings.startHour))
      setEndDraft(timeValue(settings.endHour))
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', dismiss)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', dismiss)
    }
  }, [openPopover, settings.startHour, settings.endHour])

  useEffect(() => {
    setStartDraft(timeValue(settings.startHour))
    setEndDraft(timeValue(settings.endHour))
  }, [settings.startHour, settings.endHour])

  function draftMinutes(value) {
    if (!/^\d{2}:\d{2}$/.test(value)) return null
    const [hours, minutes] = value.split(':').map(Number)
    return minutes % 15 === 0 ? hours * 60 + minutes : null
  }
  const draftStart = draftMinutes(startDraft)
  const draftEnd = draftMinutes(endDraft)
  const validDraft = draftStart !== null && draftEnd !== null
  const endNextDay = validDraft && draftEnd <= draftStart
  const endAbsolute = validDraft ? draftEnd + (endNextDay ? 1440 : 0) : null
  const rangeChanged = validDraft && (draftStart !== settings.startHour * 60 || endAbsolute !== settings.endHour * 60)

  const resizeRef        = useRef(null)
  const dragRef          = useRef(null)
  const suppressClick    = useRef(false)
  const gridRef          = useRef(null)

  const totalHours = settings.endHour - settings.startHour
  const gridHeight = totalHours * HOUR_HEIGHT

  useEffect(() => {
    const { startHour, endHour } = settings
    setBlocks(prev => prev.map(b => {
      const clampedStart = Math.max(startHour * 60, Math.min(b.startMinutes, endHour * 60 - 15))
      const clampedEnd   = Math.min(endHour * 60, Math.max(b.endMinutes, clampedStart + 15))
      if (clampedStart === b.startMinutes && clampedEnd === b.endMinutes) return b
      return { ...b, startMinutes: clampedStart, endMinutes: clampedEnd }
    }))
  }, [settings.startHour, settings.endHour, setBlocks])

  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null

  const [nowMinutes, setNowMinutes] = useState(() => getScheduleMinutes(settings.endHour))
  useEffect(() => {
    setNowMinutes(getScheduleMinutes(settings.endHour))
    const id = setInterval(() => setNowMinutes(getScheduleMinutes(settings.endHour)), 60_000)
    return () => clearInterval(id)
  }, [settings.endHour])
  const nowTop = (nowMinutes - settings.startHour * 60) * PX_PER_MIN
  const showNow = nowMinutes >= settings.startHour * 60 && nowMinutes <= settings.endHour * 60

  const handleResizeMove = useCallback((e) => {
    if (!resizeRef.current) return
    const { blockId, startY, originalEndMinutes, startMinutes } = resizeRef.current

    const deltaMin = (e.clientY - startY) / PX_PER_MIN
    const snapped  = Math.round((originalEndMinutes + deltaMin) / 15) * 15
    const clamped  = Math.max(startMinutes + 15, Math.min(snapped, settings.endHour * 60))

    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, endMinutes: clamped } : b))
  }, [settings.endHour, setBlocks])

  const handleResizeEnd = useCallback(() => {
    if (resizeRef.current) suppressClick.current = true
    resizeRef.current = null
    document.body.style.cursor = ''
    window.removeEventListener('mousemove', handleResizeMove)
    window.removeEventListener('mouseup', handleResizeEnd)
  }, [handleResizeMove])

  const handleResizeStart = useCallback((e, blockId) => {
    e.preventDefault()
    const block = blocks.find(b => b.id === blockId)
    if (!block) return
    resizeRef.current = {
      blockId,
      startY: e.clientY,
      originalEndMinutes: block.endMinutes,
      startMinutes: block.startMinutes,
    }
    document.body.style.cursor = 'ns-resize'
    window.addEventListener('mousemove', handleResizeMove)
    window.addEventListener('mouseup', handleResizeEnd)
  }, [blocks, handleResizeMove, handleResizeEnd])

  const handleDragMove = useCallback((e) => {
    if (!dragRef.current) return
    const { blockId, startY, originalStart, duration } = dragRef.current
    const deltaMin = (e.clientY - startY) / PX_PER_MIN

    if (Math.abs(e.clientY - startY) > 4) dragRef.current.moved = true
    if (!dragRef.current.moved) return

    const snappedStart = Math.round((originalStart + deltaMin) / 15) * 15
    const clampedStart = Math.max(settings.startHour * 60, Math.min(snappedStart, settings.endHour * 60 - duration))
    const clampedEnd   = clampedStart + duration

    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, startMinutes: clampedStart, endMinutes: clampedEnd } : b))
  }, [settings.startHour, settings.endHour, setBlocks])

  const handleDragEnd = useCallback(() => {
    if (!dragRef.current) return
    const { blockId, moved } = dragRef.current
    suppressClick.current = true
    if (!moved) setSelectedId(blockId)
    dragRef.current = null
    document.body.style.cursor = ''
    window.removeEventListener('mousemove', handleDragMove)
    window.removeEventListener('mouseup', handleDragEnd)
  }, [handleDragMove])

  const handleDragStart = useCallback((e, blockId) => {
    e.preventDefault()
    e.stopPropagation()
    const block = blocks.find(b => b.id === blockId)
    if (!block) return
    dragRef.current = {
      blockId,
      startY: e.clientY,
      originalStart: block.startMinutes,
      duration: block.endMinutes - block.startMinutes,
      moved: false,
    }
    document.body.style.cursor = 'grabbing'
    window.addEventListener('mousemove', handleDragMove)
    window.addEventListener('mouseup', handleDragEnd)
  }, [blocks, handleDragMove, handleDragEnd])

  function handleGridClick(e) {
    if (suppressClick.current) { suppressClick.current = false; return }
    const rect = gridRef.current.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const clickedMinuteOffset = clickY / PX_PER_MIN
    const snappedOffset = Math.floor(clickedMinuteOffset / 60) * 60
    const startMinutes = settings.startHour * 60 + snappedOffset
    const endMinutes   = Math.min(startMinutes + 60, settings.endHour * 60)

    const newBlock = {
      id:           Date.now().toString(),
      label:        '',
      category:     categories[0]?.id ?? 'work',
      startMinutes,
      endMinutes,
    }
    setBlocks(prev => [...prev, newBlock])
    setSelectedId(newBlock.id)
  }

  function handleUpdate(patch) {
    setBlocks(prev => prev.map(b => b.id === selectedId ? { ...b, ...patch } : b))
  }

  function handleDelete() {
    setBlocks(prev => prev.filter(b => b.id !== selectedId))
    setSelectedId(null)
  }

  function addCategory(cat) {
    setCategories(prev => [...prev, cat])
  }

  function removeCategory(id) {
    const remaining = categories.filter(c => c.id !== id)
    const fallback  = remaining[0]?.id ?? 'work'
    setCategories(remaining)
    setBlocks(prev => prev.map(b => b.category === id ? { ...b, category: fallback } : b))
  }

  function formatHourLabel(h) {
    return `${formatMinutes(h * 60, { compact: true })}${h >= 24 ? ' +1' : ''}`
  }

  const hours = []
  for (let h = settings.startHour; h <= settings.endHour; h++) {
    hours.push({ h, label: formatHourLabel(h) })
  }

  return (
    <div className={styles.root}>
      <div className={styles.settingsBar} ref={settingsBarRef}>
        <div className={styles.popoverAnchor}>
          <button className={styles.rangeButton} aria-label="Edit schedule hours" aria-expanded={openPopover === 'range'} onClick={() => {
            setStartDraft(timeValue(settings.startHour)); setEndDraft(timeValue(settings.endHour))
            setOpenPopover(openPopover === 'range' ? null : 'range'); setShowClearConfirm(false)
          }}>
            <svg className={styles.toolbarIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>{formatMinutes(settings.startHour * 60)} – {formatMinutes(settings.endHour * 60)}</span>
            {settings.endHour >= 24 && <span className={styles.nextDayLabel}>+1</span>}
            <svg className={styles.chevron} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {openPopover === 'range' && <div className={styles.popover} role="group" aria-label="Schedule hours">
            <div className={styles.popoverTitle}>Schedule hours</div>
            <RangeTimeInput label="Start" value={startDraft} onChange={setStartDraft} />
            <RangeTimeInput label="End" value={endDraft} onChange={setEndDraft} nextDay={endNextDay} />
            {!validDraft && <span className={styles.rangeHint}>Choose times in 15-minute increments</span>}
            <button className={styles.applyBtn} disabled={!rangeChanged} onClick={() => { setSettings(s => ({ ...s, startHour: draftStart / 60, endHour: endAbsolute / 60 })); setOpenPopover(null) }}>Apply</button>
          </div>}
        </div>
        <div className={styles.clearAnchor}>
            {!showClearConfirm ? <button className={styles.clearBtn} onClick={() => { setOpenPopover(null); setShowClearConfirm(true) }}>Clear</button> : <div className={styles.confirmRow}>
              <span className={styles.confirmText}>Clear all blocks?</span>
              <div className={styles.confirmActions}><button className={styles.confirmNo} onClick={() => setShowClearConfirm(false)}>Cancel</button>
              <button className={styles.confirmYes} onClick={() => { setBlocks([]); setSelectedId(null); setShowClearConfirm(false); setOpenPopover(null) }}>Clear day</button></div>
            </div>}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.timelineWrap}>
          <div
            className={styles.grid}
            ref={gridRef}
            style={{ height: gridHeight }}
            onClick={handleGridClick}
          >
            {hours.map(({ h, label }) => (
              <div
                key={h}
                className={styles.hourRow}
                style={{ top: (h - settings.startHour) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              >
                <span className={styles.hourLabel}>{label}</span>
                <div className={styles.hourLine} />
              </div>
            ))}

            {showNow && (
              <div className={styles.nowLine} style={{ top: nowTop }}>
                <div className={styles.nowDot} />
              </div>
            )}

            {blocks.map(block => (
              <TimeBlock
                key={block.id}
                block={block}
                categories={categories}
                isSelected={block.id === selectedId}
                onResizeStart={handleResizeStart}
                onDragStart={handleDragStart}
                pixelsPerMin={PX_PER_MIN}
                startHour={settings.startHour}
              />
            ))}
          </div>
        </div>

        <BlockEditPanel
          block={selectedBlock}
          categories={categories}
          onAddCategory={addCategory}
          onRemoveCategory={removeCategory}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setSelectedId(null)}
          startHour={settings.startHour}
          endHour={settings.endHour}
        />
      </div>
    </div>
  )
}
