export default function TimeBlock({ block, categories, isSelected, onSelect, onResizeStart, onDragStart, pixelsPerMin, startHour }) {
  const top    = (block.startMinutes - startHour * 60) * pixelsPerMin
  const height = Math.max((block.endMinutes - block.startMinutes) * pixelsPerMin, 20)
  const cat    = categories.find(c => c.id === block.category) ?? categories[0]
  const color  = cat?.color ?? 'oklch(0.72 0.085 160)'

  return (
    <div
      onMouseDown={(e) => { if (e.button !== 0) return; onDragStart(e, block.id) }}
      style={{
        position: 'absolute',
        top:    `${top}px`,
        height: `${height}px`,
        left:   '68px',
        right:  '12px',
        background: `color-mix(in srgb, ${color} 13%, transparent)`,
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
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '3px', background: color }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, paddingTop: '2px', paddingLeft: '5px' }}>
        <span style={{
          fontSize: '13.5px',
          fontWeight: 500,
          color: '#e2e8f0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {block.label || cat?.label || 'Untitled'}
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
        <div style={{ width: 24, height: 2, borderRadius: 1, background: `color-mix(in srgb, ${color} 40%, transparent)` }} />
      </div>
    </div>
  )
}
