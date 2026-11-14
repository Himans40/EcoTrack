/**
 * Integration tests for the water measurement store.
 *
 * Exercises the full CRUD lifecycle plus localStorage persistence, which
 * together are the project's P0 water-quality requirement.
 */

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import type { WaterMeasurementInput } from '@/types'
import { WaterProvider, useWaterMeasurements } from './WaterContext'
import { STORAGE_KEYS } from '@/lib/storage'

function wrapper({ children }: { children: ReactNode }) {
  return <WaterProvider>{children}</WaterProvider>
}

function renderStore() {
  return renderHook(() => useWaterMeasurements(), { wrapper })
}

const SAMPLE: WaterMeasurementInput = {
  sampleLocation: 'Campus tap, block A',
  sourceType: 'tap',
  sampledAt: '2026-11-10T09:00:00.000Z',
  ph: 7.2,
  turbidity: 0.9,
  dissolvedOxygen: 7.4,
  tds: 280,
  temperature: 22,
  conductivity: 430,
  notes: 'Clear, no odour.',
}

describe('create', () => {
  it('starts empty when nothing is stored', () => {
    const { result } = renderStore()
    expect(result.current.measurements).toEqual([])
  })

  it('adds a record and assigns an id and timestamps', () => {
    const { result } = renderStore()

    act(() => {
      result.current.addMeasurement(SAMPLE)
    })

    expect(result.current.measurements).toHaveLength(1)
    const record = result.current.measurements[0]
    expect(record.id).toMatch(/^water_/)
    expect(record.sampleLocation).toBe('Campus tap, block A')
    expect(record.ph).toBe(7.2)
    expect(record.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(record.updatedAt).toBe(record.createdAt)
  })

  it('returns the created record to the caller', () => {
    const { result } = renderStore()
    let created: { id: string } | undefined

    act(() => {
      created = result.current.addMeasurement(SAMPLE)
    })

    expect(created?.id).toBeDefined()
    expect(result.current.getMeasurement(created?.id as string)).toBeDefined()
  })

  it('gives each record a distinct id', () => {
    const { result } = renderStore()

    act(() => {
      result.current.addMeasurement(SAMPLE)
      result.current.addMeasurement({ ...SAMPLE, sampleLocation: 'Second site' })
    })

    const [a, b] = result.current.measurements
    expect(a.id).not.toBe(b.id)
  })

  it('keeps records sorted with the newest sample first', () => {
    const { result } = renderStore()

    act(() => {
      result.current.addMeasurement({
        ...SAMPLE,
        sampleLocation: 'Older',
        sampledAt: '2026-11-01T09:00:00.000Z',
      })
      result.current.addMeasurement({
        ...SAMPLE,
        sampleLocation: 'Newer',
        sampledAt: '2026-11-09T09:00:00.000Z',
      })
      result.current.addMeasurement({
        ...SAMPLE,
        sampleLocation: 'Middle',
        sampledAt: '2026-11-05T09:00:00.000Z',
      })
    })

    expect(result.current.measurements.map((m) => m.sampleLocation)).toEqual([
      'Newer',
      'Middle',
      'Older',
    ])
  })
})

describe('update', () => {
  it('applies a partial patch and bumps updatedAt', async () => {
    const { result } = renderStore()
    let id = ''

    act(() => {
      id = result.current.addMeasurement(SAMPLE).id
    })
    const before = result.current.measurements[0]

    // Ensure the clock has moved on before comparing timestamps.
    await new Promise((resolve) => setTimeout(resolve, 5))

    act(() => {
      result.current.updateMeasurement(id, { ph: 8.1, notes: 'Re-tested' })
    })

    const after = result.current.measurements[0]
    expect(after.ph).toBe(8.1)
    expect(after.notes).toBe('Re-tested')
    // Untouched fields survive the patch.
    expect(after.turbidity).toBe(before.turbidity)
    expect(after.createdAt).toBe(before.createdAt)
    expect(Date.parse(after.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(before.updatedAt),
    )
  })

  it('re-sorts when the sample time is edited', () => {
    const { result } = renderStore()
    let olderId = ''

    act(() => {
      olderId = result.current.addMeasurement({
        ...SAMPLE,
        sampleLocation: 'Was oldest',
        sampledAt: '2026-11-01T09:00:00.000Z',
      }).id
      result.current.addMeasurement({
        ...SAMPLE,
        sampleLocation: 'Was newest',
        sampledAt: '2026-11-09T09:00:00.000Z',
      })
    })
    expect(result.current.measurements[0].sampleLocation).toBe('Was newest')

    act(() => {
      result.current.updateMeasurement(olderId, {
        sampledAt: '2026-11-11T09:00:00.000Z',
      })
    })
    expect(result.current.measurements[0].sampleLocation).toBe('Was oldest')
  })

  it('ignores an update for an unknown id', () => {
    const { result } = renderStore()

    act(() => {
      result.current.addMeasurement(SAMPLE)
      result.current.updateMeasurement('does-not-exist', { ph: 1 })
    })

    expect(result.current.measurements).toHaveLength(1)
    expect(result.current.measurements[0].ph).toBe(7.2)
  })

  it('converts an edited demonstration sample into the user’s own data', () => {
    const { result } = renderStore()

    act(() => {
      result.current.loadDemoMeasurements()
    })
    const demoRecord = result.current.measurements.find((m) => m.isDemo)
    expect(demoRecord).toBeDefined()

    act(() => {
      result.current.updateMeasurement(demoRecord!.id, { ph: 7.0 })
    })

    const edited = result.current.getMeasurement(demoRecord!.id)
    expect(edited?.isDemo).toBe(false)
  })
})

describe('delete', () => {
  it('removes only the targeted record', () => {
    const { result } = renderStore()
    let targetId = ''

    act(() => {
      targetId = result.current.addMeasurement(SAMPLE).id
      result.current.addMeasurement({ ...SAMPLE, sampleLocation: 'Keep me' })
    })

    act(() => {
      result.current.deleteMeasurement(targetId)
    })

    expect(result.current.measurements).toHaveLength(1)
    expect(result.current.measurements[0].sampleLocation).toBe('Keep me')
    expect(result.current.getMeasurement(targetId)).toBeUndefined()
  })

  it('deletes every record on request', () => {
    const { result } = renderStore()

    act(() => {
      result.current.addMeasurement(SAMPLE)
      result.current.addMeasurement(SAMPLE)
      result.current.deleteAllMeasurements()
    })

    expect(result.current.measurements).toEqual([])
  })
})

describe('demonstration samples', () => {
  it('loads labelled samples and reports how many were added', () => {
    const { result } = renderStore()
    let added = 0

    act(() => {
      added = result.current.loadDemoMeasurements()
    })

    expect(added).toBeGreaterThan(0)
    expect(result.current.measurements).toHaveLength(added)
    expect(result.current.hasDemoMeasurements).toBe(true)
    expect(result.current.measurements.every((m) => m.isDemo)).toBe(true)
  })

  it('does not duplicate samples when loaded twice', () => {
    const { result } = renderStore()

    act(() => {
      result.current.loadDemoMeasurements()
    })
    const count = result.current.measurements.length

    let secondAdd = -1
    act(() => {
      secondAdd = result.current.loadDemoMeasurements()
    })

    expect(secondAdd).toBe(0)
    expect(result.current.measurements).toHaveLength(count)
  })

  it('removes demonstration samples without touching the user’s records', () => {
    const { result } = renderStore()

    act(() => {
      result.current.loadDemoMeasurements()
      result.current.addMeasurement(SAMPLE)
    })
    const demoCount = result.current.measurements.filter((m) => m.isDemo).length

    let removed = 0
    act(() => {
      removed = result.current.clearDemoMeasurements()
    })

    expect(removed).toBe(demoCount)
    expect(result.current.measurements).toHaveLength(1)
    expect(result.current.measurements[0].sampleLocation).toBe(SAMPLE.sampleLocation)
    expect(result.current.hasDemoMeasurements).toBe(false)
  })
})

describe('persistence', () => {
  it('writes records to localStorage under the documented key', () => {
    const { result } = renderStore()

    act(() => {
      result.current.addMeasurement(SAMPLE)
    })

    const raw = window.localStorage.getItem(STORAGE_KEYS.waterMeasurements)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw as string)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].sampleLocation).toBe('Campus tap, block A')
  })

  it('restores records when the provider is mounted again', () => {
    const first = renderStore()
    act(() => {
      first.result.current.addMeasurement(SAMPLE)
    })
    first.unmount()

    // A fresh mount simulates reopening the application.
    const second = renderStore()
    expect(second.result.current.measurements).toHaveLength(1)
    expect(second.result.current.measurements[0].ph).toBe(7.2)
  })

  it('discards a corrupt stored value instead of crashing', () => {
    window.localStorage.setItem(STORAGE_KEYS.waterMeasurements, '{"broken":')
    const { result } = renderStore()
    expect(result.current.measurements).toEqual([])
  })

  it('discards stored records that fail validation', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.waterMeasurements,
      JSON.stringify([{ id: 'x', sampleLocation: 'Missing all parameters' }]),
    )
    const { result } = renderStore()
    expect(result.current.measurements).toEqual([])
  })
})
