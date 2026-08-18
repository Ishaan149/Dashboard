// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  getForestTheme,
  loadThemePreferences,
  parseThemePreferences,
  THEME_PRESETS,
  THEME_STORAGE_KEY,
} from './theme'

describe('theme preferences', () => {
  beforeEach(() => localStorage.clear())

  it.each([
    ['missing state', null],
    ['malformed state', '{nope'],
    ['unsupported version', JSON.stringify({ version: 2, presetId: 'slate', colors: THEME_PRESETS[1].colors })],
    ['unknown preset', JSON.stringify({ version: 1, presetId: 'ocean', colors: THEME_PRESETS[1].colors })],
    ['invalid color', JSON.stringify({ version: 1, presetId: 'slate', colors: { ...THEME_PRESETS[1].colors, accent: 'blue' } })],
  ])('%s falls back completely to Forest', (_label, value) => {
    if (value !== null) localStorage.setItem(THEME_STORAGE_KEY, value)
    expect(loadThemePreferences()).toEqual(getForestTheme())
  })

  it('resolves every preset to its exact canonical colors', () => {
    const expected = {
      forest: ['#73B592', '#131419', '#E9EAE6'],
      slate: ['#8296B0', '#12151A', '#E7E9ED'],
      plum: ['#AA8FAA', '#171319', '#EEE8EE'],
      mocha: ['#B59A7A', '#191512', '#EFE9E2'],
      graphite: ['#A7A7A7', '#141414', '#ECECEC'],
    }

    for (const preset of THEME_PRESETS) {
      expect([preset.colors.accent, preset.colors.background, preset.colors.foreground]).toEqual(expected[preset.id])
      expect(parseThemePreferences({ version: 1, presetId: preset.id, colors: preset.colors }).colors).toEqual(preset.colors)
    }
  })
})
