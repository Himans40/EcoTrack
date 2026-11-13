import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for EcoMonitor...');

  // Reset database state for clean demo
  await prisma.waterReading.deleteMany();
  await prisma.airReading.deleteMany();
  await prisma.location.deleteMany();

  // Location 1: Central City Park (Clean Eco-Zone)
  const locationPark = await prisma.location.create({
    data: {
      name: 'Central City Park',
      lat: 28.6139,
      lng: 77.209,
      airReadings: {
        create: [
          {
            pm25: 12.5,
            pm10: 25.0,
            no2: 15.0,
            aqiScore: 38.0,
            timestamp: new Date(Date.now() - 1000 * 60 * 15),
          },
          {
            pm25: 14.0,
            pm10: 28.5,
            no2: 18.2,
            aqiScore: 42.0, // AQI < 50 -> "Good"
            timestamp: new Date(),
          },
        ],
      },
      waterReadings: {
        create: [
          {
            ph: 7.4,
            turbidity: 2.1,
            dissolvedOxygen: 7.8,
            wqiScore: 88.5, // WQI >= 80 -> "Excellent"
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

  // Location 2: Riverside Industrial Zone (Polluted Zone)
  const locationIndustrial = await prisma.location.create({
    data: {
      name: 'Riverside Industrial Zone',
      lat: 28.5355,
      lng: 77.391,
      airReadings: {
        create: [
          {
            pm25: 85.0,
            pm10: 160.0,
            no2: 60.0,
            aqiScore: 155.0,
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
          },
          {
            pm25: 96.4,
            pm10: 182.2,
            no2: 65.4,
            aqiScore: 172.0, // AQI > 150 -> "Unhealthy"
            timestamp: new Date(),
          },
        ],
      },
      waterReadings: {
        create: [
          {
            ph: 5.6,
            turbidity: 16.8,
            dissolvedOxygen: 3.1,
            wqiScore: 38.0, // WQI < 50 -> "Poor"
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

  console.log('✅ Seeding completed:');
  console.log(`   📍 Station 1: ${locationPark.name} (ID: ${locationPark.id})`);
  console.log(`   📍 Station 2: ${locationIndustrial.name} (ID: ${locationIndustrial.id})`);
}

main()
  .catch((error) => {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
