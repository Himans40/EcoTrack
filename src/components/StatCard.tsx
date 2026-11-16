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
    <div className="card flex flex-col p-4 sm:p-5">
      <div className="flex items-center gap-2">
        {icon ? <span className={`shrink-0 ${accentClass}`}>{icon}</span> : null}
        <p className="text-[13px] text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[2rem] font-medium leading-none tracking-tight text-slate-900 dark:text-white">
          {value}
        </span>
        {unit ? (
          <span className="text-sm text-slate-500 dark:text-slate-400">{unit}</span>
        ) : null}
      </p>
      {footer ? (
        <div className="mt-2 text-[13px] leading-snug text-slate-500 dark:text-slate-400">
          {footer}
        </div>
      ) : null}
      {origin ? (
        <div className="mt-auto pt-3">
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-[1.75rem] dark:text-white">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
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
