const axios = require("axios");
const Alert = require("../models/Alert");

const { sendBulkSMS } = require("../services/smsService");
const User = require("../models/User");

/* ===============================
   🔥 SMS HELPER
================================= */
const sendAQISMS = async (coords, message) => {
  try {
    const radius = 5000;

    const nearbyUsers = await User.find({
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

    const numbers = nearbyUsers.map(u => u.phone).filter(Boolean);

    if (numbers.length > 0) {
      await sendBulkSMS(numbers, message);
      console.log(`📩 AQI SMS sent to ${numbers.length} users`);
    }

  } catch (err) {
    console.error("❌ AQI SMS Error:", err.message);
  }
};

/* ===============================
   FETCH AQI BASED ON USER LOCATIONS
================================= */
const fetchAirQuality = async () => {
  try {

    console.log("🌫 Fetching AQI (location-based)...");

    // 🔥 Get all unique user locations
    const users = await User.find({
      "lastLocation.coordinates": { $exists: true }
    }).select("lastLocation");

    const checkedLocations = new Set();

    for (const user of users) {

      const coords = user.lastLocation?.coordinates;

      if (!coords || coords.length !== 2) continue;

      const [lng, lat] = coords;

      // Avoid duplicate API calls
      const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
      if (checkedLocations.has(key)) continue;
      checkedLocations.add(key);

      try {
        const response = await axios.get(
          `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${process.env.AQI_API_KEY}`
        );

        if (response.data.status !== "ok") continue;

        const aqi = response.data.data.aqi;
        if (!aqi) continue;

        let riskScore = 0;

        if (aqi >= 300) riskScore = 95;
        else if (aqi >= 200) riskScore = 85;
        else if (aqi >= 150) riskScore = 70;
        else continue;

        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        const existing = await Alert.findOne({
          type: "AirQuality",
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
            type: "AirQuality",

            severity: riskScore > 85 ? "Severe" : "High",

            location: {
              type: "Point",
              coordinates: [lng, lat]
            },

            riskScore,

            message: `Poor Air Quality detected`,

            metadata: {
              aqi
            }
          });

          console.log(`🌫 AQI Alert Created | ${lat},${lng} | AQI: ${aqi}`);

          await sendAQISMS(
            [lng, lat],
            `🌫 AIR QUALITY ALERT!

AQI: ${aqi}

Avoid outdoor activities.

📍 https://maps.google.com/?q=${lat},${lng}`
          );
        }

      } catch (err) {
        console.error("❌ AQI Location Error:", err.message);
      }
    }

  } catch (error) {
    console.error("❌ AQI Main Error:", error.message);
  }
};

module.exports = fetchAirQuality;