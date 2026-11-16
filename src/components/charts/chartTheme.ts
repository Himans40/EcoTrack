import { useSettings } from '@/context/SettingsContext'

export interface ChartTheme {
  grid: string
  axis: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  /** Primary series colour, lifted in dark mode so it stays legible. */
  accent: string
}

/**
 * Recharts needs concrete colour values rather than CSS classes, so the
 * palette is derived from the resolved theme here and passed down as props.
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useSettings()
  const isDark = resolvedTheme === 'dark'
  return {
    grid: isDark ? '#28282c' : '#f0f0f2',
    axis: isDark ? '#a3a3aa' : '#74747c',
    tooltipBg: isDark ? '#18181b' : '#ffffff',
    tooltipBorder: isDark ? '#3f3f45' : '#e9e9eb',
    tooltipText: isDark ? '#f4f4f5' : '#18181b',
    accent: isDark ? '#7aa48f' : '#44705e',
  }
}
