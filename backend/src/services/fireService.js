/**
 * Role:
 * Fetches satellite fire hotspot data from NASA FIRMS
 * Detects significant fires, stores alerts, and sends SMS.
 */

const axios = require("axios");
const Alert = require("../models/Alert");

const { sendBulkSMS } = require("../services/smsService");
const User = require("../models/User");

/* ===============================
   🔥 COMMON SMS FUNCTION
================================= */
const sendFireSMS = async (coords, message) => {
  try {
    const radius = 5000; // 5 KM

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
      console.log(`📩 Fire SMS sent to ${numbers.length} users`);
    }

  } catch (err) {
    console.error("❌ Fire SMS Error:", err.message);
  }
};

/* ===============================
   FETCH FIRE DATA
================================= */
const fetchFireData = async () => {
  try {
    console.log("🔥 Fetching Forest Fire data...");

    const apiKey = process.env.NASA_FIRE_API_KEY;

    const response = await axios.get(
      `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/world/1`
    );

    const rows = response.data.split("\n");

    for (let i = 1; i < rows.length; i++) {
      const columns = rows[i].split(",");

      const latitude = parseFloat(columns[0]);
      const longitude = parseFloat(columns[1]);
      const brightness = parseFloat(columns[2]);
      const confidence = columns[8];
      const frp = parseFloat(columns[11]);

      if (!latitude || !longitude) continue;

      /* ===============================
         FIRE CONDITION
      ================================= */
      if (frp > 50 && confidence === "high") {

        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        const existing = await Alert.findOne({
          type: "Forest Fire",
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [longitude, latitude]
              },
              $maxDistance: 1000
            }
          },
          createdAt: { $gte: thirtyMinutesAgo }
        });

        if (!existing) {

          await Alert.create({
            type: "Forest Fire",
            severity: frp > 100 ? "Severe" : "High",

            // ✅ FIXED LOCATION (GeoJSON)
            location: {
              type: "Point",
              coordinates: [longitude, latitude]
            },

            riskScore: Math.min(frp, 100),

            message: `🔥 Forest Fire detected (FRP: ${frp})`,

            metadata: { brightness, confidence, frp }
          });

          console.log("🔥 Forest Fire Alert Created");

          /* ===============================
             🚨 SEND SMS ALERT
          ================================= */
          await sendFireSMS(
            [longitude, latitude],
            `🔥 FOREST FIRE ALERT!

High temperature fire detected nearby.

📍 https://maps.google.com/?q=${latitude},${longitude}

Stay away from the area.`
          );
        }
      }
    }

  } catch (error) {
    console.error("❌ Fire API Error:", error.message);
  }
};

module.exports = fetchFireData;