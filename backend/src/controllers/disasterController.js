const SOS = require("../models/SOSRequest");
const User = require("../models/User");
const Alert = require("../models/Alert"); // ✅ NEW

/* =====================================================
   INTERNAL FUNCTION
===================================================== */
const getCurrentDisastersInternal = async (userId) => {

  if (!userId) {
    throw new Error("User ID missing");
  }

  const currentUser = await User.findById(userId);

  if (!currentUser) {
    throw new Error("User not found");
  }

  /* ===============================
     GROUP MEMBERS
  ================================= */
  const groupUsers = await User.find({
    $or: [
      { familyGroupId: currentUser.familyGroupId },
      { societyGroupId: currentUser.societyGroupId },
      { _id: userId }
    ]
  });

  const memberIds = groupUsers.map(u => u._id);

  /* ===============================
     GROUP SOS
  ================================= */
  const sosData = await SOS.find({
    userId: { $in: memberIds },
    status: { $ne: "Closed" }
  });

  const formattedSOS = sosData.map((s) => ({
    _id: s._id,
    userId: s.userId,
    name: s.name,
    disasterType: s.disasterType,
    status: s.status,
    latitude: s.location?.coordinates?.[1],  // ✅ FIXED
    longitude: s.location?.coordinates?.[0]
  }));

  /* ===============================
     REAL ALERT DATA (DB)
  ================================= */

  const alerts = await Alert.find({
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });

  /* ===============================
     SEPARATE BY TYPE
  ================================= */

  const earthquakes = [];
  const fires = [];
  const weather = [];
  const aqi = [];

  alerts.forEach((a) => {
    const lat = a.location?.coordinates?.[1];
    const lng = a.location?.coordinates?.[0];

    if (!lat || !lng) return;

    const base = {
      lat,
      lng,
      severity: a.severity,
      type: a.type
    };

    if (a.type === "Earthquake") earthquakes.push(base);
    else if (a.type === "Forest Fire") fires.push(base);
    else if (
      a.type === "Flood" ||
      a.type === "Heatwave" ||
      a.type === "Cyclone" ||
      a.type === "ColdWave"
    ) weather.push(base);
    else if (a.type === "AirQuality") {
      aqi.push({
        ...base,
        value: a.metadata?.aqi || null
      });
    }
  });

  return {
    earthquakes,
    fires,
    weather,
    aqi,
    sos: formattedSOS
  };
};

/* =====================================================
   API CONTROLLER
===================================================== */
const getCurrentDisasters = async (req, res) => {
  try {

    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = await getCurrentDisastersInternal(userId);

    res.json(data);

  } catch (error) {
    console.error("🔥 Disaster fetch error:", error);
    res.status(500).json({ error: "Failed to fetch disasters" });
  }
};

/* =====================================================
   EXPORTS
===================================================== */
module.exports = {
  getCurrentDisasters,
  getCurrentDisastersInternal
};