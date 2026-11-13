import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for EcoMonitor...');

  // Reset database state for clean, repeatable demo runs
  await prisma.waterReading.deleteMany();
  await prisma.airReading.deleteMany();
  await prisma.location.deleteMany();

  // --------------------------------------------------------------------------
  // Location 1: Central City Park (Clean Eco-Zone -> Demonstrates "Green" State)
  // --------------------------------------------------------------------------
  const locationPark = await prisma.location.create({
    data: {
      name: 'Central City Park',
      latitude: 28.6139,
      longitude: 77.2090,
      airReadings: {
        create: [
          {
            pm25: 12.5,
            pm10: 25.0,
            co2: 410.0,
            aqi_score: 38.0, // AQI < 50 -> "Good" (Green)
            timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
          },
          {
            pm25: 14.0,
            pm10: 28.5,
            co2: 415.0,
            aqi_score: 42.0, // Latest: AQI < 50 -> "Good" (Green)
            timestamp: new Date(),
          },
        ],
      },
      waterReadings: {
        create: [
          {
            ph: 7.4,
            turbidity: 2.1,
            dissolved_oxygen: 7.8,
            wqi_score: 88.5, // WQI >= 80 -> "Excellent/Good" (Green/Blue)
            timestamp: new Date(),
          },
        ],
      },
    },
    include: {
      airReadings: true,
      waterReadings: true,
    },
  });

  // --------------------------------------------------------------------------
  // Location 2: Riverside Industrial Zone (Polluted -> Demonstrates "Red" State)
  // --------------------------------------------------------------------------
  const locationIndustrial = await prisma.location.create({
    data: {
      name: 'Riverside Industrial Zone',
      latitude: 28.5355,
      longitude: 77.3910,
      airReadings: {
        create: [
          {
            pm25: 85.0,
            pm10: 160.0,
            co2: 780.0,
            aqi_score: 155.0,
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
          },
          {
            pm25: 96.4,
            pm10: 182.2,
            co2: 840.0,
            aqi_score: 172.0, // Latest: AQI > 150 -> "Unhealthy" (Red)
            timestamp: new Date(),
          },
        ],
      },
      waterReadings: {
        create: [
          {
            ph: 5.6,
            turbidity: 16.8,
            dissolved_oxygen: 3.1,
            wqi_score: 38.0, // WQI < 50 -> "Poor/Critical" (Red)
            timestamp: new Date(),
          },
        ],
      },
    },
    include: {
      airReadings: true,
      waterReadings: true,
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log(`   📍 Location 1: "${locationPark.name}" (ID: ${locationPark.id})`);
  console.log(`      Latest AQI: ${locationPark.airReadings[1].aqi_score} | Latest WQI: ${locationPark.waterReadings[0].wqi_score}`);
  console.log(`   📍 Location 2: "${locationIndustrial.name}" (ID: ${locationIndustrial.id})`);
  console.log(`      Latest AQI: ${locationIndustrial.airReadings[1].aqi_score} | Latest WQI: ${locationIndustrial.waterReadings[0].wqi_score}`);
}

main()
  .catch((error) => {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

