const axios = require("axios");
const Alert = require("../models/Alert");
const calculateEarthquakeRisk = require("./riskEngine");

const { sendBulkSMS } = require("../services/smsService");
const User = require("../models/User");

/* ===============================
   🔥 COMMON SMS FUNCTION
================================= */
const sendEarthquakeSMS = async (coords, message) => {
  try {
    const radius = 10000; // 🔥 10 KM (earthquake = wider impact)

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
      console.log(`📩 Earthquake SMS sent to ${numbers.length} users`);
    }

  } catch (err) {
    console.error("❌ Earthquake SMS Error:", err.message);
  }
};

/* ===============================
   FETCH EARTHQUAKE DATA
================================= */
const fetchEarthquakeData = async () => {
  try {

    console.log("🌍 Fetching USGS earthquake data...");

    const response = await axios.get(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
    );

    const earthquakes = response.data.features;

    for (let quake of earthquakes) {

      const magnitude = quake.properties.mag;
      const place = quake.properties.place;
      const usgsId = quake.id;

      if (!magnitude) continue;

      if (magnitude >= 4.5) {

        const existing = await Alert.findOne({ usgsId });

        if (existing) {
          console.log("⚠ Duplicate skipped:", place);
          continue;
        }

        /* ===============================
           EXTRACT GEO COORDINATES
        ================================= */
        const longitude = quake.geometry.coordinates[0];
        const latitude = quake.geometry.coordinates[1];
        const depth = quake.geometry.coordinates[2];

        /* ===============================
           CALCULATE RISK SCORE
        ================================= */
        const riskScore = calculateEarthquakeRisk(
          magnitude,
          depth
        );

        /* ===============================
           SAVE ALERT
        ================================= */
        await Alert.create({
          usgsId,
          type: "Earthquake",

          severity:
            magnitude >= 6
              ? "Severe"
              : magnitude >= 5
              ? "High"
              : "Moderate",

          location: {
            type: "Point",
            coordinates: [longitude, latitude]
          },

          message: `Earthquake ${magnitude}M near ${place}`,

          riskScore,

          metadata: {
            magnitude,
            depth,
            place
          }
        });

        console.log(
          `🌋 Earthquake Saved | ${place} | Mag:${magnitude} | Risk:${riskScore}`
        );

        /* ===============================
           🚨 SEND SMS ALERT
        ================================= */
        await sendEarthquakeSMS(
          [longitude, latitude],
          `🌋 EARTHQUAKE ALERT!

Magnitude: ${magnitude}
Location: ${place}

📍 https://maps.google.com/?q=${latitude},${longitude}

Stay safe & move to open area.`
        );
      }
    }

  } catch (error) {
    console.error("❌ USGS API Error:", error.message);
  }
};

module.exports = fetchEarthquakeData;