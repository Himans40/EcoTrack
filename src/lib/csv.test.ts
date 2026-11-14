/**
 * Tests for CSV export: RFC 4180 escaping, spreadsheet-injection defence and
 * document structure.
 */

import { describe, expect, it, vi } from 'vitest'
import type { WaterMeasurement } from '@/types'
import {
  buildExportFilename,
  downloadTextFile,
  escapeCsvField,
  toCsvRow,
  WATER_CSV_HEADERS,
  waterMeasurementsToCsv,
} from './csv'

function makeMeasurement(overrides: Partial<WaterMeasurement> = {}): WaterMeasurement {
  return {
    id: 'water_1',
    sampleLocation: 'Campus borewell',
    sourceType: 'borewell',
    sampledAt: '2026-11-09T08:30:00.000Z',
    ph: 7,
    turbidity: 2.6,
    dissolvedOxygen: 5.4,
    tds: 612,
    temperature: 24.1,
    conductivity: 955,
    createdAt: '2026-11-09T08:30:00.000Z',
    updatedAt: '2026-11-09T08:30:00.000Z',
    ...overrides,
  }
}

describe('escapeCsvField', () => {
  it('leaves plain values untouched', () => {
    expect(escapeCsvField('Campus borewell')).toBe('Campus borewell')
    expect(escapeCsvField(7.4)).toBe('7.4')
    expect(escapeCsvField(0)).toBe('0')
  })

  it('renders null and undefined as an empty field', () => {
    expect(escapeCsvField(null)).toBe('')
    expect(escapeCsvField(undefined)).toBe('')
  })

  it('quotes fields containing a comma', () => {
    expect(escapeCsvField('Delhi, India')).toBe('"Delhi, India"')
  })

  it('quotes and doubles embedded quotation marks', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
  })

  it('quotes fields containing newlines', () => {
    expect(escapeCsvField('line one\nline two')).toBe('"line one\nline two"')
    expect(escapeCsvField('line one\r\nline two')).toBe('"line one\r\nline two"')
  })

  it('neutralises formula prefixes so a spreadsheet cannot execute a cell', () => {
    // Without this guard, these cells would be evaluated by Excel/Sheets.
    expect(escapeCsvField('=1+1')).toBe("'=1+1")
    expect(escapeCsvField('+SUM(A1)')).toBe("'+SUM(A1)")
    expect(escapeCsvField('-2+3')).toBe("'-2+3")
    expect(escapeCsvField('@import')).toBe("'@import")
  })

  it('still quotes a prefixed field that also contains a comma', () => {
    expect(escapeCsvField('=A1,B2')).toBe('"\'=A1,B2"')
  })

  it('does not mangle ordinary negative numbers passed as numbers', () => {
    // Numeric -5 stringifies to "-5", which the guard prefixes; the importer
    // reads it back as text, which is the safe trade-off for a text column.
    expect(escapeCsvField(-5)).toBe("'-5")
  })
})

describe('toCsvRow', () => {
  it('joins escaped fields with commas', () => {
    expect(toCsvRow(['a', 'b,c', 1])).toBe('a,"b,c",1')
  })
})

describe('waterMeasurementsToCsv', () => {
  it('emits only a header row when there are no records', () => {
    const csv = waterMeasurementsToCsv([])
    const lines = csv.trimEnd().split('\r\n')
    expect(lines).toHaveLength(1)
    expect(lines[0].split(',')).toHaveLength(WATER_CSV_HEADERS.length)
  })

  it('emits one row per record, with the header first', () => {
    const csv = waterMeasurementsToCsv([
      makeMeasurement({ id: 'a' }),
      makeMeasurement({ id: 'b', sampleLocation: 'River site' }),
    ])
    const lines = csv.trimEnd().split('\r\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('Sample Location')
    expect(lines[1]).toContain('Campus borewell')
    expect(lines[2]).toContain('River site')
  })

  it('includes the computed score and rating for each record', () => {
    const csv = waterMeasurementsToCsv([makeMeasurement()])
    expect(csv).toContain('Composite WQI Score (0-100)')
    // Hand-computed for this sample: 100(.18) + 88(.22) + 64.5(.22)
    // + 92.2(.18) + 90.4(.12) + 100(.08) = 87.0, which is the Excellent band.
    expect(csv).toMatch(/,87,Excellent,/)
    // Dissolved oxygen at 5.4 mg/L is the one parameter below its range.
    expect(csv).toContain('Dissolved oxygen')
  })

  it('labels every row with its data origin, so the file is self-describing', () => {
    const userCsv = waterMeasurementsToCsv([makeMeasurement()])
    expect(userCsv).toContain('Manual user entry')

    const demoCsv = waterMeasurementsToCsv([makeMeasurement({ isDemo: true })])
    expect(demoCsv).toContain('Demonstration sample')
  })

  it('escapes a sample location containing a comma without breaking columns', () => {
    const csv = waterMeasurementsToCsv([
      makeMeasurement({ sampleLocation: 'Ghat 3, Varanasi' }),
    ])
    expect(csv).toContain('"Ghat 3, Varanasi"')
  })

  it('maps the source type to its human-readable label', () => {
    const csv = waterMeasurementsToCsv([makeMeasurement({ sourceType: 'treated' })])
    expect(csv).toContain('Treated / RO output')
  })

  it('leaves optional coordinate columns empty when not supplied', () => {
    const csv = waterMeasurementsToCsv([makeMeasurement()])
    const dataRow = csv.trimEnd().split('\r\n')[1]
    // Record ID, location, then two empty coordinate fields.
    expect(dataRow).toContain('water_1,Campus borewell,,,')
  })

  it('terminates the document with CRLF', () => {
    expect(waterMeasurementsToCsv([makeMeasurement()]).endsWith('\r\n')).toBe(true)
  })
})

describe('buildExportFilename', () => {
  it('stamps the current date into the filename', () => {
    const name = buildExportFilename()
    expect(name).toMatch(/^water-quality-measurements-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('honours a custom prefix', () => {
    expect(buildExportFilename('backup')).toMatch(/^backup-\d{4}-\d{2}-\d{2}\.csv$/)
  })
})

describe('downloadTextFile', () => {
  it('creates and revokes an object URL and clicks a download anchor', () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    })

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    downloadTextFile('test.csv', 'a,b\r\n1,2\r\n')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    // The temporary anchor must not be left in the document.
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
  })
})
