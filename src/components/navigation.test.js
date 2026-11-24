import { describe, expect, it } from 'vitest'
import { NAV_ITEMS, SETTINGS_NAV_ITEM, getViewLabel } from './navigation'

describe('primary navigation', () => {
  it('keeps stable view IDs and compact mobile labels in navigation order', () => {
    expect(NAV_ITEMS.map(({ id, mobileLabel }) => [id, mobileLabel])).toEqual([
      ['overview', 'Today'],
      ['todo', 'To-Do'],
      ['braindump', 'Brain'],
      ['projects', 'Projects'],
      ['jobs', 'Jobs'],
      ['habits', 'Habits'],
      ['dayplanner', 'Planner'],
    ])
  })

  it('resolves desktop view labels and exposes Settings as a utility destination', () => {
    expect(SETTINGS_NAV_ITEM).toMatchObject({ id: 'settings', label: 'Settings', icon: 'settings' })
    expect(getViewLabel('overview')).toBe('Today')
    expect(getViewLabel('settings')).toBe('Settings')
    expect(getViewLabel('projects')).toBe('Projects')
  })
})
