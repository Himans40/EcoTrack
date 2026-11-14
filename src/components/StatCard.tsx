import type { ReactNode } from 'react'
import type { DataOrigin } from '@/types'
import { OriginBadge } from './ui'

/** Compact metric tile used across the dashboard. */
export function StatCard({
  label,
  value,
  unit,
  icon,
  accentClass = 'text-brand-600 dark:text-brand-400',
  footer,
  origin,
}: {
  label: string
  value: ReactNode
  unit?: string
  icon?: ReactNode
  accentClass?: string
  footer?: ReactNode
  origin?: DataOrigin
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        {icon ? <span className={`shrink-0 ${accentClass}`}>{icon}</span> : null}
      </div>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
          {value}
        </span>
        {unit ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">{unit}</span>
        ) : null}
      </p>
      {footer ? (
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{footer}</div>
      ) : null}
      {origin ? (
        <div className="mt-2.5">
          <OriginBadge origin={origin} />
        </div>
      ) : null}
    </div>
  )
}

/** Page heading with an optional description and trailing actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-slate-100">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
