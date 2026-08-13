import { describe, expect, it } from 'vitest'
import { NAV_ITEMS, SETTINGS_NAV_ITEM, getViewLabel } from './navigation'

describe('primary navigation', () => {
  it('keeps the six stable view IDs in product order', () => {
    expect(NAV_ITEMS.map(item => item.id)).toEqual([
      'overview',
      'todo',
      'braindump',
      'jobs',
      'habits',
      'dayplanner',
    ])
  })

  it('displays overview as Today without changing its internal ID', () => {
    expect(NAV_ITEMS[0]).toMatchObject({ id: 'overview', label: 'Today', mobileLabel: 'Today' })
    expect(getViewLabel('overview')).toBe('Today')
  })

  it('uses the approved compact mobile labels', () => {
    expect(NAV_ITEMS.map(item => item.mobileLabel)).toEqual([
      'Today',
      'To-Do',
      'Brain',
      'Jobs',
      'Habits',
      'Planner',
    ])
  })

  it('exposes Settings as a utility destination', () => {
    expect(SETTINGS_NAV_ITEM).toMatchObject({ id: 'settings', label: 'Settings', icon: 'settings' })
    expect(getViewLabel('settings')).toBe('Settings')
  })
})
