export const PROJECT_ICONS = [
  { id: 'folder', label: 'Folder', path: 'M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7ZM3 9h18' },
  { id: 'code', label: 'Code', path: 'm8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16' },
  { id: 'book', label: 'Book', path: 'M12 5v16M3 3h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z' },
  { id: 'globe', label: 'Globe', path: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 12h20M12 2a19 19 0 0 1 0 20 19 19 0 0 1 0-20Z' },
  { id: 'briefcase', label: 'Briefcase', path: 'M4 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2ZM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 12h20M12 12v2' },
  { id: 'lightbulb', label: 'Lightbulb', path: 'M9 18h6v-3.3a7 7 0 1 0-6 0V18ZM9 21h6' },
  { id: 'target', label: 'Target', path: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-4 0a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-4 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z' },
  { id: 'palette', label: 'Palette', path: 'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.4-3.4 1.5 1.5 0 0 1 1.1-2.6H18a3 3 0 0 0 3-3 9 9 0 0 0-9-9ZM7 10h.01M10 7h.01M15 7h.01M17 11h.01' },
  { id: 'plane', label: 'Plane', path: 'm22 2-7 20-4-9L2 9 22 2ZM11 13l6-6' },
  { id: 'heart', label: 'Heart', path: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z' },
  { id: 'music', label: 'Music', path: 'M9 18V5l12-2v13M9 9l12-2M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' },
  { id: 'rocket', label: 'Rocket', path: 'M12 16 8 12s2-9 13-9c0 11-9 13-9 13ZM8 12H3l3-6h5m1 10v5l6-3v-5M7 17s-4 0-4 4c4 0 4-4 4-4Zm10-9h.01' },
]

export function getProjectIcon(icon) {
  return PROJECT_ICONS.find(option => option.id === icon) ?? PROJECT_ICONS[0]
}

export default function ProjectIcon({ name, size = 24 }) {
  const icon = getProjectIcon(name)
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-project-icon={icon.id}><path d={icon.path} /></svg>
}
