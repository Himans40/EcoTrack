/**
 * Application root: providers, router and route table.
 *
 * Provider order matters. Settings sits outermost because the theme must be
 * applied before anything renders; Location comes next because the data
 * provider depends on the active location; EnvironmentData is innermost of
 * the three so every page shares one fetch. Toasts sit near the top so any
 * provider or page can show one.
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SettingsProvider } from '@/context/SettingsContext'
import { LocationProvider } from '@/context/LocationContext'
import { WaterProvider } from '@/context/WaterContext'
import { EnvironmentDataProvider } from '@/context/EnvironmentDataContext'
import { ToastProvider } from '@/context/ToastContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import OverviewPage from '@/pages/Overview'
import AirQualityPage from '@/pages/AirQuality'
import WaterQualityPage from '@/pages/WaterQuality'
import EnvironmentMapPage from '@/pages/EnvironmentMapPage'
import AnalyticsPage from '@/pages/Analytics'
import ComparePage from '@/pages/Compare'
import EducationPage from '@/pages/Education'
import SettingsPage from '@/pages/Settings'
import NotFoundPage from '@/pages/NotFound'

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ToastProvider>
          <LocationProvider>
            <WaterProvider>
              <EnvironmentDataProvider>
                <BrowserRouter>
                  <Routes>
                    <Route element={<AppLayout />}>
                      <Route index element={<OverviewPage />} />
                      <Route path="/air-quality" element={<AirQualityPage />} />
                      <Route path="/water-quality" element={<WaterQualityPage />} />
                      <Route path="/map" element={<EnvironmentMapPage />} />
                      <Route path="/analytics" element={<AnalyticsPage />} />
                      <Route path="/compare" element={<ComparePage />} />
                      <Route path="/learn" element={<EducationPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      {/* Legacy/alternate paths kept working rather than 404ing. */}
                      <Route path="/education" element={<Navigate to="/learn" replace />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>
                  </Routes>
                </BrowserRouter>
              </EnvironmentDataProvider>
            </WaterProvider>
          </LocationProvider>
        </ToastProvider>
      </SettingsProvider>
    </ErrorBoundary>
  )
}
