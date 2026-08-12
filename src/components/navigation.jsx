export const NAV_ITEMS = Object.freeze([
  { id: 'overview', label: 'Today', mobileLabel: 'Today', icon: 'today' },
  { id: 'todo', label: 'To-Do', mobileLabel: 'To-Do', icon: 'todo' },
  { id: 'braindump', label: 'Brain Dump', mobileLabel: 'Brain', icon: 'brain' },
  { id: 'jobs', label: 'Job Applications', mobileLabel: 'Jobs', icon: 'jobs' },
  { id: 'habits', label: 'Habits', mobileLabel: 'Habits', icon: 'habits' },
  { id: 'dayplanner', label: 'Day Planner', mobileLabel: 'Planner', icon: 'planner' },
])

export function getViewLabel(viewId) {
  return NAV_ITEMS.find(item => item.id === viewId)?.label ?? 'Dashboard'
}

export function NavigationIcon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  if (name === 'today') {
    return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  }
  if (name === 'todo') {
    return <svg {...common}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
  }
  if (name === 'brain') {
    return <svg {...common}><path d="M12 2a7 7 0 00-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26A7 7 0 0012 2z"/><path d="M9 21h6"/></svg>
  }
  if (name === 'jobs') {
    return <svg {...common}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M2 12h20"/><path d="M12 12h.01"/></svg>
  }
  if (name === 'habits') {
    return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>
  }
  return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/></svg>
}

export function LockIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  )
}
