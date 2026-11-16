/**
 * EcoTrack mark: three contour lines around a sampling point, the way an
 * isopleth map draws equal concentrations around a source.
 */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <g stroke="white" strokeWidth="1.6" strokeLinecap="round">
        <path d="M7 21.5c1.8-6.2 6.4-10 12-10.3" opacity="0.45" />
        <path d="M10.5 22.5c1.2-4.3 4.2-7 8.1-7.4" opacity="0.7" />
        <path d="M14.2 23.4c.6-2.3 2.1-3.8 4.3-4.1" />
      </g>
      <circle cx="22.5" cy="22" r="2.2" fill="white" />
    </svg>
  )
}
