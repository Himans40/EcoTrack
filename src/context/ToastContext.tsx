/**
 * Toast notifications: short messages that confirm an action, such as
 * "Sample saved". Any component can call `showToast` from `useToast()`.
 * Each toast disappears on its own after a few seconds.
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, X } from 'lucide-react'

type ToastTone = 'success' | 'error'

interface Toast {
  id: number
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/** How long a toast stays on screen, in milliseconds. */
const TOAST_DURATION_MS = 4000

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId++
      setToasts((current) => [...current, { id, message, tone }])
      window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
    },
    [dismissToast],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
      >
        {toasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastMessage({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = toast.tone === 'success' ? CheckCircle2 : AlertTriangle
  return (
    <div
      role="status"
      className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg bg-slate-900 py-2.5 pl-3.5 pr-2 text-sm text-white shadow-[0_12px_32px_-12px_rgb(13_19_17/0.5)] dark:bg-slate-100 dark:text-slate-900"
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${toast.tone === 'success' ? 'text-brand-300 dark:text-brand-600' : 'text-amber-400 dark:text-amber-600'}`}
        aria-hidden
      />
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white dark:text-slate-500 dark:hover:bg-slate-900/10 dark:hover:text-slate-900"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside a <ToastProvider>')
  }
  return context
}
