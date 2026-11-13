import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';

// ============================================================================
// CONFIGURATION
// ============================================================================
// NOTE FOR UNIVERSITY PRESENTATION & TESTING:
// - iOS Simulator: 'http://localhost:5001'
// - Android Emulator: 'http://10.0.2.2:5001'
// - Physical Device (Expo Go): Replace with your computer's local Wi-Fi IP
//   e.g., 'http://192.168.1.15:5001'
const API_BASE_URL = 'http://localhost:5001';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
export interface AirReading {
  id: number;
  locationId: number;
  pm25: number;
  pm10: number;
  co2: number;
  aqi_score: number;
  timestamp: string;
}

export interface WaterReading {
  id: number;
  locationId: number;
  ph: number;
  turbidity: number;
  dissolved_oxygen: number;
  wqi_score: number;
  timestamp: string;
}

export interface LocationData {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  latestAirReading: AirReading | null;
  latestWaterReading: WaterReading | null;
}

// ============================================================================
// COLOR CODING HELPER FUNCTIONS
// ============================================================================

/**
 * Returns dynamic color based on Air Quality Index (AQI):
 * - AQI <= 50: Green (Good)
 * - AQI 51 - 100: Yellow / Amber (Moderate)
 * - AQI 101 - 150: Orange (Unhealthy for Sensitive Groups)
 * - AQI > 150: Red (Unhealthy / Hazardous)
 */
export const getAqiColor = (aqi: number | undefined | null): string => {
  if (aqi === undefined || aqi === null) return '#94A3B8';
  if (aqi <= 50) return '#10B981'; // Green
  if (aqi <= 100) return '#F59E0B'; // Amber
  if (aqi <= 150) return '#F97316'; // Orange
  return '#EF4444'; // Red
};

export const getAqiStatus = (aqi: number | undefined | null): string => {
  if (aqi === undefined || aqi === null) return 'No Data';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Sensitive Alert';
  return 'Unhealthy';
};

/**
 * Returns dynamic color based on Water Quality Index (WQI):
 * - WQI >= 80: Green (Excellent / Good)
 * - WQI 50 - 79: Yellow / Amber (Moderate)
 * - WQI < 50: Red (Poor / Hazardous)
 */
export const getWqiColor = (wqi: number | undefined | null): string => {
  if (wqi === undefined || wqi === null) return '#94A3B8';
  if (wqi >= 80) return '#10B981'; // Green
  if (wqi >= 50) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
};

export const getWqiStatus = (wqi: number | undefined | null): string => {
  if (wqi === undefined || wqi === null) return 'No Data';
  if (wqi >= 80) return 'Excellent';
  if (wqi >= 50) return 'Moderate';
  return 'Poor / Contaminated';
};

// ============================================================================
// MAIN COMPONENT: App
// ============================================================================
export default function App() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Locations and their latest sensor readings from backend
  const fetchLocations = useCallback(async () => {
    try {
      setErrorMessage(null);
      const response = await fetch(`${API_BASE_URL}/api/locations`);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        setLocations(json.data);
      } else {
        throw new Error('Malformed response received from backend.');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setErrorMessage(
        `Unable to reach backend at ${API_BASE_URL}. Ensure the Express server is running and database is seeded.`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Pull-to-refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchLocations();
  };

  // Helper to trigger simulated IoT sensor reading from the app
  const handleSimulateIoT = async () => {
    if (locations.length === 0) return;
    const currentLocation = locations[selectedIndex];

    try {
      // Generate randomized mock values
      const randomAqi = Math.floor(Math.random() * 180) + 20;
      const randomPm25 = parseFloat((randomAqi * 0.45).toFixed(1));
      const randomPm10 = parseFloat((randomPm25 * 2.1).toFixed(1));

      const response = await fetch(`${API_BASE_URL}/api/mock-sensor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: currentLocation.id,
          type: 'air',
          pm25: randomPm25,
          pm10: randomPm10,
          co2: 430.5,
          aqi_score: randomAqi,
        }),
      });

      if (response.ok) {
        Alert.alert('IoT Ingestion Success', `Injected simulated AQI (${randomAqi}) for ${currentLocation.name}.`);
        fetchLocations();
      } else {
        Alert.alert('Simulation Failed', 'Could not post mock sensor telemetry.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to communicate with mock sensor endpoint.');
    }
  };

  const currentLocation = locations[selectedIndex] || null;
  const aqiScore = currentLocation?.latestAirReading?.aqi_score;
  const wqiScore = currentLocation?.latestWaterReading?.wqi_score;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>EcoMonitor 🌿</Text>
          <Text style={styles.headerSubtitle}>Real-time AQI & WQI Environmental Telemetry</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />
        }
      >
        {/* LOADING STATE */}
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={styles.infoText}>Loading sensor stations...</Text>
          </View>
        )}

        {/* ERROR STATE */}
        {errorMessage && !loading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Connection Notice</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchLocations}>
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MAIN CONTENT WHEN LOADED */}
        {!loading && locations.length > 0 && currentLocation && (
          <>
            {/* LOCATION SELECTOR TABS */}
            <Text style={styles.sectionLabel}>MONITORING STATIONS</Text>
            <View style={styles.stationTabs}>
              {locations.map((loc, idx) => {
                const isActive = idx === selectedIndex;
                return (
                  <TouchableOpacity
                    key={loc.id}
                    style={[styles.tabButton, isActive && styles.activeTabButton]}
                    onPress={() => setSelectedIndex(idx)}
                  >
                    <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                      {loc.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* CURRENT LOCATION OVERVIEW CARD */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>{currentLocation.name}</Text>
                  <Text style={styles.coordsText}>
                    Lat: {currentLocation.latitude.toFixed(4)} | Long: {currentLocation.longitude.toFixed(4)}
                  </Text>
                </View>
                <View style={styles.liveBadge}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              </View>

              {/* DUAL METRIC SUMMARY TILES */}
              <View style={styles.metricRow}>
                {/* AQI TILE */}
                <View
                  style={[
                    styles.metricTile,
                    { borderTopColor: getAqiColor(aqiScore), borderTopWidth: 4 },
                  ]}
                >
                  <Text style={styles.metricLabel}>AIR QUALITY (AQI)</Text>
                  <Text style={[styles.metricScore, { color: getAqiColor(aqiScore) }]}>
                    {aqiScore !== undefined && aqiScore !== null ? Math.round(aqiScore) : '--'}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: `${getAqiColor(aqiScore)}22` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: getAqiColor(aqiScore) },
                      ]}
                    >
                      {getAqiStatus(aqiScore)}
                    </Text>
                  </View>
                </View>

                {/* WQI TILE */}
                <View
                  style={[
                    styles.metricTile,
                    { borderTopColor: getWqiColor(wqiScore), borderTopWidth: 4 },
                  ]}
                >
                  <Text style={styles.metricLabel}>WATER QUALITY (WQI)</Text>
                  <Text style={[styles.metricScore, { color: getWqiColor(wqiScore) }]}>
                    {wqiScore !== undefined && wqiScore !== null ? Math.round(wqiScore) : '--'}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: `${getWqiColor(wqiScore)}22` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: getWqiColor(wqiScore) },
                      ]}
                    >
                      {getWqiStatus(wqiScore)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* DETAILED SENSOR BREAKDOWNS */}
            <Text style={styles.sectionLabel}>DETAILED SENSOR BREAKDOWN</Text>

            {/* Air Quality Breakdown */}
            <View style={styles.breakdownCard}>
              <Text style={styles.subCardTitle}>💨 Atmospheric Sensor Readouts</Text>
              {currentLocation.latestAirReading ? (
                <View style={styles.sensorGrid}>
                  <View style={styles.sensorItem}>
                    <Text style={styles.sensorValue}>
                      {currentLocation.latestAirReading.pm25} µg/m³
                    </Text>
                    <Text style={styles.sensorKey}>PM 2.5</Text>
                  </View>
                  <View style={styles.sensorItem}>
                    <Text style={styles.sensorValue}>
                      {currentLocation.latestAirReading.pm10} µg/m³
                    </Text>
                    <Text style={styles.sensorKey}>PM 10</Text>
                  </View>
                  <View style={styles.sensorItem}>
                    <Text style={styles.sensorValue}>
                      {currentLocation.latestAirReading.co2} ppm
                    </Text>
                    <Text style={styles.sensorKey}>CO₂</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noDataText}>No atmospheric readings recorded yet.</Text>
              )}
            </View>

            {/* Water Quality Breakdown */}
            <View style={styles.breakdownCard}>
              <Text style={styles.subCardTitle}>💧 Aquatic Sensor Readouts</Text>
              {currentLocation.latestWaterReading ? (
                <View style={styles.sensorGrid}>
                  <View style={styles.sensorItem}>
                    <Text style={styles.sensorValue}>
                      {currentLocation.latestWaterReading.ph.toFixed(1)}
                    </Text>
                    <Text style={styles.sensorKey}>pH Level</Text>
                  </View>
                  <View style={styles.sensorItem}>
                    <Text style={styles.sensorValue}>
                      {currentLocation.latestWaterReading.turbidity} NTU
                    </Text>
                    <Text style={styles.sensorKey}>Turbidity</Text>
                  </View>
                  <View style={styles.sensorItem}>
                    <Text style={styles.sensorValue}>
                      {currentLocation.latestWaterReading.dissolved_oxygen} mg/L
                    </Text>
                    <Text style={styles.sensorKey}>Dissolved O₂</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noDataText}>No aquatic readings recorded yet.</Text>
              )}
            </View>

            {/* QUICK ACTIONS FOR DEMONSTRATION */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.iotButton} onPress={handleSimulateIoT}>
                <Text style={styles.iotButtonText}>⚡ Simulate Incoming IoT Telemetry</Text>
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Swipe down to pull-to-refresh or tap above to inject live mock data.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLESHEET
// ============================================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1E293B', // Slate 800
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    marginTop: 12,
    letterSpacing: 1.2,
  },
  stationTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  coordsText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  metricScore: {
    fontSize: 36,
    fontWeight: '900',
    marginVertical: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  breakdownCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  subCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 12,
  },
  sensorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sensorItem: {
    alignItems: 'center',
    flex: 1,
  },
  sensorValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  sensorKey: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  noDataText: {
    color: '#64748B',
    fontStyle: 'italic',
    fontSize: 12,
  },
  actionsContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  iotButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  iotButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  helperText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#451A1A',
    borderColor: '#991B1B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginVertical: 16,
  },
  errorTitle: {
    color: '#FCA5A5',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  errorText: {
    color: '#FECACA',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
});

