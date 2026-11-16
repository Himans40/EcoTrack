/**
 * Application settings, persisted to localStorage.
 *
 * Also owns theme application: the `dark` class on <html> is driven from here
 * and kept in sync with the OS preference while the theme is set to 'system'.
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
import type { AppSettings, ThemeMode } from '@/types'
import { isAppSettings } from '@/lib/guards'
import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  temperatureUnit: 'celsius',
  refreshIntervalMinutes: 15,
  historyWindowHours: 72,
  aqiAlertThreshold: 150,
}

/** Options offered in Settings for the auto-refresh control. */
export const REFRESH_INTERVAL_OPTIONS = [
  { value: 0, label: 'Manual only' },
  { value: 5, label: 'Every 5 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
] as const

/** Options offered for the AQI alert. Values are EPA category boundaries. */
export const AQI_ALERT_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 50, label: 'Above 50 (worse than Good)' },
  { value: 100, label: 'Above 100 (unhealthy for sensitive groups)' },
  { value: 150, label: 'Above 150 (unhealthy for everyone)' },
  { value: 200, label: 'Above 200 (very unhealthy)' },
] as const

/** Options offered for the chart history window. */
export const HISTORY_WINDOW_OPTIONS = [
  { value: 24, label: 'Last 24 hours' },
  { value: 48, label: 'Last 48 hours' },
  { value: 72, label: 'Last 3 days' },
  { value: 120, label: 'Last 5 days' },
  { value: 168, label: 'Last 7 days' },
] as const

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  resetSettings: () => void
  /** The theme actually applied right now, after resolving 'system'. */
  resolvedTheme: 'light' | 'dark'
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function prefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveTheme(mode: ThemeMode, systemDark: boolean): 'light' | 'dark' {
  if (mode === 'system') return systemDark ? 'dark' : 'light'
  return mode
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Spread over the defaults so settings saved by an older version still get
  // any fields added since (such as the AQI alert threshold).
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...readStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS, isAppSettings),
  }))
  const [systemDark, setSystemDark] = useState<boolean>(prefersDark)

  // Track the OS preference so 'system' stays live rather than snapshotting.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme = resolveTheme(settings.theme, systemDark)

  // Apply the theme to <html> for Tailwind's class-based dark mode.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    writeStorage(STORAGE_KEYS.settings, settings)
  }, [settings])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((previous) => ({ ...previous, ...patch }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, updateSettings, resetSettings, resolvedTheme }),
    [settings, updateSettings, resetSettings, resolvedTheme],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used inside a <SettingsProvider>')
  }
  return context
}
