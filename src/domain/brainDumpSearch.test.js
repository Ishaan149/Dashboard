import { describe, expect, it } from 'vitest'
import {
  getBrainDumpPageResults,
  getNotePreview,
  matchNote,
  normalizeNoteSearchText,
  NOTE_PREVIEW_LIMIT,
} from './brainDumpSearch'
import { PINNED_NOTE_ID } from './brainDump'

const pinnedNote = { title: 'Pinned inbox', content: 'Always available' }

describe('Brain Dump search', () => {
  it('normalizes NFKC, case, trimming, and whitespace deterministically', () => {
    expect(normalizeNoteSearchText('  ＰＯＲＴＦＯＬＩＯ\n\tIdeas  ')).toBe('portfolio ideas')
  })

  it('ranks token-prefix matches and keeps storage order within each tier', () => {
    const notes = [
      { id: 'body', title: 'Journal', content: 'Portfolio planning' },
      { id: 'token', title: 'Ideas for Portfolio', content: '' },
      { id: 'z-prefix', title: 'Portfolio Update', content: '' },
      { id: 'exact', title: 'Portfolio', content: '' },
      { id: 'a-prefix', title: 'Portfolio Ideas', content: '' },
      { id: 'miss', title: 'Work', content: 'Unrelated' },
    ]

    const results = getBrainDumpPageResults({ notes, pinnedNote, query: 'portfolio' })
    expect(results.regular.map(note => note.id)).toEqual(['exact', 'z-prefix', 'a-prefix', 'token', 'body'])
    expect(matchNote(notes[0], 'plan port').matches).toBe(true)
    expect(matchNote(notes.at(-1), 'port').matches).toBe(false)
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
})
