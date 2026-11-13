import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables from .env
dotenv.config();

// Initialize Express app and Prisma Client
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5001;

// ==========================================
// Middleware Configuration
// ==========================================
app.use(cors()); // Enable Cross-Origin Resource Sharing for mobile client access
app.use(express.json()); // Parse incoming JSON request bodies

// ==========================================
// In-Memory Fallback Seed Data (Safe presentation fallback if DB offline)
// ==========================================
const fallbackStations = [
  {
    id: 1,
    name: 'Central City Park',
    latitude: 28.6139,
    longitude: 77.209,
    latestAirReading: {
      id: 1,
      locationId: 1,
      pm25: 14.0,
      pm10: 28.5,
      co2: 415.0,
      aqi_score: 42.0, // AQI < 50 -> Green (Good)
      timestamp: new Date().toISOString(),
    },
    latestWaterReading: {
      id: 1,
      locationId: 1,
      ph: 7.4,
      turbidity: 2.1,
      dissolved_oxygen: 7.8,
      wqi_score: 88.5, // WQI >= 80 -> Green (Excellent)
      timestamp: new Date().toISOString(),
    },
  },
  {
    id: 2,
    name: 'Riverside Industrial Zone',
    latitude: 28.5355,
    longitude: 77.391,
    latestAirReading: {
      id: 2,
      locationId: 2,
      pm25: 96.4,
      pm10: 182.2,
      co2: 840.0,
      aqi_score: 172.0, // AQI > 150 -> Red (Unhealthy)
      timestamp: new Date().toISOString(),
    },
    latestWaterReading: {
      id: 2,
      locationId: 2,
      ph: 5.6,
      turbidity: 16.8,
      dissolved_oxygen: 3.1,
      wqi_score: 38.0, // WQI < 50 -> Red (Poor)
      timestamp: new Date().toISOString(),
    },
  },
];

// Helper to generate 20 trend points for historical charts
const generateMockHistory = (baseAqi: number, baseWqi: number, locationId: number) => {
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
      co2: Math.round(400 + aqi * 2),
      aqi_score: aqi,
      timestamp: time,
    });

    waterHistory.push({
      id: 200 + i,
      locationId,
      ph: parseFloat((7.0 + (wqi > 50 ? 0.3 : -1.2)).toFixed(1)),
      turbidity: parseFloat((wqi > 50 ? 2.5 : 14.0).toFixed(1)),
      dissolved_oxygen: parseFloat((wqi > 50 ? 7.5 : 3.2).toFixed(1)),
      wqi_score: wqi,
      timestamp: time,
    });
  }

  return { airHistory, waterHistory };
};

// ==========================================
// 0. Health Check Endpoint
// ==========================================
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'EcoMonitor Backend API',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 1. GET /api/locations
// Returns all locations along with their most recent Air and Water readings
// ==========================================
app.get('/api/locations', async (_req: Request, res: Response) => {
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
        latitude: loc.latitude,
        longitude: loc.longitude,
        latestAirReading: loc.airReadings.length > 0 ? loc.airReadings[0] : null,
        latestWaterReading: loc.waterReadings.length > 0 ? loc.waterReadings[0] : null,
      }));

      return res.status(200).json({
        success: true,
        count: responsePayload.length,
        data: responsePayload,
      });
    }

    // If database is empty, return fallback data
    return res.status(200).json({
      success: true,
      count: fallbackStations.length,
      data: fallbackStations,
    });
  } catch (error) {
    console.warn(
      '⚠️ PostgreSQL database unavailable or unseeded. Falling back to built-in telemetry stations.'
    );
    return res.status(200).json({
      success: true,
      count: fallbackStations.length,
      data: fallbackStations,
    });
  }
});

// ==========================================
// 2. GET /api/locations/:id
// Returns a single location along with its latest Air and Water readings
// ==========================================
app.get('/api/locations/:id', async (req: Request, res: Response) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam, 10);

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
            latitude: location.latitude,
            longitude: location.longitude,
            latestAirReading: location.airReadings.length > 0 ? location.airReadings[0] : null,
            latestWaterReading:
              location.waterReadings.length > 0 ? location.waterReadings[0] : null,
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
      error: error instanceof Error ? error.message : 'Unknown internal error',
    });
  }
});

// ==========================================
// 3. GET /api/locations/:id/history
// Returns chronological historical sensor readings (last 20) for trend charts
// ==========================================
app.get('/api/locations/:id/history', async (req: Request, res: Response) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam, 10);

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
            airHistory: [...location.airReadings].reverse(),
            waterHistory: [...location.waterReadings].reverse(),
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
      error: error instanceof Error ? error.message : 'Unknown internal error',
    });
  }
});

// ==========================================
// 4. POST /api/mock-sensor
// Endpoint to ingest simulated IoT sensor readings
// ==========================================
app.post('/api/mock-sensor', async (req: Request, res: Response) => {
  try {
    const {
      locationId,
      type,
      pm25,
      pm10,
      co2,
      aqi_score,
      ph,
      turbidity,
      dissolved_oxygen,
      wqi_score,
    } = req.body;

    if (!locationId || typeof locationId !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Field `locationId` (number) is required.',
      });
    }

    const recordedData: { air?: any; water?: any } = {};

    try {
      if (type === 'air' || aqi_score !== undefined) {
        recordedData.air = await prisma.airReading.create({
          data: {
            locationId,
            pm25: parseFloat(pm25 || 25),
            pm10: parseFloat(pm10 || 50),
            co2: parseFloat(co2 || 420),
            aqi_score: parseFloat(aqi_score || 55),
          },
        });
      }

      if (type === 'water' || wqi_score !== undefined) {
        recordedData.water = await prisma.waterReading.create({
          data: {
            locationId,
            ph: parseFloat(ph || 7.2),
            turbidity: parseFloat(turbidity || 3.0),
            dissolved_oxygen: parseFloat(dissolved_oxygen || 7.0),
            wqi_score: parseFloat(wqi_score || 80),
          },
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Telemetry recorded in database.',
        data: recordedData,
      });
    } catch (dbErr) {
      // If DB offline, acknowledge in-memory for smooth presentation demo
      const fallbackStation = fallbackStations.find((s) => s.id === locationId);
      if (fallbackStation && aqi_score !== undefined) {
        fallbackStation.latestAirReading.aqi_score = parseFloat(aqi_score);
        if (pm25) fallbackStation.latestAirReading.pm25 = parseFloat(pm25);
        if (pm10) fallbackStation.latestAirReading.pm10 = parseFloat(pm10);
      }

      return res.status(201).json({
        success: true,
        message: 'Simulated telemetry ingested successfully (demo mode).',
        data: { locationId, aqi_score, wqi_score },
      });
    }
  } catch (error) {
    console.error('Error recording mock sensor reading:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing sensor data.',
      error: error instanceof Error ? error.message : 'Unknown internal error',
    });
  }
});

// ==========================================
// Start HTTP Server
// ==========================================
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🌍 EcoMonitor Backend Server listening on http://localhost:${PORT}`);
  console.log(`======================================================`);
  console.log(`📡 Ready Endpoints:`);
  console.log(`   - GET  /api/health            -> Check server heartbeat`);
  console.log(`   - GET  /api/locations         -> Fetch locations with latest readings`);
  console.log(`   - GET  /api/locations/:id     -> Fetch single location`);
  console.log(`   - GET  /api/locations/:id/history -> Fetch trend chart data`);
  console.log(`   - POST /api/mock-sensor       -> Ingest mock IoT sensor data`);
  console.log(`======================================================\n`);
});

// Graceful process termination handling
process.on('SIGINT', async () => {
  console.log('\nGracefully shutting down server...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('EcoMonitor backend service closed.');
    process.exit(0);
  });
});
