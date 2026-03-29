
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./src/routes/authRoutes");
const alertRoutes = require("./src/routes/alertRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const preparedKitRoutes = require("./src/routes/preparedKitRoutes");
const sosRoutes = require("./src/routes/sosRoutes");
const rescueAnalyticsRoutes = require("./src/routes/rescueAnalyticsRoutes");
const mapRoutes = require("./src/routes/mapRoutes");
const preparednessRoutes = require("./src/routes/preparednessRoutes");
const disasterRoutes = require("./src/routes/disasterRoutes");
const groupRoutes = require("./src/routes/groupRoutes");
const ngoRoutes = require("./src/routes/ngoRoutes");
const trackingRoutes = require("./src/routes/trackingRoutes");

const seedPreparedKits = require("./src/services/preparedKitSeeder");
const startCronJobs = require("./src/services/cronService");

const User = require("./src/models/User");
const SOSRequest = require("./src/models/SOSRequest");

const app = express();

/* ===========================
GLOBAL MIDDLEWARE
=========================== */

app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/* ===========================
MONGODB CONNECTION
=========================== */

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log("✅ Connected to MongoDB");
  console.log("MONGO_URI:", process.env.MONGO_URI);
  await seedPreparedKits();
})
.catch((err) => {
  console.error("❌ MongoDB Error:", err.message);
});

/* ===========================
ROUTES
=========================== */

app.use("/api/auth", authRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/prepared-kit", preparedKitRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/ngo", ngoRoutes);
app.use("/api/rescue-analytics", rescueAnalyticsRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/preparedness", preparednessRoutes);
app.use("/api/disasters", disasterRoutes);
app.use("/api/group", groupRoutes);
app.use("/api/tracking", trackingRoutes);

/* ===========================
SOCKET.IO SETUP
=========================== */

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH"]
  }
});

app.set("io", io);

/* ===========================
START CRON JOBS
=========================== */

startCronJobs(io);

/* ===========================
SOCKET EVENTS
=========================== */

const ngoLocations = {};
const escalationTimers = {};

io.on("connection", (socket) => {

  console.log("🔌 Socket connected:", socket.id);

  /* ===========================
     NGO LOCATION UPDATE
  =========================== */

socket.on("responderLocationUpdate", async (data) => {

  let { userId, latitude, longitude } = data || {};

  if (!userId || latitude == null || longitude == null) return;

  const userIdStr = userId.toString();
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!mongoose.Types.ObjectId.isValid(userIdStr)) return;
  if (isNaN(lat) || isNaN(lng)) return;

  try {

    await User.findByIdAndUpdate(userIdStr, {
      currentLocation: {
        latitude: lat,
        longitude: lng,
        updatedAt: new Date()
      },
      lastLocation: {
        type: "Point",
        coordinates: [lng, lat]
      },
      lastMovementAt: new Date(),
      isOnline: true,
      lastSeenAt: new Date()
    });

    // optional broadcast
    io.emit("responderLocationBroadcast", {
      userId: userIdStr,
      latitude: lat,
      longitude: lng
    });

  } catch (err) {
    console.error("❌ Responder Location Error:", err.message);
  }

});

  /* ===========================
     ESCALATION TIMER
  =========================== */

  socket.on("startEscalationTimer", (sosId) => {

    if (!mongoose.Types.ObjectId.isValid(sosId)) return;
    if (escalationTimers[sosId]) return;

    escalationTimers[sosId] = setTimeout(async () => {
      try {

        const sos = await SOSRequest.findById(sosId);
        if (!sos) return;

        const responder = await User.findById(sos.assignedResponder);
        if (!responder) return;

        const now = new Date();
        const lastMove = responder.lastMovementAt || sos.assignedAt;

        const minutes =
          (now - new Date(lastMove)) / 60000;

        // ✅ FIX: prevent multiple escalation
        if (
          minutes >= 5 &&
          sos.status !== "Rescued" &&
          !sos.isEscalated
        ) {

          sos.status = "Pending";
          sos.isEscalated = true;
          sos.escalationCount = (sos.escalationCount || 0) + 1;

          await sos.save();

          io.emit("sosUpdated", sos);
        }

      } catch (err) {
        console.error("Escalation Error:", err.message);
      }

      delete escalationTimers[sosId];

    }, 5 * 60 * 1000);

  });

  socket.on("stopEscalationTimer", (sosId) => {
    if (escalationTimers[sosId]) {
      clearTimeout(escalationTimers[sosId]);
      delete escalationTimers[sosId];
    }
  });

  /* ===========================
     DISCONNECT
  =========================== */

  socket.on("disconnect", async () => {

    console.log("❌ Socket disconnected:", socket.id);

    // ✅ Clean memory
    for (const key in ngoLocations) {
      if (ngoLocations[key]?.socketId === socket.id) {

        try {
          await User.findByIdAndUpdate(key, {
            isOnline: false,
            lastSeenAt: new Date()
          });
        } catch (err) {}

        delete ngoLocations[key];
      }
    }

  });

});

/* ===========================
START SERVER
=========================== */

const PORT = process.env.PORT;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

