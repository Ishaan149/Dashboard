export const PINNED_NOTE_ID = '__pinned__'
export const NOTE_TITLE_LIMIT = 200
export const NOTE_CONTENT_LIMIT = 50_000

function toRuntimeString(value) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function toEpoch(value) {
  return Number.isInteger(value) && value > 0 ? value : 0
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function runtimeRegularNote(record) {
  return {
    ...record,
    id: toRuntimeString(record.id),
    title: toRuntimeString(record.title),
    content: toRuntimeString(record.content),
    contentFormat: 'markdown',
    favorite: record.favorite === true,
    quickNote: record.quickNote === true,
    createdAt: toEpoch(record.createdAt),
    updatedAt: toEpoch(record.updatedAt),
  }
}

export function isValidRegularNote(record) {
  if (!isRecord(record)) return false
  const id = toRuntimeString(record.id)
  return id.length > 0 && id !== PINNED_NOTE_ID
}

export function normalizeRegularNotes(value, { warn = false } = {}) {
  if (!Array.isArray(value)) return []

  const seen = new Set()
  const normalized = []

  value.forEach((record, sourceIndex) => {
    if (!isValidRegularNote(record)) {
      if (warn && import.meta.env?.DEV) console.warn('Brain Dump skipped an invalid regular note record.')
      return
    }

    const note = runtimeRegularNote(record)
    if (seen.has(note.id)) {
      if (warn && import.meta.env?.DEV) console.warn('Brain Dump skipped a duplicate regular note ID.')
      return
    }

    seen.add(note.id)
    normalized.push({ ...note, sourceIndex })
  })

  return normalized
}

export function normalizePinnedNote(value) {
  const record = isRecord(value) ? value : {}
  return {
    ...record,
    id: PINNED_NOTE_ID,
    title: toRuntimeString(record.title),
    content: toRuntimeString(record.content),
    contentFormat: 'markdown',
    favorite: true,
    createdAt: toEpoch(record.createdAt),
    updatedAt: toEpoch(record.updatedAt),
  }
}

function validateNoteFields({ title, content }) {
  if (title.length > NOTE_TITLE_LIMIT) throw new RangeError(`Note titles cannot exceed ${NOTE_TITLE_LIMIT} characters.`)
  if (content.length > NOTE_CONTENT_LIMIT) throw new RangeError(`Note content cannot exceed ${NOTE_CONTENT_LIMIT} characters.`)
}

function findFirstValidIndex(notes, id) {
  if (!Array.isArray(notes)) return -1
  const target = toRuntimeString(id)
  const seen = new Set()

  for (let index = 0; index < notes.length; index += 1) {
    const record = notes[index]
    if (!isValidRegularNote(record)) continue
    const candidateId = toRuntimeString(record.id)
    if (seen.has(candidateId)) continue
    seen.add(candidateId)
    if (candidateId === target) return index
  }
  return -1
}

function writeForwardRegular(record, nextFields, now) {
  const current = runtimeRegularNote(record)
  return {
    ...record,
    id: current.id,
    title: nextFields.title,
    content: nextFields.content,
    contentFormat: 'markdown',
    favorite: nextFields.favorite,
    quickNote: nextFields.quickNote,
    createdAt: current.createdAt || now,
    updatedAt: now,
  }
}

export function updateBrainDumpNote(notes, id, changes, now = Date.now()) {
  if (!Number.isInteger(now) || now <= 0) throw new TypeError('now must be a positive integer epoch value')
  const index = findFirstValidIndex(notes, id)
  if (index < 0) return notes

  const current = runtimeRegularNote(notes[index])
  const next = {
    title: Object.hasOwn(changes, 'title') ? toRuntimeString(changes.title) : current.title,
    content: Object.hasOwn(changes, 'content') ? toRuntimeString(changes.content) : current.content,
    favorite: Object.hasOwn(changes, 'favorite') ? changes.favorite === true : current.favorite,
    quickNote: Object.hasOwn(changes, 'quickNote') ? changes.quickNote === true : current.quickNote,
  }
  validateNoteFields(next)

  if (next.title === current.title && next.content === current.content && next.favorite === current.favorite && next.quickNote === current.quickNote) return notes

  const updated = [...notes]
  updated[index] = writeForwardRegular(notes[index], next, now)
  return updated
}

export function updatePinnedNote(note, changes, now = Date.now()) {
  if (!Number.isInteger(now) || now <= 0) throw new TypeError('now must be a positive integer epoch value')
  const source = isRecord(note) ? note : {}
  const current = normalizePinnedNote(source)
  const nextTitle = Object.hasOwn(changes, 'title') ? toRuntimeString(changes.title) : current.title
  const nextContent = Object.hasOwn(changes, 'content') ? toRuntimeString(changes.content) : current.content
  validateNoteFields({ title: nextTitle, content: nextContent })

  if (nextTitle === current.title && nextContent === current.content) return note

  return {
    ...source,
    title: nextTitle,
    content: nextContent,
    contentFormat: 'markdown',
    createdAt: current.createdAt || now,
    updatedAt: now,
  }
}

function defaultIdFactory() {
  if (!globalThis.crypto?.randomUUID) throw new Error('crypto.randomUUID() is unavailable')
  return globalThis.crypto.randomUUID()
}

export function createBrainDumpNote(notes, {
  idFactory = defaultIdFactory,
  now = Date.now(),
  title = 'Untitled',
  content = '',
  quickNote = false,
} = {}) {
  if (!Number.isInteger(now) || now <= 0) throw new TypeError('now must be a positive integer epoch value')
  const nextTitle = toRuntimeString(title)
  const nextContent = toRuntimeString(content)
  validateNoteFields({ title: nextTitle, content: nextContent })

  const existingIds = new Set(normalizeRegularNotes(notes).map(note => note.id))
  let id = ''
  for (let attempt = 0; attempt < 10; attempt += 1) {
    id = toRuntimeString(idFactory())
    if (id && id !== PINNED_NOTE_ID && !existingIds.has(id)) break
    id = ''
  }
  if (!id) throw new Error('Unable to create a unique regular note ID')

  const note = {
    id,
    title: nextTitle,
    content: nextContent,
    contentFormat: 'markdown',
    favorite: false,
    quickNote: quickNote === true,
    createdAt: now,
    updatedAt: now,
  }

  return { note, notes: [note, ...(Array.isArray(notes) ? notes : [])] }
}

export function deleteBrainDumpNote(notes, id) {
  if (id === PINNED_NOTE_ID) return { deleted: false, notes, nextActiveId: null, reason: 'pinned' }
  const valid = normalizeRegularNotes(notes)
  if (valid.length <= 1) return { deleted: false, notes, nextActiveId: valid[0]?.id ?? null, reason: 'last-note' }

  const index = findFirstValidIndex(notes, id)
  if (index < 0) return { deleted: false, notes, nextActiveId: valid[0]?.id ?? null, reason: 'missing' }

  const nextNotes = notes.filter((_, sourceIndex) => sourceIndex !== index)
  return {
    deleted: true,
    notes: nextNotes,
    nextActiveId: normalizeRegularNotes(nextNotes)[0]?.id ?? null,
    reason: null,
  }
}

export function clearBrainDumpNote(notes, id, now = Date.now()) {
  const index = findFirstValidIndex(notes, id)
  if (index < 0) return { cleared: false, notes, reason: 'missing' }
  const current = runtimeRegularNote(notes[index])
  if (!current.content) return { cleared: false, notes, reason: 'empty' }
  return { cleared: true, notes: updateBrainDumpNote(notes, id, { content: '' }, now), reason: null }
}

export function clearPinnedNote(note, now = Date.now()) {
  const current = normalizePinnedNote(note)
  if (!current.content) return { cleared: false, note, reason: 'empty' }
  return { cleared: true, note: updatePinnedNote(note, { content: '' }, now), reason: null }
}
