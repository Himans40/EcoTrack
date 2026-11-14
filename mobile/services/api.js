import { Platform } from 'react-native';

// ============================================================================
// 1. CONFIGURATION & BASE URL
// ============================================================================
// - iOS Simulator / Web: 'http://localhost:5001'
// - Android Emulator: 'http://10.0.2.2:5001'
// - Physical Device (Expo Go): Local LAN IP (e.g. 'http://192.168.1.15:5001')
const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001';

export const API_BASE_URL = DEFAULT_HOST;

// ============================================================================
// 2. API REQUEST HELPER
// ============================================================================

async function request(endpoint, options) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody || response.statusText}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.message || 'API request failed');
    }

    return json.data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}

// ============================================================================
// 3. EXPORTED API FUNCTIONS
// ============================================================================

/**
 * Fetches all monitored stations with their single latest air & water readings
 */
export async function getLocations() {
  return request('/api/locations');
}

/**
 * Fetches single station metadata and its latest reading by ID
 */
export async function getLocationById(locationId) {
  return request(`/api/locations/${locationId}`);
}

/**
 * Fetches up to the last 20 historical readings for a station
 */
export async function getLocationHistory(locationId) {
  return request(`/api/locations/${locationId}/history`);
}

/**
 * Posts simulated IoT sensor data to the backend
 */
export async function postMockSensorData(payload) {
  return request('/api/mock-sensor', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

