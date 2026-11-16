/**
 * Command menu, opened with Ctrl+K (⌘K on Mac) or the search button in the
 * top bar. Type to filter, use the arrow keys to move and Enter to run.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CornerDownLeft, MapPin, Monitor, Moon, RefreshCw, Search, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLocations } from '@/context/LocationContext'
import { useSettings } from '@/context/SettingsContext'
import { useEnvironment } from '@/context/EnvironmentDataContext'
import { formatLocationName } from '@/lib/format'
import { NAV_ITEMS } from './navItems'

export interface Command {
  id: string
  label: string
  group: string
  icon: LucideIcon
  run: () => void
}

/** Keep commands whose label contains every word the user typed. */
export function filterCommands(commands: Command[], query: string): Command[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return commands.filter((command) =>
    words.every((word) => command.label.toLowerCase().includes(word)),
  )
}

/** Opens the menu on Ctrl+K / ⌘K anywhere in the app. */
export function useCommandMenuShortcut(open: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        open()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])
}

export function CommandMenu({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { savedLocations, activeLocation, selectLocation } = useLocations()
  const { updateSettings } = useSettings()
  const { refresh } = useEnvironment()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const commands = useMemo<Command[]>(() => {
    const pages: Command[] = NAV_ITEMS.map((item) => ({
      id: `page-${item.to}`,
      label: `Go to ${item.label}`,
      group: 'Pages',
      icon: item.icon,
      run: () => navigate(item.to),
    }))

    const cities: Command[] = savedLocations
      .filter((location) => location.id !== activeLocation.id)
      .map((location) => ({
        id: `city-${location.id}`,
        label: `Switch to ${formatLocationName(location)}`,
        group: 'Saved cities',
        icon: MapPin,
        run: () => selectLocation(location),
      }))

    const actions: Command[] = [
      { id: 'action-refresh', label: 'Refresh data', group: 'Actions', icon: RefreshCw, run: refresh },
      { id: 'theme-light', label: 'Use light theme', group: 'Actions', icon: Sun, run: () => updateSettings({ theme: 'light' }) },
      { id: 'theme-dark', label: 'Use dark theme', group: 'Actions', icon: Moon, run: () => updateSettings({ theme: 'dark' }) },
      { id: 'theme-system', label: 'Use system theme', group: 'Actions', icon: Monitor, run: () => updateSettings({ theme: 'system' }) },
    ]

    return [...pages, ...cities, ...actions]
  }, [navigate, savedLocations, activeLocation.id, selectLocation, refresh, updateSettings])

  const results = filterCommands(commands, query)

  const runCommand = (command: Command | undefined) => {
    if (!command) return
    onClose()
    command.run()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      runCommand(results[activeIndex])
    } else if (event.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close command menu"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        className="pop-in relative w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_48px_-16px_rgb(13_19_17/0.35)] dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Search pages, cities and actions"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={results[activeIndex]?.id}
            className="h-12 flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
          />
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-400 dark:border-slate-700">
            Esc
          </kbd>
        </div>

        <ul id="command-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-slate-500">
              Nothing matches “{query}”.
            </li>
          ) : null}
          {results.map((command, index) => {
            const Icon = command.icon
            const isActive = index === activeIndex
            const showGroup = index === 0 || results[index - 1].group !== command.group
            return (
              <li key={command.id}>
                {showGroup ? (
                  <p className="px-3 pb-1 pt-2 text-xs text-slate-400 dark:text-slate-500">
                    {command.group}
                  </p>
                ) : null}
                <button
                  type="button"
                  id={command.id}
                  role="option"
                  aria-selected={isActive}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => runCommand(command)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${isActive ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="flex-1 truncate">{command.label}</span>
                  {isActive ? (
                    <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
