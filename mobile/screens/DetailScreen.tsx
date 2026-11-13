import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { getLocationById, Location } from '../services/api';

type DetailScreenProps = NativeStackScreenProps<RootStackParamList, 'Detail'>;

// ============================================================================
// DYNAMIC COLOR CODING & CLASSIFICATION LOGIC
// ============================================================================

/**
 * Returns dynamic color based on AQI:
 * - AQI < 50: Green (Good)
 * - AQI 51 - 100: Amber (Moderate)
 * - AQI 101 - 150: Orange (Sensitive alert)
 * - AQI > 150: Red (Unhealthy / Hazardous)
 */
export const getAqiTheme = (aqi: number | undefined | null) => {
  if (aqi === undefined || aqi === null) {
    return { color: '#64748B', label: 'No Telemetry', bgTint: 'rgba(100, 116, 139, 0.15)' };
  }
  if (aqi < 50) {
    return { color: '#10B981', label: 'Good (Clean Air)', bgTint: 'rgba(16, 185, 129, 0.15)' };
  }
  if (aqi <= 100) {
    return { color: '#F59E0B', label: 'Moderate Quality', bgTint: 'rgba(245, 158, 11, 0.15)' };
  }
  if (aqi <= 150) {
    return { color: '#F97316', label: 'Sensitive Warning', bgTint: 'rgba(249, 115, 22, 0.15)' };
  }
  return { color: '#EF4444', label: 'Unhealthy / Hazardous', bgTint: 'rgba(239, 68, 68, 0.15)' };
};

/**
 * Returns dynamic color based on WQI:
 * - WQI >= 80: Green (Excellent / Good)
 * - WQI 50 - 79: Amber (Moderate)
 * - WQI < 50: Red (Poor / Contaminated)
 */
export const getWqiTheme = (wqi: number | undefined | null) => {
  if (wqi === undefined || wqi === null) {
    return { color: '#64748B', label: 'No Telemetry', bgTint: 'rgba(100, 116, 139, 0.15)' };
  }
  if (wqi >= 80) {
    return { color: '#10B981', label: 'Excellent / Pure', bgTint: 'rgba(16, 185, 129, 0.15)' };
  }
  if (wqi >= 50) {
    return { color: '#F59E0B', label: 'Moderate Quality', bgTint: 'rgba(245, 158, 11, 0.15)' };
  }
  return { color: '#EF4444', label: 'Poor / Contaminated', bgTint: 'rgba(239, 68, 68, 0.15)' };
};

export default function DetailScreen({ route, navigation }: DetailScreenProps) {
  const { locationId, locationName } = route.params;

  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the latest reading for this location
  const fetchStationData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLocationById(locationId);
      setLocation(data);
    } catch (err) {
      console.error(`Error loading station #${locationId}:`, err);
      setError('Failed to fetch the latest sensor reading for this location.');
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchStationData();
  }, [fetchStationData]);

  const airReading = location?.latestAirReading;
  const waterReading = location?.latestWaterReading;

  const aqiTheme = getAqiTheme(airReading?.aqi_score);
  const wqiTheme = getWqiTheme(waterReading?.wqi_score);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. LOADING STATE */}
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={styles.loadingText}>Fetching real-time telemetry...</Text>
          </View>
        )}

        {/* 2. ERROR STATE */}
        {error && !loading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Telemetry Sync Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchStationData}>
              <Text style={styles.retryButtonText}>Retry Sync</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. LOCATION TELEMETRY OVERVIEW */}
        {!loading && !error && location && (
          <>
            {/* Station Header Card */}
            <View style={styles.headerCard}>
              <View>
                <Text style={styles.stationTitle}>{location.name}</Text>
                <Text style={styles.stationCoords}>
                  Lat: {location.latitude.toFixed(4)} | Long: {location.longitude.toFixed(4)}
                </Text>
              </View>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>REALTIME</Text>
              </View>
            </View>

            {/* SECTION: PROMINENT SCORES */}
            <Text style={styles.sectionHeader}>PRIMARY ENVIRONMENTAL INDICES</Text>
            <View style={styles.scoresRow}>
              {/* AQI Score Card */}
              <View
                style={[
                  styles.scoreCard,
                  {
                    borderTopColor: aqiTheme.color,
                    borderTopWidth: 4,
                    backgroundColor: aqiTheme.bgTint,
                  },
                ]}
              >
                <Text style={styles.scoreCategory}>AIR QUALITY (AQI)</Text>
                <Text style={[styles.scoreValue, { color: aqiTheme.color }]}>
                  {airReading?.aqi_score !== undefined
                    ? Math.round(airReading.aqi_score)
                    : '--'}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: aqiTheme.color },
                  ]}
                >
                  <Text style={styles.statusPillText}>{aqiTheme.label}</Text>
                </View>
              </View>

              {/* WQI Score Card */}
              <View
                style={[
                  styles.scoreCard,
                  {
                    borderTopColor: wqiTheme.color,
                    borderTopWidth: 4,
                    backgroundColor: wqiTheme.bgTint,
                  },
                ]}
              >
                <Text style={styles.scoreCategory}>WATER QUALITY (WQI)</Text>
                <Text style={[styles.scoreValue, { color: wqiTheme.color }]}>
                  {waterReading?.wqi_score !== undefined
                    ? Math.round(waterReading.wqi_score)
                    : '--'}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: wqiTheme.color },
                  ]}
                >
                  <Text style={styles.statusPillText}>{wqiTheme.label}</Text>
                </View>
              </View>
            </View>

            {/* SECTION: SUB-PARAMETER SENSOR BREAKDOWNS */}
            <Text style={styles.sectionHeader}>ATMOSPHERIC METRICS</Text>
            <View style={styles.breakdownCard}>
              {airReading ? (
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridValue}>{airReading.pm25} µg/m³</Text>
                    <Text style={styles.gridLabel}>PM 2.5</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridValue}>{airReading.pm10} µg/m³</Text>
                    <Text style={styles.gridLabel}>PM 10</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridValue}>{airReading.co2} ppm</Text>
                    <Text style={styles.gridLabel}>CO₂ Level</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noData}>No atmospheric reading recorded.</Text>
              )}
            </View>

            <Text style={styles.sectionHeader}>AQUATIC METRICS</Text>
            <View style={styles.breakdownCard}>
              {waterReading ? (
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridValue}>{waterReading.ph.toFixed(1)}</Text>
                    <Text style={styles.gridLabel}>pH Value</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridValue}>{waterReading.turbidity} NTU</Text>
                    <Text style={styles.gridLabel}>Turbidity</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridValue}>{waterReading.dissolved_oxygen} mg/L</Text>
                    <Text style={styles.gridLabel}>Dissolved O₂</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noData}>No aquatic reading recorded.</Text>
              )}
            </View>

            {/* Back to Stations Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>⬅ Back to All Stations</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  stationCoords: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    marginTop: 8,
    letterSpacing: 1.2,
  },
  scoresRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  scoreCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  scoreCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  scoreValue: {
    fontSize: 38,
    fontWeight: '900',
    marginVertical: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  breakdownCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    alignItems: 'center',
    flex: 1,
  },
  gridValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  gridLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  noData: {
    color: '#64748B',
    fontStyle: 'italic',
    fontSize: 12,
  },
  backButton: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 14,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
  },
  errorCard: {
    backgroundColor: '#451A1A',
    borderColor: '#991B1B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginVertical: 20,
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

