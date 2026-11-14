import { useSettings } from '@/context/SettingsContext'

export interface ChartTheme {
  grid: string
  axis: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
}

/**
 * Recharts needs concrete colour values rather than CSS classes, so the
 * palette is derived from the resolved theme here and passed down as props.
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useSettings()
  const isDark = resolvedTheme === 'dark'
  return {
    grid: isDark ? '#1e293b' : '#e2e8f0',
    axis: isDark ? '#94a3b8' : '#64748b',
    tooltipBg: isDark ? '#0f172a' : '#ffffff',
    tooltipBorder: isDark ? '#334155' : '#e2e8f0',
    tooltipText: isDark ? '#e2e8f0' : '#0f172a',
  }
}
