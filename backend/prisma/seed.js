const { PrismaClient } = require('@prisma/client');
const { calculateAQI, calculateWQI } = require('../src/utils/calculators');

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Starting database seeding for EcoMonitor (JavaScript)...');

  // Reset database state for repeatable, clean runs
  await prisma.waterReading.deleteMany();
  await prisma.airReading.deleteMany();
  await prisma.location.deleteMany();

  // --------------------------------------------------------------------------
  // Station 1: Central City Park (Clean Eco-Zone)
  // --------------------------------------------------------------------------
  const parkAqi = calculateAQI(12.0, 25.0);
  const parkWqi = calculateWQI(7.3, 1.2);

  const park = await prisma.location.create({
    data: {
      name: 'Central City Park',
      lat: 28.6139,
      lng: 77.209,
      airReadings: {
        create: [
          {
            pm25: 10.0,
            pm10: 22.0,
            no2: 14.0,
            aqiScore: 38.0,
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
          },
          {
            pm25: 12.0,
            pm10: 25.0,
            no2: 15.0,
            aqiScore: parkAqi.aqi, // Computed: 42 (Good)
            timestamp: new Date(),
          },
        ],
      },
      waterReadings: {
        create: [
          {
            ph: 7.3,
            turbidity: 1.2,
            dissolvedOxygen: 7.8,
            wqiScore: parkWqi.wqi, // Computed: 88.6 (Excellent)
            timestamp: new Date(),
          },
        ],
      },
    },
  });

  // --------------------------------------------------------------------------
  // Station 2: Riverside Industrial Zone (Polluted Runoff Zone)
  // --------------------------------------------------------------------------
  const indAqi = calculateAQI(96.4, 182.2);
  const indWqi = calculateWQI(5.2, 14.5);

  const industrial = await prisma.location.create({
    data: {
      name: 'Riverside Industrial Zone',
      lat: 28.5355,
      lng: 77.391,
      airReadings: {
        create: [
          {
            pm25: 88.0,
            pm10: 165.0,
            no2: 58.0,
            aqiScore: 160.0,
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
          },
          {
            pm25: 96.4,
            pm10: 182.2,
            no2: 65.4,
            aqiScore: indAqi.aqi, // Computed: 172 (Unhealthy)
            timestamp: new Date(),
          },
        ],
      },
      waterReadings: {
        create: [
          {
            ph: 5.2,
            turbidity: 14.5,
            dissolvedOxygen: 3.1,
            wqiScore: indWqi.wqi, // Computed: 14.0 (Hazardous / Poor)
            timestamp: new Date(),
          },
        ],
      },
    },
  });

  // --------------------------------------------------------------------------
  // Station 3: Downtown Metro Hub (Moderate Urban Traffic Zone)
  // --------------------------------------------------------------------------
  const metroAqi = calculateAQI(28.5, 68.0);
  const metroWqi = calculateWQI(6.8, 3.5);

  const metro = await prisma.location.create({
    data: {
      name: 'Downtown Metro Hub',
      lat: 28.6328,
      lng: 77.2197,
      airReadings: {
        create: [
          {
            pm25: 25.0,
            pm10: 60.0,
            no2: 38.0,
            aqiScore: 78.0,
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
          },
          {
            pm25: 28.5,
            pm10: 68.0,
            no2: 42.0,
            aqiScore: metroAqi.aqi, // Computed: 85 (Moderate)
            timestamp: new Date(),
          },
        ],
      },
      waterReadings: {
        create: [
          {
            ph: 6.8,
            turbidity: 3.5,
            dissolvedOxygen: 6.4,
            wqiScore: metroWqi.wqi, // Computed: 77.5 (Good / Moderate)
            timestamp: new Date(),
          },
        ],
      },
    },
  });

  console.log('✅ Seeding completed with 3 monitoring stations:');
  console.log(`   📍 1. ${park.name} (ID: ${park.id})       -> AQI: ${parkAqi.aqi} (${parkAqi.category}) | WQI: ${parkWqi.wqi} (${parkWqi.status})`);
  console.log(`   📍 2. ${industrial.name} (ID: ${industrial.id}) -> AQI: ${indAqi.aqi} (${indAqi.category}) | WQI: ${indWqi.wqi} (${indWqi.status})`);
  console.log(`   📍 3. ${metro.name} (ID: ${metro.id})      -> AQI: ${metroAqi.aqi} (${metroAqi.category}) | WQI: ${metroWqi.wqi} (${metroWqi.status})\n`);
}

main()
  .catch((error) => {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

