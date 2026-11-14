/**
 * Shared UI primitives.
 *
 * Kept in one module because each piece is small and they are always used
 * together; this avoids a sprawl of ten single-component files.
 */

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, Database, FlaskConical, Loader2, Radio, RefreshCw } from 'lucide-react'
import type { DataOrigin, DataProvenance } from '@/types'
import { formatDateTime, formatRelativeTime } from '@/lib/format'

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`card ${className}`}>{children}</section>
}

export function CardHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string
  subtitle?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="card-header">
      <div className="min-w-0">
        <h2 className="card-title flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function CardBody({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

/* -------------------------------------------------------------------------- */
/*  Button                                                                    */
/* -------------------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500 disabled:bg-brand-600/50',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  ghost:
    'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-600/50',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...rest}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Badge                                                                     */
/* -------------------------------------------------------------------------- */

export function Badge({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Form fields                                                               */
/* -------------------------------------------------------------------------- */

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  suffix?: string
}

export function TextField({
  label,
  hint,
  error,
  suffix,
  id,
  className = '',
  ...rest
}: TextFieldProps) {
  const inputId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`
  const describedBy = [
    hint ? `${inputId}-hint` : null,
    error ? `${inputId}-error` : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <label htmlFor={inputId} className="field-label">
        {label}
        {suffix ? (
          <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
            ({suffix})
          </span>
        ) : null}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`field-input ${error ? 'field-error' : ''}`}
        {...rest}
      />
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  States                                                                    */
/* -------------------------------------------------------------------------- */

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500 dark:text-slate-400"
    >
      <Loader2 className="h-7 w-7 animate-spin text-brand-600" aria-hidden />
      <p className="text-sm">{label}…</p>
    </div>
  )
}

/** Skeleton block used while a card's content loads. */
export function SkeletonBlock({ className = 'h-24' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon ? (
        <div className="rounded-full bg-slate-100 p-3 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

/**
 * Error state with recovery actions.
 *
 * Always offers a retry, and optionally an explicit switch to demonstration
 * data — the user chooses, so synthetic values never appear by surprise.
 */
export function ErrorState({
  title = 'Data unavailable',
  message,
  onRetry,
  onUseDemo,
}: {
  title?: string
  message: string
  onRetry?: () => void
  onUseDemo?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center"
    >
      <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-500/15 dark:text-red-400">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{message}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button variant="primary" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </Button>
        ) : null}
        {onUseDemo ? (
          <Button variant="secondary" onClick={onUseDemo}>
            <FlaskConical className="h-4 w-4" aria-hidden />
            Show demonstration data
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Data provenance                                                           */
/* -------------------------------------------------------------------------- */

const ORIGIN_CONFIG: Record<
  DataOrigin,
  { label: string; className: string; icon: typeof Radio }
> = {
  api: {
    label: 'Live API data',
    className:
      'bg-emerald-100 text-emerald-800 ring-emerald-600/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30',
    icon: Radio,
  },
  user: {
    label: 'Your recorded data',
    className:
      'bg-water-100 text-water-800 ring-water-600/30 dark:bg-water-500/15 dark:text-water-300 dark:ring-water-400/30',
    icon: Database,
  },
  demo: {
    label: 'Demonstration data',
    className:
      'bg-amber-100 text-amber-900 ring-amber-600/40 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/40',
    icon: FlaskConical,
  },
}

/** Small chip naming where a value came from. */
export function OriginBadge({
  origin,
  className = '',
}: {
  origin: DataOrigin
  className?: string
}) {
  const config = ORIGIN_CONFIG[origin]
  const Icon = config.icon
  return (
    <Badge className={`${config.className} ${className}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {config.label}
    </Badge>
  )
}

/**
 * Full provenance footer: origin, provider, index standard and freshness.
 * Rendered under every dataset in the application.
 */
export function ProvenanceFooter({ provenance }: { provenance: DataProvenance }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <OriginBadge origin={provenance.origin} />
      <span>
        <span className="font-medium text-slate-600 dark:text-slate-300">Source:</span>{' '}
        {provenance.sourceUrl ? (
          <a
            href={provenance.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-dotted hover:text-brand-600 dark:hover:text-brand-400"
          >
            {provenance.sourceName}
          </a>
        ) : (
          provenance.sourceName
        )}
      </span>
      {provenance.standard ? (
        <span>
          <span className="font-medium text-slate-600 dark:text-slate-300">Standard:</span>{' '}
          {provenance.standard}
        </span>
      ) : null}
      <span title={formatDateTime(provenance.retrievedAt)}>
        <span className="font-medium text-slate-600 dark:text-slate-300">Retrieved:</span>{' '}
        {formatRelativeTime(provenance.retrievedAt)}
      </span>
      {provenance.observedAt ? (
        <span title={formatDateTime(provenance.observedAt)}>
          <span className="font-medium text-slate-600 dark:text-slate-300">Observation:</span>{' '}
          {formatRelativeTime(provenance.observedAt)}
        </span>
      ) : null}
    </div>
  )
}

/**
 * Prominent banner shown whenever synthetic data is on screen.
 * Deliberately hard to miss, so no reviewer can mistake it for live data.
 */
export function DemoDataBanner({ message }: { message?: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-amber-400/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">Showing demonstration data — not real measurements</p>
        <p className="mt-0.5 text-amber-800 dark:text-amber-300/90">
          {message ??
            'These values are generated locally so the interface can be reviewed without a network connection. They are not live observations from any monitoring station.'}
        </p>
      </div>
    </div>
  )
}

/** Inline caveat block, used for the water safety disclaimer. */
export function DisclaimerNote({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={`flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <span>{children}</span>
    </p>
  )
}
