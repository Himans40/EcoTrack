import {
  BookOpen,
  Droplets,
  LayoutDashboard,
  LineChart,
  Map,
  Settings,
  Wind,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavGroup = 'monitor' | 'review' | 'reference'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  description: string
  group: NavGroup
}

/** Section headings for the sidebar, in display order. */
export const NAV_GROUPS: { key: NavGroup; label: string }[] = [
  { key: 'monitor', label: 'Monitor' },
  { key: 'review', label: 'Review' },
  { key: 'reference', label: 'Reference' },
]

/** Single source of truth for navigation — the sidebar and the mobile drawer
 *  both render from this list, so they can never drift out of sync. */
export const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Overview',
    icon: LayoutDashboard,
    description: 'Combined air, water and weather summary',
    group: 'monitor',
  },
  {
    to: '/air-quality',
    label: 'Air Quality',
    icon: Wind,
    description: 'US AQI, six pollutants and trends',
    group: 'monitor',
  },
  {
    to: '/water-quality',
    label: 'Water Quality',
    icon: Droplets,
    description: 'Record and track water samples',
    group: 'monitor',
  },
  {
    to: '/map',
    label: 'Environmental Map',
    icon: Map,
    description: 'Locations and sampling points',
    group: 'monitor',
  },
  {
    to: '/analytics',
    label: 'Historical Analytics',
    icon: LineChart,
    description: 'Air and water trends over time',
    group: 'review',
  },
  {
    to: '/learn',
    label: 'Learn',
    icon: BookOpen,
    description: 'AQI categories and pollutant guides',
    group: 'reference',
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
    description: 'Theme, units, refresh and data',
    group: 'reference',
  },
]
