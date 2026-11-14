/**
 * Water Quality page — manual measurement entry, history, scoring and export.
 *
 * Why manual entry: there is no free public API that reports real-time pH,
 * turbidity, dissolved oxygen, TDS, conductivity and temperature for an
 * arbitrary water body anywhere in the world. Rather than fabricate readings,
 * this module is a working field-record system: the user records what they
 * actually measured, and the application persists, scores, charts and exports
 * it. Every record is labelled as user-entered data.
 */

import { useMemo, useState } from 'react'
import {
  Download,
  Droplets,
  FlaskConical,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import type { WaterMeasurement, WaterMeasurementInput, WaterParameterKey } from '@/types'
import { useWaterMeasurements } from '@/context/WaterContext'
import { useLocations } from '@/context/LocationContext'
import { WaterMeasurementForm } from '@/components/water/WaterMeasurementForm'
import { WaterMeasurementTable } from '@/components/water/WaterMeasurementTable'
import { WaterTrendChart } from '@/components/charts'
import { PageHeader, StatCard } from '@/components/StatCard'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DisclaimerNote,
  EmptyState,
} from '@/components/ui'
import {
  assessWaterMeasurement,
  averageWaterScore,
  describeMeasurementOrigin,
  WATER_PARAMETERS,
  WATER_PARAMETER_KEYS,
  WATER_SAFETY_DISCLAIMER,
} from '@/lib/wqi'
import {
  buildExportFilename,
  downloadTextFile,
  waterMeasurementsToCsv,
} from '@/lib/csv'
import { formatDateTime, formatNumber } from '@/lib/format'

type TrendSeries = WaterParameterKey | 'score'

const TREND_OPTIONS: { value: TrendSeries; label: string }[] = [
  { value: 'score', label: 'Composite WQI score' },
  ...WATER_PARAMETER_KEYS.map((key) => ({
    value: key as TrendSeries,
    label: WATER_PARAMETERS[key].label,
  })),
]

export default function WaterQualityPage() {
  const {
    measurements,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    loadDemoMeasurements,
    hasDemoMeasurements,
    clearDemoMeasurements,
  } = useWaterMeasurements()
  const { activeLocation } = useLocations()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<WaterMeasurement | null>(null)
  const [trendSeries, setTrendSeries] = useState<TrendSeries>('score')
  const [toast, setToast] = useState<string | null>(null)
  const [locationFilter, setLocationFilter] = useState<string>('all')

  const announce = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 4000)
  }

  /** Distinct sample locations, for the comparison filter. */
  const locationOptions = useMemo(() => {
    const unique = new Set(measurements.map((m) => m.sampleLocation))
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [measurements])

  const filtered = useMemo(
    () =>
      locationFilter === 'all'
        ? measurements
        : measurements.filter((m) => m.sampleLocation === locationFilter),
    [measurements, locationFilter],
  )

  const latest = measurements[0]
  const latestAssessment = latest ? assessWaterMeasurement(latest) : null
  const average = averageWaterScore(measurements)
  const waterOrigin = describeMeasurementOrigin(measurements)

  const bestAndWorst = useMemo(() => {
    if (measurements.length === 0) return null
    const scored = measurements.map((m) => ({
      measurement: m,
      score: assessWaterMeasurement(m).score,
    }))
    const sorted = [...scored].sort((a, b) => b.score - a.score)
    return { best: sorted[0], worst: sorted[sorted.length - 1] }
  }, [measurements])

  const handleSubmit = (input: WaterMeasurementInput) => {
    if (editing) {
      updateMeasurement(editing.id, input)
      announce('Measurement updated.')
    } else {
      addMeasurement(input)
      announce('Measurement saved.')
    }
    setIsFormOpen(false)
    setEditing(null)
  }

  const handleExport = () => {
    if (measurements.length === 0) return
    const csv = waterMeasurementsToCsv(filtered)
    downloadTextFile(buildExportFilename(), csv)
    announce(`Exported ${filtered.length} record${filtered.length === 1 ? '' : 's'} to CSV.`)
  }

  const openCreateForm = () => {
    setEditing(null)
    setIsFormOpen(true)
  }

  const openEditForm = (measurement: WaterMeasurement) => {
    setEditing(measurement)
    setIsFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Water Quality Monitoring"
        description="Record water samples manually, score them against published general guidance, track them over time and export them as CSV."
        actions={
          <>
            <Button variant="primary" onClick={openCreateForm}>
              <Plus className="h-4 w-4" aria-hidden />
              Add measurement
            </Button>
            <Button onClick={handleExport} disabled={measurements.length === 0}>
              <Download className="h-4 w-4" aria-hidden />
              Export CSV
            </Button>
          </>
        }
      />

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-brand-300 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-800 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
        >
          {toast}
        </div>
      ) : null}

      {/* Entry form */}
      {isFormOpen ? (
        <Card>
          <CardHeader
            title={editing ? 'Edit measurement' : 'New water quality measurement'}
            icon={<Droplets className="h-4 w-4" aria-hidden />}
            subtitle={
              editing
                ? `Editing the sample recorded for ${editing.sampleLocation}.`
                : 'Enter the values you measured in the field or in the laboratory.'
            }
          />
          <CardBody>
            <WaterMeasurementForm
              measurement={editing ?? undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsFormOpen(false)
                setEditing(null)
              }}
              defaultCoordinates={{
                latitude: activeLocation.latitude,
                longitude: activeLocation.longitude,
              }}
            />
          </CardBody>
        </Card>
      ) : null}

      {/* Summary tiles */}
      {measurements.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Records stored"
            value={measurements.length}
            unit={measurements.length === 1 ? 'sample' : 'samples'}
            icon={<Droplets className="h-4 w-4" aria-hidden />}
            accentClass="text-water-600"
            footer={`${locationOptions.length} distinct location${locationOptions.length === 1 ? '' : 's'} · ${waterOrigin.summary}`}
            origin={waterOrigin.origin}
          />
          <StatCard
            label="Latest composite score"
            value={latestAssessment?.score ?? '—'}
            unit="/100"
            icon={<TrendingUp className="h-4 w-4" aria-hidden />}
            accentClass="text-brand-600"
            footer={
              latest
                ? `${latestAssessment?.label} · ${formatDateTime(latest.sampledAt)}`
                : undefined
            }
          />
          <StatCard
            label="Average score"
            value={average ?? '—'}
            unit="/100"
            footer="Mean across every stored sample"
          />
          <StatCard
            label="Parameters of concern"
            value={latestAssessment?.concerns.length ?? '—'}
            unit="in latest sample"
            accentClass="text-amber-600"
            footer={
              latestAssessment && latestAssessment.concerns.length > 0
                ? latestAssessment.concerns.map((c) => c.label).join(', ')
                : 'All parameters within acceptable ranges'
            }
          />
        </div>
      ) : null}

      <DisclaimerNote>{WATER_SAFETY_DISCLAIMER}</DisclaimerNote>

      {/* History */}
      <Card>
        <CardHeader
          title="Measurement History"
          subtitle={
            measurements.length > 0
              ? `${measurements.length} record${measurements.length === 1 ? '' : 's'}, newest first. Click a row to see the full parameter assessment.`
              : undefined
          }
          actions={
            hasDemoMeasurements ? (
              <Button
                size="sm"
                onClick={() => {
                  const removed = clearDemoMeasurements()
                  announce(`Removed ${removed} demonstration sample${removed === 1 ? '' : 's'}.`)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Remove sample data
              </Button>
            ) : null
          }
        />
        {measurements.length === 0 ? (
          <EmptyState
            icon={<Droplets className="h-6 w-6" aria-hidden />}
            title="No measurements recorded yet"
            description="Add your first sample to see it scored, charted and ready to export. If you want to see how the module works first, you can load a small set of clearly labelled demonstration samples."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="primary" onClick={openCreateForm}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add measurement
                </Button>
                <Button
                  onClick={() => {
                    const added = loadDemoMeasurements()
                    announce(`Loaded ${added} demonstration sample${added === 1 ? '' : 's'}.`)
                  }}
                >
                  <FlaskConical className="h-4 w-4" aria-hidden />
                  Load sample data
                </Button>
              </div>
            }
          />
        ) : (
          <WaterMeasurementTable
            measurements={measurements}
            onEdit={openEditForm}
            onDelete={(id) => {
              deleteMeasurement(id)
              announce('Measurement deleted.')
            }}
          />
        )}
      </Card>

      {/* Trends + comparison */}
      {measurements.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader
              title="Parameter Trend"
              subtitle="Plotted against the sample timestamps you recorded. Points are shown as markers because samples are taken at irregular intervals."
              actions={
                <select
                  value={trendSeries}
                  onChange={(event) =>
                    setTrendSeries(event.target.value as TrendSeries)
                  }
                  aria-label="Select parameter to plot"
                  className="field-input w-auto py-1.5 text-xs"
                >
                  {TREND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              }
            />
            <CardBody>
              <WaterTrendChart measurements={filtered} series={trendSeries} />
            </CardBody>
            <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-800">
              <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span>Filter by sample location</span>
                <select
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                  className="field-input w-auto py-1.5 text-xs"
                >
                  <option value="all">All locations ({measurements.length})</option>
                  {locationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} (
                      {measurements.filter((m) => m.sampleLocation === option).length})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Sample Comparison"
              subtitle="Highest and lowest scoring samples, and how the latest one compares."
            />
            <CardBody className="space-y-4">
              {bestAndWorst ? (
                <>
                  <ComparisonRow
                    title="Highest composite score"
                    measurement={bestAndWorst.best.measurement}
                    score={bestAndWorst.best.score}
                  />
                  <ComparisonRow
                    title="Lowest composite score"
                    measurement={bestAndWorst.worst.measurement}
                    score={bestAndWorst.worst.score}
                  />
                  {latestAssessment ? (
                    <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Latest sample, parameter by parameter
                      </p>
                      <ul className="space-y-1.5">
                        {latestAssessment.parameters.map((parameter) => (
                          <li key={parameter.key} className="text-xs">
                            <div className="mb-0.5 flex items-baseline justify-between gap-2">
                              <span className="text-slate-700 dark:text-slate-300">
                                {parameter.label}{' '}
                                <span className="font-mono text-slate-500 dark:text-slate-400">
                                  {formatNumber(parameter.value, 1)}
                                  {parameter.unit ? ` ${parameter.unit}` : ''}
                                </span>
                              </span>
                              <span className="font-mono text-slate-500 dark:text-slate-400">
                                {parameter.subScore}/100
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${parameter.subScore}%`,
                                  backgroundColor:
                                    parameter.subScore >= 70
                                      ? '#16a34a'
                                      : parameter.subScore >= 50
                                        ? '#ca8a04'
                                        : '#dc2626',
                                }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {/* Methodology */}
      <Card>
        <CardHeader
          title="How the composite score is calculated"
          subtitle="Documented so the number can be checked and defended."
        />
        <CardBody className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Each parameter is scored 0–100 by piecewise-linear interpolation across
            anchor points that encode its acceptable range. The composite score is the
            weighted sum of those sub-scores, and the weights add up to 1:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem]">
              <thead className="border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th scope="col" className="table-head">Parameter</th>
                  <th scope="col" className="table-head">Unit</th>
                  <th scope="col" className="table-head">Acceptable range</th>
                  <th scope="col" className="table-head">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {WATER_PARAMETER_KEYS.map((key) => {
                  const meta = WATER_PARAMETERS[key]
                  return (
                    <tr key={key}>
                      <td className="table-cell font-medium text-slate-900 dark:text-slate-100">
                        {meta.label}
                      </td>
                      <td className="table-cell text-xs">{meta.unit || '—'}</td>
                      <td className="table-cell text-xs">{meta.acceptable}</td>
                      <td className="table-cell font-mono text-xs">
                        {(meta.weight * 100).toFixed(0)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-slate-100 text-slate-700 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-300">
              85–100 Excellent
            </Badge>
            <Badge className="bg-slate-100 text-slate-700 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-300">
              70–84 Good
            </Badge>
            <Badge className="bg-slate-100 text-slate-700 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-300">
              50–69 Fair
            </Badge>
            <Badge className="bg-slate-100 text-slate-700 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-300">
              30–49 Poor
            </Badge>
            <Badge className="bg-slate-100 text-slate-700 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-300">
              0–29 Very poor
            </Badge>
          </div>
          <DisclaimerNote>
            The acceptable ranges are informed by widely published general guidance
            (WHO Guidelines for Drinking-water Quality and the Indian standard
            IS 10500), but the weighting scheme is this project's own and the index is
            not a certified or regulatory one. {WATER_SAFETY_DISCLAIMER}
          </DisclaimerNote>
        </CardBody>
      </Card>
    </div>
  )
}

function ComparisonRow({
  title,
  measurement,
  score,
}: {
  title: string
  measurement: WaterMeasurement
  score: number
}) {
  const assessment = assessWaterMeasurement(measurement)
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {measurement.sampleLocation}
        </span>
        <Badge className={assessment.colorClass}>
          {score} · {assessment.label}
        </Badge>
      </div>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Sampled {formatDateTime(measurement.sampledAt)}
      </p>
    </div>
  )
}
