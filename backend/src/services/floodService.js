const axios = require("axios");
const Alert = require("../models/Alert");
const { calculateFloodRisk } = require("./riskEngine");

const { sendBulkSMS } = require("./smsService");
const User = require("../models/User");

/* ===============================
   SMS HELPER
================================= */
const sendFloodSMS = async (coords, message) => {
  try {
    const radius = 5000;

    const users = await User.find({
      lastLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: coords
          },
          $maxDistance: radius
        }
      }
    }).select("phone");

    const numbers = users.map(u => u.phone).filter(Boolean);

    if (numbers.length) {
      await sendBulkSMS(numbers, message);
      console.log(`📩 Flood SMS sent: ${numbers.length}`);
    }

  } catch (err) {
    console.error("❌ Flood SMS Error:", err.message);
  }
};

/* ===============================
   MAIN FLOOD SERVICE
================================= */
const fetchFloodData = async () => {
  try {

    console.log("🌊 Checking Flood Risk...");

    const users = await User.find({
      "lastLocation.coordinates": { $exists: true }
    }).select("lastLocation");

    const checked = new Set();

    for (const user of users) {

      const coords = user.lastLocation?.coordinates;
      if (!coords) continue;

      const [lng, lat] = coords;

      // Avoid duplicate calls
      const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
      if (checked.has(key)) continue;
      checked.add(key);

      /* ===============================
         CURRENT WEATHER
      ================================= */
      const current = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${process.env.WEATHER_API_KEY}&units=metric`
      );

      const rainfall = current.data.rain?.["1h"] || 0;
      const windSpeed = current.data.wind.speed;

      /* ===============================
         FORECAST RAIN
      ================================= */
      const forecast = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${process.env.WEATHER_API_KEY}&units=metric`
      );

      const nextRain = forecast.data.list
        .slice(0, 3)
        .reduce((sum, item) => sum + (item.rain?.["3h"] || 0), 0);

      /* ===============================
         RISK CALCULATION
      ================================= */
      const { score, severity } =
        calculateFloodRisk(rainfall, windSpeed, nextRain);

      if (score < 50) continue;

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const existing = await Alert.findOne({
        type: "Flood",
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [lng, lat]
            },
            $maxDistance: 1000
          }
        },
        createdAt: { $gte: thirtyMinutesAgo }
      });

      if (!existing) {

        await Alert.create({
          type: "Flood",
          severity,
          location: {
            type: "Point",
            coordinates: [lng, lat]
          },
          riskScore: score,
          message: `Flood risk detected`,
          metadata: { rainfall, nextRain }
        });

        console.log(`🌊 Flood Alert Created | ${lat},${lng}`);

        await sendFloodSMS(
          [lng, lat],
          `🌊 FLOOD ALERT!

Heavy rainfall detected.

Avoid low areas.

📍 https://maps.google.com/?q=${lat},${lng}`
        );
      }
    }

  } catch (err) {
    console.error("❌ Flood Service Error:", err.message);
  }
};

module.exports = fetchFloodData;