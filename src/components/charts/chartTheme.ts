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
    grid: isDark ? '#222b27' : '#e8ece9',
    axis: isDark ? '#8f9c95' : '#66736c',
    tooltipBg: isDark ? '#161d1a' : '#ffffff',
    tooltipBorder: isDark ? '#37423d' : '#d9dfdb',
    tooltipText: isDark ? '#e8ece9' : '#161d1a',
    accent: isDark ? '#4f957c' : '#1f5e4e',
  }
}
