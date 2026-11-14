const { calculateAQI, calculateWQI } = require('./calculators');

console.log('\n======================================================');
console.log('🧪 Running EcoMonitor Mathematical Engine Verification (JS)');
console.log('======================================================\n');

// 1. Clean Atmosphere Test
const cleanAir = calculateAQI(10.0, 25.0);
console.log('1. Clean Air Test (PM2.5: 10 µg/m³, PM10: 25 µg/m³)');
console.log(`   ➜ AQI Score: ${cleanAir.aqi} | Category: "${cleanAir.category}" | Dominant: ${cleanAir.dominantPollutant}`);
if (cleanAir.aqi <= 50 && cleanAir.category === 'Good') {
  console.log('   ✅ PASS: Correctly classified as Good air quality.\n');
} else {
  console.error('   ❌ FAIL: Unexpected clean air score.\n');
  process.exit(1);
}

// 2. Polluted Atmosphere Test
const pollutedAir = calculateAQI(96.4, 182.2);
console.log('2. Polluted Air Test (PM2.5: 96.4 µg/m³, PM10: 182.2 µg/m³)');
console.log(`   ➜ AQI Score: ${pollutedAir.aqi} | Category: "${pollutedAir.category}" | Dominant: ${pollutedAir.dominantPollutant}`);
if (pollutedAir.aqi > 150 && pollutedAir.category === 'Unhealthy') {
  console.log('   ✅ PASS: Correctly classified as Unhealthy air quality.\n');
} else {
  console.error('   ❌ FAIL: Unexpected polluted air score.\n');
  process.exit(1);
}

// 3. Pristine Water Test
const cleanWater = calculateWQI(7.3, 1.2);
console.log('3. Clean Water Test (pH: 7.3, Turbidity: 1.2 NTU)');
console.log(`   ➜ WQI Score: ${cleanWater.wqi} | Status: "${cleanWater.status}"`);
if (cleanWater.wqi >= 80 && cleanWater.status === 'Excellent') {
  console.log('   ✅ PASS: Correctly classified as Excellent water quality.\n');
} else {
  console.error('   ❌ FAIL: Unexpected clean water score.\n');
  process.exit(1);
}

// 4. Contaminated Water Test
const contaminatedWater = calculateWQI(5.2, 14.5);
console.log('4. Contaminated Water Test (pH: 5.2, Turbidity: 14.5 NTU)');
console.log(`   ➜ WQI Score: ${contaminatedWater.wqi} | Status: "${contaminatedWater.status}"`);
if (contaminatedWater.wqi < 50 && (contaminatedWater.status === 'Poor' || contaminatedWater.status === 'Hazardous')) {
  console.log('   ✅ PASS: Correctly classified as Poor/Hazardous water quality.\n');
} else {
  console.error('   ❌ FAIL: Unexpected contaminated water score.\n');
  process.exit(1);
}

console.log('======================================================');
console.log('🎉 ALL MATHEMATICAL ENGINE TESTS PASSED (4/4)!');
console.log('======================================================\n');

