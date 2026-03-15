import { useState, useRef, useEffect, useCallback } from 'react'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import TimeBlock from './TimeBlock'
import BlockEditPanel from './BlockEditPanel'
import styles from './DayPlanner.module.css'

const HOUR_HEIGHT  = 64        // px per hour
const PX_PER_MIN   = HOUR_HEIGHT / 60

export default function DayPlanner() {
  const [blocks, setBlocks] = useSyncedStorage('dayplanner-blocks', [])
  const [settings, setSettings] = useSyncedStorage('dayplanner-settings', { startHour: 10, endHour: 27 })
  const [selectedId, setSelectedId] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const resizeRef        = useRef(null)
  const dragRef          = useRef(null)
  const suppressClick    = useRef(false)
  const gridRef          = useRef(null)

  const totalHours = settings.endHour - settings.startHour
  const gridHeight = totalHours * HOUR_HEIGHT

  // ── Clamp blocks when schedule range changes ───────────────────────────
  useEffect(() => {
    const { startHour, endHour } = settings
    setBlocks(prev => prev.map(b => {
      const clampedStart = Math.max(startHour * 60, Math.min(b.startMinutes, endHour * 60 - 15))
      const clampedEnd   = Math.min(endHour * 60, Math.max(b.endMinutes, clampedStart + 15))
      if (clampedStart === b.startMinutes && clampedEnd === b.endMinutes) return b
      return { ...b, startMinutes: clampedStart, endMinutes: clampedEnd }
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.startHour, settings.endHour])

  // ── Selected block object ──────────────────────────────────────────────
  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null

  // ── "Now" line ────────────────────────────────────────────────────────
  function calcNowMinutes() {
    const d = new Date()
    const raw = d.getHours() * 60 + d.getMinutes()
    // If schedule spans midnight and current time is in the next-day portion, offset by 1440
    if (settings.endHour > 24 && raw < (settings.endHour - 24) * 60) {
      return raw + 1440
    }
    return raw
  }

  const [nowMinutes, setNowMinutes] = useState(calcNowMinutes)
  useEffect(() => {
    const id = setInterval(() => setNowMinutes(calcNowMinutes()), 60_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.endHour])
  const nowTop = (nowMinutes - settings.startHour * 60) * PX_PER_MIN
  const showNow = nowMinutes >= settings.startHour * 60 && nowMinutes <= settings.endHour * 60

  // ── Resize handlers ───────────────────────────────────────────────────
  const handleResizeMove = useCallback((e) => {
    if (!resizeRef.current) return
    const { blockId, startY, originalEndMinutes } = resizeRef.current
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    const deltaMin = (e.clientY - startY) / PX_PER_MIN
    const snapped  = Math.round((originalEndMinutes + deltaMin) / 15) * 15
    const clamped  = Math.max(block.startMinutes + 15, Math.min(snapped, settings.endHour * 60))

    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, endMinutes: clamped } : b))
  }, [blocks, settings.endHour, setBlocks])

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
    resizeRef.current = { blockId, startY: e.clientY, originalEndMinutes: block.endMinutes }
    document.body.style.cursor = 'ns-resize'
    window.addEventListener('mousemove', handleResizeMove)
    window.addEventListener('mouseup', handleResizeEnd)
  }, [blocks, handleResizeMove, handleResizeEnd])

  // ── Drag-to-move handlers ─────────────────────────────────────────────
  const handleDragMove = useCallback((e) => {
    if (!dragRef.current) return
    const { blockId, startY, originalStart, originalEnd, duration } = dragRef.current
    const deltaMin = (e.clientY - startY) / PX_PER_MIN

    if (Math.abs(e.clientY - startY) > 4) dragRef.current.moved = true
    if (!dragRef.current.moved) return

    const snappedStart = Math.round((originalStart + deltaMin) / 15) * 15
    const clampedStart = Math.max(settings.startHour * 60, Math.min(snappedStart, settings.endHour * 60 - duration))
    const clampedEnd   = clampedStart + duration

    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, startMinutes: clampedStart, endMinutes: clampedEnd } : b))
  }, [settings.startHour, settings.endHour, setBlocks])

  const handleDragEnd = useCallback((e) => {
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

  // ── Click-to-create ────────────────────────────────────────────────────
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
      category:     'work',
      startMinutes,
      endMinutes,
    }
    setBlocks(prev => [...prev, newBlock])
    setSelectedId(newBlock.id)
  }

  // ── Block updates ──────────────────────────────────────────────────────
  function handleUpdate(patch) {
    setBlocks(prev => prev.map(b => b.id === selectedId ? { ...b, ...patch } : b))
  }

  function handleDelete() {
    setBlocks(prev => prev.filter(b => b.id !== selectedId))
    setSelectedId(null)
  }

  // ── Hour labels ────────────────────────────────────────────────────────
  function formatHourLabel(h) {
    const actual = h % 24
    const ampm = actual >= 12 ? 'PM' : 'AM'
    const h12  = actual % 12 || 12
    return `${h12} ${ampm}`
  }

  const hours = []
  for (let h = settings.startHour; h <= settings.endHour; h++) {
    hours.push({ h, label: formatHourLabel(h) })
  }

  // ── Settings bar values ────────────────────────────────────────────────
  const MAX_END_HOUR = 28  // allows schedule up to 4 AM next day
  const hourOptions = Array.from({ length: MAX_END_HOUR + 1 }, (_, i) => i)

  return (
    <div className={styles.root}>
      {/* Settings bar */}
      <div className={styles.settingsBar}>
        <div className={styles.settingsGroup}>
          <label className={styles.settingsLabel}>Start</label>
          <select
            className={styles.settingsSelect}
            value={settings.startHour}
            onChange={e => setSettings(s => ({ ...s, startHour: Math.min(Number(e.target.value), s.endHour - 1) }))}
          >
            {hourOptions.map(h => (
              <option key={h} value={h}>{formatHourLabel(h)}{h >= 24 ? ' +' : ''}</option>
            ))}
          </select>
        </div>
        <div className={styles.settingsGroup}>
          <label className={styles.settingsLabel}>End</label>
          <select
            className={styles.settingsSelect}
            value={settings.endHour}
            onChange={e => setSettings(s => ({ ...s, endHour: Math.max(Number(e.target.value), s.startHour + 1) }))}
          >
            {hourOptions.map(h => (
              <option key={h} value={h}>{formatHourLabel(h)}{h >= 24 ? ' +' : ''}</option>
            ))}
          </select>
        </div>
        <div className={styles.settingsSpacer} />
        {!showClearConfirm ? (
          <button className={styles.clearBtn} onClick={() => setShowClearConfirm(true)}>
            Clear Day
          </button>
        ) : (
          <div className={styles.confirmRow}>
            <span className={styles.confirmText}>Clear all blocks?</span>
            <button className={styles.confirmYes} onClick={() => { setBlocks([]); setSelectedId(null); setShowClearConfirm(false) }}>Yes</button>
            <button className={styles.confirmNo}  onClick={() => setShowClearConfirm(false)}>No</button>
          </div>
        )}
      </div>

      {/* Main row */}
      <div className={styles.body}>
        {/* Timeline */}
        <div className={styles.timelineWrap}>
          <div
            className={styles.grid}
            ref={gridRef}
            style={{ height: gridHeight }}
            onClick={handleGridClick}
          >
            {/* Hour rows */}
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

            {/* "Now" indicator */}
            {showNow && (
              <div className={styles.nowLine} style={{ top: nowTop }}>
                <div className={styles.nowDot} />
              </div>
            )}

            {/* Blocks */}
            {blocks.map(block => (
              <TimeBlock
                key={block.id}
                block={block}
                isSelected={block.id === selectedId}
                onSelect={setSelectedId}
                onResizeStart={handleResizeStart}
                onDragStart={handleDragStart}
                pixelsPerMin={PX_PER_MIN}
                startHour={settings.startHour}
              />
            ))}
          </div>
        </div>

        {/* Edit panel */}
        <BlockEditPanel
          block={selectedBlock}
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
