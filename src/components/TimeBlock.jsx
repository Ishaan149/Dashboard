const CATEGORY_COLORS = {
  work: '#10b981',
  gym:  '#f59e0b',
  uni:  '#6366f1',
  rest: '#6b7280',
}

const CATEGORY_LABELS = {
  work: 'Work',
  gym:  'Gym',
  uni:  'Uni',
  rest: 'Rest',
}

export default function TimeBlock({ block, isSelected, onSelect, onResizeStart, onDragStart, pixelsPerMin, startHour }) {
  const top    = (block.startMinutes - startHour * 60) * pixelsPerMin
  const height = Math.max((block.endMinutes - block.startMinutes) * pixelsPerMin, 20)
  const color  = CATEGORY_COLORS[block.category] ?? CATEGORY_COLORS.work

  return (
    <div
      onMouseDown={(e) => { if (e.button !== 0) return; onDragStart(e, block.id) }}
      style={{
        position: 'absolute',
        top:    `${top}px`,
        height: `${height}px`,
        left:   '68px',
        right:  '12px',
        background: `${color}22`,
        border: `1.5px solid ${color}88`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '6px',
        padding: '4px 8px',
        cursor: 'grab',
        boxSizing: 'border-box',
        overflow: 'hidden',
        outline: isSelected ? `2px solid ${color}` : 'none',
        outlineOffset: '1px',
        zIndex: isSelected ? 2 : 1,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{
          fontSize: '12px',
          fontWeight: 500,
          color: '#e2e8f0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {block.label || CATEGORY_LABELS[block.category] || 'Untitled'}
        </span>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); onResizeStart(e, block.id) }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '8px',
          cursor: 'ns-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 24, height: 2, borderRadius: 1, background: `${color}66` }} />
      </div>
    </div>
  )
}
