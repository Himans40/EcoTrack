/**
 * Add / edit form for a water quality sample.
 *
 * Inputs are held as strings so that partially typed values (e.g. "7." while
 * typing 7.4) are never clobbered, and parsed once on submit. Validation is
 * per-field and reported inline with `aria-describedby`.
 */

import { useEffect, useMemo, useState } from 'react'
import { Save, X } from 'lucide-react'
import type {
  WaterMeasurement,
  WaterMeasurementInput,
  WaterParameterKey,
  WaterSourceType,
} from '@/types'
import {
  assessWaterMeasurement,
  WATER_PARAMETER_KEYS,
  WATER_PARAMETERS,
  WATER_SOURCE_LABELS,
} from '@/lib/wqi'
import { Button, DisclaimerNote, TextField } from '../ui'

/** Convert an ISO instant to the value a `datetime-local` input expects. */
export function isoToLocalInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/** Convert a `datetime-local` value back to an ISO instant. */
export function localInputToIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

type FormValues = {
  sampleLocation: string
  sourceType: WaterSourceType
  sampledAt: string
  latitude: string
  longitude: string
  notes: string
} & Record<WaterParameterKey, string>

function buildInitialValues(measurement?: WaterMeasurement): FormValues {
  if (measurement) {
    return {
      sampleLocation: measurement.sampleLocation,
      sourceType: measurement.sourceType,
      sampledAt: isoToLocalInput(measurement.sampledAt),
      latitude: measurement.latitude?.toString() ?? '',
      longitude: measurement.longitude?.toString() ?? '',
      notes: measurement.notes ?? '',
      ph: String(measurement.ph),
      turbidity: String(measurement.turbidity),
      dissolvedOxygen: String(measurement.dissolvedOxygen),
      tds: String(measurement.tds),
      conductivity: String(measurement.conductivity),
      temperature: String(measurement.temperature),
    }
  }
  return {
    sampleLocation: '',
    sourceType: 'tap',
    sampledAt: isoToLocalInput(new Date().toISOString()),
    latitude: '',
    longitude: '',
    notes: '',
    ph: '',
    turbidity: '',
    dissolvedOxygen: '',
    tds: '',
    conductivity: '',
    temperature: '',
  }
}

type Errors = Partial<Record<keyof FormValues, string>>

/**
 * Score the sample while it is being typed. Returns null until all six
 * parameters hold numbers inside their allowed ranges.
 */
export function previewScore(values: FormValues) {
  const sample: Partial<Record<WaterParameterKey, number>> = {}
  for (const key of WATER_PARAMETER_KEYS) {
    const text = values[key].trim()
    const number = Number(text)
    const { min, max } = WATER_PARAMETERS[key]
    if (text === '' || !Number.isFinite(number) || number < min || number > max) return null
    sample[key] = number
  }
  return assessWaterMeasurement(sample as WaterMeasurement)
}

export function WaterMeasurementForm({
  measurement,
  onSubmit,
  onCancel,
  /** Prefills coordinates from the active monitoring location. */
  defaultCoordinates,
}: {
  measurement?: WaterMeasurement
  onSubmit: (input: WaterMeasurementInput) => void
  onCancel: () => void
  defaultCoordinates?: { latitude: number; longitude: number }
}) {
  const [values, setValues] = useState<FormValues>(() =>
    buildInitialValues(measurement),
  )
  const [errors, setErrors] = useState<Errors>({})
  const isEditing = Boolean(measurement)

  // Re-seed the form when switching between records without unmounting.
  useEffect(() => {
    setValues(buildInitialValues(measurement))
    setErrors({})
  }, [measurement])

  const setField = (key: keyof FormValues, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    // Clear the field's error as soon as the user edits it.
    setErrors((previous) =>
      previous[key] ? { ...previous, [key]: undefined } : previous,
    )
  }

  const sourceOptions = useMemo(
    () => Object.entries(WATER_SOURCE_LABELS) as [WaterSourceType, string][],
    [],
  )

  const validate = (): WaterMeasurementInput | null => {
    const nextErrors: Errors = {}

    if (!values.sampleLocation.trim()) {
      nextErrors.sampleLocation = 'Enter where the sample was collected.'
    }

    const sampledAtIso = localInputToIso(values.sampledAt)
    if (!sampledAtIso) {
      nextErrors.sampledAt = 'Enter a valid sample date and time.'
    } else if (Date.parse(sampledAtIso) > Date.now() + 60_000) {
      nextErrors.sampledAt = 'The sample time cannot be in the future.'
    }

    const parsed = {} as Record<WaterParameterKey, number>
    for (const key of WATER_PARAMETER_KEYS) {
      const meta = WATER_PARAMETERS[key]
      const raw = values[key].trim()
      if (raw === '') {
        nextErrors[key] = 'Required.'
        continue
      }
      const numeric = Number(raw)
      if (!Number.isFinite(numeric)) {
        nextErrors[key] = 'Enter a number.'
        continue
      }
      if (numeric < meta.min || numeric > meta.max) {
        nextErrors[key] = `Must be between ${meta.min} and ${meta.max}.`
        continue
      }
      parsed[key] = numeric
    }

    // Coordinates are optional, but must be valid if supplied.
    let latitude: number | undefined
    let longitude: number | undefined
    if (values.latitude.trim() !== '') {
      const numeric = Number(values.latitude)
      if (!Number.isFinite(numeric) || numeric < -90 || numeric > 90) {
        nextErrors.latitude = 'Latitude must be between -90 and 90.'
      } else {
        latitude = numeric
      }
    }
    if (values.longitude.trim() !== '') {
      const numeric = Number(values.longitude)
      if (!Number.isFinite(numeric) || numeric < -180 || numeric > 180) {
        nextErrors.longitude = 'Longitude must be between -180 and 180.'
      } else {
        longitude = numeric
      }
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).some((key) => nextErrors[key as keyof Errors])) {
      return null
    }

    return {
      sampleLocation: values.sampleLocation.trim(),
      sourceType: values.sourceType,
      sampledAt: sampledAtIso as string,
      latitude,
      longitude,
      notes: values.notes.trim() || undefined,
      ph: parsed.ph,
      turbidity: parsed.turbidity,
      dissolvedOxygen: parsed.dissolvedOxygen,
      tds: parsed.tds,
      conductivity: parsed.conductivity,
      temperature: parsed.temperature,
      isDemo: false,
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const input = validate()
    if (input) onSubmit(input)
  }

  const errorCount = Object.values(errors).filter(Boolean).length

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Sample details
        </legend>

        <TextField
          label="Sample location"
          value={values.sampleLocation}
          onChange={(event) => setField('sampleLocation', event.target.value)}
          placeholder="e.g. Yamuna river — Nizamuddin bridge"
          error={errors.sampleLocation}
          hint="A description you will recognise later. This is free text, not a geocoded address."
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="water-source-type" className="field-label">
              Water source type
            </label>
            <select
              id="water-source-type"
              value={values.sourceType}
              onChange={(event) =>
                setField('sourceType', event.target.value as WaterSourceType)
              }
              className="field-input"
            >
              {sourceOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <TextField
            label="Sample date and time"
            type="datetime-local"
            value={values.sampledAt}
            onChange={(event) => setField('sampledAt', event.target.value)}
            error={errors.sampledAt}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Latitude"
            suffix="optional"
            type="number"
            step="any"
            inputMode="decimal"
            value={values.latitude}
            onChange={(event) => setField('latitude', event.target.value)}
            error={errors.latitude}
            placeholder="28.5918"
            hint="Supply coordinates to place this sample on the map."
          />
          <TextField
            label="Longitude"
            suffix="optional"
            type="number"
            step="any"
            inputMode="decimal"
            value={values.longitude}
            onChange={(event) => setField('longitude', event.target.value)}
            error={errors.longitude}
            placeholder="77.2525"
          />
        </div>

        {defaultCoordinates ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setField('latitude', defaultCoordinates.latitude.toFixed(4))
              setField('longitude', defaultCoordinates.longitude.toFixed(4))
            }}
          >
            Use current monitoring location coordinates
          </Button>
        ) : null}
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
        <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Measured parameters
        </legend>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {WATER_PARAMETER_KEYS.map((key) => {
            const meta = WATER_PARAMETERS[key]
            return (
              <TextField
                key={key}
                label={meta.label}
                suffix={meta.unit || undefined}
                type="number"
                step={meta.step}
                min={meta.min}
                max={meta.max}
                inputMode="decimal"
                value={values[key]}
                onChange={(event) => setField(key, event.target.value)}
                error={errors[key]}
                hint={`Acceptable: ${meta.acceptable}`}
                required
              />
            )
          })}
        </div>
      </fieldset>

      <fieldset className="border-t border-slate-200 pt-5 dark:border-slate-800">
        <label htmlFor="water-notes" className="field-label">
          Observations
          <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
            (optional)
          </span>
        </label>
        <textarea
          id="water-notes"
          rows={3}
          value={values.notes}
          onChange={(event) => setField('notes', event.target.value)}
          placeholder="Colour, odour, visible algae, floating debris, weather at the time of sampling…"
          className="field-input resize-y"
        />
      </fieldset>

      <ScorePreview values={values} />

      <DisclaimerNote>
        These values are recorded as your own manual measurements. The application
        stores them locally in this browser and never describes them as live sensor
        data.
      </DisclaimerNote>

      {errorCount > 0 ? (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          Please correct {errorCount} field{errorCount === 1 ? '' : 's'} above.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary">
          <Save className="h-4 w-4" aria-hidden />
          {isEditing ? 'Save changes' : 'Save measurement'}
        </Button>
        <Button onClick={onCancel}>
          <X className="h-4 w-4" aria-hidden />
          Cancel
        </Button>
      </div>
    </form>
  )
}

/** Live composite score shown under the parameter fields. */
function ScorePreview({ values }: { values: FormValues }) {
  const assessment = previewScore(values)
  return (
    <div
      aria-live="polite"
      className="flex items-center gap-4 rounded-lg border border-dashed border-slate-300 px-4 py-3 dark:border-slate-700"
    >
      {assessment ? (
        <>
          <span className="text-3xl font-semibold leading-none" style={{ color: assessment.hex }}>
            {assessment.score}
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-900 dark:text-white">{assessment.label}</span>
            {' — '}
            {assessment.concerns.length === 0
              ? 'every parameter is inside its acceptable range.'
              : `${assessment.concerns.length} parameter${assessment.concerns.length === 1 ? '' : 's'} outside the acceptable range.`}
          </span>
        </>
      ) : (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          The composite score appears here once all six parameters are filled in.
        </span>
      )}
    </div>
  )
}
