/**
 * Component tests for the water measurement form: validation, successful
 * submission, edit prefill and the date/time conversion helpers.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { WaterMeasurement } from '@/types'
import {
  WaterMeasurementForm,
  isoToLocalInput,
  localInputToIso,
} from './WaterMeasurementForm'

const EXISTING: WaterMeasurement = {
  id: 'water_existing',
  sampleLocation: 'Yamuna river — Nizamuddin bridge',
  sourceType: 'river',
  sampledAt: '2026-11-08T06:30:00.000Z',
  latitude: 28.5918,
  longitude: 77.2525,
  ph: 8.9,
  turbidity: 34.5,
  dissolvedOxygen: 2.8,
  tds: 1180,
  temperature: 26.9,
  conductivity: 1840,
  notes: 'Visible froth near the bank.',
  createdAt: '2026-11-08T06:30:00.000Z',
  updatedAt: '2026-11-08T06:30:00.000Z',
}

/** Fill every required numeric parameter with a valid value. */
async function fillParameters(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^pH/), '7.3')
  await user.type(screen.getByLabelText(/^Turbidity/), '1.2')
  await user.type(screen.getByLabelText(/^Dissolved oxygen/), '7.8')
  await user.type(screen.getByLabelText(/^Total dissolved solids/), '310')
  await user.type(screen.getByLabelText(/^Electrical conductivity/), '480')
  await user.type(screen.getByLabelText(/^Water temperature/), '21.5')
}

describe('date conversion helpers', () => {
  it('round-trips an ISO instant through the datetime-local format', () => {
    const iso = '2026-11-08T06:30:00.000Z'
    const local = isoToLocalInput(iso)
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    // Back-conversion lands on the same minute.
    expect(localInputToIso(local)).toBe('2026-11-08T06:30:00.000Z')
  })

  it('returns an empty string / null for invalid input', () => {
    expect(isoToLocalInput('nonsense')).toBe('')
    expect(localInputToIso('')).toBeNull()
    expect(localInputToIso('nonsense')).toBeNull()
  })
})

describe('validation', () => {
  it('blocks submission and flags every empty required field', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<WaterMeasurementForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /save measurement/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/correct 7 fields/i)
    })
    // Location plus the six parameters.
    expect(
      screen.getByText('Enter where the sample was collected.'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Required.')).toHaveLength(6)
  })

  it('rejects a pH outside the 0-14 range', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<WaterMeasurementForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/^Sample location/), 'Test site')
    await user.type(screen.getByLabelText(/^pH/), '15')
    await user.type(screen.getByLabelText(/^Turbidity/), '1')
    await user.type(screen.getByLabelText(/^Dissolved oxygen/), '7')
    await user.type(screen.getByLabelText(/^Total dissolved solids/), '300')
    await user.type(screen.getByLabelText(/^Electrical conductivity/), '450')
    await user.type(screen.getByLabelText(/^Water temperature/), '22')

    await user.click(screen.getByRole('button', { name: /save measurement/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Must be between 0 and 14.')).toBeInTheDocument()
  })

  it('rejects an out-of-range latitude', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<WaterMeasurementForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/^Sample location/), 'Test site')
    await user.type(screen.getByLabelText(/^Latitude/), '120')
    await fillParameters(user)

    await user.click(screen.getByRole('button', { name: /save measurement/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(
      screen.getByText('Latitude must be between -90 and 90.'),
    ).toBeInTheDocument()
  })

  it('rejects a sample time in the future', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<WaterMeasurementForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    const future = isoToLocalInput(
      new Date(Date.now() + 7 * 86_400_000).toISOString(),
    )
    await user.type(screen.getByLabelText(/^Sample location/), 'Test site')
    await user.clear(screen.getByLabelText(/^Sample date and time/))
    await user.type(screen.getByLabelText(/^Sample date and time/), future)
    await fillParameters(user)

    await user.click(screen.getByRole('button', { name: /save measurement/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(
      screen.getByText('The sample time cannot be in the future.'),
    ).toBeInTheDocument()
  })

  it('clears a field error as soon as the user corrects it', async () => {
    const user = userEvent.setup()
    render(<WaterMeasurementForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /save measurement/i }))
    expect(
      screen.getByText('Enter where the sample was collected.'),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Sample location/), 'Now filled in')

    expect(
      screen.queryByText('Enter where the sample was collected.'),
    ).not.toBeInTheDocument()
  })

  it('marks invalid inputs with aria-invalid for screen readers', async () => {
    const user = userEvent.setup()
    render(<WaterMeasurementForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /save measurement/i }))

    expect(screen.getByLabelText(/^Sample location/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})

describe('successful submission', () => {
  it('passes a fully parsed, numerically typed record to onSubmit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<WaterMeasurementForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/^Sample location/), '  Campus borewell  ')
    await fillParameters(user)
    await user.type(screen.getByLabelText(/^Observations/), 'Slightly hard.')

    await user.click(screen.getByRole('button', { name: /save measurement/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const submitted = onSubmit.mock.calls[0][0]
    expect(submitted).toMatchObject({
      // Whitespace is trimmed.
      sampleLocation: 'Campus borewell',
      sourceType: 'tap',
      ph: 7.3,
      turbidity: 1.2,
      dissolvedOxygen: 7.8,
      tds: 310,
      conductivity: 480,
      temperature: 21.5,
      notes: 'Slightly hard.',
      isDemo: false,
    })
    // Values must be numbers, not the raw input strings.
    expect(typeof submitted.ph).toBe('number')
    expect(typeof submitted.tds).toBe('number')
    expect(submitted.sampledAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/)
    // Coordinates were left blank, so they stay undefined rather than 0.
    expect(submitted.latitude).toBeUndefined()
    expect(submitted.longitude).toBeUndefined()
  })

  it('records the selected water source type', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<WaterMeasurementForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/^Sample location/), 'River site')
    await user.selectOptions(screen.getByLabelText(/water source type/i), 'river')
    await fillParameters(user)

    await user.click(screen.getByRole('button', { name: /save measurement/i }))

    expect(onSubmit.mock.calls[0][0].sourceType).toBe('river')
  })

  it('fills coordinates from the active monitoring location on request', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <WaterMeasurementForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        defaultCoordinates={{ latitude: 28.6519, longitude: 77.2315 }}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /use current monitoring location/i }),
    )
    await user.type(screen.getByLabelText(/^Sample location/), 'Nearby pond')
    await fillParameters(user)
    await user.click(screen.getByRole('button', { name: /save measurement/i }))

    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      latitude: 28.6519,
      longitude: 77.2315,
    })
  })
})

describe('editing an existing record', () => {
  it('prefills every field from the record', () => {
    render(
      <WaterMeasurementForm
        measurement={EXISTING}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/^Sample location/)).toHaveValue(
      'Yamuna river — Nizamuddin bridge',
    )
    expect(screen.getByLabelText(/water source type/i)).toHaveValue('river')
    expect(screen.getByLabelText(/^pH/)).toHaveValue(8.9)
    expect(screen.getByLabelText(/^Turbidity/)).toHaveValue(34.5)
    expect(screen.getByLabelText(/^Dissolved oxygen/)).toHaveValue(2.8)
    expect(screen.getByLabelText(/^Latitude/)).toHaveValue(28.5918)
    expect(screen.getByLabelText(/^Observations/)).toHaveValue(
      'Visible froth near the bank.',
    )
    // The button label reflects that this is an edit, not a new record.
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('submits only the edited value, leaving the rest intact', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <WaterMeasurementForm
        measurement={EXISTING}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.clear(screen.getByLabelText(/^Dissolved oxygen/))
    await user.type(screen.getByLabelText(/^Dissolved oxygen/), '5.5')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      dissolvedOxygen: 5.5,
      ph: 8.9,
      turbidity: 34.5,
      sampleLocation: 'Yamuna river — Nizamuddin bridge',
    })
  })
})

describe('cancellation', () => {
  it('calls onCancel without submitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    render(<WaterMeasurementForm onSubmit={onSubmit} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('guidance', () => {
  it('shows the acceptable range as a hint on every parameter', () => {
    render(<WaterMeasurementForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Acceptable: 6.5 – 8.5')).toBeInTheDocument()
    expect(screen.getByText('Acceptable: ≥ 6 mg/L')).toBeInTheDocument()
  })

  it('states that entries are manual records, not sensor data', () => {
    render(<WaterMeasurementForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/never describes them as live sensor data/i)).toBeInTheDocument()
  })
})
