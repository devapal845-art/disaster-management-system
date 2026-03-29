const cron = require("node-cron");
const Alert = require("../models/Alert");

const fetchEarthquakeData = require("./usgsService");
const fetchWeatherData = require("./weatherService");
const fetchFireData = require("./fireService");
const fetchAirQuality = require("./airQualityService");
const fetchFloodData = require("./floodService"); // ✅ NEW

const escalateSOS = require("./escalationService");
const autoReassignSOS = require("./reassignmentService");

/* ===============================
   CLEANUP OLD ALERTS (24H)
================================= */
const cleanupOldAlerts = async () => {
  const expiryTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await Alert.deleteMany({
    createdAt: { $lt: expiryTime }
  });

  console.log("🧹 Old alerts cleaned");
};

/* =================================
   START CRON JOBS
================================= */
const startCronJobs = (io) => {

  /* ===============================
     ESCALATION (EVERY 2 MIN)
  ================================= */
  cron.schedule("*/2 * * * *", async () => {
    console.log("🔄 Running Escalation Check...");
    await escalateSOS(io);
  });

  /* ===============================
     AUTO REASSIGNMENT (EVERY 2 MIN)
  ================================= */
  cron.schedule("*/2 * * * *", async () => {
    console.log("🔄 Running Auto Reassignment Check...");
    await autoReassignSOS(io);
  });

  /* ===============================
     MULTI-DISASTER ENGINE (EVERY 5 MIN)
  ================================= */
  cron.schedule("*/5 * * * *", async () => {

    console.log("🚨 Running Multi-Disaster Cron...\n");

    /* ===== EARTHQUAKE ===== */
    try {
      await fetchEarthquakeData();
    } catch (err) {
      console.error("🌍 Earthquake Error:", err.message);
    }

    /* ===== WEATHER ===== */
    try {
      await fetchWeatherData();
    } catch (err) {
      console.error("🌦 Weather Error:", err.message);
    }

    /* ===== FLOOD (NEW) ===== */
    try {
      await fetchFloodData();
    } catch (err) {
      console.error("🌊 Flood Error:", err.message);
    }

    /* ===== FIRE ===== */
    try {
      await fetchFireData();
    } catch (err) {
      console.error("🔥 Fire Error:", err.message);
    }

    /* ===== AIR QUALITY ===== */
    try {
      await fetchAirQuality();
    } catch (err) {
      console.error("🌫 AQI Error:", err.message);
    }

    /* ===== CLEANUP ===== */
    try {
      await cleanupOldAlerts();
    } catch (err) {
      console.error("🧹 Cleanup Error:", err.message);
    }

    console.log("✅ Cron Cycle Completed\n");
  });
};

module.exports = startCronJobs;