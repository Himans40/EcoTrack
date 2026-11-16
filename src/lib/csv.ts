/**
 * CSV generation for water measurement export.
 *
 * Written by hand rather than pulled in as a dependency: the escaping rules
 * from RFC 4180 are short, and this keeps the dependency list honest.
 */

import type { AirQualityHourlyPoint, WaterMeasurement } from '@/types'
import { assessWaterMeasurement, WATER_SOURCE_LABELS } from './wqi'

/**
 * Quote a single field per RFC 4180.
 *
 * A field is wrapped in double quotes when it contains a comma, a quote, or a
 * line break, and embedded quotes are doubled. The leading-character guard
 * defends against CSV injection when the file is opened in a spreadsheet:
 * a cell starting `=`, `+`, `-` or `@` would otherwise be read as a formula.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return ''
  let text = String(value)

  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`
  }
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toCsvRow(fields: unknown[]): string {
  return fields.map(escapeCsvField).join(',')
}

export const WATER_CSV_HEADERS = [
  'Record ID',
  'Sample Location',
  'Latitude',
  'Longitude',
  'Source Type',
  'Sampled At (ISO)',
  'pH',
  'Turbidity (NTU)',
  'Dissolved Oxygen (mg/L)',
  'TDS (mg/L)',
  'Conductivity (uS/cm)',
  'Water Temperature (C)',
  'Composite WQI Score (0-100)',
  'Rating',
  'Parameters Of Concern',
  'Notes',
  'Data Origin',
  'Created At (ISO)',
  'Updated At (ISO)',
] as const

/**
 * Serialise measurements to a CSV document.
 *
 * Every row carries a "Data Origin" column so the exported file remains
 * self-describing: these are manual entries, not sensor telemetry.
 */
export function waterMeasurementsToCsv(measurements: WaterMeasurement[]): string {
  const lines: string[] = [toCsvRow([...WATER_CSV_HEADERS])]

  for (const m of measurements) {
    const assessment = assessWaterMeasurement(m)
    lines.push(
      toCsvRow([
        m.id,
        m.sampleLocation,
        m.latitude ?? '',
        m.longitude ?? '',
        WATER_SOURCE_LABELS[m.sourceType] ?? m.sourceType,
        m.sampledAt,
        m.ph,
        m.turbidity,
        m.dissolvedOxygen,
        m.tds,
        m.conductivity,
        m.temperature,
        assessment.score,
        assessment.label,
        assessment.concerns.map((c) => c.label).join('; '),
        m.notes ?? '',
        m.isDemo ? 'Demonstration sample' : 'Manual user entry',
        m.createdAt,
        m.updatedAt,
      ]),
    )
  }

  // Trailing newline so the file ends cleanly in editors and shells.
  return `${lines.join('\r\n')}\r\n`
}

/** Hourly AQI and pollutant history as CSV, one row per hour. */
export function airHistoryToCsv(points: AirQualityHourlyPoint[]): string {
  const header = toCsvRow([
    'Time (local)',
    'US AQI',
    'PM2.5 (µg/m³)',
    'PM10 (µg/m³)',
    'O3 (µg/m³)',
    'NO2 (µg/m³)',
    'SO2 (µg/m³)',
    'CO (µg/m³)',
  ])
  const rows = points.map((point) =>
    toCsvRow([
      point.time,
      point.usAqi ?? '',
      point.pm2_5 ?? '',
      point.pm10 ?? '',
      point.ozone ?? '',
      point.nitrogen_dioxide ?? '',
      point.sulphur_dioxide ?? '',
      point.carbon_monoxide ?? '',
    ]),
  )
  return `${[header, ...rows].join('\r\n')}\r\n`
}

/** Trigger a browser download for generated text content. */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/csv;charset=utf-8;',
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/** `water-quality-measurements-2026-11-11.csv` */
export function buildExportFilename(prefix = 'water-quality-measurements'): string {
  const stamp = new Date().toISOString().slice(0, 10)
  return `${prefix}-${stamp}.csv`
}
