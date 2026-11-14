const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { calculateAQI, calculateWQI } = require('./src/utils/calculators');

// Load environment variables from .env
dotenv.config();

// Initialize Express app and Prisma Client
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5001;

// ==========================================
// Middleware Configuration
// ==========================================
app.use(cors());
app.use(express.json());

// ==========================================
// In-Memory Fallback Seed Data (Safe presentation fallback if DB offline)
// ==========================================
const fallbackStations = [
  {
    id: 1,
    name: 'Central City Park',
    lat: 28.6139,
    lng: 77.209,
    latitude: 28.6139,
    longitude: 77.209,
    latestAirReading: {
      id: 1,
      locationId: 1,
      pm25: 14.0,
      pm10: 28.5,
      no2: 18.2,
      aqiScore: 42.0,
      aqi_score: 42.0,
      timestamp: new Date().toISOString(),
    },
    latestWaterReading: {
      id: 1,
      locationId: 1,
      ph: 7.4,
      turbidity: 2.1,
      dissolvedOxygen: 7.8,
      wqiScore: 88.5,
      wqi_score: 88.5,
      timestamp: new Date().toISOString(),
    },
  },
  {
    id: 2,
    name: 'Riverside Industrial Zone',
    lat: 28.5355,
    lng: 77.391,
    latitude: 28.5355,
    longitude: 77.391,
    latestAirReading: {
      id: 2,
      locationId: 2,
      pm25: 96.4,
      pm10: 182.2,
      no2: 65.4,
      aqiScore: 172.0,
      aqi_score: 172.0,
      timestamp: new Date().toISOString(),
    },
    latestWaterReading: {
      id: 2,
      locationId: 2,
      ph: 5.6,
      turbidity: 16.8,
      dissolvedOxygen: 3.1,
      wqiScore: 38.0,
      wqi_score: 38.0,
      timestamp: new Date().toISOString(),
    },
  },
  {
    id: 3,
    name: 'Downtown Metro Hub',
    lat: 28.6328,
    lng: 77.2197,
    latitude: 28.6328,
    longitude: 77.2197,
    latestAirReading: {
      id: 3,
      locationId: 3,
      pm25: 28.5,
      pm10: 68.0,
      no2: 42.0,
      aqiScore: 85.0,
      aqi_score: 85.0,
      timestamp: new Date().toISOString(),
    },
    latestWaterReading: {
      id: 3,
      locationId: 3,
      ph: 6.8,
      turbidity: 3.5,
      dissolvedOxygen: 6.4,
      wqiScore: 77.5,
      wqi_score: 77.5,
      timestamp: new Date().toISOString(),
    },
  },
];

// Helper to generate 20 trend points for historical charts
function generateMockHistory(baseAqi, baseWqi, locationId) {
  const airHistory = [];
  const waterHistory = [];
  const now = Date.now();

  for (let i = 19; i >= 0; i--) {
    const time = new Date(now - i * 15 * 60 * 1000).toISOString();
    const aqiJitter = Math.sin(i) * 12 + (Math.random() * 8 - 4);
    const wqiJitter = Math.cos(i) * 6 + (Math.random() * 4 - 2);

    const aqi = Math.max(10, Math.round(baseAqi + aqiJitter));
    const wqi = Math.min(100, Math.max(10, Math.round((baseWqi + wqiJitter) * 10) / 10));

    airHistory.push({
      id: 100 + i,
      locationId,
      pm25: parseFloat((aqi * 0.45).toFixed(1)),
      pm10: parseFloat((aqi * 0.95).toFixed(1)),
      no2: parseFloat((aqi * 0.35).toFixed(1)),
      aqiScore: aqi,
      aqi_score: aqi,
      timestamp: time,
    });

    waterHistory.push({
      id: 200 + i,
      locationId,
      ph: parseFloat((7.0 + (wqi > 50 ? 0.3 : -1.2)).toFixed(1)),
      turbidity: parseFloat((wqi > 50 ? 2.5 : 14.0).toFixed(1)),
      dissolvedOxygen: parseFloat((wqi > 50 ? 7.5 : 3.2).toFixed(1)),
      wqiScore: wqi,
      wqi_score: wqi,
      timestamp: time,
    });
  }

  return { airHistory, waterHistory };
}

// ==========================================
// 0. Health Check Endpoints
// ==========================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'EcoMonitor Backend API (JavaScript)',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'EcoMonitor Backend API (JavaScript)',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 1. GET /api/locations
// ==========================================
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      include: {
        airReadings: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        waterReadings: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
    });

    if (locations && locations.length > 0) {
      const responsePayload = locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        lat: loc.lat,
        lng: loc.lng,
        latitude: loc.lat,
        longitude: loc.lng,
        latestAirReading: loc.airReadings.length > 0 ? {
          ...loc.airReadings[0],
          aqi_score: loc.airReadings[0].aqiScore,
        } : null,
        latestWaterReading: loc.waterReadings.length > 0 ? {
          ...loc.waterReadings[0],
          wqi_score: loc.waterReadings[0].wqiScore,
        } : null,
      }));

      return res.status(200).json({
        success: true,
        count: responsePayload.length,
        data: responsePayload,
      });
    }

    return res.status(200).json({
      success: true,
      count: fallbackStations.length,
      data: fallbackStations,
    });
  } catch (error) {
    console.warn('⚠️ PostgreSQL database unavailable or unseeded. Serving demo stations.');
    return res.status(200).json({
      success: true,
      count: fallbackStations.length,
      data: fallbackStations,
    });
  }
});

// ==========================================
// 2. GET /api/locations/:id
// ==========================================
app.get('/api/locations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid location ID.' });
    }

    try {
      const location = await prisma.location.findUnique({
        where: { id },
        include: {
          airReadings: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
          waterReadings: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      if (location) {
        return res.status(200).json({
          success: true,
          data: {
            id: location.id,
            name: location.name,
            lat: location.lat,
            lng: location.lng,
            latitude: location.lat,
            longitude: location.lng,
            latestAirReading: location.airReadings.length > 0 ? {
              ...location.airReadings[0],
              aqi_score: location.airReadings[0].aqiScore,
            } : null,
            latestWaterReading: location.waterReadings.length > 0 ? {
              ...location.waterReadings[0],
              wqi_score: location.waterReadings[0].wqiScore,
            } : null,
          },
        });
      }
    } catch (dbErr) {
      // Fall through to fallback
    }

    const fallback = fallbackStations.find((s) => s.id === id) || fallbackStations[0];
    return res.status(200).json({
      success: true,
      data: fallback,
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve location.',
      error: error.message || 'Unknown internal error',
    });
  }
});

// ==========================================
// 3. GET /api/locations/:id/history
// ==========================================
app.get('/api/locations/:id/history', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid location ID.' });
    }

    try {
      const location = await prisma.location.findUnique({
        where: { id },
        include: {
          airReadings: {
            orderBy: { timestamp: 'desc' },
            take: 20,
          },
          waterReadings: {
            orderBy: { timestamp: 'desc' },
            take: 20,
          },
        },
      });

      if (location && location.airReadings.length > 0) {
        return res.status(200).json({
          success: true,
          data: {
            locationId: location.id,
            locationName: location.name,
            airHistory: [...location.airReadings].reverse().map((r) => ({
              ...r,
              aqi_score: r.aqiScore,
            })),
            waterHistory: [...location.waterReadings].reverse().map((r) => ({
              ...r,
              wqi_score: r.wqiScore,
            })),
          },
        });
      }
    } catch (dbErr) {
      // Fall through to fallback
    }

    const baseStation = fallbackStations.find((s) => s.id === id) || fallbackStations[0];
    const mock = generateMockHistory(
      baseStation.latestAirReading.aqi_score,
      baseStation.latestWaterReading.wqi_score,
      baseStation.id
    );

    return res.status(200).json({
      success: true,
      data: {
        locationId: baseStation.id,
        locationName: baseStation.name,
        airHistory: mock.airHistory,
        waterHistory: mock.waterHistory,
      },
    });
  } catch (error) {
    console.error('Error fetching location history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve location history.',
      error: error.message || 'Unknown internal error',
    });
  }
});

// ==========================================
// 4. POST /api/mock-sensor
// ==========================================
app.post('/api/mock-sensor', async (req, res) => {
  try {
    const {
      locationId,
      type,
      pm25,
      pm10,
      no2,
      aqi_score,
      aqiScore,
      ph,
      turbidity,
      dissolvedOxygen,
      dissolved_oxygen,
      wqiScore,
      wqi_score,
    } = req.body;

    if (!locationId || typeof locationId !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Field `locationId` (number) is required.',
      });
    }

    const calculatedAqi = parseFloat(aqiScore || aqi_score || 55);
    const calculatedWqi = parseFloat(wqiScore || wqi_score || 80);
    const recordedData = {};

    try {
      if (type === 'air' || aqi_score !== undefined || aqiScore !== undefined) {
        recordedData.air = await prisma.airReading.create({
          data: {
            locationId,
            pm25: parseFloat(pm25 || 25),
            pm10: parseFloat(pm10 || 50),
            no2: parseFloat(no2 || 20),
            aqiScore: calculatedAqi,
          },
        });
      }

      if (type === 'water' || wqi_score !== undefined || wqiScore !== undefined) {
        recordedData.water = await prisma.waterReading.create({
          data: {
            locationId,
            ph: parseFloat(ph || 7.2),
            turbidity: parseFloat(turbidity || 3.0),
            dissolvedOxygen: parseFloat(dissolvedOxygen || dissolved_oxygen || 7.0),
            wqiScore: calculatedWqi,
          },
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Telemetry recorded in database.',
        data: recordedData,
      });
    } catch (dbErr) {
      const fallbackStation = fallbackStations.find((s) => s.id === locationId);
      if (fallbackStation && (aqiScore !== undefined || aqi_score !== undefined)) {
        fallbackStation.latestAirReading.aqiScore = calculatedAqi;
        fallbackStation.latestAirReading.aqi_score = calculatedAqi;
        if (pm25) fallbackStation.latestAirReading.pm25 = parseFloat(pm25);
        if (pm10) fallbackStation.latestAirReading.pm10 = parseFloat(pm10);
      }

      return res.status(201).json({
        success: true,
        message: 'Simulated telemetry ingested successfully (demo mode).',
        data: { locationId, aqiScore: calculatedAqi, wqiScore: calculatedWqi },
      });
    }
  } catch (error) {
    console.error('Error recording mock sensor reading:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing sensor data.',
      error: error.message || 'Unknown internal error',
    });
  }
});

// ==========================================
// Start HTTP Server
// ==========================================
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🌍 EcoMonitor Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 JavaScript & Express Engine Active`);
  console.log(`======================================================\n`);
});

process.on('SIGINT', async () => {
  console.log('\nGracefully shutting down server...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('EcoMonitor backend service closed.');
    process.exit(0);
  });
});

module.exports = { app, prisma };

