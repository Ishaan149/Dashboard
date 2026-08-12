import { describe, expect, it, vi } from 'vitest'
import {
  clearBrainDumpNote,
  clearPinnedNote,
  createBrainDumpNote,
  deleteBrainDumpNote,
  normalizePinnedNote,
  normalizeRegularNotes,
  PINNED_NOTE_ID,
  updateBrainDumpNote,
  updatePinnedNote,
} from './brainDump'

describe('Brain Dump note domain', () => {
  it('normalizes legacy data without mutating, reordering, or dropping unknown fields', () => {
    const notes = [
      { id: 'second', title: 'Second', content: 'Body', unknown: { kept: true } },
      { id: 'first', title: 42, content: null, favorite: 'yes' },
    ]
    const original = structuredClone(notes)

    const normalized = normalizeRegularNotes(notes)

    expect(notes).toEqual(original)
    expect(normalized.map(note => note.id)).toEqual(['second', 'first'])
    expect(normalized[0]).toMatchObject({ title: 'Second', content: 'Body', unknown: { kept: true }, favorite: false, createdAt: 0, updatedAt: 0 })
    expect(normalized[1]).toMatchObject({ title: '42', content: '', contentFormat: 'markdown' })
  })

  it('keeps the first duplicate winner and ignores malformed records without cleanup', () => {
    const notes = [
      null,
      { id: '', title: 'Invalid', content: '' },
      { id: 'same', title: 'Winner', content: '' },
      { id: 'same', title: 'Duplicate', content: '' },
      { id: PINNED_NOTE_ID, title: 'Reserved', content: '' },
      { id: 'valid', title: 'Valid', content: '' },
    ]
    const original = structuredClone(notes)

    expect(normalizeRegularNotes(notes).map(note => note.title)).toEqual(['Winner', 'Valid'])
    expect(notes).toEqual(original)
  })

  it('normalizes pinned notes as a runtime favorite while preserving source data', () => {
    const source = { title: 'Pinned', content: 'Text', custom: 7 }
    expect(normalizePinnedNote(source)).toMatchObject({
      id: PINNED_NOTE_ID,
      title: 'Pinned',
      content: 'Text',
      favorite: true,
      custom: 7,
      createdAt: 0,
      updatedAt: 0,
    })
    expect(source).toEqual({ title: 'Pinned', content: 'Text', custom: 7 })
  })

  it('prepends new notes with deterministic metadata and never accepts the pinned ID', () => {
    const ids = [PINNED_NOTE_ID, 'existing', 'new-id']
    const idFactory = vi.fn(() => ids.shift())
    const existing = [{ id: 'existing', title: 'Old', content: '' }]

    const created = createBrainDumpNote(existing, { idFactory, now: 1234 })

    expect(created.notes.map(note => note.id)).toEqual(['new-id', 'existing'])
    expect(created.note).toEqual({
      id: 'new-id',
      title: 'Untitled',
      content: '',
      contentFormat: 'markdown',
      favorite: false,
      quickNote: false,
      createdAt: 1234,
      updatedAt: 1234,
    })
    expect(idFactory).toHaveBeenCalledTimes(3)
  })

  it('writes forward only the edited record, preserves unknown fields, and ignores no-ops', () => {
    const first = { id: 'a', title: 'A', content: 'Body', unknown: 'keep' }
    const second = { id: 'b', title: 'B', content: 'Other' }
    const notes = [first, second]

    expect(updateBrainDumpNote(notes, 'a', { content: 'Body' }, 100)).toBe(notes)

    const updated = updateBrainDumpNote(notes, 'a', { title: 'Changed', favorite: true }, 200)
    expect(updated).not.toBe(notes)
    expect(updated[1]).toBe(second)
    expect(updated[0]).toEqual({
      id: 'a',
      title: 'Changed',
      content: 'Body',
      unknown: 'keep',
      contentFormat: 'markdown',
      favorite: true,
      quickNote: false,
      createdAt: 200,
      updatedAt: 200,
    })
  })

  it('creates Quick Notes as regular notes and preserves the flag through later edits', () => {
    const created = createBrainDumpNote([], {
      idFactory: () => 'quick-id',
      now: 500,
      title: 'Fast thought',
      content: 'Remember this',
      quickNote: true,
    })

    expect(created.note).toMatchObject({ id: 'quick-id', quickNote: true, favorite: false })
    expect(updateBrainDumpNote(created.notes, 'quick-id', { favorite: true }, 600)[0]).toMatchObject({
      quickNote: true,
      favorite: true,
      updatedAt: 600,
    })
  })

  it('preserves enhanced pinned metadata for Brain Dump and Overview writes', () => {
    const pinned = {
      title: 'Pinned',
      content: 'Old',
      contentFormat: 'markdown',
      createdAt: 10,
      updatedAt: 11,
      unknown: 'keep',
    }

    expect(updatePinnedNote(pinned, { content: 'Old' }, 20)).toBe(pinned)
    expect(updatePinnedNote(pinned, { content: 'Overview edit' }, 20)).toEqual({
      ...pinned,
      content: 'Overview edit',
      updatedAt: 20,
    })
  })

  it('protects pinned and the final regular note, then deletes only the selected record', () => {
    const malformed = { title: 'Missing ID', content: 'keep' }
    const notes = [
      { id: 'a', title: 'A', content: '' },
      malformed,
      { id: 'b', title: 'B', content: '' },
    ]

    expect(deleteBrainDumpNote(notes, PINNED_NOTE_ID).reason).toBe('pinned')
    expect(deleteBrainDumpNote([notes[0], malformed], 'a').reason).toBe('last-note')

    const result = deleteBrainDumpNote(notes, 'a')
    expect(result.deleted).toBe(true)
    expect(result.notes).toEqual([malformed, notes[2]])
    expect(result.nextActiveId).toBe('b')
  })

  it('clears only content and safely handles stale targets', () => {
    const notes = [{ id: 'a', title: 'A', content: 'Body', favorite: true, unknown: 'keep' }]
    const cleared = clearBrainDumpNote(notes, 'a', 300)
    expect(cleared.cleared).toBe(true)
    expect(cleared.notes[0]).toMatchObject({ title: 'A', content: '', favorite: true, unknown: 'keep', updatedAt: 300 })
    expect(clearBrainDumpNote(notes, 'missing', 300).reason).toBe('missing')

    const pinned = { title: 'Pinned', content: 'Body', unknown: 1 }
    expect(clearPinnedNote(pinned, 400).note).toMatchObject({ title: 'Pinned', content: '', unknown: 1, updatedAt: 400 })
  })
})
