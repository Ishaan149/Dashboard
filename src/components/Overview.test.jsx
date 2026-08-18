// @vitest-environment jsdom

import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDateKey } from '../utils/date'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const storage = vi.hoisted(() => ({
  values: {},
  setJobRecords: vi.fn(),
}))

vi.mock('../hooks/useSyncedStorage', () => ({
  useSyncedStorage(key, initialValue) {
    return [storage.values[key] ?? initialValue, key === 'job_applications' ? storage.setJobRecords : vi.fn()]
  },
}))

import Overview from './Overview'

function Harness() {
  const [selectedJobType, setSelectedJobType] = useState('')
  return <Overview selectedJobType={selectedJobType} onSelectedJobTypeChange={setSelectedJobType} />
}

function changeSelect(select, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
  act(() => {
    setter.call(select, value)
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

describe('Overview typed job logging', () => {
  let container
  let root

  beforeEach(() => {
    const today = getDateKey(0)
    storage.values = {
      job_applications: [{
        date: today,
        count: 6,
        categories: { softwareEngineering: 0, aiApplications: 0, backend: 1, data: 0 },
        emails: 2,
        linkedin: 1,
        metadata: { keep: true },
      }],
    }
    storage.setJobRecords.mockReset()
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    act(() => root.render(<Harness />))
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  it('starts unselected with exactly the authoritative types and no writable controls', () => {
    const select = container.querySelector('[aria-label="Job type"]')
    expect(select.value).toBe('')
    expect([...select.options].map(option => option.textContent)).toEqual([
      'Choose job type',
      'Software Engineering',
      'AI Applications',
      'Backend',
      'Data',
    ])
    expect(select.options[0].disabled).toBe(true)
    expect(container.querySelector('[aria-label="Remove selected job type application"]').disabled).toBe(true)
    expect(container.querySelector('[aria-label="Add selected job type application"]').disabled).toBe(true)
    expect(storage.setJobRecords).not.toHaveBeenCalled()
  })

  it('increments only the selected type while preserving legacy and forward-compatible data', () => {
    changeSelect(container.querySelector('[aria-label="Job type"]'), 'data')
    const decrease = container.querySelector('[aria-label="Remove selected job type application"]')
    const increase = container.querySelector('[aria-label="Add selected job type application"]')
    expect(decrease.disabled).toBe(true)
    expect(increase.disabled).toBe(false)
    click(increase)

    expect(storage.setJobRecords).toHaveBeenCalledTimes(1)
    const updated = storage.setJobRecords.mock.calls[0][0](storage.values.job_applications)
    expect(updated[0]).toMatchObject({
      count: 7,
      categories: { softwareEngineering: 0, aiApplications: 0, backend: 1, data: 1 },
      emails: 2,
      linkedin: 1,
      metadata: { keep: true },
    })
  })

  it('changes decrement eligibility by selection without writing and decrements only a positive type', () => {
    const select = container.querySelector('[aria-label="Job type"]')
    changeSelect(select, 'softwareEngineering')
    expect(container.querySelector('[aria-label="Remove selected job type application"]').disabled).toBe(true)
    expect(storage.setJobRecords).not.toHaveBeenCalled()

    changeSelect(select, 'backend')
    const decrease = container.querySelector('[aria-label="Remove selected job type application"]')
    expect(decrease.disabled).toBe(false)
    expect(storage.setJobRecords).not.toHaveBeenCalled()
    click(decrease)

    const updated = storage.setJobRecords.mock.calls[0][0](storage.values.job_applications)
    expect(updated[0]).toMatchObject({
      count: 5,
      categories: { softwareEngineering: 0, aiApplications: 0, backend: 0, data: 0 },
      emails: 2,
      linkedin: 1,
      metadata: { keep: true },
    })
  })

  it('keeps overall legacy quantities in the existing statistics and sparkline', () => {
    const select = container.querySelector('[aria-label="Job type"]')
    const card = select.closest('div[class]').parentElement
    expect(card.textContent).toContain('6sent today')
    expect(card.textContent).toContain('this week')
    expect([...card.querySelectorAll('span')].some(node => node.textContent.endsWith(': 6 app'))).toBe(true)
  })
})
