const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

/* ===============================
   GET GROUP MEMBERS (FAMILY / SOCIETY)
================================= */
router.get("/members", authMiddleware, async (req, res) => {
  try {
    const { type } = req.query; // "family" or "society"

    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let query = {};

    // ✅ FAMILY GROUP
    if (type === "family") {
      if (!currentUser.familyGroupId) {
        return res.json([]);
      }
      query.familyGroupId = currentUser.familyGroupId;
    }

    // ✅ SOCIETY GROUP
    else if (type === "society") {
      if (!currentUser.societyGroupId) {
        return res.json([]);
      }
      query.societyGroupId = currentUser.societyGroupId;
    }

    // ❌ INVALID TYPE
    else {
      return res.status(400).json({
        message: "Invalid type. Use 'family' or 'society'"
      });
    }

    const members = await User.find({
      ...query,
      _id: { $ne: currentUser._id }
    }).select("_id name lastLocation lastRiskLevel currentLocation");

    res.json(members);

  } catch (error) {
    console.error("Group fetch error:", error.message);
    res.status(500).json({ error: error.message });
  }
});


/* ===============================
   ASSIGN / UPDATE GROUP + LOCATION + RISK
================================= */
router.patch("/assign-group", authMiddleware, async (req, res) => {
  try {
    const { familyGroupId, societyGroupId, lat, lng, riskLevel } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    /* ✅ ASSIGN GROUP IDs */
    if (familyGroupId) user.familyGroupId = familyGroupId;
    if (societyGroupId) user.societyGroupId = societyGroupId;

    /* ✅ UPDATE LOCATION (GeoJSON + realtime) */
    if (lat != null && lng != null) {
      user.lastLocation = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)]
      };

      user.currentLocation = {
        latitude: Number(lat),
        longitude: Number(lng),
        updatedAt: new Date()
      };
    }

    /* ✅ UPDATE RISK LEVEL */
    if (riskLevel) {
      user.lastRiskLevel = riskLevel;
    }

    await user.save();

    res.json({
      message: "User group & location updated successfully",
      user
    });

  } catch (error) {
    console.error("Assign group error:", error.message);
    res.status(500).json({ error: error.message });
  }
});


/* ===============================
   GET HIGH RISK MEMBERS (FOR MAP)
================================= */
router.get("/high-risk", authMiddleware, async (req, res) => {
  try {
    const { type } = req.query;

    const currentUser = await User.findById(req.user._id);

    let query = {
      lastRiskLevel: "High"
    };

    if (type === "family") {
      query.familyGroupId = currentUser.familyGroupId;
    } else if (type === "society") {
      query.societyGroupId = currentUser.societyGroupId;
    } else {
      return res.status(400).json({ message: "Invalid type" });
    }

    const members = await User.find({
      ...query,
      _id: { $ne: currentUser._id }
    }).select("_id name lastLocation currentLocation");

    res.json(members);

  } catch (error) {
    console.error("High risk fetch error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;