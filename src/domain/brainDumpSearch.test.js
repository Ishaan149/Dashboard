import { describe, expect, it } from 'vitest'
import {
  brainDumpSearchProvider,
  getBrainDumpPageResults,
  getNotePreview,
  isBrainDumpNoteTarget,
  matchNote,
  normalizeNoteSearchText,
  NOTE_PREVIEW_LIMIT,
  PALETTE_NOTE_LIMIT,
} from './brainDumpSearch'
import { PINNED_NOTE_ID } from './brainDump'

const pinnedNote = { title: 'Pinned inbox', content: 'Always available' }

describe('Brain Dump search', () => {
  it('normalizes NFKC, case, trimming, and whitespace deterministically', () => {
    expect(normalizeNoteSearchText('  ＰＯＲＴＦＯＬＩＯ\n\tIdeas  ')).toBe('portfolio ideas')
  })

  it('token-prefix matches and ranks exact title, title prefix, title token, then body', () => {
    const notes = [
      { id: 'body', title: 'Journal', content: 'Portfolio planning' },
      { id: 'token', title: 'Ideas for Portfolio', content: '' },
      { id: 'prefix', title: 'Portfolio Ideas', content: '' },
      { id: 'exact', title: 'Portfolio', content: '' },
      { id: 'miss', title: 'Work', content: 'Unrelated' },
    ]

    const results = getBrainDumpPageResults({ notes, pinnedNote, query: 'portfolio' })
    expect(results.regular.map(note => note.id)).toEqual(['exact', 'prefix', 'token', 'body'])
    expect(matchNote(notes[0], 'plan port').matches).toBe(true)
    expect(matchNote(notes[4], 'port').matches).toBe(false)
  })

  it('keeps stored array order inside a ranking tier', () => {
    const notes = [
      { id: 'a', title: 'Alpha notes', content: '' },
      { id: 'b', title: 'Alpha plans', content: '' },
    ]
    expect(getBrainDumpPageResults({ notes, pinnedNote, query: 'alp' }).regular.map(note => note.id)).toEqual(['a', 'b'])
  })

  it('builds body-centered, whitespace-collapsed previews bounded to 160 characters', () => {
    const content = `${'before '.repeat(40)}needle appears here ${'after '.repeat(40)}`
    const preview = getNotePreview({ content }, 'need', 'body')
    expect(preview.length).toBeLessThanOrEqual(NOTE_PREVIEW_LIMIT)
    expect(preview).toContain('needle')
    expect(preview).not.toContain('\n')
    expect(getNotePreview({ content: '' })).toBe('Empty note')
  })

  it('composes Favorites and search with AND while pinned behaves as a favorite', () => {
    const notes = [
      { id: 'fav-match', title: 'Alpha favorite', content: '', favorite: true },
      { id: 'plain-match', title: 'Alpha plain', content: '', favorite: false },
      { id: 'fav-miss', title: 'Beta favorite', content: '', favorite: true },
    ]

    const favorites = getBrainDumpPageResults({ notes, pinnedNote, query: 'alpha', favoritesOnly: true })
    expect(favorites.pinned).toBeNull()
    expect(favorites.regular.map(note => note.id)).toEqual(['fav-match'])

    const unsearched = getBrainDumpPageResults({ notes, pinnedNote, favoritesOnly: true })
    expect(unsearched.pinned?.id).toBe(PINNED_NOTE_ID)
    expect(unsearched.regular.map(note => note.id)).toEqual(['fav-match', 'fav-miss'])
  })

  it('filters Quick Notes and composes that filter with Favorites and search', () => {
    const notes = [
      { id: 'quick-fav', title: 'Alpha quick', content: '', quickNote: true, favorite: true },
      { id: 'quick', title: 'Beta quick', content: '', quickNote: true },
      { id: 'regular', title: 'Alpha regular', content: '', favorite: true },
    ]

    const quick = getBrainDumpPageResults({ notes, pinnedNote, quickNotesOnly: true })
    expect(quick.pinned).toBeNull()
    expect(quick.regular.map(note => note.id)).toEqual(['quick-fav', 'quick'])

    const composed = getBrainDumpPageResults({ notes, pinnedNote, query: 'alpha', favoritesOnly: true, quickNotesOnly: true })
    expect(composed.regular.map(note => note.id)).toEqual(['quick-fav'])
  })

  it('exposes pure, bounded Palette results with pinned navigation', () => {
    const notes = Array.from({ length: PALETTE_NOTE_LIMIT + 10 }, (_, index) => ({
      id: `note-${index}`,
      title: `Note ${index}`,
      content: `Content ${index}`,
    }))
    const snapshot = { notes, pinnedNote }
    const original = structuredClone(snapshot)

    const results = brainDumpSearchProvider.getResults(snapshot)

    expect(results).toHaveLength(PALETTE_NOTE_LIMIT)
    expect(results[0]).toMatchObject({
      id: PINNED_NOTE_ID,
      providerId: 'notes',
      group: 'notes',
      target: { view: 'braindump', target: { kind: 'note', id: PINNED_NOTE_ID } },
    })
    expect(snapshot).toEqual(original)
    expect(isBrainDumpNoteTarget(results[0].target)).toBe(true)
    expect(isBrainDumpNoteTarget({ view: 'todo', target: { kind: 'note', id: 'x' } })).toBe(false)
  })
})
