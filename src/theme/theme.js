export const THEME_STORAGE_KEY = 'dashboard-theme-preferences-v1'
export const THEME_STORAGE_VERSION = 1

export const THEME_PRESETS = Object.freeze([
  Object.freeze({ id: 'forest', name: 'Forest', colors: Object.freeze({ accent: '#73B592', background: '#131419', foreground: '#E9EAE6' }) }),
  Object.freeze({ id: 'slate', name: 'Slate', colors: Object.freeze({ accent: '#8296B0', background: '#12151A', foreground: '#E7E9ED' }) }),
  Object.freeze({ id: 'plum', name: 'Plum', colors: Object.freeze({ accent: '#AA8FAA', background: '#171319', foreground: '#EEE8EE' }) }),
  Object.freeze({ id: 'mocha', name: 'Mocha', colors: Object.freeze({ accent: '#B59A7A', background: '#191512', foreground: '#EFE9E2' }) }),
  Object.freeze({ id: 'graphite', name: 'Graphite', colors: Object.freeze({ accent: '#A7A7A7', background: '#141414', foreground: '#ECECEC' }) }),
])

const PRESETS_BY_ID = new Map(THEME_PRESETS.map(preset => [preset.id, preset]))
const HEX_COLOR = /^#[0-9A-F]{6}$/i

export function getPreset(presetId) {
  return PRESETS_BY_ID.get(presetId)
}

export function createThemeRecord(presetId = 'forest', colors = getPreset(presetId)?.colors) {
  const preset = getPreset(presetId) ?? THEME_PRESETS[0]
  const source = colors ?? preset.colors

  return {
    version: THEME_STORAGE_VERSION,
    presetId: preset.id,
    colors: {
      accent: source.accent.toUpperCase(),
      background: source.background.toUpperCase(),
      foreground: source.foreground.toUpperCase(),
    },
  }
}

export function getForestTheme() {
  return createThemeRecord('forest')
}

export function parseThemePreferences(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (
      parsed?.version !== THEME_STORAGE_VERSION
      || !getPreset(parsed.presetId)
      || !parsed.colors
      || !['accent', 'background', 'foreground'].every(key => HEX_COLOR.test(parsed.colors[key]))
    ) return getForestTheme()

    return createThemeRecord(parsed.presetId, parsed.colors)
  } catch {
    return getForestTheme()
  }
}

export function loadThemePreferences(storage = globalThis.localStorage) {
  try {
    return parseThemePreferences(storage?.getItem(THEME_STORAGE_KEY))
  } catch {
    return getForestTheme()
  }
}

export function persistThemePreferences(theme, storage = globalThis.localStorage) {
  try {
    storage?.setItem(THEME_STORAGE_KEY, JSON.stringify(theme))
    return true
  } catch {
    return false
  }
}

export function isHexColor(value) {
  return HEX_COLOR.test(value)
}
