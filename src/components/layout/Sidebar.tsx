import { NavLink } from 'react-router-dom'
import { Leaf, X } from 'lucide-react'
import { NAV_ITEMS } from './navItems'

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  const base =
    'flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors'
  return isActive
    ? `${base} bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300`
    : `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100`
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation" className="flex h-full flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={navLinkClasses}
          >
            <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="block">{item.label}</span>
              <span className="mt-0.5 block text-xs font-normal leading-snug text-slate-500 dark:text-slate-400">
                {item.description}
              </span>
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}

/** Fixed sidebar, visible from the `lg` breakpoint upward. */
export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <span className="rounded-lg bg-brand-600 p-1.5 text-white">
          <Leaf className="h-5 w-5" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">
            Environment Monitor
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            Air &amp; Water Quality Index
          </span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarContent />
      </div>
      <footer className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p className="font-medium text-slate-600 dark:text-slate-300">Major Project</p>
        <p className="mt-0.5">Shambhavi · Rameez Rahman · Himanshu</p>
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
        className="absolute inset-0 bg-slate-900/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <span className="flex items-center gap-2.5">
            <span className="rounded-lg bg-brand-600 p-1.5 text-white">
              <Leaf className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Environment Monitor
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
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
