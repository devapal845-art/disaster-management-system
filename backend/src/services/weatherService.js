const axios = require("axios");
const Alert = require("../models/Alert");
const {
  calculateHeatwaveRisk,
  calculateFloodRisk
} = require("./riskEngine");

const { sendBulkSMS } = require("../services/smsService");
const User = require("../models/User");

/* ===============================
   CITY COORDINATES
================================= */
const cityCoordinates = {
  Kanpur: { lat: 26.4499, lng: 80.3319 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Varanasi: { lat: 25.3176, lng: 82.9739 },
  Prayagraj: { lat: 25.4358, lng: 81.8463 }
};

/* ===============================
   🔥 COMMON SMS FUNCTION
================================= */
const sendWeatherSMS = async (coords, message) => {
  try {
    const radius = 5000; // 5 KM

    const nearbyUsers = await User.find({
      lastLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [coords.lng, coords.lat]
          },
          $maxDistance: radius
        }
      }
    }).select("phone");

    const numbers = nearbyUsers.map(u => u.phone).filter(Boolean);

    if (numbers.length > 0) {
      await sendBulkSMS(numbers, message);
      console.log(`📩 Weather SMS sent to ${numbers.length} users`);
    }

  } catch (err) {
    console.error("❌ Weather SMS Error:", err.message);
  }
};

/* ===============================
   FETCH WEATHER
================================= */
const fetchWeatherData = async () => {
  try {

    console.log("🌦 Fetching Weather Data...");

    const city = process.env.CITY || "Kanpur";

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`
    );

    const { temp, humidity, pressure } = response.data.main;
    const rainfall = response.data.rain?.["1h"] || 0;
    const windSpeed = response.data.wind.speed;

    const coords = cityCoordinates[city];

    if (!coords) {
      console.log("⚠ Missing coordinates for city:", city);
      return;
    }

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    /* ===============================
       HEATWAVE DETECTION
    ================================= */
    const heatRisk = calculateHeatwaveRisk(temp, humidity);

    if (heatRisk >= 50) {

      const existing = await Alert.findOne({
        type: "Heatwave",
        "metadata.city": city,
        createdAt: { $gte: thirtyMinutesAgo }
      });

      if (!existing) {

        await Alert.create({
          type: "Heatwave",
          severity: heatRisk > 80 ? "Severe" : "High",
          location: {
            type: "Point",
            coordinates: [coords.lng, coords.lat]
          },
          riskScore: heatRisk,
          message: `Heatwave risk detected in ${city}`,
          metadata: { temp, humidity, city }
        });

        console.log("🔥 Heatwave Alert Created | Risk:", heatRisk);

        await sendWeatherSMS(
          coords,
          `🔥 HEATWAVE ALERT!

City: ${city}
Temp: ${temp}°C

Stay hydrated & avoid sun exposure.`
        );
      }
    }

    /* ===============================
       FLOOD DETECTION
    ================================= */
    const floodRisk = calculateFloodRisk(rainfall, windSpeed);

    if (floodRisk >= 50) {

      const existing = await Alert.findOne({
        type: "Flood",
        "metadata.city": city,
        createdAt: { $gte: thirtyMinutesAgo }
      });

      if (!existing) {

        await Alert.create({
          type: "Flood",
          severity: floodRisk > 80 ? "Severe" : "High",
          location: {
            type: "Point",
            coordinates: [coords.lng, coords.lat]
          },
          riskScore: floodRisk,
          message: `Flood risk detected in ${city}`,
          metadata: { rainfall, windSpeed, city }
        });

        console.log("🌊 Flood Alert Created | Risk:", floodRisk);

        await sendWeatherSMS(
          coords,
          `🌊 FLOOD ALERT!

City: ${city}
Rainfall: ${rainfall}mm

Avoid low-lying areas.`
        );
      }
    }

    /* ===============================
       CYCLONE DETECTION
    ================================= */
    if (windSpeed > 25 && pressure < 990) {

      await Alert.create({
        type: "Cyclone",
        severity: "Severe",
        location: {
          type: "Point",
          coordinates: [coords.lng, coords.lat]
        },
        riskScore: 90,
        message: `Cyclone conditions detected near ${city}`,
        metadata: { windSpeed, pressure, city }
      });

      console.log("🌪 Cyclone Alert Created");

      await sendWeatherSMS(
        coords,
        `🌪 CYCLONE ALERT!

City: ${city}
Wind Speed: ${windSpeed}

Stay indoors & stay safe.`
      );
    }

    /* ===============================
       COLD WAVE DETECTION
    ================================= */
    if (temp <= 5) {

      await Alert.create({
        type: "ColdWave",
        severity: temp <= 0 ? "Severe" : "High",
        location: {
          type: "Point",
          coordinates: [coords.lng, coords.lat]
        },
        riskScore: temp <= 0 ? 90 : 70,
        message: `Cold wave conditions detected in ${city}`,
        metadata: { temp, city }
      });

      console.log("❄ Cold Wave Alert Created");

      await sendWeatherSMS(
        coords,
        `❄ COLD WAVE ALERT!

City: ${city}
Temp: ${temp}°C

Stay warm & avoid exposure.`
      );
    }

  } catch (error) {
    console.error("❌ Weather Error:", error.message);
  }
};

module.exports = fetchWeatherData;