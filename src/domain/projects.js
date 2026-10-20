// Move within one visible group, preserving the positions of all other records.
export function moveWithinGroup(items, sourceId, targetId, belongsToGroup, position) {
  const group = items.filter(belongsToGroup)
  const from = group.findIndex(item => item.id === sourceId)
  const to = group.findIndex(item => item.id === targetId)
  if (from < 0 || to < 0 || from === to) return items
  const [moved] = group.splice(from, 1)
  const insertion = position
    ? group.findIndex(item => item.id === targetId) + (position === 'after' ? 1 : 0)
    : to
  group.splice(insertion, 0, moved)
  let index = 0
  return items.map(item => belongsToGroup(item) ? group[index++] : item)
}

export function sortProjectNotes(notes) {
  return [...notes].sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
