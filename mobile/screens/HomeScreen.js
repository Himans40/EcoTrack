import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { getLocations, postMockSensorData } from '../services/api';

// Helper: Dynamic badge color for AQI
const getAqiBadgeColor = (aqi) => {
  if (aqi === undefined || aqi === null) return '#64748B';
  if (aqi <= 50) return '#10B981'; // Green (Good)
  if (aqi <= 100) return '#F59E0B'; // Amber (Moderate)
  if (aqi <= 150) return '#F97316'; // Orange (Sensitive)
  return '#EF4444'; // Red (Unhealthy)
};

// Helper: Dynamic badge color for WQI
const getWqiBadgeColor = (wqi) => {
  if (wqi === undefined || wqi === null) return '#64748B';
  if (wqi >= 80) return '#10B981'; // Green (Excellent)
  if (wqi >= 50) return '#F59E0B'; // Amber (Moderate)
  return '#EF4444'; // Red (Poor)
};

export default function HomeScreen({ navigation }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('Just now');

  // Fetch telemetry stations from backend API
  const fetchLocationsList = useCallback(async (isPullToRefresh = false) => {
    try {
      if (!isPullToRefresh) setLoading(true);
      setError(null);
      const data = await getLocations();
      setLocations(data);
      const currentTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastUpdated(currentTime);
    } catch (err) {
      console.error('Failed to load stations:', err);
      setError(
        'Unable to connect to EcoMonitor backend. Ensure the server is running on port 5001 and database credentials are valid.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLocationsList();
  }, [fetchLocationsList]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLocationsList(true);
  }, [fetchLocationsList]);

  // Demo helper: Injects mock telemetry for instant pull-to-refresh testing
  const handleSimulateIoT = async (locationId, locationName) => {
    try {
      const randomAqi = Math.floor(Math.random() * 170) + 25;
      await postMockSensorData({
        locationId,
        type: 'air',
        aqi_score: randomAqi,
        pm25: parseFloat((randomAqi * 0.45).toFixed(1)),
        pm10: parseFloat((randomAqi * 0.95).toFixed(1)),
        no2: 42,
      });
      Alert.alert(
        '⚡ IoT Telemetry Injected',
        `Simulated incoming sensor burst for "${locationName}". Swipe down to refresh!`
      );
      fetchLocationsList(true);
    } catch (err) {
      Alert.alert('Simulation Notice', 'Could not post simulated IoT reading.');
    }
  };

  // Render individual station card
  const renderLocationCard = ({ item }) => {
    const aqi = item.latestAirReading?.aqi_score;
    const wqi = item.latestWaterReading?.wqi_score;
    const isCleanZone = aqi !== undefined && aqi !== null && aqi < 50;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { borderLeftColor: isCleanZone ? '#10B981' : '#EF4444', borderLeftWidth: 4 },
        ]}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('Detail', {
            locationId: item.id,
            locationName: item.name,
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.stationName}>{item.name}</Text>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isCleanZone ? '#10B981' : '#EF4444' },
                ]}
              />
            </View>
            <Text style={styles.coords}>
              Lat: {item.latitude ? item.latitude.toFixed(4) : item.lat} | Long:{' '}
              {item.longitude ? item.longitude.toFixed(4) : item.lng}
            </Text>
          </View>
          <View style={styles.chevronWrapper}>
            <Text style={styles.chevron}>➔</Text>
          </View>
        </View>

        {/* Environmental Scores & Actions */}
        <View style={styles.footerRow}>
          <View style={styles.badgeRow}>
            {/* AQI Badge */}
            <View style={[styles.badge, { borderColor: getAqiBadgeColor(aqi) }]}>
              <Text style={styles.badgeLabel}>AQI</Text>
              <Text style={[styles.badgeValue, { color: getAqiBadgeColor(aqi) }]}>
                {aqi !== undefined && aqi !== null ? Math.round(aqi) : '--'}
              </Text>
            </View>

            {/* WQI Badge */}
            <View style={[styles.badge, { borderColor: getWqiBadgeColor(wqi) }]}>
              <Text style={styles.badgeLabel}>WQI</Text>
              <Text style={[styles.badgeValue, { color: getWqiBadgeColor(wqi) }]}>
                {wqi !== undefined && wqi !== null ? Math.round(wqi) : '--'}
              </Text>
            </View>
          </View>

          {/* Quick Mock Ingestion trigger for live presentation demo */}
          <TouchableOpacity
            style={styles.simButton}
            onPress={() => handleSimulateIoT(item.id, item.name)}
          >
            <Text style={styles.simButtonText}>⚡ Pulse IoT</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. LOADING STATE */}
      {loading && !refreshing && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Syncing environmental telemetry stations...</Text>
        </View>
      )}

      {/* 2. ERROR STATE */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Network Connection Notice</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchLocationsList(false)}>
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. LOCATIONS LIST WITH PULL-TO-REFRESH */}
      {!loading && !error && (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLocationCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#38BDF8"
              colors={['#38BDF8', '#10B981']}
              title="Pulling latest telemetry..."
              titleColor="#94A3B8"
            />
          }
          ListHeaderComponent={
            <View style={styles.headerComponent}>
              <View style={styles.networkStatusCard}>
                <View style={styles.networkPulse}>
                  <View style={styles.pulseInner} />
                </View>
                <View style={styles.networkInfo}>
                  <Text style={styles.networkStatusTitle}>TELEMETRY NETWORK ACTIVE</Text>
                  <Text style={styles.networkSubtitle}>
                    {locations.length} station(s) reporting • Last synced: {lastUpdated}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>ACTIVE MONITORING STATIONS</Text>
              <Text style={styles.sectionSubtitle}>
                Swipe down to refresh telemetry • Tap a card to view historical trends
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No monitoring stations found in the database.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerComponent: {
    marginBottom: 16,
  },
  networkStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  networkPulse: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pulseInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38BDF8',
  },
  networkInfo: {
    flex: 1,
  },
  networkStatusTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  networkSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stationName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  coords: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  chevronWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chevron: {
    fontSize: 14,
    color: '#38BDF8',
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 5,
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  badgeValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  simButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  simButtonText: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  errorCard: {
    backgroundColor: '#451A1A',
    borderColor: '#991B1B',
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  errorTitle: {
    color: '#FCA5A5',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 6,
  },
  errorText: {
    color: '#FECACA',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

