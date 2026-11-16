/**
 * Application top bar: location switcher, search, refresh and theme toggle.
 */

import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  MapPin,
  Menu,
  Monitor,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Trash2,
} from 'lucide-react'
import type { ThemeMode } from '@/types'
import { useLocations } from '@/context/LocationContext'
import { useSettings } from '@/context/SettingsContext'
import { useEnvironment } from '@/context/EnvironmentDataContext'
import { useToast } from '@/context/ToastContext'
import { formatLocationName, formatRelativeTime } from '@/lib/format'
import { Button } from '../ui'
import { LocationSearch } from '../LocationSearch'

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'system']
const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const
const THEME_LABELS = {
  light: 'Light theme',
  dark: 'Dark theme',
  system: 'Follow system theme',
} as const

export function TopBar({
  onOpenMenu,
  onOpenCommandMenu,
}: {
  onOpenMenu: () => void
  onOpenCommandMenu: () => void
}) {
  const { activeLocation, savedLocations, selectLocation, removeLocation } =
    useLocations()
  const { settings, updateSettings } = useSettings()
  const { refresh, isRefreshing, lastUpdatedAt } = useEnvironment()
  const { showToast } = useToast()

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  // Close the dropdown on an outside click or Escape.
  useEffect(() => {
    if (!isSwitcherOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!switcherRef.current?.contains(event.target as Node)) {
        setIsSwitcherOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSwitcherOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isSwitcherOpen])

  const ThemeIcon = THEME_ICONS[settings.theme]

  const cycleTheme = () => {
    const nextIndex = (THEME_CYCLE.indexOf(settings.theme) + 1) % THEME_CYCLE.length
    updateSettings({ theme: THEME_CYCLE[nextIndex] })
  }

  return (
    <>
      <header className="sticky top-0 z-30 print:hidden border-b border-slate-200 bg-slate-50/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
        <div className="flex h-[60px] items-center gap-2 px-3 sm:px-5 lg:px-8">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open navigation menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>

          {/* Location switcher */}
          <div ref={switcherRef} className="relative min-w-0">
            <button
              type="button"
              onClick={() => setIsSwitcherOpen((open) => !open)}
              aria-expanded={isSwitcherOpen}
              aria-haspopup="listbox"
              className="-ml-1 flex max-w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-200/60 dark:hover:bg-slate-800/70"
            >
              <MapPin className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
              <span className="max-w-[55vw] flex-none truncate text-[15px] font-semibold sm:max-w-xs text-slate-900 dark:text-white">
                {formatLocationName(activeLocation)}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>

            {isSwitcherOpen ? (
              <div
                role="listbox"
                aria-label="Saved locations"
                className="pop-in absolute left-0 z-40 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_32px_-12px_rgb(13_19_17/0.25)] dark:border-slate-700 dark:bg-slate-900"
              >
                <p className="px-3 pb-1 pt-3 text-xs text-slate-500 dark:text-slate-400">
                  Saved locations
                </p>
                <ul className="max-h-64 overflow-y-auto py-1">
                  {savedLocations.map((location) => {
                    const isActive = location.id === activeLocation.id
                    return (
                      <li key={location.id} className="group flex items-center">
                        <button
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => {
                            selectLocation(location)
                            setIsSwitcherOpen(false)
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Check
                            className={`h-4 w-4 shrink-0 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-transparent'}`}
                            aria-hidden
                          />
                          <span className="truncate">{formatLocationName(location)}</span>
                        </button>
                        {savedLocations.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeLocation(location.id)}
                            aria-label={`Remove ${formatLocationName(location)} from saved locations`}
                            className="mr-2 rounded-md p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
                <div className="border-t border-slate-200 p-2 dark:border-slate-800">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsSwitcherOpen(false)
                      setIsSearchOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Add a new location
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-1">
            {lastUpdatedAt ? (
              <span className="mr-2 hidden items-center gap-1.5 text-xs text-slate-500 md:inline-flex dark:text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
                Updated {formatRelativeTime(lastUpdatedAt)}
              </span>
            ) : null}

            {/* Phones get an icon-only button; the wider search box is md and up. */}
            <button
              type="button"
              onClick={onOpenCommandMenu}
              aria-label="Open command menu"
              className="grid h-8 w-8 place-items-center rounded-md text-slate-600 hover:bg-slate-200/60 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Search className="h-[18px] w-[18px]" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onOpenCommandMenu}
              aria-label="Open command menu"
              className="mr-1 hidden h-8 items-center gap-2 rounded-md border border-slate-200 bg-white pl-2.5 pr-1.5 text-[13px] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 md:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
              <span className="pr-6">Jump to…</span>
              <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl K'}
              </kbd>
            </button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search for a city"
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Add city</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={refresh}
              isLoading={isRefreshing}
              aria-label="Refresh environmental data"
            >
              {!isRefreshing ? <RefreshCw className="h-4 w-4" aria-hidden /> : null}
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <button
              type="button"
              onClick={cycleTheme}
              aria-label={`Theme: ${THEME_LABELS[settings.theme]}. Click to change.`}
              title={THEME_LABELS[settings.theme]}
              className="grid h-8 w-8 place-items-center rounded-md text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ThemeIcon className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* Search dialog */}
      {isSearchOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
          <button
            type="button"
            aria-label="Close city search"
            onClick={() => setIsSearchOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search for a city"
            className="pop-in relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-[0_24px_48px_-16px_rgb(13_19_17/0.35)] dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              Add a monitoring location
            </h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Search any city worldwide. Selecting one saves it and makes it active.
            </p>
            <LocationSearch
              autoFocus
              onSelect={(location) => {
                selectLocation(location)
                setIsSearchOpen(false)
                showToast(`Now monitoring ${formatLocationName(location)}`)
              }}
            />
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setIsSearchOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
