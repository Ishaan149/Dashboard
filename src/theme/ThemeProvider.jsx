import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react'
import {
  createThemeRecord,
  getPreset,
  isHexColor,
  loadThemePreferences,
  persistThemePreferences,
  THEME_PRESETS,
} from './theme'

const ThemeContext = createContext(null)

export function ThemeProvider({ children, storage }) {
  const [theme, setTheme] = useState(() => loadThemePreferences(storage))

  useLayoutEffect(() => {
    const root = document.documentElement
    const variables = {
      '--theme-accent': theme.colors.accent,
      '--theme-background': theme.colors.background,
      '--theme-foreground': theme.colors.foreground,
    }
    const previousValues = Object.fromEntries(
      Object.keys(variables).map(name => [name, root.style.getPropertyValue(name)]),
    )

    Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value))

    return () => {
      Object.entries(previousValues).forEach(([name, value]) => {
        if (value) root.style.setProperty(name, value)
        else root.style.removeProperty(name)
      })
    }
  }, [theme.colors.accent, theme.colors.background, theme.colors.foreground])

  function selectPreset(presetId) {
    setTheme(current => {
      if (current.presetId === presetId) return current
      const preset = getPreset(presetId)
      if (!preset) return current
      const next = createThemeRecord(preset.id, preset.colors)
      persistThemePreferences(next, storage)
      return next
    })
  }

  function setColor(colorName, value) {
    if (!['accent', 'background', 'foreground'].includes(colorName) || !isHexColor(value)) return
    setTheme(current => {
      if (current.colors[colorName] === value) return current
      const next = createThemeRecord(current.presetId, { ...current.colors, [colorName]: value })
      persistThemePreferences(next, storage)
      return next
    })
  }

  const value = useMemo(() => ({ theme, presets: THEME_PRESETS, selectPreset, setColor }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
