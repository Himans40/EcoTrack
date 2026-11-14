/**
 * Environmental Telemetry Mathematical Engines (Plain JavaScript)
 * Standard Breakpoint Algorithms for Air Quality Index (AQI) and Water Quality Index (WQI)
 */

// EPA PM2.5 Standard Breakpoints (µg/m³)
const PM25_BREAKPOINTS = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
];

// EPA PM10 Standard Breakpoints (µg/m³)
const PM10_BREAKPOINTS = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
  { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
  { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
  { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
  { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
  { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500 },
];

/**
 * Linear interpolation formula:
 * I_p = ((I_high - I_low) / (C_high - C_low)) * (C - C_low) + I_low
 */
function interpolate(c, breakpoints) {
  if (c < 0) return 0;

  for (const bp of breakpoints) {
    if (c >= bp.cLow && c <= bp.cHigh) {
      const aqi =
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow;
      return Math.round(aqi);
    }
  }

  return 500;
}

/**
 * Calculates overall AQI based on EPA PM2.5 and PM10 breakpoints
 * @param {number} pm25 Particulate matter ≤ 2.5 µm (µg/m³)
 * @param {number} pm10 Particulate matter ≤ 10 µm (µg/m³)
 */
function calculateAQI(pm25, pm10) {
  const pm25SubIndex = interpolate(pm25, PM25_BREAKPOINTS);
  const pm10SubIndex = interpolate(pm10, PM10_BREAKPOINTS);

  const aqi = Math.max(pm25SubIndex, pm10SubIndex);
  const dominantPollutant = pm25SubIndex >= pm10SubIndex ? 'PM2.5' : 'PM10';

  let category = 'Good';
  if (aqi > 300) category = 'Hazardous';
  else if (aqi > 200) category = 'Very Unhealthy';
  else if (aqi > 150) category = 'Unhealthy';
  else if (aqi > 100) category = 'Unhealthy for Sensitive Groups';
  else if (aqi > 50) category = 'Moderate';

  return { aqi, dominantPollutant, category };
}

/**
 * Calculates standardized Water Quality Index (WQI) on a 0 - 100 scale:
 * Parameters:
 * - pH: Optimum neutrality = 7.0. Acceptable range: 6.5 - 8.5.
 * - Turbidity: Standard threshold baseline = 5.0 NTU (< 1.5 NTU pristine).
 * 
 * Formula:
 * Q_pH = max(0, 100 - (|pH - 7.0| / 1.5) * 60)
 * Q_turbidity = max(0, 100 - (turbidity / 5.0) * 45)
 * WQI = 0.5 * Q_pH + 0.5 * Q_turbidity
 * 
 * @param {number} ph Potential of Hydrogen (0 - 14)
 * @param {number} turbidity Nephelometric Turbidity Units (NTU)
 */
function calculateWQI(ph, turbidity) {
  const phDeviation = Math.abs(ph - 7.0);
  const qPh = Math.max(0, 100 - (phDeviation / 1.5) * 60);

  const qTurbidity = Math.max(0, 100 - (Math.max(0, turbidity) / 5.0) * 45);

  const rawWqi = 0.5 * qPh + 0.5 * qTurbidity;
  const wqi = Math.max(0, Math.min(100, Math.round(rawWqi * 10) / 10));

  let status = 'Excellent';
  if (wqi >= 80) status = 'Excellent';
  else if (wqi >= 65) status = 'Good';
  else if (wqi >= 50) status = 'Moderate';
  else if (wqi >= 30) status = 'Poor';
  else status = 'Hazardous';

  return { wqi, status };
}

module.exports = {
  calculateAQI,
  calculateWQI,
};

