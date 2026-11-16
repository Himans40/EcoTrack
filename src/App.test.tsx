/**
 * Application-level navigation smoke test.
 *
 * Verifies the project requirement that every visible navigation item leads to
 * a working page — no decorative links. `fetch` is mocked so the test does not
 * depend on network access, and the Leaflet map is stubbed because jsdom has
 * no layout engine for it to measure against.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { NAV_ITEMS } from './components/layout/navItems'

// Leaflet requires real element dimensions; stub it out for this test.
vi.mock('@/components/map/EnvironmentMap', () => ({
  EnvironmentMap: () => <div data-testid="map-stub">Map</div>,
}))

const AIR_RESPONSE = {
  latitude: 28.65,
  longitude: 77.23,
  utc_offset_seconds: 19_800,
  timezone: 'Asia/Kolkata',
  current: {
    time: '2026-11-11T03:30',
    us_aqi: 162,
    pm2_5: 70.2,
    pm10: 140.5,
    carbon_monoxide: 620,
    nitrogen_dioxide: 40,
    sulphur_dioxide: 15,
    ozone: 30,
  },
  hourly: {
    time: ['2026-11-11T01:00', '2026-11-11T02:00', '2026-11-11T03:00'],
    us_aqi: [150, 155, 162],
    pm2_5: [62, 66, 70.2],
    pm10: [130, 135, 140.5],
    carbon_monoxide: [600, 610, 620],
    nitrogen_dioxide: [38, 39, 40],
    sulphur_dioxide: [14, 14.5, 15],
    ozone: [28, 29, 30],
  },
}

const WEATHER_RESPONSE = {
  utc_offset_seconds: 19_800,
  current: {
    time: '2026-11-11T03:30',
    temperature_2m: 18.8,
    relative_humidity_2m: 75,
    wind_speed_10m: 5.4,
    precipitation: 0,
  },
  hourly: {
    time: ['2026-11-11T01:00', '2026-11-11T02:00', '2026-11-11T03:00'],
    temperature_2m: [17.5, 18.1, 18.8],
    relative_humidity_2m: [80, 78, 75],
  },
}

beforeEach(() => {
  // `BrowserRouter` reads `window.location` on mount, and jsdom keeps its
  // history between tests, so a route visited by one test would otherwise
  // become the starting route of the next one.
  window.history.pushState({}, '', '/')

  // Route each endpoint to its own fixture by URL.
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = String(input)
      const body = url.includes('air-quality') ? AIR_RESPONSE : WEATHER_RESPONSE
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => body,
      }
    }),
  )
  // jsdom has no layout, so Recharts' ResponsiveContainer measures 0x0 and
  // warns. Silence that one noisy path without hiding real errors.
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('application shell', () => {
  it('renders the Overview dashboard by default', async () => {
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: /environmental overview/i }),
    ).toBeInTheDocument()
  })

  it('loads live data and shows it tagged as API data', async () => {
    render(<App />)

    await waitFor(() => {
      // 162 is rendered twice: in the AQI stat tile and inside the gauge.
      expect(screen.getAllByText('162').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('Live API data').length).toBeGreaterThan(0)
    // US AQI 162 falls in the EPA "Unhealthy" band.
    expect(screen.getAllByText(/^unhealthy$/i).length).toBeGreaterThan(0)
  })

  it('exposes every navigation item in the sidebar', () => {
    render(<App />)
    const nav = screen.getAllByRole('navigation', { name: /main navigation/i })[0]
    for (const item of NAV_ITEMS) {
      expect(within(nav).getByRole('link', { name: new RegExp(item.label, 'i') }))
        .toBeInTheDocument()
    }
  })
})

describe('navigation', () => {
  /** Each route and a heading that proves its page actually rendered. */
  const ROUTE_HEADINGS: { label: string; heading: RegExp }[] = [
    { label: 'Air Quality', heading: /air quality monitoring/i },
    { label: 'Water Quality', heading: /water quality monitoring/i },
    { label: 'Environmental Map', heading: /environmental map/i },
    { label: 'Historical Analytics', heading: /historical analytics/i },
    { label: 'Learn', heading: /environmental education/i },
    { label: 'Settings', heading: /^settings$/i },
    { label: 'Overview', heading: /environmental overview/i },
  ]

  it('navigates to every page in turn and renders each one', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: /environmental overview/i })

    const nav = screen.getAllByRole('navigation', { name: /main navigation/i })[0]

    for (const route of ROUTE_HEADINGS) {
      await user.click(
        within(nav).getByRole('link', { name: new RegExp(route.label, 'i') }),
      )
      expect(
        await screen.findByRole('heading', { level: 1, name: route.heading }),
      ).toBeInTheDocument()
    }
  }, 30_000)
})

describe('data integrity labelling', () => {
  it('states the index standard on the air quality page', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: /environmental overview/i })

    const nav = screen.getAllByRole('navigation', { name: /main navigation/i })[0]
    await user.click(within(nav).getByRole('link', { name: /air quality/i }))

    expect(
      await screen.findByText(/index standard: us epa aqi/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/never mixes classification thresholds/i),
    ).toBeInTheDocument()
  }, 20_000)

  it('shows the water safety disclaimer on the water quality page', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: /environmental overview/i })

    const nav = screen.getAllByRole('navigation', { name: /main navigation/i })[0]
    await user.click(within(nav).getByRole('link', { name: /water quality/i }))

    // The disclaimer is repeated deliberately: once above the record list and
    // again beside the scoring methodology.
    const disclaimers = await screen.findAllByText(
      /not a drinking-water safety determination/i,
    )
    expect(disclaimers.length).toBeGreaterThan(0)
  }, 20_000)
})

describe('API failure handling', () => {
  it('offers retry and an explicit demonstration-data option on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    render(<App />)

    expect(
      await screen.findByText(/could not reach the data provider/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /show demonstration data/i }),
    ).toBeInTheDocument()
  })

  it('labels demonstration data prominently once the user opts into it', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    render(<App />)

    await user.click(
      await screen.findByRole('button', { name: /show demonstration data/i }),
    )

    expect(
      await screen.findByText(/showing demonstration data — not real measurements/i),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Demonstration data').length).toBeGreaterThan(0)
  }, 20_000)
})

describe('newer features', () => {
  it('opens the command menu with Ctrl+K and navigates from it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: /environmental overview/i })

    await user.keyboard('{Control>}k{/Control}')
    const search = await screen.findByRole('combobox', { name: /search commands/i })
    await user.type(search, 'water quality')
    await user.keyboard('{Enter}')

    expect(
      await screen.findByRole('heading', { level: 1, name: /water quality monitoring/i }),
    ).toBeInTheDocument()
  }, 20_000)

  it('shows the AQI alert banner above the default threshold of 150', async () => {
    render(<App />)
    // The fixture AQI is 162.
    expect(await screen.findByText(/above your alert level of 150/i)).toBeInTheDocument()
  })

  it('renders the Compare Cities page from the sidebar', async () => {
    const user = userEvent.setup()
    render(<App />)
    const nav = screen.getAllByRole('navigation', { name: /main navigation/i })[0]
    await user.click(within(nav).getByRole('link', { name: /compare cities/i }))
    expect(
      await screen.findByRole('heading', { level: 1, name: /compare cities/i }),
    ).toBeInTheDocument()
  }, 20_000)

  it('renders the printable report', async () => {
    window.history.pushState({}, '', '/report')
    render(<App />)
    expect(await screen.findByRole('button', { name: /print or save as pdf/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /air quality/i })).toBeInTheDocument()
  })
})
