/* ===============================
   EARTHQUAKE RISK
================================= */
const calculateEarthquakeRisk = (magnitude, depth) => {
  let score = 0;

  // Base from magnitude
  score += magnitude * 15;

  // Shallow earthquakes are more dangerous
  if (depth < 70) {
    score += 20;
  } else if (depth < 150) {
    score += 10;
  }

  if (score > 100) score = 100;

  return {
    score: Math.round(score),
    severity:
      score >= 80 ? "Severe" :
      score >= 60 ? "High" :
      score >= 40 ? "Moderate" : "Low"
  };
};

/* ===============================
   HEATWAVE RISK
================================= */
const calculateHeatwaveRisk = (temperature, humidity) => {
  let score = 0;

  if (temperature >= 47) score += 60;
  else if (temperature >= 44) score += 45;
  else if (temperature >= 41) score += 30;
  else if (temperature >= 38) score += 15;

  if (humidity > 75) score += 20;
  else if (humidity > 60) score += 10;

  if (score > 100) score = 100;

  return {
    score,
    severity:
      score >= 80 ? "Severe" :
      score >= 60 ? "High" :
      score >= 40 ? "Moderate" : "Low"
  };
};

/* ===============================
   FLOOD RISK
================================= */
const calculateFloodRisk = (rainfall, windSpeed) => {
  let score = 0;

  if (rainfall >= 120) score += 60;
  else if (rainfall >= 80) score += 45;
  else if (rainfall >= 50) score += 30;
  else if (rainfall >= 30) score += 15;

  if (windSpeed > 25) score += 25;
  else if (windSpeed > 15) score += 15;

  if (score > 100) score = 100;

  return {
    score,
    severity:
      score >= 80 ? "Severe" :
      score >= 60 ? "High" :
      score >= 40 ? "Moderate" : "Low"
  };
};

module.exports = {
  calculateEarthquakeRisk,
  calculateHeatwaveRisk,
  calculateFloodRisk
};