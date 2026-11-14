/**
 * Water quality measurement records — full CRUD over localStorage.
 *
 * This is the project's own data store: unlike air quality, there is no
 * public real-time API that covers arbitrary water bodies, so the user
 * records samples manually and the application persists, scores, charts and
 * exports them. Records are user data, never represented as sensor telemetry.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { WaterMeasurement, WaterMeasurementInput } from '@/types'
import { isWaterMeasurement } from '@/lib/guards'
import { isArrayOf, readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'
import { createId } from '@/lib/id'
import { buildDemoWaterMeasurements } from '@/services/demoData'

interface WaterContextValue {
  /** All records, newest sample first. */
  measurements: WaterMeasurement[]
  addMeasurement: (input: WaterMeasurementInput) => WaterMeasurement
  updateMeasurement: (id: string, patch: Partial<WaterMeasurementInput>) => void
  deleteMeasurement: (id: string) => void
  getMeasurement: (id: string) => WaterMeasurement | undefined
  /** Append the labelled sample records, skipping ones already present. */
  loadDemoMeasurements: () => number
  /** Remove only the records flagged as demonstration samples. */
  clearDemoMeasurements: () => number
  deleteAllMeasurements: () => void
  hasDemoMeasurements: boolean
}

const WaterContext = createContext<WaterContextValue | null>(null)

const isWaterMeasurementArray = isArrayOf(isWaterMeasurement)

/** Newest sample date first; ties broken by creation time. */
function sortMeasurements(records: WaterMeasurement[]): WaterMeasurement[] {
  return [...records].sort((a, b) => {
    const diff = Date.parse(b.sampledAt) - Date.parse(a.sampledAt)
    if (diff !== 0 && Number.isFinite(diff)) return diff
    return Date.parse(b.createdAt) - Date.parse(a.createdAt)
  })
}

export function WaterProvider({ children }: { children: ReactNode }) {
  const [measurements, setMeasurements] = useState<WaterMeasurement[]>(() =>
    sortMeasurements(
      readStorage(STORAGE_KEYS.waterMeasurements, [], isWaterMeasurementArray),
    ),
  )

  useEffect(() => {
    writeStorage(STORAGE_KEYS.waterMeasurements, measurements)
  }, [measurements])

  const addMeasurement = useCallback((input: WaterMeasurementInput) => {
    const timestamp = new Date().toISOString()
    const record: WaterMeasurement = {
      ...input,
      id: createId('water'),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    setMeasurements((previous) => sortMeasurements([record, ...previous]))
    return record
  }, [])

  const updateMeasurement = useCallback(
    (id: string, patch: Partial<WaterMeasurementInput>) => {
      setMeasurements((previous) =>
        sortMeasurements(
          previous.map((record) =>
            record.id === id
              ? {
                  ...record,
                  ...patch,
                  updatedAt: new Date().toISOString(),
                  // An edited demonstration record becomes the user's own data.
                  isDemo: false,
                }
              : record,
          ),
        ),
      )
    },
    [],
  )

  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements((previous) => previous.filter((record) => record.id !== id))
  }, [])

  const getMeasurement = useCallback(
    (id: string) => measurements.find((record) => record.id === id),
    [measurements],
  )

  /**
   * Both of the next two callbacks report a count to their caller, which the
   * UI shows in a confirmation message. That count is computed from the
   * currently rendered state rather than from inside the `setMeasurements`
   * updater: React only evaluates an updater eagerly when the update queue is
   * empty, so reading a value out of one is unreliable. Keeping the updater
   * pure also avoids a double-count under StrictMode.
   */
  const loadDemoMeasurements = useCallback(() => {
    const samples = buildDemoWaterMeasurements()
    const existingIds = new Set(measurements.map((record) => record.id))
    const fresh = samples.filter((sample) => !existingIds.has(sample.id))
    if (fresh.length > 0) {
      setMeasurements((previous) => {
        const previousIds = new Set(previous.map((record) => record.id))
        const toAdd = fresh.filter((sample) => !previousIds.has(sample.id))
        return sortMeasurements([...toAdd, ...previous])
      })
    }
    return fresh.length
  }, [measurements])

  const clearDemoMeasurements = useCallback(() => {
    const removed = measurements.filter((record) => record.isDemo).length
    if (removed > 0) {
      setMeasurements((previous) => previous.filter((record) => !record.isDemo))
    }
    return removed
  }, [measurements])

  const deleteAllMeasurements = useCallback(() => {
    setMeasurements([])
  }, [])

  const hasDemoMeasurements = useMemo(
    () => measurements.some((record) => record.isDemo),
    [measurements],
  )

  const value = useMemo<WaterContextValue>(
    () => ({
      measurements,
      addMeasurement,
      updateMeasurement,
      deleteMeasurement,
      getMeasurement,
      loadDemoMeasurements,
      clearDemoMeasurements,
      deleteAllMeasurements,
      hasDemoMeasurements,
    }),
    [
      measurements,
      addMeasurement,
      updateMeasurement,
      deleteMeasurement,
      getMeasurement,
      loadDemoMeasurements,
      clearDemoMeasurements,
      deleteAllMeasurements,
      hasDemoMeasurements,
    ],
  )

  return <WaterContext.Provider value={value}>{children}</WaterContext.Provider>
}

export function useWaterMeasurements(): WaterContextValue {
  const context = useContext(WaterContext)
  if (!context) {
    throw new Error('useWaterMeasurements must be used inside a <WaterProvider>')
  }
  return context
}
