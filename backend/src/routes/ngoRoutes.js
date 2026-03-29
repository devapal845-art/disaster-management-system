
const express = require("express");
const router = express.Router();

const User = require("../models/User");
const SOSRequest = require("../models/SOSRequest");

const authMiddleware = require("../middleware/authMiddleware");

/* =================================
HAVERSINE DISTANCE
================================= */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180; // ✅ FIXED (removed 'a')

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/* =================================
UPDATE NGO LIVE LOCATION
================================= */
router.patch("/location", authMiddleware, async (req, res) => {
  try {

    let { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "Latitude and Longitude required"
      });
    }

    const latitudeNum = Number(latitude);
    const longitudeNum = Number(longitude);

    const user = await User.findById(req.user._id);

    const allowedRoles = ["NGO_USER", "NGO_ADMIN"];

    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    let speed = 0;
    let distance = 0;

    if (
      user.currentLocation &&
      user.currentLocation.latitude &&
      user.lastMovementAt
    ) {

      distance = calculateDistance(
        user.currentLocation.latitude,
        user.currentLocation.longitude,
        latitudeNum,
        longitudeNum
      );

      const timeDiff =
        (new Date() - new Date(user.lastMovementAt)) / 3600000;

      if (timeDiff > 0) {
        speed = distance / timeDiff;
      }
    }

    user.currentLocation = {
      latitude: latitudeNum,
      longitude: longitudeNum,
      updatedAt: new Date()
    };

    user.lastMovementAt = new Date();
    user.currentSpeed = speed;

    // ✅ FIX: update GeoJSON
    user.lastLocation = {
      type: "Point",
      coordinates: [longitudeNum, latitudeNum]
    };

    await user.save();

    res.json({
      message: "Location updated successfully",
      speed: speed.toFixed(2)
    });

  } catch (error) {
    console.error("🔥 Location Update Error:", error);

    res.status(500).json({
      error: error.message
    });
  }
});

/* =================================
GET NGO TEAM MEMBERS
================================= */
router.get("/:ngoId/members", authMiddleware, async (req, res) => {
  try {

    const { ngoId } = req.params;

    const members = await User.find({
      ngoId: ngoId,
      role: "NGO_USER"
    }).select("-password");

    res.json(members);

  } catch (error) {
    console.error("Members fetch error:", error);

    res.status(500).json({
      message: "Failed to fetch members"
    });
  }
});

/* =================================
NGO ANALYTICS (FIXED)
================================= */
router.get("/:ngoId/analytics", authMiddleware, async (req, res) => {
  try {

    const { ngoId } = req.params;

    const members = await User.find({ ngoId }).select("_id");

    const allIds = [
      ...members.map(m => m._id),
      req.user._id // 🔥 ADD ADMIN
    ];

    const totalMissions = await SOSRequest.countDocuments({
      assignedTeam: { $in: allIds }
    });

    const activeMissions = await SOSRequest.countDocuments({
      assignedTeam: { $in: allIds },
      status: { $in: ["Assigned", "OnTheWay"] }
    });

    const completed = await SOSRequest.countDocuments({
      assignedTeam: { $in: allIds },
      status: "Rescued"
    });

    res.json({
      totalMissions,
      activeMissions,
      completed
    });

  } catch (error) {
    console.error("Analytics error:", error);

    res.status(500).json({
      message: "Failed to fetch analytics"
    });
  }
});

module.exports = router;

