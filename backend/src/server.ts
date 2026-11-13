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
        // Fetch only the single latest Air reading per location
        airReadings: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        // Fetch only the single latest Water reading per location
        waterReadings: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
    });

    // Structure response for clean consumption by the mobile frontend
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
  } catch (error) {
    console.error('Error fetching locations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve locations and sensor readings.',
      error: error instanceof Error ? error.message : 'Unknown internal error',
    });
  }
});

// ==========================================
// 2. POST /api/mock-sensor
// Endpoint to ingest simulated IoT sensor readings (Air, Water, or both)
// ==========================================
app.post('/api/mock-sensor', async (req: Request, res: Response) => {
  try {
    const {
      locationId,
      type, // Optional selector: "air" | "water"
      // Air parameters
      pm25,
      pm10,
      co2,
      aqi_score,
      // Water parameters
      ph,
      turbidity,
      dissolved_oxygen,
      wqi_score,
    } = req.body;

    // Validate locationId
    if (!locationId || typeof locationId !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Field `locationId` (number) is required.',
      });
    }

    // Verify location exists in the database
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: `Location with ID ${locationId} does not exist.`,
      });
    }

    const recordedData: { air?: any; water?: any } = {};

    // Condition 1: Process Air Reading
    const hasAirPayload =
      type === 'air' ||
      (pm25 !== undefined && pm10 !== undefined && co2 !== undefined && aqi_score !== undefined);

    if (hasAirPayload) {
      if (pm25 === undefined || pm10 === undefined || co2 === undefined || aqi_score === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Air reading requires `pm25`, `pm10`, `co2`, and `aqi_score` numbers.',
        });
      }

      recordedData.air = await prisma.airReading.create({
        data: {
          locationId,
          pm25: parseFloat(pm25),
          pm10: parseFloat(pm10),
          co2: parseFloat(co2),
          aqi_score: parseFloat(aqi_score),
        },
      });
    }

    // Condition 2: Process Water Reading
    const hasWaterPayload =
      type === 'water' ||
      (ph !== undefined && turbidity !== undefined && dissolved_oxygen !== undefined && wqi_score !== undefined);

    if (hasWaterPayload) {
      if (
        ph === undefined ||
        turbidity === undefined ||
        dissolved_oxygen === undefined ||
        wqi_score === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Water reading requires `ph`, `turbidity`, `dissolved_oxygen`, and `wqi_score` numbers.',
        });
      }

      recordedData.water = await prisma.waterReading.create({
        data: {
          locationId,
          ph: parseFloat(ph),
          turbidity: parseFloat(turbidity),
          dissolved_oxygen: parseFloat(dissolved_oxygen),
          wqi_score: parseFloat(wqi_score),
        },
      });
    }

    // Validate that at least one sensor reading type was supplied
    if (!hasAirPayload && !hasWaterPayload) {
      return res.status(400).json({
        success: false,
        message:
          "No valid sensor reading payload provided. Supply either Air metrics (pm25, pm10, co2, aqi_score) or Water metrics (ph, turbidity, dissolved_oxygen, wqi_score).",
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Simulated sensor data successfully ingested into database.',
      data: recordedData,
    });
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
  console.log(`   - GET  /api/health       -> Check server heartbeat`);
  console.log(`   - GET  /api/locations    -> Fetch locations with latest readings`);
  console.log(`   - POST /api/mock-sensor  -> Ingest mock IoT sensor data`);
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

