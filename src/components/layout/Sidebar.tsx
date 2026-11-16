import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { NAV_GROUPS, NAV_ITEMS } from './navItems'
import { BrandMark } from './BrandMark'

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  const base =
    'group relative flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition-colors'
  return isActive
    ? `${base} bg-slate-100 font-medium text-slate-900 dark:bg-slate-800/70 dark:text-white`
    : `${base} text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100`
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-6 px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.key}>
          <p className="mb-1.5 px-3 text-xs font-medium text-slate-400 dark:text-slate-500">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.filter((item) => item.group === group.key).map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onNavigate}
                    title={item.description}
                    className={navLinkClasses}
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          aria-hidden
                          className={`absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand-600 transition-opacity dark:bg-brand-400 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                        />
                        <Icon
                          className={`h-4 w-4 shrink-0 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`}
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className="h-7 w-7 text-brand-600 dark:text-brand-400" />
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">
          EcoTrack
        </span>
        <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
          Air &amp; water monitor
        </span>
      </span>
    </span>
  )
}

/** Fixed sidebar, visible from the `lg` breakpoint upward. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-[61px] items-center px-5">
        <Wordmark />
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarContent />
      </div>
      <footer className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p className="font-medium text-slate-700 dark:text-slate-300">Major project</p>
        <p className="mt-1 leading-relaxed">Shambhavi, Rameez Rahman and Himanshu</p>
      </footer>
    </aside>
  )
}

/** Slide-over drawer used below the `lg` breakpoint. */
export function MobileSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="drawer-in absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex h-[61px] items-center justify-between px-5">
          <Wordmark />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="-mr-2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent onNavigate={onClose} />
        </div>
      </div>
    </div>
  )
}
