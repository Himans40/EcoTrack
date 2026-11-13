import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { getLocations, Location } from '../services/api';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

// Helper: Color logic for quick AQI indicator badge
const getAqiBadgeColor = (aqi: number | undefined | null) => {
  if (aqi === undefined || aqi === null) return '#64748B';
  if (aqi <= 50) return '#10B981'; // Green (Good)
  if (aqi <= 100) return '#F59E0B'; // Amber (Moderate)
  if (aqi <= 150) return '#F97316'; // Orange (Sensitive)
  return '#EF4444'; // Red (Unhealthy)
};

// Helper: Color logic for quick WQI indicator badge
const getWqiBadgeColor = (wqi: number | undefined | null) => {
  if (wqi === undefined || wqi === null) return '#64748B';
  if (wqi >= 80) return '#10B981'; // Green (Excellent)
  if (wqi >= 50) return '#F59E0B'; // Amber (Moderate)
  return '#EF4444'; // Red (Poor)
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch telemetry stations from backend API
  const fetchLocationsList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLocations();
      setLocations(data);
    } catch (err) {
      console.error('Failed to load stations:', err);
      setError(
        'Unable to connect to EcoMonitor backend. Ensure the server is running on port 5001 and database credentials are valid.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchLocationsList();
  }, [fetchLocationsList]);

  // Render individual station item
  const renderLocationCard = ({ item }: { item: Location }) => {
    const aqi = item.latestAirReading?.aqi_score;
    const wqi = item.latestWaterReading?.wqi_score;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('Detail', {
            locationId: item.id,
            locationName: item.name,
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.stationName}>{item.name}</Text>
            <Text style={styles.coords}>
              Lat: {item.latitude.toFixed(4)} | Long: {item.longitude.toFixed(4)}
            </Text>
          </View>
          <Text style={styles.chevron}>➔</Text>
        </View>

        {/* Quick Environmental Scores Row */}
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
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. LOADING STATE */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Loading environmental monitoring stations...</Text>
        </View>
      )}

      {/* 2. ERROR STATE */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Network Connection Notice</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchLocationsList}>
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. LOCATIONS LIST */}
      {!loading && !error && (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLocationCard}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.headerComponent}>
              <Text style={styles.sectionTitle}>ACTIVE MONITORING STATIONS</Text>
              <Text style={styles.sectionSubtitle}>
                Select a station to inspect live telemetry and historical trends
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
    backgroundColor: '#0F172A', // Slate 900
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerComponent: {
    marginBottom: 16,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
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
  stationName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  coords: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
    color: '#38BDF8',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 6,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  badgeValue: {
    fontSize: 14,
    fontWeight: '800',
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
    borderRadius: 10,
    padding: 18,
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
    borderRadius: 6,
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

