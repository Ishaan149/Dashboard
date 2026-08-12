import { normalizePinnedNote, normalizeRegularNotes, PINNED_NOTE_ID } from './brainDump'

export const NOTE_PREVIEW_LIMIT = 160
export const PALETTE_NOTE_LIMIT = 50

export function normalizeNoteSearchText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/gu, ' ')
}

function searchTokens(value) {
  return normalizeNoteSearchText(value).match(/[\p{L}\p{N}_]+/gu) ?? []
}

function everyTokenHasPrefix(queryTokens, candidateTokens) {
  return queryTokens.length > 0 && queryTokens.every(query => candidateTokens.some(candidate => candidate.startsWith(query)))
}

export function matchNote(note, query) {
  const normalizedQuery = normalizeNoteSearchText(query)
  if (!normalizedQuery) return { matches: true, tier: null, kind: 'default' }

  const queryTokens = searchTokens(normalizedQuery)
  if (!queryTokens.length) return { matches: false, tier: null, kind: null }

  const title = normalizeNoteSearchText(note.title)
  const titleTokens = searchTokens(note.title)
  const bodyTokens = searchTokens(note.content)

  if (title === normalizedQuery) return { matches: true, tier: 0, kind: 'title' }
  if (title.startsWith(normalizedQuery)) return { matches: true, tier: 1, kind: 'title' }
  if (everyTokenHasPrefix(queryTokens, titleTokens)) return { matches: true, tier: 2, kind: 'title' }
  if (everyTokenHasPrefix(queryTokens, [...titleTokens, ...bodyTokens])) return { matches: true, tier: 3, kind: 'body' }
  return { matches: false, tier: null, kind: null }
}

function collapsedContent(content) {
  return String(content ?? '').replace(/\s+/gu, ' ').trim()
}

function boundedExcerpt(text, start = 0) {
  if (!text) return 'Empty note'
  const safeStart = Math.max(0, Math.min(start, text.length))
  const hasPrefix = safeStart > 0
  const prefix = hasPrefix ? '…' : ''
  const available = NOTE_PREVIEW_LIMIT - prefix.length
  let excerpt = text.slice(safeStart, safeStart + available)
  const hasSuffix = safeStart + excerpt.length < text.length
  if (hasSuffix) excerpt = `${excerpt.slice(0, Math.max(0, available - 1)).trimEnd()}…`
  return `${prefix}${excerpt}`.slice(0, NOTE_PREVIEW_LIMIT)
}

function firstBodyTokenIndex(content, query) {
  const text = normalizeNoteSearchText(content)
  const tokens = searchTokens(query)
  if (!text || !tokens.length) return 0

  let earliest = Number.POSITIVE_INFINITY
  for (const queryToken of tokens) {
    const expression = new RegExp(`(^|[^\\p{L}\\p{N}_])(${escapeRegExp(queryToken)})`, 'gu')
    const match = expression.exec(text)
    if (match) earliest = Math.min(earliest, match.index + match[1].length)
  }
  return Number.isFinite(earliest) ? earliest : 0
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getNotePreview(note, query = '', matchKind = 'title') {
  const content = collapsedContent(note.content)
  if (!content) return 'Empty note'
  if (!query || matchKind !== 'body') return boundedExcerpt(content)

  const matchIndex = firstBodyTokenIndex(content, query)
  const contextStart = Math.max(0, matchIndex - 48)
  return boundedExcerpt(content, contextStart)
}

function resultFor(note, query, match) {
  return {
    ...note,
    preview: getNotePreview(note, query, match.kind),
    matchKind: match.kind,
    matchTier: match.tier,
  }
}

export function getBrainDumpPageResults({ notes, pinnedNote, query = '', favoritesOnly = false, quickNotesOnly = false }) {
  const normalizedNotes = normalizeRegularNotes(notes)
  const normalizedPinned = normalizePinnedNote(pinnedNote)
  const normalizedQuery = normalizeNoteSearchText(query)

  const pinnedMatch = matchNote(normalizedPinned, normalizedQuery)
  const pinned = (!favoritesOnly || normalizedPinned.favorite) && !quickNotesOnly && pinnedMatch.matches
    ? resultFor(normalizedPinned, normalizedQuery, pinnedMatch)
    : null

  const regular = normalizedNotes
    .map((note, order) => ({ note, order, match: matchNote(note, normalizedQuery) }))
    .filter(({ note, match }) => match.matches
      && (!favoritesOnly || note.favorite)
      && (!quickNotesOnly || note.quickNote))
    .sort((a, b) => {
      if (!normalizedQuery) return a.order - b.order
      return a.match.tier - b.match.tier || a.order - b.order
    })
    .map(({ note, match }) => resultFor(note, normalizedQuery, match))

  return { pinned, regular, count: regular.length + (pinned ? 1 : 0) }
}

function providerResult(note) {
  return {
    id: note.id,
    providerId: 'notes',
    group: 'notes',
    label: note.title || 'Untitled',
    detail: getNotePreview(note),
    searchText: [note.title, note.content],
    target: { view: 'braindump', target: { kind: 'note', id: note.id } },
  }
}

export const brainDumpSearchProvider = Object.freeze({
  id: 'notes',
  getResults(snapshot = {}) {
    const pinned = normalizePinnedNote(snapshot.pinnedNote ?? snapshot.brainDumpPinnedNote)
    const regular = normalizeRegularNotes(snapshot.notes ?? snapshot.brainDumpNotes)
    return [providerResult(pinned), ...regular.map(providerResult)].slice(0, PALETTE_NOTE_LIMIT)
  },
})

export function isBrainDumpNoteTarget(intent) {
  return intent?.view === 'braindump'
    && intent?.target?.kind === 'note'
    && typeof intent.target.id === 'string'
    && (intent.target.id === PINNED_NOTE_ID || intent.target.id.length > 0)
}
