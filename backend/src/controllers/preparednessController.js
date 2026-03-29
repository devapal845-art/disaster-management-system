const User = require("../models/User");
const SOSRequest = require("../models/SOSRequest");
const PreparedKit = require("../models/PreparedKit");
const disasterController = require("./disasterController");
const UserPreparedness = require("../models/UserPreparedness");

/* ===============================
   HELPER: DISTANCE (KM)
================================= */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* ===============================
   GET INTELLIGENCE DASHBOARD
================================= */
const getPreparednessIntelligence = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const primaryRisk = user.lastRiskLevel || "Low";

    /* ===============================
       DISASTER DETECTION
    ================================= */
    const disasterData =
      await disasterController.getCurrentDisastersInternal(userId);

    const allDisasters = [
      ...(disasterData.earthquakes || []),
      ...(disasterData.fires || []),
      ...(disasterData.weather || []),
      ...(disasterData.aqi || [])
    ];

    const severityWeight = { Low: 5, Moderate: 15, High: 30 };

    let disasterImpact = 0;
    let primaryDisaster = null;
    let highestSeverity = 0;

    const userLat = user.lastLocation?.coordinates?.[1];
    const userLng = user.lastLocation?.coordinates?.[0];

    if (userLat && userLng) {
      for (let disaster of allDisasters) {
        if (!disaster.lat || !disaster.lng) continue;

        const distance = calculateDistance(
          userLat,
          userLng,
          disaster.lat,
          disaster.lng
        );

        if (distance > 50) continue;

        const severityValue =
          severityWeight[disaster.severity] || 5;

        disasterImpact += severityValue;

        if (severityValue > highestSeverity) {
          highestSeverity = severityValue;
          primaryDisaster = disaster.type;
        }
      }
    }

    // ✅ FIX: ALWAYS fallback to Flood (important for your system)
    primaryDisaster = primaryDisaster || "Flood";

    console.log("🔥 PRIMARY DISASTER:", primaryDisaster);

    /* ===============================
       USER PREPAREDNESS
    ================================= */
    let userPrep = await UserPreparedness.findOne({
      user: user._id,
      disasterType: primaryDisaster
    });

    // 🔥 fallback if mismatch
    if (!userPrep) {
      userPrep = await UserPreparedness.findOne({
        user: user._id
      });
    }

    /* ===============================
       KIT FETCH
    ================================= */
    let kit = await PreparedKit.findOne({
      disasterType: primaryDisaster,
      level: "Family"
    });

    // fallback to General
    if (!kit) {
      primaryDisaster = "General";

      kit = await PreparedKit.findOne({
        disasterType: "General",
        level: "Family"
      });
    }

    /* ===============================
       AUTO CREATE PREP
    ================================= */
    if (!userPrep && kit) {
      userPrep = await UserPreparedness.create({
        user: user._id,
        disasterType: primaryDisaster,
        selectedItems: kit.items.map(i => ({
          name: i.name,
          completed: false
        }))
      });
    }

    /* ===============================
       SYNC KIT ITEMS
    ================================= */
    if (kit && userPrep) {
      const existing = userPrep.selectedItems.map(i => i.name);

      for (let item of kit.items) {
        if (!existing.includes(item.name)) {
          userPrep.selectedItems.push({
            name: item.name,
            completed: false
          });
        }
      }

      await userPrep.save();
    }

    /* ===============================
       PERSONAL SCORE
    ================================= */
    let personalScore = 0;

    if (userPrep && userPrep.selectedItems.length > 0) {
      const total = userPrep.selectedItems.length;
      const completed = userPrep.selectedItems.filter(
        i => i.completed
      ).length;

      personalScore = Math.round((completed / total) * 100);
    }

    /* ===============================
       FAMILY SCORE
    ================================= */
    let familyScore = personalScore;

    if (user.groupId) {
      const members = await User.find({ groupId: user.groupId });

      let totalScore = 0;

      for (let member of members) {
        const prep = await UserPreparedness.findOne({
          user: member._id,
          disasterType: primaryDisaster
        });

        if (prep && prep.selectedItems.length > 0) {
          const total = prep.selectedItems.length;
          const completed = prep.selectedItems.filter(
            i => i.completed
          ).length;

          totalScore += Math.round((completed / total) * 100);
        }
      }

      if (members.length > 0) {
        familyScore = Math.round(totalScore / members.length);
      }
    }

    /* ===============================
       PSYCHOLOGICAL SCORE
    ================================= */
    const psychChecks = user.psychologicalChecks || [];
    const completedPsych = psychChecks.filter(q => q.completed).length;
    const psychScore = completedPsych * 5;

    /* ===============================
       ERI
    ================================= */
    const baseSafety = 40;
    const mentalShield = 1 + psychScore / 150;

    let eri =
      baseSafety +
      personalScore * 0.4 +
      familyScore * 0.3 -
      disasterImpact * 0.8;

    eri = eri * mentalShield;
    eri = Math.max(0, Math.min(100, Math.round(eri)));

    let status = "Safe";
    if (eri < 30) status = "Critical";
    else if (eri < 50) status = "High Risk";
    else if (eri < 70) status = "Vulnerable";

    /* ===============================
       RESPONSE
    ================================= */
    res.json({
      primaryRisk,
      primaryDisaster,
      personalScore,
      familyScore,
      eri,
      status,
      recommendedKit: kit ? kit.items : [],
      smartKit: userPrep ? userPrep.selectedItems : []
    });

  } catch (error) {
    console.error("🔥 Intelligence Error:", error);
    res.status(500).json({
      error: "Intelligence calculation failed",
      details: error.message
    });
  }
};


/* ===============================
   UPDATE PSYCHOLOGICAL CHECK
================================= */
const updatePsychologicalCheck = async (req, res) => {
  try {
    const { question, completed } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.psychologicalChecks) {
      user.psychologicalChecks = [];
    }

    const existing = user.psychologicalChecks.find(
      q => q.question === question
    );

    if (existing) {
      existing.completed = completed;
    } else {
      user.psychologicalChecks.push({ question, completed });
    }

    await user.save();

    res.json({ message: "Psychological check updated" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===============================
   TOGGLE PREPARED ITEM
================================= */


const togglePreparedItem = async (req, res) => {
  try {
    const userId = req.user._id;
    let { disasterType, name, completed } = req.body;

    // 🔥 FORCE SAME DISASTER (fix mismatch)
    disasterType = disasterType || "Flood";

    let prep = await UserPreparedness.findOne({
      user: userId,
      disasterType
    });

    if (!prep) {
      const kit = await PreparedKit.findOne({
        disasterType,
        level: "Family"
      });

      prep = new UserPreparedness({
        user: userId,
        disasterType,
        selectedItems: kit
          ? kit.items.map(i => ({
              name: i.name,
              completed: false
            }))
          : []
      });
    }

    const item = prep.selectedItems.find(i => i.name === name);

    if (item) {
      item.completed = completed;
    } else {
      prep.selectedItems.push({ name, completed });
    }

    const total = prep.selectedItems.length;
    const done = prep.selectedItems.filter(i => i.completed).length;

    prep.preparednessScore = total
      ? Math.round((done / total) * 100)
      : 0;

    await prep.save();

    res.json({
      message: "Item updated successfully",
      prep
    });

  } catch (error) {
    console.error("Toggle error:", error);
    res.status(500).json({ error: error.message });
  }
};

const createPreparedKit = async (req, res) => {
  try {
    const { disasterType, level, items } = req.body;

    const newKit = await PreparedKit.create({
      disasterType,
      level,
      items
    });

    res.json({
      message: "Kit created",
      kit: newKit
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
module.exports = {
  getPreparednessIntelligence,
  updatePsychologicalCheck,
  togglePreparedItem,
  createPreparedKit   // ✅ ADD THIS
};