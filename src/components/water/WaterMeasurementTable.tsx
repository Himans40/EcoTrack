/**
 * Water measurement history table with per-row edit and delete.
 *
 * Deletion is two-step: the row switches into a confirm state rather than
 * firing a browser `confirm()`, so the action is reversible and testable.
 */

import { Fragment, useState } from 'react'
import { ChevronDown, FlaskConical, Pencil, Trash2 } from 'lucide-react'
import type { WaterMeasurement } from '@/types'
import { assessWaterMeasurement, WATER_SOURCE_LABELS } from '@/lib/wqi'
import { formatDateTime, formatNumber } from '@/lib/format'
import { Badge, Button } from '../ui'

export function WaterMeasurementTable({
  measurements,
  onEdit,
  onDelete,
}: {
  measurements: WaterMeasurement[]
  onEdit: (measurement: WaterMeasurement) => void
  onDelete: (id: string) => void
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem]">
        <caption className="sr-only">
          Recorded water quality measurements, newest first
        </caption>
        <thead className="border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th scope="col" className="table-head">Sample location</th>
            <th scope="col" className="table-head">Sampled</th>
            <th scope="col" className="table-head">pH</th>
            <th scope="col" className="table-head">Turbidity</th>
            <th scope="col" className="table-head">DO</th>
            <th scope="col" className="table-head">TDS</th>
            <th scope="col" className="table-head">EC</th>
            <th scope="col" className="table-head">Temp</th>
            <th scope="col" className="table-head">Score</th>
            <th scope="col" className="table-head text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {measurements.map((measurement) => {
            const assessment = assessWaterMeasurement(measurement)
            const isConfirming = confirmingId === measurement.id
            const isExpanded = expandedId === measurement.id

            return (
              <Fragment key={measurement.id}>
                <tr className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : measurement.id)
                      }
                      aria-expanded={isExpanded}
                      className="flex items-start gap-1.5 text-left"
                    >
                      <ChevronDown
                        className={`mt-1 h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                        aria-hidden
                      />
                      <span className="min-w-0">
                        <span className="block max-w-[16rem] truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {measurement.sampleLocation}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {WATER_SOURCE_LABELS[measurement.sourceType]}
                          </span>
                          {measurement.isDemo ? (
                            <Badge className="bg-amber-100 text-amber-900 ring-amber-600/40 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/40">
                              <FlaskConical className="h-2.5 w-2.5" aria-hidden />
                              Sample
                            </Badge>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="table-cell text-xs">
                    {formatDateTime(measurement.sampledAt)}
                  </td>
                  <td className="table-cell font-mono text-xs">
                    {formatNumber(measurement.ph, 1)}
                  </td>
                  <td className="table-cell font-mono text-xs">
                    {formatNumber(measurement.turbidity, 1)}
                  </td>
                  <td className="table-cell font-mono text-xs">
                    {formatNumber(measurement.dissolvedOxygen, 1)}
                  </td>
                  <td className="table-cell font-mono text-xs">
                    {formatNumber(measurement.tds, 0)}
                  </td>
                  <td className="table-cell font-mono text-xs">
                    {formatNumber(measurement.conductivity, 0)}
                  </td>
                  <td className="table-cell font-mono text-xs">
                    {formatNumber(measurement.temperature, 1)}
                  </td>
                  <td className="table-cell">
                    <Badge className={assessment.colorClass}>
                      {assessment.score} · {assessment.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isConfirming ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            onDelete(measurement.id)
                            setConfirmingId(null)
                          }}
                        >
                          Confirm
                        </Button>
                        <Button size="sm" onClick={() => setConfirmingId(null)}>
                          Cancel
                        </Button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(measurement)}
                          aria-label={`Edit sample from ${measurement.sampleLocation}`}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmingId(measurement.id)}
                          aria-label={`Delete sample from ${measurement.sampleLocation}`}
                          className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Delete
                        </Button>
                      </span>
                    )}
                  </td>
                </tr>

                {isExpanded ? (
                  <tr className="bg-slate-50 dark:bg-slate-900/60">
                    <td colSpan={10} className="px-4 py-4">
                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                            Parameter assessment
                          </p>
                          <ul className="space-y-2">
                            {assessment.parameters.map((parameter) => (
                              <li
                                key={parameter.key}
                                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs"
                              >
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {parameter.label}:
                                </span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                  {parameter.value}
                                  {parameter.unit ? ` ${parameter.unit}` : ''}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  (sub-score {parameter.subScore}/100 · acceptable{' '}
                                  {parameter.acceptable})
                                </span>
                                <span className="block w-full text-slate-600 dark:text-slate-400">
                                  {parameter.message}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-3">
                          {measurement.notes ? (
                            <div>
                              <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                Observations
                              </p>
                              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                {measurement.notes}
                              </p>
                            </div>
                          ) : null}
                          <div>
                            <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                              Record metadata
                            </p>
                            <ul className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                              <li>
                                Coordinates:{' '}
                                {measurement.latitude !== undefined &&
                                measurement.longitude !== undefined
                                  ? `${measurement.latitude.toFixed(4)}, ${measurement.longitude.toFixed(4)}`
                                  : 'not supplied'}
                              </li>
                              <li>Created: {formatDateTime(measurement.createdAt)}</li>
                              <li>Updated: {formatDateTime(measurement.updatedAt)}</li>
                              <li>
                                Origin:{' '}
                                {measurement.isDemo
                                  ? 'demonstration sample'
                                  : 'manual user entry'}
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
