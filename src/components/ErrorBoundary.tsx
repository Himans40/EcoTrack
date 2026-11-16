import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface State {
  error: Error | null
}

/**
 * Catches render-time errors so a single broken page cannot blank the whole
 * application. Shows the message and offers a reload.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught a rendering error:', error, info)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div
          role="alert"
          className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mx-auto mb-4 w-fit rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-500/15 dark:text-red-400">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            The application hit an unexpected error while rendering this page.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Reload the application
          </button>
        </div>
      </div>
    )
  }
}
