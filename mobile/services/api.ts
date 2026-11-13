import { Platform } from 'react-native';

// ============================================================================
// 1. CONFIGURATION & BASE URL
// ============================================================================
// - iOS Simulator: 'http://localhost:5001'
// - Android Emulator: 'http://10.0.2.2:5001'
// - Physical Device (Expo Go): Replace with your computer's local Wi-Fi IP (e.g. 'http://192.168.1.15:5001')
const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001';

export const API_BASE_URL = DEFAULT_HOST;

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================

/**
 * Atmospheric Telemetry Snapshot (Air Quality)
 */
export interface AirReading {
  id: number;
  locationId: number;
  pm25: number;          // Particulate Matter ≤ 2.5 µm (µg/m³)
  pm10: number;          // Particulate Matter ≤ 10 µm (µg/m³)
  co2: number;           // Carbon Dioxide (ppm)
  aqi_score: number;     // Standardized Air Quality Index (0 - 500)
  timestamp: string;     // ISO 8601 DateTime string
}

/**
 * Aquatic Telemetry Snapshot (Water Quality)
 */
export interface WaterReading {
  id: number;
  locationId: number;
  ph: number;               // Potential of Hydrogen (0 - 14)
  turbidity: number;        // Water clarity/cloudiness (NTU)
  dissolved_oxygen: number; // Dissolved Oxygen (mg/L)
  wqi_score: number;        // Standardized Water Quality Index (0 - 100)
  timestamp: string;        // ISO 8601 DateTime string
}

/**
 * Geographic Monitoring Station with its latest sensor readings
 */
export interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  latestAirReading: AirReading | null;
  latestWaterReading: WaterReading | null;
}

/**
 * Historical Telemetry Data Payload for Charts
 */
export interface LocationHistoryResponse {
  locationId: number;
  locationName: string;
  airHistory: AirReading[];
  waterHistory: WaterReading[];
}

/**
 * Standard Unified Backend JSON Response Wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

// ============================================================================
// 3. API SERVICE HELPER FUNCTIONS
// ============================================================================

/**
 * Internal helper to handle fetch requests with standard error handling
 */
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
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

    const json: ApiResponse<T> = await response.json();
    if (!json.success) {
      throw new Error(json.message || 'API request failed');
    }

    return json.data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Fetches all monitored geographic stations with their single latest air and water readings
 */
export async function getLocations(): Promise<Location[]> {
  return request<Location[]>('/api/locations');
}

/**
 * Fetches single station metadata and its latest reading by ID
 */
export async function getLocationById(locationId: number): Promise<Location> {
  return request<Location>(`/api/locations/${locationId}`);
}

/**
 * Fetches up to the last 20 historical readings for a station (ordered chronologically for charting)
 */
export async function getLocationHistory(locationId: number): Promise<LocationHistoryResponse> {
  return request<LocationHistoryResponse>(`/api/locations/${locationId}/history`);
}

/**
 * Posts simulated IoT sensor data to the backend
 */
export async function postMockSensorData(payload: {
  locationId: number;
  type?: 'air' | 'water';
  pm25?: number;
  pm10?: number;
  co2?: number;
  aqi_score?: number;
  ph?: number;
  turbidity?: number;
  dissolved_oxygen?: number;
  wqi_score?: number;
}): Promise<any> {
  return request<any>('/api/mock-sensor', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

