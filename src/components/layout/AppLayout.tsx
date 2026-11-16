import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { MobileSidebar, Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // Scroll back to the top on navigation; otherwise a long page leaves the
  // next one scrolled halfway down.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <MobileSidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMenu={() => setIsMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
        <footer className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>
            Air and Water Quality Index and Environment Monitoring System · Air data
            from Open-Meteo, map tiles from OpenStreetMap contributors. Water quality
            records are entered manually by the user.
          </p>
        </footer>
      </div>
    </div>
  )
}
