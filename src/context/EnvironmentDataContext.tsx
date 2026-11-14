/**
 * Shares one air-quality + weather fetch across every page.
 *
 * Without this, navigating between Overview, Air Quality, Map and Analytics
 * would re-request the same two endpoints each time. Hoisting the hook to a
 * provider means one request per location change, and the refresh button in
 * the top bar updates every page at once.
 */

import { createContext, useContext, type ReactNode } from 'react'
import { useEnvironmentData, type UseEnvironmentDataResult } from '@/hooks/useEnvironmentData'
import { useLocations } from './LocationContext'

const EnvironmentDataContext = createContext<UseEnvironmentDataResult | null>(null)

export function EnvironmentDataProvider({ children }: { children: ReactNode }) {
  const { activeLocation } = useLocations()
  const value = useEnvironmentData(activeLocation)
  return (
    <EnvironmentDataContext.Provider value={value}>
      {children}
    </EnvironmentDataContext.Provider>
  )
}

export function useEnvironment(): UseEnvironmentDataResult {
  const context = useContext(EnvironmentDataContext)
  if (!context) {
    throw new Error('useEnvironment must be used inside an <EnvironmentDataProvider>')
  }
  return context
}
